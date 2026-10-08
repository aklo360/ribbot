package com.aklostudio.ribbot.bookmap;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.DateTimeException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

final class SnapshotJsonWriter {
    private final Path target;
    private final Path temporary;

    SnapshotJsonWriter(Path target) {
        this.target = target.toAbsolutePath().normalize();
        this.temporary = this.target.resolveSibling(
                this.target.getFileName() + ".tmp." + UUID.randomUUID()
        );
    }

    synchronized void write(MarketSnapshot snapshot) throws IOException {
        Path parent = target.getParent();
        if (parent == null) {
            throw new IOException("Snapshot target has no parent directory");
        }
        Files.createDirectories(parent);
        Files.writeString(
                temporary,
                toJson(snapshot),
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE
        );
        try {
            Files.move(
                    temporary,
                    target,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING
            );
        } catch (AtomicMoveNotSupportedException unsupported) {
            Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    static String toJson(MarketSnapshot snapshot) {
        long eventMillis = snapshot.eventTimestampNanos() > 0L
                ? snapshot.eventTimestampNanos() / 1_000_000L
                : 0L;
        Long ageMillis = eventMillis > 0L
                ? Math.max(0L, snapshot.emittedAtMillis() - eventMillis)
                : null;

        StringBuilder json = new StringBuilder(8_192);
        json.append("{\n");
        field(json, 1, "schema_version", Integer.toString(snapshot.schemaVersion()), true);
        field(json, 1, "source", quoted(snapshot.source()), true);
        field(json, 1, "status", quoted(snapshot.status()), true);

        json.append("  \"instrument\": {\n");
        field(json, 2, "alias", quoted(snapshot.alias()), true);
        field(json, 2, "full_name", quoted(snapshot.fullName()), true);
        field(json, 2, "pips", number(snapshot.pips()), true);
        field(json, 2, "size_multiplier", number(snapshot.sizeMultiplier()), false);
        json.append("  },\n");

        field(json, 1, "event_timestamp_ns", Long.toString(snapshot.eventTimestampNanos()), true);
        field(json, 1, "event_time_utc", eventMillis > 0L ? quoted(instant(eventMillis)) : "null", true);
        field(json, 1, "emitted_at_ms", Long.toString(snapshot.emittedAtMillis()), true);
        field(json, 1, "emitted_at_utc", quoted(instant(snapshot.emittedAtMillis())), true);
        field(json, 1, "age_ms", ageMillis == null ? "null" : Long.toString(ageMillis), true);

        json.append("  \"bbo\": {\n");
        field(json, 2, "bid", quote(snapshot.bid()), true);
        field(json, 2, "ask", quote(snapshot.ask()), true);
        field(json, 2, "midpoint", nullableNumber(snapshot.midpoint()), true);
        field(json, 2, "spread", nullableNumber(snapshot.spread()), false);
        json.append("  },\n");

        json.append("  \"depth\": {\n");
        field(json, 2, "levels_per_side", Integer.toString(MarketSnapshotState.EXPORTED_LEVELS_PER_SIDE), true);
        field(json, 2, "bid_total_size", number(snapshot.bidTotalSize()), true);
        field(json, 2, "ask_total_size", number(snapshot.askTotalSize()), true);
        field(json, 2, "imbalance", nullableNumber(snapshot.depthImbalance()), true);
        field(json, 2, "bids", levels(snapshot.bids()), true);
        field(json, 2, "asks", levels(snapshot.asks()), false);
        json.append("  },\n");

        field(json, 1, "liquidity_map", liquidityMap(snapshot.liquidityMap()), true);
        field(json, 1, "last_trade", lastTrade(snapshot.lastTrade()), true);

        json.append("  \"flow\": {\n");
        field(json, 2, "window_ms", Long.toString(snapshot.flowWindowMillis()), true);
        field(json, 2, "buy_volume", number(snapshot.rollingBuyVolume()), true);
        field(json, 2, "sell_volume", number(snapshot.rollingSellVolume()), true);
        field(
                json,
                2,
                "delta",
                number(snapshot.rollingBuyVolume() - snapshot.rollingSellVolume()),
                true
        );
        field(json, 2, "session_cvd", number(snapshot.sessionCvd()), false);
        json.append("  }\n");
        json.append("}\n");
        return json.toString();
    }

    private static String quote(MarketSnapshot.Quote quote) {
        if (quote == null) {
            return "null";
        }
        return "{\"price\":" + number(quote.price()) + ",\"size\":" + number(quote.size()) + "}";
    }

    private static String levels(List<MarketSnapshot.Level> levels) {
        StringBuilder json = new StringBuilder();
        json.append('[');
        for (int index = 0; index < levels.size(); index++) {
            if (index > 0) {
                json.append(',');
            }
            MarketSnapshot.Level level = levels.get(index);
            json.append("{\"price\":")
                    .append(number(level.price()))
                    .append(",\"size\":")
                    .append(number(level.size()))
                    .append('}');
        }
        json.append(']');
        return json.toString();
    }

    private static String lastTrade(MarketSnapshot.LastTrade trade) {
        if (trade == null) {
            return "null";
        }
        return "{\"price\":" + number(trade.price())
                + ",\"size\":" + number(trade.size())
                + ",\"side\":" + quoted(trade.side())
                + ",\"event_timestamp_ms\":" + trade.eventTimestampMillis()
                + ",\"event_time_utc\":" + quoted(instant(trade.eventTimestampMillis()))
                + "}";
    }

    private static String liquidityMap(MarketSnapshot.LiquidityMap map) {
        if (map == null) {
            return "null";
        }
        return "{"
                + "\"range_percent\":" + number(map.rangePercent())
                + ",\"band_width\":" + number(map.bandWidth())
                + ",\"lower_bound\":" + number(map.lowerBound())
                + ",\"upper_bound\":" + number(map.upperBound())
                + ",\"bid_levels_analyzed\":" + map.bidLevelsAnalyzed()
                + ",\"ask_levels_analyzed\":" + map.askLevelsAnalyzed()
                + ",\"bid_total_size\":" + number(map.bidTotalSize())
                + ",\"ask_total_size\":" + number(map.askTotalSize())
                + ",\"bid_bands\":" + liquidityBands(map.bidBands())
                + ",\"ask_bands\":" + liquidityBands(map.askBands())
                + ",\"strongest_bids\":" + liquidityBands(map.strongestBids())
                + ",\"strongest_asks\":" + liquidityBands(map.strongestAsks())
                + "}";
    }

    private static String liquidityBands(List<MarketSnapshot.LiquidityBand> bands) {
        StringBuilder json = new StringBuilder();
        json.append('[');
        for (int index = 0; index < bands.size(); index++) {
            if (index > 0) {
                json.append(',');
            }
            MarketSnapshot.LiquidityBand band = bands.get(index);
            json.append("{\"from_price\":")
                    .append(number(band.fromPrice()))
                    .append(",\"to_price\":")
                    .append(number(band.toPrice()))
                    .append(",\"center_price\":")
                    .append(number(band.centerPrice()))
                    .append(",\"distance_percent\":")
                    .append(number(band.distancePercent()))
                    .append(",\"size\":")
                    .append(number(band.size()))
                    .append(",\"price_levels\":")
                    .append(band.priceLevels())
                    .append(",\"side_share\":")
                    .append(number(band.sideShare()))
                    .append(",\"persistence_ms\":")
                    .append(band.persistenceMillis())
                    .append(",\"observations\":")
                    .append(band.observations())
                    .append(",\"average_size\":")
                    .append(number(band.averageSize()))
                    .append(",\"minimum_size\":")
                    .append(number(band.minimumSize()))
                    .append(",\"maximum_size\":")
                    .append(number(band.maximumSize()))
                    .append('}');
        }
        json.append(']');
        return json.toString();
    }

    private static void field(
            StringBuilder json,
            int indent,
            String name,
            String value,
            boolean comma
    ) {
        json.append("  ".repeat(indent))
                .append(quoted(name))
                .append(": ")
                .append(value);
        if (comma) {
            json.append(',');
        }
        json.append('\n');
    }

    private static String nullableNumber(Double value) {
        return value == null ? "null" : number(value);
    }

    private static String number(double value) {
        if (!Double.isFinite(value)) {
            return "null";
        }
        if (value == 0.0) {
            return "0";
        }
        return BigDecimal.valueOf(value)
                .setScale(12, RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }

    private static String instant(long epochMillis) {
        try {
            return Instant.ofEpochMilli(epochMillis).toString();
        } catch (DateTimeException invalid) {
            return "";
        }
    }

    private static String quoted(String value) {
        StringBuilder escaped = new StringBuilder(value.length() + 2);
        escaped.append('"');
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (character < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) character));
                    } else {
                        escaped.append(character);
                    }
                }
            }
        }
        escaped.append('"');
        return escaped.toString();
    }
}
