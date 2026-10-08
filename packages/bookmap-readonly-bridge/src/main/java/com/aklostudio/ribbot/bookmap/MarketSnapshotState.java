package com.aklostudio.ribbot.bookmap;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

final class MarketSnapshotState {
    static final int EXPORTED_LEVELS_PER_SIDE = 25;
    static final long FLOW_WINDOW_MILLIS = 60_000L;
    static final double LIQUIDITY_RANGE_PERCENT = 10.0;
    static final int STRONGEST_BANDS_PER_SIDE = 10;

    private final String alias;
    private final String fullName;
    private final double pips;
    private final double sizeMultiplier;
    private final NavigableMap<Integer, Integer> bids = new TreeMap<>(Comparator.reverseOrder());
    private final NavigableMap<Integer, Integer> asks = new TreeMap<>();
    private final Deque<TradeVolume> recentTrades = new ArrayDeque<>();
    private final Map<Long, BandTracker> bidBandTrackers = new HashMap<>();
    private final Map<Long, BandTracker> askBandTrackers = new HashMap<>();

    private long eventTimestampNanos;
    private Integer bidPriceLevel;
    private Integer bidSizeLevel;
    private Integer askPriceLevel;
    private Integer askSizeLevel;
    private MarketSnapshot.LastTrade lastTrade;
    private double sessionCvd;
    private double trackedBandWidth;

    MarketSnapshotState(String alias, String fullName, double pips, double sizeMultiplier) {
        this.alias = alias == null ? "" : alias;
        this.fullName = fullName == null ? "" : fullName;
        this.pips = Double.isFinite(pips) && pips > 0.0 ? pips : 1.0;
        this.sizeMultiplier = sizeMultiplier > 0.0 ? sizeMultiplier : 1.0;
    }

    synchronized void onDepth(boolean isBid, int priceLevel, int sizeLevel) {
        NavigableMap<Integer, Integer> side = isBid ? bids : asks;
        if (sizeLevel <= 0) {
            side.remove(priceLevel);
        } else {
            side.put(priceLevel, sizeLevel);
        }
    }

    synchronized void onBbo(int bidPrice, int bidSize, int askPrice, int askSize) {
        bidPriceLevel = validPriceLevel(bidPrice) && bidSize > 0 ? bidPrice : null;
        bidSizeLevel = bidPriceLevel == null ? null : bidSize;
        askPriceLevel = validPriceLevel(askPrice) && askSize > 0 ? askPrice : null;
        askSizeLevel = askPriceLevel == null ? null : askSize;
    }

    synchronized void onTrade(double priceLevel, int sizeLevel, boolean isBidAggressor) {
        if (!Double.isFinite(priceLevel) || sizeLevel <= 0) {
            return;
        }

        long eventMillis = eventTimestampNanos > 0L
                ? eventTimestampNanos / 1_000_000L
                : System.currentTimeMillis();
        double price = realPrice(priceLevel);
        double size = realSize(sizeLevel);
        String side = isBidAggressor ? "buy" : "sell";

        lastTrade = new MarketSnapshot.LastTrade(price, size, side, eventMillis);
        recentTrades.addLast(new TradeVolume(eventMillis, isBidAggressor ? size : 0.0, isBidAggressor ? 0.0 : size));
        sessionCvd += isBidAggressor ? size : -size;
        purgeOldTrades(eventMillis);
    }

    synchronized void onTimestamp(long timestampNanos) {
        if (timestampNanos > 0L && eventTimestampNanos > 0L && timestampNanos < eventTimestampNanos) {
            recentTrades.clear();
            bidBandTrackers.clear();
            askBandTrackers.clear();
        }
        eventTimestampNanos = Math.max(0L, timestampNanos);
    }

    synchronized MarketSnapshot snapshot(long emittedAtMillis, String status) {
        long referenceMillis = eventTimestampNanos > 0L
                ? eventTimestampNanos / 1_000_000L
                : emittedAtMillis;
        purgeOldTrades(referenceMillis);

        List<MarketSnapshot.Level> bidLevels = copyLevels(bids);
        List<MarketSnapshot.Level> askLevels = copyLevels(asks);
        double bidTotal = totalSize(bidLevels);
        double askTotal = totalSize(askLevels);
        double total = bidTotal + askTotal;
        Double imbalance = total > 0.0 ? (bidTotal - askTotal) / total : null;

        MarketSnapshot.Quote bid = quote(bidPriceLevel, bidSizeLevel, bids);
        MarketSnapshot.Quote ask = quote(askPriceLevel, askSizeLevel, asks);
        Double midpoint = bid != null && ask != null ? (bid.price() + ask.price()) / 2.0 : null;
        Double spread = bid != null && ask != null ? ask.price() - bid.price() : null;
        MarketSnapshot.LiquidityMap liquidityMap = midpoint != null && midpoint > 0.0
                ? buildLiquidityMap(midpoint, referenceMillis)
                : null;

        double rollingBuyVolume = 0.0;
        double rollingSellVolume = 0.0;
        for (TradeVolume trade : recentTrades) {
            rollingBuyVolume += trade.buyVolume();
            rollingSellVolume += trade.sellVolume();
        }

        return new MarketSnapshot(
                1,
                "bookmap",
                status,
                alias,
                fullName,
                pips,
                sizeMultiplier,
                eventTimestampNanos,
                emittedAtMillis,
                bid,
                ask,
                midpoint,
                spread,
                List.copyOf(bidLevels),
                List.copyOf(askLevels),
                bidTotal,
                askTotal,
                imbalance,
                liquidityMap,
                lastTrade,
                FLOW_WINDOW_MILLIS,
                rollingBuyVolume,
                rollingSellVolume,
                sessionCvd
        );
    }

