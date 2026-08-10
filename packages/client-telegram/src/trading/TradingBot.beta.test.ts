import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Context, Telegraf } from "telegraf";

import { controlUrlWithSession, TradingBot } from "./TradingBot.ts";
import { buildFrogContactSheet } from "./frogContactSheet.ts";

const originalFetch = globalThis.fetch;
const tempFiles: string[] = [];

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const file of tempFiles.splice(0)) fs.rmSync(file, { force: true });
});

function context(text: string) {
    const reply = vi.fn(
        async (_text: string, ..._extra: unknown[]) => undefined
    );
    const replyWithPhoto = vi.fn(
        async (_photo: unknown, ..._extra: unknown[]) => undefined
    );
    return {
        ctx: {
            from: {
                id: 123456,
                username: "aklo",
                is_bot: false,
                first_name: "AKLO",
            },
            message: {
                message_id: 1,
                date: 1,
                chat: { id: 123456, type: "private" },
                from: {
                    id: 123456,
                    username: "aklo",
                    is_bot: false,
                    first_name: "AKLO",
                },
                text,
            },
            reply,
            replyWithPhoto,
        } as unknown as Context,
        reply,
        replyWithPhoto,
    };
}

function callbackContext(data: string) {
    const from = {
        id: 123456,
        username: "aklo",
        is_bot: false,
        first_name: "AKLO",
    };
    const reply = vi.fn(
        async (_text: string, ..._extra: unknown[]) => undefined
    );
    const replyWithPhoto = vi.fn(
        async (_photo: unknown, ..._extra: unknown[]) => undefined
    );
    const editMessageMedia = vi.fn(
        async (_media: unknown, ..._extra: unknown[]) => undefined
    );
    const editMessageText = vi.fn(
        async (_text: string, ..._extra: unknown[]) => undefined
    );
    const answerCbQuery = vi.fn(async () => undefined);
    return {
        ctx: {
            from,
            callbackQuery: {
                id: "callback-1",
                from,
                chat_instance: "chat-instance-1",
                data,
            },
            answerCbQuery,
            reply,
            replyWithPhoto,
            editMessageMedia,
            editMessageText,
        } as unknown as Context,
        answerCbQuery,
        reply,
        replyWithPhoto,
        editMessageMedia,
        editMessageText,
    };
}

function tradingBot() {
    const stateFile = path.join(
        os.tmpdir(),
        `ribbot-beta-command-${crypto.randomUUID()}.json`
    );
    tempFiles.push(stateFile);
    const bot = {
        telegram: { sendMessage: vi.fn(async () => undefined) },
    } as unknown as Telegraf<Context>;
    return new TradingBot(
        bot,
        {
            getSetting: (key) =>
                ({
                    TG_TRADER: "true",
                    RIBBOT_SPOT_ENABLED: "false",
                    RIBBOT_NFT_TRADING_ENABLED: "true",
                    RIBBOT_FTX_API_TOKEN: "test-token",
                    FROGX_API_BASE_URL: "https://frogx.example",
                    RIBBOT_TRADING_STATE_FILE: stateFile,
                })[key],
        },
        { buildFrogContactSheet }
    );
}

const authorityWalletAddress = "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY";
const imperialProfileAddress = "AvhiU98B4YS21caK9moFMAu3mJFkBvYGW42D2jknoPCo";

function readyTradingAccount() {
    return {
        status: "ready",
        account: {
            telegramUserId: "123456",
            username: "aklo",
            walletSource: "privy",
            privyUserId: "user_123",
            privyWalletId: "wallet_123",
            solanaWalletAddress: authorityWalletAddress,
            activeWalletId: "wallet_123",
            wallets: [
                {
                    walletId: "wallet_123",
                    label: "Spot & NFT Wallet (Privy)",
                    walletSource: "privy",
                    privyUserId: "user_123",
                    privyWalletId: "wallet_123",
                    solanaWalletAddress: authorityWalletAddress,
                    createdAt: "2026-08-05T12:00:00.000Z",
                },
            ],
        },
    };
}

function fundedPerpsStatus(liveExecutionEnabled = true, strategyReady = true) {
    return {
        status: "ready",
        telegramUserId: "123456",
        authorityWalletAddress,
        profileAddress: imperialProfileAddress,
        profileIndex: 1,
        profileUsdc: 70.67903,
        minimumProfileUsdc: 50,
        funded: true,
        fundingLocation: "imperial_profile",
        imperialProfileVerified: true,
        strategyReady,
        liveExecutionEnabled,
        blockers: [],
        checkedAt: "2026-07-31T12:00:00.000Z",
    };
}

function readyDeltaNeutralPreview(liveExecutionEnabled = true) {
    return {
        status: "ready",
        defaultStrategy: "delta_neutral",
        defaultPreset: "low",
        preview: {
            strategy: "delta_neutral",
            preset: "low",
            wallet: authorityWalletAddress,
            profileIndex: 1,
            profileAddress: imperialProfileAddress,
            profileUsdc: 70.67903,
            minimumProfileUsdc: 50,
            profileFunded: true,
            liveReady: true,
            liveEntryCapUsd: 60,
            maxCycles: 1,
            blockers: [],
        },
        liveExecutionEnabled,
    };
}

function runningDeltaNeutral() {
    return {
        strategy: "delta_neutral",
        preset: "low",
        wallet: authorityWalletAddress,
        runId: "ribbot-delta-neutral:123456:test",
        launching: false,
        running: true,
        stopRequested: false,
        completedCycles: 0,
        maxCycles: 1,
        dailyBudgetUsd: 5,
        estimatedRunCostUsd: 0.2,
        completedVolumeUsd: 30,
        startedAtUnix: 1785500000,
        stoppedAtUnix: null,
        lastMessage: "Opening balanced positions",
        failed: false,
    };
}

