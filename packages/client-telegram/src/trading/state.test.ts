import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { TradingStateStore } from "./state.ts";

const tempFiles: string[] = [];

afterEach(() => {
    for (const file of tempFiles.splice(0)) {
        fs.rmSync(file, { force: true });
    }
});

const createStore = () => {
    const file = path.join(
        os.tmpdir(),
        `ribbot-trading-state-${crypto.randomUUID()}.json`
    );
    tempFiles.push(file);
    const store = new TradingStateStore(file);
    const user = store.getOrCreateUser("123456", "pond-chief", {
        confirmTrades: true,
        defaultBuySol: 0.1,
        slippageBps: 500,
        priorityFeeLamports: 0,
    });
    return { store, user };
};

describe("account settings cache", () => {
    it("defaults sniper opt-in off and syncs the FTX-owned setting", () => {
        const { store, user } = createStore();
        expect(user.settings.sniperEnabled).toBe(false);
        expect(user.settings).toMatchObject({
            botMode: "advanced",
            buyPresetsSol: [0.1, 0.25, 0.5, 1],
            sellPresetsPercent: [25, 50, 75, 100],
            sellPriorityFeeLamports: 0,
            sellProtection: true,
            instantAutoBuyEnabled: false,
            instantAutoBuyAmountSol: 0.1,
            instantAutoBuyMinLiquidityUsd: 1000,
        });

        const synced = store.syncAccountSnapshot(user, {
            telegramUserId: user.telegramUserId,
            settings: {
                botMode: "simple",
                confirmTrades: true,
                buyPresetAmountsIn: ["50000000", "200000000"],
                sellPresetBps: [3300, 6600, 10000],
                sellPriorityFee: 2500,
                sellProtection: false,
                sniperEnabled: true,
                instantAutoBuyEnabled: true,
                instantAutoBuyAmountIn: "150000000",
                instantAutoBuyMinLiquidityUsd: 2500,
                instantAutoBuyMaxMarketCapUsd: 2_000_000,
            },
            activeWalletId: "wallet_2",
            wallets: [
                {
                    walletId: "wallet_1",
                    label: "Wallet 1",
                    walletSource: "privy",
                    privyUserId: "user_123",
                    privyWalletId: "wallet_1",
                    solanaWalletAddress:
                        "11111111111111111111111111111111",
                    createdAt: "2026-07-10T00:00:00.000Z",
                },
                {
                    walletId: "wallet_2",
                    label: "Wallet 2",
                    walletSource: "privy",
                    privyUserId: "user_123",
                    privyWalletId: "wallet_2",
                    solanaWalletAddress:
                        "So11111111111111111111111111111111111111112",
                    createdAt: "2026-07-10T00:00:00.000Z",
                },
            ],
            updatedAt: "2026-07-10T12:00:00.000Z",
        });

        expect(synced.settings).toMatchObject({
            botMode: "simple",
            confirmTrades: false,
            buyPresetsSol: [0.05, 0.2],
            sellPresetsPercent: [33, 66, 100],
            sellPriorityFeeLamports: 2500,
            sellProtection: false,
            sniperEnabled: true,
            instantAutoBuyEnabled: true,
            instantAutoBuyAmountSol: 0.15,
            instantAutoBuyMinLiquidityUsd: 2500,
            instantAutoBuyMaxMarketCapUsd: 2_000_000,
        });
        expect(synced.activeWalletId).toBe("wallet_2");
        expect(synced.wallets).toHaveLength(2);
    });

    it("keeps confirmation disabled while simple mode is active", () => {
        const { store, user } = createStore();
        const simple = store.updateSettings(user, {
            botMode: "simple",
            confirmTrades: true,
        });

        expect(simple.settings.confirmTrades).toBe(false);
        expect(store.toggleConfirmTrades(simple).settings.confirmTrades).toBe(
            false
        );
    });
});

describe("copy-trade cache migration", () => {
    it("preserves legacy behavior while adding managed strategy defaults", () => {
        const file = path.join(
            os.tmpdir(),
            `ribbot-trading-state-${crypto.randomUUID()}.json`
        );
        tempFiles.push(file);
        fs.writeFileSync(
            file,
            JSON.stringify({
                users: {
                    "123456": {
                        telegramUserId: "123456",
                        username: "pond-chief",
                        createdAt: "2026-07-01T00:00:00.000Z",
                        updatedAt: "2026-07-01T00:00:00.000Z",
                        watchlist: [],
                        hiddenTokens: [],
                        copyTradeConfigs: {
                            c_legacy: {
                                id: "c_legacy",
                                status: "staged",
                                targetWallet:
                                    "11111111111111111111111111111111",
                                walletAddress:
                                    "So11111111111111111111111111111111111111112",
                                maxBuyAmountIn: "100000000",
                                amountLabel: "0.1 SOL",
                                slippageBps: 500,
                                priorityFeeLamports: 1000,
                                copySells: true,
                                minLiquidityUsd: 1000,
                                createdAt: "2026-07-01T00:00:00.000Z",
                                updatedAt: "2026-07-01T00:00:00.000Z",
                                validation: {
                                    validatedAt: "2026-07-01T00:00:00.000Z",
                                    warnings: [],
                                },
                            },
                        },
                        settings: {
                            confirmTrades: true,
                            defaultBuySol: 0.1,
                            slippageBps: 500,
                            priorityFeeLamports: 1000,
                            mevProtection: true,
                            autoBuyEnabled: false,
                            autoSellEnabled: false,
                            sniperEnabled: false,
                        },
                    },
                },
            })
        );

        const user = new TradingStateStore(file).getOrCreateUser(
            "123456",
            "pond-chief",
            {
                confirmTrades: true,
                defaultBuySol: 0.1,
                slippageBps: 500,
                priorityFeeLamports: 0,
            }
        );

        expect(user.copyTradeConfigs?.c_legacy).toMatchObject({
            buyMode: "percentage",
            buyPercentageBps: 10000,
            sellPriorityFeeLamports: 1000,
            duplicateBuys: true,
            onlyRenounced: false,
            excludePumpFunTokens: false,
            blacklistMints: [],
        });
    });
});

