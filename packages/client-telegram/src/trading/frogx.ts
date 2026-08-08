export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

export type FrogxQuote = {
    amountOut: string;
    priceImpactBps: number;
    routers: string[];
    executable: boolean;
    updatedAt: string;
    provider?: string;
    routeId?: string;
    transactionBase64?: string;
};

type RawFrogxQuote = Omit<FrogxQuote, "routers"> & {
    routers: Array<string | { id?: string; name?: string }>;
};

export type QuoteInput = {
    frogxApiBaseUrl: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    userPublicKey: string;
    slippageBps: number;
    priorityFeeLamports: number;
};

export type BuyQuoteInput = {
    frogxApiBaseUrl: string;
    outMint: string;
    amountSol: number;
    userPublicKey: string;
    slippageBps: number;
    priorityFeeLamports: number;
};

export type PositionToken = {
    mint: string;
    tokenAccount: string;
    amount: string;
    decimals: number;
    uiAmount?: number | null;
    uiAmountString: string;
};

export type PositionsResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          walletAddress: string;
          sol: {
              lamports: string;
              uiAmount: number;
          };
          tokens: PositionToken[];
          generatedAt: string;
      };

export type PositionsInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
};

export type PnlInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
};

export type NftHolding = {
    mint: string;
    name: string;
    description: string | null;
    image: string | null;
    collection: string | null;
    owner: string;
    compressed: boolean;
    attributes: Array<{ traitType: string; value: string | number }>;
};

export type NftHoldingsInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    page?: number;
    limit?: number;
};

export type NftHoldingsResult =
    | {
          status: "ready";
          walletAddress: string;
          walletAddresses: string[];
          items: NftHolding[];
          page: number;
          limit: number;
          total: number;
      }
    | {
          status: "wallet_required" | "not_configured" | "unavailable";
          error?: string;
          required?: string[];
      };

export type FrogMarketResult =
    | {
          status: "ready";
          walletAddress: string;
          floor: {
              mint: string;
              name: string | null;
              image: string | null;
              priceLamports: string;
              priceSol: number;
          };
          offer: {
              pool: string;
              spotPriceLamports: string;
              spotPriceSol: number;
              minimumPaymentLamports: string;
              minimumPaymentSol: number;
          } | null;
          quotedAt: string;
      }
    | {
          status: "unavailable";
          code?: string;
          error: string;
      };

export type FrogTopOfferResult =
    | {
          status: "ready";
          offer: {
              pool: string;
              spotPriceLamports: string;
              spotPriceSol: number;
              minimumPaymentLamports: string;
              minimumPaymentSol: number;
              updatedAt?: string | null;
          };
      }
    | {
          status: "unavailable";
          code?: string;
          error: string;
      };

export type FrogTradeExecutionResult = {
    status:
        | "executed"
        | "submitted"
        | "pending"
        | "pending_reconciliation"
        | "rejected"
        | "failed"
        | "not_found"
        | "not_configured";
    code?: string;
    error?: string;
    signature?: string | null;
    transactionId?: string | null;
    referenceId?: string | null;
    solscanUrl?: string | null;
    providerStatus?: number | null;
    providerKind?: "authorization" | "transport" | "http";
    providerCode?: string | null;
    listing?: {
        mint: string;
        name?: string | null;
        image?: string | null;
        priceLamports: string;
        priceSol: number;
    };
    offer?: {
        minimumPaymentLamports: string;
        minimumPaymentSol: number;
    };
};

export type FrogMarketInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    walletAddress: string;
};

export type FrogBuyExecutionInput = FrogMarketInput & {
    executionId: string;
    maximumPaymentLamports: string;
    expectedMint?: string;
    excludedMints?: string[];
};

export type FrogSellExecutionInput = FrogMarketInput & {
    executionId: string;
    mint: string;
    minimumPaymentLamports: string;
};

export type TokenCleanupInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    hiddenTokens?: string[];
    dustUsdThreshold?: number;
};

export type TokenSafetyInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    mint: string;
};

export type MarketRiskInput = TokenSafetyInput & {
    userPublicKey?: string;
    amountIn?: string;
    slippageBps?: number;
    priorityFeeLamports?: number;
    minLiquidityUsd?: number;
    maxMarketCapUsd?: number;
    maxPriceImpactBps?: number;
};

export type PnlToken = {
    mint: string;
    tokenAccount: string;
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
    hidden: boolean;
    usdPrice?: number | null;
    priceChange24h?: number | null;
    currentValueUsd?: number | null;
    estimatedCostUsd?: number | null;
    unrealizedPnlUsd?: number | null;
    unrealizedPnlPct?: number | null;
    buyCount: number;
    sellCount: number;
    estimatedSolSpent?: number | null;
    estimatedSolReceived?: number | null;
    confirmedFillCount?: number;
    estimatedFillCount?: number;
    costBasisStatus: string;
};

export type PnlResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found" | "no_wallet";
          telegramUserId: string;
      }
    | {
          status: "ready";
          walletAddress: string;
          generatedAt: string;
          pricing: {
              source: string;
              pricedMints: number;
              solUsdPrice?: number | null;
          };
          executionAccounting?: {
              source: string;
              amountSemantics?: string;
              totalSwapExecutions: number;
              confirmedFillCount: number;
              estimatedFillCount: number;
              confirmedFillRatePct?: number | null;
              attemptedThisRequest?: number;
              reconciledThisRequest?: number;
              costBasisMethod?: string;
              taxLotAccounting?: boolean;
          };
          totals: {
              solUiAmount: number;
              solValueUsd?: number | null;
              currentTokenValueUsd?: number | null;
              currentPortfolioValueUsd?: number | null;
              estimatedCostUsd?: number | null;
              unrealizedPnlUsd?: number | null;
              unrealizedPnlPct?: number | null;
              pricedPositionCount: number;
              unpricedPositionCount: number;
              executionEventCount: number;
              confirmedFillCount?: number;
              estimatedFillCount?: number;
          };
          tokens: PnlToken[];
          recentExecutions: Array<{
              eventType: string;
              createdAt: string;
              signature?: string | null;
              mint?: string | null;
              side: string;
              solscanUrl?: string | null;
              fillStatus?: "confirmed" | "estimated" | "not_applicable";
              amountIn?: string | null;
              amountOut?: string | null;
              inputDecimals?: number | null;
              outputDecimals?: number | null;
              networkFeeLamports?: string | null;
          }>;
          warnings: string[];
      };

export type TokenCleanupReason = "zero" | "dust" | "unpriced" | "hidden";
export type TokenCleanupAction = "hide" | "sell";

export type TokenCleanupCandidate = {
    mint: string;
    tokenAccount: string;
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
    hidden: boolean;
    usdPrice?: number | null;
    priceChange24h?: number | null;
    currentValueUsd?: number | null;
    cleanupReason: TokenCleanupReason;
    suggestedActions: TokenCleanupAction[];
};

export type TokenCleanupResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          walletAddress: string;
          generatedAt: string;
          pricing: {
              source: string;
              pricedMints: number;
          };
          summary: {
              totalTokens: number;
              cleanupCandidates: number;
              hiddenPositions: number;
              pricedTokens: number;
              unpricedTokens: number;
              dustUsdThreshold: number;
              dustValueUsd?: number | null;
          };
          candidates: TokenCleanupCandidate[];
          warnings: string[];
      };

export type TokenSafetyFlagSeverity = "info" | "warning" | "danger";

export type TokenSafetyFlag = {
    code: string;
    severity: TokenSafetyFlagSeverity;
    message: string;
};

export type TokenSafetyResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          mint: string;
          generatedAt: string;
          risk: {
              level: "unknown";
              score: number;
              flags: TokenSafetyFlag[];
          };
          warnings: string[];
      }
    | {
          status: "ready";
          mint: string;
          generatedAt: string;
          mintAccount: {
              owner?: string | null;
              executable: boolean;
              lamports?: number | null;
              decimals?: number | null;
              supply: string;
              isInitialized: boolean;
              mintAuthority?: string | null;
              freezeAuthority?: string | null;
          };
          pricing: {
              source: string;
              usdPrice?: number | null;
              priceChange24h?: number | null;
              priced: boolean;
          };
          risk: {
              level: "low" | "medium" | "high" | "unknown";
              score: number;
              flags: TokenSafetyFlag[];
          };
          warnings: string[];
      };

export type MarketRiskQuoteProbe =
    | {
          status: "ready";
          inMint: string;
          outMint: string;
          amountIn: string;
          amountInUsd?: number | null;
          amountOut: string;
          priceImpactBps?: number | null;
          executable: boolean;
          provider?: string | null;
          routeId?: string | null;
          routers: string[];
      }
    | {
          status: "not_configured";
          required?: string[];
          amountIn: string;
          amountInUsd?: number | null;
      }
    | {
          status: "skipped" | "unavailable";
          reason: string;
          amountIn: string;
          amountInUsd?: number | null;
      };

export type MarketRiskResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          mint: string;
          generatedAt: string;
          tokenSafety: TokenSafetyResult;
          pricing: {
              solUsdPrice?: number | null;
          };
          marketCap: {
              usd?: number | null;
              maxMarketCapUsd?: number | null;
              withinLimit?: boolean | null;
          };
          quoteProbe: MarketRiskQuoteProbe;
          thresholds: {
              minLiquidityUsd?: number | null;
              maxMarketCapUsd?: number | null;
              maxPriceImpactBps: number;
          };
          risk: {
              level: "low" | "medium" | "high" | "unknown";
              score: number;
              flags: TokenSafetyFlag[];
          };
          warnings: string[];
      };

