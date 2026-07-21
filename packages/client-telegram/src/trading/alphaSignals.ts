import {
    fetchRobinhoodAlphaSignals,
    type RobinhoodAlphaResult,
    type RobinhoodAlphaSignal,
} from "./frogx.ts";
import {
    TradingStateStore,
    type AlphaSignalCursor,
    type TradingUser,
} from "./state.ts";

const MAX_DELIVERY_BACKOFF_MS = 60 * 60 * 1000;

export type AlphaSignalBatch = {
    consumedSignalIds: string[];
    signals: RobinhoodAlphaSignal[];
    text?: string;
};

export type AlphaSignalPollResult = {
    status: "disabled" | "skipped_in_flight" | "completed";
    usersChecked: number;
    usersBaselined: number;
    messagesSent: number;
    backendFailures: number;
    deliveryFailures: number;
};

export type AlphaCommandAction = "show" | "on" | "off" | "status";

export function parseAlphaCommandAction(value: string | undefined): AlphaCommandAction {
    const normalized = value?.trim().toLowerCase();
    return normalized === "on" ||
        normalized === "off" ||
        normalized === "status"
        ? normalized
        : "show";
}

type AlphaSignalPollerOptions = {
    enabled: boolean;
    tgTrader: boolean;
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    pollIntervalMs: number;
    maxUsersPerPoll: number;
    maxSignalsPerMessage: number;
    store: TradingStateStore;
    sendMessage: (telegramUserId: string, text: string) => Promise<unknown>;
    logger?: {
        info: (...values: unknown[]) => void;
        warn: (...values: unknown[]) => void;
    };
    fetchSignals?: (input: {
        frogxApiBaseUrl: string;
        ftxApiToken?: string;
    }) => Promise<RobinhoodAlphaResult>;
    now?: () => Date;
};

export function buildAlphaSignalBatch(
    signals: RobinhoodAlphaSignal[],
    seenSignalIds: Iterable<string>,
    maxSignals: number
): AlphaSignalBatch {
    const seen = new Set(seenSignalIds);
    const unseen = signals
        .filter(
            (signal, index, all) =>
                !seen.has(signal.signalId) &&
                all.findIndex(
                    (candidate) => candidate.signalId === signal.signalId
                ) === index
        )
        .sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
    const selected = unseen.slice(0, Math.max(0, maxSignals));
    if (selected.length === 0) {
        return { consumedSignalIds: [], signals: [] };
    }
    return {
        consumedSignalIds: selected.map((signal) => signal.signalId),
        signals: selected,
        text: selected.map(formatAlphaSignalAlert).join("\n\n---\n\n"),
    };
}

export function formatAlphaSignalAlert(signal: RobinhoodAlphaSignal): string {
    const lines = [
        "Ribbot Robinhood Chain alpha signal",
        "",
        `${signal.tokenSymbol} — ${signal.qualifiedWalletCount} qualified wallets bought within ${signal.windowMinutes}m`,
        `Roster average score: ${signal.rosterAverageScore}/100`,
        `Pool age: ${formatDuration(signal.poolAgeMinutes)}`,
        `Liquidity: ${formatUsd(signal.liquidityUsd)}`,
        `24h volume: ${formatUsd(signal.volume24hUsd)}`,
        `Price: ${formatPrice(signal.priceUsd)}`,
        `Contract: ${signal.tokenAddress}`,
        `Chart: ${signal.geckoUrl}`,
        `Explorer: ${signal.explorerUrl}`,
    ];
    if (signal.provisional) {
        lines.push("Sample status: provisional (less than 30 observed days)");
    }
    lines.push("", signal.disclaimer);
    return lines.join("\n");
}

export function formatRobinhoodAlphaOverview(
    result: RobinhoodAlphaResult,
    optedIn: boolean,
    proactiveDeliveryEnabled: boolean
): string {
    const delivery = optedIn
        ? proactiveDeliveryEnabled
            ? "On"
            : "Opted in; operator delivery gate is off"
        : "Off";
    if (result.status === "not_configured") {
        return [
            "Ribbot Robinhood Alpha",
            "",
            "FTX/FrogX has not configured this read-only signal service.",
            `Proactive alerts: ${delivery}`,
        ].join("\n");
    }
    if (result.status === "not_ready") {
        return [
            "Ribbot Robinhood Alpha",
            "",
            result.scannerEnabled
                ? "The first scanner snapshot is still pending."
                : "The FTX scanner operator gate is off.",
            `Proactive alerts: ${delivery}`,
            ...result.warnings.map((warning) => `Warning: ${warning}`),
        ].join("\n");
    }

    const lines = [
        "Ribbot Robinhood Alpha",
        "",
        `Scanner: ${result.status === "ready" ? "Ready" : "Provisional"}`,
        `Observed history: ${result.observedHistoryDays.toFixed(1)} / 30 days`,
        `Qualified roster: ${result.summary.rosterWallets} / ${result.summary.candidateWallets} candidate wallets`,
        `Runner pools: ${result.summary.runnerPools}`,
        `Observed trades: ${result.summary.observedTrades}`,
        `Proactive alerts: ${delivery}`,
        `Last scan: ${result.generatedAt}`,
    ];
    if (result.signals.length === 0) {
        lines.push("", "No qualifying 4-wallet convergence signal is stored yet.");
    } else {
        lines.push("", "Latest signals:");
        for (const signal of result.signals.slice(0, 3)) {
            lines.push(
                `${signal.tokenSymbol}: ${signal.qualifiedWalletCount} wallets / ${signal.windowMinutes}m, liq ${formatUsd(signal.liquidityUsd)}`,
                `Contract: ${signal.tokenAddress}`,
                `Chart: ${signal.geckoUrl}`
            );
        }
    }
    if (result.lastError) lines.push("", `Last refresh error: ${result.lastError}`);
    lines.push(
        "",
        ...result.warnings.slice(0, 3).map((warning) => `Warning: ${warning}`)
    );
    return lines.join("\n");
}

