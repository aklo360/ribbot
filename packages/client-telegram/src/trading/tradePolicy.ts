export type TradeConfirmationSettings = {
    botMode: "simple" | "advanced";
    confirmTrades: boolean;
    sellProtection: boolean;
};

export function requiresTradeConfirmation(
    settings: TradeConfirmationSettings,
    side: "buy" | "sell",
    sellPercent?: number
): boolean {
    if (side === "sell" && settings.sellProtection && (sellPercent ?? 0) > 75) {
        return true;
    }
    return settings.botMode === "advanced" && settings.confirmTrades;
}
