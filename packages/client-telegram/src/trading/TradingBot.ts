import { Context, Markup, Telegraf } from "telegraf";
import {
    loadTradingConfig,
    type SettingsSource,
    type TradingConfig,
} from "./config.ts";
import { logger } from "./logger.ts";
import { ActivityAlertPoller } from "./activityAlerts.ts";
import {
    parseAutoBuyIntent,
    type AutoBuyCommandIntent,
} from "./autoBuyCommand.ts";
import {
    parseCopyTradeCommand,
    type CopyTradeCommandIntent,
} from "./copyTradeCommand.ts";
import { requiresTradeConfirmation } from "./tradePolicy.ts";
import { marketRiskQuoteBlockingReason } from "./marketRiskMessaging.ts";
import {
    parseWalletCommand,
    type WalletCommandIntent,
} from "./walletCommand.ts";
import {
    buildPositionPage,
    parsePositionPageIndex,
    positionCallbackData,
    positionVisibilityCallbackData,
} from "./positionView.ts";
import {
    TradingStateStore,
    type AdvancedAutomationMonitor,
    type AutoBuyConfig,
    type AutoSellConfig,
    type AutomationOrder,
    type BundleBuyConfig,
    type CopyTradeConfig,
    type DirectExecutionReconciliation,
    type PendingOrder,
    type SniperConfig,
    type TradingUser,
    type WithdrawalTicket,
} from "./state.ts";
import {
    applyReferralCode,
    cancelStoredAutoBuyConfig,
    cancelStoredAutoSellConfig,
    cancelStoredBundleBuyConfig,
    cancelStoredCopyTradeConfig,
    controlStoredCopyTradeConfig,
    duplicateStoredCopyTradeConfig,
    cancelStoredScheduledOrder,
    cancelStoredSniperConfig,
    executeSwapTransaction,
    executeStoredBundleBuyConfig,
    executeWithdrawal,
    fetchActivity,
    fetchSwapExecutionStatus,
    fetchMarketRisk,
    fetchNftHoldings,
    fetchBuyQuote,
    fetchAutoBuyConfigs,
    fetchAutoBuyExecutionStatus,
    fetchAutoSellConfigs,
    fetchAutoSellExecutionStatus,
    fetchBundleBuyConfigs,
    fetchStoredBundleBuyExecutionStatus,
    fetchCopyTradeConfigs,
    fetchCopyTradeExecutionStatus,
    fetchScheduledOrders,
    fetchSniperConfigs,
    fetchSniperExecutionStatus,
    fetchTokenCleanup,
    fetchTokenSafety,
    fetchWithdrawalExecutionStatus,
    fetchPnl,
    fetchReferralSummary,
    fetchTradingAccount,
    fetchPositions,
    fetchQuote,
    formatQuoteLines,
    type ActivityEvent,
    type BundleBuyExecutionItem,
    type DirectExecutionStatusResult,
    type MarketRiskQuoteProbe,
    type NftHolding,
    type PositionToken,
    type PnlToken,
    type ScheduledOrderKind,
    type TokenCleanupCandidate,
    type TokenSafetyFlag,
    provisionTradingWallet,
    requestControlCode,
    type ScheduledOrderSide,
    type SniperSource,
    storeCopyTradeConfig,
    storeAutoBuyConfig,
    storeAutoSellConfig,
    storeBundleBuyConfig,
    storeScheduledOrder,
    storeSniperConfig,
    updateStoredCopyTradeConfig,
    type StoredCopyTradeConfig,
    type StoredAutoBuyConfig,
    type StoredAutoSellConfig,
    type StoredBundleBuyConfig,
    type StoredScheduledOrder,
    type StoredSniperConfig,
    type TriggerDirection,
    solToLamports,
    validatePreferences,
    validateWithdrawal,
} from "./frogx.ts";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type ManualReviewDisplay = {
    manualReviewRequired?: boolean;
    manualReviewAfter?: string | null;
    manualReviewRequiredAt?: string | null;
    manualReviewReason?: string | null;
};

type ParsedIntent =
    | { kind: "menu" }
    | WalletCommandIntent
    | { kind: "account" }
    | { kind: "control" }
    | { kind: "referral"; action?: "show" | "apply"; referralCode?: string }
    | { kind: "activity" }
    | {
          kind: "settings";
          field?:
              | "slippage"
              | "priority"
              | "sellPriority"
              | "defaultBuy"
              | "buyPresets"
              | "sellPresets"
              | "mode"
              | "confirm"
              | "sellProtection"
              | "autoBuy"
              | "autoSell"
              | "sniper"
              | "mev";
          value?: string;
          values?: string[];
      }
    | { kind: "positions"; mint?: string; page?: number }
    | { kind: "nfts"; page?: number }
    | { kind: "pnl" }
    | { kind: "cleanup" }
    | { kind: "safety"; mint?: string }
    | { kind: "scan"; mint?: string; amountSol?: number }
    | { kind: "orders" }
    | { kind: "withdrawals" }
    | {
          kind: "withdraw";
          asset?: string;
          amount?: string;
          destinationAddress?: string;
      }
    | {
          kind: "limit";
          side?: ScheduledOrderSide;
          mint?: string;
          amount?: number;
          triggerDirection?: TriggerDirection;
          triggerPrice?: string;
      }
    | {
          kind: "dca";
          side?: ScheduledOrderSide;
          mint?: string;
          totalSol?: number;
          orderCount?: number;
          intervalMinutes?: number;
      }
    | {
          kind: "stop";
          mint?: string;
          percentage?: number;
          triggerDirection?: TriggerDirection;
          triggerPrice?: string;
      }
    | {
          kind: "trailing";
          mint?: string;
          percentage?: number;
          trailingPercent?: number;
      }
    | { kind: "watchlist"; action?: "list" | "add" | "remove"; mint?: string }
    | { kind: "hidden"; action?: "list" | "add" | "remove"; mint?: string }
    | ({ kind: "copytrade" } & CopyTradeCommandIntent)
    | {
          kind: "sniper";
          action?: "add" | "list";
          source?: SniperSource;
          maxBuySol?: number;
          minLiquidityUsd?: number;
          maxMarketCapUsd?: number;
          maxSnipes?: number;
      }
    | AutoBuyCommandIntent
    | {
          kind: "bundleBuy";
          action?: "add" | "list";
          items?: Array<{ mint: string; amountSol: number }>;
          minLiquidityUsd?: number;
          maxMarketCapUsd?: number;
      }
    | {
          kind: "autoSell";
          action?: "add" | "list";
          mint?: string;
          sellPercent?: number;
          triggerDirection?: TriggerDirection;
          triggerPrice?: string;
      }
    | { kind: "buy"; mint?: string; amountSol?: number }
    | { kind: "sell"; mint?: string; percentage?: number }
    | { kind: "token"; mint: string }
    | { kind: "help" }
    | { kind: "unknown"; command: string };

export class TradingBot {
    private readonly bot: Telegraf<Context>;
    private readonly config: TradingConfig;
    private readonly store: TradingStateStore;
    private readonly activityAlertPoller: ActivityAlertPoller;