describe("direct execution cache state", () => {
    it("locks a pending swap ticket against cancellation", () => {
        const { store, user } = createStore();
        const order = store.createPendingOrder(user, {
            side: "buy",
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            inMint: "So11111111111111111111111111111111111111112",
            outMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            amountIn: "100000000",
            amountLabel: "0.1 SOL",
            walletAddress: "So11111111111111111111111111111111111111112",
            slippageBps: 500,
            priorityFeeLamports: 0,
        });

        const pending = store.markExecutionPending(user, order.id, {
            status: "pending",
            referenceId: "ribbot-123456-order_123",
            executionStartedAt: "2026-07-10T00:00:00.000Z",
            checkedAt: "2026-07-10T00:00:00.000Z",
            manualReviewRequired: true,
            manualReviewAfter: "2026-07-10T00:15:00.000Z",
            manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            manualReviewReason: "Privy status remains pending",
        });

        expect(pending?.status).toBe("execution_pending");
        expect(store.cancelPendingOrder(user, order.id)).toBeUndefined();
        expect(store.getPendingOrder(user, order.id)?.status).toBe(
            "execution_pending"
        );
        expect(
            store.getPendingOrder(user, order.id)?.reconciliation
        ).toMatchObject({
            manualReviewRequired: true,
            executionStartedAt: "2026-07-10T00:00:00.000Z",
            manualReviewAfter: "2026-07-10T00:15:00.000Z",
            manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            manualReviewReason: "Privy status remains pending",
        });
    });

    it("moves a reconciled swap from pending to executed", () => {
        const { store, user } = createStore();
        const order = store.createPendingOrder(user, {
            side: "sell",
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            inMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            outMint: "So11111111111111111111111111111111111111112",
            amountIn: "1000000",
            amountLabel: "100%",
            walletAddress: "So11111111111111111111111111111111111111112",
            slippageBps: 500,
            priorityFeeLamports: 0,
        });
        store.markExecutionPending(user, order.id, {
            status: "not_found",
            checkedAt: "2026-07-10T00:00:00.000Z",
        });

        const executed = store.markExecuted(user, order.id, {
            signature: "5xConfirmed",
            referenceId: "ribbot-123456-order_123",
            executedAt: "2026-07-10T00:01:00.000Z",
        });

        expect(executed?.status).toBe("executed");
        expect(executed?.reconciliation).toBeUndefined();
        expect(store.cancelPendingOrder(user, order.id)).toBeUndefined();
    });

    it("locks an unresolved withdrawal ticket against cancellation", () => {
        const { store, user } = createStore();
        const ticket = store.createWithdrawalTicket(user, {
            mint: "So11111111111111111111111111111111111111112",
            assetType: "sol",
            amountIn: "100000000",
            amountLabel: "0.1 SOL",
            walletAddress: "So11111111111111111111111111111111111111112",
            destinationAddress: "11111111111111111111111111111111",
            validation: {
                validatedAt: "2026-07-10T00:00:00.000Z",
                warnings: [],
            },
        });
        store.markWithdrawalExecutionPending(user, ticket.id, {
            status: "lookup_error",
            checkedAt: "2026-07-10T00:00:00.000Z",
        });

        expect(store.cancelWithdrawalTicket(user, ticket.id)).toBeUndefined();
        expect(store.getWithdrawalTicket(user, ticket.id)?.status).toBe(
            "execution_pending"
        );
    });
});

