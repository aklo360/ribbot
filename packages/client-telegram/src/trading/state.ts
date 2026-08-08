import fs from "fs";
import path from "path";

export type TradingUserSettings = {
    botMode: "simple" | "advanced";
    confirmTrades: boolean;
    defaultBuySol: number;
    buyPresetsSol: number[];
    sellPresetsPercent: number[];
    slippageBps: number;
    priorityFeeLamports: number;
    sellPriorityFeeLamports: number;
    sellProtection: boolean;
    mevProtection: boolean;
    autoBuyEnabled: boolean;
    instantAutoBuyEnabled: boolean;
    instantAutoBuyAmountSol: number;
    instantAutoBuyMinLiquidityUsd: number;
    instantAutoBuyMaxMarketCapUsd?: number;
    autoSellEnabled: boolean;
    sniperEnabled: boolean;
};

export type PendingOrderSide = "buy" | "sell";

export type PendingOrderStatus =
    | "pending_confirmation"
    | "dry_run"
    | "swap_built"
    | "execution_pending"
    | "execution_failed"
    | "executed"
    | "cancelled";

export type DirectExecutionReconciliation = {
    status:
        | "pending"
        | "not_found"
        | "lookup_error"
        | "failed"
        | "confirmed"
        | "finalized";
    referenceId?: string | null;
    transactionId?: string | null;
    signature?: string | null;
    solscanUrl?: string | null;
    executionStartedAt?: string | null;
    checkedAt: string;
    error?: string;
    manualReviewRequired?: boolean;
    manualReviewAfter?: string | null;
    manualReviewRequiredAt?: string | null;
    manualReviewReason?: string | null;
};

export type PendingOrder = {
    id: string;
    side: PendingOrderSide;
    status: PendingOrderStatus;
    mint: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    amountLabel: string;
    walletAddress: string;
    slippageBps: number;
    priorityFeeLamports: number;
    executionMode?: "instant_auto_buy";
    createdAt: string;
    expiresAt: string;
    quote?: {
        amountOut: string;
        priceImpactBps: number;
        route: string;
        executable: boolean;
        updatedAt: string;
    };
    swapBuild?: {
        mode: string;
        txBase64?: string | null;
        builtAt: string;
    };
    execution?: {
        signature: string;
        transactionId?: string | null;
        referenceId?: string | null;
        solscanUrl?: string | null;
        executedAt: string;
    };
    reconciliation?: DirectExecutionReconciliation;
};

export type AutomationOrderKind = "limit" | "dca" | "stop" | "trailing";
export type AutomationOrderStatus =
    | "staged"
    | "executing"
    | "executed"
    | "failed"
    | "cancelled";
export type TriggerDirection = "above" | "below";

export type AutomationOrder = {
    id: string;
    kind: AutomationOrderKind;
    side: PendingOrderSide;
    status: AutomationOrderStatus;
    mint: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    amountLabel: string;
    walletAddress: string;
    slippageBps: number;
    priorityFeeLamports: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    orderCount?: number;
    intervalMinutes?: number;
    perOrderAmountIn?: string;
    trailingBps?: number;
    scheduler?: {
        lastCheckedAt?: string;
        lastPriceUsd?: number;
        peakPriceUsd?: number;
        nextRunAt?: string;
        executedCount?: number;
        dryRunTriggerCount?: number;
        lastTriggerAt?: string;
        lastTriggerReason?: string;
        lastError?: string;
        executionId?: string;
        executionStartedAt?: string;
        executionCompletedAt?: string;
        executionSignature?: string;
        executionTransactionId?: string;
        executionReferenceId?: string;
        executionSolscanUrl?: string;
        reconciliationCheckedAt?: string;
        reconciliationStatus?:
            | "broadcasted"
            | "confirmed"
            | "execution_reverted"
            | "failed"
            | "replaced"
            | "finalized"
            | "provider_error"
            | "pending"
            | "not_found"
            | "error";
        manualReviewAfter?: string;
        manualReviewRequiredAt?: string;
        manualReviewReason?: string;
    };
};

export type WithdrawalTicketStatus =
    | "staged"
    | "execution_pending"
    | "execution_failed"
    | "executed"
    | "cancelled";

export type WithdrawalTicket = {
    id: string;
    status: WithdrawalTicketStatus;
    mint: string;
    assetType: "sol" | "spl";
    amountIn: string;
    amountLabel: string;
    walletAddress: string;
    destinationAddress: string;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    execution?: {
        signature: string;
        transactionId?: string | null;
        referenceId?: string | null;
        solscanUrl?: string | null;
        executedAt: string;
    };
    reconciliation?: DirectExecutionReconciliation;
};

export type AdvancedConfigStatus =
    | "staged"
    | "paused"
    | "executing"
    | "failed"
    | "cancelled"
    | "executed";

export type AdvancedAutomationMonitor = {
    lastCheckedAt?: string;
    lastMatchedAt?: string;
    lastObservedSignature?: string;
    lastObservedMint?: string;
    lastPriceUsd?: number;
    lastTriggerAt?: string;
    lastTriggerReason?: string;
    matchCount?: number;
    executedCount?: number;
    dryRunTriggerCount?: number;
    executionStartedAt?: string;
    executionCompletedAt?: string;
    executionId?: string;
    executionReferenceId?: string;
    executionSignature?: string;
    executionTransactionId?: string;
    executionSolscanUrl?: string;
    executionAmountIn?: string;
    executionMint?: string;
    executionSide?: "buy" | "sell";
    reconciliationCheckedAt?: string;
    reconciliationStatus?:
        | "broadcasted"
        | "confirmed"
        | "execution_reverted"
        | "failed"
        | "replaced"
        | "finalized"
        | "provider_error"
        | "pending"
        | "not_found"
        | "error";
    manualReviewAfter?: string;
    manualReviewRequiredAt?: string;
    manualReviewReason?: string;
    launchCursorAt?: string;
    launchCursorId?: string;
    launchpad?: string;
    launchName?: string;
    launchSymbol?: string;
    launchLiquidityUsd?: number;
    launchMarketCapUsd?: number;
    launchOrganicScore?: number;
    processedMints?: string[];
    lastError?: string;
};

