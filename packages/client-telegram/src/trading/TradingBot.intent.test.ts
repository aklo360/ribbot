import { describe, expect, it } from "vitest";

import { parseAutoBuyIntent } from "./autoBuyCommand.ts";

describe("Instant Auto Buy command parsing", () => {
    it("parses the account-level pasted-CA profile", () => {
        expect(
            parseAutoBuyIntent(["instant", "on", "0.15", "2500", "2000000"])
        ).toEqual({
            kind: "autoBuy",
            action: "instant",
            enabled: true,
            maxBuySol: 0.15,
            minLiquidityUsd: 2500,
            maxMarketCapUsd: 2_000_000,
        });
    });

    it("parses a fail-safe disable without changing token rules", () => {
        expect(parseAutoBuyIntent(["instant", "off"])).toEqual({
            kind: "autoBuy",
            action: "instant",
            enabled: false,
            maxBuySol: undefined,
            minLiquidityUsd: undefined,
            maxMarketCapUsd: undefined,
        });
    });
});
