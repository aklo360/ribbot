import {
    fetchActivity,
    type ActivityEvent,
    type ActivityResult,
} from "./frogx.ts";
import {
    TradingStateStore,
    type ActivityAlertCursor,
    type TradingUser,
} from "./state.ts";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const ACTIVITY_FETCH_LIMIT = 100;
const MAX_DELIVERY_BACKOFF_MS = 60 * 60 * 1000;

const TRADE_ALERT_EVENT_TYPES = new Set([
    "swap_executed",
    "swap_execution_failed",
    "withdrawal_executed",
    "withdrawal_execution_failed",
    "automation_order_executed",
    "automation_order_failed",
    "automation_order_reconciliation_required",
    "automation_order_reconciled",
    "advanced_automation_config_executed",
    "advanced_automation_config_failed",
    "advanced_automation_config_reconciled",
    "execution_reconciliation_required",
]);

const REVIEW_ALERT_EVENT_TYPES = new Set([
    "execution_manual_review_required",
    "execution_manual_review_acknowledged",
    "execution_manual_review_resolved",
]);

type AlertGroup = {
    family: "trade" | "review";
    identifiers: Set<string>;
    events: ActivityEvent[];
};

export type ActivityAlertNotification = {
    eventIds: string[];
    createdAt: string;
    title: string;
    detail?: string;
};

export type ActivityAlertBatch = {
    consumedEventIds: string[];
    notifications: ActivityAlertNotification[];
    text?: string;
};

export type ActivityAlertPollResult = {
    status: "disabled" | "skipped_in_flight" | "completed";
    usersChecked: number;
    usersBaselined: number;
    messagesSent: number;
    backendFailures: number;
    deliveryFailures: number;
};

type ActivityAlertPollerOptions = {
    enabled: boolean;
    tgTrader: boolean;
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    pollIntervalMs: number;
    maxUsersPerPoll: number;
    maxEventsPerMessage: number;
    store: TradingStateStore;
    sendMessage: (telegramUserId: string, text: string) => Promise<unknown>;
    logger?: {
        info: (...values: unknown[]) => void;
        warn: (...values: unknown[]) => void;
    };
    fetchActivity?: (input: {
        frogxApiBaseUrl: string;
        ftxApiToken?: string;
        telegramUserId: string;
        limit?: number;
    }) => Promise<ActivityResult>;
    now?: () => Date;
};

export function buildActivityAlertBatch(
    events: ActivityEvent[],
    seenEventIds: Iterable<string>,
    maxEvents: number
): ActivityAlertBatch {
    const seen = new Set(seenEventIds);
    const unseen = events.filter(
        (event, index, all) =>
            !seen.has(event.eventId) &&
            all.findIndex(
                (candidate) => candidate.eventId === event.eventId
            ) === index
    );
    const ignoredEventIds = unseen
        .filter((event) => !alertFamily(event))
        .map((event) => event.eventId);
    const groups = groupAlertEvents(
        unseen.filter((event) => Boolean(alertFamily(event)))
    ).sort((a, b) => groupCreatedAt(a).localeCompare(groupCreatedAt(b)));
    const selected = groups.slice(0, Math.max(0, maxEvents));
    const notifications = selected.map(projectAlertGroup);
    const consumedEventIds = uniqueStrings([
        ...ignoredEventIds,
        ...selected.flatMap((group) =>
            group.events.map((event) => event.eventId)
        ),
    ]);

    if (notifications.length === 0) {
        return { consumedEventIds, notifications };
    }

    const lines = [
        notifications.length === 1
            ? "FTX trade update"
            : `FTX trade updates (${notifications.length})`,
        "",
    ];
    notifications.forEach((notification, index) => {
        lines.push(`${index + 1}. ${notification.title}`);
        if (notification.detail) lines.push(`   ${notification.detail}`);
        lines.push(`   ${notification.createdAt}`);
    });

    return {
        consumedEventIds,
        notifications,
        text: lines.join("\n"),
    };
}

export class ActivityAlertPoller {
    private readonly options: ActivityAlertPollerOptions;
    private timer?: ReturnType<typeof setInterval>;
    private activePoll?: Promise<ActivityAlertPollResult>;
    private userOffset = 0;