export type CopyTradeConfig = {
    id: string;
    status: AdvancedConfigStatus;
    tag?: string;
    targetWallet: string;
    walletAddress: string;
    buyMode: "fixed" | "percentage";
    buyPercentageBps: number;
    maxBuyAmountIn: string;
    amountLabel: string;
    slippageBps: number;
    priorityFeeLamports: number;
    sellPriorityFeeLamports: number;
    copySells: boolean;
    duplicateBuys: boolean;
    onlyRenounced: boolean;
    excludePumpFunTokens: boolean;
    minTargetBuyAmountIn?: string;
    minLiquidityUsd: number;
    minMarketCapUsd?: number;
    maxMarketCapUsd?: number;
    blacklistMints: string[];
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: AdvancedAutomationMonitor;
};

export type SniperSource = "any" | "pump" | "raydium" | "moonshot";

export type SniperConfig = {
    id: string;
    status: AdvancedConfigStatus;
    source: SniperSource;
    walletAddress: string;
    maxBuyAmountIn: string;
    amountLabel: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    maxSnipes: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: AdvancedAutomationMonitor;
};

export type AutoBuyConfig = {
    id: string;
    status: AdvancedConfigStatus;
    mint: string;
    walletAddress: string;
    maxBuyAmountIn: string;
    amountLabel: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: AdvancedAutomationMonitor;
};

export type BundleBuyItem = {
    mint: string;
    maxBuyAmountIn: string;
    amountLabel: string;
};

export type BundleBuyConfig = {
    id: string;
    status: AdvancedConfigStatus;
    items: BundleBuyItem[];
    walletAddress: string;
    maxBuyAmountIn: string;
    amountLabel: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    execution?: {
        attemptedItems: number;
        confirmedItems: number;
        totalItems: number;
        checkedAt: string;
        error?: string;
        manualReviewRequired?: boolean;
        manualReviewAfter?: string | null;
        manualReviewRequiredAt?: string | null;
        manualReviewReason?: string | null;
        executions: Array<{
            mint: string;
            amountIn: string;
            signature?: string | null;
            transactionId?: string | null;
            referenceId?: string | null;
            solscanUrl?: string | null;
        }>;
    };
};

export type AutoSellConfig = {
    id: string;
    status: AdvancedConfigStatus;
    mint: string;
    walletAddress: string;
    sellBps: number;
    amountLabel: string;
    slippageBps: number;
    priorityFeeLamports: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: AdvancedAutomationMonitor;
};

export type ReferralSummary = {
    referralCode: string;
    referredByCode?: string;
    referredByTelegramUserId?: string;
    referredUsers: number;
    rewardStatus: "tracking_only";
    claimableRewards: [];
    updatedAt: string;
    warnings: string[];
};

export const ACTIVITY_ALERT_CURSOR_EVENT_LIMIT = 250;

export type ActivityAlertCursor = {
    initializedAt: string;
    seenEventIds: string[];
    lastDeliveredAt?: string;
    consecutiveFailures?: number;
    lastFailureAt?: string;
    nextAttemptAt?: string;
};

export type TradingAccountWallet = {
    walletId: string;
    label: string;
    walletSource: "privy" | "external";
    privyUserId?: string;
    privyWalletId?: string;
    solanaWalletAddress: string;
    createdAt: string;
};

export type FrogTradeTicket = {
    id: string;
    side: "buy" | "sweep" | "sell" | "bulk_sell";
    status:
        | "pending_confirmation"
        | "execution_pending"
        | "partially_executed"
        | "executed"
        | "failed"
        | "cancelled";
    walletAddress: string;
    quantity: number;
    completed: number;
    maximumPaymentLamports?: string;
    expectedMint?: string;
    minimumPaymentLamports?: string;
    mint?: string;
    name?: string;
    mints?: string[];
    names?: string[];
    purchasedMints?: string[];
    signatures: string[];
    currentExecutionId?: string;
    error?: string;
    providerStatus?: number | null;
    providerKind?: "authorization" | "transport" | "http";
    providerCode?: string | null;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
};

export type TradingUser = {
    telegramUserId: string;
    username: string;
    createdAt: string;
    updatedAt: string;
    walletSource?: "privy" | "external";
    privyUserId?: string;
    privyWalletId?: string;
    solanaWalletAddress?: string;
    activeWalletId?: string;
    wallets?: TradingAccountWallet[];
    walletClaimRequestedAt?: string;
    walletExportRequestedAt?: string;
    botAccessRevokedAt?: string;
    watchlist: string[];
    hiddenTokens: string[];
    referralCode?: string;
    referredByCode?: string;
    referredByTelegramUserId?: string;
    referralSummary?: ReferralSummary;
    pendingOrders?: Record<string, PendingOrder>;
    automationOrders?: Record<string, AutomationOrder>;
    withdrawalTickets?: Record<string, WithdrawalTicket>;
    copyTradeConfigs?: Record<string, CopyTradeConfig>;
    sniperConfigs?: Record<string, SniperConfig>;
    autoBuyConfigs?: Record<string, AutoBuyConfig>;
    bundleBuyConfigs?: Record<string, BundleBuyConfig>;
    autoSellConfigs?: Record<string, AutoSellConfig>;
    frogTradeTickets?: Record<string, FrogTradeTicket>;
    activityAlertCursor?: ActivityAlertCursor;
    settings: TradingUserSettings;
};

type StoreShape = {
    users: Record<string, TradingUser>;
};

const defaultStore = (): StoreShape => ({ users: {} });

export type TradingDefaults = {
    confirmTrades: boolean;
    defaultBuySol: number;
    slippageBps: number;
    priorityFeeLamports: number;
};

export type StoredTradingAccountSnapshot = {
    telegramUserId: string;
    username?: string;
    walletSource?: "privy" | "external";
    privyUserId?: string;
    privyWalletId?: string;
    solanaWalletAddress?: string;
    activeWalletId?: string;
    wallets?: TradingAccountWallet[];
    walletClaimRequestedAt?: string;
    walletExportRequestedAt?: string;
    botAccessRevokedAt?: string;
    settings?: {
        slippageBps?: number;
        priorityFee?: number;
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
    };
    watchlist?: string[];
    hiddenTokens?: string[];
    referralCode?: string;
    referredByCode?: string;
    referredByTelegramUserId?: string;
    updatedAt?: string;
};

