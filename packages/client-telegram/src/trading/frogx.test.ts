import { afterEach, describe, expect, it, vi } from "vitest";

import {
    cancelStoredAutoBuyConfig,
    cancelStoredAutoSellConfig,
    cancelStoredBundleBuyConfig,
    cancelStoredCopyTradeConfig,
    cancelStoredSniperConfig,
    controlStoredCopyTradeConfig,
    duplicateStoredCopyTradeConfig,
    executeStoredBundleBuyConfig,
    executeSwapTransaction,
    executeWithdrawal,
    fetchAutoBuyExecutionStatus,
    fetchAutoSellExecutionStatus,
    fetchCopyTradeExecutionStatus,
    fetchNftHoldings,
    fetchPnl,
    fetchSniperExecutionStatus,
    fetchStoredBundleBuyExecutionStatus,
    fetchSwapExecutionStatus,
    provisionTradingWallet,
    storeCopyTradeConfig,
    updateStoredCopyTradeConfig,
    validatePreferences,
} from "./frogx.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
});

const swapInput = {
    frogxApiBaseUrl: "https://frogx.example",
    ftxApiToken: "ribbot-token",
    orderId: "order_123",
    telegramUserId: "123456",
    userPublicKey: "So11111111111111111111111111111111111111112",
    inMint: "So11111111111111111111111111111111111111112",
    outMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amountIn: "100000000",
    slippageBps: 500,
    priorityFeeLamports: 0,
};

const bundleInput = {
    frogxApiBaseUrl: "https://frogx.example",
    ftxApiToken: "ribbot-token",
    telegramUserId: "123456",
    userPublicKey: "So11111111111111111111111111111111111111112",
    configId: "bb_testbundle",
};

describe("FTX settings client", () => {
    it("sends mode, presets, sell fee, and protection to FTX", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/preferences/validate"
            );
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            expect(JSON.parse(String(init?.body))).toMatchObject({
                telegramUserId: "123456",
                kind: "settings",
                action: "set",
                priorityFee: 1000,
                sellPriorityFee: 2000,
                buyPresetAmountsIn: ["100000000", "500000000"],
                sellPresetBps: [2500, 7500, 10000],
                botMode: "simple",
                confirmTrades: false,
                sellProtection: true,
                instantAutoBuyEnabled: true,
                instantAutoBuyAmountIn: "150000000",
                instantAutoBuyMinLiquidityUsd: 2500,
                instantAutoBuyMaxMarketCapUsd: 2_000_000,
            });
            return Response.json({
                status: "accepted",
                normalized: {
                    telegramUserId: "123456",
                    kind: "settings",
                    action: "set",
                    settings: {
                        priorityFee: 1000,
                        sellPriorityFee: 2000,
                        botMode: "simple",
                        confirmTrades: false,
                    },
                },
                warnings: [],
            });
        });

        const result = await validatePreferences({
            frogxApiBaseUrl: "https://frogx.example/",
            ftxApiToken: "ribbot-token",
            telegramUserId: "123456",
            kind: "settings",
            action: "set",
            priorityFeeLamports: 1000,
            sellPriorityFeeLamports: 2000,
            buyPresetAmountsIn: ["100000000", "500000000"],
            sellPresetBps: [2500, 7500, 10000],
            botMode: "simple",
            confirmTrades: false,
            sellProtection: true,
            instantAutoBuyEnabled: true,
            instantAutoBuyAmountIn: "150000000",
            instantAutoBuyMinLiquidityUsd: 2500,
            instantAutoBuyMaxMarketCapUsd: 2_000_000,
        });

        expect(result.status).toBe("accepted");
    });
});

describe("FTX wallet inventory client", () => {
    it("sends active-wallet selection only to the authenticated FTX route", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/wallet"
            );
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            expect(JSON.parse(String(init?.body))).toMatchObject({
                telegramUserId: "123456",
                action: "select",
                walletId: "wallet_2",
            });
            return Response.json({
                status: "ready",
                walletSource: "privy",
                privyUserId: "user_123",
                privyWalletId: "wallet_2",
                solanaWalletAddress:
                    "So11111111111111111111111111111111111111112",
                activeWalletId: "wallet_2",
                wallets: [],
                account: {
                    telegramUserId: "123456",
                    activeWalletId: "wallet_2",
                    wallets: [],
                },
            });
        });

        const result = await provisionTradingWallet({
            frogxApiBaseUrl: "https://frogx.example/",
            ftxApiToken: "ribbot-token",
            telegramUserId: "123456",
            action: "select",
            walletId: "wallet_2",
        });
        expect(result).toMatchObject({
            status: "ready",
            activeWalletId: "wallet_2",
        });
    });
});

