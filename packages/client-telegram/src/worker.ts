/// <reference types="@cloudflare/workers-types" />

import type { Update, UserFromGetMe } from "@telegraf/types";
import { Context, Telegraf } from "telegraf";

import type { SettingsSource } from "./trading/config.ts";
import { TradingBot } from "./trading/TradingBot.ts";
import {
    TradingStateStore,
    type StoreShape,
    type TradingUser,
} from "./trading/state.ts";

const INTERNAL_ORIGIN = "https://ribbot-coordinator.internal";
const UPDATE_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
const FROG_CONFIRMATION_ALARM_MS = 3_000;
const MAX_WEBHOOK_BYTES = 1_000_000;

export interface Env {
    RIBBOT_COORDINATOR: DurableObjectNamespace;
    TELEGRAM_BOT_TOKEN?: string;
    RIBBOT_FTX_API_TOKEN?: string;
    RIBBOT_WEBHOOK_SECRET?: string;
    TG_TRADER?: string;
    RIBBOT_SPOT_ENABLED?: string;
    RIBBOT_NFT_TRADING_ENABLED?: string;
    RIBBOT_TRADING_ENABLED?: string;
    RIBBOT_TRADING_DRY_RUN?: string;
    RIBBOT_QUOTE_PREVIEWS_ENABLED?: string;
    RIBBOT_TRADING_CONFIRM_TRADES?: string;
    RIBBOT_ACTIVITY_ALERTS_ENABLED?: string;
    RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL?: string;
    RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE?: string;
    FROGX_API_BASE_URL?: string;
    [key: string]: unknown;
}

type SqlUserRow = {
    user_id: string;
    state_json: string;
};

type SqlMetadataRow = {
    value: string;
};

type SqlProcessedUpdateRow = {
    status: string;
};

function coordinatorStub(env: Env): DurableObjectStub {
    return env.RIBBOT_COORDINATOR.get(
        env.RIBBOT_COORDINATOR.idFromName("primary")
    );
}

function jsonResponse(body: unknown, status = 200): Response {
    return Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function settingsFromEnv(env: Env): SettingsSource {
    return {
        getSetting: (key) => env[key],
    };
}

function updateUserId(update: Update): string | undefined {
    if ("message" in update && update.message.from) {
        return String(update.message.from.id);
    }
    if ("callback_query" in update) {
        return String(update.callback_query.from.id);
    }
    return undefined;
}

function isPrivateUpdate(update: Update): boolean {
    if ("message" in update) return update.message.chat.type === "private";
    if ("callback_query" in update && update.callback_query.message) {
        return update.callback_query.message.chat.type === "private";
    }
    return false;
}

function parseUpdate(raw: string): Update | undefined {
    try {
        const value = JSON.parse(raw) as Partial<Update>;
        return Number.isSafeInteger(value.update_id)
            ? (value as Update)
            : undefined;
    } catch {
        return undefined;
    }
}

async function secretsMatch(
    expected: string,
    actual: string
): Promise<boolean> {
    const encoder = new TextEncoder();
    const [expectedHash, actualHash] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(expected)),
        crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    ]);
    const left = new Uint8Array(expectedHash);
    const right = new Uint8Array(actualHash);
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left[index] ^ right[index];
    }
    return difference === 0;
}

