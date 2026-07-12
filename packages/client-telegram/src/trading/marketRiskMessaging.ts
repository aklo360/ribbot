import type { MarketRiskQuoteProbe } from "./frogx.ts";

export function marketRiskQuoteBlockingReason(
    quoteProbe: MarketRiskQuoteProbe
): string | undefined {
    if (quoteProbe.status === "ready") return undefined;
    if (quoteProbe.status === "not_configured") {
        const required = (quoteProbe.required ?? []).join(", ") || "quote credentials";
        return `FTX/FrogX did not verify liquidity or price impact because ${required} is not configured. This is not a safety pass.`;
    }
    return `FTX/FrogX did not verify liquidity or price impact: ${quoteProbe.reason} This is not a safety pass.`;
}