export class TradingStateStore {
    private readonly filePath: string;
    private state: StoreShape | null = null;

    constructor(filePath: string) {
        this.filePath = path.resolve(process.cwd(), filePath);
    }

    getOrCreateUser(
        telegramUserId: string,
        username: string,
        defaults: TradingDefaults
    ): TradingUser {
        const state = this.load();
        const existing = state.users[telegramUserId];
        const now = new Date().toISOString();

        if (existing) {
            existing.username = username;
            existing.updatedAt = now;
            if (
                (!existing.wallets || existing.wallets.length === 0) &&
                existing.walletSource &&
                existing.solanaWalletAddress
            ) {
                const walletId =
                    existing.walletSource === "privy" && existing.privyWalletId
                        ? existing.privyWalletId
                        : `external:${existing.solanaWalletAddress}`;
                existing.wallets = [
                    {
                        walletId,
                        label:
                            existing.walletSource === "privy"
                                ? "Spot & NFT Wallet (Privy)"
                                : "Portfolio Wallet (Read only)",
                        walletSource: existing.walletSource,
                        ...(existing.privyUserId
                            ? { privyUserId: existing.privyUserId }
                            : {}),
                        ...(existing.privyWalletId
                            ? { privyWalletId: existing.privyWalletId }
                            : {}),
                        solanaWalletAddress: existing.solanaWalletAddress,
                        createdAt: existing.createdAt,
                    },
                ];
                existing.activeWalletId = walletId;
            }
            existing.wallets = cleanAccountWallets(existing.wallets ?? []);
            const managedWallet = existing.wallets.find(
                (wallet) => wallet.walletSource === "privy"
            );
            if (managedWallet) {
                existing.walletSource = "privy";
                existing.privyUserId = managedWallet.privyUserId;
                existing.privyWalletId = managedWallet.privyWalletId;
                existing.solanaWalletAddress =
                    managedWallet.solanaWalletAddress;
                existing.activeWalletId = managedWallet.walletId;
            }
            existing.watchlist ??= [];
            existing.hiddenTokens ??= [];
            existing.referralSummary ??= existing.referralCode
                ? {
                      referralCode: existing.referralCode,
                      referredByCode: existing.referredByCode,
                      referredByTelegramUserId:
                          existing.referredByTelegramUserId,
                      referredUsers: 0,
                      rewardStatus: "tracking_only",
                      claimableRewards: [],
                      updatedAt: existing.updatedAt,
                      warnings: [],
                  }
                : undefined;
            existing.pendingOrders ??= {};
            existing.automationOrders ??= {};
            existing.withdrawalTickets ??= {};
            existing.copyTradeConfigs ??= {};
            for (const config of Object.values(existing.copyTradeConfigs)) {
                config.buyMode ??= "percentage";
                config.buyPercentageBps ??= 10_000;
                config.sellPriorityFeeLamports ??= config.priorityFeeLamports;
                config.duplicateBuys ??= true;
                config.onlyRenounced ??= false;
                config.excludePumpFunTokens ??= false;
                config.blacklistMints = Array.isArray(config.blacklistMints)
                    ? [
                          ...new Set(
                              config.blacklistMints.filter(
                                  (mint): mint is string =>
                                      typeof mint === "string"
                              )
                          ),
                      ].slice(0, 20)
                    : [];
            }
            existing.sniperConfigs ??= {};
            existing.autoBuyConfigs ??= {};
            existing.bundleBuyConfigs ??= {};
            existing.autoSellConfigs ??= {};
            existing.frogTradeTickets ??= {};
            if (existing.activityAlertCursor) {
                existing.activityAlertCursor.seenEventIds =
                    cleanActivityAlertEventIds(
                        existing.activityAlertCursor.seenEventIds
                    );
                existing.activityAlertCursor.consecutiveFailures =
                    cleanNonNegativeInteger(
                        existing.activityAlertCursor.consecutiveFailures
                    );
            }
            existing.settings ??= {
                botMode: "advanced",
                confirmTrades: defaults.confirmTrades,
                defaultBuySol: defaults.defaultBuySol,
                buyPresetsSol: defaultBuyPresets(defaults.defaultBuySol),
                sellPresetsPercent: [25, 50, 75, 100],
                slippageBps: defaults.slippageBps,
                priorityFeeLamports: defaults.priorityFeeLamports,
                sellPriorityFeeLamports: defaults.priorityFeeLamports,
                sellProtection: true,
                mevProtection: true,
                autoBuyEnabled: false,
                instantAutoBuyEnabled: false,
                instantAutoBuyAmountSol: defaults.defaultBuySol,
                instantAutoBuyMinLiquidityUsd: 1000,
                autoSellEnabled: false,
                sniperEnabled: false,
            };
            existing.settings.botMode ??= "advanced";
            existing.settings.buyPresetsSol = cleanBuyPresets(
                existing.settings.buyPresetsSol,
                defaults.defaultBuySol
            );
            existing.settings.sellPresetsPercent = cleanSellPresets(
                existing.settings.sellPresetsPercent
            );
            existing.settings.sellPriorityFeeLamports ??=
                existing.settings.priorityFeeLamports;
            existing.settings.sellProtection ??= true;
            if (existing.settings.botMode === "simple") {
                existing.settings.confirmTrades = false;
            }
            existing.settings.mevProtection ??= true;
            existing.settings.autoBuyEnabled ??= false;
            existing.settings.instantAutoBuyEnabled ??= false;
            existing.settings.instantAutoBuyAmountSol ??=
                existing.settings.defaultBuySol;
            existing.settings.instantAutoBuyMinLiquidityUsd ??= 1000;
            existing.settings.autoSellEnabled ??= false;
            existing.settings.sniperEnabled ??= false;
            this.persist();
            return existing;
        }

        const user: TradingUser = {
            telegramUserId,
            username,
            createdAt: now,
            updatedAt: now,
            watchlist: [],
            hiddenTokens: [],
            pendingOrders: {},
            automationOrders: {},
            withdrawalTickets: {},
            copyTradeConfigs: {},
            sniperConfigs: {},
            autoBuyConfigs: {},
            bundleBuyConfigs: {},
            autoSellConfigs: {},
            frogTradeTickets: {},
            settings: {
                botMode: "advanced",
                confirmTrades: defaults.confirmTrades,
                defaultBuySol: defaults.defaultBuySol,
                buyPresetsSol: defaultBuyPresets(defaults.defaultBuySol),
                sellPresetsPercent: [25, 50, 75, 100],
                slippageBps: defaults.slippageBps,
                priorityFeeLamports: defaults.priorityFeeLamports,
                sellPriorityFeeLamports: defaults.priorityFeeLamports,
                sellProtection: true,
                mevProtection: true,
                autoBuyEnabled: false,
                instantAutoBuyEnabled: false,
                instantAutoBuyAmountSol: defaults.defaultBuySol,
                instantAutoBuyMinLiquidityUsd: 1000,
                autoSellEnabled: false,
                sniperEnabled: false,
            },
        };

        state.users[telegramUserId] = user;
        this.persist();
        return user;
    }

