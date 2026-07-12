import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    ActivityAlertPoller,
    buildActivityAlertBatch,
} from "./activityAlerts.ts";
import type { ActivityEvent, ActivityResult } from "./frogx.ts";
import { TradingStateStore } from "./state.ts";

const tempFiles: string[] = [];

afterEach(() => {
    for (const file of tempFiles.splice(0)) {
        fs.rmSync(file, { force: true });
    }
});

function activityEvent(
    eventId: string,
    eventType: string,
    createdAt: string,
    metadata: Record<string, unknown> = {}
): ActivityEvent {
    return {
        telegramUserId: "123456",
        eventId,
        eventType,
        createdAt,
        metadata,
    };
}

function readyActivity(events: ActivityEvent[]): ActivityResult {
    return {
        status: "ready",
        telegramUserId: "123456",
        generatedAt: "2026-07-12T12:00:00.000Z",
        summary: {
            totalEvents: events.length,
            latestEventAt: events[0]?.createdAt,
            eventTypes: {},
        },
        events,
        warnings: [],
    };
}

function createStore() {
    const file = path.join(
        os.tmpdir(),
        `ribbot-activity-alerts-${crypto.randomUUID()}.json`
    );
    tempFiles.push(file);
    const store = new TradingStateStore(file);
    const user = store.getOrCreateUser("123456", "pond-chief", {
        confirmTrades: true,
        defaultBuySol: 0.1,
        slippageBps: 500,
        priorityFeeLamports: 0,
    });
    return { file, store, user };
}

describe("FTX activity alert projection", () => {
    it("collapses duplicate swap and automation lifecycle rows", () => {
        const batch = buildActivityAlertBatch(
            [
                activityEvent(
                    "advanced",
                    "advanced_automation_config_executed",
                    "2026-07-12T12:00:02.000Z",
                    {
                        kind: "copytrade",
                        executionId: "execution-1",
                        referenceId: "reference-1",
                        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        copyTradeSide: "buy",
                    }
                ),
                activityEvent(
                    "swap",
                    "swap_executed",
                    "2026-07-12T12:00:01.000Z",
                    {
                        orderId: "execution-1",
                        referenceId: "reference-1",
                        inMint: "So11111111111111111111111111111111111111112",
                        outMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        amountIn: "100000000",
                    }
                ),
                activityEvent(
                    "staged",
                    "advanced_automation_config_staged",
                    "2026-07-12T12:00:00.000Z"
                ),
            ],
            [],
            5
        );

        expect(batch.notifications).toHaveLength(1);
        expect(batch.notifications[0]).toMatchObject({
            title: "Copy trade executed",
            eventIds: ["advanced", "swap"],
        });
        expect(batch.consumedEventIds).toEqual(
            expect.arrayContaining(["advanced", "swap", "staged"])
        );
        expect(batch.text).toContain("FTX trade update");
        expect(batch.text).toContain("Copy trade executed");
    });

    it("projects only the terminal review state when review events arrive together", () => {
        const batch = buildActivityAlertBatch(
            [
                activityEvent(
                    "resolved",
                    "execution_manual_review_resolved",
                    "2026-07-12T12:02:00.000Z",
                    { caseId: "case-1", resolution: "executed" }
                ),
                activityEvent(
                    "required",
                    "execution_manual_review_required",
                    "2026-07-12T12:01:00.000Z",
                    { caseId: "case-1", reason: "Privy status is pending" }
                ),
            ],
            [],
            5
        );

        expect(batch.notifications).toHaveLength(1);
        expect(batch.notifications[0].title).toBe(
            "Manual review confirmed execution"
        );
        expect(batch.notifications[0].eventIds).toEqual(
            expect.arrayContaining(["required", "resolved"])
        );
    });

    it("collapses a review resolution into the matching terminal trade update", () => {
        const batch = buildActivityAlertBatch(
            [
                activityEvent(
                    "review-resolved",
                    "execution_manual_review_resolved",
                    "2026-07-12T12:02:01.000Z",
                    {
                        caseId: "case-1",
                        referenceId: "reference-1",
                        resolution: "executed",
                    }
                ),
                activityEvent(
                    "trade-confirmed",
                    "swap_executed",
                    "2026-07-12T12:02:00.000Z",
                    {
                        referenceId: "reference-1",
                        inMint: "So11111111111111111111111111111111111111112",
                        outMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    }
                ),
            ],
            [],
            5
        );

        expect(batch.notifications).toHaveLength(1);
        expect(batch.notifications[0]).toMatchObject({
            title: "Buy executed",
        });
        expect(batch.notifications[0].eventIds).toEqual(
            expect.arrayContaining(["review-resolved", "trade-confirmed"])
        );
    });

    it("delivers the oldest unseen alert groups first without consuming newer groups", () => {
        const batch = buildActivityAlertBatch(
            [
                activityEvent(
                    "newer",
                    "withdrawal_executed",
                    "2026-07-12T12:02:00.000Z"
                ),
                activityEvent(
                    "older",
                    "swap_executed",
                    "2026-07-12T12:01:00.000Z",
                    {
                        inMint: "So11111111111111111111111111111111111111112",
                    }
                ),
                activityEvent(
                    "ignored",
                    "preference_updated",
                    "2026-07-12T12:00:00.000Z"
                ),
            ],
            [],
            1
        );

        expect(batch.notifications.map((item) => item.eventIds)).toEqual([
            ["older"],
        ]);
        expect(batch.consumedEventIds).toEqual(
            expect.arrayContaining(["older", "ignored"])
        );
        expect(batch.consumedEventIds).not.toContain("newer");
    });
});