export type TradingAccountSettings = {
    slippageBps: number;
    priorityFee: number;
    sellPriorityFee: number;
    defaultBuyAmountIn: string;
    buyPresetAmountsIn: string[];
    sellPresetBps: number[];
    botMode: "simple" | "advanced";
    confirmTrades: boolean;
    sellProtection: boolean;
    autoBuyEnabled: boolean;
    instantAutoBuyEnabled: boolean;
    instantAutoBuyAmountIn: string;
    instantAutoBuyMinLiquidityUsd: number;
    instantAutoBuyMaxMarketCapUsd?: number;
    autoSellEnabled: boolean;
    sniperEnabled: boolean;
    mevProtection: boolean;
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

export type TradingAccountSnapshot = {
    telegramUserId: string;
    username?: string;
    walletSource?: "privy" | "external";
    privyUserId?: string;
    privyWalletId?: string;
    solanaWalletAddress?: string;
    activeWalletId?: string;
    wallets: TradingAccountWallet[];
    walletClaimRequestedAt?: string;
    walletExportRequestedAt?: string;
    botAccessRevokedAt?: string;
    settings: TradingAccountSettings;
    watchlist: string[];
    hiddenTokens: string[];
    referralCode?: string;
    referredByCode?: string;
    referredByTelegramUserId?: string;
    createdAt: string;
    updatedAt: string;
};

export type TradingAccountSetupStatus = {
    walletReady: boolean;
    automationSignerReady: boolean;
    imperialConnected: boolean;
    botAccessEnabled: boolean;
    complete: boolean;
};

export type TradingAccountInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
};

export type TradingAccountResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          telegramUserId: string;
      }
    | {
          status: "ready";
          account: TradingAccountSnapshot;
          setup?: TradingAccountSetupStatus;
      };

export type ActivityEvent = {
    telegramUserId: string;
    eventId: string;
    eventType: string;
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type ActivityResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          generatedAt: string;
          summary: {
              totalEvents: number;
              latestEventAt?: string;
              eventTypes: Record<string, number>;
          };
          events: ActivityEvent[];
          warnings: string[];
      };

export type ActivityInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    limit?: number;
};

export type PerpsStatusResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found" | "no_wallet";
          telegramUserId: string;
      }
    | {
          status: "imperial_reconnect";
          telegramUserId: string;
      }
    | {
          status: "ready";
          telegramUserId: string;
          authorityWalletAddress: string;
          profileAddress: string | null;
          profileIndex: 1;
          profileUsdc: number;
          minimumProfileUsdc: 50;
          funded: boolean;
          fundingLocation: "imperial_profile";
          imperialProfileVerified: boolean;
          strategyReady: boolean;
          liveExecutionEnabled: boolean;
          blockers: string[];
          checkedAt: string;
      };

export type DeltaNeutralPreview = {
    strategy: "delta_neutral";
    preset: "low";
    wallet: string;
    profileIndex: number;
    profileAddress: string | null;
    profileUsdc: number;
    minimumProfileUsdc: 50;
    profileFunded: boolean;
    liveReady: boolean;
    liveEntryCapUsd: 60;
    maxCycles: 1;
    blockers: string[];
};

export type DeltaNeutralRunStatus = {
    strategy: "delta_neutral";
    preset: "low";
    wallet: string;
    runId: string | null;
    launching: boolean;
    running: boolean;
    stopRequested: boolean;
    completedCycles: number;
    maxCycles: 1;
    dailyBudgetUsd: 5;
    estimatedRunCostUsd: number;
    completedVolumeUsd: number;
    startedAtUnix: number | null;
    stoppedAtUnix: number | null;
    lastMessage: string | null;
    failed: boolean;
};

export type DeltaNeutralStoredRunStatus = {
    strategy: "delta_neutral";
    preset: "low";
    wallet: string;
    runId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
};

export type DeltaNeutralRun =
    | DeltaNeutralRunStatus
    | DeltaNeutralStoredRunStatus;

export type DeltaNeutralUnavailableResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "unavailable" | "blocked" | "pending_reconciliation";
          error: string;
          retryable?: boolean;
          runId?: string;
          run?: DeltaNeutralRun;
      };

export type DeltaNeutralPreviewResult =
    | {
          status: "ready";
          defaultStrategy: "delta_neutral";
          defaultPreset: "low";
          preview: DeltaNeutralPreview;
          liveExecutionEnabled: boolean;
      }
    | DeltaNeutralUnavailableResult;

export type DeltaNeutralStartResult =
    | {
          status: string;
          idempotent: boolean;
          run: DeltaNeutralRun;
      }
    | DeltaNeutralUnavailableResult;

export type DeltaNeutralStatusResult =
    | {
          status: "ready";
          defaultStrategy: "delta_neutral";
          defaultPreset: "low";
          configured: boolean;
          enabled: boolean;
          liveExecutionEnabled: boolean;
          run: DeltaNeutralRun | null;
      }
    | DeltaNeutralUnavailableResult;

export type DeltaNeutralStopResult =
    | {
          status: string;
          run: DeltaNeutralRunStatus;
      }
    | DeltaNeutralUnavailableResult;

export type ReferralSummary = {
    telegramUserId: string;
    referralCode: string;
    referredByCode?: string;
    referredByTelegramUserId?: string;
    referredUsers: number;
    rewardStatus: "tracking_only";
    claimableRewards: [];
    updatedAt: string;
    warnings: string[];
};

export type ReferralInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    username?: string;
    referralCode?: string;
};

export type ReferralResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          error: string;
      }
    | {
          status: "ready";
          summary: ReferralSummary;
      }
    | {
          status: "accepted";
          applied: boolean;
          summary: ReferralSummary;
          warnings: string[];
      };

export type ControlCodeInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    username?: string;
};

export type ControlCodeResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          code: string;
          expiresAt: string;
          controlUrl?: string | null;
      };

export type SetupResetInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
};

export type SetupResetResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "reset";
          telegramUserId: string;
          walletAddress: string | null;
          resetAt: string;
      };

export type SwapBuildInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    orderId?: string;
    telegramUserId: string;
    userPublicKey: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    slippageBps: number;
    priorityFeeLamports: number;
};

export type SwapBuildResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          mode: "tx_base64" | "route";
          txBase64?: string | null;
          route?: unknown;
          meta?: Record<string, unknown>;
      };

export type SwapExecutionInput = SwapBuildInput & {
    orderId: string;
    executionMode?: "instant_auto_buy";
};

export type ManualReviewStatus = {
    manualReviewRequired?: boolean;
    manualReviewAfter?: string | null;
    manualReviewRequiredAt?: string | null;
    manualReviewReason?: string | null;
};

export type SwapExecutionResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | (ManualReviewStatus & {
          status: "pending_reconciliation";
          error: string;
          referenceId: string;
          transactionId?: string | null;
          executionStartedAt?: string;
      })
    | {
          status: "not_executable";
          error?: string;
      }
    | {
          status: "executed";
          mode: "privy_sign_and_send";
          signature: string;
          transactionId?: string | null;
          referenceId?: string | null;
          caip2: string;
          signedTransactionAvailable: boolean;
          executedAt: string;
          solscanUrl?: string | null;
      };

export type ScheduledOrderKind = "limit" | "dca" | "stop" | "trailing";
export type ScheduledOrderSide = "buy" | "sell";
export type TriggerDirection = "above" | "below";

export type ScheduledOrderInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    kind: ScheduledOrderKind;
    side: ScheduledOrderSide;
    mint: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    orderCount?: number;
    intervalMinutes?: number;
    trailingBps?: number;
};

export type ScheduledOrderNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    kind: ScheduledOrderKind;
    side: ScheduledOrderSide;
    mint: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    orderCount?: number;
    intervalMinutes?: number;
    perOrderAmountIn?: string;
    trailingBps?: number;
};

export type ScheduledOrderValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          orderKind: ScheduledOrderKind;
          normalized: ScheduledOrderNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredScheduledOrderStatus =
    | "staged"
    | "executing"
    | "executed"
    | "failed"
    | "cancelled";

export type StoredScheduledOrder = {
    telegramUserId: string;
    orderId: string;
    kind: ScheduledOrderKind;
    side: ScheduledOrderSide;
    status: StoredScheduledOrderStatus;
    mint: string;
    inMint: string;
    outMint: string;
    amountIn: string;
    amountLabel?: string;
    walletAddress: string;
    slippageBps: number;
    priorityFee: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    orderCount?: number;
    intervalMinutes?: number;
    perOrderAmountIn?: string;
    trailingBps?: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
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

export type ScheduledOrderStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          orderKind: ScheduledOrderKind;
          order: StoredScheduledOrder;
          normalized: ScheduledOrderNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type ScheduledOrderListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          orders: StoredScheduledOrder[];
      };

export type ScheduledOrderCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
      }
    | {
          status: "cancelled";
          order: StoredScheduledOrder;
      };

export type WithdrawalValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    amountIn: string;
    amountLabel?: string;
    destinationAddress: string;
};

export type WithdrawalExecutionInput = WithdrawalValidationInput & {
    withdrawalId: string;
};

export type WithdrawalNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    amountIn: string;
    amountLabel?: string;
    destinationAddress: string;
    assetType: "sol" | "spl";
};

