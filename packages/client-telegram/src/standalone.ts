import { pathToFileURL } from "node:url";

import { Context, Telegraf } from "telegraf";

import { parseBoolean, type SettingsSource } from "./trading/config.ts";
import { logger } from "./trading/logger.ts";
import { TradingBot } from "./trading/TradingBot.ts";

type StandaloneEnvironment = Record<string, string | undefined>;

export function validateStandaloneEnvironment(
    environment: StandaloneEnvironment
): string[] {
    const missing: string[] = [];

    if (!environment.TELEGRAM_BOT_TOKEN?.trim()) {
        missing.push("TELEGRAM_BOT_TOKEN");
    }
    if (!environment.RIBBOT_FTX_API_TOKEN?.trim()) {
        missing.push("RIBBOT_FTX_API_TOKEN");
    }
    if (!parseBoolean(environment.TG_TRADER, false)) {
        missing.push("TG_TRADER=true");
    }

    return missing;
}

export function createEnvironmentSettings(
    environment: StandaloneEnvironment
): SettingsSource {
    return {
        getSetting: (key) => environment[key],
    };
}

async function start(): Promise<void> {
    const missing = validateStandaloneEnvironment(process.env);
    if (missing.length > 0) {
        throw new Error(
            `Missing standalone Ribbot configuration: ${missing.join(", ")}`
        );
    }

    if (process.argv.includes("--check")) {
        logger.info(
            "Standalone Ribbot configuration is ready; no Telegram or FTX request was sent."
        );
        return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
    const bot = new Telegraf<Context>(token);
    const tradingBot = new TradingBot(
        bot,
        createEnvironmentSettings(process.env)
    );

    bot.on("message", async (ctx) => {
        try {
            await tradingBot.handleMessage(ctx);
        } catch (error) {
            logger.error("Ribbot message handling failed", error);
            try {
                await ctx.reply("Unable to process that request right now.");
            } catch (replyError) {
                logger.error("Ribbot error reply failed", replyError);
            }
        }
    });

    bot.on("callback_query", async (ctx) => {
        try {
            await tradingBot.handleCallbackQuery(ctx);
        } catch (error) {
            logger.error("Ribbot callback handling failed", error);
            try {
                await ctx.answerCbQuery("Unable to process that action.");
            } catch (replyError) {
                logger.error("Ribbot callback error reply failed", replyError);
            }
        }
    });

    bot.catch((error, ctx) => {
        logger.error(`Telegram update ${ctx.updateType} failed`, error);
    });

    let stopping = false;
    const stop = async (signal: string) => {
        if (stopping) return;
        stopping = true;
        logger.info(`Stopping standalone Ribbot after ${signal}`);
        await tradingBot.stopActivityAlerts();
        bot.stop(signal);
    };

    process.once("SIGINT", () => void stop("SIGINT"));
    process.once("SIGTERM", () => void stop("SIGTERM"));
    process.once("SIGHUP", () => void stop("SIGHUP"));

    const botInfo = await bot.telegram.getMe();
    bot.botInfo = botInfo;
    tradingBot.startActivityAlerts();
    logger.info(`Starting standalone Ribbot as @${botInfo.username}`);
    await bot.launch({ dropPendingUpdates: true });
}

const isEntrypoint =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
    start().catch((error) => {
        logger.error("Standalone Ribbot failed to start", error);
        process.exitCode = 1;
    });
}
