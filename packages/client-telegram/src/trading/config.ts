import type { IAgentRuntime } from "@elizaos/core";

export type TradingConfig = {
    tgTrader: boolean;
    tradingEnabled: boolean;
    dryRun: boolean;
    quotePreviewsEnabled: boolean;
    confirmTrades: boolean;
    activityAlertsEnabled: boolean;
    activityAlertPollIntervalMs: number;
    activityAlertMaxUsersPerPoll: number;
    activityAlertMaxEventsPerMessage: number;
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    stateFile: string;
    defaultBuySol: number;
    slippageBps: number;
    priorityFeeLamports: number;
};

const truthy = new Set(["1", "true", "yes", "on"]);
const falsy = new Set(["0", "false", "no", "off"]);

export function parseBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return fallback;

    const normalized = value.trim().toLowerCase();
    if (truthy.has(normalized)) return true;
    if (falsy.has(normalized)) return false;
    return fallback;
}

function getSetting(runtime: IAgentRuntime, key: string): string | undefined {
    const value = runtime.getSetting(key) || process.env[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumberSetting(
    runtime: IAgentRuntime,
    key: string,
    fallback: number
): number {
    const raw = getSetting(runtime, key);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getBoundedIntegerSetting(
    runtime: IAgentRuntime,
    key: string,
    fallback: number,
    min: number,
    max: number
): number {
    const parsed = getNumberSetting(runtime, key, fallback);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function loadTradingConfig(runtime: IAgentRuntime): TradingConfig {
    const tgTrader = parseBoolean(getSetting(runtime, "TG_TRADER"), false);
    const tradingEnabled = parseBoolean(
        getSetting(runtime, "RIBBOT_TRADING_ENABLED"),
        false
    );

    return {
        tgTrader,
        tradingEnabled,
        dryRun: parseBoolean(
            getSetting(runtime, "RIBBOT_TRADING_DRY_RUN"),
            true
        ),
        quotePreviewsEnabled: parseBoolean(
            getSetting(runtime, "RIBBOT_QUOTE_PREVIEWS_ENABLED"),
            true
        ),
        confirmTrades: parseBoolean(
            getSetting(runtime, "RIBBOT_TRADING_CONFIRM_TRADES"),
            true
        ),
        activityAlertsEnabled: parseBoolean(
            getSetting(runtime, "RIBBOT_ACTIVITY_ALERTS_ENABLED"),
            false
        ),
        activityAlertPollIntervalMs: getBoundedIntegerSetting(
            runtime,
            "RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS",
            30_000,
            10_000,
            300_000
        ),
        activityAlertMaxUsersPerPoll: getBoundedIntegerSetting(
            runtime,
            "RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL",
            25,
            1,
            100
        ),
        activityAlertMaxEventsPerMessage: getBoundedIntegerSetting(
            runtime,
            "RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE",
            5,
            1,
            10
        ),
        frogxApiBaseUrl:
            getSetting(runtime, "FROGX_API_BASE_URL") ||
            "https://frogx-api.aklo.workers.dev",
        ftxApiToken: getSetting(runtime, "RIBBOT_FTX_API_TOKEN"),
        stateFile:
            getSetting(runtime, "RIBBOT_TRADING_STATE_FILE") ||
            ".state/ribbot-trading.json",
        defaultBuySol: getNumberSetting(runtime, "RIBBOT_DEFAULT_BUY_SOL", 0.1),
        slippageBps: getNumberSetting(
            runtime,
            "RIBBOT_TRADING_SLIPPAGE_BPS",
            500
        ),
        priorityFeeLamports: getNumberSetting(
            runtime,
            "RIBBOT_TRADING_PRIORITY_FEE_LAMPORTS",
            0
        ),
    };
}