export type WithdrawalValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: WithdrawalNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type WithdrawalExecutionResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | (ManualReviewStatus & {
          status: "pending_reconciliation";
          error: string;
          referenceId: string;
          transactionId?: string | null;
          executionStartedAt?: string;
      })
    | {
          status: "not_executable";
          error?: string;
      }
    | {
          status: "executed";
          mode: "privy_sign_and_send";
          assetType: "sol" | "spl";
          mint: string;
          amountIn: string;
          destinationAddress: string;
          signature: string;
          transactionId?: string | null;
          referenceId?: string | null;
          caip2: string;
          signedTransactionAvailable: boolean;
          sourceTokenAccount?: string | null;
          destinationTokenAccount?: string | null;
          createdDestinationTokenAccount?: boolean;
          executedAt: string;
          solscanUrl?: string | null;
      };

export type DirectExecutionProviderStatus =
    | "broadcasted"
    | "confirmed"
    | "execution_reverted"
    | "failed"
    | "replaced"
    | "finalized"
    | "provider_error"
    | "pending";

type DirectExecutionStatusBase = ManualReviewStatus & {
    executionKind?: "swap" | "withdrawal";
    executionId?: string;
    executionStartedAt?: string | null;
    providerStatus?: DirectExecutionProviderStatus;
    transactionId?: string | null;
    referenceId?: string | null;
    signature?: string | null;
    solscanUrl?: string | null;
    checkedAt?: string;
    error?: string;
};

export type DirectExecutionStatusResult =
    | { status: "not_configured"; required?: string[] }
    | (DirectExecutionStatusBase & {
          status:
              | "lookup_error"
              | "not_found"
              | "not_executable"
              | "mismatch"
              | "pending"
              | "failed";
      })
    | (DirectExecutionStatusBase & {
          status: "executed";
          signature: string;
          executedAt: string;
      });

export type CopyTradeValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    tag?: string;
    targetWallet: string;
    buyMode?: "fixed" | "percentage";
    buyPercentageBps?: number;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    sellPriorityFeeLamports?: number;
    copySells: boolean;
    duplicateBuys?: boolean;
    onlyRenounced?: boolean;
    excludePumpFunTokens?: boolean;
    minTargetBuyAmountIn?: string;
    minLiquidityUsd: number;
    minMarketCapUsd?: number;
    maxMarketCapUsd?: number;
    blacklistMints?: string[];
};

export type CopyTradeNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    tag?: string;
    targetWallet: string;
    buyMode: "fixed" | "percentage";
    buyPercentageBps: number;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    sellPriorityFee: number;
    copySells: boolean;
    duplicateBuys: boolean;
    onlyRenounced: boolean;
    excludePumpFunTokens: boolean;
    minTargetBuyAmountIn?: string;
    minLiquidityUsd: number;
    minMarketCapUsd?: number;
    maxMarketCapUsd?: number;
    blacklistMints: string[];
};

export type CopyTradeValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: CopyTradeNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredAdvancedConfigStatus =
    | "staged"
    | "paused"
    | "executing"
    | "failed"
    | "cancelled"
    | "executed";

export type StoredAdvancedAutomationMonitor = {
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
    bundleAttemptedItems?: number;
    bundleConfirmedItems?: number;
    lastError?: string;
};

export type AdvancedAutomationExecutionStatusInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    configId: string;
};

export type AdvancedAutomationExecutionStatusResult<Config> =
    | {
          status: "not_configured";
          required?: string[];
          config?: Config;
      }
    | {
          status: "not_found" | "lookup_error" | "mismatch";
          error?: string;
      }
    | (ManualReviewStatus & {
          status:
              | "monitoring"
              | "pending_reconciliation"
              | "executed"
              | "failed"
              | "cancelled"
              | "paused";
          kind: "copytrade" | "sniper" | "auto_buy" | "auto_sell";
          configId: string;
          configStatus: StoredAdvancedConfigStatus;
          standing: boolean;
          providerStatus?:
              | StoredAdvancedAutomationMonitor["reconciliationStatus"]
              | null;
          executionId?: string | null;
          referenceId?: string | null;
          transactionId?: string | null;
          signature?: string | null;
          solscanUrl?: string | null;
          checkedAt: string;
          config: Config;
          error?: string;
      });

export type StoredCopyTradeConfig = {
    telegramUserId: string;
    configId: string;
    kind: "copytrade";
    status: StoredAdvancedConfigStatus;
    walletAddress: string;
    tag?: string;
    targetWallet: string;
    buyMode?: "fixed" | "percentage";
    buyPercentageBps?: number;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    sellPriorityFee?: number;
    copySells: boolean;
    duplicateBuys?: boolean;
    onlyRenounced?: boolean;
    excludePumpFunTokens?: boolean;
    minTargetBuyAmountIn?: string;
    minLiquidityUsd: number;
    minMarketCapUsd?: number;
    maxMarketCapUsd?: number;
    blacklistMints?: string[];
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: StoredAdvancedAutomationMonitor;
};

export type CopyTradeStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          configKind: "copytrade";
          config: StoredCopyTradeConfig;
          normalized: CopyTradeNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type CopyTradeListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          kind?: "copytrade" | null;
          configs: StoredCopyTradeConfig[];
      };

export type CopyTradeCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
          config?: StoredCopyTradeConfig;
      }
    | {
          status: "cancelled";
          config: StoredCopyTradeConfig;
      };

export type CopyTradeControlResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_controllable";
          error?: string;
          config?: StoredCopyTradeConfig;
      }
    | {
          status: "paused" | "resumed";
          config: StoredCopyTradeConfig;
      };

export type CopyTradeUpdateResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_updatable";
          error?: string;
          config?: StoredCopyTradeConfig;
      }
    | {
          status: "updated";
          targetChanged: boolean;
          config: StoredCopyTradeConfig;
          normalized: CopyTradeNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type CopyTradeDuplicateResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found" | "not_duplicable";
          error?: string;
          config?: StoredCopyTradeConfig;
      }
    | {
          status: "duplicated";
          sourceConfigId: string;
          config: StoredCopyTradeConfig;
          normalized: CopyTradeNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type SniperSource = "any" | "pump" | "raydium" | "moonshot";

export type SniperValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    source: SniperSource;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    maxSnipes: number;
};

export type SniperNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    source: SniperSource;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    maxSnipes: number;
};

export type SniperValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: SniperNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredSniperConfig = {
    telegramUserId: string;
    configId: string;
    kind: "sniper";
    status: StoredAdvancedConfigStatus;
    walletAddress: string;
    source: SniperSource;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    maxSnipes: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: StoredAdvancedAutomationMonitor;
};

export type SniperStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          configKind: "sniper";
          config: StoredSniperConfig;
          normalized: SniperNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type SniperListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          kind?: "sniper" | null;
          configs: StoredSniperConfig[];
      };

export type SniperCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
          config?: StoredSniperConfig;
      }
    | {
          status: "cancelled";
          config: StoredSniperConfig;
      };

export type AutoBuyValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
};

export type AutoBuyNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
};

export type AutoBuyValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: AutoBuyNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredAutoBuyConfig = {
    telegramUserId: string;
    configId: string;
    kind: "auto_buy";
    status: StoredAdvancedConfigStatus;
    walletAddress: string;
    mint: string;
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: StoredAdvancedAutomationMonitor;
};

export type AutoBuyStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          configKind: "auto_buy";
          config: StoredAutoBuyConfig;
          normalized: AutoBuyNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type AutoBuyListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          kind?: "auto_buy" | null;
          configs: StoredAutoBuyConfig[];
      };

export type AutoBuyCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
          config?: StoredAutoBuyConfig;
      }
    | {
          status: "cancelled";
          config: StoredAutoBuyConfig;
      };

export type BundleBuyItemInput = {
    mint: string;
    maxBuyAmountIn: string;
    amountLabel?: string;
};

export type BundleBuyValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    items: BundleBuyItemInput[];
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
};

export type BundleBuyNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    items: BundleBuyItemInput[];
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
};

export type BundleBuyValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: BundleBuyNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredBundleBuyConfig = {
    telegramUserId: string;
    configId: string;
    kind: "bundle_buy";
    status: StoredAdvancedConfigStatus;
    walletAddress: string;
    items?: BundleBuyItemInput[];
    bundleItems?: BundleBuyItemInput[];
    maxBuyAmountIn: string;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    minLiquidityUsd: number;
    maxMarketCapUsd?: number;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: StoredAdvancedAutomationMonitor;
};

export type BundleBuyStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          configKind: "bundle_buy";
          config: StoredBundleBuyConfig;
          normalized: BundleBuyNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type BundleBuyListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          kind?: "bundle_buy" | null;
          configs: StoredBundleBuyConfig[];
      };

export type BundleBuyCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
      }
    | {
          status: "cancelled";
          config: StoredBundleBuyConfig;
      };

export type BundleBuyExecutionItem = {
    mint: string;
    amountIn: string;
    signature?: string | null;
    transactionId?: string | null;
    referenceId?: string | null;
    solscanUrl?: string | null;
};

