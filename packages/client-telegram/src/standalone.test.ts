import { describe, expect, it } from "vitest";

import type { Context } from "telegraf";

import {
    isPrivateChat,
    validateStandaloneEnvironment,
} from "./standalone.ts";

describe("standalone Ribbot configuration", () => {
    it("requires Telegram, FTX authentication, and the command gate", () => {
        expect(validateStandaloneEnvironment({})).toEqual([
            "TELEGRAM_BOT_TOKEN",
            "RIBBOT_FTX_API_TOKEN",
            "TG_TRADER=true",
        ]);
    });

    it("accepts a complete configuration without exposing token values", () => {
        expect(
            validateStandaloneEnvironment({
                TELEGRAM_BOT_TOKEN: "telegram-test-token",
                RIBBOT_FTX_API_TOKEN: "ftx-test-token",
                TG_TRADER: "true",
            })
        ).toEqual([]);
    });
});

describe("standalone Ribbot chat scope", () => {
    it("accepts private DMs", () => {
        expect(
            isPrivateChat({
                chat: { id: 123, type: "private" },
            } as Context)
        ).toBe(true);
    });

    it.each(["group", "supergroup", "channel"] as const)(
        "ignores %s updates",
        (type) => {
            expect(
                isPrivateChat({ chat: { id: -123, type } } as Context)
            ).toBe(false);
        }
    );

    it("ignores updates without a chat", () => {
        expect(isPrivateChat({} as Context)).toBe(false);
    });
});
