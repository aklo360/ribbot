import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    AlphaSignalPoller,
    buildAlphaSignalBatch,
    formatRobinhoodAlphaOverview,
    parseAlphaCommandAction,
} from "./alphaSignals.ts";
import type {
    RobinhoodAlphaResult,
    RobinhoodAlphaSignal,
} from "./frogx.ts";
import { TradingStateStore } from "./state.ts";

const tempPaths: string[] = [];

afterEach(() => {
    vi.restoreAllMocks();
    for (const filePath of tempPaths.splice(0)) {
        fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
    }
});

function stateStore(): TradingStateStore {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ribbot-alpha-"));
    const filePath = path.join(directory, "state.json");
    tempPaths.push(filePath);
    return new TradingStateStore(filePath);
}

function signal(id: string, detectedAt: string): RobinhoodAlphaSignal {
    return {
        signalId: id,
        tokenAddress: "0x0000000000000000000000000000000000001234",
        tokenName: "Hood Frog",
        tokenSymbol: "HFROG",
        poolAddress: "0x0000000000000000000000000000000000005678",
        detectedAt,
        windowMinutes: 15,
        qualifiedWalletCount: 4,
        qualifiedWallets: ["0x1", "0x2", "0x3", "0x4"],
        rosterAverageScore: 82.5,
        priceUsd: 0.00001234,
        liquidityUsd: 55_000,
        volume24hUsd: 125_000,
        poolAgeMinutes: 42,
        provisional: true,
        geckoUrl:
            "https://www.geckoterminal.com/robinhood/pools/0x0000000000000000000000000000000000005678",
        explorerUrl:
            "https://robinhoodchain.blockscout.com/token/0x0000000000000000000000000000000000001234",
        disclaimer: "Research signal only.",
    };
}

function snapshot(signals: RobinhoodAlphaSignal[]): RobinhoodAlphaResult {
    return {
        status: "provisional",
        chain: "robinhood",
        chainId: 4663,
        generatedAt: "2026-07-21T03:00:00.000Z",
        nextScanAt: "2026-07-21T03:15:00.000Z",
        observedHistoryDays: 19.5,
        summary: {
            runnerPools: 12,
            observedTrades: 800,
            candidateWallets: 240,
            rosterWallets: 18,
            recentSignals: signals.length,
        },
        roster: [],
        signals,
        warnings: ["Read-only research signal."],
    };
}

function user(store: TradingStateStore, id = "123") {
    return store.getOrCreateUser(id, "aklo", {
        confirmTrades: true,
        defaultBuySol: 0.1,
        slippageBps: 500,
        priorityFeeLamports: 0,
    });
}

describe("Robinhood alpha presentation", () => {
    it("parses show, opt-in, opt-out, and status actions", () => {
        expect(parseAlphaCommandAction(undefined)).toBe("show");
        expect(parseAlphaCommandAction("ON")).toBe("on");
        expect(parseAlphaCommandAction("off")).toBe("off");
        expect(parseAlphaCommandAction("status")).toBe("status");
        expect(parseAlphaCommandAction("trade")).toBe("show");
    });

    it("formats a four-wallet signal with contract and verification links", () => {
        const batch = buildAlphaSignalBatch(
            [signal("signal-1", "2026-07-21T02:59:00.000Z")],
            [],
            3
        );
        expect(batch.text).toContain("4 qualified wallets bought within 15m");
        expect(batch.text).toContain("Contract: 0x0000");
        expect(batch.text).toContain("geckoterminal.com/robinhood");
        expect(batch.text).toContain("provisional");
    });

    it("renders honest provisional sample depth and disabled delivery", () => {
        const text = formatRobinhoodAlphaOverview(snapshot([]), false, false);
        expect(text).toContain("Observed history: 19.5 / 30 days");
        expect(text).toContain("Proactive alerts: Off");
        expect(text).toContain("No qualifying 4-wallet convergence signal");
    });
});

describe("Robinhood alpha polling", () => {
    it("baselines existing signals then delivers each new signal exactly once", async () => {
        const store = stateStore();
        const currentUser = store.setAlphaSignalsEnabled(user(store), true);
        const first = signal("signal-1", "2026-07-21T02:50:00.000Z");
        const second = signal("signal-2", "2026-07-21T03:05:00.000Z");
        let current = snapshot([first]);
        const sendMessage = vi.fn(
            async (_telegramUserId: string, _text: string) => undefined
        );
        const poller = new AlphaSignalPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "secret",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxSignalsPerMessage: 3,
            store,
            sendMessage,
            fetchSignals: async () => current,
            now: () => new Date("2026-07-21T03:10:00.000Z"),
        });

        expect(await poller.pollOnce()).toMatchObject({
            usersBaselined: 1,
            messagesSent: 0,
        });
        current = snapshot([second, first]);
        expect(await poller.pollOnce()).toMatchObject({ messagesSent: 1 });
        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage.mock.calls[0][1]).toContain("signal");
        expect(await poller.pollOnce()).toMatchObject({ messagesSent: 0 });
        expect(store.getAlphaSignalCursor(currentUser)?.seenEventIds).toContain(
            "signal-2"
        );
    });

    it("does not fetch or send for opted-out users", async () => {
        const store = stateStore();
        user(store);
        const fetchSignals = vi.fn(async () => snapshot([]));
        const sendMessage = vi.fn(async () => undefined);
        const poller = new AlphaSignalPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "secret",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxSignalsPerMessage: 3,
            store,
            sendMessage,
            fetchSignals,
        });
        expect(await poller.pollOnce()).toMatchObject({ usersChecked: 0 });
        expect(fetchSignals).not.toHaveBeenCalled();
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it("keeps a failed delivery unseen and retries after backoff", async () => {
        const store = stateStore();
        const currentUser = store.setAlphaSignalsEnabled(user(store), true);
        store.initializeAlphaSignalCursor(
            currentUser,
            [],
            "2026-07-21T03:00:00.000Z"
        );
        let now = new Date("2026-07-21T03:01:00.000Z");
        const sendMessage = vi
            .fn<() => Promise<void>>()
            .mockRejectedValueOnce(new Error("Telegram unavailable"))
            .mockResolvedValue(undefined);
        const poller = new AlphaSignalPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "secret",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxSignalsPerMessage: 3,
            store,
            sendMessage,
            fetchSignals: async () =>
                snapshot([
                    signal("signal-1", "2026-07-21T03:00:30.000Z"),
                ]),
            now: () => now,
        });

        expect(await poller.pollOnce()).toMatchObject({ deliveryFailures: 1 });
        expect(store.getAlphaSignalCursor(currentUser)?.seenEventIds).not.toContain(
            "signal-1"
        );
        expect(await poller.pollOnce()).toMatchObject({ usersChecked: 0 });
        now = new Date("2026-07-21T03:02:00.000Z");
        expect(await poller.pollOnce()).toMatchObject({ messagesSent: 1 });
        expect(sendMessage).toHaveBeenCalledTimes(2);
    });
});