export type BundleBuyExecutionResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | (ManualReviewStatus & {
          status: "pending_reconciliation";
          configId: string;
          configStatus: "executing";
          attemptedItems: number;
          confirmedItems: number;
          totalItems: number;
          executions: BundleBuyExecutionItem[];
          error: string;
      })
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_executable";
          error?: string;
          executions?: BundleBuyExecutionItem[];
          configStatus?: StoredAdvancedConfigStatus;
          attemptedItems?: number;
          confirmedItems?: number;
          totalItems?: number;
      }
    | {
          status: "executed";
          mode: "bundle_buy_sequence";
          configId: string;
          itemCount: number;
          totalAmountIn: string;
          executions: BundleBuyExecutionItem[];
          executedAt: string;
      };

type BundleBuyExecutionStatusBase = ManualReviewStatus & {
    configId?: string;
    configStatus?: StoredAdvancedConfigStatus;
    attemptedItems?: number;
    confirmedItems?: number;
    totalItems?: number;
    executions?: BundleBuyExecutionItem[];
    checkedAt?: string;
    error?: string;
};

export type BundleBuyExecutionStatusResult =
    | { status: "not_configured"; required?: string[] }
    | (BundleBuyExecutionStatusBase & {
          status:
              | "not_found"
              | "not_started"
              | "pending_reconciliation"
              | "failed"
              | "mismatch"
              | "lookup_error";
      })
    | (BundleBuyExecutionStatusBase & {
          status: "executed";
          configId: string;
          itemCount: number;
          totalAmountIn: string;
          executions: BundleBuyExecutionItem[];
          executedAt: string;
      });

export type AutoSellValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    sellBps: number;
    amountLabel?: string;
    slippageBps: number;
    priorityFeeLamports: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
};

export type AutoSellNormalized = {
    telegramUserId: string;
    userPublicKey: string;
    mint: string;
    sellBps: number;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
};

export type AutoSellValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: AutoSellNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type StoredAutoSellConfig = {
    telegramUserId: string;
    configId: string;
    kind: "auto_sell";
    status: StoredAdvancedConfigStatus;
    walletAddress: string;
    mint: string;
    sellBps: number;
    amountLabel?: string;
    slippageBps: number;
    priorityFee: number;
    triggerPrice?: string;
    triggerDirection?: TriggerDirection;
    createdAt: string;
    updatedAt: string;
    validation: {
        validatedAt: string;
        warnings: string[];
    };
    monitor?: StoredAdvancedAutomationMonitor;
};

export type AutoSellStorageResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "stored";
          configKind: "auto_sell";
          config: StoredAutoSellConfig;
          normalized: AutoSellNormalized;
          warnings: string[];
          validatedAt: string;
      };

export type AutoSellListResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          telegramUserId: string;
          kind?: "auto_sell" | null;
          configs: StoredAutoSellConfig[];
      };

export type AutoSellCancelResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "not_found";
          error?: string;
      }
    | {
          status: "not_cancellable";
          error?: string;
          config?: StoredAutoSellConfig;
      }
    | {
          status: "cancelled";
          config: StoredAutoSellConfig;
      };

export type PreferenceKind = "settings" | "watchlist" | "hiddenToken";
export type PreferenceAction = "set" | "add" | "remove";

export type PreferenceValidationInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey?: string;
    kind: PreferenceKind;
    action: PreferenceAction;
    mint?: string;
    slippageBps?: number;
    priorityFeeLamports: number;
    sellPriorityFeeLamports?: number;
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

export type PreferenceNormalized = {
    telegramUserId: string;
    userPublicKey?: string;
    kind: PreferenceKind;
    action: PreferenceAction;
    mint?: string;
    settings?: {
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
    };
};

export type PreferenceValidationResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "accepted";
          normalized: PreferenceNormalized;
          accountStorage?: "stored" | "not_configured";
          account?: TradingAccountSnapshot;
          warnings: string[];
          validatedAt: string;
      };

export type TradingWalletResult =
    | {
          status: "not_configured";
          required?: string[];
      }
    | {
          status: "ready";
          walletSource: "external";
          solanaWalletAddress: string;
          activeWalletId?: string;
          wallets?: TradingAccountWallet[];
          account?: TradingAccountSnapshot;
      }
    | {
          status: "ready";
          walletSource: "privy";
          privyUserId: string;
          privyWalletId: string;
          solanaWalletAddress: string;
          activeWalletId?: string;
          wallets?: TradingAccountWallet[];
          signerConfigured?: boolean;
          account?: TradingAccountSnapshot;
      };

export type TradingWalletInput = {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    username?: string;
    externalAddress?: string;
    action?: "select";
    walletId?: string;
};

export async function provisionTradingWallet(
    input: TradingWalletInput
): Promise<TradingWalletResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/wallet`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                username: input.username,
                externalAddress: input.externalAddress,
                action: input.action,
                walletId: input.walletId,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX wallet setup failed with status ${response.status}`
        );
    }

    return (await response.json()) as TradingWalletResult;
}

export async function fetchTradingAccount(
    input: TradingAccountInput
): Promise<TradingAccountResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/account?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX account fetch failed with status ${response.status}`
        );
    }

    return (await response.json()) as TradingAccountResult;
}

export async function fetchActivity(
    input: ActivityInput
): Promise<ActivityResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const params = new URLSearchParams({
        telegramUserId: input.telegramUserId,
    });
    if (input.limit) {
        params.set("limit", String(input.limit));
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/activity?${params.toString()}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX activity fetch failed with status ${response.status}`
        );
    }

    return (await response.json()) as ActivityResult;
}

export async function fetchPerpsStatus(
    input: TradingAccountInput
): Promise<PerpsStatusResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/perps/status?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (response.status === 409) {
        return {
            status: "imperial_reconnect",
            telegramUserId: input.telegramUserId,
        };
    }

    if (!response.ok && response.status !== 503 && response.status !== 404) {
        throw new Error(
            `FrogX Perps status fetch failed with status ${response.status}`
        );
    }

    return (await response.json()) as PerpsStatusResult;
}

export async function previewDeltaNeutral(
    input: TradingAccountInput
): Promise<DeltaNeutralPreviewResult> {
    const response = await postDeltaNeutralRequest(input, "preview");
    const data = await response.json().catch(() => null);
    const unavailable = deltaNeutralUnavailableResult(response, data);
    if (unavailable) return unavailable;

    const record = objectRecord(data);
    const preview = deltaNeutralPreview(record?.preview);
    if (
        !response.ok ||
        record?.status !== "ready" ||
        record.defaultStrategy !== "delta_neutral" ||
        record.defaultPreset !== "low" ||
        typeof record.liveExecutionEnabled !== "boolean" ||
        !preview
    ) {
        throw new Error(
            "FrogX Delta Neutral preview returned a malformed response"
        );
    }
    return {
        status: "ready",
        defaultStrategy: "delta_neutral",
        defaultPreset: "low",
        preview,
        liveExecutionEnabled: record.liveExecutionEnabled,
    };
}

export async function startDeltaNeutral(
    input: TradingAccountInput & {
        idempotencyKey: string;
        confirmLive: true;
    }
): Promise<DeltaNeutralStartResult> {
    const response = await postDeltaNeutralRequest(input, "start", {
        idempotencyKey: input.idempotencyKey,
        confirmLive: input.confirmLive,
    });
    const data = await response.json().catch(() => null);
    const unavailable = deltaNeutralUnavailableResult(response, data);
    if (unavailable) return unavailable;

    const record = objectRecord(data);
    const run = deltaNeutralRun(record?.run);
    if (
        !response.ok ||
        typeof record?.status !== "string" ||
        typeof record.idempotent !== "boolean" ||
        !run
    ) {
        throw new Error(
            "FrogX Delta Neutral start returned a malformed response"
        );
    }
    return {
        status: record.status,
        idempotent: record.idempotent,
        run,
    };
}

export async function fetchDeltaNeutralStatus(
    input: TradingAccountInput
): Promise<DeltaNeutralStatusResult> {
    const response = await postDeltaNeutralRequest(input, "status");
    const data = await response.json().catch(() => null);
    const unavailable = deltaNeutralUnavailableResult(response, data);
    if (unavailable) return unavailable;

    const record = objectRecord(data);
    const run = record?.run === null ? null : deltaNeutralRun(record?.run);
    if (
        !response.ok ||
        record?.status !== "ready" ||
        record.defaultStrategy !== "delta_neutral" ||
        record.defaultPreset !== "low" ||
        typeof record.configured !== "boolean" ||
        typeof record.enabled !== "boolean" ||
        typeof record.liveExecutionEnabled !== "boolean" ||
        run === undefined
    ) {
        throw new Error(
            "FrogX Delta Neutral status returned a malformed response"
        );
    }
    return {
        status: "ready",
        defaultStrategy: "delta_neutral",
        defaultPreset: "low",
        configured: record.configured,
        enabled: record.enabled,
        liveExecutionEnabled: record.liveExecutionEnabled,
        run,
    };
}

export async function stopDeltaNeutral(
    input: TradingAccountInput
): Promise<DeltaNeutralStopResult> {
    const response = await postDeltaNeutralRequest(input, "stop");
    const data = await response.json().catch(() => null);
    const unavailable = deltaNeutralUnavailableResult(response, data);
    if (unavailable) return unavailable;

    const record = objectRecord(data);
    const run = deltaNeutralRunStatus(record?.run);
    if (!response.ok || typeof record?.status !== "string" || !run) {
        throw new Error(
            "FrogX Delta Neutral stop returned a malformed response"
        );
    }
    return { status: record.status, run };
}