    private MarketSnapshot.LiquidityMap buildLiquidityMap(double midpoint, long referenceMillis) {
        double bandWidth = niceBandWidth(midpoint);
        if (Double.compare(bandWidth, trackedBandWidth) != 0) {
            bidBandTrackers.clear();
            askBandTrackers.clear();
            trackedBandWidth = bandWidth;
        }

        double lowerBound = midpoint * (1.0 - LIQUIDITY_RANGE_PERCENT / 100.0);
        double upperBound = midpoint * (1.0 + LIQUIDITY_RANGE_PERCENT / 100.0);
        NavigableMap<Long, BandAccumulator> bidBands = new TreeMap<>(Comparator.reverseOrder());
        NavigableMap<Long, BandAccumulator> askBands = new TreeMap<>();
        int bidLevelsAnalyzed = aggregateBands(bids, lowerBound, upperBound, bandWidth, bidBands);
        int askLevelsAnalyzed = aggregateBands(asks, lowerBound, upperBound, bandWidth, askBands);

        double bidTotal = totalBandSize(bidBands);
        double askTotal = totalBandSize(askBands);
        updateTrackers(bidBands, bidBandTrackers, referenceMillis);
        updateTrackers(askBands, askBandTrackers, referenceMillis);

        List<MarketSnapshot.LiquidityBand> bidList = toLiquidityBands(
                bidBands,
                bidBandTrackers,
                midpoint,
                bandWidth,
                bidTotal,
                referenceMillis
        );
        List<MarketSnapshot.LiquidityBand> askList = toLiquidityBands(
                askBands,
                askBandTrackers,
                midpoint,
                bandWidth,
                askTotal,
                referenceMillis
        );

        return new MarketSnapshot.LiquidityMap(
                LIQUIDITY_RANGE_PERCENT,
                bandWidth,
                lowerBound,
                upperBound,
                bidLevelsAnalyzed,
                askLevelsAnalyzed,
                bidTotal,
                askTotal,
                List.copyOf(bidList),
                List.copyOf(askList),
                strongestBands(bidList),
                strongestBands(askList)
        );
    }

    private int aggregateBands(
            NavigableMap<Integer, Integer> depth,
            double lowerBound,
            double upperBound,
            double bandWidth,
            NavigableMap<Long, BandAccumulator> bands
    ) {
        int levels = 0;
        for (Map.Entry<Integer, Integer> level : depth.entrySet()) {
            double price = realPrice(level.getKey());
            if (price < lowerBound) {
                if (depth.comparator() != null) {
                    break;
                }
                continue;
            }
            if (price > upperBound) {
                if (depth.comparator() == null) {
                    break;
                }
                continue;
            }
            long bandIndex = (long) Math.floor(price / bandWidth);
            bands.computeIfAbsent(bandIndex, ignored -> new BandAccumulator())
                    .add(realSize(level.getValue()));
            levels++;
        }
        return levels;
    }

    private void updateTrackers(
            NavigableMap<Long, BandAccumulator> bands,
            Map<Long, BandTracker> trackers,
            long referenceMillis
    ) {
        trackers.keySet().retainAll(bands.keySet());
        for (Map.Entry<Long, BandAccumulator> band : bands.entrySet()) {
            trackers.computeIfAbsent(band.getKey(), ignored -> new BandTracker(referenceMillis))
                    .observe(referenceMillis, band.getValue().size);
        }
    }

