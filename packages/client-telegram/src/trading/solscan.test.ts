import { describe, expect, it } from "vitest";
import {
    solscanTransactionLine,
    solscanTransactionLines,
    solscanTransactionUrl,
} from "./solscan.ts";

describe("Solscan transaction links", () => {
    it("builds an official transaction URL from a signature", () => {
        expect(solscanTransactionUrl("  signature-1  ")).toBe(
            "https://solscan.io/tx/signature-1"
        );
        expect(solscanTransactionLine("signature-1")).toBe(
            "Solscan: https://solscan.io/tx/signature-1"
        );
    });

    it("omits empty signatures and labels unique transaction links", () => {
        expect(
            solscanTransactionLines([
                "signature-1",
                undefined,
                "signature-1",
                "signature-2",
            ])
        ).toEqual([
            "Solscan 1: https://solscan.io/tx/signature-1",
            "Solscan 2: https://solscan.io/tx/signature-2",
        ]);
        expect(solscanTransactionLine(" ")).toBeUndefined();
    });
});
