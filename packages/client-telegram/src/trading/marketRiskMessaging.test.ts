import { describe, expect, it } from "vitest";

import { marketRiskQuoteBlockingReason } from "./marketRiskMessaging.ts";

describe("market-risk Telegram messaging", () => {
    it("states that missing Titan credentials are not a safety pass", () => {
        expect(
            marketRiskQuoteBlockingReason({
                status: "not_configured",
                required: ["TITAN_TOKEN"],
                amountIn: "100000000",
            })
        ).toBe(
            "FTX/FrogX did not verify liquidity or price impact because TITAN_TOKEN is not configured. This is not a safety pass."
        );
    });

    it("states that an unavailable quote leaves risk unverified", () => {
        expect(
            marketRiskQuoteBlockingReason({
                status: "unavailable",
                reason: "FTX/FrogX quote probe is unavailable.",
                amountIn: "100000000",
            })
        ).toContain("This is not a safety pass.");
    });

    it("returns no blocking reason for a ready quote", () => {
        expect(
            marketRiskQuoteBlockingReason({
                status: "ready",
                inMint: "SOL",
                outMint: "TOKEN",
                amountIn: "100000000",
                amountOut: "500000",
                executable: true,
                routers: ["Titan"],
            })
        ).toBeUndefined();
    });
});