describe("FTX copy-trade client", () => {
    const managedCopyTradeInput = {
        frogxApiBaseUrl: "https://frogx.example/",
        ftxApiToken: "ribbot-token",
        telegramUserId: "123456",
        userPublicKey: "So11111111111111111111111111111111111111112",
        tag: "Whale One",
        targetWallet: "11111111111111111111111111111111",
        buyMode: "percentage" as const,
        buyPercentageBps: 5000,
        maxBuyAmountIn: "100000000",
        amountLabel: "50% up to 0.1 SOL",
        slippageBps: 500,
        priorityFeeLamports: 1000,
        sellPriorityFeeLamports: 2500,
        copySells: true,
        duplicateBuys: false,
        onlyRenounced: true,
        excludePumpFunTokens: true,
        minTargetBuyAmountIn: "50000000",
        minLiquidityUsd: 10000,
        minMarketCapUsd: 100000,
        maxMarketCapUsd: 1000000,
        blacklistMints: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
    };

    it("sends managed strategy fields to the FTX storage endpoint", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/copytrade"
            );
            expect(init?.method).toBe("POST");
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            expect(JSON.parse(String(init?.body))).toMatchObject({
                tag: "Whale One",
                buyMode: "percentage",
                buyPercentageBps: 5000,
                sellPriorityFee: 2500,
                copySells: true,
                duplicateBuys: false,
                onlyRenounced: true,
                excludePumpFunTokens: true,
                minTargetBuyAmountIn: "50000000",
                minLiquidityUsd: 10000,
                minMarketCapUsd: 100000,
                maxMarketCapUsd: 1000000,
                blacklistMints: [
                    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                ],
            });
            return Response.json({
                status: "stored",
                configKind: "copytrade",
                config: { configId: "c_managed", status: "staged" },
                normalized: {},
                warnings: [],
                validatedAt: "2026-07-12T00:00:00.000Z",
            });
        });

        await expect(
            storeCopyTradeConfig(managedCopyTradeInput)
        ).resolves.toMatchObject({ status: "stored", configKind: "copytrade" });
    });

    it("pauses a strategy through the FTX control endpoint", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/copytrade/control"
            );
            expect(JSON.parse(String(init?.body))).toEqual({
                telegramUserId: "123456",
                configId: "c_managed",
                action: "pause",
            });
            return Response.json({
                status: "paused",
                config: { configId: "c_managed", status: "paused" },
            });
        });

        await expect(
            controlStoredCopyTradeConfig({
                frogxApiBaseUrl: "https://frogx.example",
                ftxApiToken: "ribbot-token",
                telegramUserId: "123456",
                configId: "c_managed",
                action: "pause",
            })
        ).resolves.toMatchObject({ status: "paused" });
    });

    it("normalizes an invalid control transition", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    error: "Config execution is already in progress",
                    config: { configId: "c_managed", status: "executing" },
                },
                { status: 409 }
            )
        );

        await expect(
            controlStoredCopyTradeConfig({
                frogxApiBaseUrl: "https://frogx.example",
                ftxApiToken: "ribbot-token",
                telegramUserId: "123456",
                configId: "c_managed",
                action: "pause",
            })
        ).resolves.toMatchObject({
            status: "not_controllable",
            error: "Config execution is already in progress",
        });
    });

    it("sends a complete strategy replacement to the FTX update endpoint", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/copytrade/update"
            );
            expect(JSON.parse(String(init?.body))).toMatchObject({
                configId: "c_managed",
                telegramUserId: "123456",
                tag: "Whale One",
                buyMode: "percentage",
                buyPercentageBps: 5000,
                sellPriorityFee: 2500,
                duplicateBuys: false,
                onlyRenounced: true,
                excludePumpFunTokens: true,
            });
            return Response.json({
                status: "updated",
                targetChanged: false,
                config: { configId: "c_managed", status: "staged" },
                normalized: {},
                warnings: [],
                validatedAt: "2026-07-12T00:00:00.000Z",
            });
        });

        await expect(
            updateStoredCopyTradeConfig({
                ...managedCopyTradeInput,
                configId: "c_managed",
            })
        ).resolves.toMatchObject({
            status: "updated",
            targetChanged: false,
        });
    });

    it("keeps a rejected executing strategy authoritative during edit", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    error: "Config cannot be updated from executing status",
                    config: { configId: "c_managed", status: "executing" },
                },
                { status: 409 }
            )
        );

        await expect(
            updateStoredCopyTradeConfig({
                ...managedCopyTradeInput,
                configId: "c_managed",
            })
        ).resolves.toMatchObject({
            status: "not_updatable",
            error: "Config cannot be updated from executing status",
            config: { status: "executing" },
        });
    });

    it("duplicates a strategy through FTX without rebuilding it in Ribbot", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/copytrade/duplicate"
            );
            expect(JSON.parse(String(init?.body))).toEqual({
                telegramUserId: "123456",
                configId: "c_managed",
                tag: "Whale Copy",
            });
            return Response.json({
                status: "duplicated",
                sourceConfigId: "c_managed",
                config: {
                    configId: "c_copy",
                    status: "staged",
                    monitor: {},
                },
                normalized: {},
                warnings: [],
                validatedAt: "2026-07-12T00:00:00.000Z",
            });
        });

        await expect(
            duplicateStoredCopyTradeConfig({
                frogxApiBaseUrl: "https://frogx.example/",
                ftxApiToken: "ribbot-token",
                telegramUserId: "123456",
                configId: "c_managed",
                tag: "Whale Copy",
            })
        ).resolves.toMatchObject({
            status: "duplicated",
            sourceConfigId: "c_managed",
            config: { configId: "c_copy", status: "staged", monitor: {} },
        });
    });
});