async function postDeltaNeutralRequest(
    input: TradingAccountInput,
    action: "preview" | "start" | "status" | "stop",
    body: Record<string, unknown> = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }
    return fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/perps/delta-neutral/${action}`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                ...body,
            }),
        }
    );
}

export async function fetchReferralSummary(
    input: ReferralInput
): Promise<ReferralResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/referrals?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503 && response.status !== 404) {
        throw new Error(
            `FrogX referral summary failed with status ${response.status}`
        );
    }

    return (await response.json()) as ReferralResult;
}

export async function applyReferralCode(
    input: ReferralInput & { referralCode: string }
): Promise<ReferralResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/referrals`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                username: input.username,
                referralCode: input.referralCode,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX referral apply failed with status ${response.status}`
        );
    }

    return (await response.json()) as ReferralResult;
}

export async function requestControlCode(
    input: ControlCodeInput
): Promise<ControlCodeResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/control/code`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                username: input.username,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX control code request failed with status ${response.status}`
        );
    }

    return (await response.json()) as ControlCodeResult;
}

export async function resetTradingSetup(
    input: SetupResetInput
): Promise<SetupResetResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/setup/reset`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX setup reset failed with status ${response.status}`
        );
    }

    return (await response.json()) as SetupResetResult;
}

export async function buildSwapTransaction(
    input: SwapBuildInput
): Promise<SwapBuildResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/swap`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX swap build failed with status ${response.status}`
        );
    }

    return (await response.json()) as SwapBuildResult;
}

export async function executeSwapTransaction(
    input: SwapExecutionInput
): Promise<SwapExecutionResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/execute`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                orderId: input.orderId,
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                executionMode: input.executionMode,
            }),
        }
    );

    const data = (await response.json()) as Partial<SwapExecutionResult> & {
        error?: string;
    };
    if (data.status === "not_configured") {
        return data as Extract<
            SwapExecutionResult,
            { status: "not_configured" }
        >;
    }
    if (data.status === "pending_reconciliation" && data.referenceId) {
        return data as Extract<
            SwapExecutionResult,
            { status: "pending_reconciliation" }
        >;
    }
    if (data.status === "not_executable") {
        return data as Extract<
            SwapExecutionResult,
            { status: "not_executable" }
        >;
    }
    if (
        response.ok &&
        data.status === "executed" &&
        typeof data.signature === "string" &&
        data.signature.length > 0
    ) {
        return data as Extract<SwapExecutionResult, { status: "executed" }>;
    }

    return {
        status: "not_executable",
        error:
            data.error ??
            `FTX/FrogX rejected swap execution with status ${response.status}`,
    };
}

export async function fetchSwapExecutionStatus(
    input: SwapExecutionInput
): Promise<DirectExecutionStatusResult> {
    return fetchDirectExecutionStatus(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/execute/status`,
        input.ftxApiToken,
        {
            orderId: input.orderId,
            telegramUserId: input.telegramUserId,
            userPublicKey: input.userPublicKey,
            inMint: input.inMint,
            outMint: input.outMint,
            amountIn: input.amountIn,
            slippageBps: input.slippageBps,
            priorityFee: input.priorityFeeLamports,
        }
    );
}

export async function validateScheduledOrder(
    input: ScheduledOrderInput
): Promise<ScheduledOrderValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                kind: input.kind,
                side: input.side,
                mint: input.mint,
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                triggerPrice: input.triggerPrice,
                triggerDirection: input.triggerDirection,
                orderCount: input.orderCount,
                intervalMinutes: input.intervalMinutes,
                trailingBps: input.trailingBps,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX order validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as ScheduledOrderValidationResult;
}

export async function storeScheduledOrder(
    input: ScheduledOrderInput
): Promise<ScheduledOrderStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                kind: input.kind,
                side: input.side,
                mint: input.mint,
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                triggerPrice: input.triggerPrice,
                triggerDirection: input.triggerDirection,
                orderCount: input.orderCount,
                intervalMinutes: input.intervalMinutes,
                trailingBps: input.trailingBps,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX order storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as ScheduledOrderStorageResult;
}

export async function fetchScheduledOrders(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<ScheduledOrderListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX order list failed with status ${response.status}`
        );
    }

    return (await response.json()) as ScheduledOrderListResult;
}

export async function cancelStoredScheduledOrder(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    orderId: string;
}): Promise<ScheduledOrderCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/orders/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                orderId: input.orderId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX order cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404 || response.status === 409) {
        const data = (await response.json()) as { error?: string };
        return {
            status: response.status === 404 ? "not_found" : "not_cancellable",
            error: data.error,
        };
    }

    return (await response.json()) as ScheduledOrderCancelResult;
}

export async function validateWithdrawal(
    input: WithdrawalValidationInput
): Promise<WithdrawalValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                amountIn: input.amountIn,
                amountLabel: input.amountLabel,
                destinationAddress: input.destinationAddress,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX withdrawal validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as WithdrawalValidationResult;
}

export async function executeWithdrawal(
    input: WithdrawalExecutionInput
): Promise<WithdrawalExecutionResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/execute`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                withdrawalId: input.withdrawalId,
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                amountIn: input.amountIn,
                amountLabel: input.amountLabel,
                destinationAddress: input.destinationAddress,
            }),
        }
    );

    const data =
        (await response.json()) as Partial<WithdrawalExecutionResult> & {
            error?: string;
        };
    if (data.status === "not_configured") {
        return data as Extract<
            WithdrawalExecutionResult,
            { status: "not_configured" }
        >;
    }
    if (data.status === "pending_reconciliation" && data.referenceId) {
        return data as Extract<
            WithdrawalExecutionResult,
            { status: "pending_reconciliation" }
        >;
    }
    if (data.status === "not_executable") {
        return data as Extract<
            WithdrawalExecutionResult,
            { status: "not_executable" }
        >;
    }
    if (
        response.ok &&
        data.status === "executed" &&
        typeof data.signature === "string" &&
        data.signature.length > 0
    ) {
        return data as Extract<
            WithdrawalExecutionResult,
            { status: "executed" }
        >;
    }

    return {
        status: "not_executable",
        error:
            data.error ??
            `FTX/FrogX rejected withdrawal execution with status ${response.status}`,
    };
}

export async function fetchWithdrawalExecutionStatus(
    input: WithdrawalExecutionInput
): Promise<DirectExecutionStatusResult> {
    return fetchDirectExecutionStatus(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/withdrawals/status`,
        input.ftxApiToken,
        {
            withdrawalId: input.withdrawalId,
            telegramUserId: input.telegramUserId,
            userPublicKey: input.userPublicKey,
            mint: input.mint,
            amountIn: input.amountIn,
            amountLabel: input.amountLabel,
            destinationAddress: input.destinationAddress,
        }
    );
}

async function fetchDirectExecutionStatus(
    url: string,
    ftxApiToken: string | undefined,
    body: Record<string, unknown>
): Promise<DirectExecutionStatusResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (ftxApiToken) {
        headers.Authorization = `Bearer ${ftxApiToken}`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    let data: Partial<DirectExecutionStatusResult> & { error?: string };
    try {
        data =
            (await response.json()) as Partial<DirectExecutionStatusResult> & {
                error?: string;
            };
    } catch {
        return {
            status: "lookup_error",
            error: `FTX/FrogX returned an unreadable execution-status response (${response.status})`,
        };
    }

    if (data.status === "not_configured") {
        return data as Extract<
            DirectExecutionStatusResult,
            { status: "not_configured" }
        >;
    }
    if (
        data.status === "executed" &&
        typeof data.signature === "string" &&
        data.signature.length > 0 &&
        typeof data.executedAt === "string"
    ) {
        return data as Extract<
            DirectExecutionStatusResult,
            { status: "executed" }
        >;
    }
    if (
        data.status === "lookup_error" ||
        data.status === "not_found" ||
        data.status === "not_executable" ||
        data.status === "mismatch" ||
        data.status === "pending" ||
        data.status === "failed"
    ) {
        return data as DirectExecutionStatusResult;
    }

    return {
        status: "lookup_error",
        error:
            data.error ??
            `FTX/FrogX returned an unexpected execution-status response (${response.status})`,
    };
}

export async function validateCopyTradeConfig(
    input: CopyTradeValidationInput
): Promise<CopyTradeValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                tag: input.tag,
                targetWallet: input.targetWallet,
                buyMode: input.buyMode,
                buyPercentageBps: input.buyPercentageBps,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                sellPriorityFee: input.sellPriorityFeeLamports,
                copySells: input.copySells,
                duplicateBuys: input.duplicateBuys,
                onlyRenounced: input.onlyRenounced,
                excludePumpFunTokens: input.excludePumpFunTokens,
                minTargetBuyAmountIn: input.minTargetBuyAmountIn,
                minLiquidityUsd: input.minLiquidityUsd,
                minMarketCapUsd: input.minMarketCapUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                blacklistMints: input.blacklistMints,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX copytrade validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as CopyTradeValidationResult;
}

export async function storeCopyTradeConfig(
    input: CopyTradeValidationInput
): Promise<CopyTradeStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                tag: input.tag,
                targetWallet: input.targetWallet,
                buyMode: input.buyMode,
                buyPercentageBps: input.buyPercentageBps,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                sellPriorityFee: input.sellPriorityFeeLamports,
                copySells: input.copySells,
                duplicateBuys: input.duplicateBuys,
                onlyRenounced: input.onlyRenounced,
                excludePumpFunTokens: input.excludePumpFunTokens,
                minTargetBuyAmountIn: input.minTargetBuyAmountIn,
                minLiquidityUsd: input.minLiquidityUsd,
                minMarketCapUsd: input.minMarketCapUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                blacklistMints: input.blacklistMints,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX copytrade storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as CopyTradeStorageResult;
}