describe("bundle-buy execution cache state", () => {
    const createBundle = (
        store: TradingStateStore,
        user: ReturnType<TradingStateStore["getOrCreateUser"]>
    ) =>
        store.createBundleBuyConfig(user, {
            items: [
                {
                    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    maxBuyAmountIn: "50000000",
                    amountLabel: "0.05 SOL",
                },
                {
                    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
                    maxBuyAmountIn: "75000000",
                    amountLabel: "0.075 SOL",
                },
            ],
            walletAddress: "So11111111111111111111111111111111111111112",
            maxBuyAmountIn: "125000000",
            amountLabel: "0.125 SOL total",
            slippageBps: 500,
            priorityFeeLamports: 0,
            minLiquidityUsd: 1000,
            validation: {
                validatedAt: "2026-07-10T00:00:00.000Z",
                warnings: [],
            },
        });

    it("locks an executing basket against cancellation", () => {
        const { store, user } = createStore();
        const basket = createBundle(store, user);
        store.updateBundleBuyExecution(user, basket.id, "executing", {
            attemptedItems: 2,
            confirmedItems: 1,
            totalItems: 2,
            checkedAt: "2026-07-10T00:01:00.000Z",
            error: "Item 2 requires reconciliation",
            manualReviewRequired: true,
            manualReviewAfter: "2026-07-10T00:15:00.000Z",
            manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            manualReviewReason: "Privy status remains pending",
            executions: [],
        });

        expect(store.cancelBundleBuyConfig(user, basket.id)).toBeUndefined();
        expect(store.listBundleBuyConfigs(user)[0]).toMatchObject({
            status: "executing",
            execution: {
                attemptedItems: 2,
                confirmedItems: 1,
                manualReviewRequired: true,
                manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            },
        });
    });

    it("persists terminal failed and executed bundle states", () => {
        const { store, user } = createStore();
        const failedBasket = createBundle(store, user);
        const failed = store.updateBundleBuyExecution(
            user,
            failedBasket.id,
            "failed",
            {
                attemptedItems: 1,
                confirmedItems: 1,
                totalItems: 2,
                checkedAt: "2026-07-10T00:02:00.000Z",
                error: "FTX will not auto-resume the unattempted item",
                executions: [],
            }
        );
        const executedBasket = createBundle(store, user);
        const executed = store.updateBundleBuyExecution(
            user,
            executedBasket.id,
            "executed",
            {
                attemptedItems: 2,
                confirmedItems: 2,
                totalItems: 2,
                checkedAt: "2026-07-10T00:03:00.000Z",
                executions: [],
            }
        );

        expect(failed?.status).toBe("failed");
        expect(failed?.execution?.error).toContain("will not auto-resume");
        expect(executed?.status).toBe("executed");
        expect(
            store.cancelBundleBuyConfig(user, executedBasket.id)
        ).toBeUndefined();
    });
});

describe("advanced automation execution cache state", () => {
    it("persists auto-buy reconciliation state and blocks cancellation while executing", () => {
        const { store, user } = createStore();
        const config = store.upsertAutoBuyConfig(user, {
            id: "ab_locked",
            status: "executing",
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            walletAddress: "So11111111111111111111111111111111111111112",
            maxBuyAmountIn: "100000000",
            amountLabel: "0.1 SOL",
            slippageBps: 500,
            priorityFeeLamports: 0,
            minLiquidityUsd: 1000,
            createdAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T00:01:00.000Z",
            validation: {
                validatedAt: "2026-07-10T00:00:00.000Z",
                warnings: [],
            },
            monitor: {
                executionId: "auto_buy:ab_locked",
                executionReferenceId: "ribbot-123456-auto_buy:ab_locked",
                executionStartedAt: "2026-07-10T00:01:00.000Z",
                reconciliationStatus: "pending",
                manualReviewAfter: "2026-07-10T00:15:00.000Z",
                manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
                manualReviewReason: "Privy status remains pending",
            },
        });

        expect(store.cancelAutoBuyConfig(user, config.id)).toBeUndefined();
        expect(store.listAutoBuyConfigs(user)[0]).toMatchObject({
            status: "executing",
            monitor: {
                executionId: "auto_buy:ab_locked",
                reconciliationStatus: "pending",
                manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            },
        });

        const failed = store.upsertAutoBuyConfig(user, {
            ...config,
            status: "failed",
            updatedAt: "2026-07-10T00:02:00.000Z",
            monitor: {
                ...config.monitor,
                reconciliationStatus: "execution_reverted",
                executionCompletedAt: "2026-07-10T00:02:00.000Z",
                lastError: "Privy transaction ended with execution_reverted",
            },
        });
        expect(store.cancelAutoBuyConfig(user, failed.id)?.status).toBe(
            "cancelled"
        );
    });
});

describe("Robinhood alpha alert state", () => {
    it("defaults to opt-out, persists opt-in, and clears the cursor on opt-out", () => {
        const { store, user } = createStore();
        expect(user.alphaSignalsEnabled).toBe(false);

        const enabled = store.setAlphaSignalsEnabled(user, true);
        expect(enabled.alphaSignalsEnabled).toBe(true);
        store.initializeAlphaSignalCursor(
            enabled,
            ["robinhood:token:1"],
            "2026-07-21T03:00:00.000Z"
        );
        expect(store.getAlphaSignalCursor(enabled)).toMatchObject({
            seenEventIds: ["robinhood:token:1"],
            volumeBaselineAt: "2026-07-21T03:00:00.000Z",
        });

        const disabled = store.setAlphaSignalsEnabled(enabled, false);
        expect(disabled.alphaSignalsEnabled).toBe(false);
        expect(store.getAlphaSignalCursor(disabled)).toBeUndefined();
    });
});
