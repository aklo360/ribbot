package com.aklostudio.ribbot.bookmap;

import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import velox.api.layer1.annotations.Layer1ApiVersion;
import velox.api.layer1.annotations.Layer1ApiVersionValue;
import velox.api.layer1.annotations.Layer1SimpleAttachable;
import velox.api.layer1.annotations.Layer1StrategyName;
import velox.api.layer1.data.InstrumentInfo;
import velox.api.layer1.data.TradeInfo;
import velox.api.layer1.simplified.Api;
import velox.api.layer1.simplified.BboListener;
import velox.api.layer1.simplified.CustomModule;
import velox.api.layer1.simplified.DepthDataListener;
import velox.api.layer1.simplified.InitialState;
import velox.api.layer1.simplified.TimeListener;
import velox.api.layer1.simplified.TradeDataListener;

/**
 * Exports a bounded, read-only market snapshot from Bookmap to a local JSON file.
 */
@Layer1SimpleAttachable
@Layer1StrategyName("Ribbot Bookmap Read-Only Bridge")
@Layer1ApiVersion(Layer1ApiVersionValue.VERSION2)
public final class BookmapReadonlyBridge implements
        CustomModule,
        DepthDataListener,
        BboListener,
        TradeDataListener,
        TimeListener {

    private static final long SNAPSHOT_INTERVAL_MILLIS = 250L;
    private static final String EXPORT_DIR_PROPERTY = "ribbot.bookmap.exportDir";
    private static final String EXPORT_DIR_ENV = "RIBBOT_BOOKMAP_EXPORT_DIR";

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Object emissionLock = new Object();

    private volatile MarketSnapshotState state;
    private volatile SnapshotJsonWriter writer;
    private volatile ScheduledExecutorService scheduler;
    private volatile long lastErrorLogMillis;

    @Override
    public void initialize(String alias, InstrumentInfo info, Api api, InitialState initialState) {
        if (!running.compareAndSet(false, true)) {
            throw new IllegalStateException("Bookmap bridge is already running");
        }

        MarketSnapshotState nextState = new MarketSnapshotState(
                alias,
                info.fullName,
                info.pips,
                info.sizeMultiplier
        );
        SnapshotJsonWriter nextWriter = new SnapshotJsonWriter(
                resolveExportDirectory().resolve("snapshot.json")
        );
        ScheduledExecutorService nextScheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "ribbot-bookmap-snapshot-writer");
            thread.setDaemon(true);
            return thread;
        });

        state = nextState;
        writer = nextWriter;
        scheduler = nextScheduler;

        try {
            nextScheduler.scheduleAtFixedRate(
                    this::emitRunningSnapshot,
                    0L,
                    SNAPSHOT_INTERVAL_MILLIS,
                    TimeUnit.MILLISECONDS
            );
        } catch (RuntimeException error) {
            running.set(false);
            nextScheduler.shutdownNow();
            throw error;
        }
    }

    @Override
    public void stop() {
        if (!running.getAndSet(false)) {
            return;
        }

        ScheduledExecutorService activeScheduler = scheduler;
        if (activeScheduler != null) {
            activeScheduler.shutdownNow();
        }

        synchronized (emissionLock) {
            writeSnapshot("stopped");
        }
    }

    @Override
    public void onDepth(boolean isBid, int price, int size) {
        MarketSnapshotState activeState = state;
        if (activeState != null) {
            activeState.onDepth(isBid, price, size);
        }
    }

    @Override
    public void onBbo(int bidPrice, int bidSize, int askPrice, int askSize) {
        MarketSnapshotState activeState = state;
        if (activeState != null) {
            activeState.onBbo(bidPrice, bidSize, askPrice, askSize);
        }
    }

    @Override
    public void onTrade(double price, int size, TradeInfo tradeInfo) {
        MarketSnapshotState activeState = state;
        if (activeState != null) {
            activeState.onTrade(price, size, tradeInfo.isBidAggressor);
        }
    }

    @Override
    public void onTimestamp(long timestamp) {
        MarketSnapshotState activeState = state;
        if (activeState != null) {
            activeState.onTimestamp(timestamp);
        }
    }

    private void emitRunningSnapshot() {
        synchronized (emissionLock) {
            if (running.get()) {
                writeSnapshot("running");
            }
        }
    }

    private void writeSnapshot(String status) {
        MarketSnapshotState activeState = state;
        SnapshotJsonWriter activeWriter = writer;
        if (activeState == null || activeWriter == null) {
            return;
        }

        try {
            activeWriter.write(activeState.snapshot(System.currentTimeMillis(), status));
        } catch (IOException | RuntimeException error) {
            logWriteError(error);
        }
    }

    private void logWriteError(Exception error) {
        long now = System.currentTimeMillis();
        if (now - lastErrorLogMillis < 5_000L) {
            return;
        }
        lastErrorLogMillis = now;
        System.err.println("Ribbot Bookmap bridge could not write snapshot: " + error.getMessage());
    }

    static Path resolveExportDirectory() {
        String configured = System.getProperty(EXPORT_DIR_PROPERTY);
        if (configured == null || configured.isBlank()) {
            configured = System.getenv(EXPORT_DIR_ENV);
        }
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured).toAbsolutePath().normalize();
        }
        return Path.of(
                System.getProperty("user.home"),
                "Library",
                "Application Support",
                "Bookmap",
                "Exports",
                "ribbot-bridge"
        );
    }
}