export async function fetchCopyTradeConfigs(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<CopyTradeListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX copytrade list failed with status ${response.status}`
        );
    }

    return (await response.json()) as CopyTradeListResult;
}

export async function fetchCopyTradeExecutionStatus(
    input: AdvancedAutomationExecutionStatusInput
): Promise<AdvancedAutomationExecutionStatusResult<StoredCopyTradeConfig>> {
    return fetchAdvancedAutomationExecutionStatus<StoredCopyTradeConfig>(
        input,
        "copytrade"
    );
}

export async function cancelStoredCopyTradeConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
}): Promise<CopyTradeCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX copytrade cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredCopyTradeConfig;
        };
        return {
            status: "not_cancellable",
            error: data.error,
            config: data.config,
        };
    }

    return (await response.json()) as CopyTradeCancelResult;
}

export async function controlStoredCopyTradeConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
    action: "pause" | "resume";
}): Promise<CopyTradeControlResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/control`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
                action: input.action,
            }),
        }
    );
    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX copytrade control failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredCopyTradeConfig;
        };
        return {
            status: "not_controllable",
            error: data.error,
            config: data.config,
        };
    }
    return (await response.json()) as CopyTradeControlResult;
}

export async function updateStoredCopyTradeConfig(
    input: CopyTradeValidationInput & { configId: string }
): Promise<CopyTradeUpdateResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/update`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                configId: input.configId,
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                tag: input.tag,
                targetWallet: input.targetWallet,
                buyMode: input.buyMode,
                buyPercentageBps: input.buyPercentageBps,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                sellPriorityFee: input.sellPriorityFeeLamports,
                copySells: input.copySells,
                duplicateBuys: input.duplicateBuys,
                onlyRenounced: input.onlyRenounced,
                excludePumpFunTokens: input.excludePumpFunTokens,
                minTargetBuyAmountIn: input.minTargetBuyAmountIn,
                minLiquidityUsd: input.minLiquidityUsd,
                minMarketCapUsd: input.minMarketCapUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                blacklistMints: input.blacklistMints,
            }),
        }
    );
    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX copytrade update failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredCopyTradeConfig;
        };
        return {
            status: "not_updatable",
            error: data.error,
            config: data.config,
        };
    }
    return (await response.json()) as CopyTradeUpdateResult;
}

export async function duplicateStoredCopyTradeConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
    tag?: string;
}): Promise<CopyTradeDuplicateResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/copytrade/duplicate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
                tag: input.tag,
            }),
        }
    );
    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX copytrade duplicate failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredCopyTradeConfig;
        };
        return {
            status: "not_duplicable",
            error: data.error,
            config: data.config,
        };
    }
    return (await response.json()) as CopyTradeDuplicateResult;
}

export async function validateSniperConfig(
    input: SniperValidationInput
): Promise<SniperValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                source: input.source,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                maxSnipes: input.maxSnipes,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX sniper validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as SniperValidationResult;
}

export async function storeSniperConfig(
    input: SniperValidationInput
): Promise<SniperStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                source: input.source,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                maxSnipes: input.maxSnipes,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX sniper storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as SniperStorageResult;
}

export async function fetchSniperConfigs(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<SniperListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX sniper list failed with status ${response.status}`
        );
    }

    return (await response.json()) as SniperListResult;
}

export async function fetchSniperExecutionStatus(
    input: AdvancedAutomationExecutionStatusInput
): Promise<AdvancedAutomationExecutionStatusResult<StoredSniperConfig>> {
    return fetchAdvancedAutomationExecutionStatus<StoredSniperConfig>(
        input,
        "sniper"
    );
}

export async function cancelStoredSniperConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
}): Promise<SniperCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/sniper/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX sniper cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredSniperConfig;
        };
        return {
            status: "not_cancellable",
            error: data.error,
            config: data.config,
        };
    }

    return (await response.json()) as SniperCancelResult;
}

export async function validateAutoBuyConfig(
    input: AutoBuyValidationInput
): Promise<AutoBuyValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-buy validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoBuyValidationResult;
}

export async function storeAutoBuyConfig(
    input: AutoBuyValidationInput
): Promise<AutoBuyStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                maxBuyAmountIn: input.maxBuyAmountIn,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-buy storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoBuyStorageResult;
}

export async function fetchAutoBuyConfigs(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<AutoBuyListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-buy list failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoBuyListResult;
}

export async function fetchAutoBuyExecutionStatus(
    input: AdvancedAutomationExecutionStatusInput
): Promise<AdvancedAutomationExecutionStatusResult<StoredAutoBuyConfig>> {
    return fetchAdvancedAutomationExecutionStatus<StoredAutoBuyConfig>(
        input,
        "auto-buy"
    );
}

export async function cancelStoredAutoBuyConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
}): Promise<AutoBuyCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-buy/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX auto-buy cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredAutoBuyConfig;
        };
        return {
            status: "not_cancellable",
            error: data.error,
            config: data.config,
        };
    }

    return (await response.json()) as AutoBuyCancelResult;
}

export async function validateBundleBuyConfig(
    input: BundleBuyValidationInput
): Promise<BundleBuyValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                items: input.items,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX bundle-buy validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as BundleBuyValidationResult;
}

export async function storeBundleBuyConfig(
    input: BundleBuyValidationInput
): Promise<BundleBuyStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                items: input.items,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX bundle-buy storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as BundleBuyStorageResult;
}

export async function fetchBundleBuyConfigs(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<BundleBuyListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX bundle-buy list failed with status ${response.status}`
        );
    }

    return (await response.json()) as BundleBuyListResult;
}

export async function cancelStoredBundleBuyConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
}): Promise<BundleBuyCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX bundle-buy cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404 || response.status === 409) {
        const data = (await response.json()) as { error?: string };
        return {
            status: response.status === 404 ? "not_found" : "not_cancellable",
            error: data.error,
        };
    }

    return (await response.json()) as BundleBuyCancelResult;
}

export async function executeStoredBundleBuyConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    configId: string;
}): Promise<BundleBuyExecutionResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/execute`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                configId: input.configId,
            }),
        }
    );

    const data =
        (await response.json()) as Partial<BundleBuyExecutionResult> & {
            error?: string;
        };
    if (data.status === "not_configured") {
        return data as Extract<
            BundleBuyExecutionResult,
            { status: "not_configured" }
        >;
    }
    if (data.status === "not_found") {
        return data as Extract<
            BundleBuyExecutionResult,
            { status: "not_found" }
        >;
    }
    if (data.status === "pending_reconciliation" && data.configId) {
        return data as Extract<
            BundleBuyExecutionResult,
            { status: "pending_reconciliation" }
        >;
    }
    if (data.status === "not_executable") {
        return data as Extract<
            BundleBuyExecutionResult,
            { status: "not_executable" }
        >;
    }
    if (
        response.ok &&
        data.status === "executed" &&
        typeof data.configId === "string" &&
        Array.isArray(data.executions)
    ) {
        return data as Extract<
            BundleBuyExecutionResult,
            { status: "executed" }
        >;
    }
    return {
        status: "not_executable",
        error:
            data.error ??
            `FTX/FrogX rejected bundle-buy execution with status ${response.status}`,
    };
}

export async function fetchStoredBundleBuyExecutionStatus(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    userPublicKey: string;
    configId: string;
}): Promise<BundleBuyExecutionStatusResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/bundle-buy/status`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                configId: input.configId,
            }),
        }
    );
    let data: Partial<BundleBuyExecutionStatusResult> & { error?: string };
    try {
        data =
            (await response.json()) as Partial<BundleBuyExecutionStatusResult> & {
                error?: string;
            };
    } catch {
        return {
            status: "lookup_error",
            error: `FTX/FrogX returned an unreadable bundle status response (${response.status})`,
        };
    }
    if (data.status === "not_configured") {
        return data as Extract<
            BundleBuyExecutionStatusResult,
            { status: "not_configured" }
        >;
    }
    if (
        data.status === "executed" &&
        typeof data.configId === "string" &&
        typeof data.executedAt === "string" &&
        Array.isArray(data.executions)
    ) {
        return data as Extract<
            BundleBuyExecutionStatusResult,
            { status: "executed" }
        >;
    }
    if (
        data.status === "not_found" ||
        data.status === "not_started" ||
        data.status === "pending_reconciliation" ||
        data.status === "failed" ||
        data.status === "mismatch" ||
        data.status === "lookup_error"
    ) {
        return data as BundleBuyExecutionStatusResult;
    }
    return {
        status: "lookup_error",
        error:
            data.error ??
            `FTX/FrogX returned an unexpected bundle status response (${response.status})`,
    };
}

export async function validateAutoSellConfig(
    input: AutoSellValidationInput
): Promise<AutoSellValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                sellBps: input.sellBps,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                triggerPrice: input.triggerPrice,
                triggerDirection: input.triggerDirection,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-sell validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoSellValidationResult;
}

export async function storeAutoSellConfig(
    input: AutoSellValidationInput
): Promise<AutoSellStorageResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                sellBps: input.sellBps,
                amountLabel: input.amountLabel,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                triggerPrice: input.triggerPrice,
                triggerDirection: input.triggerDirection,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-sell storage failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoSellStorageResult;
}

export async function fetchAutoSellConfigs(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
}): Promise<AutoSellListResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell?telegramUserId=${encodeURIComponent(input.telegramUserId)}`,
        { headers }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX auto-sell list failed with status ${response.status}`
        );
    }

    return (await response.json()) as AutoSellListResult;
}

export async function fetchAutoSellExecutionStatus(
    input: AdvancedAutomationExecutionStatusInput
): Promise<AdvancedAutomationExecutionStatusResult<StoredAutoSellConfig>> {
    return fetchAdvancedAutomationExecutionStatus<StoredAutoSellConfig>(
        input,
        "auto-sell"
    );
}

export async function cancelStoredAutoSellConfig(input: {
    frogxApiBaseUrl: string;
    ftxApiToken?: string;
    telegramUserId: string;
    configId: string;
}): Promise<AutoSellCancelResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/auto-sell/cancel`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                configId: input.configId,
            }),
        }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(
            `FrogX auto-sell cancel failed with status ${response.status}`
        );
    }
    if (response.status === 404) {
        const data = (await response.json()) as { error?: string };
        return { status: "not_found", error: data.error };
    }
    if (response.status === 409) {
        const data = (await response.json()) as {
            error?: string;
            config?: StoredAutoSellConfig;
        };
        return {
            status: "not_cancellable",
            error: data.error,
            config: data.config,
        };
    }

    return (await response.json()) as AutoSellCancelResult;
}