    private List<MarketSnapshot.LiquidityBand> toLiquidityBands(
            NavigableMap<Long, BandAccumulator> bands,
            Map<Long, BandTracker> trackers,
            double midpoint,
            double bandWidth,
            double sideTotal,
            long referenceMillis
    ) {
        List<MarketSnapshot.LiquidityBand> result = new ArrayList<>(bands.size());
        for (Map.Entry<Long, BandAccumulator> entry : bands.entrySet()) {
            double fromPrice = entry.getKey() * bandWidth;
            double toPrice = fromPrice + bandWidth;
            double centerPrice = fromPrice + bandWidth / 2.0;
            BandAccumulator accumulator = entry.getValue();
            BandTracker tracker = trackers.get(entry.getKey());
            result.add(new MarketSnapshot.LiquidityBand(
                    fromPrice,
                    toPrice,
                    centerPrice,
                    Math.abs(centerPrice - midpoint) / midpoint * 100.0,
                    accumulator.size,
                    accumulator.levels,
                    sideTotal > 0.0 ? accumulator.size / sideTotal : 0.0,
                    Math.max(0L, referenceMillis - tracker.firstSeenMillis),
                    tracker.observations,
                    tracker.sumSize / tracker.observations,
                    tracker.minimumSize,
                    tracker.maximumSize
            ));
        }
        return result;
    }

    private List<MarketSnapshot.LiquidityBand> strongestBands(List<MarketSnapshot.LiquidityBand> bands) {
        return bands.stream()
                .sorted(Comparator
                        .comparingDouble(MarketSnapshot.LiquidityBand::size)
                        .reversed()
                        .thenComparingDouble(MarketSnapshot.LiquidityBand::distancePercent))
                .limit(STRONGEST_BANDS_PER_SIDE)
                .toList();
    }

    private double niceBandWidth(double midpoint) {
        double target = Math.max(pips, midpoint * 0.005);
        double power = Math.pow(10.0, Math.floor(Math.log10(target)));
        double normalized = target / power;
        double nice = normalized <= 1.0 ? 1.0 : normalized <= 2.0 ? 2.0 : normalized <= 5.0 ? 5.0 : 10.0;
        return Math.max(pips, nice * power);
    }

    private static double totalBandSize(Map<Long, BandAccumulator> bands) {
        double total = 0.0;
        for (BandAccumulator band : bands.values()) {
            total += band.size;
        }
        return total;
    }

    private MarketSnapshot.Quote quote(
            Integer preferredPrice,
            Integer preferredSize,
            NavigableMap<Integer, Integer> depth
    ) {
        if (preferredPrice != null && preferredSize != null) {
            return new MarketSnapshot.Quote(realPrice(preferredPrice), realSize(preferredSize));
        }
        Map.Entry<Integer, Integer> best = depth.firstEntry();
        return best == null ? null : new MarketSnapshot.Quote(realPrice(best.getKey()), realSize(best.getValue()));
    }

    private List<MarketSnapshot.Level> copyLevels(NavigableMap<Integer, Integer> levels) {
        List<MarketSnapshot.Level> copy = new ArrayList<>(EXPORTED_LEVELS_PER_SIDE);
        for (Map.Entry<Integer, Integer> level : levels.entrySet()) {
            copy.add(new MarketSnapshot.Level(realPrice(level.getKey()), realSize(level.getValue())));
            if (copy.size() == EXPORTED_LEVELS_PER_SIDE) {
                break;
            }
        }
        return copy;
    }

    private void purgeOldTrades(long referenceMillis) {
        long cutoff = referenceMillis - FLOW_WINDOW_MILLIS;
        while (!recentTrades.isEmpty() && recentTrades.peekFirst().eventMillis() < cutoff) {
            recentTrades.removeFirst();
        }
    }

    private double realPrice(double priceLevel) {
        return priceLevel * pips;
    }

    private double realSize(int sizeLevel) {
        return sizeLevel / sizeMultiplier;
    }

    private static double totalSize(List<MarketSnapshot.Level> levels) {
        double total = 0.0;
        for (MarketSnapshot.Level level : levels) {
            total += level.size();
        }
        return total;
    }

    private static boolean validPriceLevel(int value) {
        return value != Integer.MIN_VALUE && value != Integer.MAX_VALUE;
    }

    private static final class BandAccumulator {
        private double size;
        private int levels;

        private void add(double addedSize) {
            size += addedSize;
            levels++;
        }
    }

    private static final class BandTracker {
        private final long firstSeenMillis;
        private long lastSeenMillis;
        private long observations;
        private double sumSize;
        private double minimumSize = Double.POSITIVE_INFINITY;
        private double maximumSize;

        private BandTracker(long firstSeenMillis) {
            this.firstSeenMillis = firstSeenMillis;
        }

        private void observe(long observedAtMillis, double size) {
            lastSeenMillis = observedAtMillis;
            observations++;
            sumSize += size;
            minimumSize = Math.min(minimumSize, size);
            maximumSize = Math.max(maximumSize, size);
        }
    }

    private record TradeVolume(long eventMillis, double buyVolume, double sellVolume) {}
}