describe("FTX direct execution client", () => {
    it("tags instant Auto Buy execution for FTX-side enforcement", async () => {
        globalThis.fetch = vi.fn(async (_input, init) => {
            expect(JSON.parse(String(init?.body))).toMatchObject({
                orderId: "order_123",
                executionMode: "instant_auto_buy",
            });
            return Response.json({
                status: "not_executable",
                error: "test stop",
            });
        });

        await executeSwapTransaction({
            ...swapInput,
            executionMode: "instant_auto_buy",
        });
    });

    it("normalizes a revoked 409 response instead of treating it as success", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    status: "revoked",
                    error: "FTX bot access has been revoked for this account",
                },
                { status: 409 }
            )
        );

        await expect(executeSwapTransaction(swapInput)).resolves.toEqual({
            status: "not_executable",
            error: "FTX bot access has been revoked for this account",
        });
    });

    it("preserves FTX pending-reconciliation responses", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    status: "pending_reconciliation",
                    referenceId: "ribbot-123456-order_123",
                    executionStartedAt: "2026-07-10T00:00:00.000Z",
                    manualReviewRequired: false,
                    manualReviewAfter: "2026-07-10T00:15:00.000Z",
                    manualReviewRequiredAt: null,
                    manualReviewReason: null,
                    error: "Check status before retrying",
                },
                { status: 503 }
            )
        );

        await expect(executeSwapTransaction(swapInput)).resolves.toEqual({
            status: "pending_reconciliation",
            referenceId: "ribbot-123456-order_123",
            executionStartedAt: "2026-07-10T00:00:00.000Z",
            manualReviewRequired: false,
            manualReviewAfter: "2026-07-10T00:15:00.000Z",
            manualReviewRequiredAt: null,
            manualReviewReason: null,
            error: "Check status before retrying",
        });
    });

    it("fails closed on a malformed successful execution response", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json({
                status: "executed",
                transactionId: "missing-signature",
            })
        );

        const result = await executeSwapTransaction(swapInput);
        expect(result.status).toBe("not_executable");
        expect(result).toMatchObject({
            error: "FTX/FrogX rejected swap execution with status 200",
        });
    });

    it("checks swap status through the read-only FTX endpoint", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/execute/status"
            );
            expect(init?.method).toBe("POST");
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            const body = JSON.parse(String(init?.body)) as Record<
                string,
                unknown
            >;
            expect(body).toMatchObject({
                orderId: "order_123",
                telegramUserId: "123456",
            });
            return Response.json({
                status: "executed",
                providerStatus: "confirmed",
                signature: "5xConfirmed",
                transactionId: "privy-123",
                referenceId: "ribbot-123456-order_123",
                executedAt: "2026-07-10T00:00:00.000Z",
                checkedAt: "2026-07-10T00:00:00.000Z",
            });
        });

        const result = await fetchSwapExecutionStatus(swapInput);
        expect(result).toMatchObject({
            status: "executed",
            providerStatus: "confirmed",
            signature: "5xConfirmed",
        });
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("preserves manual-review state from direct status lookup", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json({
                status: "not_found",
                referenceId: "ribbot-123456-order_123",
                executionStartedAt: "2026-07-10T00:00:00.000Z",
                checkedAt: "2026-07-10T00:16:00.000Z",
                manualReviewRequired: true,
                manualReviewAfter: "2026-07-10T00:15:00.000Z",
                manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
                manualReviewReason: "Privy status remains unresolved",
                error: "No Privy transaction found",
            })
        );

        await expect(
            fetchSwapExecutionStatus(swapInput)
        ).resolves.toMatchObject({
            status: "not_found",
            manualReviewRequired: true,
            manualReviewAfter: "2026-07-10T00:15:00.000Z",
            manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
            manualReviewReason: "Privy status remains unresolved",
        });
    });

    it("normalizes withdrawal 409 errors without fabricating execution metadata", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json({ error: "Trading wallet mismatch" }, { status: 409 })
        );

        const result = await executeWithdrawal({
            frogxApiBaseUrl: "https://frogx.example",
            ftxApiToken: "ribbot-token",
            withdrawalId: "w_123",
            telegramUserId: "123456",
            userPublicKey: "So11111111111111111111111111111111111111112",
            mint: "So11111111111111111111111111111111111111112",
            amountIn: "100000000",
            amountLabel: "0.1 SOL",
            destinationAddress: "11111111111111111111111111111111",
        });

        expect(result).toEqual({
            status: "not_executable",
            error: "Trading wallet mismatch",
        });
    });
});