export class AlphaSignalPoller {
    private readonly options: AlphaSignalPollerOptions;
    private timer?: ReturnType<typeof setInterval>;
    private activePoll?: Promise<AlphaSignalPollResult>;
    private userOffset = 0;

    constructor(options: AlphaSignalPollerOptions) {
        this.options = options;
    }

    start(): boolean {
        if (!this.isConfigured() || this.timer) return false;
        void this.pollOnce();
        this.timer = setInterval(
            () => void this.pollOnce(),
            this.options.pollIntervalMs
        );
        this.options.logger?.info(
            `Robinhood alpha alerts enabled with a ${this.options.pollIntervalMs}ms poll interval`
        );
        return true;
    }

    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        const active = this.activePoll;
        if (active) await active.catch(() => undefined);
    }

    isRunning(): boolean {
        return Boolean(this.timer);
    }

    async pollOnce(): Promise<AlphaSignalPollResult> {
        if (!this.isConfigured()) return emptyResult("disabled");
        if (this.activePoll) return emptyResult("skipped_in_flight");
        const poll = this.performPoll();
        this.activePoll = poll;
        try {
            return await poll;
        } finally {
            if (this.activePoll === poll) this.activePoll = undefined;
        }
    }

    private isConfigured(): boolean {
        return Boolean(
            this.options.enabled &&
                this.options.tgTrader &&
                this.options.ftxApiToken
        );
    }

    private async performPoll(): Promise<AlphaSignalPollResult> {
        const result = emptyResult("completed");
        const optedInUsers = this.options.store
            .listUsers()
            .filter((user) => user.alphaSignalsEnabled);
        if (optedInUsers.length === 0) return result;
        const users = selectUsers(
            optedInUsers,
            this.userOffset,
            this.options.maxUsersPerPoll
        );
        this.userOffset =
            (this.userOffset + users.length) % optedInUsers.length;

        let snapshot: RobinhoodAlphaResult;
        try {
            snapshot = await (
                this.options.fetchSignals ?? fetchRobinhoodAlphaSignals
            )({
                frogxApiBaseUrl: this.options.frogxApiBaseUrl,
                ftxApiToken: this.options.ftxApiToken,
            });
        } catch (error) {
            result.backendFailures = 1;
            this.options.logger?.warn("FTX Robinhood alpha fetch failed", error);
            return result;
        }
        if (snapshot.status !== "ready" && snapshot.status !== "provisional") {
            result.backendFailures = 1;
            return result;
        }

        for (const user of users) {
            const now = (this.options.now ?? (() => new Date()))();
            const cursor = this.options.store.getAlphaSignalCursor(user);
            if (isBackoffActive(cursor, now)) continue;
            result.usersChecked += 1;
            const observedAt = now.toISOString();
            if (!cursor) {
                this.options.store.initializeAlphaSignalCursor(
                    user,
                    snapshot.signals.map((signal) => signal.signalId),
                    observedAt
                );
                result.usersBaselined += 1;
                continue;
            }
            const batch = buildAlphaSignalBatch(
                snapshot.signals,
                cursor.seenEventIds,
                this.options.maxSignalsPerMessage
            );
            if (!batch.text) continue;
            try {
                await this.options.sendMessage(user.telegramUserId, batch.text);
                this.options.store.markAlphaSignalsDelivered(
                    user,
                    batch.consumedSignalIds,
                    observedAt
                );
                result.messagesSent += 1;
            } catch (error) {
                result.deliveryFailures += 1;
                const nextAttemptAt = new Date(
                    now.getTime() +
                        backoffMs(
                            cursor.consecutiveFailures ?? 0,
                            this.options.pollIntervalMs
                        )
                ).toISOString();
                this.options.store.markAlphaSignalDeliveryFailed(
                    user,
                    observedAt,
                    nextAttemptAt
                );
                this.options.logger?.warn(
                    "Telegram Robinhood alpha delivery failed",
                    error
                );
            }
        }
        return result;
    }
}

function emptyResult(
    status: AlphaSignalPollResult["status"]
): AlphaSignalPollResult {
    return {
        status,
        usersChecked: 0,
        usersBaselined: 0,
        messagesSent: 0,
        backendFailures: 0,
        deliveryFailures: 0,
    };
}

function selectUsers(
    users: TradingUser[],
    offset: number,
    limit: number
): TradingUser[] {
    if (users.length <= limit) return users;
    return Array.from({ length: limit }, (_, index) =>
        users[(offset + index) % users.length]
    );
}

function isBackoffActive(
    cursor: AlphaSignalCursor | undefined,
    now: Date
): boolean {
    if (!cursor?.nextAttemptAt) return false;
    const nextAttempt = Date.parse(cursor.nextAttemptAt);
    return Number.isFinite(nextAttempt) && nextAttempt > now.getTime();
}

function backoffMs(failures: number, pollIntervalMs: number): number {
    return Math.min(
        MAX_DELIVERY_BACKOFF_MS,
        Math.max(pollIntervalMs, 10_000) * 2 ** Math.max(0, failures)
    );
}

function formatUsd(value: number): string {
    if (!Number.isFinite(value)) return "unavailable";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value >= 1_000 ? 0 : 2,
        notation: value >= 1_000_000 ? "compact" : "standard",
    }).format(value);
}

function formatPrice(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "unavailable";
    if (value >= 0.01) return `$${value.toFixed(4)}`;
    return `$${value.toPrecision(4)}`;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
    return `${(minutes / 60).toFixed(1)}h`;
}