    createFrogTradeTicket(
        user: TradingUser,
        ticket: Omit<
            FrogTradeTicket,
            | "id"
            | "status"
            | "completed"
            | "signatures"
            | "createdAt"
            | "updatedAt"
            | "expiresAt"
        >
    ): FrogTradeTicket {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date();
        const value: FrogTradeTicket = {
            ...ticket,
            id: createOrderId("frog"),
            status: "pending_confirmation",
            completed: 0,
            signatures: [],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
        };
        current.frogTradeTickets ??= {};
        current.frogTradeTickets[value.id] = value;
        current.updatedAt = value.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return value;
    }

    getFrogTradeTicket(
        user: TradingUser,
        ticketId: string
    ): FrogTradeTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return current.frogTradeTickets?.[ticketId];
    }

    updateFrogTradeTicket(
        user: TradingUser,
        ticketId: string,
        update: Partial<Omit<FrogTradeTicket, "id" | "createdAt">>
    ): FrogTradeTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const ticket = current.frogTradeTickets?.[ticketId];
        if (!ticket) return undefined;
        Object.assign(ticket, update, { updatedAt: new Date().toISOString() });
        current.updatedAt = ticket.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return ticket;
    }

    addToWatchlist(user: TradingUser, mint: string): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        if (!current.watchlist.includes(mint)) {
            current.watchlist.push(mint);
            current.updatedAt = new Date().toISOString();
            state.users[user.telegramUserId] = current;
            this.persist();
        }
        return current;
    }

    removeFromWatchlist(user: TradingUser, mint: string): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.watchlist = current.watchlist.filter((entry) => entry !== mint);
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    addHiddenToken(user: TradingUser, mint: string): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        if (!current.hiddenTokens.includes(mint)) {
            current.hiddenTokens.push(mint);
        }
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    removeHiddenToken(user: TradingUser, mint: string): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.hiddenTokens = current.hiddenTokens.filter(
            (entry) => entry !== mint
        );
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    updateSettings(
        user: TradingUser,
        settings: Partial<TradingUserSettings>
    ): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const cleanSettings = Object.fromEntries(
            Object.entries(settings).filter(([, value]) => value !== undefined)
        ) as Partial<TradingUserSettings>;
        current.settings = {
            ...current.settings,
            ...cleanSettings,
        };
        current.settings.buyPresetsSol = cleanBuyPresets(
            current.settings.buyPresetsSol,
            current.settings.defaultBuySol
        );
        current.settings.sellPresetsPercent = cleanSellPresets(
            current.settings.sellPresetsPercent
        );
        if (current.settings.botMode === "simple") {
            current.settings.confirmTrades = false;
        }
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    syncAccountSnapshot(
        user: TradingUser,
        account: StoredTradingAccountSnapshot
    ): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.username = account.username || current.username;
        current.walletSource = account.walletSource ?? current.walletSource;
        if (account.walletSource === "external") {
            delete current.privyUserId;
            delete current.privyWalletId;
        } else {
            current.privyUserId = account.privyUserId ?? current.privyUserId;
            current.privyWalletId =
                account.privyWalletId ?? current.privyWalletId;
        }
        current.solanaWalletAddress =
            account.solanaWalletAddress ?? current.solanaWalletAddress;
        current.activeWalletId =
            account.activeWalletId ?? current.activeWalletId;
        if (account.wallets) {
            current.wallets = cleanAccountWallets(account.wallets);
            const managedWallet = current.wallets.find(
                (wallet) => wallet.walletSource === "privy"
            );
            if (managedWallet) {
                current.walletSource = "privy";
                current.privyUserId = managedWallet.privyUserId;
                current.privyWalletId = managedWallet.privyWalletId;
                current.solanaWalletAddress = managedWallet.solanaWalletAddress;
                current.activeWalletId = managedWallet.walletId;
            }
        }
        current.walletClaimRequestedAt =
            account.walletClaimRequestedAt ?? current.walletClaimRequestedAt;
        current.walletExportRequestedAt =
            account.walletExportRequestedAt ?? current.walletExportRequestedAt;
        current.botAccessRevokedAt =
            account.botAccessRevokedAt ?? current.botAccessRevokedAt;
        current.watchlist = cleanTokenList(
            account.watchlist ?? current.watchlist
        );
        current.hiddenTokens = cleanTokenList(
            account.hiddenTokens ?? current.hiddenTokens
        );
        current.referralCode = account.referralCode ?? current.referralCode;
        current.referredByCode =
            account.referredByCode ?? current.referredByCode;
        current.referredByTelegramUserId =
            account.referredByTelegramUserId ??
            current.referredByTelegramUserId;
        if (current.referralCode) {
            current.referralSummary = {
                referralCode: current.referralCode,
                referredByCode: current.referredByCode,
                referredByTelegramUserId: current.referredByTelegramUserId,
                referredUsers: current.referralSummary?.referredUsers ?? 0,
                rewardStatus: "tracking_only",
                claimableRewards: [],
                updatedAt: account.updatedAt,
                warnings: current.referralSummary?.warnings ?? [],
            };
        }

        if (account.settings) {
            current.settings = {
                ...current.settings,
                slippageBps:
                    account.settings.slippageBps ??
                    current.settings.slippageBps,
                priorityFeeLamports:
                    account.settings.priorityFee ??
                    current.settings.priorityFeeLamports,
                sellPriorityFeeLamports:
                    account.settings.sellPriorityFee ??
                    current.settings.sellPriorityFeeLamports,
                defaultBuySol: account.settings.defaultBuyAmountIn
                    ? solFromLamports(
                          account.settings.defaultBuyAmountIn,
                          current.settings.defaultBuySol
                      )
                    : current.settings.defaultBuySol,
                buyPresetsSol: account.settings.buyPresetAmountsIn
                    ? cleanBuyPresets(
                          account.settings.buyPresetAmountsIn.map((amount) =>
                              solFromLamports(amount, 0)
                          ),
                          current.settings.defaultBuySol
                      )
                    : current.settings.buyPresetsSol,
                sellPresetsPercent: account.settings.sellPresetBps
                    ? cleanSellPresets(
                          account.settings.sellPresetBps.map((bps) => bps / 100)
                      )
                    : current.settings.sellPresetsPercent,
                botMode: account.settings.botMode ?? current.settings.botMode,
                confirmTrades:
                    account.settings.confirmTrades ??
                    current.settings.confirmTrades,
                sellProtection:
                    account.settings.sellProtection ??
                    current.settings.sellProtection,
                autoBuyEnabled:
                    account.settings.autoBuyEnabled ??
                    current.settings.autoBuyEnabled,
                instantAutoBuyEnabled:
                    account.settings.instantAutoBuyEnabled ??
                    current.settings.instantAutoBuyEnabled,
                instantAutoBuyAmountSol: account.settings.instantAutoBuyAmountIn
                    ? solFromLamports(
                          account.settings.instantAutoBuyAmountIn,
                          current.settings.instantAutoBuyAmountSol
                      )
                    : current.settings.instantAutoBuyAmountSol,
                instantAutoBuyMinLiquidityUsd:
                    account.settings.instantAutoBuyMinLiquidityUsd ??
                    current.settings.instantAutoBuyMinLiquidityUsd,
                instantAutoBuyMaxMarketCapUsd:
                    account.settings.instantAutoBuyMaxMarketCapUsd,
                autoSellEnabled:
                    account.settings.autoSellEnabled ??
                    current.settings.autoSellEnabled,
                sniperEnabled:
                    account.settings.sniperEnabled ??
                    current.settings.sniperEnabled,
                mevProtection:
                    account.settings.mevProtection ??
                    current.settings.mevProtection,
            };
            if (current.settings.botMode === "simple") {
                current.settings.confirmTrades = false;
            }
        }

        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    syncReferralSummary(
        user: TradingUser,
        summary: ReferralSummary
    ): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.referralCode = summary.referralCode;
        current.referredByCode = summary.referredByCode;
        current.referredByTelegramUserId = summary.referredByTelegramUserId;
        current.referralSummary = summary;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    setExternalWallet(user: TradingUser, address: string): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const walletId = `external:${address}`;
        current.wallets = mergeAccountWallet(current.wallets, {
            walletId,
            label: "Portfolio Wallet (Read only)",
            walletSource: "external",
            solanaWalletAddress: address,
            createdAt: new Date().toISOString(),
        });
        const managedWallet = current.wallets.find(
            (wallet) => wallet.walletSource === "privy"
        );
        if (!managedWallet) {
            current.walletSource = "external";
            current.solanaWalletAddress = address;
            current.activeWalletId = walletId;
        }
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    setPrivyWallet(
        user: TradingUser,
        wallet: {
            privyUserId: string;
            privyWalletId: string;
            solanaWalletAddress: string;
        }
    ): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.walletSource = "privy";
        current.privyUserId = wallet.privyUserId;
        current.privyWalletId = wallet.privyWalletId;
        current.solanaWalletAddress = wallet.solanaWalletAddress;
        current.activeWalletId = wallet.privyWalletId;
        current.wallets = cleanAccountWallets([
            {
                walletId: wallet.privyWalletId,
                label: "Spot & NFT Wallet (Privy)",
                walletSource: "privy",
                privyUserId: wallet.privyUserId,
                privyWalletId: wallet.privyWalletId,
                solanaWalletAddress: wallet.solanaWalletAddress,
                createdAt: new Date().toISOString(),
            },
            ...(current.wallets ?? []).filter(
                (entry) => entry.walletSource === "external"
            ),
        ]);
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    toggleConfirmTrades(user: TradingUser): TradingUser {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.settings.confirmTrades =
            current.settings.botMode === "simple"
                ? false
                : !current.settings.confirmTrades;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return current;
    }

    createPendingOrder(
        user: TradingUser,
        order: Omit<PendingOrder, "id" | "createdAt" | "expiresAt" | "status">
    ): PendingOrder {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date();
        const pendingOrder: PendingOrder = {
            ...order,
            id: createOrderId(),
            status: "pending_confirmation",
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
        };

        current.pendingOrders ??= {};
        current.pendingOrders[pendingOrder.id] = pendingOrder;
        current.updatedAt = now.toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return pendingOrder;
    }

    getPendingOrder(
        user: TradingUser,
        orderId: string
    ): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return current.pendingOrders?.[orderId];
    }

    listPendingOrders(user: TradingUser): PendingOrder[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.pendingOrders ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    cancelPendingOrder(
        user: TradingUser,
        orderId: string
    ): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.pendingOrders?.[orderId];
        if (!order) return undefined;
        if (
            order.status === "execution_pending" ||
            order.status === "executed"
        ) {
            return undefined;
        }

        order.status = "cancelled";
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    createAutomationOrder(
        user: TradingUser,
        order: Omit<
            AutomationOrder,
            "id" | "createdAt" | "updatedAt" | "status"
        >
    ): AutomationOrder {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const automationOrder: AutomationOrder = {
            ...order,
            id: createOrderId("a"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.automationOrders ??= {};
        current.automationOrders[automationOrder.id] = automationOrder;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return automationOrder;
    }

    upsertAutomationOrder(
        user: TradingUser,
        order: AutomationOrder
    ): AutomationOrder {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.automationOrders ??= {};
        current.automationOrders[order.id] = order;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    listAutomationOrders(user: TradingUser): AutomationOrder[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.automationOrders ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    cancelAutomationOrder(
        user: TradingUser,
        orderId: string
    ): AutomationOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.automationOrders?.[orderId];
        if (!order) return undefined;

        order.status = "cancelled";
        order.updatedAt = new Date().toISOString();
        current.updatedAt = order.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    createWithdrawalTicket(
        user: TradingUser,
        ticket: Omit<
            WithdrawalTicket,
            "id" | "createdAt" | "updatedAt" | "status"
        >
    ): WithdrawalTicket {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const withdrawalTicket: WithdrawalTicket = {
            ...ticket,
            id: createOrderId("w"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.withdrawalTickets ??= {};
        current.withdrawalTickets[withdrawalTicket.id] = withdrawalTicket;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return withdrawalTicket;
    }

    listWithdrawalTickets(user: TradingUser): WithdrawalTicket[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.withdrawalTickets ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    getWithdrawalTicket(
        user: TradingUser,
        ticketId: string
    ): WithdrawalTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return current.withdrawalTickets?.[ticketId];
    }

    cancelWithdrawalTicket(
        user: TradingUser,
        ticketId: string
    ): WithdrawalTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const ticket = current.withdrawalTickets?.[ticketId];
        if (!ticket) return undefined;
        if (
            ticket.status === "execution_pending" ||
            ticket.status === "executed"
        ) {
            return undefined;
        }

        ticket.status = "cancelled";
        ticket.updatedAt = new Date().toISOString();
        current.updatedAt = ticket.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return ticket;
    }

    markWithdrawalExecuted(
        user: TradingUser,
        ticketId: string,
        execution: WithdrawalTicket["execution"]
    ): WithdrawalTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const ticket = current.withdrawalTickets?.[ticketId];
        if (!ticket) return undefined;

        ticket.status = "executed";
        ticket.execution = execution;
        delete ticket.reconciliation;
        ticket.updatedAt = new Date().toISOString();
        current.updatedAt = ticket.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return ticket;
    }

    markWithdrawalExecutionPending(
        user: TradingUser,
        ticketId: string,
        reconciliation: DirectExecutionReconciliation
    ): WithdrawalTicket | undefined {
        return this.updateWithdrawalExecutionState(
            user,
            ticketId,
            "execution_pending",
            reconciliation
        );
    }

    markWithdrawalExecutionFailed(
        user: TradingUser,
        ticketId: string,
        reconciliation: DirectExecutionReconciliation
    ): WithdrawalTicket | undefined {
        return this.updateWithdrawalExecutionState(
            user,
            ticketId,
            "execution_failed",
            reconciliation
        );
    }

    private updateWithdrawalExecutionState(
        user: TradingUser,
        ticketId: string,
        status: "execution_pending" | "execution_failed",
        reconciliation: DirectExecutionReconciliation
    ): WithdrawalTicket | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const ticket = current.withdrawalTickets?.[ticketId];
        if (!ticket || ticket.status === "executed") return undefined;

        ticket.status = status;
        ticket.reconciliation = reconciliation;
        ticket.updatedAt = reconciliation.checkedAt;
        current.updatedAt = reconciliation.checkedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return ticket;
    }

    createCopyTradeConfig(
        user: TradingUser,
        config: Omit<
            CopyTradeConfig,
            "id" | "createdAt" | "updatedAt" | "status"
        >
    ): CopyTradeConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const copyTradeConfig: CopyTradeConfig = {
            ...config,
            id: createOrderId("c"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.copyTradeConfigs ??= {};
        current.copyTradeConfigs[copyTradeConfig.id] = copyTradeConfig;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return copyTradeConfig;
    }

    listCopyTradeConfigs(user: TradingUser): CopyTradeConfig[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.copyTradeConfigs ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    upsertCopyTradeConfig(
        user: TradingUser,
        config: CopyTradeConfig
    ): CopyTradeConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.copyTradeConfigs ??= {};
        current.copyTradeConfigs[config.id] = config;
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    cancelCopyTradeConfig(
        user: TradingUser,
        configId: string
    ): CopyTradeConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.copyTradeConfigs?.[configId];
        if (!config) return undefined;
        if (config.status === "executing" || config.status === "executed") {
            return undefined;
        }

        config.status = "cancelled";
        config.updatedAt = new Date().toISOString();
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    createSniperConfig(
        user: TradingUser,
        config: Omit<SniperConfig, "id" | "createdAt" | "updatedAt" | "status">
    ): SniperConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const sniperConfig: SniperConfig = {
            ...config,
            id: createOrderId("s"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.sniperConfigs ??= {};
        current.sniperConfigs[sniperConfig.id] = sniperConfig;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return sniperConfig;
    }

    listSniperConfigs(user: TradingUser): SniperConfig[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.sniperConfigs ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    upsertSniperConfig(user: TradingUser, config: SniperConfig): SniperConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.sniperConfigs ??= {};
        current.sniperConfigs[config.id] = config;
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    cancelSniperConfig(
        user: TradingUser,
        configId: string
    ): SniperConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.sniperConfigs?.[configId];
        if (!config) return undefined;
        if (config.status === "executing" || config.status === "executed") {
            return undefined;
        }

        config.status = "cancelled";
        config.updatedAt = new Date().toISOString();
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    createAutoBuyConfig(
        user: TradingUser,
        config: Omit<AutoBuyConfig, "id" | "createdAt" | "updatedAt" | "status">
    ): AutoBuyConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const autoBuyConfig: AutoBuyConfig = {
            ...config,
            id: createOrderId("ab"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.autoBuyConfigs ??= {};
        current.autoBuyConfigs[autoBuyConfig.id] = autoBuyConfig;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return autoBuyConfig;
    }

    listAutoBuyConfigs(user: TradingUser): AutoBuyConfig[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.autoBuyConfigs ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    upsertAutoBuyConfig(
        user: TradingUser,
        config: AutoBuyConfig
    ): AutoBuyConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.autoBuyConfigs ??= {};
        current.autoBuyConfigs[config.id] = config;
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    cancelAutoBuyConfig(
        user: TradingUser,
        configId: string
    ): AutoBuyConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.autoBuyConfigs?.[configId];
        if (!config) return undefined;
        if (config.status === "executing" || config.status === "executed") {
            return undefined;
        }

        config.status = "cancelled";
        config.updatedAt = new Date().toISOString();
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    createBundleBuyConfig(
        user: TradingUser,
        config: Omit<
            BundleBuyConfig,
            "id" | "createdAt" | "updatedAt" | "status"
        >
    ): BundleBuyConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const bundleBuyConfig: BundleBuyConfig = {
            ...config,
            id: createOrderId("bb"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.bundleBuyConfigs ??= {};
        current.bundleBuyConfigs[bundleBuyConfig.id] = bundleBuyConfig;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return bundleBuyConfig;
    }

    listBundleBuyConfigs(user: TradingUser): BundleBuyConfig[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.bundleBuyConfigs ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    upsertBundleBuyConfig(
        user: TradingUser,
        config: BundleBuyConfig
    ): BundleBuyConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.bundleBuyConfigs ??= {};
        current.bundleBuyConfigs[config.id] = config;
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    updateBundleBuyExecution(
        user: TradingUser,
        configId: string,
        status: Extract<
            AdvancedConfigStatus,
            "executing" | "failed" | "executed"
        >,
        execution: NonNullable<BundleBuyConfig["execution"]>
    ): BundleBuyConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.bundleBuyConfigs?.[configId];
        if (!config) return undefined;

        config.status = status;
        config.execution = execution;
        config.updatedAt = execution.checkedAt;
        current.updatedAt = execution.checkedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    cancelBundleBuyConfig(
        user: TradingUser,
        configId: string
    ): BundleBuyConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.bundleBuyConfigs?.[configId];
        if (!config) return undefined;
        if (config.status === "executing" || config.status === "executed") {
            return undefined;
        }

        config.status = "cancelled";
        config.updatedAt = new Date().toISOString();
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    createAutoSellConfig(
        user: TradingUser,
        config: Omit<
            AutoSellConfig,
            "id" | "createdAt" | "updatedAt" | "status"
        >
    ): AutoSellConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const now = new Date().toISOString();
        const autoSellConfig: AutoSellConfig = {
            ...config,
            id: createOrderId("as"),
            status: "staged",
            createdAt: now,
            updatedAt: now,
        };

        current.autoSellConfigs ??= {};
        current.autoSellConfigs[autoSellConfig.id] = autoSellConfig;
        current.updatedAt = now;
        state.users[user.telegramUserId] = current;
        this.persist();
        return autoSellConfig;
    }

    listAutoSellConfigs(user: TradingUser): AutoSellConfig[] {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        return Object.values(current.autoSellConfigs ?? {}).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    upsertAutoSellConfig(
        user: TradingUser,
        config: AutoSellConfig
    ): AutoSellConfig {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        current.autoSellConfigs ??= {};
        current.autoSellConfigs[config.id] = config;
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    cancelAutoSellConfig(
        user: TradingUser,
        configId: string
    ): AutoSellConfig | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const config = current.autoSellConfigs?.[configId];
        if (!config) return undefined;
        if (config.status === "executing" || config.status === "executed") {
            return undefined;
        }

        config.status = "cancelled";
        config.updatedAt = new Date().toISOString();
        current.updatedAt = config.updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return config;
    }

    markSwapBuilt(
        user: TradingUser,
        orderId: string,
        swapBuild: PendingOrder["swapBuild"]
    ): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.pendingOrders?.[orderId];
        if (!order) return undefined;

        order.status = "swap_built";
        order.swapBuild = swapBuild;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    markExecuted(
        user: TradingUser,
        orderId: string,
        execution: PendingOrder["execution"]
    ): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.pendingOrders?.[orderId];
        if (!order) return undefined;

        order.status = "executed";
        order.execution = execution;
        delete order.reconciliation;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    markExecutionPending(
        user: TradingUser,
        orderId: string,
        reconciliation: DirectExecutionReconciliation
    ): PendingOrder | undefined {
        return this.updatePendingOrderExecutionState(
            user,
            orderId,
            "execution_pending",
            reconciliation
        );
    }

    markExecutionFailed(
        user: TradingUser,
        orderId: string,
        reconciliation: DirectExecutionReconciliation
    ): PendingOrder | undefined {
        return this.updatePendingOrderExecutionState(
            user,
            orderId,
            "execution_failed",
            reconciliation
        );
    }

    markDryRun(user: TradingUser, orderId: string): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.pendingOrders?.[orderId];
        if (!order) return undefined;

        order.status = "dry_run";
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    listUsers(): TradingUser[] {
        return Object.values(this.load().users).sort((a, b) =>
            a.telegramUserId.localeCompare(b.telegramUserId)
        );
    }

    getActivityAlertCursor(user: TradingUser): ActivityAlertCursor | undefined {
        const current = this.load().users[user.telegramUserId] || user;
        return current.activityAlertCursor;
    }

    initializeActivityAlertCursor(
        user: TradingUser,
        eventIds: string[],
        initializedAt: string
    ): ActivityAlertCursor {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        if (current.activityAlertCursor) {
            return current.activityAlertCursor;
        }

        current.activityAlertCursor = {
            initializedAt,
            seenEventIds: cleanActivityAlertEventIds(eventIds),
        };
        current.updatedAt = initializedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return current.activityAlertCursor;
    }

    markActivityAlertEventsSeen(
        user: TradingUser,
        eventIds: string[],
        observedAt: string
    ): ActivityAlertCursor {
        return this.updateActivityAlertCursor(user, eventIds, observedAt);
    }

    markActivityAlertsDelivered(
        user: TradingUser,
        eventIds: string[],
        deliveredAt: string
    ): ActivityAlertCursor {
        return this.updateActivityAlertCursor(user, eventIds, deliveredAt, {
            lastDeliveredAt: deliveredAt,
            consecutiveFailures: 0,
        });
    }

    markActivityAlertDeliveryFailed(
        user: TradingUser,
        failedAt: string,
        nextAttemptAt: string
    ): ActivityAlertCursor {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const cursor = current.activityAlertCursor ?? {
            initializedAt: failedAt,
            seenEventIds: [],
        };
        cursor.consecutiveFailures = (cursor.consecutiveFailures ?? 0) + 1;
        cursor.lastFailureAt = failedAt;
        cursor.nextAttemptAt = nextAttemptAt;
        current.activityAlertCursor = cursor;
        current.updatedAt = failedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return cursor;
    }

    private updateActivityAlertCursor(
        user: TradingUser,
        eventIds: string[],
        updatedAt: string,
        delivery?: {
            lastDeliveredAt: string;
            consecutiveFailures: number;
        }
    ): ActivityAlertCursor {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const cursor = current.activityAlertCursor ?? {
            initializedAt: updatedAt,
            seenEventIds: [],
        };
        cursor.seenEventIds = cleanActivityAlertEventIds([
            ...eventIds,
            ...cursor.seenEventIds,
        ]);
        if (delivery) {
            cursor.lastDeliveredAt = delivery.lastDeliveredAt;
            cursor.consecutiveFailures = delivery.consecutiveFailures;
            delete cursor.lastFailureAt;
            delete cursor.nextAttemptAt;
        }
        current.activityAlertCursor = cursor;
        current.updatedAt = updatedAt;
        state.users[user.telegramUserId] = current;
        this.persist();
        return cursor;
    }

    private updatePendingOrderExecutionState(
        user: TradingUser,
        orderId: string,
        status: "execution_pending" | "execution_failed",
        reconciliation: DirectExecutionReconciliation
    ): PendingOrder | undefined {
        const state = this.load();
        const current = state.users[user.telegramUserId] || user;
        const order = current.pendingOrders?.[orderId];
        if (!order || order.status === "executed") return undefined;

        order.status = status;
        order.reconciliation = reconciliation;
        current.updatedAt = new Date().toISOString();
        state.users[user.telegramUserId] = current;
        this.persist();
        return order;
    }

    private load(): StoreShape {
        if (this.state) return this.state;

        try {
            const raw = fs.readFileSync(this.filePath, "utf8");
            this.state = JSON.parse(raw) as StoreShape;
        } catch {
            this.state = defaultStore();
        }

        return this.state;
    }

    private persist(): void {
        const state = this.load();
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, `${JSON.stringify(state, null, 2)}\n`, {
            mode: 0o600,
        });
    }
}

function createOrderId(prefix = "o"): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

function cleanActivityAlertEventIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [
        ...new Set(
            value.filter(
                (eventId): eventId is string =>
                    typeof eventId === "string" && eventId.length > 0
            )
        ),
    ].slice(0, ACTIVITY_ALERT_CURSOR_EVENT_LIMIT);
}

function cleanNonNegativeInteger(value: unknown): number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0
        ? value
        : 0;
}

function solFromLamports(value: string, fallback: number): number {
    const lamports = Number(value);
    return Number.isFinite(lamports) && lamports >= 0
        ? lamports / 1_000_000_000
        : fallback;
}

function defaultBuyPresets(defaultBuySol: number): number[] {
    return [...new Set([defaultBuySol, 0.25, 0.5, 1])]
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, 4);
}

function cleanBuyPresets(value: unknown, defaultBuySol: number): number[] {
    const presets = Array.isArray(value)
        ? [
              ...new Set(
                  value.filter(
                      (entry): entry is number =>
                          typeof entry === "number" &&
                          Number.isFinite(entry) &&
                          entry > 0
                  )
              ),
          ].slice(0, 4)
        : [];
    return presets.length >= 2 ? presets : defaultBuyPresets(defaultBuySol);
}

function cleanSellPresets(value: unknown): number[] {
    const presets = Array.isArray(value)
        ? [
              ...new Set(
                  value.filter(
                      (entry): entry is number =>
                          typeof entry === "number" &&
                          Number.isFinite(entry) &&
                          entry > 0 &&
                          entry <= 100
                  )
              ),
          ].slice(0, 4)
        : [];
    return presets.length >= 2 ? presets : [25, 50, 75, 100];
}

function cleanTokenList(values: string[]): string[] {
    return [...new Set(values.filter((value) => typeof value === "string"))];
}

function cleanAccountWallets(value: unknown): TradingAccountWallet[] {
    if (!Array.isArray(value)) return [];
    const addressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const wallets: TradingAccountWallet[] = [];
    let hasManagedWallet = false;
    for (const entry of value) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
            continue;
        const wallet = entry as Partial<TradingAccountWallet>;
        if (
            !wallet.walletId ||
            !wallet.walletSource ||
            !wallet.solanaWalletAddress ||
            !addressPattern.test(wallet.solanaWalletAddress) ||
            (wallet.walletSource === "privy" &&
                (!wallet.privyUserId || !wallet.privyWalletId)) ||
            (wallet.walletSource === "privy" && hasManagedWallet) ||
            wallets.some(
                (current) =>
                    current.walletId === wallet.walletId ||
                    current.solanaWalletAddress === wallet.solanaWalletAddress
            )
        ) {
            continue;
        }
        wallets.push({
            walletId: wallet.walletId,
            label:
                wallet.walletSource === "privy"
                    ? "Spot & NFT Wallet (Privy)"
                    : "Portfolio Wallet (Read only)",
            walletSource: wallet.walletSource,
            ...(wallet.privyUserId ? { privyUserId: wallet.privyUserId } : {}),
            ...(wallet.privyWalletId
                ? { privyWalletId: wallet.privyWalletId }
                : {}),
            solanaWalletAddress: wallet.solanaWalletAddress,
            createdAt: wallet.createdAt || new Date().toISOString(),
        });
        if (wallet.walletSource === "privy") hasManagedWallet = true;
        if (wallets.length >= 10) break;
    }
    return wallets;
}

function mergeAccountWallet(
    current: TradingAccountWallet[] | undefined,
    wallet: TradingAccountWallet
): TradingAccountWallet[] {
    const wallets = cleanAccountWallets(current ?? []);
    const existing = wallets.find(
        (entry) =>
            entry.walletId === wallet.walletId ||
            entry.solanaWalletAddress === wallet.solanaWalletAddress
    );
    if (existing) {
        return wallets.map((entry) =>
            entry.walletId === existing.walletId
                ? {
                      ...wallet,
                      label: existing.label,
                      createdAt: existing.createdAt,
                  }
                : entry
        );
    }
    return [...wallets, wallet].slice(0, 10);
}
