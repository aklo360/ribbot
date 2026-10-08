package com.aklostudio.ribbot.bookmap;

import java.util.List;

record MarketSnapshot(
        int schemaVersion,
        String source,
        String status,
        String alias,
        String fullName,
        double pips,
        double sizeMultiplier,
        long eventTimestampNanos,
        long emittedAtMillis,
        Quote bid,
        Quote ask,
        Double midpoint,
        Double spread,
        List<Level> bids,
        List<Level> asks,
        double bidTotalSize,
        double askTotalSize,
        Double depthImbalance,
        LiquidityMap liquidityMap,
        LastTrade lastTrade,
        long flowWindowMillis,
        double rollingBuyVolume,
        double rollingSellVolume,
        double sessionCvd
) {
    record Quote(double price, double size) {}

    record Level(double price, double size) {}

    record LiquidityMap(
            double rangePercent,
            double bandWidth,
            double lowerBound,
            double upperBound,
            int bidLevelsAnalyzed,
            int askLevelsAnalyzed,
            double bidTotalSize,
            double askTotalSize,
            List<LiquidityBand> bidBands,
            List<LiquidityBand> askBands,
            List<LiquidityBand> strongestBids,
            List<LiquidityBand> strongestAsks
    ) {}

    record LiquidityBand(
            double fromPrice,
            double toPrice,
            double centerPrice,
            double distancePercent,
            double size,
            int priceLevels,
            double sideShare,
            long persistenceMillis,
            long observations,
            double averageSize,
            double minimumSize,
            double maximumSize
    ) {}

    record LastTrade(double price, double size, String side, long eventTimestampMillis) {}
}