export async function handleWorkerRequest(
    request: Request,
    env: Env
): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
        return coordinatorStub(env).fetch(`${INTERNAL_ORIGIN}/health`);
    }

    if (request.method !== "POST" || url.pathname !== "/telegram") {
        return jsonResponse({ ok: false, error: "not_found" }, 404);
    }

    const expectedSecret = env.RIBBOT_WEBHOOK_SECRET?.trim();
    if (!expectedSecret) {
        return jsonResponse({ ok: false, error: "not_configured" }, 503);
    }
    const suppliedSecret =
        request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
    if (!(await secretsMatch(expectedSecret, suppliedSecret))) {
        return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
        return jsonResponse({ ok: false, error: "payload_too_large" }, 413);
    }
    const rawUpdate = await request.text();
    if (new TextEncoder().encode(rawUpdate).byteLength > MAX_WEBHOOK_BYTES) {
        return jsonResponse({ ok: false, error: "payload_too_large" }, 413);
    }
    if (!parseUpdate(rawUpdate)) {
        return jsonResponse({ ok: false, error: "invalid_update" }, 400);
    }

    return coordinatorStub(env).fetch(`${INTERNAL_ORIGIN}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawUpdate,
    });
}

export class RibbotCoordinator implements DurableObject {
    private readonly sql: SqlStorage;
    private readonly ready: Promise<void>;
    private botInfo?: UserFromGetMe;

    constructor(
        private readonly state: DurableObjectState,
        private readonly env: Env
    ) {
        this.sql = state.storage.sql;
        this.ready = state.blockConcurrencyWhile(async () => {
            this.sql.exec(
                "CREATE TABLE IF NOT EXISTS ribbot_users (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at TEXT NOT NULL)"
            );
            this.sql.exec(
                "CREATE TABLE IF NOT EXISTS processed_updates (update_id INTEGER PRIMARY KEY, received_at TEXT NOT NULL, status TEXT NOT NULL)"
            );
            this.sql.exec(
                "CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            );
        });
    }

    async fetch(request: Request): Promise<Response> {
        await this.ready;
        const url = new URL(request.url);

        if (request.method === "GET" && url.pathname === "/health") {
            const configured = Boolean(
                this.env.TELEGRAM_BOT_TOKEN?.trim() &&
                    this.env.RIBBOT_FTX_API_TOKEN?.trim() &&
                    this.env.RIBBOT_WEBHOOK_SECRET?.trim()
            );
            return jsonResponse(
                {
                    ok: configured,
                    service: "ribbot",
                    runtime: "cloudflare",
                    durableState: "ready",
                    configuration: configured ? "ready" : "incomplete",
                },
                configured ? 200 : 503
            );
        }

        if (request.method === "POST" && url.pathname === "/update") {
            const rawUpdate = await request.text();
            const update = parseUpdate(rawUpdate);
            if (!update) {
                return jsonResponse(
                    { ok: false, error: "invalid_update" },
                    400
                );
            }
            return this.processUpdate(update);
        }

        if (request.method === "POST" && url.pathname === "/maintenance") {
            await this.runMaintenance();
            return jsonResponse({ ok: true });
        }

        return jsonResponse({ ok: false, error: "not_found" }, 404);
    }

    async alarm(): Promise<void> {
        await this.ready;
        const store = this.loadStore();
        if (store.listUsers().length === 0) return;
        const { tradingBot } = await this.createTelegramRuntime(store);
        await tradingBot.reconcilePendingFrogTrades();
        this.saveStore(store);
        if (tradingBot.hasPendingFrogConfirmations()) {
            await this.scheduleFrogAlarm();
        }
    }

    private async processUpdate(update: Update): Promise<Response> {
        const prior = this.sql
            .exec<SqlProcessedUpdateRow>(
                "SELECT status FROM processed_updates WHERE update_id = ?",
                update.update_id
            )
            .toArray()[0];
        if (prior) {
            return jsonResponse({ ok: true, duplicate: true });
        }

        const receivedAt = new Date().toISOString();
        this.sql.exec(
            "INSERT INTO processed_updates (update_id, received_at, status) VALUES (?, ?, 'processing')",
            update.update_id,
            receivedAt
        );

        try {
            if (isPrivateUpdate(update)) {
                const userId = updateUserId(update);
                const store = this.loadStore(userId);
                const { bot, tradingBot } =
                    await this.createTelegramRuntime(store);
                await bot.handleUpdate(update);
                this.saveStore(store);
                if (tradingBot.hasPendingFrogConfirmations()) {
                    await this.scheduleFrogAlarm();
                }
            }
            this.sql.exec(
                "UPDATE processed_updates SET status = 'processed' WHERE update_id = ?",
                update.update_id
            );
            return jsonResponse({ ok: true });
        } catch (error) {
            console.error(
                "Ribbot update processing failed",
                error instanceof Error ? error.name : "UnknownError"
            );
            this.sql.exec(
                "UPDATE processed_updates SET status = 'failed' WHERE update_id = ?",
                update.update_id
            );
            return jsonResponse({ ok: true, handled: "failed" });
        }
    }

    private async runMaintenance(): Promise<void> {
        const cutoff = new Date(Date.now() - UPDATE_RETENTION_MS).toISOString();
        this.sql.exec(
            "DELETE FROM processed_updates WHERE received_at < ?",
            cutoff
        );

        const store = this.loadStore();
        if (store.listUsers().length === 0) return;
        const { tradingBot } = await this.createTelegramRuntime(store);
        await tradingBot.pollActivityAlertsOnce();
        await tradingBot.reconcilePendingFrogTrades();
        this.saveStore(store);
        if (tradingBot.hasPendingFrogConfirmations()) {
            await this.scheduleFrogAlarm();
        }
    }

    private loadStore(userId?: string): TradingStateStore {
        const rows = userId
            ? this.sql
                  .exec<SqlUserRow>(
                      "SELECT user_id, state_json FROM ribbot_users WHERE user_id = ?",
                      userId
                  )
                  .toArray()
            : this.sql
                  .exec<SqlUserRow>(
                      "SELECT user_id, state_json FROM ribbot_users ORDER BY user_id"
                  )
                  .toArray();
        const users: Record<string, TradingUser> = {};
        for (const row of rows) {
            try {
                const user = JSON.parse(row.state_json) as TradingUser;
                if (user.telegramUserId === row.user_id)
                    users[row.user_id] = user;
            } catch {
                console.error("Ribbot ignored an invalid durable user record");
            }
        }
        return TradingStateStore.memory({ users });
    }

    private saveStore(store: TradingStateStore): void {
        const snapshot: StoreShape = store.exportSnapshot();
        const updatedAt = new Date().toISOString();
        for (const user of Object.values(snapshot.users)) {
            this.sql.exec(
                "INSERT INTO ribbot_users (user_id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at",
                user.telegramUserId,
                JSON.stringify(user),
                updatedAt
            );
        }
    }

    private async createTelegramRuntime(
        store: TradingStateStore
    ): Promise<{ bot: Telegraf<Context>; tradingBot: TradingBot }> {
        const token = this.env.TELEGRAM_BOT_TOKEN?.trim();
        if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

        const bot = new Telegraf<Context>(token);
        bot.botInfo = await this.getBotInfo(bot);
        const tradingBot = new TradingBot(bot, settingsFromEnv(this.env), {
            store,
            scheduleFrogConfirmations: false,
        });

        bot.use(async (ctx, next) => {
            if (ctx.chat?.type !== "private") return;
            await next();
        });
        bot.on("message", async (ctx) => {
            try {
                await tradingBot.handleMessage(ctx);
            } catch (error) {
                console.error(
                    "Ribbot message handling failed",
                    error instanceof Error ? error.name : "UnknownError"
                );
                await ctx.reply("Unable to process that request right now.");
            }
        });
        bot.on("callback_query", async (ctx) => {
            try {
                await tradingBot.handleCallbackQuery(ctx);
            } catch (error) {
                console.error(
                    "Ribbot callback handling failed",
                    error instanceof Error ? error.name : "UnknownError"
                );
                await ctx.answerCbQuery("Unable to process that action.");
            }
        });
        bot.catch((error) => {
            console.error(
                "Ribbot Telegram update failed",
                error instanceof Error ? error.name : "UnknownError"
            );
        });

        return { bot, tradingBot };
    }

    private async getBotInfo(bot: Telegraf<Context>): Promise<UserFromGetMe> {
        if (this.botInfo) return this.botInfo;

        const cached = this.sql
            .exec<SqlMetadataRow>(
                "SELECT value FROM metadata WHERE key = 'telegram_bot_info'"
            )
            .toArray()[0];
        if (cached) {
            try {
                this.botInfo = JSON.parse(cached.value) as UserFromGetMe;
                return this.botInfo;
            } catch {
                this.sql.exec(
                    "DELETE FROM metadata WHERE key = 'telegram_bot_info'"
                );
            }
        }

        this.botInfo = await bot.telegram.getMe();
        this.sql.exec(
            "INSERT INTO metadata (key, value) VALUES ('telegram_bot_info', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            JSON.stringify(this.botInfo)
        );
        return this.botInfo;
    }

    private async scheduleFrogAlarm(): Promise<void> {
        const target = Date.now() + FROG_CONFIRMATION_ALARM_MS;
        const existing = await this.state.storage.getAlarm();
        if (existing === null || existing > target) {
            await this.state.storage.setAlarm(target);
        }
    }
}

const worker: ExportedHandler<Env> = {
    fetch: handleWorkerRequest,
    scheduled(_event, env, ctx) {
        ctx.waitUntil(
            coordinatorStub(env).fetch(`${INTERNAL_ORIGIN}/maintenance`, {
                method: "POST",
            })
        );
    },
};

export default worker;