export async function validatePreferences(
    input: PreferenceValidationInput
): Promise<PreferenceValidationResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/preferences/validate`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                kind: input.kind,
                action: input.action,
                mint: input.mint,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                sellPriorityFee: input.sellPriorityFeeLamports,
                defaultBuyAmountIn: input.defaultBuyAmountIn,
                buyPresetAmountsIn: input.buyPresetAmountsIn,
                sellPresetBps: input.sellPresetBps,
                botMode: input.botMode,
                confirmTrades: input.confirmTrades,
                sellProtection: input.sellProtection,
                autoBuyEnabled: input.autoBuyEnabled,
                instantAutoBuyEnabled: input.instantAutoBuyEnabled,
                instantAutoBuyAmountIn: input.instantAutoBuyAmountIn,
                instantAutoBuyMinLiquidityUsd:
                    input.instantAutoBuyMinLiquidityUsd,
                instantAutoBuyMaxMarketCapUsd:
                    input.instantAutoBuyMaxMarketCapUsd,
                autoSellEnabled: input.autoSellEnabled,
                sniperEnabled: input.sniperEnabled,
                mevProtection: input.mevProtection,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX preference validation failed with status ${response.status}`
        );
    }

    return (await response.json()) as PreferenceValidationResult;
}

export async function fetchPositions(
    input: PositionsInput
): Promise<PositionsResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/positions`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX positions failed with status ${response.status}`
        );
    }

    return (await response.json()) as PositionsResult;
}

export async function fetchTokenCleanup(
    input: TokenCleanupInput
): Promise<TokenCleanupResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/token-cleanup/review`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                hiddenTokens: input.hiddenTokens,
                dustUsdThreshold: input.dustUsdThreshold,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX token cleanup failed with status ${response.status}`
        );
    }

    return (await response.json()) as TokenCleanupResult;
}

export async function fetchTokenSafety(
    input: TokenSafetyInput
): Promise<TokenSafetyResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/token-safety`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                mint: input.mint,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX token safety failed with status ${response.status}`
        );
    }

    return (await response.json()) as TokenSafetyResult;
}

export async function fetchMarketRisk(
    input: MarketRiskInput
): Promise<MarketRiskResult> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/market-risk`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                mint: input.mint,
                amountIn: input.amountIn,
                slippageBps: input.slippageBps,
                priorityFeeLamports: input.priorityFeeLamports,
                minLiquidityUsd: input.minLiquidityUsd,
                maxMarketCapUsd: input.maxMarketCapUsd,
                maxPriceImpactBps: input.maxPriceImpactBps,
            }),
        }
    );

    if (!response.ok && response.status !== 503) {
        throw new Error(
            `FrogX market risk failed with status ${response.status}`
        );
    }

    return (await response.json()) as MarketRiskResult;
}

export async function fetchPnl(input: PnlInput): Promise<PnlResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const params = new URLSearchParams({
        telegramUserId: input.telegramUserId,
    });
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/pnl?${params.toString()}`,
        { headers }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 404 &&
        response.status !== 409
    ) {
        throw new Error(`FrogX PNL failed with status ${response.status}`);
    }

    return (await response.json()) as PnlResult;
}

export async function fetchNftHoldings(
    input: NftHoldingsInput
): Promise<NftHoldingsResult> {
    const headers: Record<string, string> = {};
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }

    const params = new URLSearchParams({
        telegramUserId: input.telegramUserId,
        page: String(input.page ?? 1),
        limit: String(input.limit ?? 5),
    });
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/nfts?${params.toString()}`,
        { headers }
    );

    if (
        !response.ok &&
        response.status !== 503 &&
        response.status !== 502 &&
        response.status !== 404
    ) {
        throw new Error(
            `FrogX NFT holdings failed with status ${response.status}`
        );
    }

    return (await response.json()) as NftHoldingsResult;
}

function tradingBotHeaders(ftxApiToken?: string): Record<string, string> {
    return {
        "Content-Type": "application/json",
        ...(ftxApiToken ? { Authorization: `Bearer ${ftxApiToken}` } : {}),
    };
}

async function readFrogTradeResponse(
    response: Response
): Promise<FrogTradeExecutionResult> {
    let body: FrogTradeExecutionResult;
    try {
        body = (await response.json()) as FrogTradeExecutionResult;
    } catch {
        throw new Error(`Frog NFT trade failed with status ${response.status}`);
    }
    if (!response.ok && !body.status) {
        return {
            status: "failed",
            error: body.error || `Frog NFT trade failed (${response.status})`,
            code: body.code,
        };
    }
    return body;
}

export async function fetchFrogMarket(
    input: FrogMarketInput
): Promise<FrogMarketResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/market`,
        {
            method: "POST",
            headers: tradingBotHeaders(input.ftxApiToken),
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                walletAddress: input.walletAddress,
            }),
        }
    );
    const body = (await response.json()) as FrogMarketResult & {
        code?: string;
        error?: string;
    };
    if (!response.ok) {
        return {
            status: "unavailable",
            code: body.code,
            error: body.error || "Magic Eden market data is unavailable.",
        };
    }
    return body;
}

export async function fetchFrogTopOffer(
    input: Pick<FrogMarketInput, "frogxApiBaseUrl">
): Promise<FrogTopOfferResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/magic-eden/top-offer`
    );
    const body = (await response.json()) as {
        offer?: Extract<FrogTopOfferResult, { status: "ready" }>["offer"];
        code?: string;
        error?: string;
    };
    if (!response.ok || !body.offer) {
        return {
            status: "unavailable",
            code: body.code,
            error: body.error || "No live Magic Eden offer is available.",
        };
    }
    return { status: "ready", offer: body.offer };
}

export async function executeFrogBuy(
    input: FrogBuyExecutionInput
): Promise<FrogTradeExecutionResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/execute-buy`,
        {
            method: "POST",
            headers: tradingBotHeaders(input.ftxApiToken),
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                walletAddress: input.walletAddress,
                executionId: input.executionId,
                maximumPaymentLamports: input.maximumPaymentLamports,
                ...(input.expectedMint
                    ? { expectedMint: input.expectedMint }
                    : {}),
                ...(input.excludedMints?.length
                    ? { excludedMints: input.excludedMints }
                    : {}),
            }),
        }
    );
    return readFrogTradeResponse(response);
}

export async function fetchFrogBuyExecutionStatus(
    input: FrogBuyExecutionInput
): Promise<FrogTradeExecutionResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/frogs/execute-buy/status`,
        {
            method: "POST",
            headers: tradingBotHeaders(input.ftxApiToken),
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                walletAddress: input.walletAddress,
                executionId: input.executionId,
                maximumPaymentLamports: input.maximumPaymentLamports,
                ...(input.expectedMint
                    ? { expectedMint: input.expectedMint }
                    : {}),
            }),
        }
    );
    return readFrogTradeResponse(response);
}

export async function executeFrogSell(
    input: FrogSellExecutionInput
): Promise<FrogTradeExecutionResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/magic-eden/execute-sell`,
        {
            method: "POST",
            headers: tradingBotHeaders(input.ftxApiToken),
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                walletAddress: input.walletAddress,
                executionId: input.executionId,
                mint: input.mint,
                minimumPaymentLamports: input.minimumPaymentLamports,
            }),
        }
    );
    return readFrogTradeResponse(response);
}

