package com.aklostudio.ribbot.bookmap;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.file.Files;
import java.nio.file.Path;

import velox.api.layer1.data.InstrumentInfo;
import velox.api.layer1.data.TradeInfo;
import velox.api.layer1.simplified.InitialState;

public final class BridgeSelfTest {
    private static final long BASE_MILLIS = 1_700_000_000_000L;

    private BridgeSelfTest() {}

    public static void main(String[] args) throws Exception {
        convertsAndOrdersMarketData();
        removesDepthAndExpiresRollingFlow();
        mapsDeepLiquidityBandsAndPersistence();
        writesValidAtomicSnapshotShape();
        runsAddonLifecycleWithoutExecutionApi();
        System.out.println("Bridge self-test passed");
    }

    private static void convertsAndOrdersMarketData() {
        MarketSnapshotState state = new MarketSnapshotState("BTC-USDT", "BTC / USDT", 0.5, 1_000.0);
        state.onTimestamp(BASE_MILLIS * 1_000_000L);
        state.onDepth(true, 199, 500);
        state.onDepth(true, 200, 2_500);
        state.onDepth(false, 203, 2_000);
        state.onDepth(false, 202, 1_000);
        for (int price = 170; price < 199; price++) {
            state.onDepth(true, price, 100);
        }
        state.onBbo(200, 2_500, 202, 1_000);
        state.onTrade(201.0, 1_500, true);

        MarketSnapshot snapshot = state.snapshot(BASE_MILLIS + 250L, "running");
        require(snapshot.bids().get(0).price() == 100.0, "best bid conversion or ordering failed");
        require(snapshot.bids().get(0).size() == 2.5, "bid size conversion failed");
        require(snapshot.bids().size() == MarketSnapshotState.EXPORTED_LEVELS_PER_SIDE, "depth limit failed");
        require(snapshot.asks().get(0).price() == 101.0, "best ask conversion or ordering failed");
        require(snapshot.midpoint() == 100.5, "midpoint failed");
        require(snapshot.spread() == 1.0, "spread failed");
        require(snapshot.lastTrade().price() == 100.5, "trade price conversion failed");
        require(snapshot.lastTrade().size() == 1.5, "trade size conversion failed");
        require("buy".equals(snapshot.lastTrade().side()), "aggressor side failed");
        require(snapshot.rollingBuyVolume() == 1.5, "rolling buy volume failed");
        require(snapshot.rollingSellVolume() == 0.0, "rolling sell volume failed");
        require(snapshot.sessionCvd() == 1.5, "session CVD failed");
    }

    private static void removesDepthAndExpiresRollingFlow() {
        MarketSnapshotState state = new MarketSnapshotState("ETH-USDT", "ETH / USDT", 0.1, 100.0);
        state.onTimestamp(BASE_MILLIS * 1_000_000L);
        state.onDepth(true, 30_000, 100);
        state.onDepth(true, 30_000, 0);
        state.onTrade(30_010.0, 200, false);
        state.onTimestamp((BASE_MILLIS + MarketSnapshotState.FLOW_WINDOW_MILLIS + 1L) * 1_000_000L);

        MarketSnapshot snapshot = state.snapshot(
                BASE_MILLIS + MarketSnapshotState.FLOW_WINDOW_MILLIS + 1L,
                "running"
        );
        require(snapshot.bids().isEmpty(), "zero-size depth removal failed");
        require(snapshot.rollingSellVolume() == 0.0, "rolling flow expiry failed");
        require(snapshot.sessionCvd() == -2.0, "session CVD must survive rolling expiry");
    }

    private static void mapsDeepLiquidityBandsAndPersistence() {
        MarketSnapshotState state = new MarketSnapshotState("BTC-USDT", "BTC / USDT", 1.0, 1_000.0);
        state.onTimestamp(BASE_MILLIS * 1_000_000L);
        state.onDepth(true, 77_200, 1_000);
        state.onDepth(false, 77_201, 1_000);
        state.onDepth(true, 76_000, 90_000);
        state.onDepth(true, 75_249, 30_000);
        state.onDepth(true, 75_000, 120_000);
        state.onDepth(true, 69_000, 999_000);
        state.onDepth(false, 80_000, 80_000);
        state.onBbo(77_200, 1_000, 77_201, 1_000);
        state.snapshot(BASE_MILLIS, "running");

        state.onTimestamp((BASE_MILLIS + 1_000L) * 1_000_000L);
        MarketSnapshot snapshot = state.snapshot(BASE_MILLIS + 1_000L, "running");
        MarketSnapshot.LiquidityMap map = snapshot.liquidityMap();
        MarketSnapshot.LiquidityBand strongestBid = map.strongestBids().get(0);

        require(map.bandWidth() == 500.0, "BTC liquidity band width failed");
        require(map.bidLevelsAnalyzed() == 4, "liquidity range bound failed");
        require(strongestBid.fromPrice() == 75_000.0, "strongest bid band ranking failed");
        require(strongestBid.size() == 150.0, "bid band aggregation failed");
        require(strongestBid.persistenceMillis() == 1_000L, "band persistence failed");
        require(strongestBid.observations() == 2L, "band observation count failed");
    }