    constructor(options: ActivityAlertPollerOptions) {
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
            `FTX activity alerts enabled with a ${this.options.pollIntervalMs}ms poll interval`
        );
        return true;
    }

    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        const activePoll = this.activePoll;
        if (activePoll) {
            await activePoll.catch(() => undefined);
        }
    }

    isRunning(): boolean {
        return Boolean(this.timer);
    }

    async pollOnce(): Promise<ActivityAlertPollResult> {
        if (!this.isConfigured()) return emptyPollResult("disabled");
        if (this.activePoll) return emptyPollResult("skipped_in_flight");

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

    private async performPoll(): Promise<ActivityAlertPollResult> {
        const result = emptyPollResult("completed");
        const users = this.options.store.listUsers();
        if (users.length === 0) return result;

        const usersToPoll = selectUsers(
            users,
            this.userOffset,
            this.options.maxUsersPerPoll
        );
        this.userOffset = (this.userOffset + usersToPoll.length) % users.length;

        for (const user of usersToPoll) {
            const now = (this.options.now ?? (() => new Date()))();
            const cursor = this.options.store.getActivityAlertCursor(user);
            if (isDeliveryBackoffActive(cursor, now)) continue;
            result.usersChecked += 1;

            let activity: ActivityResult;
            try {
                activity = await (this.options.fetchActivity ?? fetchActivity)({
                    frogxApiBaseUrl: this.options.frogxApiBaseUrl,
                    ftxApiToken: this.options.ftxApiToken,
                    telegramUserId: user.telegramUserId,
                    limit: ACTIVITY_FETCH_LIMIT,
                });
            } catch (error) {
                result.backendFailures += 1;
                this.options.logger?.warn(
                    "FTX activity alert fetch failed",
                    error
                );
                continue;
            }

            if (activity.status !== "ready") {
                result.backendFailures += 1;
                continue;
            }

            const observedAt = now.toISOString();
            if (!cursor) {
                this.options.store.initializeActivityAlertCursor(
                    user,
                    activity.events.map((event) => event.eventId),
                    observedAt
                );
                result.usersBaselined += 1;
                continue;
            }

            const batch = buildActivityAlertBatch(
                activity.events,
                cursor.seenEventIds,
                this.options.maxEventsPerMessage
            );
            if (!batch.text) {
                if (batch.consumedEventIds.length > 0) {
                    this.options.store.markActivityAlertEventsSeen(
                        user,
                        batch.consumedEventIds,
                        observedAt
                    );
                }
                continue;
            }

            try {
                await this.options.sendMessage(user.telegramUserId, batch.text);
                this.options.store.markActivityAlertsDelivered(
                    user,
                    batch.consumedEventIds,
                    observedAt
                );
                result.messagesSent += 1;
            } catch (error) {
                result.deliveryFailures += 1;
                const nextAttemptAt = new Date(
                    now.getTime() +
                        deliveryBackoffMs(
                            cursor.consecutiveFailures ?? 0,
                            this.options.pollIntervalMs
                        )
                ).toISOString();
                this.options.store.markActivityAlertDeliveryFailed(
                    user,
                    observedAt,
                    nextAttemptAt
                );
                this.options.logger?.warn(
                    "Telegram activity alert delivery failed",
                    error
                );
            }
        }

        return result;
    }
}

function emptyPollResult(
    status: ActivityAlertPollResult["status"]
): ActivityAlertPollResult {
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
    const count = Math.min(users.length, Math.max(0, limit));
    return Array.from(
        { length: count },
        (_, index) => users[(offset + index) % users.length]
    );
}

function isDeliveryBackoffActive(
    cursor: ActivityAlertCursor | undefined,
    now: Date
): boolean {
    if (!cursor?.nextAttemptAt) return false;
    const nextAttempt = Date.parse(cursor.nextAttemptAt);
    return Number.isFinite(nextAttempt) && nextAttempt > now.getTime();
}

function deliveryBackoffMs(
    previousFailures: number,
    pollIntervalMs: number
): number {
    const base = Math.max(30_000, pollIntervalMs);
    return Math.min(
        base * 2 ** Math.min(Math.max(previousFailures, 0), 7),
        MAX_DELIVERY_BACKOFF_MS
    );
}

function alertFamily(event: ActivityEvent): AlertGroup["family"] | undefined {
    if (TRADE_ALERT_EVENT_TYPES.has(event.eventType)) return "trade";
    if (REVIEW_ALERT_EVENT_TYPES.has(event.eventType)) return "review";
    return undefined;
}

