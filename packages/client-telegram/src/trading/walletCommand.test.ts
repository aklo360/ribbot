import { describe, expect, it } from "vitest";

import { parseWalletCommand } from "./walletCommand.ts";

describe("wallet command parsing", () => {
    it("parses an active wallet selection", () => {
        expect(parseWalletCommand(["select", "2"])).toEqual({
            kind: "wallet",
            address: undefined,
            selection: 2,
        });
    });

    it("preserves the quote-only external wallet form", () => {
        expect(
            parseWalletCommand([
                "So11111111111111111111111111111111111111112",
            ])
        ).toEqual({
            kind: "wallet",
            address: "So11111111111111111111111111111111111111112",
            selection: undefined,
        });
    });

    it("rejects invalid selection indexes", () => {
        expect(parseWalletCommand(["select", "0"]).selection).toBeUndefined();
        expect(parseWalletCommand(["select", "2.5"]).selection).toBeUndefined();
    });
});