describe("FTX bundle-buy execution client", () => {
    it("normalizes a 409 bundle response without fabricating execution", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    status: "revoked",
                    error: "FTX bot access has been revoked for this account",
                },
                { status: 409 }
            )
        );

        await expect(
            executeStoredBundleBuyConfig(bundleInput)
        ).resolves.toEqual({
            status: "not_executable",
            error: "FTX bot access has been revoked for this account",
        });
    });

    it("fails closed on a malformed successful bundle response", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json({ status: "executed", configId: "bb_testbundle" })
        );

        await expect(
            executeStoredBundleBuyConfig(bundleInput)
        ).resolves.toEqual({
            status: "not_executable",
            error: "FTX/FrogX rejected bundle-buy execution with status 200",
        });
    });

    it("preserves bundle reconciliation progress", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                {
                    status: "pending_reconciliation",
                    configId: "bb_testbundle",
                    configStatus: "executing",
                    attemptedItems: 2,
                    confirmedItems: 1,
                    totalItems: 2,
                    executions: [
                        {
                            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                            amountIn: "50000000",
                            signature: "5xBundleConfirmed1",
                        },
                    ],
                    manualReviewRequired: true,
                    manualReviewAfter: "2026-07-10T00:15:00.000Z",
                    manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
                    manualReviewReason: "Privy status remains pending",
                    error: "Bundle item 2 still needs reconciliation",
                },
                { status: 503 }
            )
        );

        await expect(
            executeStoredBundleBuyConfig(bundleInput)
        ).resolves.toMatchObject({
            status: "pending_reconciliation",
            configStatus: "executing",
            attemptedItems: 2,
            confirmedItems: 1,
            totalItems: 2,
            manualReviewRequired: true,
            manualReviewRequiredAt: "2026-07-10T00:16:00.000Z",
        });
    });

    it.each([
        {
            response: {
                status: "pending_reconciliation",
                configId: "bb_testbundle",
                configStatus: "executing",
                attemptedItems: 2,
                confirmedItems: 1,
                totalItems: 2,
                executions: [],
                checkedAt: "2026-07-10T00:00:00.000Z",
                error: "Privy status is pending",
            },
            expectedStatus: "pending_reconciliation",
            httpStatus: 503,
        },
        {
            response: {
                status: "executed",
                configId: "bb_testbundle",
                configStatus: "executed",
                itemCount: 2,
                totalAmountIn: "125000000",
                executions: [],
                executedAt: "2026-07-10T00:01:00.000Z",
            },
            expectedStatus: "executed",
            httpStatus: 200,
        },
    ])(
        "parses $expectedStatus from the read-only bundle status endpoint",
        async ({ response, expectedStatus, httpStatus }) => {
            globalThis.fetch = vi.fn(async (input, init) => {
                expect(String(input)).toBe(
                    "https://frogx.example/api/frogx/trading-bot/bundle-buy/status"
                );
                expect(init?.method).toBe("POST");
                expect(JSON.parse(String(init?.body))).toMatchObject({
                    telegramUserId: "123456",
                    configId: "bb_testbundle",
                });
                return Response.json(response, { status: httpStatus });
            });

            const result =
                await fetchStoredBundleBuyExecutionStatus(bundleInput);
            expect(result.status).toBe(expectedStatus);
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        }
    );

    it("normalizes an executing-basket cancel conflict", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                { error: "Config execution is already in progress" },
                { status: 409 }
            )
        );

        await expect(
            cancelStoredBundleBuyConfig({
                frogxApiBaseUrl: bundleInput.frogxApiBaseUrl,
                ftxApiToken: bundleInput.ftxApiToken,
                telegramUserId: bundleInput.telegramUserId,
                configId: bundleInput.configId,
            })
        ).resolves.toEqual({
            status: "not_cancellable",
            error: "Config execution is already in progress",
        });
    });

    it.each([
        [
            "copytrade",
            () =>
                cancelStoredCopyTradeConfig({
                    frogxApiBaseUrl: bundleInput.frogxApiBaseUrl,
                    ftxApiToken: bundleInput.ftxApiToken,
                    telegramUserId: bundleInput.telegramUserId,
                    configId: "c_locked",
                }),
        ],
        [
            "sniper",
            () =>
                cancelStoredSniperConfig({
                    frogxApiBaseUrl: bundleInput.frogxApiBaseUrl,
                    ftxApiToken: bundleInput.ftxApiToken,
                    telegramUserId: bundleInput.telegramUserId,
                    configId: "s_locked",
                }),
        ],
        [
            "auto-buy",
            () =>
                cancelStoredAutoBuyConfig({
                    frogxApiBaseUrl: bundleInput.frogxApiBaseUrl,
                    ftxApiToken: bundleInput.ftxApiToken,
                    telegramUserId: bundleInput.telegramUserId,
                    configId: "ab_locked",
                }),
        ],
        [
            "auto-sell",
            () =>
                cancelStoredAutoSellConfig({
                    frogxApiBaseUrl: bundleInput.frogxApiBaseUrl,
                    ftxApiToken: bundleInput.ftxApiToken,
                    telegramUserId: bundleInput.telegramUserId,
                    configId: "as_locked",
                }),
        ],
    ])("normalizes a locked %s cancel conflict", async (_label, cancel) => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(
                { error: "Config execution is already in progress" },
                { status: 409 }
            )
        );

        await expect(cancel()).resolves.toMatchObject({
            status: "not_cancellable",
            error: "Config execution is already in progress",
        });
    });

    it.each([
        ["copytrade", "copytrade", fetchCopyTradeExecutionStatus],
        ["sniper", "sniper", fetchSniperExecutionStatus],
        ["auto-buy", "auto_buy", fetchAutoBuyExecutionStatus],
        ["auto-sell", "auto_sell", fetchAutoSellExecutionStatus],
    ])(
        "checks pending %s execution through the FTX status endpoint",
        async (segment, kind, checkStatus) => {
            globalThis.fetch = vi.fn(async (input, init) => {
                expect(String(input)).toBe(
                    `https://frogx.example/api/frogx/trading-bot/${segment}/status`
                );
                expect(init?.method).toBe("POST");
                expect(JSON.parse(String(init?.body))).toEqual({
                    telegramUserId: "123456",
                    userPublicKey:
                        "So11111111111111111111111111111111111111112",
                    configId: `${kind}_locked`,
                });
                return Response.json(
                    {
                        status: "pending_reconciliation",
                        kind,
                        configId: `${kind}_locked`,
                        configStatus: "executing",
                        standing: kind === "copytrade",
                        providerStatus: "pending",
                        checkedAt: "2026-07-10T05:00:00.000Z",
                        manualReviewRequired: true,
                        manualReviewAfter: "2026-07-10T04:59:00.000Z",
                        manualReviewRequiredAt: "2026-07-10T05:00:00.000Z",
                        manualReviewReason: "Privy status remains pending",
                        config: {
                            configId: `${kind}_locked`,
                            kind,
                            status: "executing",
                        },
                        error: "Privy status remains pending",
                    },
                    { status: 503 }
                );
            });

            await expect(
                checkStatus({
                    frogxApiBaseUrl: "https://frogx.example",
                    ftxApiToken: "ribbot-token",
                    telegramUserId: "123456",
                    userPublicKey:
                        "So11111111111111111111111111111111111111112",
                    configId: `${kind}_locked`,
                })
            ).resolves.toMatchObject({
                status: "pending_reconciliation",
                kind,
                configStatus: "executing",
                providerStatus: "pending",
                manualReviewRequired: true,
                manualReviewRequiredAt: "2026-07-10T05:00:00.000Z",
            });
        }
    );

    it("fails closed on a malformed advanced execution status body", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json({ status: "surprise_success" })
        );

        await expect(
            fetchAutoBuyExecutionStatus({
                frogxApiBaseUrl: "https://frogx.example",
                ftxApiToken: "ribbot-token",
                telegramUserId: "123456",
                userPublicKey: "So11111111111111111111111111111111111111112",
                configId: "ab_locked",
            })
        ).rejects.toThrow("malformed response");
    });
});