function groupAlertEvents(events: ActivityEvent[]): AlertGroup[] {
    const groups: AlertGroup[] = [];
    for (const event of events) {
        const family = alertFamily(event);
        if (!family) continue;
        const identifiers = alertIdentifiers(event, family);
        const matchingIndexes = groups
            .map((group, index) =>
                setsIntersect(group.identifiers, identifiers) ? index : -1
            )
            .filter((index) => index >= 0);

        if (matchingIndexes.length === 0) {
            groups.push({ family, identifiers, events: [event] });
            continue;
        }

        const primary = groups[matchingIndexes[0]];
        primary.events.push(event);
        identifiers.forEach((identifier) =>
            primary.identifiers.add(identifier)
        );
        for (const index of matchingIndexes.slice(1).reverse()) {
            const merged = groups[index];
            primary.events.push(...merged.events);
            merged.identifiers.forEach((identifier) =>
                primary.identifiers.add(identifier)
            );
            groups.splice(index, 1);
        }
    }
    return groups;
}

function alertIdentifiers(
    event: ActivityEvent,
    family: AlertGroup["family"]
): Set<string> {
    const metadata = event.metadata ?? {};
    if (family === "review") {
        const caseId = plainValue(metadata.caseId);
        const referenceId = plainValue(metadata.referenceId);
        const values = [
            caseId ? `review:${caseId}` : undefined,
            referenceId ? `execution:${referenceId}` : undefined,
        ].filter((value): value is string => Boolean(value));
        return new Set(
            values.length > 0 ? values : [`review:${event.eventId}`]
        );
    }

    const executionId = plainValue(metadata.executionId);
    const values = [
        plainValue(metadata.referenceId),
        plainValue(metadata.signature),
        plainValue(metadata.transactionId),
        executionId,
        executionId ? undefined : plainValue(metadata.orderId),
    ].filter((value): value is string => Boolean(value));
    return new Set(
        values.length > 0
            ? values.map((value) => `execution:${value}`)
            : [`execution:${event.eventId}`]
    );
}

function setsIntersect(a: Set<string>, b: Set<string>): boolean {
    for (const value of a) {
        if (b.has(value)) return true;
    }
    return false;
}

function groupCreatedAt(group: AlertGroup): string {
    return group.events.reduce(
        (latest, event) =>
            event.createdAt.localeCompare(latest) > 0
                ? event.createdAt
                : latest,
        group.events[0]?.createdAt ?? ""
    );
}

function projectAlertGroup(group: AlertGroup): ActivityAlertNotification {
    const event = [...group.events].sort((a, b) => {
        const priority = alertPriority(b) - alertPriority(a);
        return priority || b.createdAt.localeCompare(a.createdAt);
    })[0];
    return {
        eventIds: uniqueStrings(group.events.map((item) => item.eventId)),
        createdAt: event.createdAt,
        title: alertTitle(event),
        detail: alertDetail(event),
    };
}

function alertPriority(event: ActivityEvent): number {
    const priorities: Record<string, number> = {
        advanced_automation_config_reconciled: 140,
        automation_order_reconciled: 135,
        advanced_automation_config_failed: 130,
        advanced_automation_config_executed: 130,
        automation_order_failed: 125,
        automation_order_executed: 125,
        withdrawal_execution_failed: 120,
        withdrawal_executed: 120,
        swap_execution_failed: 115,
        swap_executed: 115,
        execution_manual_review_resolved: 110,
        execution_manual_review_acknowledged: 100,
        execution_manual_review_required: 95,
        automation_order_reconciliation_required: 60,
        execution_reconciliation_required: 55,
    };
    return priorities[event.eventType] ?? 0;
}

function alertTitle(event: ActivityEvent): string {
    const metadata = event.metadata ?? {};
    const resolution = plainValue(metadata.resolution);

    if (event.eventType === "execution_manual_review_required") {
        return "Execution needs manual review";
    }
    if (event.eventType === "execution_manual_review_acknowledged") {
        return "Manual review acknowledged";
    }
    if (event.eventType === "execution_manual_review_resolved") {
        return resolution === "executed"
            ? "Manual review confirmed execution"
            : "Manual review confirmed failure";
    }
    if (event.eventType === "execution_reconciliation_required") {
        const kind = plainValue(metadata.executionKind) || "execution";
        return `${titleCase(kind)} status uncertain`;
    }

    if (event.eventType.startsWith("automation_order_")) {
        const subject = `${scheduledKindLabel(metadata.kind)} order`;
        if (event.eventType.endsWith("reconciliation_required")) {
            return `${subject} status uncertain`;
        }
        if (event.eventType.endsWith("reconciled")) {
            return `${subject} ${resolution === "failed" ? "failed" : "confirmed"}`;
        }
        return `${subject} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
    }

    if (event.eventType.startsWith("advanced_automation_config_")) {
        const subject = advancedKindLabel(metadata.kind);
        if (event.eventType.endsWith("reconciled")) {
            return `${subject} ${resolution === "failed" ? "failed" : "confirmed"}`;
        }
        return `${subject} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
    }

    if (event.eventType.startsWith("withdrawal_")) {
        return event.eventType.endsWith("failed")
            ? "Withdrawal failed"
            : "Withdrawal executed";
    }

    const side = swapSide(metadata);
    return `${titleCase(side)} ${event.eventType.endsWith("failed") ? "failed" : "executed"}`;
}