describe("FTX activity alert polling", () => {
    it("owns and clears its bounded polling timer", async () => {
        const { store } = createStore();
        const poller = new ActivityAlertPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "test-token",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxEventsPerMessage: 5,
            store,
            sendMessage: async () => undefined,
            fetchActivity: async () => readyActivity([]),
        });

        expect(poller.start()).toBe(true);
        expect(poller.isRunning()).toBe(true);
        expect(poller.start()).toBe(false);

        await poller.stop();
        expect(poller.isRunning()).toBe(false);
    });

    it("baselines without sending, then delivers each new FTX event once", async () => {
        const { file, store, user } = createStore();
        let events = [
            activityEvent(
                "existing",
                "swap_executed",
                "2026-07-12T12:00:00.000Z"
            ),
        ];
        let now = Date.parse("2026-07-12T12:05:00.000Z");
        const sendMessage = vi.fn(async () => undefined);
        const fetchActivity = vi.fn(async () => readyActivity(events));
        const poller = new ActivityAlertPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "test-token",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxEventsPerMessage: 5,
            store,
            sendMessage,
            fetchActivity,
            now: () => new Date(now),
        });

        const baseline = await poller.pollOnce();
        expect(baseline.usersBaselined).toBe(1);
        expect(sendMessage).not.toHaveBeenCalled();

        events = [
            activityEvent(
                "new-swap",
                "swap_executed",
                "2026-07-12T12:06:00.000Z",
                {
                    inMint: "So11111111111111111111111111111111111111112",
                    outMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    amountIn: "250000000",
                }
            ),
            ...events,
        ];
        now += 60_000;
        const delivered = await poller.pollOnce();
        expect(delivered.messagesSent).toBe(1);
        expect(sendMessage).toHaveBeenCalledWith(
            user.telegramUserId,
            expect.stringContaining("Buy executed")
        );

        now += 60_000;
        expect((await poller.pollOnce()).messagesSent).toBe(0);
        expect(sendMessage).toHaveBeenCalledTimes(1);

        const reloaded = new TradingStateStore(file).getOrCreateUser(
            user.telegramUserId,
            user.username,
            {
                confirmTrades: true,
                defaultBuySol: 0.1,
                slippageBps: 500,
                priorityFeeLamports: 0,
            }
        );
        expect(reloaded.activityAlertCursor?.seenEventIds).toEqual(
            expect.arrayContaining(["existing", "new-swap"])
        );
    });

    it("keeps failed deliveries unseen and retries after durable backoff", async () => {
        const { store, user } = createStore();
        let events: ActivityEvent[] = [];
        let now = Date.parse("2026-07-12T12:00:00.000Z");
        const sendMessage = vi
            .fn()
            .mockRejectedValueOnce(new Error("Telegram unavailable"))
            .mockResolvedValue(undefined);
        const poller = new ActivityAlertPoller({
            enabled: true,
            tgTrader: true,
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "test-token",
            pollIntervalMs: 30_000,
            maxUsersPerPoll: 25,
            maxEventsPerMessage: 5,
            store,
            sendMessage,
            fetchActivity: async () => readyActivity(events),
            now: () => new Date(now),
        });

        await poller.pollOnce();
        events = [
            activityEvent(
                "retry-me",
                "withdrawal_executed",
                "2026-07-12T12:01:00.000Z"
            ),
        ];
        now += 60_000;
        expect((await poller.pollOnce()).deliveryFailures).toBe(1);
        expect(store.getActivityAlertCursor(user)?.seenEventIds).not.toContain(
            "retry-me"
        );

        expect((await poller.pollOnce()).usersChecked).toBe(0);
        expect(sendMessage).toHaveBeenCalledTimes(1);

        now += 31_000;
        expect((await poller.pollOnce()).messagesSent).toBe(1);
        expect(sendMessage).toHaveBeenCalledTimes(2);
        expect(store.getActivityAlertCursor(user)).toMatchObject({
            consecutiveFailures: 0,
            seenEventIds: ["retry-me"],
        });
        expect(
            store.getActivityAlertCursor(user)?.nextAttemptAt
        ).toBeUndefined();
    });
});