describe("FTX PNL client", () => {
    it("preserves confirmed and estimated fill coverage from FTX", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/pnl?telegramUserId=123456"
            );
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            return Response.json({
                status: "ready",
                walletAddress: "So11111111111111111111111111111111111111112",
                walletAddresses: [
                    "So11111111111111111111111111111111111111112",
                ],
                generatedAt: "2026-07-10T12:00:00.000Z",
                pricing: { source: "jupiter-price-v3", pricedMints: 1 },
                executionAccounting: {
                    source: "solana-confirmed-balances-with-event-fallback",
                    amountSemantics: "wallet_asset_delta_excluding_network_fee",
                    totalSwapExecutions: 3,
                    confirmedFillCount: 2,
                    estimatedFillCount: 1,
                    confirmedFillRatePct: 66.6667,
                    costBasisMethod: "net_sol_flow_at_current_sol_price",
                    taxLotAccounting: false,
                },
                totals: {
                    solUiAmount: 1,
                    pricedPositionCount: 1,
                    unpricedPositionCount: 0,
                    executionEventCount: 3,
                    confirmedFillCount: 2,
                    estimatedFillCount: 1,
                },
                tokens: [],
                recentExecutions: [],
                warnings: [],
            });
        });

        const result = await fetchPnl({
            frogxApiBaseUrl: "https://frogx.example/",
            ftxApiToken: "ribbot-token",
            telegramUserId: "123456",
        });

        expect(result).toMatchObject({
            status: "ready",
            executionAccounting: {
                totalSwapExecutions: 3,
                confirmedFillCount: 2,
                estimatedFillCount: 1,
                amountSemantics: "wallet_asset_delta_excluding_network_fee",
            },
            totals: {
                confirmedFillCount: 2,
                estimatedFillCount: 1,
            },
        });
    });
});

describe("FTX NFT holdings client", () => {
    it("requests the Telegram account's active wallet through authenticated FTX", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/nfts?telegramUserId=123456&page=2&limit=5"
            );
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer ribbot-token"
            );
            return Response.json({
                status: "ready",
                walletAddress: "So11111111111111111111111111111111111111112",
                page: 2,
                limit: 5,
                total: 6,
                items: [
                    {
                        mint: "frog-mint-6",
                        name: "Solana Business Frog #6",
                        description: null,
                        image: "https://images.example/frog-6.png",
                        collection: "frog-collection",
                        owner: "So11111111111111111111111111111111111111112",
                        compressed: true,
                        attributes: [],
                    },
                ],
            });
        });

        const result = await fetchNftHoldings({
            frogxApiBaseUrl: "https://frogx.example/",
            ftxApiToken: "ribbot-token",
            telegramUserId: "123456",
            page: 2,
            limit: 5,
        });

        expect(result).toMatchObject({
            status: "ready",
            page: 2,
            total: 6,
            items: [{ mint: "frog-mint-6", compressed: true }],
        });
    });
});
