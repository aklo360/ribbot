import { describe, expect, it } from "vitest";

import { requiresTradeConfirmation } from "./tradePolicy.ts";

describe("trade confirmation policy", () => {
    it("uses the advanced-mode confirmation preference", () => {
        expect(
            requiresTradeConfirmation(
                {
                    botMode: "advanced",
                    confirmTrades: true,
                    sellProtection: true,
                },
                "buy"
            )
        ).toBe(true);
        expect(
            requiresTradeConfirmation(
                {
                    botMode: "advanced",
                    confirmTrades: false,
                    sellProtection: true,
                },
                "buy"
            )
        ).toBe(false);
    });

    it("skips confirmation in simple mode except for protected large sells", () => {
        const settings = {
            botMode: "simple" as const,
            confirmTrades: false,
            sellProtection: true,
        };

        expect(requiresTradeConfirmation(settings, "buy")).toBe(false);
        expect(requiresTradeConfirmation(settings, "sell", 75)).toBe(false);
        expect(requiresTradeConfirmation(settings, "sell", 75.01)).toBe(true);
    });
});
