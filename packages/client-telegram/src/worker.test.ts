/// <reference types="@cloudflare/workers-types" />

import { describe, expect, it, vi } from "vitest";

import { TradingStateStore } from "./trading/state.ts";
import { handleWorkerRequest, type Env } from "./worker.ts";

function testEnvironment(secret = "webhook-secret") {
    const fetch = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
            Response.json({ ok: true })
    );
    const stub = { fetch } as unknown as DurableObjectStub;
    const namespace = {
        idFromName: vi.fn(() => ({ toString: () => "primary" })),
        get: vi.fn(() => stub),
    } as unknown as DurableObjectNamespace;
    const env: Env = {
        RIBBOT_COORDINATOR: namespace,
        RIBBOT_WEBHOOK_SECRET: secret,
    };
    return { env, fetch };
}

describe("Ribbot Cloudflare ingress", () => {
    it("rejects a webhook without the configured Telegram secret", async () => {
        const { env, fetch } = testEnvironment();
        const response = await handleWorkerRequest(
            new Request("https://ribbot.example/telegram", {
                method: "POST",
                body: JSON.stringify({ update_id: 1 }),
            }),
            env
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({
            ok: false,
            error: "unauthorized",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("forwards a valid Telegram update to the durable coordinator", async () => {
        const { env, fetch } = testEnvironment();
        const update = {
            update_id: 42,
            message: {
                message_id: 1,
                date: 1,
                chat: { id: -1, type: "group" },
                from: { id: 123, is_bot: false, first_name: "AKLO" },
                text: "/start",
            },
        };
        const response = await handleWorkerRequest(
            new Request("https://ribbot.example/telegram", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Telegram-Bot-Api-Secret-Token": "webhook-secret",
                },
                body: JSON.stringify(update),
            }),
            env
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
        const [input, init] = fetch.mock.calls[0];
        expect(String(input)).toBe(
            "https://ribbot-coordinator.internal/update"
        );
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify(update));
    });

    it("rejects malformed update bodies before durable state", async () => {
        const { env, fetch } = testEnvironment();
        const response = await handleWorkerRequest(
            new Request("https://ribbot.example/telegram", {
                method: "POST",
                headers: {
                    "X-Telegram-Bot-Api-Secret-Token": "webhook-secret",
                },
                body: "{}",
            }),
            env
        );

        expect(response.status).toBe(400);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe("Ribbot durable cache adapter", () => {
    it("round-trips non-secret user state without touching a local file", () => {
        const first = TradingStateStore.memory();
        const user = first.getOrCreateUser("123", "aklo", {
            confirmTrades: true,
            defaultBuySol: 0.1,
            slippageBps: 500,
            priorityFeeLamports: 0,
        });
        first.setFrogBulkSellPromptExpiresAt(user, 123_456);

        const second = TradingStateStore.memory(first.exportSnapshot());
        const restored = second.listUsers()[0];
        expect(restored).toMatchObject({
            telegramUserId: "123",
            username: "aklo",
            frogBulkSellPromptExpiresAt: 123_456,
        });
    });
});
