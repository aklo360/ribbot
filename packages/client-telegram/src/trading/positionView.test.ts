import { describe, expect, it } from "vitest";

import {
    buildPositionPage,
    parsePositionPageIndex,
    positionCallbackData,
    positionVisibilityCallbackData,
} from "./positionView.ts";

const token = (index: number, overrides = {}) => ({
    mint: `mint-${index}`,
    amount: "1",
    hidden: false,
    ...overrides,
});

describe("position view pagination", () => {
    it("excludes hidden and empty balances before paginating", () => {
        const page = buildPositionPage(
            [
                token(1),
                token(2, { hidden: true }),
                token(3, { amount: "0" }),
                token(4),
                token(5),
            ],
            0,
            2
        );

        expect(page).toMatchObject({
            page: 0,
            totalPages: 2,
            totalItems: 3,
            startIndex: 0,
        });
        expect(page.items.map((item) => item.mint)).toEqual([
            "mint-1",
            "mint-4",
        ]);
    });

    it("clamps stale page callbacks after a position disappears", () => {
        const page = buildPositionPage(
            Array.from({ length: 7 }, (_, index) => token(index + 1)),
            99,
            5
        );

        expect(page).toMatchObject({
            page: 1,
            totalPages: 2,
            startIndex: 5,
        });
        expect(page.items.map((item) => item.mint)).toEqual([
            "mint-6",
            "mint-7",
        ]);
    });

    it("normalizes callback page indexes", () => {
        expect(parsePositionPageIndex("3")).toBe(3);
        expect(parsePositionPageIndex("-1")).toBe(0);
        expect(parsePositionPageIndex("not-a-page")).toBe(0);
    });

    it("keeps maximum-length mint callbacks within Telegram's limit", () => {
        const mint = "1".repeat(44);
        expect(
            Buffer.byteLength(positionCallbackData(mint, 9))
        ).toBeLessThanOrEqual(64);
        expect(
            Buffer.byteLength(positionVisibilityCallbackData(mint, 9, "hide"))
        ).toBeLessThanOrEqual(64);
    });
});
