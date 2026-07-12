const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type AutoBuyCommandIntent = {
    kind: "autoBuy";
    action: "add" | "list" | "instant";
    enabled?: boolean;
    mint?: string;
    maxBuySol?: number;
    minLiquidityUsd?: number;
    maxMarketCapUsd?: number;
};

const positiveNumber = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const toggleValue = (value?: string): boolean | undefined => {
    const normalized = value?.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized ?? "")) return true;
    if (["0", "false", "no", "off"].includes(normalized ?? "")) return false;
    return undefined;
};

const mintValue = (values: string[]): string | undefined =>
    values.find(
        (value) => SOLANA_ADDRESS_PATTERN.test(value) && value !== SOL_MINT
    );

export function parseAutoBuyIntent(args: string[]): AutoBuyCommandIntent {
    if (args[0]?.toLowerCase() === "instant") {
        const numbers = args
            .slice(2)
            .map(positiveNumber)
            .filter((value): value is number => value !== undefined);
        return {
            kind: "autoBuy",
            action: "instant",
            enabled: toggleValue(args[1]),
            maxBuySol: numbers[0],
            minLiquidityUsd: numbers[1],
            maxMarketCapUsd: numbers[2],
        };
    }
    if (args[0]?.toLowerCase() !== "add") {
        return { kind: "autoBuy", action: "list" };
    }

    const mint = mintValue(args.slice(1));
    const start = mint ? args.indexOf(mint) + 1 : 1;
    const numbers = args
        .slice(start)
        .map(positiveNumber)
        .filter((value): value is number => value !== undefined);
    return {
        kind: "autoBuy",
        action: "add",
        mint,
        maxBuySol: numbers[0],
        minLiquidityUsd: numbers[1],
        maxMarketCapUsd: numbers[2],
    };
}