    private static void writesValidAtomicSnapshotShape() throws Exception {
        Path directory = Files.createTempDirectory("ribbot-bookmap-bridge-test-");
        Path target = directory.resolve("snapshot.json");
        try {
            MarketSnapshotState state = new MarketSnapshotState("A\"B", "Instrument", 1.0, 1_000.0);
            state.onTimestamp(BASE_MILLIS * 1_000_000L);
            state.onDepth(true, 100, 1_000);
            state.onDepth(false, 101, 1_000);
            state.onBbo(100, 1_000, 101, 1_000);
            SnapshotJsonWriter writer = new SnapshotJsonWriter(target);
            writer.write(state.snapshot(BASE_MILLIS, "running"));

            String json = Files.readString(target);
            JsonObject parsed = JsonParser.parseString(json).getAsJsonObject();
            require(json.startsWith("{\n"), "snapshot must be a JSON object");
            require(json.endsWith("}\n"), "snapshot JSON is truncated");
            require(json.contains("\"alias\": \"A\\\"B\""), "JSON escaping failed");
            require(parsed.get("schema_version").getAsInt() == 1, "schema version missing");
            require(parsed.getAsJsonObject("depth").get("levels_per_side").getAsInt() == 25, "depth bound missing");
            require(parsed.getAsJsonObject("liquidity_map").get("band_width").getAsDouble() > 0.0, "liquidity map missing");
            require(parsed.getAsJsonObject("flow").get("session_cvd").getAsDouble() == 0.0, "flow fields missing");
            try (var files = Files.list(directory)) {
                require(files.count() == 1L, "temporary snapshot file was not removed");
            }
        } finally {
            Files.deleteIfExists(target);
            Files.deleteIfExists(directory);
        }
    }

    @SuppressWarnings("deprecation")
    private static void runsAddonLifecycleWithoutExecutionApi() throws Exception {
        Path directory = Files.createTempDirectory("ribbot-bookmap-lifecycle-test-");
        Path target = directory.resolve("snapshot.json");
        String property = "ribbot.bookmap.exportDir";
        String previous = System.getProperty(property);
        try {
            System.setProperty(property, directory.toString());
            InstrumentInfo info = new InstrumentInfo(
                    "BTC-USDT",
                    "BMD",
                    "SP",
                    1.0,
                    1.0,
                    "BTC / USDT",
                    true,
                    1_000.0,
                    true
            );
            BookmapReadonlyBridge bridge = new BookmapReadonlyBridge();
            bridge.initialize("BTC-USDT:MB:SP@BMD", info, null, new InitialState());
            bridge.onTimestamp(BASE_MILLIS * 1_000_000L);
            bridge.onDepth(true, 79_999, 2_000);
            bridge.onDepth(false, 80_001, 3_000);
            bridge.onBbo(79_999, 2_000, 80_001, 3_000);
            bridge.onTrade(80_000.0, 1_000, new TradeInfo(false, true));
            bridge.stop();

            JsonObject parsed = JsonParser.parseString(Files.readString(target)).getAsJsonObject();
            require("stopped".equals(parsed.get("status").getAsString()), "stop snapshot failed");
            require(
                    "BTC-USDT:MB:SP@BMD".equals(parsed.getAsJsonObject("instrument").get("alias").getAsString()),
                    "instrument metadata failed"
            );
            require(parsed.getAsJsonObject("bbo").get("midpoint").getAsDouble() == 80_000.0, "lifecycle BBO failed");
            require(parsed.getAsJsonObject("flow").get("session_cvd").getAsDouble() == 1.0, "lifecycle flow failed");
        } finally {
            if (previous == null) {
                System.clearProperty(property);
            } else {
                System.setProperty(property, previous);
            }
            Files.deleteIfExists(target);
            Files.deleteIfExists(directory);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
