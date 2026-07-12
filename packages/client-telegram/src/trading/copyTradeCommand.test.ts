import { describe, expect, it } from "vitest";

import { parseCopyTradeCommand } from "./copyTradeCommand.ts";

const target = "11111111111111111111111111111111";

describe("copy-trade command parser", () => {
    it("parses legacy capped copytrade syntax", () => {
        expect(
            parseCopyTradeCommand([
                "add",
                target,
                "0.1",
                "1000",
                "500000",
                "copy-sells",
            ])
        ).toMatchObject({
            action: "add",
            targetWallet: target,
            buyMode: "percentage",
            buyPercentage: 100,
            maxBuySol: 0.1,
            minLiquidityUsd: 1000,
            maxMarketCapUsd: 500000,
            copySells: true,
            duplicateBuys: false,
        });
    });

    it("parses managed percentage sizing and filters", () => {
        expect(
            parseCopyTradeCommand([
                "add",
                target,
                "percent",
                "25",
                "0.5",
                "10000",
                "tag=Whale.One",
                "duplicate=on",
                "renounced=on",
                "excludepump=on",
                "minbuy=0.2",
                "minmcap=100000",
                "maxmcap=1000000",
                "blacklist=MintOne,MintTwo",
            ])
        ).toMatchObject({
            action: "add",
            buyMode: "percentage",
            buyPercentage: 25,
            maxBuySol: 0.5,
            minLiquidityUsd: 10000,
            tag: "Whale.One",
            duplicateBuys: true,
            onlyRenounced: true,
            excludePumpFunTokens: true,
            minTargetBuySol: 0.2,
            minMarketCapUsd: 100000,
            maxMarketCapUsd: 1000000,
            blacklistMints: ["MintOne", "MintTwo"],
        });
    });

    it("parses partial edits, clears, toggles, and per-strategy fees", () => {
        expect(
            parseCopyTradeCommand([
                "edit",
                "c_whale",
                "tag=none",
                "mode=fixed",
                "max=0.25",
                "minbuy=none",
                "minmcap=none",
                "maxmcap=750000",
                "sells=off",
                "duplicate=on",
                "renounced=on",
                "excludepump=on",
                "blacklist=none",
                "slippage=3.5",
                "buyfee=1000",
                "sellfee=2500",
            ])
        ).toEqual({
            action: "edit",
            configId: "c_whale",
            tag: null,
            targetWallet: undefined,
            buyMode: "fixed",
            buyPercentage: undefined,
            maxBuySol: 0.25,
            minTargetBuySol: null,
            minLiquidityUsd: undefined,
            minMarketCapUsd: null,
            maxMarketCapUsd: 750000,
            copySells: false,
            duplicateBuys: true,
            onlyRenounced: true,
            excludePumpFunTokens: true,
            blacklistMints: [],
            slippageBps: 350,
            priorityFeeLamports: 1000,
            sellPriorityFeeLamports: 2500,
            invalidOptions: [],
        });
    });

    it("reports unknown, duplicate, and malformed edit options", () => {
        expect(
            parseCopyTradeCommand([
                "edit",
                "c_whale",
                "mode=invalid",
                "sells=maybe",
                "max=0.1",
                "max=0.2",
                "unknown=value",
                "bare",
            ]).invalidOptions
        ).toEqual(["max=0.2", "unknown=value", "bare", "mode", "sells"]);
    });

    it("parses duplicate with an optional tag override", () => {
        expect(
            parseCopyTradeCommand(["duplicate", "c_whale", "tag=Whale.Copy"])
        ).toEqual({
            action: "duplicate",
            configId: "c_whale",
            tag: "Whale.Copy",
            invalidOptions: [],
        });
    });
});
