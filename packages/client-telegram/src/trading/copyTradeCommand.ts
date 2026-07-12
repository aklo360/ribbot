const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type CopyTradeCommandIntent = {
    action?: "add" | "list" | "pause" | "resume" | "edit" | "duplicate";
    configId?: string;
    tag?: string | null;
    targetWallet?: string;
    buyMode?: "fixed" | "percentage";
    buyPercentage?: number;
    maxBuySol?: number;
    minTargetBuySol?: number | null;
    minLiquidityUsd?: number;
    minMarketCapUsd?: number | null;
    maxMarketCapUsd?: number | null;
    copySells?: boolean;
    duplicateBuys?: boolean;
    onlyRenounced?: boolean;
    excludePumpFunTokens?: boolean;
    blacklistMints?: string[];
    slippageBps?: number;
    priorityFeeLamports?: number;
    sellPriorityFeeLamports?: number;
    invalidOptions?: string[];
};

export function parseCopyTradeCommand(args: string[]): CopyTradeCommandIntent {
    const action = args[0]?.toLowerCase();
    if (action === "pause" || action === "resume") {
        return { action, configId: args[1] };
    }
    if (action === "duplicate") {
        const parsed = parseNamedOptions(args.slice(2), ["tag"]);
        return {
            action,
            configId: args[1],
            tag: parsed.values.get("tag"),
            invalidOptions: parsed.invalid,
        };
    }
    if (action === "edit") {
        return parseCopyTradeEdit(args);
    }
    if (action !== "add") return { action: "list" };

    const targetWallet = args.slice(1).find(isSolanaAddress);
    const targetIndex = targetWallet ? args.indexOf(targetWallet) : -1;
    const strategy = args[targetIndex + 1]?.toLowerCase();
    const enhanced = strategy === "fixed" || strategy === "percent";
    const positional = (
        enhanced
            ? args.slice(targetIndex + 2)
            : args.slice(Math.max(targetIndex + 1, 0))
    )
        .map(positiveNumber)
        .filter((value): value is number => value !== undefined);
    const option = (key: string) =>
        args
            .find((entry) => entry.toLowerCase().startsWith(`${key}=`))
            ?.slice(key.length + 1);
    const blacklist = option("blacklist");
    return {
        action: "add",
        tag: option("tag"),
        targetWallet,
        buyMode: strategy === "fixed" ? "fixed" : "percentage",
        buyPercentage: strategy === "percent" ? positional[0] : 100,
        maxBuySol: strategy === "percent" ? positional[1] : positional[0],
        minLiquidityUsd: strategy === "percent" ? positional[2] : positional[1],
        minTargetBuySol: optionalPositiveNumber(option("minbuy")),
        minMarketCapUsd: optionalPositiveNumber(option("minmcap")),
        maxMarketCapUsd:
            optionalPositiveNumber(option("maxmcap")) ??
            (!enhanced ? positional[2] : undefined),
        copySells: args.some((entry) =>
            ["copy-sells", "copysells", "sells"].includes(entry.toLowerCase())
        ),
        duplicateBuys: toggleValue(option("duplicate") ?? "off"),
        onlyRenounced: toggleValue(option("renounced") ?? "off"),
        excludePumpFunTokens: toggleValue(option("excludepump") ?? "off"),
        blacklistMints: blacklist ? blacklist.split(",").filter(Boolean) : [],
    };
}

function parseCopyTradeEdit(args: string[]): CopyTradeCommandIntent {
    const parsed = parseNamedOptions(args.slice(2), [
        "tag",
        "target",
        "mode",
        "percent",
        "max",
        "minbuy",
        "minliq",
        "minmcap",
        "maxmcap",
        "sells",
        "duplicate",
        "renounced",
        "excludepump",
        "blacklist",
        "slippage",
        "buyfee",
        "sellfee",
    ]);
    const invalid = [...parsed.invalid];
    const optionalNumber = (
        key: string,
        clearable = false,
        nonNegative = false
    ): number | null | undefined => {
        const raw = parsed.values.get(key);
        if (raw === undefined) return undefined;
        if (clearable && raw.toLowerCase() === "none") return null;
        const value = nonNegative
            ? nonNegativeNumber(raw)
            : positiveNumber(raw);
        if (value === undefined) invalid.push(key);
        return value;
    };
    const optionalToggle = (key: string): boolean | undefined => {
        const raw = parsed.values.get(key);
        if (raw === undefined) return undefined;
        const value = toggleValue(raw);
        if (value === undefined) invalid.push(key);
        return value;
    };
    const modeValue = parsed.values.get("mode")?.toLowerCase();
    const buyMode =
        modeValue === "fixed"
            ? "fixed"
            : modeValue === "percent" || modeValue === "percentage"
              ? "percentage"
              : undefined;
    if (modeValue && !buyMode) invalid.push("mode");
    const tag = parsed.values.get("tag");
    const blacklist = parsed.values.get("blacklist");
    const slippage = optionalNumber("slippage", false, true);
    return {
        action: "edit",
        configId: args[1],
        tag: tag?.toLowerCase() === "none" ? null : tag,
        targetWallet: parsed.values.get("target"),
        buyMode,
        buyPercentage: optionalNumber("percent") as number | undefined,
        maxBuySol: optionalNumber("max") as number | undefined,
        minTargetBuySol: optionalNumber("minbuy", true),
        minLiquidityUsd: optionalNumber("minliq") as number | undefined,
        minMarketCapUsd: optionalNumber("minmcap", true),
        maxMarketCapUsd: optionalNumber("maxmcap", true),
        copySells: optionalToggle("sells"),
        duplicateBuys: optionalToggle("duplicate"),
        onlyRenounced: optionalToggle("renounced"),
        excludePumpFunTokens: optionalToggle("excludepump"),
        blacklistMints:
            blacklist === undefined
                ? undefined
                : blacklist.toLowerCase() === "none"
                  ? []
                  : blacklist.split(",").filter(Boolean),
        slippageBps:
            slippage === undefined || slippage === null
                ? undefined
                : Math.round(slippage * 100),
        priorityFeeLamports: optionalNumber("buyfee", false, true) as
            | number
            | undefined,
        sellPriorityFeeLamports: optionalNumber("sellfee", false, true) as
            | number
            | undefined,
        invalidOptions: [...new Set(invalid)],
    };
}

function parseNamedOptions(
    entries: string[],
    allowed: string[]
): { values: Map<string, string>; invalid: string[] } {
    const allowedKeys = new Set(allowed);
    const values = new Map<string, string>();
    const invalid: string[] = [];
    for (const entry of entries) {
        const separator = entry.indexOf("=");
        const key = entry.slice(0, separator).toLowerCase();
        const value = separator >= 0 ? entry.slice(separator + 1) : "";
        if (
            separator <= 0 ||
            !allowedKeys.has(key) ||
            !value ||
            values.has(key)
        ) {
            invalid.push(entry);
            continue;
        }
        values.set(key, value);
    }
    return { values, invalid };
}

function optionalPositiveNumber(value?: string): number | undefined {
    return value === undefined ? undefined : positiveNumber(value);
}

function positiveNumber(value: string): number | undefined {
    const parsed = Number(value.replace(/%$/, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function nonNegativeNumber(value: string): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function toggleValue(value: string): boolean | undefined {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return undefined;
}

function isSolanaAddress(value: string): boolean {
    return SOLANA_ADDRESS_PATTERN.test(value);
}