export async function fetchFrogSellExecutionStatus(
    input: FrogSellExecutionInput
): Promise<FrogTradeExecutionResult> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/magic-eden/execute-sell/status`,
        {
            method: "POST",
            headers: tradingBotHeaders(input.ftxApiToken),
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                walletAddress: input.walletAddress,
                executionId: input.executionId,
                mint: input.mint,
                minimumPaymentLamports: input.minimumPaymentLamports,
            }),
        }
    );
    return readFrogTradeResponse(response);
}

export async function fetchBuyQuote(input: BuyQuoteInput): Promise<FrogxQuote> {
    return fetchQuote({
        frogxApiBaseUrl: input.frogxApiBaseUrl,
        inMint: WRAPPED_SOL_MINT,
        outMint: input.outMint,
        amountIn: solToLamports(input.amountSol),
        userPublicKey: input.userPublicKey,
        slippageBps: input.slippageBps,
        priorityFeeLamports: input.priorityFeeLamports,
    });
}

export async function fetchQuote(input: QuoteInput): Promise<FrogxQuote> {
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/quotes`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                inMint: input.inMint,
                outMint: input.outMint,
                amountIn: input.amountIn,
                slippageBps: input.slippageBps,
                priorityFee: input.priorityFeeLamports,
                userPublicKey: input.userPublicKey,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`FrogX quote failed with status ${response.status}`);
    }

    const raw = (await response.json()) as RawFrogxQuote;
    return {
        amountOut: raw.amountOut,
        priceImpactBps: raw.priceImpactBps,
        routers: raw.routers.map((router) =>
            typeof router === "string"
                ? router
                : (router.name ?? router.id ?? "unknown-router")
        ),
        executable: raw.executable,
        updatedAt: raw.updatedAt,
        provider: raw.provider,
        routeId: raw.routeId,
        transactionBase64: raw.transactionBase64,
    };
}

export function solToLamports(amountSol: number): string {
    return Math.max(0, Math.round(amountSol * 1_000_000_000)).toString();
}

export function formatQuoteLines(quote: FrogxQuote): string[] {
    const route =
        quote.routers.length > 0 ? quote.routers.join(" -> ") : "unknown";
    return [
        `Estimated output: ${quote.amountOut} raw token units`,
        `Price impact: ${(quote.priceImpactBps / 100).toFixed(2)}%`,
        `Route: ${route}`,
        `Executable: ${quote.executable ? "yes" : "no"}`,
        `Updated: ${quote.updatedAt}`,
    ];
}

async function fetchAdvancedAutomationExecutionStatus<Config>(
    input: AdvancedAutomationExecutionStatusInput,
    segment: "copytrade" | "sniper" | "auto-buy" | "auto-sell"
): Promise<AdvancedAutomationExecutionStatusResult<Config>> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (input.ftxApiToken) {
        headers.Authorization = `Bearer ${input.ftxApiToken}`;
    }
    const response = await fetch(
        `${cleanBaseUrl(input.frogxApiBaseUrl)}/api/frogx/trading-bot/${segment}/status`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                telegramUserId: input.telegramUserId,
                userPublicKey: input.userPublicKey,
                configId: input.configId,
            }),
        }
    );
    const data = (await response.json()) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(
            `FrogX ${segment} status returned a malformed response`
        );
    }
    const record = data as Record<string, unknown>;
    const status = record.status;
    if (status === "not_configured") {
        return {
            status,
            required: Array.isArray(record.required)
                ? record.required.filter(
                      (value): value is string => typeof value === "string"
                  )
                : undefined,
        };
    }
    if (
        status === "not_found" ||
        status === "lookup_error" ||
        status === "mismatch"
    ) {
        return {
            status,
            error: typeof record.error === "string" ? record.error : undefined,
        };
    }

    const lifecycleStatuses = new Set([
        "monitoring",
        "pending_reconciliation",
        "executed",
        "failed",
        "cancelled",
    ]);
    const expectedKind =
        segment === "copytrade"
            ? "copytrade"
            : segment === "sniper"
              ? "sniper"
              : segment === "auto-buy"
                ? "auto_buy"
                : "auto_sell";
    const config = record.config;
    if (
        typeof status !== "string" ||
        !lifecycleStatuses.has(status) ||
        record.kind !== expectedKind ||
        record.configId !== input.configId ||
        typeof record.checkedAt !== "string" ||
        !config ||
        typeof config !== "object" ||
        Array.isArray(config)
    ) {
        throw new Error(
            `FrogX ${segment} status returned a malformed response`
        );
    }
    return data as AdvancedAutomationExecutionStatusResult<Config>;
}

function deltaNeutralUnavailableResult(
    response: Response,
    value: unknown
): DeltaNeutralUnavailableResult | null {
    const record = objectRecord(value);
    if (record?.status === "not_configured") {
        const required = stringArray(record.required);
        if (record.required !== undefined && !required) {
            throw new Error(
                "FrogX Delta Neutral returned malformed configuration requirements"
            );
        }
        return {
            status: "not_configured",
            ...(required ? { required } : {}),
        };
    }
    if (
        response.ok &&
        record?.status !== "blocked" &&
        record?.status !== "pending_reconciliation"
    ) {
        return null;
    }
    if (typeof record?.error !== "string" || !record.error.trim()) {
        throw new Error(
            "FrogX Delta Neutral returned a malformed error response"
        );
    }
    const status =
        record.status === "blocked" ||
        record.status === "pending_reconciliation"
            ? record.status
            : "unavailable";
    const run = deltaNeutralRun(record.run);
    return {
        status,
        error: record.error,
        ...(typeof record.retryable === "boolean"
            ? { retryable: record.retryable }
            : {}),
        ...(typeof record.runId === "string" ? { runId: record.runId } : {}),
        ...(run ? { run } : {}),
    };
}

function deltaNeutralPreview(value: unknown): DeltaNeutralPreview | null {
    const record = objectRecord(value);
    const blockers = stringArray(record?.blockers);
    if (
        record?.strategy !== "delta_neutral" ||
        record.preset !== "low" ||
        typeof record.wallet !== "string" ||
        !record.wallet ||
        record.profileIndex !== 1 ||
        !(
            record.profileAddress === null ||
            typeof record.profileAddress === "string"
        ) ||
        !isFiniteNonNegativeNumber(record.profileUsdc) ||
        record.minimumProfileUsdc !== 50 ||
        typeof record.profileFunded !== "boolean" ||
        typeof record.liveReady !== "boolean" ||
        record.liveEntryCapUsd !== 60 ||
        record.maxCycles !== 1 ||
        !blockers
    ) {
        return null;
    }
    return {
        strategy: "delta_neutral",
        preset: "low",
        wallet: record.wallet,
        profileIndex: 1,
        profileAddress: record.profileAddress as string | null,
        profileUsdc: record.profileUsdc,
        minimumProfileUsdc: 50,
        profileFunded: record.profileFunded,
        liveReady: record.liveReady,
        liveEntryCapUsd: 60,
        maxCycles: 1,
        blockers,
    };
}

function deltaNeutralRun(value: unknown): DeltaNeutralRun | undefined {
    return deltaNeutralRunStatus(value) ?? deltaNeutralStoredRunStatus(value);
}

function deltaNeutralRunStatus(value: unknown): DeltaNeutralRunStatus | null {
    const record = objectRecord(value);
    if (
        record?.strategy !== "delta_neutral" ||
        record.preset !== "low" ||
        typeof record.wallet !== "string" ||
        !record.wallet ||
        !(
            record.runId === null ||
            (typeof record.runId === "string" && record.runId)
        ) ||
        typeof record.launching !== "boolean" ||
        typeof record.running !== "boolean" ||
        typeof record.stopRequested !== "boolean" ||
        !isNonNegativeSafeInteger(record.completedCycles) ||
        record.maxCycles !== 1 ||
        record.dailyBudgetUsd !== 5 ||
        !isFiniteNonNegativeNumber(record.estimatedRunCostUsd) ||
        !isFiniteNonNegativeNumber(record.completedVolumeUsd) ||
        !isNullableSafeInteger(record.startedAtUnix) ||
        !isNullableSafeInteger(record.stoppedAtUnix) ||
        !(
            record.lastMessage === null ||
            typeof record.lastMessage === "string"
        ) ||
        typeof record.failed !== "boolean"
    ) {
        return null;
    }
    return {
        strategy: "delta_neutral",
        preset: "low",
        wallet: record.wallet,
        runId: record.runId as string | null,
        launching: record.launching,
        running: record.running,
        stopRequested: record.stopRequested,
        completedCycles: record.completedCycles,
        maxCycles: 1,
        dailyBudgetUsd: 5,
        estimatedRunCostUsd: record.estimatedRunCostUsd,
        completedVolumeUsd: record.completedVolumeUsd,
        startedAtUnix: record.startedAtUnix,
        stoppedAtUnix: record.stoppedAtUnix,
        lastMessage: record.lastMessage as string | null,
        failed: record.failed,
    };
}

function deltaNeutralStoredRunStatus(
    value: unknown
): DeltaNeutralStoredRunStatus | null {
    const record = objectRecord(value);
    if (
        record?.strategy !== "delta_neutral" ||
        record.preset !== "low" ||
        typeof record.wallet !== "string" ||
        !record.wallet ||
        typeof record.runId !== "string" ||
        !record.runId ||
        typeof record.status !== "string" ||
        !record.status ||
        typeof record.createdAt !== "string" ||
        typeof record.updatedAt !== "string"
    ) {
        return null;
    }
    return {
        strategy: "delta_neutral",
        preset: "low",
        wallet: record.wallet,
        runId: record.runId,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function stringArray(value: unknown): string[] | null {
    return Array.isArray(value) &&
        value.every((entry) => typeof entry === "string")
        ? value
        : null;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isNullableSafeInteger(value: unknown): value is number | null {
    return value === null || Number.isSafeInteger(value);
}

function cleanBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
}
