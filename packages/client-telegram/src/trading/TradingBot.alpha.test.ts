import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Context, Telegraf } from "telegraf";

import { TradingBot } from "./TradingBot.ts";

const originalFetch = globalThis.fetch;
const tempFiles: string[] = [];

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    for (const file of tempFiles.splice(0)) fs.rmSync(file, { force: true });
});

function context(text: string) {
    const reply = vi.fn(async (_text: string, ..._extra: unknown[]) => undefined);
    return {
        ctx: {
            from: { id: 123456, username: "aklo", is_bot: false, first_name: "AKLO" },
            message: {
                message_id: 1,
                date: 1,
                chat: { id: 123456, type: "private" },
                from: { id: 123456, username: "aklo", is_bot: false, first_name: "AKLO" },
                text,
            },
            reply,
        } as unknown as Context,
        reply,
    };
}

describe("Ribbot Robinhood alpha command", () => {
    it("persists explicit opt-in while explaining that the operator delivery gate is off", async () => {
        const stateFile = path.join(
            os.tmpdir(),
            `ribbot-alpha-command-${crypto.randomUUID()}.json`
        );
        tempFiles.push(stateFile);
        globalThis.fetch = vi.fn(async () =>
            Response.json({
                status: "not_ready",
                chain: "robinhood",
                chainId: 4663,
                scannerEnabled: false,
                warnings: ["No completed scan."],
            })
        );
        const bot = {
            telegram: { sendMessage: vi.fn(async () => undefined) },
        } as unknown as Telegraf<Context>;
        const tradingBot = new TradingBot(bot, {
            getSetting: (key) =>
                ({
                    TG_TRADER: "true",
                    RIBBOT_FTX_API_TOKEN: "test-token",
                    FROGX_API_BASE_URL: "https://frogx.example",
                    RIBBOT_TRADING_STATE_FILE: stateFile,
                    RIBBOT_ALPHA_ALERTS_ENABLED: "false",
                })[key],
        });
        const { ctx, reply } = context("/alpha on");

        await expect(tradingBot.handleMessage(ctx)).resolves.toBe(true);
        expect(reply).toHaveBeenCalledTimes(1);
        expect(String(reply.mock.calls[0][0])).toContain(
            "operator delivery gate is still off"
        );
        const persisted = JSON.parse(fs.readFileSync(stateFile, "utf8")) as {
            users: Record<string, { alphaSignalsEnabled?: boolean }>;
        };
        expect(persisted.users["123456"].alphaSignalsEnabled).toBe(true);
    });
});