function alertDetail(event: ActivityEvent): string | undefined {
    const metadata = event.metadata ?? {};
    const side = activityEventSide(event);
    const mint = tradeMint(metadata, side);
    const amount = tradeAmount(metadata, side);
    const sellBps = numericValue(metadata.sellBps);
    const parts = [
        side ? titleCase(side) : undefined,
        mint ? `token ${shortValue(mint)}` : undefined,
        amount,
        sellBps !== undefined ? `${formatPercentBps(sellBps)} sold` : undefined,
        plainValue(metadata.providerStatus)
            ? `provider ${plainValue(metadata.providerStatus)}`
            : undefined,
        plainValue(metadata.signature)
            ? `sig ${shortValue(plainValue(metadata.signature) as string)}`
            : undefined,
        plainValue(metadata.reason)
            ? truncate(plainValue(metadata.reason) as string, 160)
            : undefined,
    ].filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(" | ") : undefined;
}

function activityEventSide(event: ActivityEvent): string | undefined {
    const metadata = event.metadata ?? {};
    const explicit = plainValue(metadata.side ?? metadata.copyTradeSide);
    if (explicit) return explicit;
    if (event.eventType.startsWith("swap_")) return swapSide(metadata);

    const kind = plainValue(metadata.kind);
    if (kind === "auto_buy" || kind === "sniper" || kind === "bundle_buy") {
        return "buy";
    }
    return kind === "auto_sell" ? "sell" : undefined;
}

function swapSide(metadata: Record<string, unknown>): string {
    const explicit = plainValue(metadata.side ?? metadata.copyTradeSide);
    if (explicit) return explicit;
    const inMint = plainValue(metadata.inMint);
    const outMint = plainValue(metadata.outMint);
    if (inMint === SOL_MINT) return "buy";
    if (outMint === SOL_MINT) return "sell";
    return "swap";
}

function tradeMint(
    metadata: Record<string, unknown>,
    side?: string
): string | undefined {
    const direct = plainValue(metadata.mint);
    if (direct) return direct;
    return side === "sell"
        ? plainValue(metadata.inMint)
        : plainValue(metadata.outMint);
}

function tradeAmount(
    metadata: Record<string, unknown>,
    side?: string
): string | undefined {
    const label = plainValue(metadata.amountLabel);
    if (label) return label;
    const amountIn = plainValue(metadata.amountIn);
    const inMint = plainValue(metadata.inMint);
    if (!amountIn || !/^\d+$/.test(amountIn)) return undefined;
    if (inMint !== SOL_MINT && side !== "buy") return undefined;

    const lamports = Number(amountIn);
    if (!Number.isSafeInteger(lamports)) return undefined;
    return `${formatDecimal(lamports / 1_000_000_000)} SOL`;
}

function advancedKindLabel(value: unknown): string {
    const labels: Record<string, string> = {
        copytrade: "Copy trade",
        sniper: "Sniper buy",
        auto_buy: "Auto-buy",
        auto_sell: "Auto-sell",
        bundle_buy: "Bundle buy",
    };
    const kind = plainValue(value) || "automation";
    return labels[kind] ?? titleCase(kind);
}

function scheduledKindLabel(value: unknown): string {
    const kind = plainValue(value) || "scheduled";
    return kind === "dca" ? "DCA" : titleCase(kind);
}

function plainValue(value: unknown): string | undefined {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }
    const clean = String(value)
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return clean || undefined;
}

function numericValue(value: unknown): number | undefined {
    if (
        typeof value !== "number" &&
        (typeof value !== "string" || !value.trim())
    ) {
        return undefined;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
}

function shortValue(value: string): string {
    return value.length <= 14
        ? value
        : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function truncate(value: string, limit: number): string {
    return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

function titleCase(value: string): string {
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPercentBps(bps: number): string {
    return `${formatDecimal(bps / 100)}%`;
}

function formatDecimal(value: number): string {
    return value.toLocaleString("en-US", {
        maximumFractionDigits: 9,
        useGrouping: false,
    });
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
}