    constructor(bot: Telegraf<Context>, runtime: SettingsSource) {
        this.bot = bot;
        this.config = loadTradingConfig(runtime);
        this.store = new TradingStateStore(this.config.stateFile);
        this.activityAlertPoller = new ActivityAlertPoller({
            enabled: this.config.activityAlertsEnabled,
            tgTrader: this.config.tgTrader,
            frogxApiBaseUrl: this.config.frogxApiBaseUrl,
            ftxApiToken: this.config.ftxApiToken,
            pollIntervalMs: this.config.activityAlertPollIntervalMs,
            maxUsersPerPoll: this.config.activityAlertMaxUsersPerPoll,
            maxEventsPerMessage: this.config.activityAlertMaxEventsPerMessage,
            store: this.store,
            logger: {
                info: (...values) => logger.info(...values),
                warn: (...values) => logger.warn(...values),
            },
            sendMessage: (telegramUserId, text) =>
                this.bot.telegram.sendMessage(
                    telegramUserId,
                    text,
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Activity", "ribbot:activity")],
                        [Markup.button.callback("Menu", "ribbot:menu")],
                    ])
                ),
        });
    }

    isEnabled(): boolean {
        return this.config.tgTrader;
    }

    startActivityAlerts(): boolean {
        return this.activityAlertPoller.start();
    }

    async stopActivityAlerts(): Promise<void> {
        await this.activityAlertPoller.stop();
    }

    async handleMessage(ctx: Context): Promise<boolean> {
        if (!this.isEnabled() || !ctx.message || !ctx.from) return false;
        const text = this.getText(ctx);
        if (!text) return false;

        const intent = this.parseIntent(text);
        if (!intent) return false;

        const user = this.getUser(ctx);

        switch (intent.kind) {
            case "menu":
                await this.replyMainMenu(ctx, user);
                return true;
            case "wallet":
                await this.replyWallet(
                    ctx,
                    user,
                    intent.address,
                    intent.selection
                );
                return true;
            case "account":
                await this.replyAccount(ctx, user);
                return true;
            case "control":
                await this.replyControl(ctx, user);
                return true;
            case "referral":
                await this.replyReferral(ctx, user, intent);
                return true;
            case "activity":
                await this.replyActivity(ctx, user);
                return true;
            case "settings":
                await this.replySettings(ctx, user, intent);
                return true;
            case "positions":
                if (intent.mint) {
                    await this.replyPosition(
                        ctx,
                        user,
                        intent.mint,
                        intent.page
                    );
                } else {
                    await this.replyPositions(ctx, user, intent.page);
                }
                return true;
            case "nfts":
                await this.replyNftHoldings(ctx, user, intent.page);
                return true;
            case "pnl":
                await this.replyPnl(ctx, user);
                return true;
            case "cleanup":
                await this.replyTokenCleanup(ctx, user);
                return true;
            case "safety":
                await this.replyTokenSafety(ctx, user, intent.mint);
                return true;
            case "scan":
                await this.replyMarketRisk(
                    ctx,
                    user,
                    intent.mint,
                    intent.amountSol
                );
                return true;
            case "orders":
                await this.replyOrders(ctx, user);
                return true;
            case "withdrawals":
                await this.replyWithdrawals(ctx, user);
                return true;
            case "withdraw":
                await this.replyWithdraw(ctx, user, intent);
                return true;
            case "limit":
                await this.replyLimitOrder(ctx, user, intent);
                return true;
            case "dca":
                await this.replyDcaOrder(ctx, user, intent);
                return true;
            case "stop":
                await this.replyStopOrder(ctx, user, intent);
                return true;
            case "trailing":
                await this.replyTrailingOrder(ctx, user, intent);
                return true;
            case "watchlist":
                await this.replyWatchlist(ctx, user, intent);
                return true;
            case "hidden":
                await this.replyHiddenTokens(ctx, user, intent);
                return true;
            case "copytrade":
                await this.replyCopyTrade(ctx, user, intent);
                return true;
            case "sniper":
                await this.replySniper(ctx, user, intent);
                return true;
            case "autoBuy":
                await this.replyAutoBuy(ctx, user, intent);
                return true;
            case "bundleBuy":
                await this.replyBundleBuy(ctx, user, intent);
                return true;
            case "autoSell":
                await this.replyAutoSell(ctx, user, intent);
                return true;
            case "buy":
                await this.replyBuy(ctx, user, intent.mint, intent.amountSol);
                return true;
            case "sell":
                await this.replySell(ctx, user, intent.mint, intent.percentage);
                return true;
            case "token":
                await this.replyToken(ctx, user, intent.mint);
                return true;
            case "help":
                await this.replyHelp(ctx);
                return true;
            case "unknown":
                await this.replyUnknownCommand(ctx, intent.command);
                return true;
            default:
                return false;
        }
    }

    async handleCallbackQuery(ctx: Context): Promise<boolean> {
        if (!this.isEnabled() || !ctx.callbackQuery || !ctx.from) return false;
        const data = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : "";
        if (!data?.startsWith("ribbot:")) return false;

        const user = this.getUser(ctx);
        await ctx.answerCbQuery();

        const [, action, ...rest] = data.split(":");

        if (action === "menu") {
            await this.replyMainMenu(ctx, user);
            return true;
        }

        if (action === "help") {
            await this.replyHelp(ctx);
            return true;
        }

        if (action === "wallet") {
            await this.replyWallet(ctx, user);
            return true;
        }

        if (action === "wallet-select") {
            const index = Number(rest[0]);
            await this.replyWallet(
                ctx,
                user,
                undefined,
                Number.isInteger(index) && index >= 0 ? index + 1 : undefined
            );
            return true;
        }

        if (action === "account") {
            await this.replyAccount(ctx, user);
            return true;
        }

        if (action === "control") {
            await this.replyControl(ctx, user);
            return true;
        }

        if (action === "referrals") {
            await this.replyReferral(ctx, user);
            return true;
        }

        if (action === "activity") {
            await this.replyActivity(ctx, user);
            return true;
        }

        if (action === "settings") {
            await this.replySettings(ctx, user);
            return true;
        }

        if (action === "positions") {
            await this.replyPositions(
                ctx,
                user,
                parsePositionPageIndex(rest[0])
            );
            return true;
        }

        if (action === "nfts") {
            await this.replyNftHoldings(
                ctx,
                user,
                parsePositionPageIndex(rest[0])
            );
            return true;
        }

        if (action === "position") {
            const [mint, page] = rest;
            if (isSolanaMint(mint)) {
                await this.replyPosition(
                    ctx,
                    user,
                    mint,
                    parsePositionPageIndex(page)
                );
            } else {
                await this.replyUnknownAction(ctx);
            }
            return true;
        }

        if (action === "pv") {
            const [mint, page, visibility] = rest;
            if (
                !isSolanaMint(mint) ||
                (visibility !== "hide" && visibility !== "show")
            ) {
                await this.replyUnknownAction(ctx);
                return true;
            }
            await this.applyTokenPreference(ctx, user, {
                kind: "hiddenToken",
                action: visibility === "hide" ? "add" : "remove",
                mint,
            });
            await this.replyPositions(ctx, user, parsePositionPageIndex(page));
            return true;
        }

        if (action === "pnl") {
            await this.replyPnl(ctx, user);
            return true;
        }

        if (action === "cleanup") {
            await this.replyTokenCleanup(ctx, user);
            return true;
        }

        if (action === "orders") {
            await this.replyOrders(ctx, user);
            return true;
        }

        if (action === "withdrawals") {
            await this.replyWithdrawals(ctx, user);
            return true;
        }

        if (action === "cancel-auto") {
            await this.replyCancelAutomationOrder(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel-withdrawal") {
            await this.replyCancelWithdrawal(ctx, user, rest[0]);
            return true;
        }

        if (action === "execute-withdrawal") {
            await this.replyExecuteWithdrawal(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-withdrawal") {
            await this.replyCheckWithdrawalStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "watchlist") {
            await this.replyWatchlist(ctx, user);
            return true;
        }

        if (action === "hidden") {
            await this.replyHiddenTokens(ctx, user);
            return true;
        }

        if (action === "copytrade") {
            await this.replyCopyTrade(ctx, user);
            return true;
        }

        if (action === "sniper") {
            await this.replySniper(ctx, user);
            return true;
        }

        if (action === "autobuy") {
            await this.replyAutoBuy(ctx, user);
            return true;
        }

        if (action === "bundle") {
            await this.replyBundleBuy(ctx, user);
            return true;
        }

        if (action === "autosell") {
            await this.replyAutoSell(ctx, user);
            return true;
        }

        if (action === "cancel-copytrade") {
            await this.replyCancelCopyTrade(ctx, user, rest[0]);
            return true;
        }

        if (action === "pause-copytrade" || action === "resume-copytrade") {
            await this.replyControlCopyTrade(
                ctx,
                user,
                rest[0],
                action === "pause-copytrade" ? "pause" : "resume"
            );
            return true;
        }

        if (action === "edit-copytrade") {
            await this.replyCopyTradeEditHelp(ctx, user, rest[0]);
            return true;
        }

        if (action === "duplicate-copytrade") {
            await this.replyDuplicateCopyTrade(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-copytrade") {
            await this.replyCheckCopyTradeStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel-sniper") {
            await this.replyCancelSniper(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-sniper") {
            await this.replyCheckSniperStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel-autobuy") {
            await this.replyCancelAutoBuy(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-autobuy") {
            await this.replyCheckAutoBuyStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel-bundle") {
            await this.replyCancelBundleBuy(ctx, user, rest[0]);
            return true;
        }

        if (action === "execute-bundle") {
            await this.replyExecuteBundleBuy(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-bundle") {
            await this.replyCheckBundleBuyStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel-autosell") {
            await this.replyCancelAutoSell(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-autosell") {
            await this.replyCheckAutoSellStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "toggle-confirm") {
            await this.applySettingsPreference(ctx, user, {
                confirmTrades: !user.settings.confirmTrades,
            });
            return true;
        }

        if (action === "set-mode") {
            const botMode = rest[0];
            if (botMode === "simple" || botMode === "advanced") {
                await this.applySettingsPreference(ctx, user, {
                    botMode,
                    ...(botMode === "simple" ? { confirmTrades: false } : {}),
                });
            } else {
                await this.replyUnknownAction(ctx);
            }
            return true;
        }

        if (action === "toggle-sell-protection") {
            await this.applySettingsPreference(ctx, user, {
                sellProtection: !user.settings.sellProtection,
            });
            return true;
        }

        if (action === "confirm") {
            await this.replyConfirmOrder(ctx, user, rest[0]);
            return true;
        }

        if (action === "check-order") {
            await this.replyCheckOrderStatus(ctx, user, rest[0]);
            return true;
        }

        if (action === "cancel") {
            await this.replyCancelOrder(ctx, user, rest[0]);
            return true;
        }

        if (action === "watch") {
            const mint = rest[0];
            if (isSolanaMint(mint)) {
                await this.applyTokenPreference(ctx, user, {
                    kind: "watchlist",
                    action: "add",
                    mint,
                });
            } else {
                await this.replyUnknownAction(ctx);
            }
            return true;
        }

        if (action === "safety") {
            await this.replyTokenSafety(ctx, user, rest[0]);
            return true;
        }

        if (action === "scan") {
            await this.replyMarketRisk(ctx, user, rest[0]);
            return true;
        }

        if (action === "buy") {
            const [mint, amount] = rest;
            await this.replyBuy(ctx, user, mint, Number(amount));
            return true;
        }

        if (action === "sell") {
            const [mint, percentage] = rest;
            await this.replySell(ctx, user, mint, Number(percentage));
            return true;
        }

        if (action === "cleanup-hide") {
            const mint = rest[0];
            if (isSolanaMint(mint)) {
                await this.applyTokenPreference(ctx, user, {
                    kind: "hiddenToken",
                    action: "add",
                    mint,
                });
            } else {
                await this.replyUnknownAction(ctx);
            }
            return true;
        }

        if (action === "cleanup-sell") {
            const mint = rest[0];
            await this.replySell(ctx, user, mint, 100);
            return true;
        }

        await this.replyUnknownAction(ctx);
        return true;
    }

    private parseIntent(text: string): ParsedIntent | null {
        const normalized = text.trim();
        const [commandRaw, ...args] = normalized.split(/\s+/);
        const [command, commandMention] = commandRaw.toLowerCase().split("@");

        if (commandMention && !this.isOwnBotMention(commandMention)) {
            return null;
        }

        if (command === "/start" && isReferralCode(args[0])) {
            return {
                kind: "referral",
                action: "apply",
                referralCode: args[0].toUpperCase(),
            };
        }
        if (["/start", "/menu", "/trading"].includes(command)) {
            return { kind: "menu" };
        }
        if (["/wallet", "/deposit"].includes(command)) {
            return parseWalletCommand(args);
        }
        if (["/account", "/status", "/sync"].includes(command)) {
            return { kind: "account" };
        }
        if (["/control", "/manage"].includes(command)) {
            return { kind: "control" };
        }
        if (
            ["/referral", "/referrals", "/rewards", "/reward"].includes(command)
        ) {
            return {
                kind: "referral",
                action: isReferralCode(args[0]) ? "apply" : "show",
                referralCode: isReferralCode(args[0])
                    ? args[0].toUpperCase()
                    : undefined,
            };
        }
        if (["/activity", "/history", "/trades", "/events"].includes(command)) {
            return { kind: "activity" };
        }
        if (command === "/settings") return parseSettingsIntent(args);
        if (["/positions", "/position"].includes(command)) {
            const mint = findMint(args);
            const pageValue = mint ? undefined : Number(args[0]);
            return {
                kind: "positions",
                mint,
                page:
                    Number.isInteger(pageValue) && pageValue > 0
                        ? pageValue - 1
                        : 0,
            };
        }
        if (["/nfts", "/collectibles", "/frogs"].includes(command)) {
            const pageValue = Number(args[0]);
            return {
                kind: "nfts",
                page:
                    Number.isInteger(pageValue) && pageValue > 0
                        ? pageValue - 1
                        : 0,
            };
        }
        if (["/pnl", "/profit", "/profits"].includes(command)) {
            return { kind: "pnl" };
        }
        if (["/cleanup", "/clean"].includes(command)) {
            return { kind: "cleanup" };
        }
        if (["/safety", "/safe", "/risk", "/rugcheck"].includes(command)) {
            return { kind: "safety", mint: findMint(args) };
        }
        if (["/scan", "/market", "/liquidity"].includes(command)) {
            return {
                kind: "scan",
                mint: findMint(args),
                amountSol: findNumber(args),
            };
        }
        if (["/withdrawals", "/withdraws"].includes(command)) {
            return { kind: "withdrawals" };
        }
        if (command === "/withdraw") {
            return parseWithdrawalIntent(args);
        }
        if (command === "/orders") {
            return { kind: "orders" };
        }
        if (command === "/limit") {
            const triggerDirection = findTriggerDirection(args);
            return {
                kind: "limit",
                side: parseOrderSide(args[0]) ?? "buy",
                mint: findMint(args),
                amount: findAmountBeforeTrigger(args, triggerDirection),
                triggerDirection,
                triggerPrice: findTriggerPrice(args, triggerDirection),
            };
        }
        if (command === "/dca") {
            const mint = findMint(args);
            const numbers = findNumbersAfterMint(args, mint);
            return {
                kind: "dca",
                side: parseOrderSide(args[0]) ?? "buy",
                mint,
                totalSol: numbers[0],
                orderCount: numbers[1],
                intervalMinutes: numbers[2],
            };
        }
        if (["/stop", "/stoploss", "/sl"].includes(command)) {
            const triggerDirection = findTriggerDirection(args);
            return {
                kind: "stop",
                mint: findMint(args),
                percentage: findAmountBeforeTrigger(args, triggerDirection),
                triggerDirection,
                triggerPrice: findTriggerPrice(args, triggerDirection),
            };
        }
        if (["/trailing", "/trail", "/trailingstop"].includes(command)) {
            const mint = findMint(args);
            const numbers = findNumbersAfterMint(args, mint);
            return {
                kind: "trailing",
                mint,
                percentage: numbers[0],
                trailingPercent: numbers[1],
            };
        }
        if (["/watchlist", "/watch"].includes(command)) {
            return parseWatchlistIntent(command, args);
        }
        if (command === "/hidden") {
            return { kind: "hidden", action: "list" };
        }
        if (command === "/hide") {
            return { kind: "hidden", action: "add", mint: findMint(args) };
        }
        if (command === "/unhide") {
            return { kind: "hidden", action: "remove", mint: findMint(args) };
        }
        if (["/copytrade", "/copy"].includes(command)) {
            return { kind: "copytrade", ...parseCopyTradeCommand(args) };
        }
        if (["/sniper", "/snipe"].includes(command)) {
            return parseSniperIntent(args);
        }
        if (["/autobuy", "/auto-buy"].includes(command)) {
            return parseAutoBuyIntent(args);
        }
        if (["/bundle", "/bundlebuy", "/bundle-buy"].includes(command)) {
            return parseBundleBuyIntent(args);
        }
        if (["/autosell", "/auto-sell"].includes(command)) {
            return parseAutoSellIntent(args);
        }
        if (["/help", "/commands"].includes(command)) {
            return { kind: "help" };
        }
        if (["/buy", "/ape"].includes(command)) {
            return {
                kind: "buy",
                mint: findMint(args),
                amountSol: findNumber(args),
            };
        }
        if (["/sell"].includes(command)) {
            return {
                kind: "sell",
                mint: findMint(args),
                percentage: findNumber(args),
            };
        }

        const mint = findMint(normalized.split(/\s+/));
        if (mint && normalized === mint) {
            return { kind: "token", mint };
        }

        if (isBotCommand(command)) {
            return { kind: "unknown", command };
        }

        return null;
    }

    private isOwnBotMention(mention: string): boolean {
        const username = this.bot.botInfo?.username?.toLowerCase();
        if (!username) return true;
        return mention === username;
    }

    private getUser(ctx: Context): TradingUser {
        const telegramUserId = ctx.from?.id.toString() || "unknown";
        const username =
            ctx.from?.username || ctx.from?.first_name || "Unknown";
        return this.store.getOrCreateUser(telegramUserId, username, {
            confirmTrades: this.config.confirmTrades,
            defaultBuySol: this.config.defaultBuySol,
            slippageBps: this.config.slippageBps,
            priorityFeeLamports: this.config.priorityFeeLamports,
        });
    }

    private getText(ctx: Context): string {
        const message = ctx.message;
        if (!message) return "";
        if ("text" in message && typeof message.text === "string") {
            return message.text;
        }
        if ("caption" in message && typeof message.caption === "string") {
            return message.caption;
        }
        return "";
    }

    private async replyMainMenu(
        ctx: Context,
        user: TradingUser
    ): Promise<void> {
        const currentUser = await this.refreshAccountSnapshot(user);
        const walletLine = currentUser.solanaWalletAddress
            ? `Wallet: ${shortAddress(currentUser.solanaWalletAddress)}`
            : "Wallet: not linked yet";
        const interfaceMode =
            currentUser.settings.botMode === "simple" ? "Simple" : "Advanced";
        const keyboard =
            currentUser.settings.botMode === "simple"
                ? [
                      [
                          Markup.button.callback("Wallet", "ribbot:wallet"),
                          Markup.button.callback(
                              "Positions",
                              "ribbot:positions"
                          ),
                      ],
                      [
                          Markup.button.callback("NFTs", "ribbot:nfts:0"),
                          Markup.button.callback("PNL", "ribbot:pnl"),
                      ],
                      [
                          Markup.button.callback(
                              "Watchlist",
                              "ribbot:watchlist"
                          ),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                      [
                          Markup.button.callback("Settings", "ribbot:settings"),
                          Markup.button.callback("Account", "ribbot:account"),
                      ],
                      [
                          Markup.button.callback(
                              "Withdrawals",
                              "ribbot:withdrawals"
                          ),
                      ],
                  ]
                : [
                      [
                          Markup.button.callback("Wallet", "ribbot:wallet"),
                          Markup.button.callback("Account", "ribbot:account"),
                      ],
                      [
                          Markup.button.callback("Control", "ribbot:control"),
                          Markup.button.callback("Settings", "ribbot:settings"),
                      ],
                      [
                          Markup.button.callback(
                              "Positions",
                              "ribbot:positions"
                          ),
                          Markup.button.callback("NFTs", "ribbot:nfts:0"),
                      ],
                      [
                          Markup.button.callback("PNL", "ribbot:pnl"),
                          Markup.button.callback("Cleanup", "ribbot:cleanup"),
                      ],
                      [
                          Markup.button.callback("Orders", "ribbot:orders"),
                          Markup.button.callback("Rewards", "ribbot:referrals"),
                      ],
                      [
                          Markup.button.callback(
                              "Watchlist",
                              "ribbot:watchlist"
                          ),
                          Markup.button.callback("Hidden", "ribbot:hidden"),
                      ],
                      [
                          Markup.button.callback(
                              "Withdrawals",
                              "ribbot:withdrawals"
                          ),
                          Markup.button.callback(
                              "Copy Trade",
                              "ribbot:copytrade"
                          ),
                      ],
                      [
                          Markup.button.callback("Sniper", "ribbot:sniper"),
                          Markup.button.callback("Basket Buy", "ribbot:bundle"),
                      ],
                      [
                          Markup.button.callback("Auto Buy", "ribbot:autobuy"),
                          Markup.button.callback(
                              "Auto Sell",
                              "ribbot:autosell"
                          ),
                      ],
                  ];

        await ctx.reply(
            [
                "Ribbot Trading",
                "Backend: FTX/FrogX",
                walletLine,
                `Interface: ${interfaceMode}`,
                `Execution: ${this.executionModeLabel()}`,
                "",
                "Paste a Solana token mint to open a trade panel, or use the buttons below.",
            ].join("\n"),
            Markup.inlineKeyboard(keyboard)
        );
    }

    private async replyWallet(
        ctx: Context,
        user: TradingUser,
        externalAddress?: string,
        selection?: number
    ): Promise<void> {
        const currentUser = await this.refreshAccountSnapshot(user);
        if (selection !== undefined) {
            const wallet = currentUser.wallets?.[selection - 1];
            if (!wallet) {
                await ctx.reply(
                    `Wallet ${selection} is not available. Run /wallet to refresh the FTX wallet list.`,
                    this.walletKeyboard(currentUser)
                );
                return;
            }
            if (wallet.walletId === currentUser.activeWalletId) {
                await ctx.reply(
                    [
                        `${wallet.label} is already active.`,
                        ...this.walletInventoryLines(currentUser),
                    ].join("\n"),
                    this.walletKeyboard(currentUser)
                );
                return;
            }
            try {
                const selected = await provisionTradingWallet({
                    frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                    ftxApiToken: this.config.ftxApiToken,
                    telegramUserId: currentUser.telegramUserId,
                    username: currentUser.username,
                    action: "select",
                    walletId: wallet.walletId,
                });
                if (selected.status === "not_configured" || !selected.account) {
                    await ctx.reply(
                        "FTX account storage is required to select a trading wallet.",
                        this.walletKeyboard(currentUser)
                    );
                    return;
                }
                const updated = this.store.syncAccountSnapshot(
                    currentUser,
                    selected.account
                );
                await ctx.reply(
                    [
                        `${wallet.label} is now active through FTX/FrogX.`,
                        ...this.walletInventoryLines(updated),
                    ].join("\n"),
                    this.walletKeyboard(updated)
                );
            } catch (error) {
                logger.error("FTX/FrogX wallet selection failed", error);
                await ctx.reply(
                    "FTX/FrogX could not confirm the active-wallet change. The prior wallet remains selected.",
                    this.walletKeyboard(currentUser)
                );
            }
            return;
        }

        if (currentUser.solanaWalletAddress && !externalAddress) {
            await ctx.reply(
                [
                    ...this.walletInventoryLines(currentUser),
                    "",
                    currentUser.walletSource === "privy"
                        ? "Fund it with SOL before trading. Keep enough SOL for swaps and network fees."
                        : "Run /wallet again after FTX wallet provisioning is enabled to create a managed trading wallet.",
                    (currentUser.wallets?.length ?? 0) > 1
                        ? "Use /wallet select <number> or the buttons below to change the active wallet."
                        : "",
                ].join("\n"),
                this.walletKeyboard(currentUser)
            );
            return;
        }

        try {
            const wallet = await provisionTradingWallet({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
                username: currentUser.username,
                externalAddress,
            });

            if (wallet.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX wallet service is not configured yet.",
                        "",
                        "No private keys are stored in Ribbot state.",
                        "",
                        "For quote-only previews during development, run /wallet <your Solana address>.",
                    ].join("\n"),
                    this.menuKeyboard()
                );
                return;
            }

            if (wallet.walletSource === "external") {
                let updated = this.store.setExternalWallet(
                    currentUser,
                    wallet.solanaWalletAddress
                );
                if (wallet.account) {
                    updated = this.store.syncAccountSnapshot(
                        updated,
                        wallet.account
                    );
                }
                await ctx.reply(
                    [
                        "Quote-only wallet linked through FTX/FrogX.",
                        updated.solanaWalletAddress,
                        "",
                        "This lets Ribbot fetch FrogX quotes for previews. It does not grant signing access and cannot execute trades.",
                    ].join("\n"),
                    this.walletKeyboard(updated)
                );
                return;
            }

            let updated = this.store.setPrivyWallet(currentUser, wallet);
            if (wallet.account) {
                updated = this.store.syncAccountSnapshot(
                    updated,
                    wallet.account
                );
            }
            await ctx.reply(
                [
                    "Your FTX/FrogX-managed Ribbot trading wallet is ready.",
                    updated.solanaWalletAddress,
                    "",
                    wallet.signerConfigured
                        ? "Signer config is present in FTX. Live trading still requires execution gates and quote/swap validation."
                        : "FTX signer config is missing, so Ribbot cannot execute trades yet.",
                ].join("\n"),
                this.walletKeyboard(updated)
            );
        } catch (error) {
            logger.error("FTX/FrogX wallet setup failed", error);
            await ctx.reply(
                "Wallet setup failed through FTX/FrogX. No private key was created or shown by Ribbot.",
                this.menuKeyboard()
            );
        }
    }

    private walletInventoryLines(user: TradingUser): string[] {
        const wallets = user.wallets ?? [];
        if (wallets.length === 0) {
            return [
                user.walletSource === "privy"
                    ? "Your FTX/FrogX-managed trading wallet"
                    : "Your FTX/FrogX quote-only wallet",
                user.solanaWalletAddress ?? "not linked",
            ];
        }
        return [
            "FTX/FrogX wallets",
            ...wallets.map(
                (wallet, index) =>
                    `${index + 1}. ${wallet.walletId === user.activeWalletId ? "[ACTIVE] " : ""}${wallet.label} (${wallet.walletSource}) ${shortAddress(wallet.solanaWalletAddress)}`
            ),
        ];
    }

    private walletKeyboard(user?: TradingUser) {
        const walletRows =
            (user?.wallets?.length ?? 0) > 1
                ? chunkButtons(
                      (user?.wallets ?? []).map((wallet, index) =>
                          Markup.button.callback(
                              `${wallet.walletId === user?.activeWalletId ? "Active" : "Use"} ${index + 1}`,
                              `ribbot:wallet-select:${index}`
                          )
                      )
                  )
                : [];
        return Markup.inlineKeyboard([
            ...walletRows,
            [
                Markup.button.callback("Account", "ribbot:account"),
                Markup.button.callback("Positions", "ribbot:positions"),
            ],
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private menuKeyboard() {
        return Markup.inlineKeyboard([
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private orderExecutionKeyboard(orderId: string, pending: boolean) {
        return Markup.inlineKeyboard([
            ...(pending
                ? [
                      [
                          Markup.button.callback(
                              "Check Status",
                              `ribbot:check-order:${orderId}`
                          ),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                  ]
                : [
                      [
                          Markup.button.callback("Activity", "ribbot:activity"),
                          Markup.button.callback(
                              "Positions",
                              "ribbot:positions"
                          ),
                      ],
                  ]),
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private withdrawalExecutionKeyboard(ticketId: string, pending: boolean) {
        return Markup.inlineKeyboard([
            ...(pending
                ? [
                      [
                          Markup.button.callback(
                              "Check Status",
                              `ribbot:check-withdrawal:${ticketId}`
                          ),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                  ]
                : [
                      [
                          Markup.button.callback(
                              "Withdrawals",
                              "ribbot:withdrawals"
                          ),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                  ]),
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private bundleExecutionKeyboard(configId: string, pending: boolean) {
        return Markup.inlineKeyboard([
            ...(pending
                ? [
                      [
                          Markup.button.callback(
                              "Check Status",
                              `ribbot:check-bundle:${configId}`
                          ),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                  ]
                : [
                      [
                          Markup.button.callback("Basket Buy", "ribbot:bundle"),
                          Markup.button.callback("Activity", "ribbot:activity"),
                      ],
                  ]),
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private reconciliationRecord(
        result: Exclude<
            DirectExecutionStatusResult,
            { status: "not_configured" }
        >,
        status: DirectExecutionReconciliation["status"]
    ): DirectExecutionReconciliation {
        return {
            status,
            referenceId: result.referenceId,
            transactionId: result.transactionId,
            signature: result.signature,
            solscanUrl: result.solscanUrl,
            executionStartedAt: result.executionStartedAt,
            checkedAt: result.checkedAt ?? new Date().toISOString(),
            error: result.error,
            manualReviewRequired: result.manualReviewRequired,
            manualReviewAfter: result.manualReviewAfter,
            manualReviewRequiredAt: result.manualReviewRequiredAt,
            manualReviewReason: result.manualReviewReason,
        };
    }

    private async replyAccount(ctx: Context, user: TradingUser): Promise<void> {
        if (!this.config.ftxApiToken) {
            await ctx.reply(
                [
                    "FTX/FrogX account sync is not configured in Ribbot yet.",
                    "",
                    "Ribbot needs RIBBOT_FTX_API_TOKEN to read the FTX account snapshot.",
                    "Privy app secrets and signer keys still belong only in FTX.",
                    "",
                    ...this.accountDashboardLines(user, "local cache only"),
                ].join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Wallet", "ribbot:wallet")],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
            return;
        }

        try {
            const result = await fetchTradingAccount({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX account storage is not configured yet.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "No account snapshot was loaded from FTX.",
                        "",
                        ...this.accountDashboardLines(user, "local cache only"),
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Wallet", "ribbot:wallet")],
                        [Markup.button.callback("Menu", "ribbot:menu")],
                    ])
                );
                return;
            }

            if (result.status === "not_found") {
                await ctx.reply(
                    [
                        "No FTX/FrogX account snapshot exists for this Telegram user yet.",
                        "Run /wallet to create or recover the FTX-routed wallet record.",
                        "",
                        ...this.accountDashboardLines(user, "local cache only"),
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Wallet", "ribbot:wallet")],
                        [Markup.button.callback("Menu", "ribbot:menu")],
                    ])
                );
                return;
            }

            const updated = this.store.syncAccountSnapshot(
                user,
                result.account
            );
            await ctx.reply(
                [
                    ...this.accountDashboardLines(
                        updated,
                        "FTX/FrogX account snapshot",
                        result.account.updatedAt
                    ),
                    "",
                    "This view is non-secret account metadata. It does not read keys, sign, broadcast, or trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Refresh", "ribbot:account"),
                        Markup.button.callback("Control", "ribbot:control"),
                    ],
                    [
                        Markup.button.callback("Wallet", "ribbot:wallet"),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX account fetch failed", error);
            await ctx.reply(
                [
                    "FTX/FrogX account sync is unavailable right now.",
                    "Ribbot did not change account state.",
                    "",
                    ...this.accountDashboardLines(user, "local cache only"),
                ].join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        }
    }

    private async replyControl(ctx: Context, user: TradingUser): Promise<void> {
        if (!this.config.ftxApiToken) {
            await ctx.reply(
                [
                    "FTX/FrogX account control is not configured in Ribbot yet.",
                    "",
                    "Ribbot needs RIBBOT_FTX_API_TOKEN so FTX can issue a short-lived account-control code.",
                    "Privy app secrets and signer keys still belong only in FTX.",
                ].join("\n")
            );
            return;
        }

        try {
            const result = await requestControlCode({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                username: user.username,
            });

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX account control is not configured yet.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "No control session was created.",
                    ].join("\n")
                );
                return;
            }

            const controlHref = result.controlUrl
                ? controlUrlWithTelegramId(
                      result.controlUrl,
                      result.telegramUserId
                  )
                : undefined;
            const lines = [
                "FTX/FrogX account control code",
                result.code,
                `Telegram ID: ${result.telegramUserId}`,
                "",
                `Expires: ${result.expiresAt}`,
                controlHref
                    ? `Open: ${controlHref}`
                    : "Control page URL is not configured yet.",
                "",
                "This starts a short-lived FTX account-control session.",
                "Privy verifies the same Telegram account before wallet export or signer changes. FTX and Ribbot never receive the exported key.",
            ];

            if (controlHref) {
                await ctx.reply(
                    lines.join("\n"),
                    Markup.inlineKeyboard([
                        [Markup.button.login("Open FTX Control", controlHref)],
                        [Markup.button.callback("Menu", "ribbot:menu")],
                    ])
                );
                return;
            }

            await ctx.reply(
                lines.join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX control code request failed", error);
            await ctx.reply(
                "FTX/FrogX could not create a control code right now. No account session was opened."
            );
        }
    }

    private async replyReferral(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "referral" }>
    ): Promise<void> {
        if (!this.config.ftxApiToken) {
            await ctx.reply(
                [
                    "FTX/FrogX referral tracking is not configured in Ribbot yet.",
                    "",
                    "Ribbot needs RIBBOT_FTX_API_TOKEN so FTX can store referral metadata.",
                    "No fee-share, payout, signing, or transfer is active from Ribbot.",
                ].join("\n")
            );
            return;
        }

        try {
            const result =
                intent?.action === "apply" && intent.referralCode
                    ? await applyReferralCode({
                          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                          ftxApiToken: this.config.ftxApiToken,
                          telegramUserId: user.telegramUserId,
                          username: user.username,
                          referralCode: intent.referralCode,
                      })
                    : await fetchReferralSummary({
                          frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                          ftxApiToken: this.config.ftxApiToken,
                          telegramUserId: user.telegramUserId,
                          username: user.username,
                      });

            if ("error" in result) {
                await ctx.reply(
                    `FTX/FrogX referral update failed: ${result.error}`
                );
                return;
            }

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX referral tracking is not configured yet.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "No referral metadata was changed.",
                    ].join("\n")
                );
                return;
            }

            const updated = this.store.syncReferralSummary(
                user,
                result.summary
            );
            const prefix =
                result.status === "accepted"
                    ? result.applied
                        ? "Referral code applied through FTX/FrogX."
                        : "Referral code was already linked in FTX/FrogX."
                    : "Ribbot referral tracking";

            await ctx.reply(
                [prefix, "", ...this.referralSummaryLines(updated)].join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX referral request failed", error);
            await ctx.reply(
                "FTX/FrogX could not load referral tracking right now. No referral metadata was changed."
            );
        }
    }

    private async replySettings(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "settings" }>
    ): Promise<void> {
        if (intent?.field) {
            await this.replyUpdateSettings(ctx, user, intent);
            return;
        }

        const syncedUser = await this.refreshAccountSnapshot(user);
        const settings = syncedUser.settings;
        await ctx.reply(
            [
                "Trading settings",
                `Interface: ${settings.botMode}`,
                `Confirm trades: ${settings.confirmTrades ? "on" : "off"}`,
                `Sell protection (>75%): ${settings.sellProtection ? "on" : "off"}`,
                `Default buy: ${settings.defaultBuySol} SOL`,
                `Buy presets: ${settings.buyPresetsSol.join(", ")} SOL`,
                `Sell presets: ${settings.sellPresetsPercent.join(", ")}%`,
                `Slippage: ${settings.slippageBps / 100}%`,
                `Priority fee: ${settings.priorityFeeLamports} lamports`,
                `Sell priority fee: ${settings.sellPriorityFeeLamports} lamports`,
                `MEV protection: ${settings.mevProtection ? "on" : "off"}`,
                `Auto buy: ${settings.autoBuyEnabled ? "on" : "off"}`,
                `Instant CA buy: ${settings.instantAutoBuyEnabled ? `${settings.instantAutoBuyAmountSol} SOL` : "off"}`,
                `Auto sell: ${settings.autoSellEnabled ? "on" : "off"}`,
                `Sniper: ${settings.sniperEnabled ? "on" : "off"}`,
                "",
                "Usage:",
                "/settings mode simple|advanced",
                "/settings slippage <percent>",
                "/settings priority <lamports>",
                "/settings sellpriority <lamports>",
                "/settings defaultbuy <SOL>",
                "/settings buypresets <SOL> <SOL> [SOL] [SOL]",
                "/settings sellpresets <percent> <percent> [percent] [percent]",
                "/settings confirm on|off",
                "/settings sellprotection on|off",
                "/settings mev on|off",
                "/settings autobuy on|off",
                "/settings autosell on|off",
                "/settings sniper on|off",
            ].join("\n"),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        settings.botMode === "simple"
                            ? "Simple selected"
                            : "Simple",
                        "ribbot:set-mode:simple"
                    ),
                    Markup.button.callback(
                        settings.botMode === "advanced"
                            ? "Advanced selected"
                            : "Advanced",
                        "ribbot:set-mode:advanced"
                    ),
                ],
                [
                    Markup.button.callback(
                        settings.botMode === "simple"
                            ? "Confirm locked off"
                            : "Toggle Confirm",
                        "ribbot:toggle-confirm"
                    ),
                    Markup.button.callback(
                        "Toggle Sell Protection",
                        "ribbot:toggle-sell-protection"
                    ),
                ],
                [Markup.button.callback("Menu", "ribbot:menu")],
            ])
        );
    }

    private async replyUpdateSettings(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "settings" }>
    ): Promise<void> {
        const update = settingsUpdateFromIntent(intent);
        if (!update) {
            await ctx.reply(
                [
                    "Usage:",
                    "/settings mode simple|advanced",
                    "/settings slippage <percent>",
                    "/settings priority <lamports>",
                    "/settings sellpriority <lamports>",
                    "/settings defaultbuy <SOL>",
                    "/settings buypresets <SOL> <SOL> [SOL] [SOL]",
                    "/settings sellpresets <percent> <percent> [percent] [percent]",
                    "/settings confirm on|off",
                    "/settings sellprotection on|off",
                    "/settings mev on|off",
                    "/settings autobuy on|off",
                    "/settings autosell on|off",
                    "/settings sniper on|off",
                ].join("\n")
            );
            return;
        }

        await this.applySettingsPreference(ctx, user, update);
    }

    private async replyNftHoldings(
        ctx: Context,
        user: TradingUser,
        requestedPage = 0
    ): Promise<void> {
        try {
            const holdings = await fetchNftHoldings({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                page: Math.max(0, requestedPage) + 1,
                limit: 5,
            });

            if (holdings.status !== "ready") {
                if (holdings.status === "not_configured") {
                    await ctx.reply(
                        [
                            "FTX/FrogX NFT holdings are not configured yet.",
                            `Missing: ${(holdings.required ?? []).join(", ") || "unknown"}`,
                        ].join("\n"),
                        this.menuKeyboard()
                    );
                } else if (holdings.status === "wallet_required") {
                    await ctx.reply(
                        "No active FTX wallet is linked for this Telegram account. Run /wallet first.",
                        this.linkWalletKeyboard()
                    );
                } else {
                    await ctx.reply(
                        holdings.error ??
                            "NFT holdings are unavailable from FTX/FrogX right now.",
                        this.menuKeyboard()
                    );
                }
                return;
            }

            const totalPages = Math.max(
                1,
                Math.ceil(Math.max(holdings.total, 1) / holdings.limit)
            );
            const pageIndex = Math.max(0, holdings.page - 1);
            if (holdings.total > 0 && pageIndex >= totalPages) {
                await this.replyNftHoldings(ctx, user, totalPages - 1);
                return;
            }

            const itemLines =
                holdings.items.length > 0
                    ? holdings.items.flatMap((nft, index) =>
                          this.nftHoldingLines(
                              nft,
                              pageIndex * holdings.limit + index + 1
                          )
                      )
                    : ["No NFTs are held by this active wallet."];
            const navigationButtons = [
                ...(pageIndex > 0
                    ? [
                          Markup.button.callback(
                              "Prev",
                              `ribbot:nfts:${pageIndex - 1}`
                          ),
                      ]
                    : []),
                ...(pageIndex < totalPages - 1
                    ? [
                          Markup.button.callback(
                              "Next",
                              `ribbot:nfts:${pageIndex + 1}`
                          ),
                      ]
                    : []),
            ];
            const keyboard = Markup.inlineKeyboard([
                ...(navigationButtons.length ? [navigationButtons] : []),
                [
                    Markup.button.callback(
                        "Refresh",
                        `ribbot:nfts:${pageIndex}`
                    ),
                    Markup.button.callback("Wallet", "ribbot:wallet"),
                ],
                [Markup.button.callback("Menu", "ribbot:menu")],
            ]);
            const text = [
                `NFT Holdings · ${pageIndex + 1}/${totalPages}`,
                `Wallet: ${shortAddress(holdings.walletAddress)}`,
                `Total: ${holdings.total}`,
                "",
                ...itemLines,
            ].join("\n");
            const previewImage = holdings.items.find((nft) => nft.image)?.image;

            if (previewImage) {
                try {
                    await ctx.replyWithPhoto(
                        { url: previewImage },
                        { caption: text, ...keyboard }
                    );
                    return;
                } catch (error) {
                    logger.warn(
                        "Telegram rejected the NFT preview image; using text",
                        error
                    );
                }
            }

            await ctx.reply(text, keyboard);
        } catch (error) {
            logger.warn("FTX/FrogX NFT holdings failed", error);
            await ctx.reply(
                "NFT holdings are unavailable from FTX/FrogX right now.",
                this.menuKeyboard()
            );
        }
    }

    private nftHoldingLines(nft: NftHolding, index: number): string[] {
        const rawName = nft.name.trim() || "Untitled NFT";
        const name =
            rawName.length > 48 ? `${rawName.slice(0, 45)}...` : rawName;
        return [
            `${index}. ${name}`,
            `   ${shortAddress(nft.mint)}${nft.compressed ? " · compressed" : ""}`,
        ];
    }

    private async replyPositions(
        ctx: Context,
        user: TradingUser,
        requestedPage = 0
    ): Promise<void> {
        const currentUser = await this.refreshAccountSnapshot(user);
        if (!currentUser.solanaWalletAddress) {
            await ctx.reply(
                "Link a wallet with /wallet before positions are available.",
                this.linkWalletKeyboard()
            );
            return;
        }

        try {
            const pnl = await fetchPnl({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
            });
            if (pnl.status === "ready") {
                const positionPage = buildPositionPage(
                    pnl.tokens,
                    requestedPage
                );
                const tokenLines =
                    positionPage.items.length > 0
                        ? positionPage.items.flatMap((token, index) => [
                              `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)}`,
                              `   ${token.uiAmountString} · ${formatUsd(token.currentValueUsd)} · PNL ${formatSignedUsd(token.unrealizedPnlUsd)} (${formatSignedPct(token.unrealizedPnlPct)})`,
                          ])
                        : ["No visible SPL token positions."];
                const tokenButtons = positionPage.items.map((token, index) => [
                    Markup.button.callback(
                        `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)} · ${formatUsd(token.currentValueUsd)}`,
                        positionCallbackData(token.mint, positionPage.page)
                    ),
                ]);
                const navigationButtons = [
                    ...(positionPage.page > 0
                        ? [
                              Markup.button.callback(
                                  "Prev",
                                  `ribbot:positions:${positionPage.page - 1}`
                              ),
                          ]
                        : []),
                    ...(positionPage.page < positionPage.totalPages - 1
                        ? [
                              Markup.button.callback(
                                  "Next",
                                  `ribbot:positions:${positionPage.page + 1}`
                              ),
                          ]
                        : []),
                ];
                const hiddenCount = pnl.tokens.filter(
                    (token) => token.hidden
                ).length;

                await ctx.reply(
                    [
                        `Positions · ${positionPage.page + 1}/${positionPage.totalPages}`,
                        `Wallet: ${shortAddress(pnl.walletAddress)}`,
                        `Portfolio: ${formatUsd(pnl.totals.currentPortfolioValueUsd)}`,
                        `SOL: ${pnl.totals.solUiAmount.toFixed(6)} (${formatUsd(pnl.totals.solValueUsd)})`,
                        `Visible: ${positionPage.totalItems} · Hidden: ${hiddenCount}`,
                        "",
                        ...tokenLines,
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        ...tokenButtons,
                        ...(navigationButtons.length > 0
                            ? [navigationButtons]
                            : []),
                        [
                            Markup.button.callback(
                                "Refresh",
                                `ribbot:positions:${positionPage.page}`
                            ),
                            Markup.button.callback("PNL", "ribbot:pnl"),
                        ],
                        [
                            Markup.button.callback("Hidden", "ribbot:hidden"),
                            Markup.button.callback("Menu", "ribbot:menu"),
                        ],
                    ])
                );
                return;
            }
        } catch (error) {
            logger.warn(
                "FTX/FrogX valued positions unavailable; using balances",
                error
            );
        }

        try {
            const positions = await fetchPositions({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
                userPublicKey: currentUser.solanaWalletAddress,
            });

            if ("status" in positions) {
                await ctx.reply(
                    [
                        "FTX/FrogX positions are not configured yet.",
                        `Missing: ${(positions.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            const positionPage = buildPositionPage(
                positions.tokens.map((token) => ({
                    ...token,
                    hidden: currentUser.hiddenTokens.includes(token.mint),
                })),
                requestedPage
            );
            const tokenLines =
                positionPage.items.length > 0
                    ? positionPage.items.map(
                          (token, index) =>
                              `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)} · ${formatTokenBalance(token)}`
                      )
                    : ["No visible SPL token positions."];
            const tokenButtons = positionPage.items.map((token, index) => [
                Markup.button.callback(
                    `${positionPage.startIndex + index + 1}. ${shortAddress(token.mint)}`,
                    positionCallbackData(token.mint, positionPage.page)
                ),
            ]);
            const navigationButtons = [
                ...(positionPage.page > 0
                    ? [
                          Markup.button.callback(
                              "Prev",
                              `ribbot:positions:${positionPage.page - 1}`
                          ),
                      ]
                    : []),
                ...(positionPage.page < positionPage.totalPages - 1
                    ? [
                          Markup.button.callback(
                              "Next",
                              `ribbot:positions:${positionPage.page + 1}`
                          ),
                      ]
                    : []),
            ];

            await ctx.reply(
                [
                    `Positions · ${positionPage.page + 1}/${positionPage.totalPages}`,
                    `Wallet: ${shortAddress(positions.walletAddress)}`,
                    `SOL: ${positions.sol.uiAmount.toFixed(6)}`,
                    `Visible: ${positionPage.totalItems} · Hidden: ${positions.tokens.filter((token) => currentUser.hiddenTokens.includes(token.mint)).length}`,
                    "Values and PNL are unavailable; showing FTX balances.",
                    "",
                    ...tokenLines,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    ...tokenButtons,
                    ...(navigationButtons.length > 0
                        ? [navigationButtons]
                        : []),
                    [
                        Markup.button.callback(
                            "Refresh",
                            `ribbot:positions:${positionPage.page}`
                        ),
                        Markup.button.callback("PNL", "ribbot:pnl"),
                    ],
                    [
                        Markup.button.callback("Hidden", "ribbot:hidden"),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX positions failed", error);
            await ctx.reply(
                "Positions are unavailable from FTX/FrogX right now.",
                this.menuKeyboard()
            );
        }
    }

    private async replyPosition(
        ctx: Context,
        user: TradingUser,
        mint: string,
        page = 0
    ): Promise<void> {
        const currentUser = await this.refreshAccountSnapshot(user);
        if (!currentUser.solanaWalletAddress) {
            await ctx.reply(
                "Link a wallet with /wallet before positions are available.",
                this.linkWalletKeyboard()
            );
            return;
        }

        try {
            const pnl = await fetchPnl({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
            });
            if (pnl.status === "ready") {
                const token = pnl.tokens.find((entry) => entry.mint === mint);
                if (token) {
                    await ctx.reply(
                        [
                            "Position",
                            `Token: ${mint}`,
                            `Balance: ${token.uiAmountString}`,
                            `Value: ${formatUsd(token.currentValueUsd)}`,
                            `Price: ${formatUsd(token.usdPrice)}`,
                            `24h: ${formatSignedPct(token.priceChange24h)}`,
                            `Cost basis: ${formatUsd(token.estimatedCostUsd)}`,
                            `Unrealized: ${formatSignedUsd(token.unrealizedPnlUsd)} (${formatSignedPct(token.unrealizedPnlPct)})`,
                            `Trades: ${token.buyCount} buys · ${token.sellCount} sells`,
                            `Fills: ${token.confirmedFillCount ?? 0} confirmed · ${token.estimatedFillCount ?? 0} estimated`,
                            `Visibility: ${token.hidden ? "hidden" : "shown"}`,
                        ].join("\n"),
                        this.positionKeyboard(
                            currentUser,
                            mint,
                            page,
                            token.hidden
                        )
                    );
                    return;
                }
            }
        } catch (error) {
            logger.warn(
                "FTX/FrogX position PNL unavailable; using balance",
                error
            );
        }

        try {
            const positions = await fetchPositions({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
                userPublicKey: currentUser.solanaWalletAddress,
            });
            if (!("status" in positions)) {
                const token = positions.tokens.find(
                    (entry) => entry.mint === mint
                );
                if (token) {
                    const hidden = currentUser.hiddenTokens.includes(mint);
                    await ctx.reply(
                        [
                            "Position",
                            `Token: ${mint}`,
                            `Balance: ${formatTokenBalance(token)}`,
                            "Value and PNL are unavailable.",
                            `Visibility: ${hidden ? "hidden" : "shown"}`,
                        ].join("\n"),
                        this.positionKeyboard(currentUser, mint, page, hidden)
                    );
                    return;
                }
            }
        } catch (error) {
            logger.warn("FTX/FrogX position detail failed", error);
        }

        await ctx.reply(
            "That position is no longer available in FTX/FrogX.",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "Positions",
                        `ribbot:positions:${page}`
                    ),
                    Markup.button.callback("Menu", "ribbot:menu"),
                ],
            ])
        );
    }

    private positionKeyboard(
        user: TradingUser,
        mint: string,
        page: number,
        hidden: boolean
    ) {
        return Markup.inlineKeyboard([
            ...this.tradePresetRows(user, mint),
            [
                Markup.button.callback("Scan", `ribbot:scan:${mint}`),
                Markup.button.callback("Safety", `ribbot:safety:${mint}`),
            ],
            [
                Markup.button.callback(
                    hidden ? "Unhide" : "Hide",
                    positionVisibilityCallbackData(
                        mint,
                        page,
                        hidden ? "show" : "hide"
                    )
                ),
                Markup.button.callback("Positions", `ribbot:positions:${page}`),
            ],
            [Markup.button.callback("Menu", "ribbot:menu")],
        ]);
    }

    private linkWalletKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback("Wallet", "ribbot:wallet"),
                Markup.button.callback("Menu", "ribbot:menu"),
            ],
        ]);
    }

    private async replyPnl(ctx: Context, user: TradingUser): Promise<void> {
        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link a wallet with /wallet before PNL is available.",
                this.linkWalletKeyboard()
            );
            return;
        }

        try {
            const pnl = await fetchPnl({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });

            if (pnl.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX PNL is not configured yet.",
                        `Missing: ${(pnl.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            if (pnl.status !== "ready") {
                await ctx.reply(
                    "FTX/FrogX does not have a trading wallet snapshot for PNL yet. Run /wallet first.",
                    this.linkWalletKeyboard()
                );
                return;
            }

            const tokenLines =
                pnl.tokens.length > 0
                    ? pnl.tokens
                          .filter((token) => !token.hidden)
                          .slice(0, 5)
                          .map((token, index) =>
                              this.pnlTokenLine(token, index)
                          )
                    : ["No SPL token positions found."];
            const warnings = pnl.warnings
                .slice(0, 2)
                .map((warning) => `Warning: ${warning}`);
            const confirmedFillCount =
                pnl.executionAccounting?.confirmedFillCount ??
                pnl.totals.confirmedFillCount ??
                0;
            const estimatedFillCount =
                pnl.executionAccounting?.estimatedFillCount ??
                pnl.totals.estimatedFillCount ??
                0;

            await ctx.reply(
                [
                    "PNL",
                    `Wallet: ${shortAddress(pnl.walletAddress)}`,
                    `Portfolio: ${formatUsd(pnl.totals.currentPortfolioValueUsd)}`,
                    `Tokens: ${formatUsd(pnl.totals.currentTokenValueUsd)}`,
                    `SOL: ${pnl.totals.solUiAmount.toFixed(6)} (${formatUsd(pnl.totals.solValueUsd)})`,
                    `Cost basis: ${formatUsd(pnl.totals.estimatedCostUsd)}`,
                    `Unrealized: ${formatSignedUsd(pnl.totals.unrealizedPnlUsd)} (${formatSignedPct(pnl.totals.unrealizedPnlPct)})`,
                    `Priced: ${pnl.totals.pricedPositionCount}/${pnl.tokens.length}`,
                    `Executions: ${pnl.totals.executionEventCount}`,
                    `Fills: ${confirmedFillCount} confirmed / ${estimatedFillCount} estimated`,
                    "",
                    ...tokenLines,
                    warnings.length ? "" : undefined,
                    ...warnings,
                    "",
                    "Fill reconciliation is read-only. USD PNL remains net-flow based, not realized/FIFO tax-lot accounting.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Refresh", "ribbot:pnl"),
                        Markup.button.callback("Positions", "ribbot:positions"),
                    ],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX PNL failed", error);
            await ctx.reply(
                "PNL is unavailable from FTX/FrogX right now.",
                this.menuKeyboard()
            );
        }
    }

    private pnlTokenLine(token: PnlToken, index: number): string {
        return [
            `${index + 1}. ${shortAddress(token.mint)}`,
            `${formatUsd(token.currentValueUsd)}`,
            `PNL ${formatSignedUsd(token.unrealizedPnlUsd)}`,
            `(${formatSignedPct(token.unrealizedPnlPct)})`,
            token.costBasisStatus === "estimated"
                ? undefined
                : token.costBasisStatus.replace(/_/g, " "),
        ]
            .filter(Boolean)
            .join(" ");
    }

    private async replyActivity(
        ctx: Context,
        user: TradingUser
    ): Promise<void> {
        try {
            const activity = await fetchActivity({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                limit: 10,
            });

            if (activity.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX activity history is not configured yet.",
                        `Missing: ${(activity.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            const eventLines =
                activity.events.length > 0
                    ? activity.events.flatMap((event, index) =>
                          this.activityEventLines(event, index)
                      )
                    : ["No FTX/FrogX account events have been recorded yet."];
            const warnings = activity.warnings
                .slice(0, 2)
                .map((warning) => `Warning: ${warning}`);

            await ctx.reply(
                [
                    "Activity",
                    `Events shown: ${activity.events.length}`,
                    activity.summary.latestEventAt
                        ? `Latest: ${activity.summary.latestEventAt}`
                        : undefined,
                    "",
                    ...eventLines,
                    warnings.length ? "" : undefined,
                    ...warnings,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Refresh", "ribbot:activity")],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX activity fetch failed", error);
            await ctx.reply(
                "Activity history is unavailable from FTX/FrogX right now."
            );
        }
    }

    private async replyTokenCleanup(
        ctx: Context,
        user: TradingUser
    ): Promise<void> {
        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link a wallet with /wallet before token cleanup is available.",
                this.linkWalletKeyboard()
            );
            return;
        }

        try {
            const cleanup = await fetchTokenCleanup({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                hiddenTokens: user.hiddenTokens,
            });

            if (cleanup.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX token cleanup is not configured yet.",
                        `Missing: ${(cleanup.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            const candidateLines =
                cleanup.candidates.length > 0
                    ? cleanup.candidates
                          .slice(0, 8)
                          .map((candidate, index) =>
                              this.tokenCleanupLine(candidate, index)
                          )
                    : ["No cleanup candidates found."];
            const warnings = cleanup.warnings
                .slice(0, 2)
                .map((warning) => `Warning: ${warning}`);
            const actionRows = cleanup.candidates
                .slice(0, 5)
                .map((candidate, index) => {
                    const buttons = [];
                    if (candidate.suggestedActions.includes("hide")) {
                        buttons.push(
                            Markup.button.callback(
                                `Hide ${index + 1}`,
                                `ribbot:cleanup-hide:${candidate.mint}`
                            )
                        );
                    }
                    if (candidate.suggestedActions.includes("sell")) {
                        buttons.push(
                            Markup.button.callback(
                                `Sell ${index + 1}`,
                                `ribbot:cleanup-sell:${candidate.mint}`
                            )
                        );
                    }
                    return buttons;
                })
                .filter((row) => row.length > 0);

            await ctx.reply(
                [
                    "Token cleanup",
                    `Wallet: ${shortAddress(cleanup.walletAddress)}`,
                    `Candidates: ${cleanup.summary.cleanupCandidates}/${cleanup.summary.totalTokens}`,
                    `Dust threshold: ${formatUsd(cleanup.summary.dustUsdThreshold)}`,
                    `Dust value: ${formatUsd(cleanup.summary.dustValueUsd)}`,
                    `Hidden positions: ${cleanup.summary.hiddenPositions}`,
                    "",
                    ...candidateLines,
                    warnings.length ? "" : undefined,
                    ...warnings,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    ...actionRows,
                    [
                        Markup.button.callback("Positions", "ribbot:positions"),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX token cleanup failed", error);
            await ctx.reply(
                "Token cleanup is unavailable from FTX/FrogX right now."
            );
        }
    }

    private tokenCleanupLine(
        candidate: TokenCleanupCandidate,
        index: number
    ): string {
        return [
            `${index + 1}. ${shortAddress(candidate.mint)}`,
            candidate.cleanupReason,
            formatUsd(candidate.currentValueUsd),
            formatTokenBalance(candidate),
            candidate.hidden ? "hidden" : undefined,
        ]
            .filter(Boolean)
            .join(" ");
    }

    private async replyTokenSafety(
        ctx: Context,
        user: TradingUser,
        mint?: string
    ): Promise<void> {
        if (!mint || !isSolanaMint(mint)) {
            await ctx.reply("Usage: /safety <token mint>");
            return;
        }

        try {
            const safety = await fetchTokenSafety({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                mint,
            });

            if (safety.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX token safety is not configured yet.",
                        `Missing: ${(safety.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            if (safety.status === "not_found") {
                await ctx.reply(
                    [
                        "Token safety",
                        `Token: ${shortAddress(mint)}`,
                        "Risk: unknown",
                        "",
                        ...safety.warnings.map(
                            (warning) => `Warning: ${warning}`
                        ),
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback(
                                "Watch",
                                `ribbot:watch:${mint}`
                            ),
                            Markup.button.callback("Menu", "ribbot:menu"),
                        ],
                    ])
                );
                return;
            }

            const notableFlags = safety.risk.flags
                .filter((flag) => flag.severity !== "info")
                .slice(0, 5);
            const flagLines =
                notableFlags.length > 0
                    ? notableFlags.map((flag) => this.tokenSafetyFlagLine(flag))
                    : ["No mint/freeze authority warnings from FTX/FrogX."];

            await ctx.reply(
                [
                    "Token safety",
                    `Token: ${shortAddress(safety.mint)}`,
                    `Risk: ${safety.risk.level.toUpperCase()} (${safety.risk.score}/100)`,
                    `Price: ${formatUsd(safety.pricing.usdPrice)}`,
                    `Supply: ${formatRawTokenAmount(safety.mintAccount.supply, safety.mintAccount.decimals ?? 0)}`,
                    `Mint auth: ${formatAuthority(safety.mintAccount.mintAuthority)}`,
                    `Freeze auth: ${formatAuthority(safety.mintAccount.freezeAuthority)}`,
                    "",
                    ...flagLines,
                    "",
                    "Review only. FTX/FrogX did not build, sign, or broadcast a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            `Buy ${user.settings.defaultBuySol} SOL`,
                            `ribbot:buy:${mint}:${user.settings.defaultBuySol}`
                        ),
                        Markup.button.callback("Watch", `ribbot:watch:${mint}`),
                    ],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX token safety failed", error);
            await ctx.reply(
                "Token safety is unavailable from FTX/FrogX right now."
            );
        }
    }

    private async replyMarketRisk(
        ctx: Context,
        user: TradingUser,
        mint?: string,
        amountSol?: number
    ): Promise<void> {
        if (!mint || !isSolanaMint(mint)) {
            await ctx.reply("Usage: /scan <token mint> [SOL amount]");
            return;
        }

        const probeSol =
            amountSol && amountSol > 0
                ? amountSol
                : user.settings.defaultBuySol;
        const amountIn = solToLamports(probeSol);

        try {
            const review = await fetchMarketRisk({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                mint,
                amountIn,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.priorityFeeLamports,
                minLiquidityUsd: 1000,
                maxPriceImpactBps: Math.max(user.settings.slippageBps, 1500),
            });

            if (review.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX market scan is not configured yet.",
                        `Missing: ${(review.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            const notableFlags = review.risk.flags
                .filter((flag) => flag.severity !== "info")
                .slice(0, 6);
            const flagLines =
                notableFlags.length > 0
                    ? notableFlags.map((flag) => this.tokenSafetyFlagLine(flag))
                    : ["No market-risk warnings from FTX/FrogX."];

            await ctx.reply(
                [
                    "Token scan",
                    `Token: ${shortAddress(review.mint)}`,
                    `Risk: ${review.risk.level.toUpperCase()} (${review.risk.score}/100)`,
                    `Market cap: ${formatUsd(review.marketCap.usd)}`,
                    `SOL price: ${formatUsd(review.pricing.solUsdPrice)}`,
                    this.marketRiskQuoteLine(review.quoteProbe),
                    "",
                    ...flagLines,
                    "",
                    "Review only. FTX/FrogX did not build, sign, or broadcast a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            `Buy ${user.settings.defaultBuySol} SOL`,
                            `ribbot:buy:${mint}:${user.settings.defaultBuySol}`
                        ),
                        Markup.button.callback(
                            "Safety",
                            `ribbot:safety:${mint}`
                        ),
                    ],
                    [
                        Markup.button.callback("Watch", `ribbot:watch:${mint}`),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX market scan failed", error);
            await ctx.reply(
                "Market scan is unavailable from FTX/FrogX right now."
            );
        }
    }

    private marketRiskQuoteLine(quoteProbe: MarketRiskQuoteProbe): string {
        if (quoteProbe.status === "ready") {
            const solAmount = lamportsToSol(quoteProbe.amountIn).toFixed(4);
            const impact =
                quoteProbe.priceImpactBps === null ||
                quoteProbe.priceImpactBps === undefined
                    ? "unknown"
                    : formatBps(quoteProbe.priceImpactBps);
            return `Liquidity probe: ${solAmount} SOL (${formatUsd(quoteProbe.amountInUsd)}) impact ${impact}`;
        }
        if (quoteProbe.status === "not_configured") {
            return `Liquidity probe: NOT RUN. ${marketRiskQuoteBlockingReason(quoteProbe)}`;
        }
        return `Liquidity probe: NOT RUN. ${marketRiskQuoteBlockingReason(quoteProbe)}`;
    }

    private tokenSafetyFlagLine(flag: TokenSafetyFlag): string {
        const label = flag.severity === "danger" ? "Danger" : "Warning";
        return `${label}: ${flag.message}`;
    }

    private async replyOrders(ctx: Context, user: TradingUser): Promise<void> {
        let storageWarning: string | undefined;
        try {
            const stored = await fetchScheduledOrders({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                for (const order of stored.orders) {
                    this.syncStoredAutomationOrder(user, order);
                }
            } else {
                storageWarning = `FTX/FrogX order storage missing ${(stored.required ?? []).join(", ") || "required config"}. Showing Ribbot cache only.`;
            }
        } catch (error) {
            logger.warn("FTX/FrogX order list failed", error);
            storageWarning =
                "FTX/FrogX order storage is unavailable right now. Showing Ribbot cache only.";
        }

        const orders = this.store
            .listAutomationOrders(user)
            .filter((order) => order.status !== "cancelled");
        const marketTickets = this.store
            .listPendingOrders(user)
            .filter((order) => order.status !== "cancelled")
            .slice(0, 5);
        const cancellableOrders = orders.filter(
            (order) => order.status === "staged"
        );

        if (orders.length === 0 && marketTickets.length === 0) {
            await ctx.reply(
                [
                    "Orders",
                    storageWarning,
                    "No active or recent limit, stop, trailing, or DCA orders.",
                    "",
                    "Usage:",
                    "/limit buy <mint> <SOL> below <price>",
                    "/limit sell <mint> <percent> above <price>",
                    "/stop <mint> <percent> below <price>",
                    "/trailing <mint> <sell percent> <trail percent>",
                    "/dca buy <mint> <total SOL> <orders> <interval minutes>",
                    "",
                    "FTX/FrogX stores every order definition before Ribbot caches it.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.menuKeyboard()
            );
            return;
        }

        const lines = [
            "Orders",
            storageWarning,
            ...(marketTickets.length > 0
                ? [
                      "",
                      "Market tickets (Ribbot cache)",
                      ...marketTickets.flatMap((order, index) => [
                          `${index + 1}. ${order.side.toUpperCase()} ${shortAddress(order.mint)}`,
                          ...this.orderSummaryLines(order),
                      ]),
                  ]
                : []),
            ...(orders.length > 0 ? ["", "Scheduled orders (FTX)"] : []),
            ...orders
                .slice(0, 10)
                .flatMap((order, index) => [
                    "",
                    `${index + 1}. ${this.automationOrderTitle(order)}`,
                    ...this.automationOrderSummaryLines(order),
                ]),
            orders.length > 10 ? `\n...and ${orders.length - 10} more` : "",
        ].filter(Boolean);

        const buttons = cancellableOrders
            .slice(0, 5)
            .map((order) => [
                Markup.button.callback(
                    `Cancel ${order.id}`,
                    `ribbot:cancel-auto:${order.id}`
                ),
            ]);
        for (const order of marketTickets) {
            if (order.status === "execution_pending") {
                buttons.unshift([
                    Markup.button.callback(
                        `Check ${order.id}`,
                        `ribbot:check-order:${order.id}`
                    ),
                ]);
            }
        }
        buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyWithdrawals(
        ctx: Context,
        user: TradingUser
    ): Promise<void> {
        const tickets = this.store
            .listWithdrawalTickets(user)
            .filter((ticket) => ticket.status !== "cancelled");

        if (tickets.length === 0) {
            await ctx.reply(
                [
                    "Withdrawals",
                    "No withdrawals are staged.",
                    "",
                    "Usage:",
                    "/withdraw sol <amount SOL> <destination>",
                    "/withdraw <token mint> <percent|all> <destination>",
                    "",
                    "FTX/FrogX validates withdrawal details before Ribbot stores a staged ticket.",
                ].join("\n"),
                this.menuKeyboard()
            );
            return;
        }

        const lines = [
            "Withdrawals",
            ...tickets
                .slice(0, 10)
                .flatMap((ticket, index) => [
                    "",
                    `${index + 1}. ${ticket.assetType.toUpperCase()} withdrawal`,
                    ...this.withdrawalTicketSummaryLines(ticket),
                    ticket.execution?.signature
                        ? `Signature: ${ticket.execution.signature}`
                        : undefined,
                    ticket.execution?.solscanUrl
                        ? `Solscan: ${ticket.execution.solscanUrl}`
                        : undefined,
                ]),
            tickets.length > 10 ? `\n...and ${tickets.length - 10} more` : "",
        ].filter(Boolean);

        const stagedButtons = tickets
            .filter((ticket) => ticket.status === "staged")
            .slice(0, 5)
            .map((ticket) => [
                Markup.button.callback(
                    `Send ${ticket.id}`,
                    `ribbot:execute-withdrawal:${ticket.id}`
                ),
                Markup.button.callback(
                    `Cancel ${ticket.id}`,
                    `ribbot:cancel-withdrawal:${ticket.id}`
                ),
            ]);
        const pendingButtons = tickets
            .filter((ticket) => ticket.status === "execution_pending")
            .slice(0, 5)
            .map((ticket) => [
                Markup.button.callback(
                    `Check ${ticket.id}`,
                    `ribbot:check-withdrawal:${ticket.id}`
                ),
            ]);
        const buttons = [...pendingButtons, ...stagedButtons];
        buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyWithdraw(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "withdraw" }>
    ): Promise<void> {
        if (
            !intent.asset ||
            !intent.amount ||
            !intent.destinationAddress ||
            !isSolanaAddress(intent.destinationAddress)
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/withdraw sol <amount SOL> <destination>",
                    "/withdraw <token mint> <percent|all> <destination>",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging withdrawals."
            );
            return;
        }

        if (intent.destinationAddress === user.solanaWalletAddress) {
            await ctx.reply(
                "Withdrawal destination must be different from your trading wallet."
            );
            return;
        }

        let mint: string;
        let amountIn: string;
        let amountLabel: string;

        if (isSolAlias(intent.asset)) {
            const amountSol = numberFromValue(intent.amount);
            if (!amountSol) {
                await ctx.reply(
                    "Usage: /withdraw sol <amount SOL> <destination>"
                );
                return;
            }

            mint = SOL_MINT;
            amountIn = solToLamports(amountSol);
            amountLabel = `${amountSol} SOL`;
        } else if (isSolanaMint(intent.asset)) {
            mint = intent.asset;

            try {
                const token = await this.findPositionToken(user, mint);
                if (!token || token.amount === "0") {
                    await ctx.reply(
                        [
                            "No position found for that mint.",
                            `Token: ${shortAddress(mint)}`,
                            "",
                            "Run /positions to refresh balances.",
                        ].join("\n")
                    );
                    return;
                }

                const percent =
                    intent.amount.toLowerCase() === "all"
                        ? 100
                        : numberFromValue(intent.amount);
                if (!percent || percent <= 0) {
                    await ctx.reply(
                        "Usage: /withdraw <token mint> <percent|all> <destination>"
                    );
                    return;
                }

                const clampedPercent = Math.min(percent, 100);
                amountIn = applyPercentage(token.amount, clampedPercent);
                if (amountIn === "0") {
                    await ctx.reply(
                        "Withdrawal amount rounds to zero for this position."
                    );
                    return;
                }
                amountLabel =
                    intent.amount.toLowerCase() === "all"
                        ? `all (${formatRawTokenAmount(amountIn, token.decimals)})`
                        : `${clampedPercent}% (${formatRawTokenAmount(amountIn, token.decimals)})`;
            } catch (error) {
                logger.warn(
                    "FTX/FrogX withdrawal position lookup failed",
                    error
                );
                await ctx.reply(
                    "Token withdrawals need a fresh FTX/FrogX position snapshot, but positions are unavailable right now."
                );
                return;
            }
        } else {
            await ctx.reply(
                [
                    "Usage:",
                    "/withdraw sol <amount SOL> <destination>",
                    "/withdraw <token mint> <percent|all> <destination>",
                ].join("\n")
            );
            return;
        }

        try {
            const validation = await validateWithdrawal({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                mint,
                amountIn,
                amountLabel,
                destinationAddress: intent.destinationAddress,
            });

            if (validation.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX withdrawal validation is not configured for Ribbot yet.",
                        `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this withdrawal.",
                    ].join("\n")
                );
                return;
            }

            const normalized = validation.normalized;
            const ticket = this.store.createWithdrawalTicket(user, {
                mint: normalized.mint,
                assetType: normalized.assetType,
                amountIn: normalized.amountIn,
                amountLabel: normalized.amountLabel ?? amountLabel,
                walletAddress: normalized.userPublicKey,
                destinationAddress: normalized.destinationAddress,
                validation: {
                    validatedAt: validation.validatedAt,
                    warnings: validation.warnings,
                },
            });

            await ctx.reply(
                [
                    "Withdrawal staged through FTX/FrogX validation.",
                    ...this.withdrawalTicketSummaryLines(ticket),
                    "",
                    ...validation.warnings.map(
                        (warning) => `Warning: ${warning}`
                    ),
                    "",
                    "Tap Send to ask FTX/FrogX to execute through Privy when live gates are enabled.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "Send",
                            `ribbot:execute-withdrawal:${ticket.id}`
                        ),
                        Markup.button.callback(
                            "Withdrawals",
                            "ribbot:withdrawals"
                        ),
                    ],
                    [
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-withdrawal:${ticket.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX withdrawal validation failed", error);
            await ctx.reply(
                "FTX/FrogX could not validate this withdrawal. Ribbot did not store it."
            );
        }
    }

    private async replyLimitOrder(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "limit" }>
    ): Promise<void> {
        if (
            !intent.side ||
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.amount ||
            intent.amount <= 0 ||
            !intent.triggerDirection ||
            !intent.triggerPrice
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/limit buy <mint> <SOL> below <price>",
                    "/limit sell <mint> <percent> above <price>",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging limit orders."
            );
            return;
        }

        const mint = intent.mint;
        let amountIn: string;
        let amountLabel: string;
        let inMint: string;
        let outMint: string;

        if (intent.side === "buy") {
            amountIn = solToLamports(intent.amount);
            amountLabel = `${intent.amount} SOL`;
            inMint = SOL_MINT;
            outMint = mint;
        } else {
            const percent = Math.min(intent.amount, 100);
            try {
                const token = await this.findPositionToken(user, mint);
                if (!token || token.amount === "0") {
                    await ctx.reply(
                        [
                            "No position found for that mint.",
                            `Token: ${shortAddress(mint)}`,
                            "",
                            "Run /positions to refresh balances.",
                        ].join("\n")
                    );
                    return;
                }

                amountIn = applyPercentage(token.amount, percent);
                if (amountIn === "0") {
                    await ctx.reply(
                        "Limit sell amount rounds to zero for this position."
                    );
                    return;
                }
                amountLabel = `${percent}% (${formatRawTokenAmount(amountIn, token.decimals)})`;
                inMint = mint;
                outMint = SOL_MINT;
            } catch (error) {
                logger.warn(
                    "FTX/FrogX limit sell position lookup failed",
                    error
                );
                await ctx.reply(
                    "Limit sell setup needs a fresh FTX/FrogX position snapshot, but positions are unavailable right now."
                );
                return;
            }
        }

        await this.validateAndStoreAutomationOrder(ctx, user, {
            kind: "limit",
            side: intent.side,
            mint,
            inMint,
            outMint,
            amountIn,
            amountLabel,
            triggerDirection: intent.triggerDirection,
            triggerPrice: intent.triggerPrice,
        });
    }

    private async replyDcaOrder(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "dca" }>
    ): Promise<void> {
        if (
            intent.side !== "buy" ||
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.totalSol ||
            intent.totalSol <= 0 ||
            !intent.orderCount ||
            !Number.isInteger(intent.orderCount) ||
            !intent.intervalMinutes ||
            !Number.isInteger(intent.intervalMinutes)
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/dca buy <mint> <total SOL> <orders> <interval minutes>",
                    "",
                    "Example: /dca buy <mint> 1 5 30",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging DCA orders."
            );
            return;
        }

        await this.validateAndStoreAutomationOrder(ctx, user, {
            kind: "dca",
            side: "buy",
            mint: intent.mint,
            inMint: SOL_MINT,
            outMint: intent.mint,
            amountIn: solToLamports(intent.totalSol),
            amountLabel: `${intent.totalSol} SOL total`,
            orderCount: intent.orderCount,
            intervalMinutes: intent.intervalMinutes,
        });
    }

    private async replyStopOrder(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "stop" }>
    ): Promise<void> {
        if (
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.percentage ||
            intent.percentage <= 0 ||
            intent.triggerDirection !== "below" ||
            !intent.triggerPrice
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/stop <mint> <percent> below <price>",
                    "",
                    "Example: /stop <mint> 50 below 0.008",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging stop-loss orders."
            );
            return;
        }

        const sellAmount = await this.resolvePositionSellAmount(
            ctx,
            user,
            intent.mint,
            intent.percentage,
            "Stop-loss"
        );
        if (!sellAmount) return;

        await this.validateAndStoreAutomationOrder(ctx, user, {
            kind: "stop",
            side: "sell",
            mint: intent.mint,
            inMint: intent.mint,
            outMint: SOL_MINT,
            amountIn: sellAmount.amountIn,
            amountLabel: sellAmount.amountLabel,
            triggerDirection: "below",
            triggerPrice: intent.triggerPrice,
        });
    }

    private async replyTrailingOrder(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "trailing" }>
    ): Promise<void> {
        if (
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.percentage ||
            intent.percentage <= 0 ||
            !intent.trailingPercent ||
            intent.trailingPercent <= 0
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/trailing <mint> <sell percent> <trail percent>",
                    "",
                    "Example: /trailing <mint> 50 12.5",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging trailing stops."
            );
            return;
        }

        const trailingBps = Math.round(intent.trailingPercent * 100);
        if (
            !Number.isInteger(trailingBps) ||
            trailingBps < 1 ||
            trailingBps > 10_000
        ) {
            await ctx.reply(
                "Trailing percent must be greater than 0 and no more than 100."
            );
            return;
        }

        const sellAmount = await this.resolvePositionSellAmount(
            ctx,
            user,
            intent.mint,
            intent.percentage,
            "Trailing stop"
        );
        if (!sellAmount) return;

        await this.validateAndStoreAutomationOrder(ctx, user, {
            kind: "trailing",
            side: "sell",
            mint: intent.mint,
            inMint: intent.mint,
            outMint: SOL_MINT,
            amountIn: sellAmount.amountIn,
            amountLabel: sellAmount.amountLabel,
            trailingBps,
        });
    }

    private async resolvePositionSellAmount(
        ctx: Context,
        user: TradingUser,
        mint: string,
        percentage: number,
        label: string
    ): Promise<{ amountIn: string; amountLabel: string } | undefined> {
        const percent = Math.min(percentage, 100);

        try {
            const token = await this.findPositionToken(user, mint);
            if (!token || token.amount === "0") {
                await ctx.reply(
                    [
                        "No position found for that mint.",
                        `Token: ${shortAddress(mint)}`,
                        "",
                        "Run /positions to refresh balances.",
                    ].join("\n")
                );
                return undefined;
            }

            const amountIn = applyPercentage(token.amount, percent);
            if (amountIn === "0") {
                await ctx.reply(
                    `${label} amount rounds to zero for this position.`
                );
                return undefined;
            }

            return {
                amountIn,
                amountLabel: `${percent}% (${formatRawTokenAmount(amountIn, token.decimals)})`,
            };
        } catch (error) {
            logger.warn(
                `FTX/FrogX ${label.toLowerCase()} position lookup failed`,
                error
            );
            await ctx.reply(
                `${label} setup needs a fresh FTX/FrogX position snapshot, but positions are unavailable right now.`
            );
            return undefined;
        }
    }

    private async validateAndStoreAutomationOrder(
        ctx: Context,
        user: TradingUser,
        input: {
            kind: ScheduledOrderKind;
            side: ScheduledOrderSide;
            mint: string;
            inMint: string;
            outMint: string;
            amountIn: string;
            amountLabel: string;
            triggerPrice?: string;
            triggerDirection?: TriggerDirection;
            orderCount?: number;
            intervalMinutes?: number;
            trailingBps?: number;
        }
    ): Promise<void> {
        if (!user.solanaWalletAddress) return;

        try {
            const storage = await storeScheduledOrder({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                kind: input.kind,
                side: input.side,
                mint: input.mint,
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                amountLabel: input.amountLabel,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports:
                    input.side === "sell"
                        ? user.settings.sellPriorityFeeLamports
                        : user.settings.priorityFeeLamports,
                triggerPrice: input.triggerPrice,
                triggerDirection: input.triggerDirection,
                orderCount: input.orderCount,
                intervalMinutes: input.intervalMinutes,
                trailingBps: input.trailingBps,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX order storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this order.",
                    ].join("\n")
                );
                return;
            }

            const order = this.syncStoredAutomationOrder(user, storage.order);

            await ctx.reply(
                [
                    `${automationKindLabel(input.kind)} order stored through FTX/FrogX.`,
                    ...this.automationOrderSummaryLines(order),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    "No transaction was built, signed, broadcast, or scheduled.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Orders", "ribbot:orders"),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-auto:${order.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX order validation failed", error);
            await ctx.reply(
                "FTX/FrogX could not validate this order. Ribbot did not store it."
            );
        }
    }

    private async findPositionToken(
        user: TradingUser,
        mint: string
    ): Promise<PositionToken | undefined> {
        if (!user.solanaWalletAddress) return undefined;

        const positions = await fetchPositions({
            frogxApiBaseUrl: this.config.frogxApiBaseUrl,
            ftxApiToken: this.config.ftxApiToken,
            telegramUserId: user.telegramUserId,
            userPublicKey: user.solanaWalletAddress,
        });

        if ("status" in positions) {
            throw new Error(
                `FTX/FrogX positions missing ${(positions.required ?? []).join(", ")}`
            );
        }

        return positions.tokens.find((entry) => entry.mint === mint);
    }

    private async replyCancelAutomationOrder(
        ctx: Context,
        user: TradingUser,
        orderId?: string
    ): Promise<void> {
        if (!orderId) {
            await ctx.reply("Order id missing.");
            return;
        }

        try {
            const cancelled = await cancelStoredScheduledOrder({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                orderId,
            });
            if (cancelled.status === "cancelled") {
                const order = this.syncStoredAutomationOrder(
                    user,
                    cancelled.order
                );
                await ctx.reply(
                    [
                        "Staged order cancelled through FTX/FrogX.",
                        ...this.automationOrderSummaryLines(order),
                    ].join("\n")
                );
                return;
            }
            if (cancelled.status === "not_configured") {
                logger.warn(
                    `FTX/FrogX order cancel missing ${(cancelled.required ?? []).join(", ")}`
                );
                await ctx.reply(
                    "FTX/FrogX order storage is not configured, so the order was not cancelled."
                );
                return;
            }
            if (cancelled.status === "not_found") {
                logger.warn(
                    `FTX/FrogX order ${orderId} not found for cancellation`
                );
                await ctx.reply(
                    "FTX/FrogX no longer has this order. Refresh /orders before taking another action."
                );
                return;
            }
            if (cancelled.status === "not_cancellable") {
                await ctx.reply(
                    cancelled.error ??
                        "FTX/FrogX did not cancel this order because its execution state has changed.",
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Orders", "ribbot:orders")],
                    ])
                );
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX order cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not confirm cancellation, so Ribbot left the order unchanged."
            );
        }
    }

    private async replyExecuteWithdrawal(
        ctx: Context,
        user: TradingUser,
        ticketId?: string
    ): Promise<void> {
        if (!ticketId) {
            await ctx.reply("Withdrawal ticket id missing.");
            return;
        }

        const ticket = this.store.getWithdrawalTicket(user, ticketId);
        if (!ticket) {
            await ctx.reply("Withdrawal ticket not found.");
            return;
        }

        if (ticket.status === "cancelled") {
            await ctx.reply("Withdrawal ticket was already cancelled.");
            return;
        }

        if (ticket.status === "executed") {
            await ctx.reply(
                [
                    "Withdrawal was already executed.",
                    ...this.withdrawalTicketSummaryLines(ticket),
                    ticket.execution?.signature
                        ? `Signature: ${ticket.execution.signature}`
                        : undefined,
                    ticket.execution?.solscanUrl
                        ? `Solscan: ${ticket.execution.solscanUrl}`
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n")
            );
            return;
        }

        if (ticket.status === "execution_pending") {
            await this.replyCheckWithdrawalStatus(ctx, user, ticket.id);
            return;
        }

        if (ticket.status === "execution_failed") {
            await ctx.reply(
                [
                    "This withdrawal attempt ended in a terminal failure.",
                    ...this.withdrawalTicketSummaryLines(ticket),
                    ticket.reconciliation?.error,
                    "Create a fresh withdrawal ticket before trying again.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "Withdrawals",
                            "ribbot:withdrawals"
                        ),
                    ],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
            return;
        }

        if (!this.config.tradingEnabled || this.config.dryRun) {
            await ctx.reply(
                [
                    "Dry-run withdrawal confirmation recorded.",
                    ...this.withdrawalTicketSummaryLines(ticket),
                    "",
                    "No transfer transaction was built, signed, or broadcast. Ribbot's live gates are off, so this Send was not forwarded to FTX/FrogX.",
                ].join("\n"),
                this.menuKeyboard()
            );
            return;
        }

        try {
            const execution = await executeWithdrawal({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                withdrawalId: ticket.id,
                telegramUserId: user.telegramUserId,
                userPublicKey: ticket.walletAddress,
                mint: ticket.mint,
                amountIn: ticket.amountIn,
                amountLabel: ticket.amountLabel,
                destinationAddress: ticket.destinationAddress,
            });

            if (execution.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX live withdrawal execution is not configured for Ribbot yet.",
                        `Missing: ${(execution.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "No transfer transaction was signed or broadcast.",
                    ].join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, false)
                );
                return;
            }

            if (execution.status === "not_executable") {
                await ctx.reply(
                    [
                        "FTX/FrogX could not execute this withdrawal.",
                        ...this.withdrawalTicketSummaryLines(ticket),
                        "",
                        execution.error ??
                            "No transfer transaction was signed or broadcast.",
                    ].join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, false)
                );
                return;
            }

            if (execution.status === "pending_reconciliation") {
                const reconciliation =
                    this.store.markWithdrawalExecutionPending(user, ticket.id, {
                        status: "pending",
                        referenceId: execution.referenceId,
                        transactionId: execution.transactionId,
                        executionStartedAt: execution.executionStartedAt,
                        checkedAt: new Date().toISOString(),
                        error: execution.error,
                        manualReviewRequired: execution.manualReviewRequired,
                        manualReviewAfter: execution.manualReviewAfter,
                        manualReviewRequiredAt:
                            execution.manualReviewRequiredAt,
                        manualReviewReason: execution.manualReviewReason,
                    });
                await ctx.reply(
                    [
                        "Withdrawal status is not confirmed yet.",
                        ...this.withdrawalTicketSummaryLines(
                            reconciliation ?? ticket
                        ),
                        "",
                        execution.error,
                        this.manualReviewRecoveryLine(execution),
                        "Do not create or send another withdrawal for this ticket. Check status instead; the check never resends the transfer.",
                    ].join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, true)
                );
                return;
            }

            const updated = this.store.markWithdrawalExecuted(user, ticket.id, {
                signature: execution.signature,
                transactionId: execution.transactionId,
                referenceId: execution.referenceId,
                solscanUrl: execution.solscanUrl,
                executedAt: execution.executedAt,
            });

            await ctx.reply(
                [
                    "FTX/FrogX executed the withdrawal through Privy.",
                    ...this.withdrawalTicketSummaryLines(updated ?? ticket),
                    `Signature: ${execution.signature}`,
                    execution.solscanUrl
                        ? `Solscan: ${execution.solscanUrl}`
                        : undefined,
                    execution.transactionId
                        ? `Privy tx: ${execution.transactionId}`
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.withdrawalExecutionKeyboard(ticket.id, false)
            );
        } catch (error) {
            logger.warn("FTX/FrogX withdrawal execution failed", error);
            this.store.markWithdrawalExecutionPending(user, ticket.id, {
                status: "lookup_error",
                checkedAt: new Date().toISOString(),
                error: "Ribbot lost contact with FTX after requesting execution.",
            });
            await ctx.reply(
                [
                    "Withdrawal status is unknown because Ribbot lost contact with FTX.",
                    "Do not send this ticket again. Check status; FTX will query Privy without resending the transfer.",
                ].join("\n"),
                this.withdrawalExecutionKeyboard(ticket.id, true)
            );
        }
    }

    private async replyCheckWithdrawalStatus(
        ctx: Context,
        user: TradingUser,
        ticketId?: string
    ): Promise<void> {
        if (!ticketId) {
            await ctx.reply(
                "Withdrawal ticket id missing.",
                this.menuKeyboard()
            );
            return;
        }
        const ticket = this.store.getWithdrawalTicket(user, ticketId);
        if (!ticket) {
            await ctx.reply(
                "Withdrawal ticket not found.",
                this.menuKeyboard()
            );
            return;
        }

        try {
            const result = await fetchWithdrawalExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                withdrawalId: ticket.id,
                telegramUserId: user.telegramUserId,
                userPublicKey: ticket.walletAddress,
                mint: ticket.mint,
                amountIn: ticket.amountIn,
                amountLabel: ticket.amountLabel,
                destinationAddress: ticket.destinationAddress,
            });

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX withdrawal status lookup is not configured.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "The ticket remains locked because its execution state is not proven.",
                    ].join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, true)
                );
                return;
            }

            if (result.status === "executed") {
                const updated = this.store.markWithdrawalExecuted(
                    user,
                    ticket.id,
                    {
                        signature: result.signature,
                        transactionId: result.transactionId,
                        referenceId: result.referenceId,
                        solscanUrl: result.solscanUrl,
                        executedAt: result.executedAt,
                    }
                );
                await ctx.reply(
                    [
                        "FTX confirmed the withdrawal through Privy.",
                        ...this.withdrawalTicketSummaryLines(updated ?? ticket),
                        `Provider status: ${result.providerStatus ?? "confirmed"}`,
                        `Signature: ${result.signature}`,
                        result.solscanUrl
                            ? `Solscan: ${result.solscanUrl}`
                            : undefined,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, false)
                );
                return;
            }

            if (result.status === "failed") {
                const failed = this.store.markWithdrawalExecutionFailed(
                    user,
                    ticket.id,
                    this.reconciliationRecord(result, "failed")
                );
                await ctx.reply(
                    [
                        "FTX confirmed this withdrawal failed.",
                        ...this.withdrawalTicketSummaryLines(failed ?? ticket),
                        `Provider status: ${result.providerStatus ?? "failed"}`,
                        result.error,
                        "No automatic retry was sent. Create a fresh withdrawal ticket if you still want to transfer.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.withdrawalExecutionKeyboard(ticket.id, false)
                );
                return;
            }

            const pendingStatus =
                result.status === "not_found" ? "not_found" : "lookup_error";
            const pending = this.store.markWithdrawalExecutionPending(
                user,
                ticket.id,
                this.reconciliationRecord(
                    result,
                    result.status === "pending" ? "pending" : pendingStatus
                )
            );
            await ctx.reply(
                [
                    "Withdrawal is still awaiting a terminal Privy status.",
                    ...this.withdrawalTicketSummaryLines(pending ?? ticket),
                    result.providerStatus
                        ? `Provider status: ${result.providerStatus}`
                        : undefined,
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    "No transaction was resent. Check again later.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.withdrawalExecutionKeyboard(ticket.id, true)
            );
        } catch (error) {
            logger.warn("FTX/FrogX withdrawal status lookup failed", error);
            this.store.markWithdrawalExecutionPending(user, ticket.id, {
                status: "lookup_error",
                checkedAt: new Date().toISOString(),
                error: "Ribbot could not reach FTX for a read-only status check.",
            });
            await ctx.reply(
                [
                    "Withdrawal status lookup is unavailable.",
                    "The ticket remains locked and no transfer was resent.",
                ].join("\n"),
                this.withdrawalExecutionKeyboard(ticket.id, true)
            );
        }
    }

    private async replyCancelWithdrawal(
        ctx: Context,
        user: TradingUser,
        ticketId?: string
    ): Promise<void> {
        if (!ticketId) {
            await ctx.reply("Withdrawal ticket id missing.");
            return;
        }

        const existing = this.store.getWithdrawalTicket(user, ticketId);
        if (existing?.status === "execution_pending") {
            await ctx.reply(
                "This withdrawal cannot be cancelled while Privy status is unresolved. Check status instead; no transfer will be resent.",
                this.withdrawalExecutionKeyboard(ticketId, true)
            );
            return;
        }
        if (existing?.status === "executed") {
            await ctx.reply(
                "This withdrawal already executed and cannot be cancelled.",
                this.withdrawalExecutionKeyboard(ticketId, false)
            );
            return;
        }

        const ticket = this.store.cancelWithdrawalTicket(user, ticketId);
        if (!ticket) {
            await ctx.reply("Staged withdrawal not found.");
            return;
        }

        await ctx.reply(
            [
                "Staged withdrawal cancelled.",
                ...this.withdrawalTicketSummaryLines(ticket),
            ].join("\n")
        );
    }

    private async replyCancelCopyTrade(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Copy-trade config id missing.");
            return;
        }

        try {
            const result = await cancelStoredCopyTradeConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
            });

            if (result.status === "cancelled") {
                const config = this.syncStoredCopyTradeConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        "FTX/FrogX copy-trade config cancelled.",
                        ...this.copyTradeSummaryLines(config),
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_cancellable") {
                const config = result.config
                    ? this.syncStoredCopyTradeConfig(user, result.config)
                    : undefined;
                await ctx.reply(
                    [
                        "FTX/FrogX did not cancel this copy-trade config because its execution state is locked.",
                        result.error,
                        config
                            ? this.copyTradeSummaryLines(config).join("\n")
                            : undefined,
                        "Refresh Copy Trade to read the latest FTX status. Ribbot will not submit another trade from this action.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                const localConfig = this.store.cancelCopyTradeConfig(
                    user,
                    configId
                );
                if (localConfig) {
                    await ctx.reply(
                        [
                            "Local cached copy-trade config cancelled.",
                            ...this.copyTradeSummaryLines(localConfig),
                        ].join("\n")
                    );
                    return;
                }
                await ctx.reply(
                    "Staged copy-trade config not found in FTX/FrogX."
                );
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX copytrade cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not cancel this copy-trade config. Local cache was not changed."
            );
            return;
        }

        const config = this.store.cancelCopyTradeConfig(user, configId);
        if (!config) {
            await ctx.reply("Staged copy-trade config not found.");
            return;
        }

        await ctx.reply(
            [
                "Local cached copy-trade config cancelled.",
                ...this.copyTradeSummaryLines(config),
            ].join("\n")
        );
    }

    private async replyCheckCopyTradeStatus(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Copy-trade config id missing.");
            return;
        }
        const cached = this.store
            .listCopyTradeConfigs(user)
            .find((config) => config.id === configId);
        const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
        if (!walletAddress) {
            await ctx.reply(
                "Link or recover your wallet with /wallet before checking copy-trade status."
            );
            return;
        }

        try {
            const result = await fetchCopyTradeExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: walletAddress,
                configId,
            });
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX copy-trade status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
                );
                return;
            }
            if (
                result.status === "not_found" ||
                result.status === "lookup_error" ||
                result.status === "mismatch"
            ) {
                await ctx.reply(
                    [
                        `Copy-trade status: ${result.status}`,
                        result.error,
                        "FTX did not resend a trade.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (!("config" in result)) {
                await ctx.reply(
                    "FTX returned no copy-trade config. The status remains unknown and no trade was resent."
                );
                return;
            }
            const config = this.syncStoredCopyTradeConfig(user, result.config);
            const pending = result.status === "pending_reconciliation";
            await ctx.reply(
                [
                    `Copy-trade execution: ${result.status}`,
                    ...this.copyTradeSummaryLines(config),
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    pending
                        ? "The attempt remains locked. Check Status only reads Privy and never resends the copied trade."
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    pending
                        ? [
                              Markup.button.callback(
                                  "Check Again",
                                  `ribbot:check-copytrade:${configId}`
                              ),
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:copytrade"
                              ),
                          ]
                        : [
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:copytrade"
                              ),
                              Markup.button.callback("Menu", "ribbot:menu"),
                          ],
                    ...(pending
                        ? [[Markup.button.callback("Menu", "ribbot:menu")]]
                        : []),
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX copytrade status failed", error);
            await ctx.reply(
                [
                    "Copy-trade status lookup is unavailable.",
                    "The config remains locked in FTX and Ribbot did not resend a trade.",
                ].join("\n")
            );
        }
    }

    private async replyControlCopyTrade(
        ctx: Context,
        user: TradingUser,
        configId: string | undefined,
        action: "pause" | "resume"
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Copy-trade config id missing.");
            return;
        }
        try {
            const result = await controlStoredCopyTradeConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
                action,
            });
            if (result.status === "paused" || result.status === "resumed") {
                const config = this.syncStoredCopyTradeConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        `Copy trade ${result.status} through FTX/FrogX.`,
                        ...this.copyTradeSummaryLines(config),
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback(
                                result.status === "paused" ? "Resume" : "Pause",
                                `ribbot:${result.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
                            ),
                            Markup.button.callback(
                                "Copy Trade",
                                "ribbot:copytrade"
                            ),
                        ],
                    ])
                );
                return;
            }
            if (result.status === "not_controllable") {
                const config = result.config
                    ? this.syncStoredCopyTradeConfig(user, result.config)
                    : undefined;
                await ctx.reply(
                    [
                        `FTX/FrogX could not ${action} this copy trade from its current state.`,
                        result.error,
                        config
                            ? this.copyTradeSummaryLines(config).join("\n")
                            : undefined,
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX/FrogX copy-trade control is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
                );
                return;
            }
            await ctx.reply("Copy-trade config not found in FTX/FrogX.");
        } catch (error) {
            logger.warn("FTX/FrogX copytrade control failed", error);
            await ctx.reply(
                `FTX/FrogX could not ${action} this copy trade. Ribbot did not change local state.`
            );
        }
    }

    private async replyCopyTradeEditHelp(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Copy-trade config id missing.");
            return;
        }
        const config = this.store
            .listCopyTradeConfigs(user)
            .find((entry) => entry.id === configId);
        await ctx.reply(
            [
                "Edit Copy Trade",
                ...(config ? this.copyTradeSummaryLines(config) : []),
                "",
                `Use: /copytrade edit ${configId} key=value ...`,
                "Keys: tag target mode percent max minbuy minliq minmcap maxmcap sells duplicate renounced excludepump blacklist slippage buyfee sellfee",
                "Use none to clear tag, minbuy, minmcap, maxmcap, or blacklist.",
                "FTX accepts edits only while the strategy is staged or paused.",
            ].join("\n"),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Copy Trade", "ribbot:copytrade"),
                    Markup.button.callback("Menu", "ribbot:menu"),
                ],
            ])
        );
    }

    private async replyEditCopyTrade(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "copytrade" }>
    ): Promise<void> {
        if (!intent.configId) {
            await ctx.reply("Usage: /copytrade edit <config id> key=value ...");
            return;
        }
        if (intent.invalidOptions?.length) {
            await ctx.reply(
                `Invalid copy-trade edit options: ${intent.invalidOptions.join(", ")}`
            );
            return;
        }
        if (!hasCopyTradeEditPatch(intent)) {
            await this.replyCopyTradeEditHelp(ctx, user, intent.configId);
            return;
        }

        let stored: StoredCopyTradeConfig | undefined;
        try {
            const result = await fetchCopyTradeConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (result.status !== "ready") {
                await ctx.reply(
                    "FTX/FrogX copy-trade storage is unavailable. Ribbot did not edit local cache."
                );
                return;
            }
            stored = result.configs.find(
                (config) => config.configId === intent.configId
            );
        } catch (error) {
            logger.warn("FTX/FrogX copytrade edit lookup failed", error);
            await ctx.reply(
                "FTX/FrogX could not load the authoritative strategy. Ribbot did not edit local cache."
            );
            return;
        }
        if (!stored) {
            await ctx.reply("Copy-trade config not found in FTX/FrogX.");
            return;
        }

        const targetWallet = intent.targetWallet ?? stored.targetWallet;
        const buyMode = intent.buyMode ?? stored.buyMode ?? "percentage";
        const buyPercentageBps =
            intent.buyPercentage !== undefined
                ? Math.round(intent.buyPercentage * 100)
                : (stored.buyPercentageBps ?? 10_000);
        const maxBuyAmountIn =
            intent.maxBuySol !== undefined
                ? solToLamports(intent.maxBuySol)
                : stored.maxBuyAmountIn;
        const minTargetBuyAmountIn =
            intent.minTargetBuySol === null
                ? undefined
                : intent.minTargetBuySol !== undefined
                  ? solToLamports(intent.minTargetBuySol)
                  : stored.minTargetBuyAmountIn;
        const minMarketCapUsd =
            intent.minMarketCapUsd === null
                ? undefined
                : (intent.minMarketCapUsd ?? stored.minMarketCapUsd);
        const maxMarketCapUsd =
            intent.maxMarketCapUsd === null
                ? undefined
                : (intent.maxMarketCapUsd ?? stored.maxMarketCapUsd);
        const blacklistMints = intent.blacklistMints ?? [
            ...(stored.blacklistMints ?? []),
        ];
        const slippageBps = intent.slippageBps ?? stored.slippageBps;
        const priorityFeeLamports =
            intent.priorityFeeLamports ?? stored.priorityFee;
        const sellPriorityFeeLamports =
            intent.sellPriorityFeeLamports ??
            stored.sellPriorityFee ??
            stored.priorityFee;

        if (
            (intent.tag !== undefined &&
                intent.tag !== null &&
                !isCopyTradeTag(intent.tag)) ||
            !isSolanaAddress(targetWallet) ||
            targetWallet === stored.walletAddress ||
            buyPercentageBps < 1 ||
            buyPercentageBps > 10_000 ||
            !/^[1-9]\d*$/.test(maxBuyAmountIn) ||
            (minTargetBuyAmountIn !== undefined &&
                !/^[1-9]\d*$/.test(minTargetBuyAmountIn)) ||
            (intent.minLiquidityUsd !== undefined &&
                intent.minLiquidityUsd <= 0) ||
            (minMarketCapUsd !== undefined && minMarketCapUsd <= 0) ||
            (maxMarketCapUsd !== undefined && maxMarketCapUsd <= 0) ||
            (minMarketCapUsd !== undefined &&
                maxMarketCapUsd !== undefined &&
                minMarketCapUsd > maxMarketCapUsd) ||
            blacklistMints.length > 20 ||
            !blacklistMints.every(isSolanaMint) ||
            !Number.isInteger(slippageBps) ||
            slippageBps < 0 ||
            slippageBps > 10_000 ||
            !Number.isInteger(priorityFeeLamports) ||
            priorityFeeLamports < 0 ||
            !Number.isInteger(sellPriorityFeeLamports) ||
            sellPriorityFeeLamports < 0
        ) {
            await ctx.reply(
                "Copy-trade edit values are invalid. Run /copytrade and use Edit for the accepted keys."
            );
            return;
        }

        try {
            const result = await updateStoredCopyTradeConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                configId: stored.configId,
                telegramUserId: stored.telegramUserId,
                userPublicKey: stored.walletAddress,
                tag:
                    intent.tag === null
                        ? undefined
                        : (intent.tag ?? stored.tag),
                targetWallet,
                buyMode,
                buyPercentageBps,
                maxBuyAmountIn,
                amountLabel:
                    buyMode === "fixed"
                        ? `${lamportsToSol(maxBuyAmountIn)} SOL fixed`
                        : `${buyPercentageBps / 100}% up to ${lamportsToSol(maxBuyAmountIn)} SOL`,
                slippageBps,
                priorityFeeLamports,
                sellPriorityFeeLamports,
                copySells: intent.copySells ?? stored.copySells,
                duplicateBuys:
                    intent.duplicateBuys ?? stored.duplicateBuys ?? true,
                onlyRenounced:
                    intent.onlyRenounced ?? stored.onlyRenounced ?? false,
                excludePumpFunTokens:
                    intent.excludePumpFunTokens ??
                    stored.excludePumpFunTokens ??
                    false,
                minTargetBuyAmountIn,
                minLiquidityUsd:
                    intent.minLiquidityUsd ?? stored.minLiquidityUsd,
                minMarketCapUsd,
                maxMarketCapUsd,
                blacklistMints,
            });
            if (result.status === "updated") {
                const config = this.syncStoredCopyTradeConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        "Copy trade updated through FTX/FrogX.",
                        ...this.copyTradeSummaryLines(config),
                        ...(result.targetChanged
                            ? [
                                  "Target changed: FTX cleared the old monitor cursor and will establish a no-trade baseline before observing new activity.",
                              ]
                            : []),
                        ...result.warnings.map(
                            (warning) => `Warning: ${warning}`
                        ),
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback(
                                config.status === "paused" ? "Resume" : "Pause",
                                `ribbot:${config.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
                            ),
                            Markup.button.callback(
                                "Copy Trade",
                                "ribbot:copytrade"
                            ),
                        ],
                    ])
                );
                return;
            }
            if (result.status === "not_updatable") {
                if (result.config) {
                    this.syncStoredCopyTradeConfig(user, result.config);
                }
                await ctx.reply(
                    [
                        "FTX/FrogX rejected this edit because the strategy is locked.",
                        result.error,
                        "Ribbot did not change local strategy fields.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX/FrogX copy-trade updates are not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
                );
                return;
            }
            await ctx.reply("Copy-trade config not found in FTX/FrogX.");
        } catch (error) {
            logger.warn("FTX/FrogX copytrade update failed", error);
            await ctx.reply(
                "FTX/FrogX could not update this copy trade. Ribbot did not change local strategy fields."
            );
        }
    }

    private async replyDuplicateCopyTrade(
        ctx: Context,
        user: TradingUser,
        configId?: string,
        tag?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply(
                "Usage: /copytrade duplicate <config id> [tag=name]"
            );
            return;
        }
        if (tag && !isCopyTradeTag(tag)) {
            await ctx.reply("Copy-trade tag must be 1 to 32 safe characters.");
            return;
        }
        try {
            const result = await duplicateStoredCopyTradeConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
                tag,
            });
            if (result.status === "duplicated") {
                const config = this.syncStoredCopyTradeConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        `Copy trade duplicated through FTX/FrogX from ${result.sourceConfigId}.`,
                        ...this.copyTradeSummaryLines(config),
                        "The new strategy is staged with a fresh no-trade monitor baseline.",
                    ].join("\n"),
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback(
                                "Edit",
                                `ribbot:edit-copytrade:${config.id}`
                            ),
                            Markup.button.callback(
                                "Copy Trade",
                                "ribbot:copytrade"
                            ),
                        ],
                    ])
                );
                return;
            }
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX/FrogX copy-trade duplication is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}.`
                );
                return;
            }
            if (result.config) {
                this.syncStoredCopyTradeConfig(user, result.config);
            }
            await ctx.reply(
                [
                    "FTX/FrogX could not duplicate this copy trade.",
                    result.error,
                    "Ribbot did not create a local-only strategy.",
                ]
                    .filter(Boolean)
                    .join("\n")
            );
        } catch (error) {
            logger.warn("FTX/FrogX copytrade duplicate failed", error);
            await ctx.reply(
                "FTX/FrogX could not duplicate this copy trade. Ribbot did not create a local-only strategy."
            );
        }
    }

    private async replyCancelSniper(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Sniper config id missing.");
            return;
        }

        try {
            const result = await cancelStoredSniperConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
            });

            if (result.status === "cancelled") {
                const config = this.syncStoredSniperConfig(user, result.config);
                await ctx.reply(
                    [
                        "FTX/FrogX sniper config cancelled.",
                        ...this.sniperSummaryLines(config),
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_cancellable") {
                const config = result.config
                    ? this.syncStoredSniperConfig(user, result.config)
                    : undefined;
                await ctx.reply(
                    [
                        "FTX/FrogX did not cancel this sniper config because its execution state is locked.",
                        result.error,
                        config
                            ? this.sniperSummaryLines(config).join("\n")
                            : undefined,
                        "Refresh Sniper to read the latest FTX status.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                const localConfig = this.store.cancelSniperConfig(
                    user,
                    configId
                );
                if (localConfig) {
                    await ctx.reply(
                        [
                            "Local cached sniper config cancelled.",
                            ...this.sniperSummaryLines(localConfig),
                        ].join("\n")
                    );
                    return;
                }
                await ctx.reply("Staged sniper config not found in FTX/FrogX.");
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX sniper cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not cancel this sniper config. Local cache was not changed."
            );
            return;
        }

        const config = this.store.cancelSniperConfig(user, configId);
        if (!config) {
            await ctx.reply("Staged sniper config not found.");
            return;
        }

        await ctx.reply(
            [
                "Local cached sniper config cancelled.",
                ...this.sniperSummaryLines(config),
            ].join("\n")
        );
    }

    private async replyCheckSniperStatus(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Sniper config id missing.");
            return;
        }
        const cached = this.store
            .listSniperConfigs(user)
            .find((config) => config.id === configId);
        const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
        if (!walletAddress) {
            await ctx.reply(
                "Link or recover your wallet with /wallet before checking sniper status."
            );
            return;
        }

        try {
            const result = await fetchSniperExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: walletAddress,
                configId,
            });
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX sniper status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
                );
                return;
            }
            if (
                result.status === "not_found" ||
                result.status === "lookup_error" ||
                result.status === "mismatch"
            ) {
                await ctx.reply(
                    [
                        `Sniper status: ${result.status}`,
                        result.error,
                        "FTX did not resend a trade.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }
            if (!("config" in result)) {
                await ctx.reply(
                    "FTX returned no sniper config. The status remains unknown and no trade was resent."
                );
                return;
            }

            const config = this.syncStoredSniperConfig(user, result.config);
            const pending = result.status === "pending_reconciliation";
            await ctx.reply(
                [
                    `Sniper execution: ${result.status}`,
                    ...this.sniperSummaryLines(config),
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    pending
                        ? "The attempt remains locked. Check Status only reads Privy and never submits another snipe."
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    pending
                        ? [
                              Markup.button.callback(
                                  "Check Again",
                                  `ribbot:check-sniper:${configId}`
                              ),
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:sniper"
                              ),
                          ]
                        : [
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:sniper"
                              ),
                              Markup.button.callback("Menu", "ribbot:menu"),
                          ],
                    ...(pending
                        ? [[Markup.button.callback("Menu", "ribbot:menu")]]
                        : []),
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX sniper status failed", error);
            await ctx.reply(
                [
                    "Sniper status lookup is unavailable.",
                    "The config remains locked in FTX and Ribbot did not submit another snipe.",
                ].join("\n")
            );
        }
    }

    private async replyCancelAutoBuy(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Auto-buy rule id missing.");
            return;
        }

        try {
            const result = await cancelStoredAutoBuyConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
            });

            if (result.status === "cancelled") {
                const config = this.syncStoredAutoBuyConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        "FTX/FrogX auto-buy rule cancelled.",
                        ...this.autoBuySummaryLines(config),
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_cancellable") {
                const config = result.config
                    ? this.syncStoredAutoBuyConfig(user, result.config)
                    : undefined;
                await ctx.reply(
                    [
                        "FTX/FrogX did not cancel this auto-buy rule because its execution state is locked.",
                        result.error,
                        config
                            ? this.autoBuySummaryLines(config).join("\n")
                            : undefined,
                        "Refresh Auto Buy to read the latest FTX status. Ribbot will not submit another buy from this action.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                const localConfig = this.store.cancelAutoBuyConfig(
                    user,
                    configId
                );
                if (localConfig) {
                    await ctx.reply(
                        [
                            "Local cached auto-buy rule cancelled.",
                            ...this.autoBuySummaryLines(localConfig),
                        ].join("\n")
                    );
                    return;
                }
                await ctx.reply("Staged auto-buy rule not found in FTX/FrogX.");
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX auto-buy cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not cancel this auto-buy rule. Local cache was not changed."
            );
            return;
        }

        const config = this.store.cancelAutoBuyConfig(user, configId);
        if (!config) {
            await ctx.reply("Staged auto-buy rule not found.");
            return;
        }

        await ctx.reply(
            [
                "Local cached auto-buy rule cancelled.",
                ...this.autoBuySummaryLines(config),
            ].join("\n")
        );
    }

    private async replyCheckAutoBuyStatus(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Auto-buy rule id missing.");
            return;
        }
        const cached = this.store
            .listAutoBuyConfigs(user)
            .find((config) => config.id === configId);
        const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
        if (!walletAddress) {
            await ctx.reply(
                "Link or recover your wallet with /wallet before checking auto-buy status."
            );
            return;
        }

        try {
            const result = await fetchAutoBuyExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: walletAddress,
                configId,
            });
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX auto-buy status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
                );
                return;
            }
            if (
                result.status === "not_found" ||
                result.status === "lookup_error" ||
                result.status === "mismatch"
            ) {
                await ctx.reply(
                    [
                        `Auto-buy status: ${result.status}`,
                        result.error,
                        "FTX did not resend a buy.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (!("config" in result)) {
                await ctx.reply(
                    "FTX returned no auto-buy config. The status remains unknown and no buy was resent."
                );
                return;
            }
            const config = this.syncStoredAutoBuyConfig(user, result.config);
            const pending = result.status === "pending_reconciliation";
            await ctx.reply(
                [
                    `Auto-buy execution: ${result.status}`,
                    ...this.autoBuySummaryLines(config),
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    pending
                        ? "The rule remains locked. Check Status only reads Privy and never submits another buy."
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    pending
                        ? [
                              Markup.button.callback(
                                  "Check Again",
                                  `ribbot:check-autobuy:${configId}`
                              ),
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:autobuy"
                              ),
                          ]
                        : [
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:autobuy"
                              ),
                              Markup.button.callback("Menu", "ribbot:menu"),
                          ],
                    ...(pending
                        ? [[Markup.button.callback("Menu", "ribbot:menu")]]
                        : []),
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX auto-buy status failed", error);
            await ctx.reply(
                [
                    "Auto-buy status lookup is unavailable.",
                    "The rule remains locked in FTX and Ribbot did not submit another buy.",
                ].join("\n")
            );
        }
    }

    private async replyCancelBundleBuy(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Bundle-buy basket id missing.");
            return;
        }

        try {
            const result = await cancelStoredBundleBuyConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
            });

            if (result.status === "cancelled") {
                const config = this.syncStoredBundleBuyConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        "FTX/FrogX bundle-buy basket cancelled.",
                        ...this.bundleBuySummaryLines(config),
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                const localConfig = this.store.cancelBundleBuyConfig(
                    user,
                    configId
                );
                if (localConfig) {
                    await ctx.reply(
                        [
                            "Local cached bundle-buy basket cancelled.",
                            ...this.bundleBuySummaryLines(localConfig),
                        ].join("\n")
                    );
                    return;
                }
                await ctx.reply(
                    "Staged bundle-buy basket not found in FTX/FrogX."
                );
                return;
            }
            if (result.status === "not_cancellable") {
                await this.replyCheckBundleBuyStatus(ctx, user, configId);
                return;
            }
            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX bundle-buy storage is not configured, so the basket was not cancelled.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX bundle-buy cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not cancel this bundle-buy basket. Local cache was not changed."
            );
            return;
        }

        const config = this.store.cancelBundleBuyConfig(user, configId);
        if (!config) {
            await ctx.reply("Staged bundle-buy basket not found.");
            return;
        }

        await ctx.reply(
            [
                "Local cached bundle-buy basket cancelled.",
                ...this.bundleBuySummaryLines(config),
            ].join("\n")
        );
    }

    private async replyExecuteBundleBuy(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Bundle-buy basket id missing.");
            return;
        }
        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before executing a basket buy."
            );
            return;
        }

        const cached = this.store
            .listBundleBuyConfigs(user)
            .find((config) => config.id === configId);
        if (cached?.status === "executing") {
            await this.replyCheckBundleBuyStatus(ctx, user, configId);
            return;
        }
        if (cached?.status === "executed") {
            await ctx.reply(
                "This bundle-buy basket already executed.",
                this.bundleExecutionKeyboard(configId, false)
            );
            return;
        }
        if (cached?.status === "failed") {
            await ctx.reply(
                [
                    "This bundle-buy basket ended in failure and cannot be restarted.",
                    cached.execution?.error,
                    "Create a fresh basket for any remaining items.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.bundleExecutionKeyboard(configId, false)
            );
            return;
        }

        try {
            const result = await executeStoredBundleBuyConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                configId,
            });

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX bundle-buy execution is not configured yet.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                await ctx.reply("Bundle-buy basket not found in FTX/FrogX.");
                return;
            }

            if (result.status === "not_executable") {
                const partialLines = (result.executions ?? [])
                    .slice(0, 5)
                    .map((item, index) =>
                        this.bundleBuyExecutionLine(item, index)
                    );
                if (cached && result.configStatus === "failed") {
                    this.store.updateBundleBuyExecution(
                        user,
                        configId,
                        "failed",
                        this.bundleExecutionRecord(result, cached.items.length)
                    );
                }
                await ctx.reply(
                    [
                        "FTX/FrogX did not execute this bundle-buy basket.",
                        result.error ? `Error: ${result.error}` : undefined,
                        partialLines.length ? "" : undefined,
                        ...partialLines,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.bundleExecutionKeyboard(configId, false)
                );
                return;
            }

            if (result.status === "pending_reconciliation") {
                if (cached) {
                    this.store.updateBundleBuyExecution(
                        user,
                        configId,
                        "executing",
                        this.bundleExecutionRecord(result, cached.items.length)
                    );
                }
                await ctx.reply(
                    [
                        "Bundle-buy execution is awaiting Privy reconciliation.",
                        `Basket: ${result.configId}`,
                        `Progress: ${result.confirmedItems}/${result.totalItems} confirmed (${result.attemptedItems} attempted)`,
                        result.error,
                        ...this.manualReviewSummaryLines(result),
                        this.manualReviewRecoveryLine(result),
                        "FTX stopped the sequence. Check Status never resends an item; interrupted partial baskets will not auto-resume.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.bundleExecutionKeyboard(configId, true)
                );
                return;
            }

            if (cached) {
                this.store.updateBundleBuyExecution(
                    user,
                    configId,
                    "executed",
                    this.bundleExecutionRecord(result, cached.items.length)
                );
            }

            await ctx.reply(
                [
                    "Bundle-buy basket executed through FTX/FrogX.",
                    `Basket: ${result.configId}`,
                    `Items: ${result.itemCount}`,
                    `Max total: ${lamportsToSol(result.totalAmountIn).toFixed(4)} SOL`,
                    "",
                    ...result.executions
                        .slice(0, 8)
                        .map((item, index) =>
                            this.bundleBuyExecutionLine(item, index)
                        ),
                ].join("\n"),
                Markup.inlineKeyboard([
                    [Markup.button.callback("Activity", "ribbot:activity")],
                    [Markup.button.callback("Menu", "ribbot:menu")],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX bundle-buy execution failed", error);
            if (cached) {
                this.store.updateBundleBuyExecution(
                    user,
                    configId,
                    "executing",
                    {
                        attemptedItems: cached.execution?.attemptedItems ?? 0,
                        confirmedItems: cached.execution?.confirmedItems ?? 0,
                        totalItems: cached.items.length,
                        checkedAt: new Date().toISOString(),
                        error: "Ribbot lost contact with FTX after requesting bundle execution.",
                        executions: cached.execution?.executions ?? [],
                    }
                );
            }
            await ctx.reply(
                [
                    "Bundle-buy status is unknown because Ribbot lost contact with FTX.",
                    "Do not execute this basket again. Check Status; FTX will inspect persisted progress and Privy references without resending.",
                ].join("\n"),
                this.bundleExecutionKeyboard(configId, true)
            );
        }
    }

    private async replyCheckBundleBuyStatus(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply(
                "Bundle-buy basket id missing.",
                this.menuKeyboard()
            );
            return;
        }
        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or recover your wallet with /wallet before checking bundle status.",
                this.menuKeyboard()
            );
            return;
        }
        const cached = this.store
            .listBundleBuyConfigs(user)
            .find((config) => config.id === configId);

        try {
            const result = await fetchStoredBundleBuyExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                configId,
            });
            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX bundle status lookup is not configured.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "The basket remains locked because its execution state is not proven.",
                    ].join("\n"),
                    this.bundleExecutionKeyboard(configId, true)
                );
                return;
            }

            if (result.status === "not_started") {
                if (cached) {
                    const restored = { ...cached, status: "staged" as const };
                    delete restored.execution;
                    this.store.upsertBundleBuyConfig(user, restored);
                }
                await ctx.reply(
                    [
                        "FTX confirms this bundle-buy execution never started.",
                        result.error,
                        "The staged basket may be reviewed and executed again explicitly.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.bundleExecutionKeyboard(configId, false)
                );
                return;
            }

            if (result.status === "executed") {
                if (cached) {
                    this.store.updateBundleBuyExecution(
                        user,
                        configId,
                        "executed",
                        this.bundleExecutionRecord(result, cached.items.length)
                    );
                }
                await ctx.reply(
                    [
                        "FTX confirmed the bundle-buy basket executed.",
                        `Basket: ${result.configId}`,
                        `Items: ${result.itemCount}`,
                        ...result.executions
                            .slice(0, 8)
                            .map((item, index) =>
                                this.bundleBuyExecutionLine(item, index)
                            ),
                    ].join("\n"),
                    this.bundleExecutionKeyboard(configId, false)
                );
                return;
            }

            if (result.status === "failed") {
                if (cached) {
                    this.store.updateBundleBuyExecution(
                        user,
                        configId,
                        "failed",
                        this.bundleExecutionRecord(result, cached.items.length)
                    );
                }
                await ctx.reply(
                    [
                        "FTX confirmed the bundle sequence stopped.",
                        `Progress: ${result.confirmedItems ?? 0}/${result.totalItems ?? cached?.items.length ?? 0} confirmed`,
                        result.error,
                        "No item was resent and FTX will not auto-resume. Create a fresh basket only for any remaining items.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.bundleExecutionKeyboard(configId, false)
                );
                return;
            }

            if (result.status === "pending_reconciliation") {
                if (cached) {
                    this.store.updateBundleBuyExecution(
                        user,
                        configId,
                        "executing",
                        this.bundleExecutionRecord(result, cached.items.length)
                    );
                }
                await ctx.reply(
                    [
                        "Bundle-buy reconciliation is still pending.",
                        `Progress: ${result.confirmedItems ?? 0}/${result.totalItems ?? cached?.items.length ?? 0} confirmed (${result.attemptedItems ?? 0} attempted)`,
                        result.error,
                        ...this.manualReviewSummaryLines(result),
                        this.manualReviewRecoveryLine(result),
                        "No item was resent. Check again later.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.bundleExecutionKeyboard(configId, true)
                );
                return;
            }

            await ctx.reply(
                [
                    "FTX could not prove the bundle-buy execution state.",
                    result.error,
                    "The basket remains locked and no item was resent.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.bundleExecutionKeyboard(configId, true)
            );
        } catch (error) {
            logger.warn("FTX/FrogX bundle-buy status lookup failed", error);
            await ctx.reply(
                [
                    "Bundle-buy status lookup is unavailable.",
                    "The basket remains locked and no item was resent.",
                ].join("\n"),
                this.bundleExecutionKeyboard(configId, true)
            );
        }
    }

    private async replyCancelAutoSell(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Auto-sell rule id missing.");
            return;
        }

        try {
            const result = await cancelStoredAutoSellConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                configId,
            });

            if (result.status === "cancelled") {
                const config = this.syncStoredAutoSellConfig(
                    user,
                    result.config
                );
                await ctx.reply(
                    [
                        "FTX/FrogX auto-sell rule cancelled.",
                        ...this.autoSellSummaryLines(config),
                    ].join("\n")
                );
                return;
            }

            if (result.status === "not_cancellable") {
                const config = result.config
                    ? this.syncStoredAutoSellConfig(user, result.config)
                    : undefined;
                await ctx.reply(
                    [
                        "FTX/FrogX did not cancel this auto-sell rule because its execution state is locked.",
                        result.error,
                        config
                            ? this.autoSellSummaryLines(config).join("\n")
                            : undefined,
                        "Refresh Auto Sell to read the latest FTX status. Ribbot will not submit another sell from this action.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (result.status === "not_found") {
                const localConfig = this.store.cancelAutoSellConfig(
                    user,
                    configId
                );
                if (localConfig) {
                    await ctx.reply(
                        [
                            "Local cached auto-sell rule cancelled.",
                            ...this.autoSellSummaryLines(localConfig),
                        ].join("\n")
                    );
                    return;
                }
                await ctx.reply(
                    "Staged auto-sell rule not found in FTX/FrogX."
                );
                return;
            }
        } catch (error) {
            logger.warn("FTX/FrogX auto-sell cancel failed", error);
            await ctx.reply(
                "FTX/FrogX could not cancel this auto-sell rule. Local cache was not changed."
            );
            return;
        }

        const config = this.store.cancelAutoSellConfig(user, configId);
        if (!config) {
            await ctx.reply("Staged auto-sell rule not found.");
            return;
        }

        await ctx.reply(
            [
                "Local cached auto-sell rule cancelled.",
                ...this.autoSellSummaryLines(config),
            ].join("\n")
        );
    }

    private async replyCheckAutoSellStatus(
        ctx: Context,
        user: TradingUser,
        configId?: string
    ): Promise<void> {
        if (!configId) {
            await ctx.reply("Auto-sell rule id missing.");
            return;
        }
        const cached = this.store
            .listAutoSellConfigs(user)
            .find((config) => config.id === configId);
        const walletAddress = user.solanaWalletAddress ?? cached?.walletAddress;
        if (!walletAddress) {
            await ctx.reply(
                "Link or recover your wallet with /wallet before checking auto-sell status."
            );
            return;
        }

        try {
            const result = await fetchAutoSellExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: walletAddress,
                configId,
            });
            if (result.status === "not_configured") {
                await ctx.reply(
                    `FTX auto-sell status lookup is not configured. Missing: ${(result.required ?? []).join(", ") || "unknown"}`
                );
                return;
            }
            if (
                result.status === "not_found" ||
                result.status === "lookup_error" ||
                result.status === "mismatch"
            ) {
                await ctx.reply(
                    [
                        `Auto-sell status: ${result.status}`,
                        result.error,
                        "FTX did not resend a sell.",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
                return;
            }

            if (!("config" in result)) {
                await ctx.reply(
                    "FTX returned no auto-sell config. The status remains unknown and no sell was resent."
                );
                return;
            }
            const config = this.syncStoredAutoSellConfig(user, result.config);
            const pending = result.status === "pending_reconciliation";
            await ctx.reply(
                [
                    `Auto-sell execution: ${result.status}`,
                    ...this.autoSellSummaryLines(config),
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    pending
                        ? "The rule remains locked. Check Status only reads Privy and never submits another sell."
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                Markup.inlineKeyboard([
                    pending
                        ? [
                              Markup.button.callback(
                                  "Check Again",
                                  `ribbot:check-autosell:${configId}`
                              ),
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:autosell"
                              ),
                          ]
                        : [
                              Markup.button.callback(
                                  "Refresh",
                                  "ribbot:autosell"
                              ),
                              Markup.button.callback("Menu", "ribbot:menu"),
                          ],
                    ...(pending
                        ? [[Markup.button.callback("Menu", "ribbot:menu")]]
                        : []),
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX auto-sell status failed", error);
            await ctx.reply(
                [
                    "Auto-sell status lookup is unavailable.",
                    "The rule remains locked in FTX and Ribbot did not submit another sell.",
                ].join("\n")
            );
        }
    }

    private async applySettingsPreference(
        ctx: Context,
        user: TradingUser,
        update: Partial<TradingUser["settings"]>
    ): Promise<void> {
        try {
            const validation = await validatePreferences({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                kind: "settings",
                action: "set",
                slippageBps: update.slippageBps,
                priorityFeeLamports:
                    update.priorityFeeLamports ??
                    user.settings.priorityFeeLamports,
                sellPriorityFeeLamports: update.sellPriorityFeeLamports,
                defaultBuyAmountIn:
                    update.defaultBuySol !== undefined
                        ? solToLamports(update.defaultBuySol)
                        : undefined,
                buyPresetAmountsIn: update.buyPresetsSol?.map(solToLamports),
                sellPresetBps: update.sellPresetsPercent?.map((percent) =>
                    Math.round(percent * 100)
                ),
                botMode: update.botMode,
                confirmTrades: update.confirmTrades,
                sellProtection: update.sellProtection,
                autoBuyEnabled: update.autoBuyEnabled,
                instantAutoBuyEnabled: update.instantAutoBuyEnabled,
                instantAutoBuyAmountIn:
                    update.instantAutoBuyAmountSol !== undefined
                        ? solToLamports(update.instantAutoBuyAmountSol)
                        : undefined,
                instantAutoBuyMinLiquidityUsd:
                    update.instantAutoBuyMinLiquidityUsd,
                instantAutoBuyMaxMarketCapUsd:
                    update.instantAutoBuyMaxMarketCapUsd,
                autoSellEnabled: update.autoSellEnabled,
                sniperEnabled: update.sniperEnabled,
                mevProtection: update.mevProtection,
            });

            if (validation.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX preference validation is not configured for Ribbot yet.",
                        `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not update settings.",
                    ].join("\n")
                );
                return;
            }

            const updated = validation.account
                ? this.store.syncAccountSnapshot(user, validation.account)
                : this.applyNormalizedSettings(
                      user,
                      validation.normalized.settings
                  );
            if (!updated) {
                await ctx.reply("FTX/FrogX did not return settings to apply.");
                return;
            }

            await ctx.reply(
                [
                    "Settings updated through FTX/FrogX validation.",
                    `Interface: ${updated.settings.botMode}`,
                    `Confirm trades: ${updated.settings.confirmTrades ? "on" : "off"}`,
                    `Sell protection: ${updated.settings.sellProtection ? "on" : "off"}`,
                    `Default buy: ${updated.settings.defaultBuySol} SOL`,
                    `Buy presets: ${updated.settings.buyPresetsSol.join(", ")} SOL`,
                    `Sell presets: ${updated.settings.sellPresetsPercent.join(", ")}%`,
                    `Slippage: ${updated.settings.slippageBps / 100}%`,
                    `Priority fee: ${updated.settings.priorityFeeLamports} lamports`,
                    `Sell priority fee: ${updated.settings.sellPriorityFeeLamports} lamports`,
                    `MEV protection: ${updated.settings.mevProtection ? "on" : "off"}`,
                    `Auto buy: ${updated.settings.autoBuyEnabled ? "on" : "off"}`,
                    `Instant CA buy: ${updated.settings.instantAutoBuyEnabled ? `${updated.settings.instantAutoBuyAmountSol} SOL` : "off"}`,
                    `Auto sell: ${updated.settings.autoSellEnabled ? "on" : "off"}`,
                    `Sniper: ${updated.settings.sniperEnabled ? "on" : "off"}`,
                    "",
                    ...validation.warnings.map(
                        (warning) => `Warning: ${warning}`
                    ),
                ].join("\n")
            );
        } catch (error) {
            logger.warn("FTX/FrogX preference validation failed", error);
            await ctx.reply(
                "FTX/FrogX could not validate this settings change. Ribbot did not update settings."
            );
        }
    }

    private async applyTokenPreference(
        ctx: Context,
        user: TradingUser,
        input: {
            kind: "watchlist" | "hiddenToken";
            action: "add" | "remove";
            mint: string;
        }
    ): Promise<void> {
        try {
            const validation = await validatePreferences({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                kind: input.kind,
                action: input.action,
                mint: input.mint,
                priorityFeeLamports: user.settings.priorityFeeLamports,
            });

            if (validation.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX preference validation is not configured for Ribbot yet.",
                        `Missing: ${(validation.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not update token preferences.",
                    ].join("\n")
                );
                return;
            }

            const updated = validation.account
                ? this.store.syncAccountSnapshot(user, validation.account)
                : this.applyLocalTokenPreference(user, input);

            const label =
                input.kind === "watchlist" ? "watchlist" : "hidden tokens";
            await ctx.reply(
                [
                    `${label} updated through FTX/FrogX validation.`,
                    `Token: ${shortAddress(input.mint)}`,
                    `Action: ${input.action}`,
                    "",
                    input.kind === "watchlist"
                        ? this.watchlistText(updated)
                        : this.hiddenTokensText(updated),
                    "",
                    ...validation.warnings.map(
                        (warning) => `Warning: ${warning}`
                    ),
                ].join("\n")
            );
        } catch (error) {
            logger.warn("FTX/FrogX token preference validation failed", error);
            await ctx.reply(
                "FTX/FrogX could not validate this token preference change. Ribbot did not update local state."
            );
        }
    }

    private applyNormalizedSettings(
        user: TradingUser,
        normalized:
            | {
                  slippageBps?: number;
                  priorityFee: number;
                  sellPriorityFee?: number;
                  defaultBuyAmountIn?: string;
                  buyPresetAmountsIn?: string[];
                  sellPresetBps?: number[];
                  botMode?: "simple" | "advanced";
                  confirmTrades?: boolean;
                  sellProtection?: boolean;
                  autoBuyEnabled?: boolean;
                  instantAutoBuyEnabled?: boolean;
                  instantAutoBuyAmountIn?: string;
                  instantAutoBuyMinLiquidityUsd?: number;
                  instantAutoBuyMaxMarketCapUsd?: number;
                  autoSellEnabled?: boolean;
                  sniperEnabled?: boolean;
                  mevProtection?: boolean;
              }
            | undefined
    ): TradingUser | undefined {
        if (!normalized) return undefined;
        return this.store.updateSettings(user, {
            slippageBps: normalized.slippageBps,
            priorityFeeLamports: normalized.priorityFee,
            sellPriorityFeeLamports: normalized.sellPriorityFee,
            defaultBuySol: normalized.defaultBuyAmountIn
                ? lamportsToSol(normalized.defaultBuyAmountIn)
                : undefined,
            buyPresetsSol: normalized.buyPresetAmountsIn?.map(lamportsToSol),
            sellPresetsPercent: normalized.sellPresetBps?.map(
                (bps) => bps / 100
            ),
            botMode: normalized.botMode,
            confirmTrades: normalized.confirmTrades,
            sellProtection: normalized.sellProtection,
            autoBuyEnabled: normalized.autoBuyEnabled,
            instantAutoBuyEnabled: normalized.instantAutoBuyEnabled,
            instantAutoBuyAmountSol: normalized.instantAutoBuyAmountIn
                ? lamportsToSol(normalized.instantAutoBuyAmountIn)
                : undefined,
            instantAutoBuyMinLiquidityUsd:
                normalized.instantAutoBuyMinLiquidityUsd,
            instantAutoBuyMaxMarketCapUsd:
                normalized.instantAutoBuyMaxMarketCapUsd,
            autoSellEnabled: normalized.autoSellEnabled,
            sniperEnabled: normalized.sniperEnabled,
            mevProtection: normalized.mevProtection,
        });
    }

    private applyLocalTokenPreference(
        user: TradingUser,
        input: {
            kind: "watchlist" | "hiddenToken";
            action: "add" | "remove";
            mint: string;
        }
    ): TradingUser {
        if (input.kind === "watchlist" && input.action === "add") {
            return this.store.addToWatchlist(user, input.mint);
        }
        if (input.kind === "watchlist") {
            return this.store.removeFromWatchlist(user, input.mint);
        }
        if (input.action === "add") {
            return this.store.addHiddenToken(user, input.mint);
        }
        return this.store.removeHiddenToken(user, input.mint);
    }

    private async refreshAccountSnapshot(
        user: TradingUser
    ): Promise<TradingUser> {
        if (!this.config.ftxApiToken) return user;

        try {
            const result = await fetchTradingAccount({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (result.status === "ready") {
                return this.store.syncAccountSnapshot(user, result.account);
            }
        } catch (error) {
            logger.warn("FTX/FrogX account sync failed", error);
        }

        return user;
    }

    private async replyWatchlist(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "watchlist" }>
    ): Promise<void> {
        if (intent?.action && intent.action !== "list") {
            if (!intent.mint || !isSolanaMint(intent.mint)) {
                await ctx.reply(
                    "Usage: /watch <mint>, /watchlist add <mint>, or /watchlist remove <mint>"
                );
                return;
            }
            await this.applyTokenPreference(ctx, user, {
                kind: "watchlist",
                action: intent.action,
                mint: intent.mint,
            });
            return;
        }

        const syncedUser = await this.refreshAccountSnapshot(user);
        await ctx.reply(this.watchlistText(syncedUser));
    }

    private async replyHiddenTokens(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "hidden" }>
    ): Promise<void> {
        if (intent?.action && intent.action !== "list") {
            if (!intent.mint || !isSolanaMint(intent.mint)) {
                await ctx.reply("Usage: /hide <mint> or /unhide <mint>");
                return;
            }
            await this.applyTokenPreference(ctx, user, {
                kind: "hiddenToken",
                action: intent.action,
                mint: intent.mint,
            });
            return;
        }

        const syncedUser = await this.refreshAccountSnapshot(user);
        const unhideButtons = syncedUser.hiddenTokens
            .slice(0, 8)
            .map((mint) => [
                Markup.button.callback(
                    `Unhide ${shortAddress(mint)}`,
                    positionVisibilityCallbackData(mint, 0, "show")
                ),
            ]);
        await ctx.reply(
            this.hiddenTokensText(syncedUser),
            Markup.inlineKeyboard([
                ...unhideButtons,
                [
                    Markup.button.callback("Positions", "ribbot:positions:0"),
                    Markup.button.callback("Menu", "ribbot:menu"),
                ],
            ])
        );
    }

    private async replyCopyTrade(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "copytrade" }>
    ): Promise<void> {
        if (intent?.action === "add") {
            await this.replyAddCopyTrade(ctx, user, intent);
            return;
        }
        if (intent?.action === "pause" || intent?.action === "resume") {
            await this.replyControlCopyTrade(
                ctx,
                user,
                intent.configId,
                intent.action
            );
            return;
        }
        if (intent?.action === "edit") {
            await this.replyEditCopyTrade(ctx, user, intent);
            return;
        }
        if (intent?.action === "duplicate") {
            if (intent.invalidOptions?.length) {
                await ctx.reply(
                    `Invalid copy-trade duplicate options: ${intent.invalidOptions.join(", ")}`
                );
                return;
            }
            await this.replyDuplicateCopyTrade(
                ctx,
                user,
                intent.configId,
                intent.tag ?? undefined
            );
            return;
        }

        let configs = this.store
            .listCopyTradeConfigs(user)
            .filter((config) => config.status !== "cancelled");
        let ftxListUnavailable = false;
        try {
            const stored = await fetchCopyTradeConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                configs = stored.configs
                    .map((config) =>
                        this.syncStoredCopyTradeConfig(user, config)
                    )
                    .filter((config) => config.status !== "cancelled");
            } else {
                ftxListUnavailable = true;
            }
        } catch (error) {
            ftxListUnavailable = true;
            logger.warn("FTX/FrogX copytrade list failed", error);
        }

        if (configs.length === 0) {
            await ctx.reply(
                [
                    "Copy Trade",
                    "No active copy-trade configs.",
                    "",
                    "Usage:",
                    "/copytrade add <wallet> fixed <SOL> <min liquidity USD> [options]",
                    "/copytrade add <wallet> percent <%> <max SOL> <min liquidity USD> [options]",
                    "/copytrade pause|resume <config id>",
                    "/copytrade edit <config id> key=value ...",
                    "/copytrade duplicate <config id> [tag=name]",
                    "",
                    "Options: tag=name copy-sells duplicate=on|off renounced=on|off excludepump=on|off minbuy=SOL minmcap=USD maxmcap=USD blacklist=mint,mint",
                    "FTX/FrogX stores and enforces sizing, fees, and filters before any copied execution.",
                    ftxListUnavailable
                        ? "FTX/FrogX storage is unavailable, so only local cached configs can be shown."
                        : "",
                ].join("\n")
            );
            return;
        }

        const lines = [
            "Copy Trade configs",
            ...configs
                .slice(0, 10)
                .flatMap((config, index) => [
                    "",
                    `${index + 1}. ${config.tag ?? shortAddress(config.targetWallet)}`,
                    ...this.copyTradeSummaryLines(config),
                ]),
            configs.length > 10 ? `\n...and ${configs.length - 10} more` : "",
            ftxListUnavailable
                ? "\nFTX/FrogX storage is unavailable; showing local cache."
                : "",
        ].filter(Boolean);

        const buttons = configs.slice(0, 5).flatMap((config) => {
            if (config.status === "executing") {
                return [
                    [
                        Markup.button.callback(
                            "Check",
                            `ribbot:check-copytrade:${config.id}`
                        ),
                        Markup.button.callback(
                            "Duplicate",
                            `ribbot:duplicate-copytrade:${config.id}`
                        ),
                    ],
                ];
            }
            if (config.status === "staged" || config.status === "paused") {
                return [
                    [
                        Markup.button.callback(
                            config.status === "paused" ? "Resume" : "Pause",
                            `ribbot:${config.status === "paused" ? "resume" : "pause"}-copytrade:${config.id}`
                        ),
                        Markup.button.callback(
                            "Edit",
                            `ribbot:edit-copytrade:${config.id}`
                        ),
                    ],
                    [
                        Markup.button.callback(
                            "Duplicate",
                            `ribbot:duplicate-copytrade:${config.id}`
                        ),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-copytrade:${config.id}`
                        ),
                    ],
                ];
            }
            if (config.status === "failed") {
                return [
                    [
                        Markup.button.callback(
                            "Duplicate",
                            `ribbot:duplicate-copytrade:${config.id}`
                        ),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-copytrade:${config.id}`
                        ),
                    ],
                ];
            }
            if (config.status === "executed") {
                return [
                    [
                        Markup.button.callback(
                            "Duplicate",
                            `ribbot:duplicate-copytrade:${config.id}`
                        ),
                    ],
                ];
            }
            return [];
        });
        buttons.push([
            Markup.button.callback("Refresh", "ribbot:copytrade"),
            Markup.button.callback("Menu", "ribbot:menu"),
        ]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyAddCopyTrade(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "copytrade" }>
    ): Promise<void> {
        if (
            (typeof intent.tag === "string" && !isCopyTradeTag(intent.tag)) ||
            !intent.targetWallet ||
            !isSolanaAddress(intent.targetWallet) ||
            !intent.buyMode ||
            (intent.buyMode === "percentage" &&
                (!intent.buyPercentage ||
                    intent.buyPercentage <= 0 ||
                    intent.buyPercentage > 100)) ||
            !intent.maxBuySol ||
            intent.maxBuySol <= 0 ||
            !intent.minLiquidityUsd ||
            intent.minLiquidityUsd <= 0 ||
            (intent.minMarketCapUsd != null &&
                intent.maxMarketCapUsd != null &&
                intent.minMarketCapUsd > intent.maxMarketCapUsd) ||
            (intent.blacklistMints?.length ?? 0) > 20 ||
            !(intent.blacklistMints ?? []).every(isSolanaMint)
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/copytrade add <wallet> fixed <SOL> <min liquidity USD> [options]",
                    "/copytrade add <wallet> percent <%> <max SOL> <min liquidity USD> [options]",
                    "Options: tag=name copy-sells duplicate=on|off renounced=on|off excludepump=on|off minbuy=SOL minmcap=USD maxmcap=USD blacklist=mint,mint",
                ].join("\n")
            );
            return;
        }

        const currentUser = await this.refreshAccountSnapshot(user);
        if (!currentUser.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging copy trading."
            );
            return;
        }

        if (intent.targetWallet === currentUser.solanaWalletAddress) {
            await ctx.reply(
                "Copy-trade target must be different from your trading wallet."
            );
            return;
        }

        try {
            const storage = await storeCopyTradeConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
                userPublicKey: currentUser.solanaWalletAddress,
                tag: intent.tag ?? undefined,
                targetWallet: intent.targetWallet,
                buyMode: intent.buyMode,
                buyPercentageBps: Math.round(
                    (intent.buyPercentage ?? 100) * 100
                ),
                maxBuyAmountIn: solToLamports(intent.maxBuySol),
                amountLabel:
                    intent.buyMode === "fixed"
                        ? `${intent.maxBuySol} SOL fixed`
                        : `${intent.buyPercentage ?? 100}% up to ${intent.maxBuySol} SOL`,
                slippageBps: currentUser.settings.slippageBps,
                priorityFeeLamports: currentUser.settings.priorityFeeLamports,
                sellPriorityFeeLamports:
                    currentUser.settings.sellPriorityFeeLamports,
                copySells: Boolean(intent.copySells),
                duplicateBuys: Boolean(intent.duplicateBuys),
                onlyRenounced: Boolean(intent.onlyRenounced),
                excludePumpFunTokens: Boolean(intent.excludePumpFunTokens),
                minTargetBuyAmountIn:
                    intent.minTargetBuySol != null
                        ? solToLamports(intent.minTargetBuySol)
                        : undefined,
                minLiquidityUsd: intent.minLiquidityUsd,
                minMarketCapUsd: intent.minMarketCapUsd ?? undefined,
                maxMarketCapUsd: intent.maxMarketCapUsd ?? undefined,
                blacklistMints: intent.blacklistMints,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX copy-trade storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this config.",
                    ].join("\n")
                );
                return;
            }

            const config = this.syncStoredCopyTradeConfig(
                currentUser,
                storage.config
            );

            await ctx.reply(
                [
                    "Copy-trade config stored through FTX/FrogX.",
                    ...this.copyTradeSummaryLines(config),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    "This Telegram request did not start a monitor or execute a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "Copy Trade",
                            "ribbot:copytrade"
                        ),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-copytrade:${config.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX copytrade storage failed", error);
            await ctx.reply(
                "FTX/FrogX could not store this copy-trade config. Ribbot did not store it."
            );
        }
    }

    private async replySniper(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "sniper" }>
    ): Promise<void> {
        if (intent?.action === "add") {
            await this.replyAddSniper(ctx, user, intent);
            return;
        }

        let configs = this.store
            .listSniperConfigs(user)
            .filter((config) => config.status !== "cancelled");
        let ftxListUnavailable = false;
        try {
            const stored = await fetchSniperConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                configs = stored.configs
                    .map((config) => this.syncStoredSniperConfig(user, config))
                    .filter((config) => config.status !== "cancelled");
            } else {
                ftxListUnavailable = true;
            }
        } catch (error) {
            ftxListUnavailable = true;
            logger.warn("FTX/FrogX sniper list failed", error);
        }

        if (configs.length === 0) {
            await ctx.reply(
                [
                    "Sniper",
                    "No active sniper configs.",
                    "",
                    "Usage:",
                    "/sniper add <any|pump|raydium|moonshot> <max SOL per snipe> <min liquidity USD> <max snipes> [max market cap USD]",
                    "",
                    "FTX/FrogX stores source, max buy, liquidity filter, and max snipes before Ribbot shows the config.",
                    "When enabled by an operator, FTX monitors Jupiter recent first pools; live sends still require your Sniper setting plus separate FTX and Privy gates.",
                    ftxListUnavailable
                        ? "FTX/FrogX storage is unavailable, so only local cached configs can be shown."
                        : "",
                ].join("\n")
            );
            return;
        }

        const lines = [
            "Sniper configs",
            ...configs
                .slice(0, 10)
                .flatMap((config, index) => [
                    "",
                    `${index + 1}. ${config.source}`,
                    ...this.sniperSummaryLines(config),
                ]),
            configs.length > 10 ? `\n...and ${configs.length - 10} more` : "",
            ftxListUnavailable
                ? "\nFTX/FrogX storage is unavailable; showing local cache."
                : "",
        ].filter(Boolean);

        const buttons = configs
            .filter((config) => config.status !== "executed")
            .slice(0, 5)
            .map((config) =>
                config.status === "executing"
                    ? [
                          Markup.button.callback(
                              `Check ${config.id}`,
                              `ribbot:check-sniper:${config.id}`
                          ),
                      ]
                    : [
                          Markup.button.callback(
                              `Cancel ${config.id}`,
                              `ribbot:cancel-sniper:${config.id}`
                          ),
                      ]
            );
        buttons.push([
            Markup.button.callback("Refresh", "ribbot:sniper"),
            Markup.button.callback("Menu", "ribbot:menu"),
        ]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyAddSniper(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "sniper" }>
    ): Promise<void> {
        if (
            !intent.source ||
            !intent.maxBuySol ||
            intent.maxBuySol <= 0 ||
            !intent.minLiquidityUsd ||
            intent.minLiquidityUsd <= 0 ||
            !intent.maxSnipes ||
            !Number.isInteger(intent.maxSnipes)
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/sniper add <any|pump|raydium|moonshot> <max SOL per snipe> <min liquidity USD> <max snipes> [max market cap USD]",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging sniper mode."
            );
            return;
        }

        try {
            const storage = await storeSniperConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                source: intent.source,
                maxBuyAmountIn: solToLamports(intent.maxBuySol),
                amountLabel: `${intent.maxBuySol} SOL max per snipe`,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.priorityFeeLamports,
                minLiquidityUsd: intent.minLiquidityUsd,
                maxMarketCapUsd: intent.maxMarketCapUsd,
                maxSnipes: intent.maxSnipes,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX sniper storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this config.",
                    ].join("\n")
                );
                return;
            }

            const config = this.syncStoredSniperConfig(user, storage.config);

            await ctx.reply(
                [
                    "Sniper config stored through FTX/FrogX.",
                    ...this.sniperSummaryLines(config),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    user.settings.sniperEnabled
                        ? "This request only stored the config. FTX monitoring and execution still require disabled-by-default operator gates."
                        : "Sniper account opt-in is off. Use /settings sniper on before any operator-enabled live execution can run.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Sniper", "ribbot:sniper"),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-sniper:${config.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX sniper storage failed", error);
            await ctx.reply(
                "FTX/FrogX could not store this sniper config. Ribbot did not store it."
            );
        }
    }

    private async replyAutoBuy(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "autoBuy" }>
    ): Promise<void> {
        if (intent?.action === "instant") {
            await this.replyInstantAutoBuyPreference(ctx, user, intent);
            return;
        }
        if (intent?.action === "add") {
            await this.replyAddAutoBuy(ctx, user, intent);
            return;
        }

        const currentUser = await this.refreshAccountSnapshot(user);

        let configs = this.store
            .listAutoBuyConfigs(user)
            .filter((config) => config.status !== "cancelled");
        let ftxListUnavailable = false;
        try {
            const stored = await fetchAutoBuyConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                configs = stored.configs
                    .map((config) => this.syncStoredAutoBuyConfig(user, config))
                    .filter((config) => config.status !== "cancelled");
            } else {
                ftxListUnavailable = true;
            }
        } catch (error) {
            ftxListUnavailable = true;
            logger.warn("FTX/FrogX auto-buy list failed", error);
        }

        if (configs.length === 0) {
            await ctx.reply(
                [
                    "Auto Buy",
                    ...this.instantAutoBuySummaryLines(currentUser),
                    "",
                    "No active auto-buy rules.",
                    "",
                    "Usage:",
                    "/autobuy instant on <SOL> <min liquidity USD> [max market cap USD]",
                    "/autobuy instant off",
                    "/autobuy add <mint> <max SOL per buy> <min liquidity USD> [max market cap USD]",
                    "",
                    "FTX/FrogX stores token, max buy, slippage, and liquidity filters before Ribbot shows the rule.",
                    ftxListUnavailable
                        ? "FTX/FrogX storage is unavailable, so only local cached rules can be shown."
                        : "",
                ].join("\n")
            );
            return;
        }

        const lines = [
            "Auto Buy rules",
            ...this.instantAutoBuySummaryLines(currentUser),
            ...configs
                .slice(0, 10)
                .flatMap((config, index) => [
                    "",
                    `${index + 1}. ${shortAddress(config.mint)}`,
                    ...this.autoBuySummaryLines(config),
                ]),
            configs.length > 10 ? `\n...and ${configs.length - 10} more` : "",
            ftxListUnavailable
                ? "\nFTX/FrogX storage is unavailable; showing local cache."
                : "",
        ].filter(Boolean);

        const buttons = configs
            .filter(
                (config) =>
                    config.status === "staged" ||
                    config.status === "failed" ||
                    config.status === "executing"
            )
            .slice(0, 5)
            .map((config) => [
                Markup.button.callback(
                    `${config.status === "executing" ? "Check" : "Cancel"} ${config.id}`,
                    config.status === "executing"
                        ? `ribbot:check-autobuy:${config.id}`
                        : `ribbot:cancel-autobuy:${config.id}`
                ),
            ]);
        buttons.push([
            Markup.button.callback("Refresh", "ribbot:autobuy"),
            Markup.button.callback("Menu", "ribbot:menu"),
        ]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyInstantAutoBuyPreference(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "autoBuy" }>
    ): Promise<void> {
        if (intent.enabled === false) {
            await this.applySettingsPreference(ctx, user, {
                instantAutoBuyEnabled: false,
            });
            return;
        }
        if (
            intent.enabled !== true ||
            !intent.maxBuySol ||
            intent.maxBuySol <= 0 ||
            !intent.minLiquidityUsd ||
            intent.minLiquidityUsd <= 0 ||
            (intent.maxMarketCapUsd !== undefined &&
                intent.maxMarketCapUsd <= 0)
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/autobuy instant on <SOL> <min liquidity USD> [max market cap USD]",
                    "/autobuy instant off",
                ].join("\n")
            );
            return;
        }

        await this.applySettingsPreference(ctx, user, {
            instantAutoBuyEnabled: true,
            instantAutoBuyAmountSol: intent.maxBuySol,
            instantAutoBuyMinLiquidityUsd: intent.minLiquidityUsd,
            instantAutoBuyMaxMarketCapUsd: intent.maxMarketCapUsd,
        });
    }

    private instantAutoBuySummaryLines(user: TradingUser): string[] {
        return [
            `Instant CA buy: ${user.settings.instantAutoBuyEnabled ? "on" : "off"}`,
            `Instant amount: ${user.settings.instantAutoBuyAmountSol} SOL`,
            `Minimum liquidity: ${formatUsd(user.settings.instantAutoBuyMinLiquidityUsd)}`,
            `Maximum market cap: ${user.settings.instantAutoBuyMaxMarketCapUsd === undefined ? "none" : formatUsd(user.settings.instantAutoBuyMaxMarketCapUsd)}`,
        ];
    }

    private async replyAddAutoBuy(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "autoBuy" }>
    ): Promise<void> {
        if (
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.maxBuySol ||
            intent.maxBuySol <= 0 ||
            !intent.minLiquidityUsd ||
            intent.minLiquidityUsd <= 0
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/autobuy add <mint> <max SOL per buy> <min liquidity USD> [max market cap USD]",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging auto buy."
            );
            return;
        }

        try {
            const storage = await storeAutoBuyConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                mint: intent.mint,
                maxBuyAmountIn: solToLamports(intent.maxBuySol),
                amountLabel: `${intent.maxBuySol} SOL max per auto buy`,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.priorityFeeLamports,
                minLiquidityUsd: intent.minLiquidityUsd,
                maxMarketCapUsd: intent.maxMarketCapUsd,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX auto-buy storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this rule.",
                    ].join("\n")
                );
                return;
            }

            const config = this.syncStoredAutoBuyConfig(user, storage.config);

            await ctx.reply(
                [
                    "Auto-buy rule stored through FTX/FrogX.",
                    ...this.autoBuySummaryLines(config),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    "This Telegram request did not start a monitor or execute a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Auto Buy", "ribbot:autobuy"),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-autobuy:${config.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX auto-buy storage failed", error);
            await ctx.reply(
                "FTX/FrogX could not store this auto-buy rule. Ribbot did not store it."
            );
        }
    }

    private async replyBundleBuy(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "bundleBuy" }>
    ): Promise<void> {
        if (intent?.action === "add") {
            await this.replyAddBundleBuy(ctx, user, intent);
            return;
        }

        let configs = this.store
            .listBundleBuyConfigs(user)
            .filter((config) => config.status !== "cancelled");
        let ftxListUnavailable = false;
        try {
            const stored = await fetchBundleBuyConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                configs = stored.configs
                    .map((config) =>
                        this.syncStoredBundleBuyConfig(user, config)
                    )
                    .filter((config) => config.status !== "cancelled");
            } else {
                ftxListUnavailable = true;
            }
        } catch (error) {
            ftxListUnavailable = true;
            logger.warn("FTX/FrogX bundle-buy list failed", error);
        }

        if (configs.length === 0) {
            await ctx.reply(
                [
                    "Basket Buy",
                    "No multi-token baskets are staged.",
                    "",
                    "Usage:",
                    "/bundle add <mint> <SOL> <mint> <SOL> <min liquidity USD> [max market cap USD]",
                    "",
                    "FTX/FrogX stores the token basket, per-token SOL caps, slippage, and risk filters before Ribbot shows the basket.",
                    ftxListUnavailable
                        ? "FTX/FrogX storage is unavailable, so only local cached baskets can be shown."
                        : "",
                ].join("\n")
            );
            return;
        }

        const lines = [
            "Basket Buy",
            ...configs
                .slice(0, 10)
                .flatMap((config, index) => [
                    "",
                    `${index + 1}. ${config.items.length} tokens`,
                    ...this.bundleBuySummaryLines(config),
                ]),
            configs.length > 10 ? `\n...and ${configs.length - 10} more` : "",
            ftxListUnavailable
                ? "\nFTX/FrogX storage is unavailable; showing local cache."
                : "",
        ].filter(Boolean);

        const buttons = configs.slice(0, 5).flatMap((config) => {
            if (config.status === "staged") {
                return [
                    [
                        Markup.button.callback(
                            `Execute ${config.id}`,
                            `ribbot:execute-bundle:${config.id}`
                        ),
                        Markup.button.callback(
                            `Cancel ${config.id}`,
                            `ribbot:cancel-bundle:${config.id}`
                        ),
                    ],
                ];
            }
            if (config.status === "executing") {
                return [
                    [
                        Markup.button.callback(
                            `Check ${config.id}`,
                            `ribbot:check-bundle:${config.id}`
                        ),
                    ],
                ];
            }
            return [];
        });
        buttons.push([Markup.button.callback("Menu", "ribbot:menu")]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyAddBundleBuy(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "bundleBuy" }>
    ): Promise<void> {
        const items = intent.items ?? [];
        if (
            items.length < 2 ||
            items.length > 10 ||
            !intent.minLiquidityUsd ||
            intent.minLiquidityUsd <= 0
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/bundle add <mint> <SOL> <mint> <SOL> <min liquidity USD> [max market cap USD]",
                    "",
                    "Example:",
                    "/bundle add <mintA> 0.05 <mintB> 0.05 1000",
                ].join("\n")
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging a basket buy."
            );
            return;
        }

        const totalSol = items.reduce((sum, item) => sum + item.amountSol, 0);
        try {
            const storage = await storeBundleBuyConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                items: items.map((item) => ({
                    mint: item.mint,
                    maxBuyAmountIn: solToLamports(item.amountSol),
                    amountLabel: `${item.amountSol} SOL`,
                })),
                amountLabel: `${totalSol} SOL total`,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.priorityFeeLamports,
                minLiquidityUsd: intent.minLiquidityUsd,
                maxMarketCapUsd: intent.maxMarketCapUsd,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX bundle-buy storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this basket.",
                    ].join("\n")
                );
                return;
            }

            const config = this.syncStoredBundleBuyConfig(user, storage.config);

            await ctx.reply(
                [
                    "Bundle-buy basket stored through FTX/FrogX.",
                    ...this.bundleBuySummaryLines(config),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    "This Telegram request did not execute a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "Execute",
                            `ribbot:execute-bundle:${config.id}`
                        ),
                        Markup.button.callback("Basket Buy", "ribbot:bundle"),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-bundle:${config.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX bundle-buy storage failed", error);
            await ctx.reply(
                "FTX/FrogX could not store this multi-token basket. Ribbot did not store it."
            );
        }
    }

    private async replyAutoSell(
        ctx: Context,
        user: TradingUser,
        intent?: Extract<ParsedIntent, { kind: "autoSell" }>
    ): Promise<void> {
        if (intent?.action === "add") {
            await this.replyAddAutoSell(ctx, user, intent);
            return;
        }

        let configs = this.store
            .listAutoSellConfigs(user)
            .filter((config) => config.status !== "cancelled");
        let ftxListUnavailable = false;
        try {
            const stored = await fetchAutoSellConfigs({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
            });
            if (stored.status === "ready") {
                configs = stored.configs
                    .map((config) =>
                        this.syncStoredAutoSellConfig(user, config)
                    )
                    .filter((config) => config.status !== "cancelled");
            } else {
                ftxListUnavailable = true;
            }
        } catch (error) {
            ftxListUnavailable = true;
            logger.warn("FTX/FrogX auto-sell list failed", error);
        }

        if (configs.length === 0) {
            await ctx.reply(
                [
                    "Auto Sell",
                    "No active auto-sell rules.",
                    "",
                    "Usage:",
                    "/autosell add <mint> <sell percent> [above|below <price>]",
                    "",
                    "FTX/FrogX stores token, sell percentage, optional trigger, slippage, and priority fee before Ribbot shows the rule.",
                    ftxListUnavailable
                        ? "FTX/FrogX storage is unavailable, so only local cached rules can be shown."
                        : "",
                ].join("\n")
            );
            return;
        }

        const lines = [
            "Auto Sell rules",
            ...configs
                .slice(0, 10)
                .flatMap((config, index) => [
                    "",
                    `${index + 1}. ${shortAddress(config.mint)}`,
                    ...this.autoSellSummaryLines(config),
                ]),
            configs.length > 10 ? `\n...and ${configs.length - 10} more` : "",
            ftxListUnavailable
                ? "\nFTX/FrogX storage is unavailable; showing local cache."
                : "",
        ].filter(Boolean);

        const buttons = configs
            .filter(
                (config) =>
                    config.status === "staged" ||
                    config.status === "failed" ||
                    config.status === "executing"
            )
            .slice(0, 5)
            .map((config) => [
                Markup.button.callback(
                    `${config.status === "executing" ? "Check" : "Cancel"} ${config.id}`,
                    config.status === "executing"
                        ? `ribbot:check-autosell:${config.id}`
                        : `ribbot:cancel-autosell:${config.id}`
                ),
            ]);
        buttons.push([
            Markup.button.callback("Refresh", "ribbot:autosell"),
            Markup.button.callback("Menu", "ribbot:menu"),
        ]);

        await ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
    }

    private async replyAddAutoSell(
        ctx: Context,
        user: TradingUser,
        intent: Extract<ParsedIntent, { kind: "autoSell" }>
    ): Promise<void> {
        if (
            !intent.mint ||
            !isSolanaMint(intent.mint) ||
            !intent.sellPercent ||
            intent.sellPercent <= 0 ||
            intent.sellPercent > 100
        ) {
            await ctx.reply(
                [
                    "Usage:",
                    "/autosell add <mint> <sell percent> [above|below <price>]",
                ].join("\n")
            );
            return;
        }

        if (
            (intent.triggerDirection && !intent.triggerPrice) ||
            (!intent.triggerDirection && intent.triggerPrice)
        ) {
            await ctx.reply(
                "Auto-sell trigger needs both above|below and a price."
            );
            return;
        }

        if (!user.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before staging auto sell."
            );
            return;
        }

        try {
            const storage = await storeAutoSellConfig({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                mint: intent.mint,
                sellBps: Math.round(intent.sellPercent * 100),
                amountLabel: `${intent.sellPercent}%`,
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.sellPriorityFeeLamports,
                triggerPrice: intent.triggerPrice,
                triggerDirection: intent.triggerDirection,
            });

            if (storage.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX auto-sell storage is not configured for Ribbot yet.",
                        `Missing: ${(storage.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot did not store this rule.",
                    ].join("\n")
                );
                return;
            }

            const config = this.syncStoredAutoSellConfig(user, storage.config);

            await ctx.reply(
                [
                    "Auto-sell rule stored through FTX/FrogX.",
                    ...this.autoSellSummaryLines(config),
                    "",
                    ...storage.warnings.map((warning) => `Warning: ${warning}`),
                    "",
                    "This Telegram request did not start a monitor or execute a trade.",
                ].join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Auto Sell", "ribbot:autosell"),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel-autosell:${config.id}`
                        ),
                    ],
                ])
            );
        } catch (error) {
            logger.warn("FTX/FrogX auto-sell storage failed", error);
            await ctx.reply(
                "FTX/FrogX could not store this auto-sell rule. Ribbot did not store it."
            );
        }
    }

    private async replyHelp(ctx: Context): Promise<void> {
        await ctx.reply(
            [
                "Ribbot trading commands",
                "/start - trading menu",
                "/wallet - wallet setup status",
                "/wallet select <number> - choose the active FTX wallet",
                "/account - refresh FTX account snapshot",
                "/control - FTX account control code",
                "/referral - show referral code and tracking-only rewards",
                "/referral <code> - apply an invite code",
                "/buy <mint> <SOL> - create a buy ticket",
                "/sell <mint> <percent> - create a sell ticket",
                "/positions [page] - paginated holdings and trade actions",
                "/nfts [page] - NFTs held by the active FTX wallet",
                "/position <mint> - open one position",
                "/pnl - PNL and fill coverage",
                "/activity - recent FTX account events",
                "/cleanup - review dust, hidden, and unpriced token positions",
                "/safety <mint> - review mint/freeze authority and price signals",
                "/scan <mint> [SOL] - review safety, market cap, and quote impact",
                "/withdraw sol <amount SOL> <destination> - stage SOL withdrawal",
                "/withdraw <mint> <percent|all> <destination> - stage token withdrawal",
                "/withdrawals - staged withdrawals",
                "/limit buy <mint> <SOL> below <price> - stage a limit buy",
                "/limit sell <mint> <percent> above <price> - stage a limit sell",
                "/stop <mint> <percent> below <price> - stage a stop loss",
                "/trailing <mint> <sell percent> <trail percent> - stage a trailing stop",
                "/dca buy <mint> <total SOL> <orders> <interval minutes> - stage DCA",
                "/orders - staged limit, stop, trailing, and DCA orders",
                "/copytrade add <wallet> fixed <SOL> <min liq USD> [options]",
                "/copytrade add <wallet> percent <%> <max SOL> <min liq USD> [options]",
                "/copytrade pause|resume <config id>",
                "/copytrade edit <config id> key=value ...",
                "/copytrade duplicate <config id> [tag=name]",
                "/sniper add <source> <max SOL> <min liq USD> <max snipes> - stage sniper",
                "/autobuy instant on <SOL> <min liq USD> [max mcap USD] - buy pasted CAs",
                "/autobuy instant off - disable pasted-CA buys",
                "/autobuy add <mint> <max SOL> <min liq USD> - stage token rule",
                "/bundle add <mint> <SOL> <mint> <SOL> <min liq USD> - stage basket buy",
                "/autosell add <mint> <sell percent> [above|below <price>] - stage auto sell",
                "/watch <mint> - add a saved token mint",
                "/watchlist remove <mint> - remove a saved token mint",
                "/hide <mint> and /unhide <mint> - manage hidden token mints",
                "/settings - trade defaults",
                "",
                "Paste a Solana mint by itself to open a trade panel.",
            ].join("\n"),
            Markup.inlineKeyboard([
                [Markup.button.callback("Menu", "ribbot:menu")],
            ])
        );
    }

    private async replyUnknownCommand(
        ctx: Context,
        command: string
    ): Promise<void> {
        await ctx.reply(
            [
                `Unknown command: ${command}`,
                "",
                "Ribbot did not run a trade, stage anything, or forward this to chat.",
                "Use /help for the command list or /menu for buttons.",
            ].join("\n"),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Help", "ribbot:help"),
                    Markup.button.callback("Menu", "ribbot:menu"),
                ],
            ])
        );
    }

    private async replyUnknownAction(ctx: Context): Promise<void> {
        await ctx.reply(
            [
                "That button is from an older Ribbot message and is no longer available.",
                "No trade was built, signed, or broadcast.",
            ].join("\n"),
            Markup.inlineKeyboard([
                [Markup.button.callback("Menu", "ribbot:menu")],
            ])
        );
    }

    private async replyToken(
        ctx: Context,
        user: TradingUser,
        mint: string
    ): Promise<void> {
        const currentUser = await this.refreshAccountSnapshot(user);

        if (currentUser.settings.instantAutoBuyEnabled) {
            await this.replyInstantAutoBuy(ctx, currentUser, mint);
            return;
        }

        await this.replyTokenActions(ctx, currentUser, mint);
    }

    private async replyTokenActions(
        ctx: Context,
        user: TradingUser,
        mint: string
    ): Promise<void> {
        await ctx.reply(
            [
                `Token: ${shortAddress(mint)}`,
                `Wallet: ${user.solanaWalletAddress ? shortAddress(user.solanaWalletAddress) : "not linked"}`,
                `Mode: ${this.executionModeLabel()}`,
                "",
                this.config.tradingEnabled && !this.config.dryRun
                    ? "Choose an action. Confirmed tickets route through FTX/FrogX, which owns live gates and Privy signing."
                    : "Choose an action. Confirmed tickets stay dry-run; nothing is sent to FTX/FrogX until Ribbot live gates are enabled.",
            ].join("\n"),
            Markup.inlineKeyboard([
                ...this.tradePresetRows(user, mint),
                [
                    Markup.button.callback("Scan", `ribbot:scan:${mint}`),
                    Markup.button.callback("Watch", `ribbot:watch:${mint}`),
                ],
                [Markup.button.callback("Menu", "ribbot:menu")],
            ])
        );
    }

    private async replyInstantAutoBuy(
        ctx: Context,
        user: TradingUser,
        mint: string
    ): Promise<void> {
        const blocked = async (reason: string) => {
            await ctx.reply(
                [
                    "Instant Auto Buy blocked by FTX/FrogX.",
                    `Token: ${shortAddress(mint)}`,
                    `Reason: ${reason}`,
                    "No transaction was built, signed, or broadcast.",
                ].join("\n")
            );
            await this.replyTokenActions(ctx, user, mint);
        };

        if (!user.solanaWalletAddress || user.walletSource !== "privy") {
            await blocked("Link or create an FTX-managed wallet first.");
            return;
        }

        const amountSol = user.settings.instantAutoBuyAmountSol;
        try {
            const review = await fetchMarketRisk({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: user.telegramUserId,
                userPublicKey: user.solanaWalletAddress,
                mint,
                amountIn: solToLamports(amountSol),
                slippageBps: user.settings.slippageBps,
                priorityFeeLamports: user.settings.priorityFeeLamports,
                minLiquidityUsd: user.settings.instantAutoBuyMinLiquidityUsd,
                maxMarketCapUsd: user.settings.instantAutoBuyMaxMarketCapUsd,
                maxPriceImpactBps: Math.max(user.settings.slippageBps, 1500),
            });
            if (review.status === "not_configured") {
                await blocked(
                    `market-risk checks need ${(review.required ?? []).join(", ") || "FTX quote configuration"}`
                );
                return;
            }

            const danger = review.risk.flags.find(
                (flag) => flag.severity === "danger"
            );
            if (danger) {
                await blocked(danger.message);
                return;
            }
            if (review.quoteProbe.status !== "ready") {
                await blocked(
                    marketRiskQuoteBlockingReason(review.quoteProbe) ??
                        "FTX/FrogX quote verification did not complete."
                );
                return;
            }
            if (!review.quoteProbe.executable) {
                await blocked(
                    "FTX/FrogX could not produce an executable quote."
                );
                return;
            }
            if (
                user.settings.instantAutoBuyMaxMarketCapUsd !== undefined &&
                review.marketCap.withinLimit !== true
            ) {
                await blocked(
                    "The configured market-cap limit could not be verified."
                );
                return;
            }

            await this.replyExecutionPreview(ctx, {
                side: "buy",
                user,
                mint,
                amountLabel: `${amountSol} SOL instant auto buy`,
                forceImmediate: true,
                executionMode: "instant_auto_buy",
            });
        } catch (error) {
            logger.warn("FTX/FrogX Instant Auto Buy precheck failed", error);
            await blocked("Market-risk checks are temporarily unavailable.");
        }
    }

    private tradePresetRows(user: TradingUser, mint: string) {
        const buyRows = chunkButtons(
            user.settings.buyPresetsSol.map((amount) =>
                Markup.button.callback(
                    `Buy ${formatPresetNumber(amount)} SOL`,
                    `ribbot:buy:${mint}:${amount}`
                )
            )
        );
        const sellRows = chunkButtons(
            user.settings.sellPresetsPercent.map((percent) =>
                Markup.button.callback(
                    `Sell ${formatPresetNumber(percent)}%`,
                    `ribbot:sell:${mint}:${percent}`
                )
            )
        );
        return [...buyRows, ...sellRows];
    }

    private async replyBuy(
        ctx: Context,
        user: TradingUser,
        mint?: string,
        amountSol?: number
    ): Promise<void> {
        if (!mint || !isSolanaMint(mint)) {
            await ctx.reply("Usage: /buy <token mint> <amount in SOL>");
            return;
        }

        const currentUser = await this.refreshAccountSnapshot(user);
        const amount =
            amountSol && amountSol > 0
                ? amountSol
                : currentUser.settings.defaultBuySol;
        await this.replyExecutionPreview(ctx, {
            side: "buy",
            user: currentUser,
            mint,
            amountLabel: `${amount} SOL`,
        });
    }

    private async replySell(
        ctx: Context,
        user: TradingUser,
        mint?: string,
        percentage?: number
    ): Promise<void> {
        if (!mint || !isSolanaMint(mint)) {
            await ctx.reply("Usage: /sell <token mint> <percentage>");
            return;
        }

        const currentUser = await this.refreshAccountSnapshot(user);
        if (!currentUser.solanaWalletAddress) {
            await ctx.reply(
                "Link or create a wallet with /wallet before selling."
            );
            return;
        }

        const percent =
            percentage && percentage > 0 ? Math.min(percentage, 100) : 25;

        try {
            const positions = await fetchPositions({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                telegramUserId: currentUser.telegramUserId,
                userPublicKey: currentUser.solanaWalletAddress,
            });

            if ("status" in positions) {
                await ctx.reply(
                    [
                        "FTX/FrogX positions are not configured yet.",
                        `Missing: ${(positions.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "Ribbot will not guess token balances for sells.",
                    ].join("\n")
                );
                return;
            }

            const token = positions.tokens.find((entry) => entry.mint === mint);
            if (!token || token.amount === "0") {
                await ctx.reply(
                    [
                        "No position found for that mint.",
                        `Token: ${shortAddress(mint)}`,
                        "",
                        "Run /positions to refresh balances.",
                    ].join("\n")
                );
                return;
            }

            const amountIn = applyPercentage(token.amount, percent);
            if (amountIn === "0") {
                await ctx.reply(
                    "Sell amount rounds to zero for this position."
                );
                return;
            }

            await this.replySellPreview(ctx, {
                user: currentUser,
                mint,
                percent,
                token,
                amountIn,
            });
        } catch (error) {
            logger.warn("FTX/FrogX sell preview failed", error);
            await ctx.reply(
                "Sell preview is unavailable from FTX/FrogX right now."
            );
        }
    }

    private async replySellPreview(
        ctx: Context,
        input: {
            user: TradingUser;
            mint: string;
            percent: number;
            token: PositionToken;
            amountIn: string;
        }
    ): Promise<void> {
        if (!input.user.solanaWalletAddress) return;

        const cannotExecute = !this.config.tradingEnabled || this.config.dryRun;
        let quote: Awaited<ReturnType<typeof fetchQuote>> | undefined;

        const lines = [
            "Sell preview",
            `Token: ${shortAddress(input.mint)}`,
            `Balance: ${formatTokenBalance(input.token)}`,
            `Amount: ${input.percent}% (${formatRawTokenAmount(input.amountIn, input.token.decimals)})`,
            `Route: ${this.config.frogxApiBaseUrl}/api/frogx`,
            `Mode: ${this.executionModeLabel()}`,
        ];

        if (this.config.quotePreviewsEnabled) {
            try {
                quote = await fetchQuote({
                    frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                    inMint: input.mint,
                    outMint: SOL_MINT,
                    amountIn: input.amountIn,
                    userPublicKey: input.user.solanaWalletAddress,
                    slippageBps: input.user.settings.slippageBps,
                    priorityFeeLamports:
                        input.user.settings.sellPriorityFeeLamports,
                });
                lines.push("", "FrogX quote", ...formatQuoteLines(quote));
            } catch (error) {
                logger.warn("FrogX sell quote preview failed", error);
                lines.push(
                    "",
                    "FrogX quote unavailable right now. No transaction was sent."
                );
            }
        }

        lines.push(
            "",
            cannotExecute
                ? "No transaction was sent. Confirmation stays dry-run until Ribbot's live gates are enabled."
                : "Confirmation will ask FTX/FrogX to build and execute a fresh sell transaction through its Privy policy gate."
        );

        const order = this.store.createPendingOrder(input.user, {
            side: "sell",
            mint: input.mint,
            inMint: input.mint,
            outMint: SOL_MINT,
            amountIn: input.amountIn,
            amountLabel: `${input.percent}% (${formatRawTokenAmount(input.amountIn, input.token.decimals)})`,
            walletAddress: input.user.solanaWalletAddress,
            slippageBps: input.user.settings.slippageBps,
            priorityFeeLamports: input.user.settings.sellPriorityFeeLamports,
            quote: quote
                ? {
                      amountOut: quote.amountOut,
                      priceImpactBps: quote.priceImpactBps,
                      route:
                          quote.routers.length > 0
                              ? quote.routers.join(" -> ")
                              : "unknown",
                      executable: quote.executable,
                      updatedAt: quote.updatedAt,
                  }
                : undefined,
        });

        lines.push(
            "",
            `Order ticket: ${order.id}`,
            `Expires: ${order.expiresAt}`
        );

        const confirmationRequired = requiresTradeConfirmation(
            input.user.settings,
            "sell",
            input.percent
        );
        if (!confirmationRequired) {
            lines.push(
                "",
                cannotExecute
                    ? "Trade confirmation is off. Ribbot is recording this ticket as a dry run now."
                    : "Trade confirmation is off. Ribbot is sending this ticket to FTX/FrogX now."
            );
            await ctx.reply(
                lines.join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Positions", "ribbot:positions"),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
            await this.replyConfirmOrder(ctx, input.user, order.id);
            return;
        }

        await ctx.reply(
            lines.join("\n"),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "Confirm",
                        `ribbot:confirm:${order.id}`
                    ),
                    Markup.button.callback(
                        "Cancel",
                        `ribbot:cancel:${order.id}`
                    ),
                ],
                [
                    Markup.button.callback("Positions", "ribbot:positions"),
                    Markup.button.callback("Menu", "ribbot:menu"),
                ],
            ])
        );
    }

    private async replyExecutionPreview(
        ctx: Context,
        input: {
            side: "buy" | "sell";
            user: TradingUser;
            mint: string;
            amountLabel: string;
            forceImmediate?: boolean;
            executionMode?: "instant_auto_buy";
        }
    ): Promise<void> {
        const missingWallet = !input.user.solanaWalletAddress;
        const cannotExecute =
            missingWallet || !this.config.tradingEnabled || this.config.dryRun;
        let quote: Awaited<ReturnType<typeof fetchBuyQuote>> | undefined;
        const amountSol =
            input.side === "buy" ? parseAmountSol(input.amountLabel) : 0;

        const lines = [
            `${input.side === "buy" ? "Buy" : "Sell"} preview`,
            `Token: ${shortAddress(input.mint)}`,
            `Amount: ${input.amountLabel}`,
            `Route: ${this.config.frogxApiBaseUrl}/api/frogx`,
            `Mode: ${this.executionModeLabel()}`,
        ];

        if (input.side === "buy" && input.user.solanaWalletAddress) {
            if (this.config.quotePreviewsEnabled && amountSol > 0) {
                try {
                    quote = await fetchBuyQuote({
                        frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                        outMint: input.mint,
                        amountSol,
                        userPublicKey: input.user.solanaWalletAddress,
                        slippageBps: input.user.settings.slippageBps,
                        priorityFeeLamports:
                            input.user.settings.priorityFeeLamports,
                    });
                    lines.push("", "FrogX quote", ...formatQuoteLines(quote));
                } catch (error) {
                    logger.warn("FrogX quote preview failed", error);
                    lines.push(
                        "",
                        "FrogX quote unavailable right now. No transaction was sent."
                    );
                }
            }
        }

        if (missingWallet) {
            lines.push(
                "",
                "Link or create a wallet with /wallet before live trading."
            );
        }

        if (cannotExecute) {
            lines.push(
                "",
                "No transaction was sent. Confirmation stays dry-run until Ribbot's live gates are enabled."
            );
        } else {
            lines.push(
                "",
                "Confirmation will ask FTX/FrogX to build and execute a fresh swap transaction through its Privy policy gate."
            );
        }

        if (
            input.side === "buy" &&
            input.user.solanaWalletAddress &&
            amountSol > 0
        ) {
            const order = this.store.createPendingOrder(input.user, {
                side: "buy",
                mint: input.mint,
                inMint: SOL_MINT,
                outMint: input.mint,
                amountIn: solToLamports(amountSol),
                amountLabel: input.amountLabel,
                walletAddress: input.user.solanaWalletAddress,
                slippageBps: input.user.settings.slippageBps,
                priorityFeeLamports: input.user.settings.priorityFeeLamports,
                executionMode: input.executionMode,
                quote: quote
                    ? {
                          amountOut: quote.amountOut,
                          priceImpactBps: quote.priceImpactBps,
                          route:
                              quote.routers.length > 0
                                  ? quote.routers.join(" -> ")
                                  : "unknown",
                          executable: quote.executable,
                          updatedAt: quote.updatedAt,
                      }
                    : undefined,
            });

            lines.push(
                "",
                `Order ticket: ${order.id}`,
                `Expires: ${order.expiresAt}`
            );

            const confirmationRequired =
                !input.forceImmediate &&
                requiresTradeConfirmation(input.user.settings, "buy");
            if (!confirmationRequired) {
                lines.push(
                    "",
                    cannotExecute
                        ? "Trade confirmation is off. Ribbot is recording this ticket as a dry run now."
                        : "Trade confirmation is off. Ribbot is sending this ticket to FTX/FrogX now."
                );
                await ctx.reply(
                    lines.join("\n"),
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback(
                                "Watch",
                                `ribbot:watch:${input.mint}`
                            ),
                            Markup.button.callback("Menu", "ribbot:menu"),
                        ],
                    ])
                );
                await this.replyConfirmOrder(ctx, input.user, order.id);
                return;
            }

            await ctx.reply(
                lines.join("\n"),
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "Confirm",
                            `ribbot:confirm:${order.id}`
                        ),
                        Markup.button.callback(
                            "Cancel",
                            `ribbot:cancel:${order.id}`
                        ),
                    ],
                    [
                        Markup.button.callback(
                            "Watch",
                            `ribbot:watch:${input.mint}`
                        ),
                        Markup.button.callback("Menu", "ribbot:menu"),
                    ],
                ])
            );
            return;
        }

        await ctx.reply(lines.join("\n"));
    }

    private async replyConfirmOrder(
        ctx: Context,
        user: TradingUser,
        orderId?: string
    ): Promise<void> {
        if (!orderId) {
            await ctx.reply("Order ticket missing.");
            return;
        }

        const order = this.store.getPendingOrder(user, orderId);
        if (!order) {
            await ctx.reply(
                "Order ticket not found. Create a fresh order with /buy."
            );
            return;
        }

        if (order.status === "cancelled") {
            await ctx.reply("Order ticket was already cancelled.");
            return;
        }

        if (order.status === "swap_built") {
            await ctx.reply("Swap was already built for this order ticket.");
            return;
        }

        if (order.status === "executed") {
            await ctx.reply(
                [
                    "Order was already executed.",
                    ...this.orderSummaryLines(order),
                    order.execution?.signature
                        ? `Signature: ${order.execution.signature}`
                        : undefined,
                    order.execution?.solscanUrl
                        ? `Solscan: ${order.execution.solscanUrl}`
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n")
            );
            return;
        }

        if (order.status === "execution_pending") {
            await this.replyCheckOrderStatus(ctx, user, order.id);
            return;
        }

        if (order.status === "execution_failed") {
            await ctx.reply(
                [
                    "This swap attempt ended in a terminal failure.",
                    ...this.orderSummaryLines(order),
                    order.reconciliation?.error,
                    "Create a fresh order ticket before trying again.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.orderExecutionKeyboard(order.id, false)
            );
            return;
        }

        if (new Date(order.expiresAt).getTime() < Date.now()) {
            this.store.cancelPendingOrder(user, order.id);
            await ctx.reply(
                "Order ticket expired. Create a fresh order with /buy."
            );
            return;
        }

        if (!this.config.tradingEnabled || this.config.dryRun) {
            this.store.markDryRun(user, order.id);
            await ctx.reply(
                [
                    "Dry-run confirmation recorded.",
                    ...this.orderSummaryLines(order),
                    "",
                    "No swap was built, signed, or broadcast. Ribbot's live gates are off, so this confirmation was not sent to FTX/FrogX.",
                ].join("\n"),
                this.menuKeyboard()
            );
            return;
        }

        try {
            const execution = await executeSwapTransaction({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                orderId: order.id,
                telegramUserId: user.telegramUserId,
                userPublicKey: order.walletAddress,
                inMint: order.inMint,
                outMint: order.outMint,
                amountIn: order.amountIn,
                slippageBps: order.slippageBps,
                priorityFeeLamports: order.priorityFeeLamports,
                executionMode: order.executionMode,
            });

            if (execution.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX/FrogX live execution is not configured for Ribbot yet.",
                        `Missing: ${(execution.required ?? []).join(", ") || "unknown"}`,
                        "",
                        "No transaction was signed or broadcast.",
                    ].join("\n"),
                    this.orderExecutionKeyboard(order.id, false)
                );
                return;
            }

            if (execution.status === "not_executable") {
                await ctx.reply(
                    [
                        "FTX/FrogX rejected this swap before confirming execution.",
                        ...this.orderSummaryLines(order),
                        "",
                        execution.error ??
                            "No transaction was signed or broadcast.",
                    ].join("\n"),
                    this.orderExecutionKeyboard(order.id, false)
                );
                return;
            }

            if (execution.status === "pending_reconciliation") {
                const reconciliation = this.store.markExecutionPending(
                    user,
                    order.id,
                    {
                        status: "pending",
                        referenceId: execution.referenceId,
                        transactionId: execution.transactionId,
                        executionStartedAt: execution.executionStartedAt,
                        checkedAt: new Date().toISOString(),
                        error: execution.error,
                        manualReviewRequired: execution.manualReviewRequired,
                        manualReviewAfter: execution.manualReviewAfter,
                        manualReviewRequiredAt:
                            execution.manualReviewRequiredAt,
                        manualReviewReason: execution.manualReviewReason,
                    }
                );
                await ctx.reply(
                    [
                        "Swap status is not confirmed yet.",
                        ...this.orderSummaryLines(reconciliation ?? order),
                        "",
                        execution.error,
                        this.manualReviewRecoveryLine(execution),
                        "Do not confirm this ticket again. Check status instead; the check never resends the swap.",
                    ].join("\n"),
                    this.orderExecutionKeyboard(order.id, true)
                );
                return;
            }

            const updated = this.store.markExecuted(user, order.id, {
                signature: execution.signature,
                transactionId: execution.transactionId,
                referenceId: execution.referenceId,
                solscanUrl: execution.solscanUrl,
                executedAt: execution.executedAt,
            });

            await ctx.reply(
                [
                    "FTX/FrogX executed the swap through Privy.",
                    ...this.orderSummaryLines(updated ?? order),
                    `Signature: ${execution.signature}`,
                    execution.solscanUrl
                        ? `Solscan: ${execution.solscanUrl}`
                        : undefined,
                    execution.transactionId
                        ? `Privy tx: ${execution.transactionId}`
                        : undefined,
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.orderExecutionKeyboard(order.id, false)
            );
        } catch (error) {
            logger.warn("FTX/FrogX swap execution failed", error);
            this.store.markExecutionPending(user, order.id, {
                status: "lookup_error",
                checkedAt: new Date().toISOString(),
                error: "Ribbot lost contact with FTX after requesting execution.",
            });
            await ctx.reply(
                [
                    "Swap status is unknown because Ribbot lost contact with FTX.",
                    "Do not confirm this ticket again. Check status; FTX will query Privy without resending the swap.",
                ].join("\n"),
                this.orderExecutionKeyboard(order.id, true)
            );
        }
    }

    private async replyCheckOrderStatus(
        ctx: Context,
        user: TradingUser,
        orderId?: string
    ): Promise<void> {
        if (!orderId) {
            await ctx.reply("Order ticket missing.", this.menuKeyboard());
            return;
        }
        const order = this.store.getPendingOrder(user, orderId);
        if (!order) {
            await ctx.reply("Order ticket not found.", this.menuKeyboard());
            return;
        }

        try {
            const result = await fetchSwapExecutionStatus({
                frogxApiBaseUrl: this.config.frogxApiBaseUrl,
                ftxApiToken: this.config.ftxApiToken,
                orderId: order.id,
                telegramUserId: user.telegramUserId,
                userPublicKey: order.walletAddress,
                inMint: order.inMint,
                outMint: order.outMint,
                amountIn: order.amountIn,
                slippageBps: order.slippageBps,
                priorityFeeLamports: order.priorityFeeLamports,
            });

            if (result.status === "not_configured") {
                await ctx.reply(
                    [
                        "FTX swap status lookup is not configured.",
                        `Missing: ${(result.required ?? []).join(", ") || "unknown"}`,
                        "The ticket remains locked because its execution state is not proven.",
                    ].join("\n"),
                    this.orderExecutionKeyboard(order.id, true)
                );
                return;
            }

            if (result.status === "executed") {
                const updated = this.store.markExecuted(user, order.id, {
                    signature: result.signature,
                    transactionId: result.transactionId,
                    referenceId: result.referenceId,
                    solscanUrl: result.solscanUrl,
                    executedAt: result.executedAt,
                });
                await ctx.reply(
                    [
                        "FTX confirmed the swap through Privy.",
                        ...this.orderSummaryLines(updated ?? order),
                        `Provider status: ${result.providerStatus ?? "confirmed"}`,
                        `Signature: ${result.signature}`,
                        result.solscanUrl
                            ? `Solscan: ${result.solscanUrl}`
                            : undefined,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.orderExecutionKeyboard(order.id, false)
                );
                return;
            }

            if (result.status === "failed") {
                const failed = this.store.markExecutionFailed(
                    user,
                    order.id,
                    this.reconciliationRecord(result, "failed")
                );
                await ctx.reply(
                    [
                        "FTX confirmed this swap failed.",
                        ...this.orderSummaryLines(failed ?? order),
                        `Provider status: ${result.providerStatus ?? "failed"}`,
                        result.error,
                        "No automatic retry was sent. Create a fresh order ticket if you still want to trade.",
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    this.orderExecutionKeyboard(order.id, false)
                );
                return;
            }

            const pendingStatus =
                result.status === "not_found" ? "not_found" : "lookup_error";
            const pending = this.store.markExecutionPending(
                user,
                order.id,
                this.reconciliationRecord(
                    result,
                    result.status === "pending" ? "pending" : pendingStatus
                )
            );
            await ctx.reply(
                [
                    "Swap is still awaiting a terminal Privy status.",
                    ...this.orderSummaryLines(pending ?? order),
                    result.providerStatus
                        ? `Provider status: ${result.providerStatus}`
                        : undefined,
                    result.error,
                    this.manualReviewRecoveryLine(result),
                    "No transaction was resent. Check again later.",
                ]
                    .filter(Boolean)
                    .join("\n"),
                this.orderExecutionKeyboard(order.id, true)
            );
        } catch (error) {
            logger.warn("FTX/FrogX swap status lookup failed", error);
            this.store.markExecutionPending(user, order.id, {
                status: "lookup_error",
                checkedAt: new Date().toISOString(),
                error: "Ribbot could not reach FTX for a read-only status check.",
            });
            await ctx.reply(
                [
                    "Swap status lookup is unavailable.",
                    "The ticket remains locked and no swap was resent.",
                ].join("\n"),
                this.orderExecutionKeyboard(order.id, true)
            );
        }
    }

    private async replyCancelOrder(
        ctx: Context,
        user: TradingUser,
        orderId?: string
    ): Promise<void> {
        if (!orderId) {
            await ctx.reply("Order ticket missing.");
            return;
        }

        const existing = this.store.getPendingOrder(user, orderId);
        if (existing?.status === "execution_pending") {
            await ctx.reply(
                "This order cannot be cancelled while Privy status is unresolved. Check status instead; no swap will be resent.",
                this.orderExecutionKeyboard(orderId, true)
            );
            return;
        }
        if (existing?.status === "executed") {
            await ctx.reply(
                "This order already executed and cannot be cancelled.",
                this.orderExecutionKeyboard(orderId, false)
            );
            return;
        }

        const order = this.store.cancelPendingOrder(user, orderId);
        if (!order) {
            await ctx.reply("Order ticket not found.");
            return;
        }

        await ctx.reply(
            ["Order cancelled.", ...this.orderSummaryLines(order)].join("\n")
        );
    }

    private executionModeLabel(): string {
        if (!this.config.tradingEnabled) return "disabled";
        if (this.config.dryRun) return "dry-run";
        return "ftx-routed";
    }

    private watchlistText(user: TradingUser): string {
        if (user.watchlist.length === 0) {
            return "Your watchlist is empty. Paste a token mint and tap Watch.";
        }

        return [
            "Watchlist",
            ...user.watchlist.map(
                (mint, index) => `${index + 1}. ${shortAddress(mint)}`
            ),
        ].join("\n");
    }

    private referralSummaryLines(user: TradingUser): string[] {
        const summary = user.referralSummary;
        const referralCode = summary?.referralCode ?? user.referralCode;
        if (!referralCode) {
            return [
                "Referral code: pending",
                "FTX/FrogX has not returned a referral code yet.",
            ];
        }

        return [
            `Code: ${referralCode}`,
            `Invite command: /start ${referralCode}`,
            `Referred users: ${summary?.referredUsers ?? 0}`,
            `Reward status: ${summary?.rewardStatus ?? "tracking_only"}`,
            "Claimable rewards: none",
            user.referredByCode
                ? `Your referrer: ${user.referredByCode}`
                : "Your referrer: none",
            "",
            "Rewards are tracking-only right now. FTX/FrogX has not enabled fee-share, token payout, claimable balance, signing, or transfer from this flow.",
            ...(summary?.warnings ?? []).map(
                (warning) => `Warning: ${warning}`
            ),
        ];
    }

    private activityEventLines(event: ActivityEvent, index: number): string[] {
        const label = activityEventLabel(event.eventType);
        const detail = activityEventDetail(event);
        return [
            `${index + 1}. ${label}`,
            detail ? `   ${detail}` : undefined,
            `   ${event.createdAt}`,
        ].filter((line): line is string => Boolean(line));
    }

    private hiddenTokensText(user: TradingUser): string {
        if (user.hiddenTokens.length === 0) {
            return "Your hidden-token list is empty. Use /hide <mint> to hide noisy positions.";
        }

        return [
            "Hidden tokens",
            ...user.hiddenTokens.map(
                (mint, index) => `${index + 1}. ${shortAddress(mint)}`
            ),
        ].join("\n");
    }

    private accountDashboardLines(
        user: TradingUser,
        sourceLabel: string,
        ftxUpdatedAt?: string
    ): string[] {
        const wallet = user.solanaWalletAddress
            ? shortAddress(user.solanaWalletAddress)
            : "not linked";
        const walletSource =
            user.walletSource === "privy"
                ? "FTX Privy-managed"
                : user.walletSource === "external"
                  ? "quote-only external"
                  : "not set";
        const access = user.botAccessRevokedAt
            ? `revoked ${user.botAccessRevokedAt}`
            : "active";
        const claim = user.walletClaimRequestedAt
            ? `requested ${user.walletClaimRequestedAt}`
            : "not requested";
        const exportRequest = user.walletExportRequestedAt
            ? `requested ${user.walletExportRequestedAt}`
            : "not requested";

        return [
            "Ribbot account",
            `Source: ${sourceLabel}`,
            `Telegram ID: ${user.telegramUserId}`,
            `Username: ${user.username || "unknown"}`,
            `Wallet: ${wallet}`,
            `Wallet source: ${walletSource}`,
            `Wallet slots: ${user.wallets?.length ?? (user.solanaWalletAddress ? 1 : 0)}`,
            `Bot access: ${access}`,
            `Claim handoff: ${claim}`,
            `Export handoff: ${exportRequest}`,
            "",
            "Settings",
            `Interface: ${user.settings.botMode}`,
            `Default buy: ${user.settings.defaultBuySol} SOL`,
            `Buy presets: ${user.settings.buyPresetsSol.join(", ")} SOL`,
            `Sell presets: ${user.settings.sellPresetsPercent.join(", ")}%`,
            `Slippage: ${user.settings.slippageBps / 100}%`,
            `Priority fee: ${user.settings.priorityFeeLamports} lamports`,
            `Sell priority fee: ${user.settings.sellPriorityFeeLamports} lamports`,
            `Confirm trades: ${user.settings.confirmTrades ? "on" : "off"}`,
            `Sell protection: ${user.settings.sellProtection ? "on" : "off"}`,
            `MEV protection: ${user.settings.mevProtection ? "on" : "off"}`,
            `Auto buy: ${user.settings.autoBuyEnabled ? "on" : "off"}`,
            `Instant CA buy: ${user.settings.instantAutoBuyEnabled ? `${user.settings.instantAutoBuyAmountSol} SOL` : "off"}`,
            `Instant CA minimum liquidity: ${formatUsd(user.settings.instantAutoBuyMinLiquidityUsd)}`,
            `Instant CA maximum market cap: ${formatUsd(user.settings.instantAutoBuyMaxMarketCapUsd)}`,
            `Auto sell: ${user.settings.autoSellEnabled ? "on" : "off"}`,
            `Sniper: ${user.settings.sniperEnabled ? "on" : "off"}`,
            "",
            "Saved lists",
            `Watchlist: ${user.watchlist.length}`,
            `Hidden tokens: ${user.hiddenTokens.length}`,
            `Referral code: ${user.referralCode ?? "pending"}`,
            ftxUpdatedAt ? `FTX updated: ${ftxUpdatedAt}` : undefined,
            `Local cache updated: ${user.updatedAt}`,
        ].filter((line): line is string => Boolean(line));
    }

    private orderSummaryLines(order: PendingOrder): string[] {
        return [
            `Order: ${order.id}`,
            `Status: ${order.status}`,
            `Side: ${order.side}`,
            `Token: ${shortAddress(order.mint)}`,
            `Amount: ${order.amountLabel}`,
            `Wallet: ${shortAddress(order.walletAddress)}`,
            order.reconciliation
                ? `Execution check: ${order.reconciliation.status} at ${order.reconciliation.checkedAt}`
                : undefined,
            ...this.manualReviewSummaryLines(order.reconciliation),
        ].filter((line): line is string => Boolean(line));
    }

    private withdrawalTicketSummaryLines(ticket: WithdrawalTicket): string[] {
        return [
            `Ticket: ${ticket.id}`,
            `Status: ${ticket.status}`,
            `Asset: ${ticket.assetType === "sol" ? "SOL" : shortAddress(ticket.mint)}`,
            `Amount: ${ticket.amountLabel}`,
            `From: ${shortAddress(ticket.walletAddress)}`,
            `To: ${shortAddress(ticket.destinationAddress)}`,
            ticket.reconciliation
                ? `Execution check: ${ticket.reconciliation.status} at ${ticket.reconciliation.checkedAt}`
                : undefined,
            ...this.manualReviewSummaryLines(ticket.reconciliation),
        ].filter((line): line is string => Boolean(line));
    }

    private manualReviewSummaryLines(review?: ManualReviewDisplay): string[] {
        if (!review) return [];
        const required =
            review.manualReviewRequired ||
            Boolean(review.manualReviewRequiredAt);
        const lines: string[] = [];
        if (required) {
            lines.push(
                review.manualReviewRequiredAt
                    ? `Manual review: required since ${review.manualReviewRequiredAt}`
                    : "Manual review: required"
            );
        } else if (review.manualReviewAfter) {
            lines.push(
                `Manual review deadline: ${review.manualReviewAfter} if still unresolved`
            );
        }
        if (review.manualReviewReason) {
            lines.push(`Review reason: ${review.manualReviewReason}`);
        }
        return lines;
    }

    private manualReviewRecoveryLine(
        review?: ManualReviewDisplay
    ): string | undefined {
        if (!review?.manualReviewRequired && !review?.manualReviewRequiredAt) {
            return undefined;
        }
        return "Keep this execution locked. Do not confirm, cancel, or retry it; inspect the execution record in FTX and Privy.";
    }

    private advancedMonitorSummaryLines(
        monitor?: AdvancedAutomationMonitor
    ): string[] {
        if (!monitor) return [];
        const lines: string[] = [];
        if (monitor.executedCount !== undefined) {
            lines.push(`Executions: ${monitor.executedCount}`);
        }
        if (monitor.reconciliationStatus) {
            lines.push(`Privy status: ${monitor.reconciliationStatus}`);
        } else if (
            monitor.executionStartedAt &&
            !monitor.executionCompletedAt
        ) {
            lines.push("Privy status: awaiting reconciliation");
        }
        if (monitor.executionSignature) {
            lines.push(
                `Signature: ${shortAddress(monitor.executionSignature)}`
            );
        }
        if (monitor.reconciliationCheckedAt) {
            lines.push(`Checked: ${monitor.reconciliationCheckedAt}`);
        }
        lines.push(...this.manualReviewSummaryLines(monitor));
        if (monitor.lastError) {
            lines.push(`Execution note: ${monitor.lastError}`);
        }
        return lines;
    }

    private copyTradeSummaryLines(config: CopyTradeConfig): string[] {
        const lines = [
            `Config: ${config.id}`,
            ...(config.tag ? [`Tag: ${config.tag}`] : []),
            `Status: ${config.status}`,
            `Target: ${shortAddress(config.targetWallet)}`,
            `Sizing: ${config.amountLabel}`,
            `Min liquidity: $${config.minLiquidityUsd}`,
            `Copy sells: ${config.copySells ? "yes" : "no"}`,
            `Duplicate buys: ${config.duplicateBuys ? "yes" : "no"}`,
            `Only renounced: ${config.onlyRenounced ? "yes" : "no"}`,
            `Exclude Pump bonding curve: ${config.excludePumpFunTokens ? "yes" : "no"}`,
            `Slippage: ${config.slippageBps / 100}%`,
            `Fees: buy ${config.priorityFeeLamports} / sell ${config.sellPriorityFeeLamports} lamports`,
        ];
        if (config.minTargetBuyAmountIn) {
            lines.push(
                `Min target buy: ${lamportsToSol(config.minTargetBuyAmountIn)} SOL`
            );
        }
        if (config.minMarketCapUsd) {
            lines.push(`Min market cap: $${config.minMarketCapUsd}`);
        }
        if (config.maxMarketCapUsd) {
            lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
        }
        if (config.blacklistMints.length > 0) {
            lines.push(`Blacklist: ${config.blacklistMints.length} tokens`);
        }
        if (config.monitor?.lastObservedMint) {
            lines.push(
                `Last launch: ${config.monitor.launchSymbol ?? shortAddress(config.monitor.lastObservedMint)}`
            );
        }
        if (config.monitor?.launchpad) {
            lines.push(`Launchpad: ${config.monitor.launchpad}`);
        }
        if (config.monitor?.launchLiquidityUsd !== undefined) {
            lines.push(
                `Launch liquidity: $${config.monitor.launchLiquidityUsd.toLocaleString()}`
            );
        }
        if (config.monitor?.launchMarketCapUsd !== undefined) {
            lines.push(
                `Launch market cap: $${config.monitor.launchMarketCapUsd.toLocaleString()}`
            );
        }
        if (config.monitor?.launchOrganicScore !== undefined) {
            lines.push(`Organic score: ${config.monitor.launchOrganicScore}`);
        }
        lines.push(...this.advancedMonitorSummaryLines(config.monitor));
        return lines;
    }

    private sniperSummaryLines(config: SniperConfig): string[] {
        const lines = [
            `Config: ${config.id}`,
            `Status: ${config.status}`,
            `Source: ${config.source}`,
            `Max buy: ${config.amountLabel}`,
            `Min liquidity: $${config.minLiquidityUsd}`,
            `Max snipes: ${config.maxSnipes}`,
            `Slippage: ${config.slippageBps / 100}%`,
        ];
        if (config.maxMarketCapUsd) {
            lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
        }
        lines.push(...this.advancedMonitorSummaryLines(config.monitor));
        return lines;
    }

    private autoBuySummaryLines(config: AutoBuyConfig): string[] {
        const lines = [
            `Rule: ${config.id}`,
            `Status: ${config.status}`,
            `Token: ${shortAddress(config.mint)}`,
            `Max buy: ${config.amountLabel}`,
            `Min liquidity: $${config.minLiquidityUsd}`,
            `Slippage: ${config.slippageBps / 100}%`,
        ];
        if (config.maxMarketCapUsd) {
            lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
        }
        lines.push(...this.advancedMonitorSummaryLines(config.monitor));
        return lines;
    }

    private bundleBuySummaryLines(config: BundleBuyConfig): string[] {
        const lines = [
            `Basket: ${config.id}`,
            `Status: ${config.status}`,
            `Tokens: ${config.items.length}`,
            `Max total: ${config.amountLabel}`,
            `Min liquidity: $${config.minLiquidityUsd}`,
            `Slippage: ${config.slippageBps / 100}%`,
            ...config.items
                .slice(0, 5)
                .map(
                    (item, index) =>
                        `${index + 1}. ${shortAddress(item.mint)} - ${item.amountLabel}`
                ),
        ];
        if (config.items.length > 5) {
            lines.push(`...and ${config.items.length - 5} more tokens`);
        }
        if (config.maxMarketCapUsd) {
            lines.push(`Max market cap: $${config.maxMarketCapUsd}`);
        }
        if (config.execution) {
            lines.push(
                `Execution: ${config.execution.confirmedItems}/${config.execution.totalItems} confirmed (${config.execution.attemptedItems} attempted)`,
                `Checked: ${config.execution.checkedAt}`
            );
            if (config.execution.error) {
                lines.push(`Execution note: ${config.execution.error}`);
            }
            lines.push(...this.manualReviewSummaryLines(config.execution));
        }
        return lines;
    }

    private bundleExecutionRecord(
        result: {
            attemptedItems?: number;
            confirmedItems?: number;
            totalItems?: number;
            executions?: BundleBuyExecutionItem[];
            checkedAt?: string;
            executedAt?: string;
            error?: string;
            manualReviewRequired?: boolean;
            manualReviewAfter?: string | null;
            manualReviewRequiredAt?: string | null;
            manualReviewReason?: string | null;
        },
        fallbackTotalItems: number
    ): NonNullable<BundleBuyConfig["execution"]> {
        const executions = result.executions ?? [];
        return {
            attemptedItems: result.attemptedItems ?? executions.length,
            confirmedItems: result.confirmedItems ?? executions.length,
            totalItems: result.totalItems ?? fallbackTotalItems,
            checkedAt:
                result.checkedAt ??
                result.executedAt ??
                new Date().toISOString(),
            error: result.error,
            manualReviewRequired: result.manualReviewRequired,
            manualReviewAfter: result.manualReviewAfter,
            manualReviewRequiredAt: result.manualReviewRequiredAt,
            manualReviewReason: result.manualReviewReason,
            executions,
        };
    }

    private bundleBuyExecutionLine(
        item: BundleBuyExecutionItem,
        index: number
    ): string {
        return [
            `${index + 1}. ${shortAddress(item.mint)}`,
            `${lamportsToSol(item.amountIn).toFixed(4)} SOL`,
            item.signature ? `sig ${shortAddress(item.signature)}` : undefined,
        ]
            .filter(Boolean)
            .join(" ");
    }

    private autoSellSummaryLines(config: AutoSellConfig): string[] {
        const lines = [
            `Rule: ${config.id}`,
            `Status: ${config.status}`,
            `Token: ${shortAddress(config.mint)}`,
            `Sell: ${config.amountLabel}`,
            `Slippage: ${config.slippageBps / 100}%`,
        ];
        if (config.triggerPrice && config.triggerDirection) {
            lines.push(
                `Trigger: ${config.triggerDirection} $${config.triggerPrice}`
            );
        }
        lines.push(...this.advancedMonitorSummaryLines(config.monitor));
        return lines;
    }

    private syncStoredAutomationOrder(
        user: TradingUser,
        stored: StoredScheduledOrder
    ): AutomationOrder {
        return this.store.upsertAutomationOrder(user, {
            id: stored.orderId,
            kind: stored.kind,
            side: stored.side,
            status: stored.status,
            mint: stored.mint,
            inMint: stored.inMint,
            outMint: stored.outMint,
            amountIn: stored.amountIn,
            amountLabel: stored.amountLabel ?? stored.amountIn,
            walletAddress: stored.walletAddress,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            triggerPrice: stored.triggerPrice,
            triggerDirection: stored.triggerDirection,
            orderCount: stored.orderCount,
            intervalMinutes: stored.intervalMinutes,
            perOrderAmountIn: stored.perOrderAmountIn,
            trailingBps: stored.trailingBps,
            scheduler: stored.scheduler,
        });
    }

    private syncStoredCopyTradeConfig(
        user: TradingUser,
        stored: StoredCopyTradeConfig
    ): CopyTradeConfig {
        return this.store.upsertCopyTradeConfig(user, {
            id: stored.configId,
            status: stored.status,
            tag: stored.tag,
            targetWallet: stored.targetWallet,
            walletAddress: stored.walletAddress,
            buyMode: stored.buyMode ?? "percentage",
            buyPercentageBps: stored.buyPercentageBps ?? 10_000,
            maxBuyAmountIn: stored.maxBuyAmountIn,
            amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            sellPriorityFeeLamports:
                stored.sellPriorityFee ?? stored.priorityFee,
            copySells: stored.copySells,
            duplicateBuys: stored.duplicateBuys ?? true,
            onlyRenounced: stored.onlyRenounced ?? false,
            excludePumpFunTokens: stored.excludePumpFunTokens ?? false,
            minTargetBuyAmountIn: stored.minTargetBuyAmountIn,
            minLiquidityUsd: stored.minLiquidityUsd,
            minMarketCapUsd: stored.minMarketCapUsd,
            maxMarketCapUsd: stored.maxMarketCapUsd,
            blacklistMints: [...(stored.blacklistMints ?? [])],
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            monitor: stored.monitor,
        });
    }

    private syncStoredSniperConfig(
        user: TradingUser,
        stored: StoredSniperConfig
    ): SniperConfig {
        return this.store.upsertSniperConfig(user, {
            id: stored.configId,
            status: stored.status,
            source: stored.source,
            walletAddress: stored.walletAddress,
            maxBuyAmountIn: stored.maxBuyAmountIn,
            amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            minLiquidityUsd: stored.minLiquidityUsd,
            maxMarketCapUsd: stored.maxMarketCapUsd,
            maxSnipes: stored.maxSnipes,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            monitor: stored.monitor,
        });
    }

    private syncStoredAutoBuyConfig(
        user: TradingUser,
        stored: StoredAutoBuyConfig
    ): AutoBuyConfig {
        return this.store.upsertAutoBuyConfig(user, {
            id: stored.configId,
            status: stored.status,
            mint: stored.mint,
            walletAddress: stored.walletAddress,
            maxBuyAmountIn: stored.maxBuyAmountIn,
            amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            minLiquidityUsd: stored.minLiquidityUsd,
            maxMarketCapUsd: stored.maxMarketCapUsd,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            monitor: stored.monitor,
        });
    }

    private syncStoredBundleBuyConfig(
        user: TradingUser,
        stored: StoredBundleBuyConfig
    ): BundleBuyConfig {
        const items = (stored.bundleItems ?? stored.items ?? []).map(
            (item) => ({
                mint: item.mint,
                maxBuyAmountIn: item.maxBuyAmountIn,
                amountLabel: item.amountLabel ?? item.maxBuyAmountIn,
            })
        );
        const cached = this.store
            .listBundleBuyConfigs(user)
            .find((config) => config.id === stored.configId);
        const monitor = stored.monitor;
        const hasExecutionState =
            stored.status === "executing" ||
            stored.status === "failed" ||
            stored.status === "executed";
        const execution = hasExecutionState
            ? {
                  attemptedItems:
                      monitor?.bundleAttemptedItems ??
                      cached?.execution?.attemptedItems ??
                      0,
                  confirmedItems:
                      monitor?.bundleConfirmedItems ??
                      cached?.execution?.confirmedItems ??
                      0,
                  totalItems: items.length,
                  checkedAt:
                      monitor?.reconciliationCheckedAt ??
                      monitor?.executionCompletedAt ??
                      monitor?.executionStartedAt ??
                      stored.updatedAt,
                  error: monitor?.lastError,
                  manualReviewRequired: Boolean(
                      monitor?.manualReviewRequiredAt
                  ),
                  manualReviewAfter: monitor?.manualReviewAfter,
                  manualReviewRequiredAt: monitor?.manualReviewRequiredAt,
                  manualReviewReason: monitor?.manualReviewReason,
                  executions: cached?.execution?.executions ?? [],
              }
            : undefined;
        return this.store.upsertBundleBuyConfig(user, {
            id: stored.configId,
            status: stored.status,
            items,
            walletAddress: stored.walletAddress,
            maxBuyAmountIn: stored.maxBuyAmountIn,
            amountLabel: stored.amountLabel ?? stored.maxBuyAmountIn,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            minLiquidityUsd: stored.minLiquidityUsd,
            maxMarketCapUsd: stored.maxMarketCapUsd,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            ...(execution ? { execution } : {}),
        });
    }

    private syncStoredAutoSellConfig(
        user: TradingUser,
        stored: StoredAutoSellConfig
    ): AutoSellConfig {
        return this.store.upsertAutoSellConfig(user, {
            id: stored.configId,
            status: stored.status,
            mint: stored.mint,
            walletAddress: stored.walletAddress,
            sellBps: stored.sellBps,
            amountLabel: stored.amountLabel ?? `${stored.sellBps / 100}%`,
            slippageBps: stored.slippageBps,
            priorityFeeLamports: stored.priorityFee,
            triggerPrice: stored.triggerPrice,
            triggerDirection: stored.triggerDirection,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            validation: stored.validation,
            monitor: stored.monitor,
        });
    }

    private automationOrderTitle(order: AutomationOrder): string {
        return `${order.kind.toUpperCase()} ${order.side} ${shortAddress(order.mint)}`;
    }

    private automationOrderSummaryLines(order: AutomationOrder): string[] {
        const lines = [
            `Order: ${order.id}`,
            `Status: ${order.status}`,
            `Token: ${shortAddress(order.mint)}`,
            `Amount: ${order.amountLabel}`,
            `Wallet: ${shortAddress(order.walletAddress)}`,
            `Slippage: ${order.slippageBps / 100}%`,
        ];

        if (order.kind === "limit") {
            lines.push(
                `Trigger: ${order.triggerDirection ?? "unknown"} ${order.triggerPrice ?? "unknown"}`
            );
        }
        if (order.kind === "stop") {
            lines.push(
                `Stop trigger: ${order.triggerDirection ?? "unknown"} ${order.triggerPrice ?? "unknown"}`
            );
        }
        if (order.kind === "trailing") {
            lines.push(`Trail: ${formatBps(order.trailingBps)} from peak`);
        }
        if (order.kind === "dca") {
            lines.push(
                `Schedule: ${order.orderCount ?? "?"} orders every ${order.intervalMinutes ?? "?"} minutes`
            );
            if (order.scheduler?.executedCount !== undefined) {
                lines.push(
                    `Progress: ${order.scheduler.executedCount}/${order.orderCount ?? "?"} slices executed`
                );
            }
            if (order.scheduler?.nextRunAt && order.status === "staged") {
                lines.push(`Next slice: ${order.scheduler.nextRunAt}`);
            }
            if (order.perOrderAmountIn) {
                lines.push(
                    `Per order: ${order.perOrderAmountIn} raw input units`
                );
            }
        }
        if (order.scheduler?.lastPriceUsd !== undefined) {
            lines.push(
                `Last price: ${formatUsd(order.scheduler.lastPriceUsd)}`
            );
        }
        if (order.scheduler?.executionSignature) {
            lines.push(
                `Signature: ${shortAddress(order.scheduler.executionSignature)}`
            );
        }
        if (order.scheduler?.reconciliationStatus) {
            lines.push(
                `Reconciliation: ${order.scheduler.reconciliationStatus}`
            );
        }
        lines.push(...this.manualReviewSummaryLines(order.scheduler));
        if (order.scheduler?.lastError) {
            lines.push(`Error: ${order.scheduler.lastError}`);
        }

        return lines;
    }
}

function findMint(values: string[]): string | undefined {
    return values.find(isSolanaMint);
}

function parseSettingsIntent(
    args: string[]
): Extract<ParsedIntent, { kind: "settings" }> {
    const field = settingsFieldValue(args[0]);
    return {
        kind: "settings",
        field,
        value: args[1],
        values: args.slice(1),
    };
}

function parseWatchlistIntent(
    command: string,
    args: string[]
): Extract<ParsedIntent, { kind: "watchlist" }> {
    if (command === "/watch") {
        return { kind: "watchlist", action: "add", mint: findMint(args) };
    }

    const rawAction = args[0]?.toLowerCase();
    const action =
        rawAction === "add" || rawAction === "remove" ? rawAction : "list";
    return {
        kind: "watchlist",
        action,
        mint: findMint(args),
    };
}

function settingsFieldValue(
    value?: string
): Extract<ParsedIntent, { kind: "settings" }>["field"] {
    const normalized = value?.toLowerCase();
    if (normalized === "slippage" || normalized === "slip") return "slippage";
    if (
        normalized === "priority" ||
        normalized === "priorityfee" ||
        normalized === "fee"
    ) {
        return "priority";
    }
    if (
        normalized === "sellpriority" ||
        normalized === "sellfee" ||
        normalized === "sellgas"
    ) {
        return "sellPriority";
    }
    if (
        normalized === "defaultbuy" ||
        normalized === "default" ||
        normalized === "buy"
    ) {
        return "defaultBuy";
    }
    if (normalized === "buypresets" || normalized === "buypreset") {
        return "buyPresets";
    }
    if (normalized === "sellpresets" || normalized === "sellpreset") {
        return "sellPresets";
    }
    if (normalized === "mode" || normalized === "botmode") return "mode";
    if (normalized === "confirm" || normalized === "confirmtrades")
        return "confirm";
    if (normalized === "sellprotection" || normalized === "protect") {
        return "sellProtection";
    }
    if (normalized === "autobuy") return "autoBuy";
    if (normalized === "autosell") return "autoSell";
    if (normalized === "sniper" || normalized === "snipe") return "sniper";
    if (normalized === "mev" || normalized === "protection") return "mev";
    return undefined;
}

function settingsUpdateFromIntent(
    intent: Extract<ParsedIntent, { kind: "settings" }>
): Partial<TradingUser["settings"]> | null {
    if (!intent.field || intent.value === undefined) return null;

    if (intent.field === "slippage") {
        const percent = numberFromValue(intent.value);
        return percent ? { slippageBps: Math.round(percent * 100) } : null;
    }
    if (intent.field === "priority") {
        const lamports = nonNegativeNumberFromValue(intent.value);
        return lamports !== undefined
            ? { priorityFeeLamports: Math.round(lamports) }
            : null;
    }
    if (intent.field === "sellPriority") {
        const lamports = nonNegativeNumberFromValue(intent.value);
        return lamports !== undefined
            ? { sellPriorityFeeLamports: Math.round(lamports) }
            : null;
    }
    if (intent.field === "defaultBuy") {
        const amountSol = numberFromValue(intent.value);
        return amountSol ? { defaultBuySol: amountSol } : null;
    }
    if (intent.field === "buyPresets") {
        const presets = (intent.values ?? []).map(numberFromValue);
        if (
            presets.length < 2 ||
            presets.length > 4 ||
            presets.some((value) => value === undefined)
        ) {
            return null;
        }
        const values = presets as number[];
        return new Set(values).size === values.length
            ? { buyPresetsSol: values }
            : null;
    }
    if (intent.field === "sellPresets") {
        const presets = (intent.values ?? []).map(numberFromValue);
        if (
            presets.length < 2 ||
            presets.length > 4 ||
            presets.some((value) => value === undefined || value > 100)
        ) {
            return null;
        }
        const values = presets as number[];
        return new Set(values).size === values.length
            ? { sellPresetsPercent: values }
            : null;
    }
    if (intent.field === "mode") {
        const mode = intent.value.toLowerCase();
        if (mode !== "simple" && mode !== "advanced") return null;
        return {
            botMode: mode,
            ...(mode === "simple" ? { confirmTrades: false } : {}),
        };
    }

    const enabled = parseToggleValue(intent.value);
    if (enabled === undefined) return null;
    if (intent.field === "confirm") return { confirmTrades: enabled };
    if (intent.field === "sellProtection") {
        return { sellProtection: enabled };
    }
    if (intent.field === "autoBuy") return { autoBuyEnabled: enabled };
    if (intent.field === "autoSell") return { autoSellEnabled: enabled };
    if (intent.field === "sniper") return { sniperEnabled: enabled };
    if (intent.field === "mev") return { mevProtection: enabled };
    return null;
}

function parseWithdrawalIntent(
    args: string[]
): Extract<ParsedIntent, { kind: "withdraw" }> {
    const destinationAddress = findLastSolanaAddress(args.slice(1));
    return {
        kind: "withdraw",
        asset: args[0],
        amount: args[1],
        destinationAddress,
    };
}

function controlUrlWithTelegramId(
    controlUrl: string,
    telegramUserId: string
): string {
    try {
        const url = new URL(controlUrl);
        url.searchParams.set("telegramUserId", telegramUserId);
        return url.toString();
    } catch {
        const separator = controlUrl.includes("?") ? "&" : "?";
        return `${controlUrl}${separator}telegramUserId=${encodeURIComponent(telegramUserId)}`;
    }
}

function hasCopyTradeEditPatch(
    intent: Extract<ParsedIntent, { kind: "copytrade" }>
): boolean {
    return [
        intent.tag,
        intent.targetWallet,
        intent.buyMode,
        intent.buyPercentage,
        intent.maxBuySol,
        intent.minTargetBuySol,
        intent.minLiquidityUsd,
        intent.minMarketCapUsd,
        intent.maxMarketCapUsd,
        intent.copySells,
        intent.duplicateBuys,
        intent.onlyRenounced,
        intent.excludePumpFunTokens,
        intent.blacklistMints,
        intent.slippageBps,
        intent.priorityFeeLamports,
        intent.sellPriorityFeeLamports,
    ].some((value) => value !== undefined);
}

function parseSniperIntent(
    args: string[]
): Extract<ParsedIntent, { kind: "sniper" }> {
    if (args[0]?.toLowerCase() !== "add") {
        return { kind: "sniper", action: "list" };
    }

    const source = sniperSourceValue(args[1]);
    const numbers = args.slice(2).map(numberFromValue).filter(isNumber);
    return {
        kind: "sniper",
        action: "add",
        source,
        maxBuySol: numbers[0],
        minLiquidityUsd: numbers[1],
        maxSnipes: numbers[2],
        maxMarketCapUsd: numbers[3],
    };
}

function parseBundleBuyIntent(
    args: string[]
): Extract<ParsedIntent, { kind: "bundleBuy" }> {
    if (args[0]?.toLowerCase() !== "add") {
        return { kind: "bundleBuy", action: "list" };
    }

    const values = args.slice(1);
    const consumed = new Set<number>();
    const items: Array<{ mint: string; amountSol: number }> = [];
    for (let index = 0; index < values.length; index += 1) {
        const mint = values[index];
        const amountSol = numberFromValue(values[index + 1]);
        if (isSolanaMint(mint) && isNumber(amountSol)) {
            items.push({ mint, amountSol });
            consumed.add(index);
            consumed.add(index + 1);
            index += 1;
        }
    }

    const filterNumbers = values
        .map((value, index) =>
            consumed.has(index) ? undefined : numberFromValue(value)
        )
        .filter(isNumber);

    return {
        kind: "bundleBuy",
        action: "add",
        items,
        minLiquidityUsd: filterNumbers[0],
        maxMarketCapUsd: filterNumbers[1],
    };
}

function parseAutoSellIntent(
    args: string[]
): Extract<ParsedIntent, { kind: "autoSell" }> {
    if (args[0]?.toLowerCase() !== "add") {
        return { kind: "autoSell", action: "list" };
    }

    const mint = findMint(args.slice(1));
    const triggerDirection = findTriggerDirection(args);
    const numbers = findNumbersAfterMint(args, mint);
    return {
        kind: "autoSell",
        action: "add",
        mint,
        sellPercent: numbers[0],
        triggerDirection,
        triggerPrice: findTriggerPrice(args, triggerDirection),
    };
}

function findSolanaAddress(values: string[]): string | undefined {
    return values.find(isSolanaAddress);
}

function findLastSolanaAddress(values: string[]): string | undefined {
    return [...values].reverse().find(isSolanaAddress);
}

function findNumber(values: string[]): number | undefined {
    const found = values.map(numberFromValue).find(isNumber);
    return found;
}

function parseOrderSide(value?: string): ScheduledOrderSide | undefined {
    const normalized = value?.toLowerCase();
    if (normalized === "buy" || normalized === "sell") return normalized;
    return undefined;
}

function findTriggerDirection(values: string[]): TriggerDirection | undefined {
    const found = values
        .map((value) => value.toLowerCase())
        .find((value) => value === "above" || value === "below");
    return found as TriggerDirection | undefined;
}

function findTriggerPrice(
    values: string[],
    direction?: TriggerDirection
): string | undefined {
    if (!direction) return undefined;
    const directionIndex = values.findIndex(
        (value) => value.toLowerCase() === direction
    );
    if (directionIndex < 0) return undefined;
    return findDecimalString(values.slice(directionIndex + 1));
}

function findAmountBeforeTrigger(
    values: string[],
    direction?: TriggerDirection
): number | undefined {
    if (!direction) return findNumber(values);
    const directionIndex = values.findIndex(
        (value) => value.toLowerCase() === direction
    );
    return findNumber(
        values.slice(0, directionIndex >= 0 ? directionIndex : values.length)
    );
}

function findNumbersAfterMint(values: string[], mint?: string): number[] {
    const start = mint ? values.indexOf(mint) + 1 : 0;
    return values
        .slice(Math.max(start, 0))
        .map(numberFromValue)
        .filter((value): value is number => value !== undefined);
}

function numberFromValue(value: string): number | undefined {
    const parsed = Number(value.replace(/%$/, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function nonNegativeNumberFromValue(value: string): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function chunkButtons<T>(buttons: T[]): T[][] {
    const rows: T[][] = [];
    for (let index = 0; index < buttons.length; index += 2) {
        rows.push(buttons.slice(index, index + 2));
    }
    return rows;
}

function formatPresetNumber(value: number): string {
    return value.toString();
}

function automationKindLabel(kind: ScheduledOrderKind): string {
    if (kind === "dca") return "DCA";
    if (kind === "stop") return "Stop-loss";
    if (kind === "trailing") return "Trailing stop";
    return "Limit";
}

function formatBps(value?: number): string {
    if (value === undefined) return "unknown";
    return `${(value / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function parseToggleValue(value: string): boolean | undefined {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return undefined;
}

function isNumber(value: number | undefined): value is number {
    return value !== undefined;
}

function isReferralCode(value?: string): value is string {
    return Boolean(value && /^[A-Z2-9]{6,16}$/i.test(value));
}

function isBotCommand(value?: string): value is string {
    return Boolean(value && /^\/[a-z0-9_]+$/.test(value));
}

function sniperSourceValue(value?: string): SniperSource | undefined {
    const normalized = value?.toLowerCase();
    if (
        normalized === "any" ||
        normalized === "pump" ||
        normalized === "raydium" ||
        normalized === "moonshot"
    ) {
        return normalized;
    }
    return undefined;
}

function findDecimalString(values: string[]): string | undefined {
    for (const value of values) {
        const normalized = value.trim().replace(/,/g, "");
        if (
            /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized) &&
            Number(normalized) > 0
        ) {
            return normalized;
        }
    }
    return undefined;
}

function isSolanaMint(value?: string): value is string {
    if (!value) return false;
    return isSolanaAddress(value) && value !== SOL_MINT;
}

function isSolAlias(value?: string): boolean {
    const normalized = value?.toLowerCase();
    return normalized === "sol" || normalized === "wsol" || value === SOL_MINT;
}

function isSolanaAddress(value?: string): value is string {
    if (!value) return false;
    return SOLANA_ADDRESS_PATTERN.test(value);
}

function isCopyTradeTag(value: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,31}$/.test(value);
}

function shortAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function parseAmountSol(label: string): number {
    const [raw] = label.split(/\s+/);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function lamportsToSol(lamports: string): number {
    return Number(lamports) / 1_000_000_000;
}

function applyPercentage(amount: string, percentage: number): string {
    const basisPoints = Math.floor(
        Math.max(0, Math.min(percentage, 100)) * 100
    );
    return ((BigInt(amount) * BigInt(basisPoints)) / 10_000n).toString();
}

function formatTokenBalance(token: PositionToken): string {
    return token.uiAmountString && token.uiAmountString !== "0"
        ? token.uiAmountString
        : formatRawTokenAmount(token.amount, token.decimals);
}

function formatUsd(value?: number | null): string {
    if (value === undefined || value === null || !Number.isFinite(value)) {
        return "n/a";
    }
    const abs = Math.abs(value);
    const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    })}`;
}

function formatAuthority(authority?: string | null): string {
    return authority ? shortAddress(authority) : "disabled";
}

function formatSignedUsd(value?: number | null): string {
    if (value === undefined || value === null || !Number.isFinite(value)) {
        return "n/a";
    }
    const formatted = formatUsd(Math.abs(value));
    return value > 0
        ? `+${formatted}`
        : value < 0
          ? `-${formatted}`
          : formatted;
}

function formatSignedPct(value?: number | null): string {
    if (value === undefined || value === null || !Number.isFinite(value)) {
        return "n/a";
    }
    const formatted = `${Math.abs(value).toFixed(2)}%`;
    return value > 0
        ? `+${formatted}`
        : value < 0
          ? `-${formatted}`
          : formatted;
}

function activityEventLabel(eventType: string): string {
    const labels: Record<string, string> = {
        wallet_updated: "Wallet updated",
        preference_updated: "Preference updated",
        control_code_created: "Control code created",
        control_session_started: "Control session started",
        control_preference_updated: "Control preference updated",
        wallet_claim_requested: "Wallet claim requested",
        wallet_export_requested: "Wallet export requested",
        bot_access_revoked: "Bot access revoked",
        bot_access_restored: "Bot access restored",
        swap_executed: "Swap executed",
        swap_fill_reconciled: "Swap fill confirmed",
        swap_execution_failed: "Swap execution failed",
        withdrawal_executed: "Withdrawal executed",
        withdrawal_execution_failed: "Withdrawal execution failed",
        automation_order_staged: "Order staged",
        automation_order_cancelled: "Order cancelled",
        automation_order_triggered: "Order trigger observed",
        automation_order_executed: "Scheduled order executed",
        automation_order_failed: "Scheduled order failed",
        automation_order_reconciliation_required:
            "Scheduled order needs reconciliation",
        automation_order_reconciled: "Scheduled order reconciled",
        execution_reconciliation_required: "Execution needs reconciliation",
        execution_manual_review_required: "Execution needs manual review",
        execution_manual_review_acknowledged: "Manual review acknowledged",
        execution_manual_review_resolved: "Manual review resolved",
        advanced_automation_config_staged: "Automation config staged",
        advanced_automation_config_cancelled: "Automation config cancelled",
        advanced_automation_config_observed: "Automation monitor observed",
        advanced_automation_config_executed: "Automation config executed",
        advanced_automation_config_failed: "Automation config failed",
        advanced_automation_config_reconciled: "Automation config reconciled",
        referral_applied: "Referral applied",
        referral_received: "Referral received",
    };
    return labels[eventType] ?? eventType.replace(/_/g, " ");
}

function activityEventDetail(event: ActivityEvent): string {
    const metadata = event.metadata ?? {};
    const parts = [
        metadata.kind ? `kind ${metadata.kind}` : undefined,
        metadata.side ? `side ${metadata.side}` : undefined,
        metadata.mint && typeof metadata.mint === "string"
            ? `token ${shortAddress(metadata.mint)}`
            : undefined,
        metadata.orderId ? `order ${metadata.orderId}` : undefined,
        metadata.configId ? `config ${metadata.configId}` : undefined,
        metadata.caseId ? `review ${metadata.caseId}` : undefined,
        metadata.resolution ? `resolution ${metadata.resolution}` : undefined,
        metadata.signature && typeof metadata.signature === "string"
            ? `sig ${shortAddress(metadata.signature)}`
            : undefined,
        metadata.referralCode ? `code ${metadata.referralCode}` : undefined,
        metadata.reason ? String(metadata.reason) : undefined,
    ];
    return parts.filter(Boolean).join(" | ");
}

function formatRawTokenAmount(amount: string, decimals: number): string {
    if (decimals <= 0) return amount;

    const normalized = BigInt(amount)
        .toString()
        .padStart(decimals + 1, "0");
    const whole = normalized.slice(0, -decimals) || "0";
    const fractional = normalized.slice(-decimals).replace(/0+$/, "");
    return fractional ? `${whole}.${fractional}` : whole;
}
