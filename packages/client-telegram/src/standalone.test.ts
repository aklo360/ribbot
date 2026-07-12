import { describe, expect, it } from "vitest";

import { validateStandaloneEnvironment } from "./standalone.ts";

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