describe("Ribbot account-first beta", () => {
    it("creates or recovers the Frog Trading Exchange account from /start and returns a normal setup URL", async () => {
        const fetchMock = vi.fn(
            async (
                input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) => {
                const url = String(input);
                if (
                    url ===
                    "https://frogx.example/api/frogx/trading-bot/account?telegramUserId=123456"
                ) {
                    return Response.json({
                        status: "not_found",
                        telegramUserId: "123456",
                    });
                }
                if (
                    url === "https://frogx.example/api/frogx/trading-bot/wallet"
                ) {
                    return Response.json({
                        status: "ready",
                        walletSource: "privy",
                        privyUserId: "user_123",
                        privyWalletId: "wallet_123",
                        solanaWalletAddress:
                            "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY",
                        activeWalletId: "wallet_123",
                        wallets: [
                            {
                                walletId: "wallet_123",
                                label: "Wallet 1",
                                walletSource: "privy",
                                privyUserId: "user_123",
                                privyWalletId: "wallet_123",
                                solanaWalletAddress:
                                    "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY",
                            },
                        ],
                    });
                }
                return Response.json({
                    status: "ready",
                    telegramUserId: "123456",
                    code: "ABCDEFGH2345",
                    expiresAt: "2026-07-30T21:00:00.000Z",
                    controlUrl: "https://frogtrading.exchange/ribbot",
                });
            }
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/start");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(fetchMock.mock.calls[0][0])).toBe(
            "https://frogx.example/api/frogx/trading-bot/account?telegramUserId=123456"
        );
        const [walletUrl, walletRequest] = fetchMock.mock.calls[1];
        expect(walletUrl).toBe(
            "https://frogx.example/api/frogx/trading-bot/wallet"
        );
        expect(walletRequest).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer test-token",
                "Content-Type": "application/json",
            },
        });
        expect(JSON.parse(String(walletRequest?.body))).toMatchObject({
            telegramUserId: "123456",
            username: "aklo",
        });

        const [url, request] = fetchMock.mock.calls[2];
        expect(url).toBe(
            "https://frogx.example/api/frogx/trading-bot/control/code"
        );
        if (!request) throw new Error("Expected an FTX account request.");
        expect(request).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer test-token",
                "Content-Type": "application/json",
            },
        });
        expect(JSON.parse(String(request?.body))).toEqual({
            telegramUserId: "123456",
            username: "aklo",
        });

        expect(reply).toHaveBeenCalledTimes(1);
        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Gribbit, nice to meet you. 🐸",
                "",
                "This is Ribbot, your trading assistant for the Frog Trading Exchange, brought to you by the Solana Business Frogs.",
                "",
                "Let's set up your accounts.",
                "",
                "1. Spot Trading — Coming Soon",
                "",
                "2. NFT Trading on Frog Trading Exchange",
                "",
                "3. Perps powered by Imperial",
                "",
                "Privy secures your account and wallet key.",
            ].join("\n")
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "1. Spot Trading — Coming Soon"
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; url?: string; login_url?: unknown }>
                >;
            };
        };
        const openFtxButton = extra.reply_markup?.inline_keyboard?.[0]?.[0];
        expect(openFtxButton).toMatchObject({
            text: "Connect Account",
            url: "https://frogtrading.exchange/ribbot?telegramUserId=123456#code=ABCDEFGH2345",
        });
        expect(openFtxButton).not.toHaveProperty("login_url");
        expect(extra.reply_markup?.inline_keyboard).toHaveLength(1);
    });

    it("offers /farm from /start when the Frog Trading Exchange account is connected", async () => {
        const fetchMock = vi.fn(
            async (
                _input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) =>
                Response.json({
                    status: "ready",
                    account: {
                        walletSource: "privy",
                        solanaWalletAddress:
                            "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY",
                        wallets: [],
                    },
                    setup: {
                        walletReady: true,
                        automationSignerReady: true,
                        imperialConnected: true,
                        botAccessEnabled: true,
                        complete: true,
                    },
                })
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/start");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0][0])).toBe(
            "https://frogx.example/api/frogx/trading-bot/account?telegramUserId=123456"
        );
        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Ribbot is ready.",
                "",
                "Spot Trading — Coming Soon",
                "",
                "/farm - open your Delta Neutral farmer",
                "Powered by Imperial",
                "",
                "/frogs - view and trade Solana Business Frogs",
                "Powered by Magic Eden",
            ].join("\n")
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(extra.reply_markup?.inline_keyboard?.[0]).toEqual([
            {
                text: "Spot Trading — Coming Soon",
                callback_data: "ribbot:spot",
                hide: false,
            },
        ]);
        expect(extra.reply_markup?.inline_keyboard?.[1]).toEqual([
            {
                text: "Farm",
                callback_data: "ribbot:farmer-home",
                hide: false,
            },
            {
                text: "Frogs",
                callback_data: "ribbot:nfts:0",
                hide: false,
            },
        ]);
    });

    it("does not show Connect Account in the menu for a connected account", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(readyTradingAccount())
        );
        const { ctx, reply } = callbackContext("ribbot:menu");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ text?: string }>>;
            };
        };
        const buttonLabels =
            extra.reply_markup?.inline_keyboard
                ?.flat()
                .map((button) => button.text) ?? [];
        expect(buttonLabels).not.toContain("Connect Account");
        expect(buttonLabels).toEqual(
            expect.arrayContaining([
                "Spot Trading — Coming Soon",
                "Perps Farmer",
                "Frogs",
                "Help",
            ])
        );
    });

    it("labels Spot Trading as coming soon without starting a trade", async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/spot");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Spot Trading is coming soon.",
                "Connect your Frog Trading Exchange account now and this same account will work here when Spot launches.",
                "",
                "No quote, order, signature, or transaction was created.",
            ].join("\n")
        );
    });

    it("returns to onboarding when the Privy signer is missing", async () => {
        const fetchMock = vi.fn(
            async (
                input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) => {
                const url = String(input);
                if (
                    url ===
                    "https://frogx.example/api/frogx/trading-bot/account?telegramUserId=123456"
                ) {
                    return Response.json({
                        status: "ready",
                        account: {
                            walletSource: "privy",
                            privyWalletId: "wallet_123",
                            solanaWalletAddress:
                                "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY",
                            wallets: [],
                        },
                        setup: {
                            walletReady: true,
                            automationSignerReady: false,
                            imperialConnected: true,
                            botAccessEnabled: true,
                            complete: false,
                        },
                    });
                }
                if (
                    url === "https://frogx.example/api/frogx/trading-bot/wallet"
                ) {
                    return Response.json({
                        status: "ready",
                        walletSource: "privy",
                        privyUserId: "user_123",
                        privyWalletId: "wallet_123",
                        solanaWalletAddress:
                            "9p9UcNW4QaAcw6pRAMFtaJHuNChL6dFFnbYzARTnJSWY",
                        wallets: [],
                    });
                }
                return Response.json({
                    status: "ready",
                    telegramUserId: "123456",
                    code: "ABCDEFGH2345",
                    expiresAt: "2026-07-30T21:00:00.000Z",
                    controlUrl: "https://frogtrading.exchange/ribbot",
                });
            }
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/start");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(reply.mock.calls[0][0])).not.toContain(
            "Ribbot is ready."
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ text?: string; url?: string }>>;
            };
        };
        expect(extra.reply_markup?.inline_keyboard?.[0]?.[0]).toMatchObject({
            text: "Finish Setup",
            url: "https://frogtrading.exchange/ribbot?telegramUserId=123456#code=ABCDEFGH2345",
        });
    });

    it("opens the farmer dashboard immediately from /farm", async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/farm");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Delta Neutral Farmer",
                "Powered by Imperial",
                "",
                "Runs one matched perps cycle to generate Imperial + Phoenix activity while reducing market-direction exposure.",
                "",
                "Beta controls are fixed. You review and confirm every cycle before it starts.",
            ].join("\n")
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        const callbacks =
            extra.reply_markup?.inline_keyboard
                ?.flat()
                .map((button) => button.callback_data) ?? [];
        expect(callbacks).toEqual([
            "ribbot:delta-neutral-review",
            "ribbot:farmer-how",
            "ribbot:perps-status",
            "ribbot:delta-neutral-status",
        ]);
    });

    it("explains the strategy execution and risk before review", async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;
        const { ctx, reply } = callbackContext("ribbot:farmer-how");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(String(reply.mock.calls[0][0])).toContain(
            "1. Ribbot places a small perpetual order on Phoenix through Imperial."
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "If only one leg fills, recovery closes the exposure before another cycle."
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "Delta neutral reduces directional exposure; it is not risk-free."
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "Points and rewards depend on Imperial and Phoenix rules and are not guaranteed."
        );
    });

    it("offers an Imperial reconnect when a status check receives a conflict", async () => {
        const fetchMock = vi.fn(
            async (
                _input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) =>
                Response.json(
                    { error: "Reconnect Imperial and try again" },
                    { status: 409 }
                )
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/status");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Reconnect Imperial to open your farmer.",
                "",
                "Next: tap Reconnect Imperial.",
            ].join("\n")
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(extra.reply_markup?.inline_keyboard?.[0]?.[0]).toMatchObject({
            text: "Reconnect Imperial",
            callback_data: "ribbot:farm",
        });
    });

    it("does not issue a setup link when wallet provisioning is unavailable", async () => {
        const fetchMock = vi.fn(
            async (
                input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) => {
                if (String(input).includes("/trading-bot/account?")) {
                    return Response.json({
                        status: "not_found",
                        telegramUserId: "123456",
                    });
                }
                return Response.json({
                    status: "not_configured",
                    required: ["PRIVY_APP_ID", "PRIVY_APP_SECRET"],
                });
            }
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/start");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(String(fetchMock.mock.calls[1][0])).toBe(
            "https://frogx.example/api/frogx/trading-bot/wallet"
        );
        expect(reply).toHaveBeenCalledWith(
            "Setup is unavailable. Try again soon."
        );
    });

    it("blocks pasted token mints while Spot is disabled", async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context(
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        );

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(String(reply.mock.calls[0][0])).toContain(
            "That Ribbot feature is not available yet."
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "No quote, order, signature, or transaction was created."
        );
    });

    it("blocks stale wallet callback buttons while Spot is disabled", async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;
        const { ctx, answerCbQuery, reply } = callbackContext("ribbot:wallet");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(answerCbQuery).toHaveBeenCalledTimes(1);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(String(reply.mock.calls[0][0])).toContain(
            "That Ribbot feature is not available yet."
        );
    });

    it("shows Frog holdings and trade actions while Spot is disabled", async () => {
        globalThis.fetch = vi.fn(async (input, init) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/nfts?telegramUserId=123456&page=1&limit=12"
            );
            expect(new Headers(init?.headers).get("Authorization")).toBe(
                "Bearer test-token"
            );
            return Response.json({
                status: "ready",
                walletAddress: authorityWalletAddress,
                walletAddresses: [
                    authorityWalletAddress,
                    "ReadOnly11111111111111111111111111111111111",
                ],
                page: 1,
                limit: 12,
                total: 2,
                items: [
                    {
                        mint: "FrogMint111111111111111111111111111111111111",
                        name: "Solana Business Frog #1",
                        description: null,
                        image: null,
                        collection: "solana-business-frogs",
                        owner: authorityWalletAddress,
                        compressed: false,
                        attributes: [],
                    },
                    {
                        mint: "FrogMint222222222222222222222222222222222222",
                        name: "Solana Business Frog #2",
                        description: null,
                        image: null,
                        collection: "solana-business-frogs",
                        owner: "ReadOnly11111111111111111111111111111111111",
                        compressed: false,
                        attributes: [],
                    },
                ],
            });
        });
        const { ctx, reply, replyWithPhoto } = context("/frogs");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(reply).not.toHaveBeenCalled();
        expect(replyWithPhoto).toHaveBeenCalledTimes(1);
        expect(
            Buffer.isBuffer(
                (replyWithPhoto.mock.calls[0][0] as { source?: unknown }).source
            )
        ).toBe(true);
        const extra = replyWithPhoto.mock.calls[0][1] as {
            caption?: string;
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(extra.caption).toBe("Solana Business Frogs\nOwned: 2");
        const buttons = extra.reply_markup?.inline_keyboard?.flat() ?? [];
        expect(extra.reply_markup?.inline_keyboard?.at(-2)).toEqual([
            expect.objectContaining({ text: "Buy Floor" }),
            expect.objectContaining({ text: "Sweep 2" }),
            expect.objectContaining({ text: "Sweep 5" }),
            expect.objectContaining({ text: "Sweep 10" }),
        ]);
        expect(extra.reply_markup?.inline_keyboard?.at(-1)).toEqual([
            expect.objectContaining({
                text: "Back",
                callback_data: "ribbot:menu",
            }),
        ]);
        expect(buttons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    text: "Buy Floor",
                    callback_data: "ribbot:frog-buy",
                }),
                expect.objectContaining({
                    text: "Sweep 2",
                    callback_data: "ribbot:frog-sweep:2",
                }),
                expect.objectContaining({
                    text: "Sweep 10",
                    callback_data: "ribbot:frog-sweep:10",
                }),
                expect.objectContaining({
                    text: "Sell 1",
                    callback_data: "ribbot:frog-sell-select:0",
                }),
                expect.objectContaining({
                    text: "Bulk Sell",
                    callback_data: "ribbot:frog-bulk-sell",
                }),
                expect.objectContaining({ text: "Back" }),
            ])
        );
        expect(buttons.map((button) => button.text)).not.toEqual(
            expect.arrayContaining([
                "#1",
                "#2",
                "Sell #1",
                "Refresh",
                "Account",
                "Menu",
            ])
        );
    });

    it("shows managed Frog choices only after Sell 1 is selected", async () => {
        globalThis.fetch = vi.fn(async (input) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/nfts?telegramUserId=123456&page=1&limit=12"
            );
            return Response.json({
                status: "ready",
                walletAddress: authorityWalletAddress,
                walletAddresses: [
                    authorityWalletAddress,
                    "ReadOnly11111111111111111111111111111111111",
                ],
                page: 1,
                limit: 12,
                total: 2,
                items: [
                    {
                        mint: "FrogMint111111111111111111111111111111111111",
                        name: "Solana Business Frog #1",
                        description: null,
                        image: null,
                        collection: "solana-business-frogs",
                        owner: authorityWalletAddress,
                        compressed: false,
                        attributes: [],
                    },
                    {
                        mint: "FrogMint222222222222222222222222222222222222",
                        name: "Solana Business Frog #2",
                        description: null,
                        image: null,
                        collection: "solana-business-frogs",
                        owner: "ReadOnly11111111111111111111111111111111111",
                        compressed: false,
                        attributes: [],
                    },
                ],
            });
        });
        const { ctx, answerCbQuery, editMessageMedia } = callbackContext(
            "ribbot:frog-sell-select:0"
        );

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(answerCbQuery).toHaveBeenCalledTimes(1);
        expect(editMessageMedia).toHaveBeenCalledTimes(1);
        expect(editMessageMedia.mock.calls[0][0]).toMatchObject({
            type: "photo",
            caption: [
                "Solana Business Frogs",
                "Owned: 2",
                "",
                "Select a Frog to sell.",
            ].join("\n"),
        });
        const extra = editMessageMedia.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        const buttons = extra.reply_markup?.inline_keyboard?.flat() ?? [];
        expect(buttons).toEqual([
            expect.objectContaining({
                text: "#1",
                callback_data:
                    "ribbot:frog-sell:FrogMint111111111111111111111111111111111111",
            }),
            expect.objectContaining({
                text: "Cancel",
                callback_data: "ribbot:nfts:0",
            }),
        ]);
    });

    it("edits the current Frog grid when navigating", async () => {
        globalThis.fetch = vi.fn(async (input) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/nfts?telegramUserId=123456&page=2&limit=12"
            );
            return Response.json({
                status: "ready",
                walletAddress: authorityWalletAddress,
                walletAddresses: [authorityWalletAddress],
                page: 2,
                limit: 12,
                total: 13,
                items: [
                    {
                        mint: "FrogMint222222222222222222222222222222222222",
                        name: "Solana Business Frog #13",
                        description: null,
                        image: null,
                        collection: "solana-business-frogs",
                        owner: authorityWalletAddress,
                        compressed: false,
                        attributes: [],
                    },
                ],
            });
        });
        const { ctx, answerCbQuery, editMessageMedia, reply, replyWithPhoto } =
            callbackContext("ribbot:nfts:1");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(answerCbQuery).toHaveBeenCalledTimes(1);
        expect(reply).not.toHaveBeenCalled();
        expect(replyWithPhoto).not.toHaveBeenCalled();
        expect(editMessageMedia).toHaveBeenCalledTimes(1);
        expect(editMessageMedia.mock.calls[0][0]).toMatchObject({
            type: "photo",
            caption: ["Solana Business Frogs", "Owned: 13", "Page 2/2"].join(
                "\n"
            ),
        });
        expect(
            Buffer.isBuffer(
                (
                    editMessageMedia.mock.calls[0][0] as {
                        media?: { source?: unknown };
                    }
                ).media?.source
            )
        ).toBe(true);
        const extra = editMessageMedia.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ text?: string }>>;
            };
        };
        expect(extra.reply_markup?.inline_keyboard?.[0]).toEqual([
            expect.objectContaining({
                text: "←",
                callback_data: "ribbot:nfts:0",
            }),
            expect.objectContaining({
                text: "→",
                callback_data: "ribbot:nfts:0",
            }),
        ]);
        expect(extra.reply_markup?.inline_keyboard?.[1]).toEqual([
            expect.objectContaining({
                text: "Sell 1",
                callback_data: "ribbot:frog-sell-select:1",
            }),
            expect.objectContaining({
                text: "Bulk Sell",
                callback_data: "ribbot:frog-bulk-sell",
            }),
        ]);
        expect(extra.reply_markup?.inline_keyboard?.at(-2)).toEqual([
            expect.objectContaining({ text: "Buy Floor" }),
            expect.objectContaining({ text: "Sweep 2" }),
            expect.objectContaining({ text: "Sweep 5" }),
            expect.objectContaining({ text: "Sweep 10" }),
        ]);
        expect(extra.reply_markup?.inline_keyboard?.at(-1)).toEqual([
            expect.objectContaining({ text: "Back" }),
        ]);
    });

    it("opens a selected Frog from the grid", async () => {
        globalThis.fetch = vi.fn(async (input) => {
            expect(String(input)).toBe(
                "https://frogx.example/api/frogx/trading-bot/nfts?telegramUserId=123456&page=2&limit=1"
            );
            return Response.json({
                status: "ready",
                walletAddress: authorityWalletAddress,
                walletAddresses: [authorityWalletAddress],
                page: 2,
                limit: 1,
                total: 2,
                items: [
                    {
                        mint: "FrogMint222222222222222222222222222222222222",
                        name: "Solana Business Frog #2",
                        description: null,
                        image: "https://example.com/frog-2.png",
                        collection: "solana-business-frogs",
                        owner: authorityWalletAddress,
                        compressed: false,
                        attributes: [],
                    },
                ],
            });
        });
        const { ctx, editMessageMedia } = callbackContext(
            "ribbot:nft-detail:1"
        );

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(editMessageMedia.mock.calls[0][0]).toMatchObject({
            type: "photo",
            media: "https://example.com/frog-2.png",
            caption: "#2",
        });
        const extra = editMessageMedia.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(extra.reply_markup?.inline_keyboard).toEqual([
            [
                expect.objectContaining({
                    text: "Sell #2",
                    callback_data:
                        "ribbot:frog-sell:FrogMint222222222222222222222222222222222222",
                }),
            ],
            [
                expect.objectContaining({
                    text: "Back to Grid",
                    callback_data: "ribbot:nfts:0",
                }),
            ],
        ]);
    });

    it("reviews a single Frog sale without requiring a floor listing", async () => {
        vi.useFakeTimers();
        const mint = imperialProfileAddress;
        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url.includes("/trading-bot/account?")) {
                return Response.json(readyTradingAccount());
            }
            if (url.endsWith("/magic-eden/top-offer")) {
                return Response.json({
                    offer: {
                        pool: "Pool1111111111111111111111111111111111111",
                        spotPriceLamports: "25000000",
                        spotPriceSol: 0.025,
                        minimumPaymentLamports: "24000000",
                        minimumPaymentSol: 0.024,
                    },
                });
            }
            if (url.includes("/trading-bot/nfts?")) {
                return Response.json({
                    status: "ready",
                    walletAddress: authorityWalletAddress,
                    walletAddresses: [authorityWalletAddress],
                    page: 1,
                    limit: 50,
                    total: 1,
                    items: [
                        {
                            mint,
                            name: "SBF #1",
                            description: null,
                            image: null,
                            collection: "solana-business-frogs",
                            owner: authorityWalletAddress,
                            compressed: false,
                            attributes: [],
                        },
                    ],
                });
            }
            if (url.endsWith("/magic-eden/execute-sell/status")) {
                return Response.json({
                    status: "executed",
                    signature: "single-sale-signature",
                });
            }
            if (url.endsWith("/magic-eden/execute-sell")) {
                return Response.json({
                    status: "submitted",
                    signature: "single-sale-signature",
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });
        globalThis.fetch = fetchMock;
        const bot = tradingBot();
        const review = callbackContext(`ribbot:frog-sell:${mint}`);

        await expect(bot.handleCallbackQuery(review.ctx)).resolves.toBe(true);

        expect(String(review.reply.mock.calls[0][0])).toContain(
            "Sell #1 into the top Magic Eden offer?"
        );
        expect(String(review.reply.mock.calls[0][0])).not.toContain(mint);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://frogx.example/api/frogx/magic-eden/top-offer"
        );
        expect(
            fetchMock.mock.calls.some(([input]) =>
                String(input).includes("/trading-bot/frogs/market")
            )
        ).toBe(false);

        const reviewExtra = review.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const confirmData = reviewExtra.reply_markup?.inline_keyboard
            ?.flat()
            .find((button) =>
                button.callback_data?.startsWith("ribbot:frog-confirm:")
            )?.callback_data;
        const ticketId = confirmData?.split(":").at(-1);
        expect(confirmData).toBeTruthy();

        const confirm = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);
        expect(String(confirm.reply.mock.calls[0][0])).toContain(
            "Sale 1/1 submitted: #1."
        );
        expect(String(confirm.reply.mock.calls[0][0])).not.toContain(mint);

        const status = callbackContext(`ribbot:frog-check:${ticketId}`);
        await expect(bot.handleCallbackQuery(status.ctx)).resolves.toBe(true);
        expect(String(status.reply.mock.calls[0][0])).toBe(
            "Sale complete: #1 🐸\n\nSolscan: https://solscan.io/tx/single-sale-signature"
        );
    });

    it("bulk sells only managed-wallet Frogs one at a time", async () => {
        vi.useFakeTimers();
        const managedMintOne = "ManagedFrog11111111111111111111111111111111111";
        const managedMintTwo = "ManagedFrog22222222222222222222222222222222222";
        const managedMintThree =
            "ManagedFrog33333333333333333333333333333333333";
        const readOnlyMint = "ReadOnlyFrog1111111111111111111111111111111111";
        const readOnlyWallet = "ReadOnly11111111111111111111111111111111111";
        let statusChecks = 0;
        const fetchMock = vi.fn(async (input, init) => {
            const url = String(input);
            if (url.includes("/trading-bot/account?")) {
                return Response.json(readyTradingAccount());
            }
            if (url.endsWith("/magic-eden/top-offer")) {
                return Response.json({
                    offer: {
                        pool: "Pool1111111111111111111111111111111111111",
                        spotPriceLamports: "25000000",
                        spotPriceSol: 0.025,
                        minimumPaymentLamports: "24000000",
                        minimumPaymentSol: 0.024,
                    },
                });
            }
            if (url.includes("/trading-bot/nfts?")) {
                const page = new URL(url).searchParams.get("page");
                if (page === "2") {
                    return Response.json({
                        status: "ready",
                        walletAddress: authorityWalletAddress,
                        walletAddresses: [
                            authorityWalletAddress,
                            readOnlyWallet,
                        ],
                        page: 2,
                        limit: 50,
                        total: 51,
                        items: [
                            {
                                mint: managedMintThree,
                                name: "SBF #4",
                                description: null,
                                image: null,
                                collection: "solana-business-frogs",
                                owner: authorityWalletAddress,
                                compressed: false,
                                attributes: [],
                            },
                        ],
                    });
                }
                return Response.json({
                    status: "ready",
                    walletAddress: authorityWalletAddress,
                    walletAddresses: [authorityWalletAddress, readOnlyWallet],
                    page: 1,
                    limit: 50,
                    total: 51,
                    items: [
                        {
                            mint: managedMintOne,
                            name: "SBF #1",
                            description: null,
                            image: null,
                            collection: "solana-business-frogs",
                            owner: authorityWalletAddress,
                            compressed: false,
                            attributes: [],
                        },
                        {
                            mint: readOnlyMint,
                            name: "SBF #2",
                            description: null,
                            image: null,
                            collection: "solana-business-frogs",
                            owner: readOnlyWallet,
                            compressed: false,
                            attributes: [],
                        },
                        {
                            mint: managedMintTwo,
                            name: "SBF #3",
                            description: null,
                            image: null,
                            collection: "solana-business-frogs",
                            owner: authorityWalletAddress,
                            compressed: false,
                            attributes: [],
                        },
                    ],
                });
            }
            if (url.endsWith("/magic-eden/execute-sell/status")) {
                statusChecks += 1;
                return Response.json({
                    status: "executed",
                    signature: `sale-signature-${statusChecks}`,
                });
            }
            if (url.endsWith("/magic-eden/execute-sell")) {
                return Response.json({
                    status: "submitted",
                    signature: `sale-signature-${statusChecks + 1}`,
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });
        globalThis.fetch = fetchMock;
        const bot = tradingBot();
        const review = callbackContext("ribbot:frog-bulk-sell");

        await expect(bot.handleCallbackQuery(review.ctx)).resolves.toBe(true);

        expect(String(review.reply.mock.calls[0][0])).toContain(
            "How many Frogs do you want to sell?"
        );
        expect(fetchMock).not.toHaveBeenCalled();
        const promptExtra = review.reply.mock.calls[0][1] as {
            reply_markup?: { force_reply?: boolean };
        };
        expect(promptExtra.reply_markup?.force_reply).toBe(true);

        const quantity = context("2");
        await expect(bot.handleMessage(quantity.ctx)).resolves.toBe(true);

        const reviewText = String(quantity.reply.mock.calls[0][0]);
        expect(reviewText).toContain("Sell 2 Frogs");
        expect(reviewText).toContain("Frogs: #1, #3");
        expect(reviewText).not.toContain(managedMintOne);
        expect(reviewText).not.toContain(managedMintTwo);
        expect(String(review.reply.mock.calls[0][0])).toContain(
            "How many Frogs do you want to sell?"
        );
        expect(
            fetchMock.mock.calls.filter(([input]) =>
                String(input).includes("/trading-bot/nfts?")
            )
        ).toHaveLength(2);
        expect(
            fetchMock.mock.calls.filter(([input]) =>
                String(input).endsWith("/magic-eden/execute-sell")
            )
        ).toHaveLength(0);
        const reviewExtra = quantity.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const confirmData = reviewExtra.reply_markup?.inline_keyboard
            ?.flat()
            .find((button) =>
                button.callback_data?.startsWith("ribbot:frog-confirm:")
            )?.callback_data;
        expect(confirmData).toBeTruthy();
        const ticketId = confirmData?.split(":").at(-1);

        const confirm = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);

        let sellCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).endsWith("/magic-eden/execute-sell")
        );
        expect(sellCalls).toHaveLength(1);
        expect(JSON.parse(String(sellCalls[0][1]?.body)).mint).toBe(
            managedMintOne
        );

        const firstStatus = callbackContext(`ribbot:frog-check:${ticketId}`);
        await expect(bot.handleCallbackQuery(firstStatus.ctx)).resolves.toBe(
            true
        );
        expect(String(firstStatus.reply.mock.calls[0][0])).toContain(
            "Sale 2/2 submitted: #3."
        );
        sellCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).endsWith("/magic-eden/execute-sell")
        );
        expect(sellCalls).toHaveLength(2);
        expect(JSON.parse(String(sellCalls[1][1]?.body)).mint).toBe(
            managedMintTwo
        );
        expect(
            sellCalls.some(([, request]) =>
                [readOnlyMint, managedMintThree].includes(
                    JSON.parse(String(request?.body)).mint
                )
            )
        ).toBe(false);

        const finalStatus = callbackContext(`ribbot:frog-check:${ticketId}`);
        await expect(bot.handleCallbackQuery(finalStatus.ctx)).resolves.toBe(
            true
        );
        expect(String(finalStatus.reply.mock.calls[0][0])).toBe(
            [
                "Bulk sale complete. 🐸",
                "",
                "Sold: #1, #3",
                "",
                "Solscan 1: https://solscan.io/tx/sale-signature-1",
                "Solscan 2: https://solscan.io/tx/sale-signature-2",
            ].join("\n")
        );
    });

    it("shows the exact floor Frog art and number before purchase", async () => {
        vi.useFakeTimers();
        const floorMint = "FloorFrog7503111111111111111111111111111111";
        const fetchMock = vi.fn(async (input, init) => {
            const url = String(input);
            if (url.includes("/trading-bot/account?")) {
                return Response.json(readyTradingAccount());
            }
            if (url.endsWith("/trading-bot/frogs/market")) {
                return Response.json({
                    status: "ready",
                    walletAddress: authorityWalletAddress,
                    floor: {
                        mint: floorMint,
                        name: "SBF #7503",
                        image: "https://images.example/frog-7503.png",
                        priceLamports: "31531268",
                        priceSol: 0.031531268,
                    },
                    offer: null,
                    quotedAt: "2026-08-05T12:00:00.000Z",
                });
            }
            if (url.endsWith("/trading-bot/frogs/execute-buy")) {
                expect(JSON.parse(String(init?.body))).toMatchObject({
                    expectedMint: floorMint,
                });
                return Response.json({
                    status: "submitted",
                    signature: "frog-signature",
                });
            }
            if (url.endsWith("/trading-bot/frogs/execute-buy/status")) {
                return Response.json({
                    status: "executed",
                    signature: "frog-signature",
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });
        globalThis.fetch = fetchMock;
        const { ctx, reply, replyWithPhoto } = context("/buyfrog");
        const bot = tradingBot();

        await expect(bot.handleMessage(ctx)).resolves.toBe(true);

        expect(reply).not.toHaveBeenCalled();
        expect(replyWithPhoto).toHaveBeenCalledWith(
            { url: "https://images.example/frog-7503.png" },
            expect.objectContaining({
                caption: expect.stringContaining("Buy Frog #7503?"),
                reply_markup: expect.any(Object),
            })
        );
        const photoExtra = replyWithPhoto.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const confirmData = photoExtra.reply_markup?.inline_keyboard
            ?.flat()
            .find((button) =>
                button.callback_data?.startsWith("ribbot:frog-confirm:")
            )?.callback_data;
        expect(confirmData).toBeTruthy();

        const confirm = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);
        expect(String(confirm.reply.mock.calls[0][0])).toContain(
            "Purchase 1/1 submitted."
        );
        await vi.advanceTimersByTimeAsync(3_000);
        expect(String(confirm.reply.mock.calls[1][0])).toBe(
            "Purchase complete. 🐸\n\nSolscan: https://solscan.io/tx/frog-signature"
        );
    });

    it("offers signer recovery without retrying a rejected Frog purchase", async () => {
        const floorMint = "FloorFrog7503111111111111111111111111111111";
        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url.includes("/trading-bot/account?")) {
                return Response.json(readyTradingAccount());
            }
            if (url.endsWith("/trading-bot/frogs/market")) {
                return Response.json({
                    status: "ready",
                    walletAddress: authorityWalletAddress,
                    floor: {
                        mint: floorMint,
                        name: "SBF #7503",
                        image: null,
                        priceLamports: "31531268",
                        priceSol: 0.031531268,
                    },
                    offer: null,
                    quotedAt: "2026-08-05T12:00:00.000Z",
                });
            }
            if (url.endsWith("/trading-bot/frogs/execute-buy")) {
                return Response.json(
                    {
                        error: "Ribbot access is not enabled for Spot & NFT Wallet (Privy)",
                        code: "RIBBOT_ACCESS_REQUIRED",
                    },
                    { status: 409 }
                );
            }
            if (url.endsWith("/trading-bot/control/code")) {
                return Response.json({
                    status: "ready",
                    telegramUserId: "123456",
                    code: "ENABLE2345",
                    expiresAt: "2026-08-06T16:00:00.000Z",
                    controlUrl: "https://frogtrading.exchange/ribbot",
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });
        globalThis.fetch = fetchMock;
        const bot = tradingBot();
        const review = context("/buyfrog");

        await expect(bot.handleMessage(review.ctx)).resolves.toBe(true);
        const reviewExtra = review.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const confirmData = reviewExtra.reply_markup?.inline_keyboard
            ?.flat()
            .find((button) =>
                button.callback_data?.startsWith("ribbot:frog-confirm:")
            )?.callback_data;
        expect(confirmData).toBeTruthy();

        const confirm = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);

        expect(String(confirm.reply.mock.calls[0][0])).toBe(
            [
                "Ribbot access required",
                "",
                "This purchase was not sent.",
                "",
                "Enable Ribbot for your Spot & NFT Wallet, then open /frogs for a new quote.",
            ].join("\n")
        );
        const recoveryExtra = confirm.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ text?: string; url?: string }>>;
            };
        };
        expect(
            recoveryExtra.reply_markup?.inline_keyboard?.[0]?.[0]
        ).toMatchObject({
            text: "Enable Ribbot",
            url: "https://frogtrading.exchange/ribbot?telegramUserId=123456#code=ENABLE2345",
        });
        expect(
            fetchMock.mock.calls.filter(([input]) =>
                String(input).endsWith("/trading-bot/frogs/execute-buy")
            )
        ).toHaveLength(1);
    });

    it("submits sweep purchases one at a time after confirmation", async () => {
        let statusChecks = 0;
        const fetchMock = vi.fn(
            async (
                input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) => {
                const url = String(input);
                if (url.includes("/trading-bot/account?")) {
                    return Response.json(readyTradingAccount());
                }
                if (url.endsWith("/trading-bot/frogs/market")) {
                    return Response.json({
                        status: "ready",
                        walletAddress: authorityWalletAddress,
                        floor: {
                            mint: "FloorFrog1111111111111111111111111111111111",
                            priceLamports: "1000000000",
                            priceSol: 1,
                            seller: "Seller111111111111111111111111111111111111",
                            source: "magic-eden-v2",
                        },
                        offer: null,
                        checkedAt: "2026-08-05T12:00:00.000Z",
                    });
                }
                if (url.endsWith("/trading-bot/frogs/execute-buy/status")) {
                    statusChecks += 1;
                    return Response.json(
                        statusChecks === 1
                            ? { status: "pending", signature: "signature-1" }
                            : { status: "executed", signature: "signature-1" }
                    );
                }
                if (url.endsWith("/trading-bot/frogs/execute-buy")) {
                    const purchaseNumber = fetchMock.mock.calls.filter(
                        ([called]) =>
                            String(called).endsWith(
                                "/trading-bot/frogs/execute-buy"
                            )
                    ).length;
                    return Response.json({
                        status: "submitted",
                        signature: `signature-${purchaseNumber}`,
                        listing: {
                            mint: `PurchasedFrog${purchaseNumber}1111111111111111111111111111111`,
                            priceLamports: "1000000000",
                            priceSol: 1,
                        },
                    });
                }
                throw new Error(`Unexpected request: ${url}`);
            }
        );
        globalThis.fetch = fetchMock;
        const bot = tradingBot();
        const review = context("/sweepfrogs 2");

        await expect(bot.handleMessage(review.ctx)).resolves.toBe(true);
        const reviewExtra = review.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const confirmData = reviewExtra.reply_markup?.inline_keyboard
            ?.flat()
            .find((button) =>
                button.callback_data?.startsWith("ribbot:frog-confirm:")
            )?.callback_data;
        expect(confirmData).toBeTruthy();
        const ticketId = confirmData?.split(":").at(-1);

        const confirm = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);
        expect(String(confirm.reply.mock.calls[0][0])).toContain(
            "Purchase 1/2 submitted."
        );
        const submittedExtra = confirm.reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(submittedExtra.reply_markup?.inline_keyboard).toEqual([
            [
                {
                    text: "Check Status",
                    callback_data: `ribbot:frog-check:${ticketId}`,
                    hide: false,
                },
            ],
        ]);

        const replay = callbackContext(confirmData as string);
        await expect(bot.handleCallbackQuery(replay.ctx)).resolves.toBe(true);
        expect(String(replay.reply.mock.calls[0][0])).toContain(
            "already handled"
        );

        const pending = callbackContext(`ribbot:frog-check:${ticketId}`);
        await expect(bot.handleCallbackQuery(pending.ctx)).resolves.toBe(true);
        expect(String(pending.reply.mock.calls[0][0])).toContain(
            "did not submit another trade"
        );

        const confirmed = callbackContext(`ribbot:frog-check:${ticketId}`);
        await expect(bot.handleCallbackQuery(confirmed.ctx)).resolves.toBe(
            true
        );
        expect(String(confirmed.reply.mock.calls[0][0])).toContain(
            "Purchase 2/2 submitted."
        );

        const buyCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).endsWith("/trading-bot/frogs/execute-buy")
        );
        expect(buyCalls).toHaveLength(2);
        expect(statusChecks).toBe(2);
        expect(JSON.parse(String(buyCalls[0][1]?.body)).executionId).not.toBe(
            JSON.parse(String(buyCalls[1][1]?.body)).executionId
        );
        expect(
            JSON.parse(String(buyCalls[0][1]?.body)).maximumPaymentLamports
        ).toBe("1050000000");
        expect(
            JSON.parse(String(buyCalls[1][1]?.body)).maximumPaymentLamports
        ).toBe("1050000000");
        expect(
            JSON.parse(String(buyCalls[0][1]?.body)).excludedMints
        ).toBeUndefined();
        expect(JSON.parse(String(buyCalls[1][1]?.body)).excludedMints).toEqual([
            "PurchasedFrog11111111111111111111111111111111",
        ]);
    });

    it.each([
        {
            code: "FLOOR_ABOVE_CAP",
            expected:
                "The next floor exceeded your 1.05 SOL limit. No additional purchase was sent.",
        },
        {
            code: "NO_EXECUTABLE_LISTINGS",
            expected:
                "No executable floor listing was available for the next Frog. No additional purchase was sent.",
        },
    ])(
        "reports a partial sweep when execution stops with $code",
        async ({ code, expected }) => {
            let buyAttempts = 0;
            const fetchMock = vi.fn(
                async (
                    input: Parameters<typeof fetch>[0],
                    _init?: Parameters<typeof fetch>[1]
                ) => {
                    const url = String(input);
                    if (url.includes("/trading-bot/account?")) {
                        return Response.json(readyTradingAccount());
                    }
                    if (url.endsWith("/trading-bot/frogs/market")) {
                        return Response.json({
                            status: "ready",
                            walletAddress: authorityWalletAddress,
                            floor: {
                                mint: "FloorFrog1111111111111111111111111111111111",
                                priceLamports: "1000000000",
                                priceSol: 1,
                                seller: "Seller111111111111111111111111111111111111",
                                source: "magic-eden-v2",
                            },
                            offer: null,
                            checkedAt: "2026-08-05T12:00:00.000Z",
                        });
                    }
                    if (url.endsWith("/trading-bot/frogs/execute-buy/status")) {
                        return Response.json({
                            status: "executed",
                            signature: "signature-1",
                        });
                    }
                    if (url.endsWith("/trading-bot/frogs/execute-buy")) {
                        buyAttempts += 1;
                        return Response.json(
                            buyAttempts === 1
                                ? {
                                      status: "submitted",
                                      signature: "signature-1",
                                  }
                                : {
                                      status: "failed",
                                      code,
                                  }
                        );
                    }
                    throw new Error(`Unexpected request: ${url}`);
                }
            );
            globalThis.fetch = fetchMock;
            const bot = tradingBot();
            const review = context("/sweepfrogs 2");

            await expect(bot.handleMessage(review.ctx)).resolves.toBe(true);
            const reviewExtra = review.reply.mock.calls[0][1] as {
                reply_markup?: {
                    inline_keyboard?: Array<Array<{ callback_data?: string }>>;
                };
            };
            const confirmData = reviewExtra.reply_markup?.inline_keyboard
                ?.flat()
                .find((button) =>
                    button.callback_data?.startsWith("ribbot:frog-confirm:")
                )?.callback_data as string;
            const ticketId = confirmData.split(":").at(-1);

            const confirm = callbackContext(confirmData);
            await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(
                true
            );

            const status = callbackContext(`ribbot:frog-check:${ticketId}`);
            await expect(bot.handleCallbackQuery(status.ctx)).resolves.toBe(
                true
            );
            expect(String(status.reply.mock.calls[0][0])).toBe(
                ["Sweep stopped: 1/2 Frogs purchased.", expected].join("\n\n")
            );
            expect(buyAttempts).toBe(2);
        }
    );

    it.each(["/status", "/balance", "/deposit", "/sync"])(
        "%s checks the Imperial Perps Wallet before offering Delta Neutral",
        async (command) => {
            const fetchMock = vi.fn(
                async (
                    _input: Parameters<typeof fetch>[0],
                    _init?: Parameters<typeof fetch>[1]
                ) => Response.json(fundedPerpsStatus())
            );
            globalThis.fetch = fetchMock;
            const { ctx, reply } = context(command);

            await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, request] = fetchMock.mock.calls[0];
            expect(String(url)).toBe(
                "https://frogx.example/api/frogx/trading-bot/perps/status?telegramUserId=123456"
            );
            expect(new Headers(request?.headers).get("Authorization")).toBe(
                "Bearer test-token"
            );
            expect(String(reply.mock.calls[0][0])).toBe(
                [
                    "Imperial Perps Wallet",
                    imperialProfileAddress,
                    "",
                    "Balance: 70.67903 USDC",
                    "Minimum: 50 USDC",
                    "Status: Deposit confirmed",
                    "",
                    "Delta Neutral / Routed Arb (Default)",
                    "Status: Ready",
                    "",
                    "Next: review Delta Neutral and confirm one live cycle.",
                ].join("\n")
            );
            const extra = reply.mock.calls[0][1] as {
                reply_markup?: {
                    inline_keyboard?: Array<
                        Array<{ text?: string; callback_data?: string }>
                    >;
                };
            };
            expect(extra.reply_markup?.inline_keyboard?.[0]?.[0]).toMatchObject(
                {
                    text: "Review Strategy",
                    callback_data: "ribbot:delta-neutral-review",
                }
            );
        }
    );

    it("refreshes an underfunded Imperial Perps Wallet from the beta menu", async () => {
        const fetchMock = vi.fn(async () =>
            Response.json({
                status: "ready",
                telegramUserId: "123456",
                authorityWalletAddress,
                profileAddress: imperialProfileAddress,
                profileIndex: 1,
                profileUsdc: 25,
                minimumProfileUsdc: 50,
                funded: false,
                fundingLocation: "imperial_profile",
                imperialProfileVerified: true,
                strategyReady: false,
                liveExecutionEnabled: true,
                blockers: ["fund_profile"],
                checkedAt: "2026-07-31T12:00:00.000Z",
            })
        );
        globalThis.fetch = fetchMock;
        const { ctx, answerCbQuery, reply } = callbackContext(
            "ribbot:perps-status"
        );

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(answerCbQuery).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(reply.mock.calls[0][0])).toContain(
            "Status: Deposit required"
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "Next: send at least 50 USDC on Solana to the Imperial Perps Wallet above for perps trading."
        );
    });

    it("reviews the fixed Delta Neutral strategy before live confirmation", async () => {
        globalThis.fetch = vi.fn(async () =>
            Response.json(readyDeltaNeutralPreview())
        );
        const { ctx, reply } = callbackContext("ribbot:delta-neutral-review");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(String(reply.mock.calls[0][0])).toBe(
            [
                "Review Delta Neutral",
                "",
                "Strategy: Delta Neutral / Routed Arb",
                "Preset: Low",
                "Imperial Perps Wallet",
                imperialProfileAddress,
                "Balance: 70.67903 USDC",
                "Max Entry: $60",
                "Cycles: 1",
                "Daily Cost Budget: $5",
                "",
                "This places live perpetual orders. Tap Start 1 Cycle to confirm.",
            ].join("\n")
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<
                    Array<{ text?: string; callback_data?: string }>
                >;
            };
        };
        expect(extra.reply_markup?.inline_keyboard?.[0]?.[0]).toMatchObject({
            text: "Start 1 Cycle",
            callback_data: "ribbot:delta-neutral-start",
        });
    });

    it("rechecks readiness and sends only the explicit fixed start request", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json(readyDeltaNeutralPreview()))
            .mockResolvedValueOnce(
                Response.json({
                    status: "running",
                    idempotent: false,
                    run: runningDeltaNeutral(),
                })
            );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = callbackContext("ribbot:delta-neutral-start");

        await expect(tradingBot().handleCallbackQuery(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [url, request] = fetchMock.mock.calls[1];
        expect(String(url)).toBe(
            "https://frogx.example/api/frogx/trading-bot/perps/delta-neutral/start"
        );
        const body = JSON.parse(String(request?.body)) as Record<
            string,
            unknown
        >;
        expect(body).toEqual({
            telegramUserId: "123456",
            idempotencyKey: expect.stringMatching(
                /^delta-neutral:123456:[0-9a-f-]{36}$/
            ),
            confirmLive: true,
        });
        expect(String(reply.mock.calls[0][0])).toContain("Status: Running");
        expect(String(reply.mock.calls[0][0])).toContain("Cycles: 0 / 1");
    });

    it("keeps strategy review visible without offering a gated live start", async () => {
        const fetchMock = vi.fn(async () =>
            Response.json(fundedPerpsStatus(false, false))
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/status");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(String(reply.mock.calls[0][0])).toContain(
            "Status: Launch not enabled"
        );
        expect(String(reply.mock.calls[0][0])).toContain(
            "Beta launch is not enabled yet. The Start button will appear here at launch."
        );
        expect(String(reply.mock.calls[0][0])).not.toContain(
            "Setup needs attention"
        );
        const extra = reply.mock.calls[0][1] as {
            reply_markup?: {
                inline_keyboard?: Array<Array<{ callback_data?: string }>>;
            };
        };
        const callbacks =
            extra.reply_markup?.inline_keyboard
                ?.flat()
                .map((button) => button.callback_data) ?? [];
        expect(callbacks).not.toContain("ribbot:delta-neutral-start");
        expect(callbacks).toContain("ribbot:delta-neutral-review");
    });

    it("shows a running cycle and requires confirmation before stopping", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                Response.json({
                    status: "ready",
                    defaultStrategy: "delta_neutral",
                    defaultPreset: "low",
                    configured: true,
                    enabled: true,
                    liveExecutionEnabled: true,
                    run: runningDeltaNeutral(),
                })
            )
            .mockResolvedValueOnce(
                Response.json({
                    status: "stopping",
                    run: {
                        ...runningDeltaNeutral(),
                        stopRequested: true,
                    },
                })
            );
        globalThis.fetch = fetchMock;
        const bot = tradingBot();
        const review = callbackContext("ribbot:delta-neutral-stop-review");

        await expect(bot.handleCallbackQuery(review.ctx)).resolves.toBe(true);
        expect(String(review.reply.mock.calls[0][0])).toContain(
            "Stop Delta Neutral?"
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const confirm = callbackContext("ribbot:delta-neutral-stop-confirm");
        await expect(bot.handleCallbackQuery(confirm.ctx)).resolves.toBe(true);
        expect(String(fetchMock.mock.calls[1][0])).toBe(
            "https://frogx.example/api/frogx/trading-bot/perps/delta-neutral/stop"
        );
        expect(String(confirm.reply.mock.calls[0][0])).toContain(
            "Status: Stopping"
        );
    });

    it("resets setup immediately through FrogX", async () => {
        const fetchMock = vi.fn(
            async (
                _input: Parameters<typeof fetch>[0],
                _init?: Parameters<typeof fetch>[1]
            ) =>
                Response.json({
                    status: "reset",
                    telegramUserId: "123456",
                    walletAddress:
                        "So11111111111111111111111111111111111111112",
                    resetAt: "2026-07-30T22:00:00.000Z",
                })
        );
        globalThis.fetch = fetchMock;
        const { ctx, reply } = context("/reset");

        await expect(tradingBot().handleMessage(ctx)).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, request] = fetchMock.mock.calls[0];
        expect(String(url)).toBe(
            "https://frogx.example/api/frogx/trading-bot/setup/reset"
        );
        expect(new Headers(request?.headers).get("Authorization")).toBe(
            "Bearer test-token"
        );
        expect(JSON.parse(String(request?.body))).toEqual({
            telegramUserId: "123456",
        });
        expect(reply).toHaveBeenCalledWith(
            [
                "Ribbot reset.",
                "",
                "Your wallet is unchanged.",
                "",
                "Next: /start",
            ].join("\n")
        );
    });

    it("keeps control codes out of the query string", () => {
        expect(
            controlUrlWithSession(
                "https://frogtrading.exchange/ribbot?source=telegram",
                "123456",
                "CODE2345"
            )
        ).toBe(
            "https://frogtrading.exchange/ribbot?source=telegram&telegramUserId=123456#code=CODE2345"
        );
    });
});
