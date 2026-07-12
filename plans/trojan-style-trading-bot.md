# Ribbot Trojan-Style Telegram Trading Bot

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `~/.codex/PLANS.md`.

## Purpose / Big Picture

Ribbot should become a full Telegram trading bot for Solana Business Frogs users: a user can open Telegram, start Ribbot, see a wallet and trading menu, paste a Solana token mint, review buy/sell controls, and eventually execute swaps, limit orders, DCA orders, copy trading, watchlists, and safety automation without leaving the bot. FTX/FrogX is the trading control plane: Ribbot routes wallet provisioning, quotes, swap building, signing policy, and later execution through FTX endpoints. Privy remains the wallet and identity layer inside FTX, where Telegram users map to Privy users, user-owned Solana wallets, and later policy-controlled bot signers. The first milestone creates a safe command and state scaffold that proves the Telegram interaction model without broadcasting transactions.

## Progress

- [x] (2026-07-04) Confirmed `ribbot` has no existing Privy integration and the current Telegram client has only a `TG_TRADER` stub.
- [x] (2026-07-04) Researched current Trojan on Solana feature surface and Privy Telegram trading-bot architecture from official docs.
- [x] (2026-07-04) Added this ExecPlan to define the full staged build.
- [x] (2026-07-04) Added a Ribbot trading command router scaffold with dry-run menus, settings, token-intent parsing, and callback handling.
- [x] (2026-07-04) Moved Privy-facing wallet provisioning behind FTX/FrogX; Ribbot now calls the FTX trading-bot wallet endpoint instead of reading Privy env directly.
- [x] (2026-07-04) Added FrogX quote preview adapter for `/buy` flows when a wallet address is known.
- [x] (2026-07-04) Added pending buy order tickets with Telegram Confirm/Cancel callbacks and an FTX-routed swap-build endpoint. Confirmation builds only a transaction payload when live build gates are enabled; no signing or broadcasting happens yet.
- [x] (2026-07-04) Added FTX-routed position lookup and percentage sell tickets. Ribbot now uses FTX-reported SPL balances for `/positions` and `/sell <mint> <percent>` instead of guessing token amounts.
- [x] (2026-07-04) Added FTX-routed staged order validation for `/limit buy`, `/limit sell`, and `/dca buy`. FTX accepts normalized order definitions before any staged metadata is cached or persisted.
- [x] (2026-07-04) Added FTX-routed staged stop-loss and trailing-stop validation. Ribbot `/stop` and `/trailing` resolve sell amounts from FTX positions before FTX accepts the normalized order definition; no price monitor or peak tracker starts yet.
- [x] (2026-07-04) Added FTX-routed staged withdrawal validation for `/withdraw sol <amount> <destination>` and `/withdraw <mint> <percent|all> <destination>`. Ribbot stores only non-secret staged withdrawal metadata after FTX accepts the normalized withdrawal definition; `/withdrawals` lists/cancels local staged tickets.
- [x] (2026-07-04) Added FTX-routed staged copytrade and sniper config validation. Ribbot stores only non-secret staged advanced automation metadata after FTX accepts max-buy and liquidity filters.
- [x] (2026-07-04) Added FTX-owned staged copytrade and sniper config storage. `/copytrade add ...` and `/sniper add ...` now store non-secret configs in FTX, `/copytrade` and `/sniper` sync from FTX before rendering, and cancel buttons request FTX cancellation before falling back to legacy local cache.
- [x] (2026-07-04) Added the first FTX advanced automation monitor runner. When explicit advanced monitor flags are enabled, FTX cron scans stored copytrade/sniper configs, baselines/detects copytrade target-wallet signatures through Solana RPC, and persists non-secret monitor state. The original sniper placeholder was superseded by milestone 38.
- [x] (2026-07-04) Added FTX-owned staged auto-buy and auto-sell rule storage. `/autobuy add ...` and `/autosell add ...` now store/list/cancel non-secret token rule metadata through FTX; no auto-buy/auto-sell monitor, swap build, signing, or broadcast starts from these commands.
- [x] (2026-07-04) Added FTX-side auto-buy and auto-sell monitor checks. When explicit per-kind flags are enabled, FTX cron records checked auto-buy token price state while liquidity monitoring remains unconfigured, observes auto-sell Jupiter Price V3 trigger crossings, and persists non-secret dry-run trigger state/events. No auto-buy/auto-sell swap build, signing, or broadcast starts from these monitors.
- [x] (2026-07-04) Added FTX-gated live auto-buy execution readiness. Triggered auto-buy rules can execute only inside FTX when the extra auto-buy live gate, base live gate, account auto-buy opt-in, RPC SOL balance/token safety, market-risk quote probing, wallet/revocation checks, and Privy signer config pass; Ribbot only displays the resulting non-secret activity metadata.
- [x] (2026-07-04) Added FTX-gated live auto-sell execution readiness. Triggered auto-sell rules can execute only inside FTX when the extra auto-sell live gate, base live gate, account auto-sell opt-in, RPC positions, wallet/revocation checks, and Privy signer config pass; Ribbot only displays the resulting non-secret activity metadata.
- [x] (2026-07-04) Added FTX-gated live copytrade execution readiness. Observed target-wallet signatures can execute simple copied SOL/SPL buys or sells only inside FTX when the extra copytrade live gate, base live gate, parsed target-transaction checks, copy-sell opt-in for sells, buy risk/quote checks, wallet/revocation checks, and Privy signer config pass; Ribbot only displays the resulting non-secret activity metadata.
- [x] (2026-07-04) Added FTX-routed settings, watchlist, and hidden-token preference validation. Ribbot mutates local non-secret preferences only after FTX accepts the payload.
- [x] (2026-07-04) Added FTX account-state storage and Ribbot sync. FTX `TradingBotAccountStore` now stores non-secret wallet metadata, settings, watchlists, hidden-token lists, and account events; Ribbot can refresh local cache from `/api/frogx/trading-bot/account`.
- [x] (2026-07-04) Added the FTX/Ribbot account-control code bridge. Ribbot `/control` and `/manage` now request short-lived one-time codes through FTX; FTX stores only hashed codes in `TradingBotAccountStore` and exposes a code exchange endpoint for the future FTX control page.
- [x] (2026-07-04) Added the first FTX `/ribbot` browser control page. It exchanges Ribbot `/control` codes for short-lived FTX sessions, displays non-secret account/wallet/settings/watchlist/hidden-token state, and updates non-secret preferences through FTX.
- [x] (2026-07-04) Added the first FTX-owned policy-gated market execution path. Ribbot confirmations now call FTX `/api/frogx/trading-bot/execute`; FTX requires its live flag, stored Privy wallet/account match, Privy app credentials, and Privy authorization signer credentials before calling Privy Solana `signAndSendTransaction`.
- [x] (2026-07-04) Added the first FTX-owned policy-gated withdrawal execution path. Ribbot staged withdrawal tickets now expose a Send callback; FTX `/api/frogx/trading-bot/withdrawals/execute` builds SOL/SPL transfer transactions and submits Privy Solana `signAndSendTransaction` only after the live flag, RPC, stored Privy wallet/account match, and signer credentials are present.
- [x] (2026-07-04) Added FTX-owned estimated PNL cards. FTX records non-secret swap/withdrawal execution events, fetches live positions and Jupiter Price V3 prices, and Ribbot `/pnl` renders portfolio value, cost basis, unrealized PNL, top positions, execution count, and warnings for missing price/history.
- [x] (2026-07-04) Added FTX-owned account activity history. Ribbot `/activity`, `/history`, `/trades`, and `/events` now route through FTX `/api/frogx/trading-bot/activity` and render recent non-secret account events without signing, broadcasting, or notifying Telegram users.
- [ ] Live-verify policy-gated market buy/sell execution with approved Privy credentials, signer policy, and an approved testnet or mainnet dry run.
- [x] (2026-07-04) Added safe FTX `/ribbot` wallet control actions. The control page now calls FTX `/api/frogx/trading-bot/control/wallet`: Claim and Export record non-secret Privy handoff requests without returning keys, and Revoke records FTX bot-access revocation that blocks live swap/withdrawal execution before any Privy call.
- [x] (2026-07-10) Added code-level Privy-authenticated wallet claim/export UX plus confirmed app-signer removal/restoration; no wallet is created on login and exact Privy/Telegram/wallet identity is required.
- [ ] Configure and privately live-verify the Privy Telegram/domain/public-ID setup and account controls using `plans/privy-account-control-live-checklist.md` after explicit approval.
- [ ] Live-verify policy-gated SOL/SPL withdrawals with approved Privy credentials, signer policy, funded wallet, and an approved testnet or mainnet dry run.
- [x] (2026-07-04) Added FTX-owned token-cleanup review. Ribbot `/cleanup` calls FTX for dust/hidden/unpriced SPL candidates, then offers explicit Hide or staged Sell actions that reuse FTX preference validation and existing confirmed sell tickets.
- [x] (2026-07-04) Added FTX-owned token-safety review. Ribbot `/safety`, `/safe`, `/risk`, `/rugcheck`, and pasted-token Safety buttons call FTX for parsed SPL mint authority/freeze authority/supply data plus Jupiter Price V3 pricing, then render review-only low/medium/high risk flags without mutating preferences or trading.
- [x] (2026-07-04) Added FTX-owned market-risk scans. Ribbot `/scan`, `/market`, `/liquidity`, and pasted-token Scan buttons call FTX for token-safety, estimated market-cap, SOL pricing, and optional Titan quote/liquidity-probe flags without mutating preferences or trading.
- [x] (2026-07-04) Added FTX-owned staged order persistence. FTX `TradingBotAccountStore` now stores/lists/cancels non-secret limit, stop-loss, trailing-stop, and DCA order records through `/api/frogx/trading-bot/orders` and `/api/frogx/trading-bot/orders/cancel`; Ribbot syncs `/orders` from FTX and treats local `.state` as a cache.
- [x] (2026-07-04) Added the FTX scheduled-order scanner. When `TRADING_BOT_SCHEDULER_ENABLED=true`, FTX cron scans the global staged-order registry, evaluates limit/stop/trailing triggers with Jupiter Price V3 USD prices, advances DCA intervals, persists trailing peaks, and records non-secret trigger state. Live execution remains behind a separate scheduler live gate plus the normal Privy signer/live-execution gates.
- [x] (2026-07-04) Threaded FTX market-risk review into auto-buy validation/storage warnings. When Solana RPC is configured, staged auto-buy rules include token-safety, market-cap, and quote/liquidity-probe warnings before any future automation can execute.
- [x] (2026-07-04) Added FTX-owned staged bundle-buy baskets. Ribbot `/bundle add ...` now routes multi-token buy caps through FTX `/api/frogx/trading-bot/bundle-buy`; FTX stores/lists/cancels the non-secret basket and no bundle monitor, swap build, signing, broadcast, or schedule starts.
- [x] (2026-07-04) Added FTX-gated live bundle-buy execution readiness. Stored baskets expose an explicit Execute button; FTX reloads the basket/account, checks the extra bundle live gate, base live gate, RPC SOL balance, every-item market-risk quote probe, wallet/revocation checks, and Privy signer config, then executes each item through the existing `/execute` Privy boundary.
- [x] (2026-07-04) Added FTX-owned referral and reward hooks. Ribbot `/referral`, `/rewards`, and `/start <code>` now route referral summary/apply actions through FTX `/api/frogx/trading-bot/referrals`; rewards are tracking-only with no fee share, token payout, claimable balance, signing, or transfer.
- [x] (2026-07-04) Added the FTX-owned account dashboard in Telegram. Ribbot `/account`, `/status`, and `/sync` now fetch FTX `/api/frogx/trading-bot/account`, refresh the non-secret cache, and render wallet source, bot-access status, claim/export handoff state, settings, saved lists, and referral code without reading keys, signing, broadcasting, or trading.
- [ ] Live-verify scheduled order execution for limit orders, stop losses, trailing stops, and DCA with approved Privy credentials, signer policy, and an approved testnet or mainnet dry run.
- [x] (2026-07-10) Added code-level FTX-owned sniper monitoring/execution readiness with Jupiter recent first-pool baselining, persistent cursor/deduplication, source/risk/cap/cooldown/account checks, atomic execution claims, read-only reconciliation, and Ribbot opt-in/status rendering. Every monitor/live gate defaults false.
- [ ] Privately live-verify copytrade/sniper/auto-buy/auto-sell/bundle-buy with approved credentials and funding before enabling any production gate.
- [x] (2026-07-06) P0 Telegram UX hardening pass: unknown slash commands answer deterministically with Help/Menu buttons instead of falling through to the Eliza LLM; `/command@OtherBot` mentions are ignored so Ribbot does not hijack other bots' group commands; stale inline-button callbacks reply instead of silently doing nothing; the pasted-token panel and `/help` copy are execution-mode aware; dry-run confirmations attribute the block to Ribbot's own live gates; `/help`, `/wallet`, `/positions`, `/pnl`, and empty orders/withdrawals states gained navigation keyboards; fixed the `/scan` priority-fee field bug; the trading module now passes `tsc --noEmit` with zero errors.
- [x] (2026-07-10) Hardened code-level live scheduled execution for limit, stop-loss, trailing-stop, and DCA orders. FTX now atomically claims a trigger before `/execute`, assigns a distinct execution ID to every run/DCA slice, sends a signed Privy idempotency key, records executing/executed/failed state and execution events, leaves misconfigured orders staged, rejects competing claims, and does not auto-replay uncertain sends. Ribbot `/orders` renders scheduler progress/failures and never treats an unconfirmed FTX cancellation as locally successful. Mocked Worker coverage passes; real Privy/Solana/Telegram verification remains pending explicit approval.
- [x] (2026-07-10) Added read-only reconciliation for interrupted or ambiguous scheduled sends. FTX persists the Privy reference before execution, waits a configurable race window, looks up the transaction without calling wallet RPC, validates wallet/chain, resolves confirmed/finalized and terminal failure states, leaves pending/not-found/lookup errors `executing`, and rejects stale state writes by expected execution ID/status. Ribbot renders reconciliation state and activity labels. No live call or deploy occurred.
- [x] (2026-07-10) Rebuilt the FTX `/profile` page as the first broader web-app revamp milestone. It now separates disconnected/loading/error/no-profile states, removes synthetic points/rank and always-earned badges, and renders real wallet/Tapestry social and recent-trade metrics, owned Frog cards/PFP selection, recent activity, and threshold milestones. Focused tests, UI typecheck/build, and populated 1440px/390px browser checks pass with no horizontal overflow.
- [x] (2026-07-10) Added direct swap/withdrawal reconciliation. Ambiguous Privy responses now lock the Ribbot ticket as `execution_pending`; Check Status calls authenticated read-only FTX endpoints that validate reference/wallet/chain and resolve success, terminal failure, pending, or not-found without resending. Malformed and 409 FTX bodies fail closed instead of becoming false success receipts. Persistent not-found/error alerting and live verification remain pending.
- [x] (2026-07-10) Hardened user-triggered bundle sequences. FTX atomically claims staged baskets, persists attempted/confirmed progress around each item, and exposes read-only Privy-reference reconciliation. Ribbot locks unresolved baskets, restores lifecycle state from FTX after restart, and offers Check Status instead of replaying Execute/Cancel. Confirmed partial baskets become failed and never auto-resume; remaining items require a fresh basket. Mock tests/build/browser verification passed; no live execution or deploy occurred.
- [x] (2026-07-10) Hardened copytrade, auto-buy, and auto-sell execution. FTX atomically claims configs and persists deterministic execution identity before `/execute`; ambiguous Privy responses stay `executing` for wallet/chain-validated GET-only reconciliation with stale-write protection and deterministic activity/PNL events. One-shot auto rules resolve to `executed`/`failed`; standing copytrade resumes monitoring only after terminal resolution. Ribbot keeps every non-cancelled lifecycle visible and treats cancel conflicts as locked state. No live execution or deploy occurred.
- [x] (2026-07-10) Added user-triggered advanced Check Status. Executing copytrade, auto-buy, and auto-sell rows expose Telegram callbacks that call authenticated per-config FTX status endpoints, rehydrate authoritative state, and offer Check Again while unresolved. The FTX routes reuse GET-only Privy reconciliation after the safety window and cannot execute or resend. Tests, typecheck, build, and Worker dry-run pass; no live action or deploy occurred.
- [x] (2026-07-10) Replaced placeholder wallet-control buttons with the code-level Privy bot-first flow. `/control` uses Telegram `login_url`; FTX `/ribbot` disables login wallet creation, requires exact Privy/Telegram/wallet identity, opens Privy's isolated Solana export modal, confirms app-signer removal, synchronizes FTX pause, and restores configured signer/policies before clearing it. Added a no-secret private live checklist. Tests, builds, Worker dry-run, and 1440px/390px unconfigured-state browser checks pass; dashboard setup and live Privy actions remain approval-gated.
- [x] (2026-07-10) Completed milestone 38, the code-level sniper path. FTX uses Jupiter Tokens V2 recent first pools, records a no-trade startup baseline, advances a durable cursor, deduplicates mints, applies source/authority/liquidity/market-cap/cooldown/max-snipes/SOL/risk checks, and routes eligible buys only through `/execute` and Privy behind separate false-by-default gates and account opt-in. Ribbot adds `/settings sniper on|off`, launch metadata, and GET-only Check Status. FTX API has 165 passing focused tests, Ribbot has 27, and authenticated local `/ribbot` fixtures pass at 1440px/390px without overflow; no deploy or live call occurred.
- [x] (2026-07-10) Completed milestone 39, bounded unresolved-execution escalation. FTX now applies one configurable 900-second default review clock across direct swaps/withdrawals, scheduled orders, bundle items, copytrade, sniper, auto-buy, and auto-sell; persists review timestamps/reasons; and emits a deduplicated non-secret manual-review event without retrying or changing lifecycle state. Ribbot persists and renders the review state with explicit lock/no-retry guidance. FTX has 166 passing API tests and Ribbot has 28 passing trading tests; Worker dry-run, Ribbot typecheck/build, and both diff checks pass. No deploy or live external action occurred; an authenticated operator-resolution endpoint and alert delivery remain pending.
- [x] (2026-07-10) Completed milestone 40, the FTX-owned operator review queue. A separate operator token protects active/resolved case listing, audit-only acknowledgement, and evidence-only reconciliation for direct, scheduled, bundle, and advanced executions. Reconcile reuses Privy GET-only wallet/chain validation, never signs/sends, and closes a case only on terminal evidence; normal reconciliation also closes queued cases. Ribbot renders acknowledgement/resolution activity without operator authority, and a no-secret runbook documents stop conditions. FTX has 171 passing API tests, Ribbot has 28, and typecheck/build/Worker/diff checks pass. No secret was configured and no live action or deploy occurred; push alert delivery and private live verification remain pending.
- [x] (2026-07-10) Completed milestone 41, bounded confirmed wallet-balance-flow indexing. FTX `/pnl` checks at most 12 missing swap signatures through read-only Solana `getTransaction`, accepts a flow only after stored-wallet and expected-mint validation, neutralizes network fees and wallet-owned token-account rent, and persists one deterministic non-secret fill event. Ribbot shows confirmed/estimated coverage and fill activity. This is not decoded DEX-route execution; USD PNL remains net-SOL/current-price estimation without realized/FIFO tax lots. FTX has 172 passing API tests and Ribbot has 29; live transaction-shape verification remains approval-gated.
- [x] (2026-07-10) Completed milestone 42, Trojan-style mode and trade-control parity. FTX now owns Simple/Advanced mode, 2-4 buy/sell presets, separate buy/sell fees, confirmation, and sell protection; simple mode forces stored confirmation off. Ribbot refreshes FTX state before menus/trades, renders dynamic preset buttons, immediately routes confirm-off tickets through the existing FTX execution boundary, and still requires explicit confirmation for protected sells above 75%. FTX has 174 passing API tests, Ribbot has 33, UI tests/typechecks/builds and 1440px/390px browser checks pass, and no live action or deploy occurred.
- [x] (2026-07-12) Completed milestone 43, Trojan-style position management. `/positions [page]` renders five visible FTX holdings per page with value/PNL when available and balance-only fallback, while `/position <mint>` and per-row buttons open Buy/Sell preset, Scan, Safety, Hide/Unhide, Back, and Menu actions. Pagination clamps after balance changes and all callback payloads stay within Telegram's 64-byte limit. FTX API remains at 174 passing tests and Ribbot now has 37; typecheck/build/Worker/diff checks pass. No Telegram, Privy, Solana, secret, or deploy action occurred.
- [x] (2026-07-12) Completed milestone 44, FTX-owned managed copytrade strategies. FTX persists and enforces tags, fixed/percentage sizing and max caps, target minimums, separate sell fees, copy-sell/duplicate controls, renounced authority, liquidity and min/max market-cap checks, blacklists, and staged/paused lifecycle transitions. Ribbot adds enhanced commands, authoritative summaries, and Pause/Resume controls while retaining Check Status and no-resend reconciliation. FTX has 177 passing API tests and Ribbot has 41; typecheck/build/Worker/diff checks pass. Pump.fun exclusion, edit/duplicate UX, and live verification remain pending. No external action occurred.
- [x] (2026-07-12) Completed milestone 45, FTX-authoritative copytrade edit/duplicate. Staged or paused strategies accept complete revalidated replacements; executing/terminal rows and the managed wallet are immutable. Same-target edits preserve the consumed-signature cursor, target changes reset to a no-trade baseline, and FTX creates duplicates as fresh staged rows. Ribbot adds edit/duplicate commands and buttons with no local fallback plus a pure tested command grammar. FTX has 180 passing API tests and Ribbot has 49; typecheck/build/Worker/diff checks pass. No external action occurred.
- [x] (2026-07-12) Completed milestone 46, Trojan-compatible PumpFun bonding-curve exclusion. FTX persists a false-by-default flag and rejects copied buys/sells only when the parsed target transaction contains Pump's official bonding-curve program; PumpSwap remains allowed after graduation. Ribbot carries `excludepump=on|off` through add/edit/duplicate/cache/rendering without classifying transactions. FTX has 181 passing API tests and Ribbot has 49; typecheck/build/Worker/diff checks pass. No external action occurred.
- [x] (2026-07-12) Completed milestone 47, disabled-by-default automatic FTX trade-status alerts. Ribbot polls only the authenticated read-only FTX activity feed, establishes a no-send first-poll baseline, collapses duplicate execution/reconciliation/review rows, batches terminal and unresolved updates, and persists a bounded per-user event cursor plus delivery backoff across restarts. Polling is lifecycle-owned, overlap-safe, rotates through bounded users, and advances delivery state only after Telegram accepts the message. Ribbot now has 58 passing trading tests plus clean typecheck/build verification. No Telegram message, deploy, secret read/change, or live FTX/Privy/Solana call occurred.
- [x] (2026-07-12) Completed milestone 48, the FTX `/ribbot` operational web-app revamp. The control page now uses a flat exchange workspace with session/account bands, a dense trading-defaults editor, wallet/Privy access state, and stacked watch/hidden management instead of nested neon cards; the full exchange navigation is consistent with `/profile`. Existing FTX session, preference, wallet, Privy identity, and bot-pause contracts are unchanged. The UI has 23 passing tests, clean typecheck and production build, plus empty and mocked populated browser checks at 1440px/390px with exact viewport width and no overlap. No deploy, live account, Telegram, FTX, Privy, Solana, or secret action occurred.

## Surprises & Discoveries

- Observation: The existing FTX PNL response is sufficient for a production-shaped position manager without duplicating RPC or pricing logic in Ribbot.
  Evidence: Each FTX PNL token already carries raw/UI balance, hidden state, current USD value, price/change, estimated cost, unrealized PNL, buy/sell counts, and confirmed/estimated fill counts. Milestone 43 uses that response first and falls back to the separate FTX positions endpoint only when valued PNL is unavailable.

- Observation: FTX-owned preferences are not authoritative in practice if Telegram renders long-lived local cache after a browser update.
  Evidence: `/settings` and `/account` already refreshed FTX, but `/menu`, pasted-token panels, and direct buy/sell previews did not. Milestone 42 refreshes the account snapshot before those surfaces and falls back to the non-secret cache only when FTX is unavailable.

- Observation: The client-telegram build (`tsup --format esm --dts`) transpiles without type-checking expressions, so real type errors ship silently. A `user.settings.priorityFee` read (field does not exist; correct name is `priorityFeeLamports`) built fine but sent `undefined` priority fees to the FTX market-risk probe, and 22 other latent `tsc --noEmit` errors existed in the trading module.
  Evidence: `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` reported 23 TS2339 errors on 2026-07-06 before the fix and 0 after; the build passed in both states. Run that tsc command alongside the build when touching the trading module.

- Observation: A Privy transaction `reference_id` is reconciliation metadata, not the duplicate-send guarantee by itself.
  Evidence: Privy's current REST documentation separately requires the `privy-idempotency-key` header for idempotent transaction POSTs and guarantees same-key/same-body replay protection for 24 hours. FTX now signs and sends that header and persists an execution claim before making the request.

- Observation: Privy's transaction lookup can safely distinguish in-progress, successful, and terminal outcomes without repeating the wallet RPC.
  Evidence: Privy's current transaction API documents lookup by `reference_id`; `pending`/`broadcasted` are in progress, `confirmed`/`finalized` are successful, and `execution_reverted`/`failed`/`provider_error` are terminal failures. FTX also treats unexpected Solana `replaced` status as terminal and validates the returned wallet and chain before changing order state.

- Observation: Casting an HTTP JSON body to a discriminated execution-result union does not validate the runtime discriminator.
  Evidence: FTX can return 409 bodies such as `{ status: "revoked" }` or plain `{ error }`; the previous Ribbot client skipped both known error branches and entered the success branch with an undefined signature. The client now validates expected status and signature fields explicitly and otherwise returns `not_executable`.

- Observation: Deterministic per-item references are insufficient if the parent basket remains staged after an ambiguous response.
  Evidence: A second Execute request could previously restart the sequence even though an earlier Privy item might have broadcast. FTX now atomically claims the parent basket, persists sequence progress, and lets status checks inspect attempted references only; unattempted items are never sent by reconciliation.

- Observation: The existing Telegram client already has a `TG_TRADER` flag and backend recommender hook, but no command router or wallet/trading state.
  Evidence: `packages/client-telegram/src/telegramClient.ts` reads `TG_TRADER` and calls `getOrCreateRecommenderInBe`, then always falls through to `MessageManager`.

- Observation: Privy documents a Telegram trading bot pattern with two possible flows: bot-first and app-first. Bot-first creates a user and wallet from Telegram, then lets the user later claim the wallet in an app. App-first creates the wallet in a web/mobile app and adds a signer for bot execution.
  Evidence: Privy docs describe both approaches under "Building a Telegram trading bot"; this plan chooses bot-first for the Telegram MVP and adds FTX as the later claim/control surface.

- Observation: Trojan's current user-facing scope is broader than simple swaps. It includes wallet management, buy/sell settings, MEV and gas controls, positions, limit orders, DCA, copy trading, sniper tools, watchlists, withdrawals, auto buy, auto sell, bundle buys, and token cleanup.
  Evidence: Trojan docs navigation and feature pages list these modules, with detail on limit trigger types, DCA ranges, copy-trade filters, and sniper filters.

- Observation: Privy's REST API can create Solana wallets directly by setting `chain_type` to `solana`, and user lookup by Telegram ID is a first-class API endpoint.
  Evidence: The current Privy API reference documents `POST /v1/wallets` with `chain_type` options including `solana`, and `POST /v1/users/telegram/telegram_user_id` for Telegram user lookup.

- Observation: Ribbot should not own Privy credentials or trading execution policy.
  Evidence: AKLO clarified on 2026-07-04 that everything should route through FTX. The implementation now places Privy REST calls in the FTX Worker and makes Ribbot call FTX/FrogX endpoints.

- Observation: The FrogX quote API returns output amounts in raw token base units, matching the UI's existing behavior where the frontend formats using token decimals.
  Evidence: `../ftx/apps/ui/src/lib/hooks/useQuotePreview.ts` divides `amountOut` by the selected token's decimals before display, so Ribbot currently labels quote output as raw units until it adds token metadata lookup.

- Observation: Percentage sells need FTX-backed positions before they can safely build swap payloads.
  Evidence: Ribbot now calls FTX `/api/frogx/trading-bot/positions` to resolve SPL token base-unit balances before creating a sell ticket. If FTX positions are unavailable or the mint is absent, `/sell` refuses to guess.

- Observation: Limit, stop-loss, trailing-stop, and DCA order staging should still be FTX-routed even before a live scheduler exists.
  Evidence: FTX now exposes `/api/frogx/trading-bot/orders/validate` for stateless checks plus `/api/frogx/trading-bot/orders` and `/api/frogx/trading-bot/orders/cancel` for authenticated storage/list/cancel in `TradingBotAccountStore`. These routes still return warnings and do not schedule, monitor, sign, or broadcast.

- Observation: Withdrawals need their own staged validation path instead of being modeled as swaps.
  Evidence: FTX now exposes `/api/frogx/trading-bot/withdrawals/validate`, which requires the Ribbot bearer token, normalizes SOL/SPL withdrawal destination and amount details, and returns warnings without building, signing, or broadcasting a transfer transaction.

- Observation: Copytrade and sniper configs need FTX-owned risk validation and persistence before any live monitors exist.
  Evidence: FTX now exposes `/api/frogx/trading-bot/copytrade/validate`, `/api/frogx/trading-bot/copytrade`, `/api/frogx/trading-bot/copytrade/cancel`, `/api/frogx/trading-bot/sniper/validate`, `/api/frogx/trading-bot/sniper`, and `/api/frogx/trading-bot/sniper/cancel`; these require max-buy caps and liquidity filters, store non-secret staged metadata in FTX, and return warnings without starting wallet or launch monitors.

- Observation: Trojan-style copytrade settings are only meaningful if the execution control plane enforces them against the observed target transaction and the user's current position.
  Evidence: FTX now derives fixed/percentage buy amounts from the parsed target SOL delta, applies caps and configured filters before `/execute`, computes copied sells from the target's sold percentage and the user's FTX-reported balance, and excludes paused strategies from monitor scans. Ribbot sends and renders the strategy but never computes an executable swap itself.

- Observation: Changing a copytrade target cannot safely retain the previous target's signature cursor or immediately consume the new target's latest transaction.
  Evidence: FTX preserves monitor state for same-target parameter edits, but a target change clears monitor state so the existing baseline branch records the new target's latest signature without trading it. FTX-created duplicates also start with empty monitor state.

- Observation: Trojan's PumpFun exclusion is narrower than excluding every token launched by Pump.
  Evidence: Trojan's official copytrade guide says the filter prevents copying PumpFun tokens on the bonding curve. Pump's official protocol docs identify the bonding-curve program as `6EF8...F6P` and separately identify PumpSwap as `pAMM...XEA` for graduated AMM pools. FTX can therefore classify the observed transaction from immutable program accounts and leave PumpSwap eligible.

- Observation: FTX account events can drive Telegram status alerts without giving Ribbot new execution authority.
  Evidence: The existing authenticated `/api/frogx/trading-bot/activity` feed already contains deterministic execution, failure, reconciliation, and manual-review event IDs. Ribbot now keeps only delivered/observed IDs and retry timestamps locally, baselines existing history without sending it, and calls Telegram only after projecting a new FTX event batch; it never calls an execution endpoint from the poller.

- Observation: The account-control page needed an operational layout, not another decorative product card.
  Evidence: The prior `/ribbot` shell nested bordered panels, bordered labels, and token rows inside one glowing card. The revised page uses full-width session/account bands and one responsive workspace grid, preserves every request contract, and browser diagnostics report `scrollWidth === innerWidth` at both 1440px and 390px for empty and populated states.

- Observation: Copytrade monitoring can safely begin as target-wallet observation before copied execution exists.
  Evidence: FTX now exposes a disabled-by-default `runTradingBotAdvancedAutomationMonitors` cron runner. With `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true` and `TRADING_BOT_COPYTRADE_MONITOR_ENABLED=true`, it scans stored configs, calls Solana `getSignaturesForAddress` for the target wallet, records an initial baseline signature, detects later new signatures, and writes only non-secret monitor state/events.

- Observation: Auto-buy and auto-sell need FTX-owned rule persistence before live automation exists.
  Evidence: FTX now exposes `/api/frogx/trading-bot/auto-buy/validate`, `/api/frogx/trading-bot/auto-buy`, `/api/frogx/trading-bot/auto-buy/cancel`, `/api/frogx/trading-bot/auto-sell/validate`, `/api/frogx/trading-bot/auto-sell`, and `/api/frogx/trading-bot/auto-sell/cancel`; Ribbot `/autobuy` and `/autosell` list from FTX first and keep local state as a non-secret cache.

- Observation: Auto-buy and auto-sell monitoring can safely start as FTX-owned observation before live automation exists.
  Evidence: FTX now exposes disabled-by-default `TRADING_BOT_AUTO_BUY_MONITOR_ENABLED` and `TRADING_BOT_AUTO_SELL_MONITOR_ENABLED` gates under the advanced monitor runner. Auto-buy checks only token price state and records that liquidity monitoring is not configured; auto-sell observes configured Jupiter Price V3 trigger crossings and records non-secret dry-run trigger state/events.

- Observation: Auto-sell is the safest first advanced automation execution path because it acts on the user's own token balance and can reuse FTX positions plus the existing `/execute` Privy boundary.
  Evidence: FTX live auto-sell execution loads the stored account, checks `autoSellEnabled`, verifies the stored Privy wallet match and bot-access status through `/execute`, computes sell amount from RPC positions, and submits only through Privy Solana `signAndSendTransaction` after the extra auto-sell live gate and base live gate pass.

- Observation: Auto-buy needs stricter pre-trade checks than auto-sell because it spends SOL into a token the account may not already hold.
  Evidence: FTX live auto-buy execution loads the stored account, checks `autoBuyEnabled`, verifies SOL balance from RPC positions, runs token-safety plus market-risk quote probing, rejects danger flags or non-ready quote probes, then submits only through `/execute` and Privy Solana `signAndSendTransaction` after the extra auto-buy live gate and base live gate pass.

- Observation: Copytrade needs target-transaction parsing before any execution attempt; observing a target-wallet signature alone is not enough.
  Evidence: FTX live copytrade execution fetches the parsed target transaction, derives only simple SOL/SPL buy or sell intents from target wallet balance deltas, rejects ambiguous token-token or multi-token changes, caps copied buys by the stored max-buy amount, requires `copySells` for sells, runs buy risk/quote checks, and submits only through `/execute` and Privy Solana `signAndSendTransaction` after the extra copytrade live gate and base live gate pass.

- Observation: Preferences should follow the same FTX boundary as trading actions and become recoverable outside Ribbot's local JSON cache.
  Evidence: FTX now exposes `/api/frogx/trading-bot/preferences/validate` and `/api/frogx/trading-bot/account`; Ribbot validates preference changes through FTX and syncs local state from FTX account snapshots.

- Observation: The first control-page bridge can be useful before the page itself exists if it only grants a short-lived account-state session.
  Evidence: The initial bridge exposed `/control/code` and `/control/session` without wallet actions. The same short-lived session now protects non-secret account state, while milestone 37 separately requires Privy owner authentication for export and signer changes.

- Observation: The browser control page can safely ship before live signer management if it only uses short-lived FTX sessions and non-secret account state.
  Evidence: The initial 2026-07-04 milestone exposed only preferences and non-secret handoff markers. Milestone 37 supersedes the disabled controls with Privy-owner-authenticated export and signer management while retaining the short-lived FTX session for non-secret state.

- Observation: Privy's current Solana server-side send path is a wallet RPC call, not a Ribbot-side signer.
  Evidence: Official Privy docs for `signAndSendTransaction` specify `POST /v1/wallets/{wallet_id}/rpc` with `method: "signAndSendTransaction"`, CAIP-2 Solana chain ID, and a base64 serialized transaction. Official authorization-signature docs state wallet actions require owner/signer signatures when the wallet has an owner; the FTX implementation signs the Privy request inside the Worker from the configured authorization private key.

- Observation: SOL/SPL withdrawals can use the same FTX-owned Privy execution boundary as market swaps, but FTX must build the transfer transaction itself.
  Evidence: FTX now exposes `/api/frogx/trading-bot/withdrawals/execute`; it obtains a recent blockhash from Solana RPC, builds a System Program SOL transfer or SPL `transferChecked` with destination ATA creation when needed, and submits the serialized transaction through Privy.

- Observation: PNL cards need FTX-owned execution history, not only Ribbot local state.
  Evidence: FTX records `swap_executed` and `withdrawal_executed` account events after successful Privy sends, and `/api/frogx/trading-bot/pnl` combines those events with live positions and Jupiter Price V3 prices. Milestone 41 later added confirmed wallet-balance flow, but USD valuation and realized/FIFO semantics remain explicitly estimated.

- Observation: Wallet export must not be implemented as a plain Worker JSON response.
  Evidence: The current Privy React SDK exposes an isolated Solana export modal for authenticated user-owned wallets. FTX `/ribbot` calls that SDK only after the exact identity/wallet tuple matches; the FTX control endpoint receives only a non-secret lifecycle marker and never receives exported key material.

- Observation: Token safety is useful before buy confirmation, but it should remain a review surface rather than an execution trigger.
  Evidence: FTX now exposes `/api/frogx/trading-bot/token-safety`, which reads parsed SPL mint authority, freeze authority, supply, and Jupiter Price V3 pricing, while Ribbot exposes `/safety`, `/safe`, `/risk`, `/rugcheck`, and pasted-token Safety buttons that render risk flags without hiding, selling, signing, or broadcasting.

- Observation: Liquidity filters need an honest quote probe until a fuller on-chain liquidity model is approved.
  Evidence: FTX now exposes `/api/frogx/trading-bot/market-risk`, which combines token-safety flags, estimated market cap, SOL pricing, and an optional Titan quote probe sized to the requested minimum-liquidity USD when SOL price is available. If Titan quote credentials are absent, the response says quote probing is not configured instead of treating a mock quote as liquidity.

- Observation: Auto-buy validation can consume market-risk review without becoming execution.
  Evidence: FTX auto-buy validation/storage appends market-risk review warnings when Solana RPC exists and otherwise records that review was skipped or unavailable; Ribbot already renders FTX warnings from storage responses.

- Observation: Bundle buys should be staged as basket metadata before an explicit execution request.
  Evidence: FTX exposes `/api/frogx/trading-bot/bundle-buy/validate`, `/api/frogx/trading-bot/bundle-buy`, and `/api/frogx/trading-bot/bundle-buy/cancel`; Ribbot `/bundle` stores/lists/cancels multi-token SOL caps through those endpoints and keeps local state as a non-secret cache.

- Observation: Bundle-buy execution needs basket-wide preflight before any sequential swap starts.
  Evidence: FTX `/api/frogx/trading-bot/bundle-buy/execute` reloads the stored basket, requires a stored Privy wallet/account match, checks RPC SOL balance against the basket total, runs market-risk quote probing for every item, and only then submits each item through `/execute` and Privy Solana `signAndSendTransaction`.

- Observation: Referral/reward hooks can ship as tracking-only account metadata before fee-share or payout policy exists.
  Evidence: FTX now exposes `/api/frogx/trading-bot/referrals`; Ribbot `/referral`, `/rewards`, and `/start <code>` fetch/apply codes through FTX and label rewards as tracking-only with no claimable balance, signing, transfer, fee share, or token payout.

- Observation: Account activity history can reuse FTX account events instead of adding a Ribbot-local audit log.
  Evidence: FTX now exposes `/api/frogx/trading-bot/activity`; Ribbot `/activity`, `/history`, `/trades`, and `/events` render recent FTX event rows and warnings while keeping local state as cache-only.

- Observation: `/account` should show the account snapshot, not only issue a browser-control code.
  Evidence: Ribbot now routes `/account`, `/status`, and `/sync` through FTX `/api/frogx/trading-bot/account`, updates the non-secret cache from the returned snapshot, and keeps `/control` and `/manage` as the control-code handoff commands.

- Observation: A recent-token feed must be baselined before a sniper can safely treat results as new launches.
  Evidence: Jupiter's recent endpoint returns already-created first pools. FTX therefore records the newest `(createdAt, poolId)` cursor on the first enabled poll without trading, advances it on later polls, and consumes dry-run observations so turning on a live gate cannot retroactively buy an old pool.

- Observation: A permanently unresolved Privy reference needs a review clock, but elapsed time is not evidence of success or failure.
  Evidence: FTX now derives a shared deadline from the persisted execution start, records one non-secret manual-review event after the deadline, and exposes it to Ribbot while leaving the execution locked. No status route retries, resends, or fabricates a terminal provider result.

- Observation: Operator ownership and execution resolution are different state transitions.
  Evidence: FTX stores acknowledgement independently from lifecycle state. The operator reconcile route can close a case only after existing Privy GET/bundle reconciliation produces terminal evidence; pending/not-found/error responses remain acknowledged and locked.

- Observation: A wallet's raw SOL delta is not itself the swap amount when the transaction creates or closes token accounts.
  Evidence: ATA rent moves between the system wallet and wallet-owned SPL accounts, while the network fee is charged to the fee payer. The fill parser therefore sums lamport deltas across the wallet plus every token account proven to be wallet-owned and then adds back the network fee only when that wallet is the fee payer. Mock coverage includes ATA creation, a buy, and a partial sell.

## Decision Log

- Decision: Keep mode, presets, fees, confirmation preference, and sell-protection preference in FTX account state while applying Telegram interaction policy in Ribbot.
  Rationale: Browser and Telegram controls need one recoverable source of truth, and simple mode must not persist an internally contradictory `confirmTrades=true`. Ribbot remains responsible for the number of Telegram taps: confirm-off tickets still use the same FTX `/execute` path and all live gates, while protected sells above 75% retain an explicit Confirm step.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Index confirmed wallet-balance flow lazily inside FTX PNL with a bounded read-only RPC budget and deterministic account events.
  Rationale: Account Durable Objects are sharded by Telegram user and there is no global account iterator for a standalone indexer. A maximum of 12 missing signatures per request keeps subrequests bounded, deterministic event IDs prevent duplicate indexing, and failed or ambiguous parses remain retryable estimates. Ribbot receives only non-secret coverage data and no signing/resend capability. Historical USD valuation and realized/FIFO accounting remain separate work.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Protect review operations with a separate FTX operator token and provide no force-terminal endpoint.
  Rationale: Ribbot credentials are broadly used by Telegram request paths and must not grant operational authority. A separate secret limits the review surface, while evidence-only reconciliation prevents an operator note or elapsed time from being mistaken for transaction proof.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Escalate unresolved executions after a bounded age without changing execution state automatically.
  Rationale: Privy `not_found`, pending, or lookup failures can outlive the normal reconciliation window, but age alone cannot prove whether a Solana transaction landed. FTX therefore records review metadata and Ribbot directs an operator to inspect FTX/Privy/Solana; a future authenticated resolution tool must require evidence and must never reuse the original send automatically.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Use Jupiter Tokens V2 recent first pools as the initial FTX-owned sniper launch source, with fail-closed source classification and no webhook dependency.
  Rationale: The feed supplies mint, first-pool identity/time, launchpad, liquidity, market cap, price, organic score, and authority metadata through an authenticated pull API that fits the existing guarded cron. A startup cursor and processed-mint set prevent old or duplicate candidates; source-specific rules reject unclassified values. Live source coverage still requires approved sample verification.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Treat copytrade as standing automation and auto-buy/auto-sell as one-shot configs after reconciliation.
  Rationale: A terminal copied transaction should consume that target signature but allow later target activity, while an auto rule must not fire again after a confirmed or provider-terminal send. FTX therefore returns reconciled copytrade to `staged`, resolves auto rules to `executed`/`failed`, and keeps every ambiguous attempt `executing` until Privy proves a terminal result.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Keep managed copytrade mutation and filter enforcement inside FTX, and do not implement Trojan's blind retry option.
  Rationale: Ribbot cannot be allowed to reinterpret sizing or safety rules, and an executing strategy cannot be paused safely after a send may have started. FTX therefore owns strategy persistence, permits only `staged -> paused` and `paused -> staged`, and keeps ambiguous sends locked for existing read-only reconciliation. Retrying an unresolved execution could duplicate a trade and violates the no-resend invariant.
  Date/Author: 2026-07-12 / LLPhant

- Decision: Implement PumpFun exclusion from the target transaction's official Pump program account, not mint suffixes, token metadata, or a broad PumpSwap block.
  Rationale: The transaction account list is execution evidence under the existing FTX parser, while names, symbols, URIs, and suffix conventions are mutable or incomplete. Blocking only the bonding-curve program matches Trojan's documented pre-graduation scope and avoids suppressing graduated PumpSwap trades.
  Date/Author: 2026-07-12 / LLPhant

- Decision: Deliver automatic trade-status messages from FTX activity with an opt-in Ribbot poller and a durable delivery cursor.
  Rationale: FTX already owns transaction lifecycle truth, while Telegram delivery is a Ribbot transport concern. A no-send initial baseline prevents historical floods; reference-aware grouping prevents duplicate swap/automation/review messages; successful-send-only cursor advancement and persisted backoff avoid false delivery claims or tight retry loops. The global feature flag remains false until a private Telegram verification is explicitly approved.
  Date/Author: 2026-07-12 / LLPhant

- Decision: Carry the profile revamp's flat exchange workspace into `/ribbot` without changing the FTX/Privy control contract.
  Rationale: The browser surface should make frequent account and trading-default changes easy to scan, but visual work must not create another authority path. The revamp changes hierarchy, navigation, responsive layout, and control styling only; session exchange, preference writes, wallet actions, Privy ownership checks, and pause/restore behavior remain on their existing guarded endpoints.
  Date/Author: 2026-07-12 / LLPhant

- Decision: Never auto-resume an interrupted partial bundle-buy basket.
  Rationale: Preflight cannot guarantee that later sequential sends succeed, and an ambiguous response can hide a broadcast. FTX therefore reconciles attempted references read-only, marks fully confirmed sequences executed, marks terminal or confirmed partial sequences failed, and requires a fresh explicit basket for remaining items.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Claim scheduled orders in the FTX Durable Object before live execution and reconcile ambiguous responses by reference without retrying the send.
  Rationale: Two overlapping cron invocations must not spend twice, and a lost response after a transaction POST is ambiguous. The durable claim and Privy idempotency block duplicate sends; ambiguous responses remain `executing` until read-only lookup resolves them, while expected execution-ID/status checks prevent stale cron work from overwriting a newer state.
  Date/Author: 2026-07-10 / LLPhant

- Decision: Start with a safe dry-run Telegram command router instead of attempting live trading first.
  Rationale: Live bot-side trading requires Privy app credentials, signer authorization, wallet policies, transaction simulation, and explicit deployment decisions. A command scaffold lets the UI and state model harden without risking funds.
  Date/Author: 2026-07-04 / Codex

- Decision: Use Privy's bot-first pattern for Ribbot's first wallet flow and later add FTX as the claim/control surface.
  Rationale: The user wants a Telegram-native trading bot like Trojan. Bot-first gets users to a fundable Telegram wallet fastest, while the FTX app can provide richer account management, export, signer revocation, and analytics.
  Date/Author: 2026-07-04 / Codex

- Decision: Route every wallet and trading operation through FTX/FrogX.
  Rationale: FTX is the control plane for FrogX quotes/swaps, Privy secrets, signer policy, and future live execution. Ribbot remains a deterministic Telegram UX layer with non-secret local state.
  Date/Author: 2026-07-04 / Codex

- Decision: Add account-control codes before building the browser control page.
  Rationale: Codes create the FTX-owned handoff from Telegram to the future control page without exposing Privy credentials or enabling export/revocation/signing prematurely.
  Date/Author: 2026-07-04 / Codex

- Decision: Ship `/ribbot` preference management before wallet claim/export/revocation.
  Rationale: This was the 2026-07-04 sequencing decision. Milestone 37 later added Privy-authenticated claim/export and signer controls after the owner/signer APIs and identity checks were defined.
  Date/Author: 2026-07-04 / Codex

- Decision: Put live market execution behind a new FTX `/execute` endpoint instead of making Ribbot call `/swap` and a signing endpoint separately.
  Rationale: A single FTX-owned endpoint can re-check the stored Privy wallet, build a fresh swap, sign the Privy request, and submit `signAndSendTransaction` without exposing transaction payloads or signer state to Ribbot. Ribbot only stores the returned signature and metadata.
  Date/Author: 2026-07-04 / Codex

- Decision: Put live withdrawal execution behind FTX `/withdrawals/execute` and require a second Telegram Send callback.
  Rationale: Withdrawals are direct fund movement, so Ribbot should stage and validate first, then only ask FTX to build/sign/send after an explicit user tap and the same live gates used for market execution. Ribbot stores only signature metadata.
  Date/Author: 2026-07-04 / Codex

- Decision: Label PNL as estimated until confirmed balance/indexer data is available. Milestone 41 supersedes this for proven wallet-level asset deltas only; USD PNL remains estimated.
  Rationale: At this decision point FTX could record execution-time quote amounts and live balances but did not reconcile confirmed chain history. Milestone 41 later added bounded wallet-balance-flow indexing, while decoded DEX-route fills, historical USD valuation, and realized/FIFO tax lots remain unavailable and must not be overstated.
  Date/Author: 2026-07-04 / Codex

- Decision: Implement FTX-side bot-access revocation before true Privy signer removal.
  Rationale: The current FTX control page has a short-lived session but no Privy-authenticated user login/export surface. Setting `botAccessRevokedAt` in account storage and checking it in live swap/withdrawal execution immediately enforces user revocation inside FTX without exposing private keys or pretending a real Privy signer was removed.
  Date/Author: 2026-07-04 / Codex

- Decision: Keep token safety FTX-routed and review-only.
  Rationale: Mint authority, freeze authority, supply, and price-availability signals help users inspect pasted tokens before buying, but they should not mutate preferences, block user actions automatically, or trigger any sell/buy path until a fuller risk-policy system exists in FTX.
  Date/Author: 2026-07-04 / Codex

- Decision: Add `/scan` as the richer pre-trade market-risk surface while keeping `/safety` focused on mint authority and price signals.
  Rationale: Users need a Trojan-style pre-buy scan that includes market-cap and route/liquidity information, but `/safety` was already documented as a mint/freeze authority review. Keeping both commands avoids surprising existing flows and gives future sniper/auto-buy execution gates a reusable FTX risk-review endpoint.
  Date/Author: 2026-07-04 / Codex

- Decision: Keep execution disabled unless both `RIBBOT_TRADING_ENABLED=true` and `RIBBOT_TRADING_DRY_RUN=false` are set.
  Rationale: Telegram commands can be mis-tapped or replayed. Requiring two explicit switches makes accidental live sends less likely during development.
  Date/Author: 2026-07-04 / Codex

- Decision: Support `/wallet <solana address>` as a quote-only development path while Privy credentials are absent.
  Rationale: This allows FrogX quote previews to be tested without creating wallets, exposing keys, or granting Ribbot signing authority. It is explicitly not an execution wallet.
  Date/Author: 2026-07-04 / Codex

- Decision: Stage limit, stop-loss, trailing-stop, and DCA orders locally only after FTX validates the order definition.
  Rationale: This preserves the FTX control-plane boundary while allowing the Telegram UX and state model to mature before live scheduling, price polling, peak tracking, or signer policy execution exists.
  Date/Author: 2026-07-04 / Codex

- Decision: Stage withdrawal tickets locally only after FTX validates the destination, asset, and base-unit amount.
  Rationale: Withdrawals are wallet-management operations, not swaps. They need a stricter FTX-owned validation and later signer-policy path before any live transfer can be allowed.
  Date/Author: 2026-07-04 / Codex

- Decision: Stage copytrade and sniper configs in FTX only after FTX validates max-buy and liquidity filters.
  Rationale: These are high-risk automation modules. FTX must own the durable automation state because future monitors, signing policy, and execution gates live there; Ribbot should keep only a non-secret cache for Telegram rendering.
  Date/Author: 2026-07-04 / Codex

- Decision: Validate settings, watchlists, and hidden-token lists through FTX before local mutation, but keep the storage local for now.
  Rationale: It preserves the control-plane boundary AKLO requested while avoiding premature server-side account storage before the FTX control page and auth model exist.
  Date/Author: 2026-07-04 / Codex

- Decision: Add FTX Durable Object account storage before live execution.
  Rationale: Trojan-style recovery, control-page management, PNL, and signer revocation need a server-side account record. The store remains non-custodial: no private keys, Privy secrets, signer keys, or policy secrets are written to account state.
  Date/Author: 2026-07-04 / Codex

## Outcomes & Retrospective

The initial milestone gives Ribbot a trading mode that can be turned on with `TG_TRADER=true`. It intercepts trading commands before the Eliza message generator, shows a main menu, records non-secret per-user preferences locally, parses Solana mint addresses, and displays dry-run buy/sell controls.

Validation for this milestone passed with `corepack pnpm --filter @elizaos/client-telegram run build` on 2026-07-04. The build completed successfully, with the repo's existing engine warning that it expects Node 23.3.0 while this Mini shell is running Node 22.17.1.

The second milestone has code-level support for FTX-routed wallet provisioning and FrogX quote previews. `/wallet` calls `FROGX_API_BASE_URL/api/frogx/trading-bot/wallet`; FTX looks up or creates the Privy Telegram user and Solana wallet when Worker secrets are configured. `/wallet <solana address>` also routes through FTX and links an external quote-only wallet for development. `/buy <mint> <SOL>` fetches a FrogX quote when a wallet address is available, then still refuses to send a transaction unless later execution gates are implemented. This milestone is build-verified but not live-verified against Privy or Telegram because no credentials were read or used.

The third milestone adds short-lived pending buy order tickets. `/buy <mint> <SOL>` now records a non-secret pending order with FTX route details and renders Confirm/Cancel buttons. Confirming while Ribbot is disabled or dry-run records a dry-run confirmation only. Confirming with `RIBBOT_TRADING_ENABLED=true`, `RIBBOT_TRADING_DRY_RUN=false`, and `RIBBOT_FTX_API_TOKEN` set calls FTX `/api/frogx/trading-bot/swap` to build a fresh swap transaction, then stops before signing or broadcasting. This is build-verified and Worker-test-verified, but not live-verified in Telegram.

The fourth milestone adds FTX-routed position lookup and sell tickets. `/positions` calls FTX `/api/frogx/trading-bot/positions` and displays SOL plus SPL balances. `/sell <mint> <percent>` refreshes positions, converts the selected percentage into token base units with integer math, fetches a FrogX quote from token to SOL, then creates a normal Confirm/Cancel order ticket. This is build-verified and Worker-test-verified, but not live-verified in Telegram.

The fifth milestone adds staged limit, stop-loss, trailing-stop, and DCA tickets. `/limit buy <mint> <SOL> below <price>` and `/limit sell <mint> <percent> above <price>` call FTX order validation/storage; sell-side automation first refreshes FTX positions and refuses to guess balances. `/stop <mint> <percent> below <price>` stages a protective stop-loss sell, `/trailing <mint> <sell percent> <trail percent>` stages a trailing stop sell, and `/dca buy <mint> <total SOL> <orders> <interval minutes>` stages DCA through the same FTX boundary. Accepted definitions are persisted in `TradingBotAccountStore` as non-secret staged metadata, Ribbot syncs `/orders` from FTX and caches the returned order IDs locally, and cancellation calls FTX before updating the cache; no scheduler, price monitor, peak tracker, swap build, signing, or broadcast starts from these commands.

The sixth milestone adds staged withdrawals. `/withdraw sol <amount SOL> <destination>` and `/withdraw <mint> <percent|all> <destination>` call FTX `/api/frogx/trading-bot/withdrawals/validate`; token withdrawals first refresh FTX positions and refuse to guess balances. Accepted definitions are stored locally as non-secret staged metadata and can be listed/cancelled with `/withdrawals`; no transfer transaction is built, signed, broadcast, or scheduled.

The seventh milestone adds staged copytrade and sniper configs. `/copytrade add <target wallet> <max SOL per buy> <min liquidity USD> [max market cap USD] [copy-sells]` calls FTX `/api/frogx/trading-bot/copytrade`. `/sniper add <any|pump|raydium|moonshot> <max SOL per snipe> <min liquidity USD> <max snipes> [max market cap USD]` calls FTX `/api/frogx/trading-bot/sniper`. Accepted configs are stored in FTX as non-secret staged metadata and synced into Ribbot's local cache for rendering; `/copytrade`, `/sniper`, and cancel buttons call FTX storage/list/cancel first. No wallet monitor, launch monitor, copied swap, sniper swap, signing, or broadcast starts from these commands.

The eighth milestone adds FTX-routed preferences. `/settings slippage|priority|defaultbuy|confirm|mev|autobuy|autosell ...`, `/watch <mint>`, `/watchlist add|remove <mint>`, `/hide <mint>`, `/unhide <mint>`, and `/hidden` call FTX `/api/frogx/trading-bot/preferences/validate` before Ribbot updates local non-secret preference state.

The ninth milestone adds FTX account-state storage and Ribbot sync. FTX `TradingBotAccountStore` stores non-secret wallet metadata, settings, watchlists, hidden-token lists, and account events behind the Ribbot bearer token. Ribbot reads FTX-returned account snapshots from preference/wallet responses and `/api/frogx/trading-bot/account`, then treats local `.state` as a cache. No private key, Privy app secret, signer key, or policy secret is stored in Ribbot or the account snapshot.

The tenth milestone adds the first FTX-owned browser control page. Ribbot `/control` shows a code, Telegram ID, and prefilled FTX `/ribbot` URL. The FTX page exchanges the code through `/api/frogx/trading-bot/control/session`, receives a short-lived session token, displays non-secret account state, and updates settings/watchlist/hidden-token preferences through `/api/frogx/trading-bot/control/preferences`. Claim, export, and revoke remain disabled placeholders; no key material, Privy app secret, signer secret, transaction signing, broadcast, or trade execution is exposed by this milestone. Verification passed with the FTX API test suite, FTX Next.js production build, Ribbot Telegram client build, and FTX Worker dry-run.

The eleventh milestone adds the first live market-execution boundary. Ribbot no longer treats live confirmation as "build only"; when `RIBBOT_TRADING_ENABLED=true` and `RIBBOT_TRADING_DRY_RUN=false`, it calls FTX `/api/frogx/trading-bot/execute` with the pending order ID and normalized swap details. FTX refuses execution unless `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, the Durable Object account is a Privy-managed wallet matching the request public key, and Privy signer credentials are configured. When those gates pass, FTX builds a fresh FrogX swap and submits Privy Solana `signAndSendTransaction`; Ribbot stores only the signature, Privy transaction ID, reference ID, and Solscan URL. This is unit-test and build verified with mocked Privy, but not live-verified against Privy or Solana.

The twelfth milestone adds the first live withdrawal-execution boundary. `/withdraw ...` still stages a validated ticket first, but the ticket now includes a Send callback. In dry-run mode the callback records no transfer. In live mode Ribbot calls FTX `/api/frogx/trading-bot/withdrawals/execute`; FTX refuses execution unless the live gate, Solana RPC, Durable Object account, Privy-managed wallet match, and Privy signer credentials are present. FTX builds the SOL or SPL transfer transaction and submits Privy Solana `signAndSendTransaction`; Ribbot stores only signature metadata. This is unit-test and build verified with mocked RPC/Privy, but not live-verified against Privy or Solana.

The thirteenth milestone adds estimated PNL cards. FTX appends non-secret account events after successful swap and withdrawal Privy sends, then `/api/frogx/trading-bot/pnl` reads those events, current wallet balances, and Jupiter Price V3 prices to compute estimated portfolio value, cost basis, unrealized PNL, top positions, recent execution count, and warnings. Ribbot `/pnl` renders the compact Telegram card. This is Worker-test and Ribbot-build verified with mocked RPC/Jupiter data, but not live-verified against production account events.

The fourteenth milestone adds safe wallet-control actions to the FTX `/ribbot` page. The page now enables Claim, Export, and Revoke for FTX-managed Privy wallets. Claim and Export record non-secret handoff timestamps and explain that the user must finish those flows through a Privy-secured app; no key material is returned to the browser control session. Revoke records `botAccessRevokedAt` in FTX account storage, and FTX live swap/withdrawal execution checks that timestamp before swap building, transfer building, RPC reads, or Privy signing. This historical placeholder milestone is superseded by milestone 37's authenticated Privy controls.

The fifteenth milestone adds token-cleanup review. FTX exposes `/api/frogx/trading-bot/token-cleanup/review`, which reads live SPL balances, merges server/local hidden-token preferences, prices tokens through Jupiter Price V3 when available, and classifies zero, dust, unpriced, or already hidden positions. Ribbot `/cleanup` renders those candidates and offers inline Hide or Sell actions; Hide still goes through FTX preference validation, and Sell stages the existing confirmed sell ticket. No cleanup action runs automatically from the review response.

The sixteenth milestone adds FTX-owned staged order persistence. FTX exposes `/api/frogx/trading-bot/orders` for POST storage and GET listing, plus `/api/frogx/trading-bot/orders/cancel` for cancellation. The stored records live in `TradingBotAccountStore` and include only non-secret order metadata, validation warnings, wallet address, and timestamps. Ribbot calls the storage endpoint for new `/limit`, `/stop`, `/trailing`, and `/dca` tickets, syncs `/orders` from FTX before rendering, and uses the FTX order ID for cancel callbacks. This is code/test/build verified, but it is not the live scheduler: no price monitor, peak tracker, DCA timer, swap build, signing, or broadcast consumes these records yet.

The seventeenth milestone adds the first FTX scheduled-order runner. The FTX Worker scheduled handler calls `runTradingBotScheduledOrders`, which is inert unless `TRADING_BOT_SCHEDULER_ENABLED=true`. When enabled, it scans the global staged-order registry, evaluates limit and stop triggers with Jupiter Price V3 USD prices, updates trailing-stop peaks, advances DCA `nextRunAt` state, and records non-secret trigger events. If `TRADING_BOT_SCHEDULER_LIVE_EXECUTION_ENABLED=true`, it attempts execution through the existing FTX `/execute` path, which still requires the normal live execution flag, stored Privy wallet match, no bot-access revocation, and Privy signer credentials. This is code/test/dry-run verified, but live scheduled execution has not been verified against real Privy/Solana credentials.

The eighteenth milestone adds FTX-owned auto-buy and auto-sell rule storage. `/autobuy add <mint> <max SOL per buy> <min liquidity USD> [max market cap USD]` calls FTX `/api/frogx/trading-bot/auto-buy`; `/autosell add <mint> <sell percent> [above|below <price>]` calls FTX `/api/frogx/trading-bot/auto-sell`. Accepted rules are stored in the FTX global automation registry as non-secret metadata and synced into Ribbot's local cache for rendering; `/autobuy`, `/autosell`, and cancel buttons call FTX list/cancel first. This is Worker-test and Ribbot-build verified. It is not a live automation engine: no auto-buy/auto-sell swap build, signing, broadcast, or scheduler consumes these records yet.

The nineteenth milestone adds FTX-side auto-buy and auto-sell monitor checks. With `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true` plus `TRADING_BOT_AUTO_BUY_MONITOR_ENABLED=true`, FTX cron records checked token price state for stored auto-buy rules. With `TRADING_BOT_AUTO_SELL_MONITOR_ENABLED=true`, FTX cron observes configured Jupiter Price V3 trigger crossings and records non-secret dry-run trigger state/events. By default this is observe-only. Triggered auto-buy execution requires `TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED=true` plus base live execution, account opt-in, RPC SOL balance/token safety, market-risk quote probing, wallet/revocation checks, and Privy signer config. Triggered auto-sell execution requires `TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED=true` plus base live execution, account opt-in, RPC positions, wallet/revocation checks, and Privy signer config.

The twentieth milestone adds token-safety review. FTX exposes `/api/frogx/trading-bot/token-safety`, requiring the Ribbot bearer token and Solana RPC, then reads the SPL mint account with `getAccountInfo` using `jsonParsed` encoding, prices the token through Jupiter Price V3 when available, and returns a low/medium/high risk score plus flags for mint authority, freeze authority, initialization, supply, owner program, and price availability. Ribbot renders this through `/safety`, `/safe`, `/risk`, `/rugcheck`, and the Safety button on pasted token cards. This milestone is review-only: no preferences are changed, no hidden-token list is updated, and no trade is built, signed, or broadcast.

The twenty-first milestone adds market-risk scans. FTX exposes `/api/frogx/trading-bot/market-risk`, requiring the Ribbot bearer token and Solana RPC, then reuses token-safety, estimates market cap from SPL supply and Jupiter Price V3, fetches SOL pricing, and optionally runs a Titan quote probe from SOL to the token. The probe is explicit about its limits: without Titan credentials it reports `not_configured`, and even when configured it is a quote/liquidity probe rather than a full on-chain liquidity proof. Ribbot renders this through `/scan`, `/market`, `/liquidity`, and pasted-token Scan buttons. This milestone is review-only and does not mutate preferences, build swaps, sign, broadcast, or schedule anything.

The twenty-second milestone threads market-risk warnings into auto-buy staging. FTX auto-buy validation and storage now append market-risk review context when Solana RPC is configured, including token-safety, estimated market-cap, and quote/liquidity-probe warnings. Ribbot receives those warnings through the existing auto-buy storage response and renders them with the staged rule confirmation. This is still staging only: no monitor, swap build, signing, broadcast, or scheduler consumes the rule.

The twenty-third milestone adds staged bundle-buy baskets. `/bundle add <mint> <SOL> <mint> <SOL> <min liquidity USD> [max market cap USD]` calls FTX `/api/frogx/trading-bot/bundle-buy`, and `/bundle` plus cancel buttons sync from FTX. FTX stores the basket items, per-token buy caps, shared liquidity filter, optional market-cap filter, slippage, priority fee, validation warnings, and timestamps as non-secret metadata. This is not live bundle execution: no quote fanout, swap build, signing, broadcast, monitor, or scheduler consumes the basket.

The twenty-fourth milestone adds referral and reward hooks. `/referral` and `/rewards` fetch the user's FTX-owned referral code, referred-user count, and tracking warnings from `/api/frogx/trading-bot/referrals`; `/referral <code>` and `/start <code>` apply an invite code through the same FTX endpoint. Ribbot caches only the returned non-secret summary. This is not a rewards payout system: no fee share, token payout, claimable balance, signing, transfer, or on-chain claim state is created.

The twenty-fifth milestone adds account activity history. `/activity`, `/history`, `/trades`, and `/events` call FTX `/api/frogx/trading-bot/activity`, which reads recent `TradingBotAccountStore` events and returns summary counts plus non-secret event metadata. Ribbot renders those rows as Telegram history. The feed is read-only: no Telegram notifications are sent, and no preferences, swaps, signatures, broadcasts, or transfers are created.

The twenty-sixth milestone adds a Telegram account dashboard. `/account`, `/status`, and `/sync` call FTX `/api/frogx/trading-bot/account` and refresh Ribbot's non-secret cache from the FTX account snapshot. The reply shows wallet source, bot-access revocation state, claim/export handoff status, settings, watchlist/hidden-token counts, referral code, and cache timestamps. `/control` and `/manage` remain the browser control-code commands. The dashboard is read-only and never reads keys, signs, broadcasts, or trades.

The twenty-seventh milestone adds the first advanced automation execution path, still owned entirely by FTX. Triggered auto-sell rules can now execute from the FTX advanced monitor only when `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_SELL_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, the account has `autoSellEnabled=true`, RPC positions resolve a sellable balance, and the existing Privy wallet, signer, and bot-access checks pass. Ribbot only renders `advanced_automation_config_executed` activity rows and keeps local state non-secret. This is code/test verified with mocked RPC and Privy; no live Privy/Solana dry run has been approved or run.

The twenty-eighth milestone adds FTX-owned live auto-buy readiness. Triggered auto-buy rules can now execute from the FTX advanced monitor only when `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_BUY_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, the account has `autoBuyEnabled=true`, RPC positions show enough SOL, token-safety and market-risk quote-probe checks pass, and the existing Privy wallet, signer, and bot-access checks pass. Ribbot only renders `advanced_automation_config_executed` activity rows and keeps local state non-secret. This is code/test verified with mocked RPC, Titan quote probing, and Privy; no live Privy/Solana dry run has been approved or run.

The twenty-ninth milestone adds FTX-owned live copytrade readiness. Stored copytrade configs remain standing target-wallet follows; when FTX observes a new target signature, it can execute only if `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_COPYTRADE_MONITOR_ENABLED=true`, `TRADING_BOT_COPYTRADE_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, the parsed target transaction resolves to a simple SOL/SPL buy or sell, copied buys pass RPC SOL balance plus token-safety/market-risk quote probing, copied sells have `copySells=true` and a sellable local token balance, and the existing Privy wallet, signer, and bot-access checks pass. Ribbot only renders `advanced_automation_config_executed` activity rows and keeps local state non-secret. This is code/test verified with mocked RPC, Titan quote probing, and Privy; no live Privy/Solana dry run has been approved or run.

The thirtieth milestone hardens FTX-owned live scheduled execution. Triggered limit, stop-loss, trailing-stop, and DCA orders are atomically claimed in the global Durable Object before FTX calls `/execute`; every run has a unique execution ID, every Privy POST carries a signed idempotency key, and every DCA success advances exactly one slice. Missing dependencies leave the order staged, competing claims do nothing, successful runs persist non-secret transaction metadata, definite failures become `failed`, and ambiguous responses remain `executing` rather than being replayed. Ribbot `/orders` now shows lifecycle state and DCA progress and will not mutate its cache when FTX cannot confirm cancellation. This is code/test/build verified with mocked Privy; live Privy/Solana/Telegram verification remains pending explicit approval.

The thirty-first milestone adds FTX-owned scheduled-order reconciliation. The scheduler scans durable `executing` attempts after `TRADING_BOT_SCHEDULER_RECONCILE_AFTER_SECONDS`, looks up Privy transactions by the pre-persisted reference ID, validates the returned wallet and Solana chain, and resolves confirmed/finalized sends or terminal Privy failures without calling wallet RPC or resending. Pending, broadcasted, not-found, and lookup-error results remain visible as `executing`; stale updates are rejected unless the stored status and execution ID still match. Ribbot `/orders` renders reconciliation state and `/activity` labels required/resolved events. This is code/test/typecheck verified with mocked Privy; persistent not-found/error alerting and live verification remain pending.

The thirty-second milestone begins the broader FTX web-app revamp with `/profile`. The old centered card stack showed placeholder identity data, fabricated wallet-derived points/rank, and badges as permanently earned even while disconnected. The rebuilt page uses the real connected wallet and Tapestry response as its only account-data sources, makes the owned Frog collection the primary content, preserves profile-frog selection, derives milestone states from explicit trade/Frog/follower thresholds, and provides dedicated disconnected, loading, error, and profile-creation states. Desktop and mobile browser fixtures use local mocked data only; no wallet, Tapestry, RPC, or deployment action was performed.

The thirty-third milestone hardens direct market swaps and withdrawals against ambiguous Privy responses. FTX now returns a deterministic reconciliation reference instead of claiming an uncertain send did not broadcast, and exposes authenticated read-only status endpoints that validate the stored Privy wallet and Solana chain before resolving confirmed/finalized, terminal failure, pending, or not-found state. Ribbot locks unresolved tickets against confirmation/cancellation, offers Check Status callbacks, recovers them through `/orders` and `/withdrawals`, and treats malformed or unrecognized FTX execution bodies as failures rather than success. Reconciliation records deterministic account-event IDs and never repeats wallet RPC. This is code/test/build verified only; live Privy/Solana/Telegram verification and bounded-age operator handling for persistent not-found/error states remain pending.

The thirty-fourth milestone hardens user-triggered bundle execution. FTX atomically transitions a staged basket to `executing` before the first item, writes attempted/confirmed counts around each item, and derives a deterministic reference for every sequence position. Ambiguous sends stay locked for `/api/frogx/trading-bot/bundle-buy/status`, which checks only attempted Privy references and never calls wallet RPC. Fully confirmed baskets become `executed`; terminal or confirmed partial baskets become `failed`, with no automatic resume. Ribbot syncs that state after restart, renders progress and Check Status, and rejects replay/cancel paths for unresolved baskets. This is mocked code/test/build verified only; live Privy/Solana/Telegram verification remains approval-gated.

The thirty-fifth milestone closes the remaining advanced-monitor replay gap. Copytrade, auto-buy, and auto-sell now win an atomic `staged -> executing` claim and persist a deterministic execution ID/reference before FTX can call Privy. Ambiguous sends are never returned to the trigger scanner; cron reconciliation performs Privy GET only, validates wallet/chain, and rejects stale execution-ID writes. Confirmed or terminal one-shot auto rules become `executed` or `failed`; standing copytrade returns to `staged` only after terminal resolution while retaining the consumed target signature. Reconciled terminal events use deterministic IDs and confirmed swaps feed activity/estimated PNL. Ribbot renders executing/failed/executed monitor details and never locally cancels locked state. This is mocked code/test/typecheck/build verified only; live verification and bounded-age operator policy remain approval-gated.

The thirty-sixth milestone makes advanced reconciliation user-triggerable without weakening the replay boundary. Authenticated `/copytrade/status`, `/auto-buy/status`, and `/auto-sell/status` endpoints load one FTX-owned config and run the existing Privy GET-only reconciliation after the race window; they never call `/execute` or wallet RPC. Ribbot exposes Check Status for executing configs, syncs the returned authoritative lifecycle, and offers Check Again only while unresolved. Mock tests prove the route/body contract, pending handling, terminal auto and standing-copytrade outcomes, safety-window behavior, and GET-only Privy access. No deploy, Telegram send, Privy POST, or on-chain transaction occurred.

The thirty-seventh milestone implements bot-first Privy account ownership controls. The Telegram `/control` button is a `login_url`, while the FTX page mounts Privy only when a public app ID exists and sets Solana `createOnLogin` to `off`. Export, signer removal, and restoration are unavailable until authenticated Privy user ID, Telegram user ID, and FTX wallet address all match. Export stays inside Privy's isolated modal; signer removal is confirmed and followed by FTX pause; restoration adds only configured signer/policy IDs before clearing that pause. The FTX control route records non-secret restore state/events. Code tests cover every identity mismatch and signer operation, but real Dashboard/domain setup and wallet actions remain gated by `plans/privy-account-control-live-checklist.md`.

The thirty-eighth milestone implements the code-level sniper path without enabling it. FTX's advanced cron reads Jupiter Tokens V2 recent first pools only when the advanced/sniper monitor flags and `JUPITER_API_KEY` are present. The first poll records a no-trade baseline; later polls advance a durable cursor, deduplicate mints, match configured launch sources, enforce cooldown and max-snipes, and reject unsafe authority/liquidity/market-cap candidates. An eligible buy is atomically claimed and must pass account `sniperEnabled`, SOL balance, FTX market-risk/Titan quote probing, the separate sniper/base live gates, matching managed wallet, revocation, and Privy signer checks before the existing `/execute` boundary can send. Ambiguous attempts stay locked for GET-only `/sniper/status` reconciliation and never resend. Ribbot renders launch and execution metadata and keeps all secret/signing state in FTX. Mocked tests pass; live Jupiter classification, Privy, Telegram, and Solana verification remain approval-gated.

## Context and Orientation

The repository is `ribbot`, an Eliza-based TypeScript agent. The Telegram integration lives in `packages/client-telegram/src`. `telegramClient.ts` creates a Telegraf bot and passes every message into `MessageManager`, which handles character memory and LLM replies. The new trading module lives in `packages/client-telegram/src/trading`. It is intentionally separate from `MessageManager` so trading commands remain deterministic and auditable instead of being generated by the language model.

Frog Trading Exchange, also called FTX or FrogX in this workspace, is a sibling repo at `../ftx`. Its Cloudflare Worker exposes the trading-bot config/account/activity/control/wallet/positions/PNL/risk/swap/execute/order/withdrawal/referral/preference routes plus copytrade, sniper, auto-buy, bundle-buy, and auto-sell validation/storage/cancel/status routes. `/api/frogx/trading-bot/sniper/status` is part of the GET-only advanced reconciliation boundary. Those endpoints make FTX the backend authority for account recovery, wallet provisioning, quotes, positions, risk, automation state, gated Privy execution, and reconciliation. Privy is wallet infrastructure inside FTX: it associates a Telegram ID with a Privy user and Solana wallet and can submit approved market, withdrawal, and automation transactions under FTX-owned policies. Ribbot holds only non-secret cache and returned metadata.

## Plan of Work

Milestone 1 creates a Telegram trading shell. Add a trading router that recognizes `/start`, `/menu`, `/wallet`, `/buy`, `/sell`, `/positions`, `/orders`, `/watchlist`, `/settings`, `/copytrade`, `/sniper`, `/autobuy`, `/autosell`, and pasted Solana mint addresses. The router should reply with inline-keyboard menus and dry-run execution messages. It should persist only non-secret local user state: Telegram user ID, username, settings, watchlist mints, and optional future Privy wallet metadata.

Milestone 2 adds FTX-routed Privy provisioning. When a user taps `/wallet`, Ribbot should call FTX/FrogX, and FTX should create or fetch a Privy user linked to the Telegram user ID and create a Solana wallet owned by that user. Ribbot stores the Privy user ID, wallet ID, and wallet address locally, never any private key or Privy app credential. If signer credentials are missing in FTX, wallet creation can still happen, but execution remains disabled.

Milestone 3 connects FrogX quotes. When a user pastes a token mint or runs `/buy <mint> <amount>`, Ribbot calls the FrogX quote endpoint with the user's wallet address, SOL input mint, target output mint, amount in lamports, slippage, and priority fee settings. The bot presents the output amount, route, price impact, and confirmation buttons.

Milestone 4 executes market buys and sells. Ribbot requests a fresh swap transaction from FrogX through FTX, sends it through Privy Solana `signAndSendTransaction` inside the FTX control plane, records the signature, and sends a Solscan link. Confirm-trades must default on. Live execution requires explicit env switches, signer authorization, Privy policies, and a successful dry-run quote/swap validation.

Milestone 5 adds order automation. Build a scheduler that stores limit, stop-loss, trailing-stop, and DCA orders. It polls price/liquidity sources, simulates triggers, and executes only when order conditions, wallet balance, slippage, and policy checks pass.

Milestone 6 adds Trojan-style advanced modules: copy trading, snipers, auto buy, bundle buys, auto sell, watchlists, PNL cards, withdrawals, hidden tokens, token cleanup, and referral/reward hooks. These should remain opt-in and should include safety copy in the UI because automated trading can lose funds quickly.

## Concrete Steps

From `/Users/llphant/projects/solanaBFS/ribbot`, run:

    pnpm --filter @elizaos/client-telegram run build

To test the dry-run Telegram shell locally, configure a Telegram bot token and start Ribbot with:

    TG_TRADER=true RIBBOT_TRADING_DRY_RUN=true pnpm start --characters characters/ribbot.character.json

Then send `/start`, `/wallet`, `/settings`, and a Solana mint address to the bot. The expected behavior is that Ribbot replies with deterministic trading menus and does not generate a character response for those command messages.

To test quote previews without managed wallet provisioning, link a quote-only wallet through FTX/FrogX and run a buy preview:

    /wallet <your-public-solana-address>
    /buy <token-mint> 0.01

The expected behavior is that Ribbot calls `FROGX_API_BASE_URL/api/frogx/quotes`, displays raw estimated output units, price impact, route, executability, and a dry-run no-send message.

To test the pending order flow, run:

    /buy <token-mint> 0.01

The expected behavior is that Ribbot creates an order ticket with Confirm and Cancel buttons. In dry-run mode, Confirm records a dry-run confirmation only. With live build gates enabled and `RIBBOT_FTX_API_TOKEN` configured, Confirm calls FTX `/api/frogx/trading-bot/swap` and reports that the swap payload was built, without signing or broadcasting.

To test positions and percentage sells, configure FTX `SOLANA_RPC_URL`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /positions
    /sell <token-mint> 25

The expected behavior is that Ribbot displays FTX-reported wallet balances, then creates a sell ticket only if the mint exists in that position snapshot.

To test PNL cards, configure FTX `TRADING_BOT_ACCOUNTS`, `SOLANA_RPC_URL`, optional `JUPITER_API_KEY`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /pnl

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/pnl`, displays estimated portfolio value, cost basis, unrealized PNL, top positions, execution count, and warning lines when price or execution history is incomplete.

To test account activity history, configure FTX `TRADING_BOT_ACCOUNTS`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /activity
    /history

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/activity`, displays recent non-secret account events, and shows read-only warnings. The command must not sign, broadcast, mutate preferences, create orders, send Telegram notifications, or execute transfers.

To test the account dashboard, configure FTX `TRADING_BOT_ACCOUNTS`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /account
    /status
    /sync

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/account`, refreshes its non-secret local cache, and displays wallet source, bot-access status, claim/export handoff status, settings, saved-list counts, referral code, and timestamps. `/control` and `/manage` should still issue browser control codes. The account dashboard must not read keys, sign, broadcast, mutate preferences, stage orders, send Telegram notifications, or execute trades/transfers.

To test token cleanup review, configure FTX `SOLANA_RPC_URL`, optional `JUPITER_API_KEY`, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet with SPL balances, then run:

    /cleanup

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/token-cleanup/review`, displays dust/hidden/unpriced candidates, and shows per-candidate Hide/Sell buttons. Hide calls FTX preference validation before updating hidden-token state. Sell stages the existing `/sell <mint> 100` confirmation ticket; no review response should directly sell or hide anything.

To test token safety review, configure FTX `SOLANA_RPC_URL`, optional `JUPITER_API_KEY`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /safety <token-mint>
    /risk <token-mint>

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/token-safety`, displays the token's low/medium/high risk score, mint authority, freeze authority, raw supply, price, and warning flags. The response must not hide a token, stage a trade, build a swap, sign, or broadcast.

To test market-risk scan, configure FTX `SOLANA_RPC_URL`, optional `JUPITER_API_KEY`, optional Titan quote credentials, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /scan <token-mint>
    /liquidity <token-mint> 0.1

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/market-risk`, displays risk score, estimated market cap, SOL price, quote/liquidity probe status, and warning flags. If Titan is not configured, the card should explicitly say the liquidity probe is missing quote config; it must not use a mock quote as proof of liquidity and must not hide, stage, build, sign, or broadcast anything.

To test staged order storage, configure FTX `TRADING_BOT_ACCOUNTS`, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet, then run:

    /limit buy <token-mint> 0.1 below 0.0125
    /limit sell <token-mint> 25 above 0.02
    /stop <token-mint> 50 below 0.008
    /trailing <token-mint> 50 12.5
    /dca buy <token-mint> 1 5 30
    /orders

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/orders` for storage, syncs `/orders` from FTX account storage, and calls `/api/frogx/trading-bot/orders/cancel` before updating the local cache. Stop-loss and trailing-stop commands must resolve sell amount from FTX positions before storage. No scheduler, price monitor, peak tracker, swap build, signing, or broadcast starts from these commands.

To test staged withdrawal validation, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet, then run:

    /withdraw sol 0.05 <destination-address>
    /withdraw <token-mint> 25 <destination-address>
    /withdraw <token-mint> all <destination-address>
    /withdrawals

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/withdrawals/validate`, stores accepted non-secret staged metadata, lists the staged tickets, and can cancel them. In dry-run mode, Send records no transfer. With live gates enabled, Send calls FTX `/api/frogx/trading-bot/withdrawals/execute`; FTX builds/signs/sends through Privy and Ribbot records only the returned signature metadata.

To test staged copytrade and sniper config storage, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet, then run:

    /copytrade add <target-wallet> 0.1 1000
    /copytrade
    /sniper add pump 0.05 2500 3
    /sniper

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/copytrade` or `/api/frogx/trading-bot/sniper`, FTX stores accepted non-secret staged metadata, Ribbot lists the FTX-synced staged configs, and cancel buttons call the matching FTX cancel endpoint. No monitor, swap build, signing, broadcast, or scheduling starts from these commands.

To test staged auto-buy and auto-sell rule storage, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet, then run:

    /autobuy add <token-mint> 0.1 1000
    /autobuy
    /autosell add <token-mint> 50 above 0.02
    /autosell

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/auto-buy` or `/api/frogx/trading-bot/auto-sell`, FTX stores accepted non-secret staged metadata, Ribbot lists the FTX-synced staged rules, and cancel buttons call the matching FTX cancel endpoint. When FTX Solana RPC is configured, auto-buy storage may include market-risk warnings in the response and Ribbot should render them. No auto-buy/auto-sell swap build, signing, broadcast, or scheduling starts from these commands; monitor checks only run from FTX cron when explicit FTX monitor flags are enabled. Triggered auto-buy and auto-sell execution is FTX-only and additionally requires the per-kind live execution gate, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, matching account opt-in, RPC/risk checks, and Privy signer readiness.

To test FTX-gated live copytrade readiness without using real funds, keep this in mocked/unit-test form unless AKLO approves a private live run. A real private run would require:

    /copytrade add <target-wallet> 0.1 1000 copy-sells

FTX must have `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_COPYTRADE_MONITOR_ENABLED=true`, `TRADING_BOT_COPYTRADE_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, `SOLANA_RPC_URL`, Titan quote credentials for copied buys, `TRADING_BOT_ACCOUNTS`, `RIBBOT_TRADING_BOT_TOKEN`, and Privy signer secrets configured. The expected behavior is that FTX, not Ribbot, observes the target wallet, parses the target transaction into a simple SOL/SPL buy or sell intent, caps copied buys, resolves sell percentages and local token balances for copied sells, executes through `/execute` and Privy `signAndSendTransaction`, records non-secret automation execution events, and Ribbot later renders the activity row.

To test FTX-gated live auto-buy readiness without using real funds, keep this in mocked/unit-test form unless AKLO approves a private live run. A real private run would require:

    /settings autobuy on
    /autobuy add <token-mint> 0.1 1000

FTX must have `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_BUY_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, `SOLANA_RPC_URL`, Titan quote credentials, `TRADING_BOT_ACCOUNTS`, `RIBBOT_TRADING_BOT_TOKEN`, and Privy signer secrets configured. The expected behavior is that FTX, not Ribbot, checks SOL balance, token safety, market risk, and quote-probe readiness, executes through `/execute` and Privy `signAndSendTransaction`, records non-secret automation execution events, and Ribbot later renders the activity row.

To test FTX-gated live auto-sell readiness without using real funds, keep this in mocked/unit-test form unless AKLO approves a private live run. A real private run would require:

    /settings autosell on
    /autosell add <token-mint> 50 above <price>

FTX must have `TRADING_BOT_ADVANCED_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_SELL_MONITOR_ENABLED=true`, `TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, `SOLANA_RPC_URL`, `TRADING_BOT_ACCOUNTS`, `RIBBOT_TRADING_BOT_TOKEN`, and Privy signer secrets configured. The expected behavior is that FTX, not Ribbot, resolves the token balance from RPC positions, executes through `/execute` and Privy `signAndSendTransaction`, records non-secret automation execution events, and Ribbot later renders the activity row.

To test staged bundle-buy basket storage, set Ribbot `RIBBOT_FTX_API_TOKEN`, link a wallet, then run:

    /bundle add <token-mint-a> 0.05 <token-mint-b> 0.05 1000
    /bundle

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/bundle-buy`, FTX stores accepted non-secret basket metadata, Ribbot lists the FTX-synced basket, and cancel buttons call `/api/frogx/trading-bot/bundle-buy/cancel`. No bundle quote fanout, swap build, signing, broadcast, monitor, or scheduling starts from the storage command.

To test FTX-gated live bundle-buy readiness without using real funds, keep this in mocked/unit-test form unless AKLO approves a private live run. A real private run would require:

    /bundle add <token-mint-a> 0.05 <token-mint-b> 0.05 1000
    Tap Execute on the stored basket.

FTX must have `TRADING_BOT_BUNDLE_BUY_LIVE_EXECUTION_ENABLED=true`, `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`, `SOLANA_RPC_URL`, Titan quote credentials, `TRADING_BOT_ACCOUNTS`, `RIBBOT_TRADING_BOT_TOKEN`, and Privy signer secrets configured. The expected behavior is that Ribbot only sends the explicit execution request, while FTX reloads the basket/account, checks total SOL balance and every item's risk/quote probe, executes each item through `/execute` and Privy `signAndSendTransaction`, marks the basket executed, records non-secret execution events, and Ribbot renders returned signatures/activity metadata.

To test referral/reward hooks, configure FTX `TRADING_BOT_ACCOUNTS`, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /referral
    /rewards
    /referral <invite-code>
    /start <invite-code>

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/referrals`, displays the FTX-owned referral code, referred-user count, and tracking-only reward status, and applies a valid invite code once. No fee share, token payout, claimable balance, signing, transfer, or on-chain claim state is created.

To test preference validation, set Ribbot `RIBBOT_FTX_API_TOKEN`, then run:

    /settings slippage 1.5
    /settings mev on
    /watch <token-mint>
    /watchlist remove <token-mint>
    /hide <token-mint>
    /hidden

The expected behavior is that Ribbot calls FTX `/api/frogx/trading-bot/preferences/validate` before changing local settings, watchlist, or hidden-token state. When FTX account storage is bound, Ribbot syncs local state from the returned FTX account snapshot.

To test managed Privy provisioning later, set these FTX Worker secrets without printing their values:

    PRIVY_APP_ID
    PRIVY_APP_SECRET
    RIBBOT_TRADING_BOT_TOKEN

Optional signer and policy configuration for future live execution:

    PRIVY_AUTHORIZATION_KEY_ID
    PRIVY_AUTHORIZATION_PRIVATE_KEY
    PRIVY_WALLET_POLICY_IDS

Then set Ribbot's `RIBBOT_FTX_API_TOKEN` to the same bot token and send `/wallet`. The expected behavior is that Ribbot calls FTX, FTX creates or fetches the Privy user by Telegram ID, FTX creates or fetches a Solana wallet owned by that user, Ribbot stores only `privyUserId`, `privyWalletId`, and wallet address in local state, and Ribbot replies with the public wallet address.

To test the browser control-page handoff without live signing, configure FTX `RIBBOT_CONTROL_URL` to the FTX `/ribbot` route, set Ribbot `RIBBOT_FTX_API_TOKEN`, and send:

    /control

The expected behavior is that Ribbot replies with a one-time code, Telegram ID, and prefilled FTX link. Open the FTX `/ribbot` page, enter or use the prefilled Telegram ID, enter the code, and observe the stored non-secret account state. Saving settings or adding/removing watchlist and hidden-token mints should call FTX `/api/frogx/trading-bot/control/preferences`. Claim and Export should call FTX `/api/frogx/trading-bot/control/wallet`, record non-secret handoff timestamps, and never return private-key material. Revoke should call the same endpoint, set `botAccessRevokedAt`, and make future live swap or withdrawal execution return revoked before any Privy call.

## Validation and Acceptance

Milestone 1 is accepted when the TypeScript build for `@elizaos/client-telegram` passes and a trading command returns a Telegram reply without invoking the LLM path. `/wallet` must not print, read, or require any secret. Inline buttons must respond with dry-run notices. If `TG_TRADER` is false or unset, the existing message flow must be unchanged.

Milestone 2 is accepted when a Telegram user can run `/wallet` and receive a fundable Solana address associated with their Privy user. No private key or signer secret may be stored in repo files or terminal output.

Milestone 3 is accepted when a Telegram user with a wallet address can run `/buy <mint> <amount>` and receive a fresh FrogX quote with route and price-impact details, while no signing or broadcasting occurs.

Milestone 4 is accepted only after a testnet or explicitly approved mainnet dry run proves that quotes are fresh, transaction simulation succeeds, Privy signing works, and failed transactions produce clear user-facing errors without retry loops.

The current browser-control milestone is accepted when the FTX API tests pass, the FTX Next.js production build includes `/ribbot`, the Ribbot Telegram client build passes, and the Worker dry-run lists the `TRADING_BOT_ACCOUNTS` Durable Object binding. The page must only show and edit non-secret account state. Claim/export are accepted only as non-secret handoff requests, and revoke is accepted only as FTX-side bot-access blocking; real private-key export, real Privy signer removal, signing, broadcast, and trading from the page remain acceptance failures until explicitly implemented with Privy-authenticated user flows and signer policy checks.

The current execution milestone is accepted at code level when FTX API tests include the disabled-gate path, external-wallet rejection, and mocked Privy `signAndSendTransaction` success; Ribbot build passes; and the Worker dry-run passes. It is accepted at live level only after AKLO explicitly approves using real Privy credentials and a real testnet or mainnet dry run, then verifies a confirmed Solana signature and clean failure behavior.

The direct execution-reconciliation milestone is accepted at code level when mocked tests prove ambiguous swap/withdrawal sends return a deterministic reference, status checks use Privy GET only, wallet/chain mismatches fail closed, confirmed/finalized and terminal failures resolve correctly, pending/not-found remain locked, malformed Ribbot responses cannot become false successes, and package build/typecheck plus Worker dry-run pass. It is accepted at live level only after approved private execution proves a real ambiguous-or-pending transaction can be recovered without a duplicate send.

The current token-safety milestone is accepted at code level when FTX API tests cover auth enforcement, missing RPC config, a high-risk parsed mint with enabled mint/freeze authorities, and a missing mint account; Ribbot build passes with `/safety` aliases and pasted-token Safety callbacks; and the Worker dry-run still succeeds. It is accepted at live level only after a real token mint is checked through Telegram or a private bot test without exposing secrets.

The current market-risk milestone is accepted at code level when FTX API tests cover auth enforcement, missing RPC config, market-cap flags, and honest Titan quote-probe not-configured output; Ribbot build passes with `/scan` aliases and pasted-token Scan callbacks; and the Worker dry-run still succeeds. It is accepted at live level only after a real token mint is scanned through Telegram or a private bot test without exposing secrets.

The current auto-buy warning milestone is accepted at code level when FTX API tests cover auto-buy validation returning market-risk context when RPC is configured, Ribbot build passes, and the Worker dry-run still succeeds. It is accepted at live level only after a staged `/autobuy add` through a private bot test shows the FTX warning lines without enabling monitors or live execution.

The current bundle-buy milestone is accepted at code level when FTX API tests cover bundle-buy auth, duplicate-mint rejection, storage/list/cancel routing, Ribbot build passes with `/bundle`, and the Worker dry-run still succeeds. It is accepted at live level only after a private bot test stages and cancels a bundle basket without enabling bundle execution.

The current referral/reward milestone is accepted at code level when FTX API tests cover referral auth, summary routing, and apply routing; Ribbot build passes with `/referral`, `/rewards`, and `/start <code>`; and the Worker dry-run still succeeds. It is accepted at live level only after a private bot test fetches a code and applies another code without creating fee-share, payout, signing, transfer, or claimable reward state.

The current activity/history milestone is accepted at code level when FTX API tests cover activity auth and event routing, Ribbot build passes with `/activity` aliases, and the Worker dry-run still succeeds. It is accepted at live level only after a private bot test displays recent FTX account events without sending notifications or creating trades/transfers.

The current account-dashboard milestone is accepted at code level when Ribbot build passes with `/account`, `/status`, `/sync`, and Account-menu routing through `fetchTradingAccount`. It is accepted at live level only after a private bot test displays the FTX account snapshot and leaves `/control` and `/manage` as control-code handoffs without reading keys, signing, broadcasting, or trading.

The current auto-sell live-readiness milestone is accepted at code level when FTX API tests prove a triggered auto-sell can execute only through the explicit auto-sell live gate and existing Privy `/execute` path, Ribbot build passes with the automation execution activity label, and the Worker dry-run succeeds. It is accepted at live level only after AKLO approves a private bot/live dry run with real Privy credentials, a funded wallet, and a known token balance.

The current auto-buy live-readiness milestone is accepted at code level when FTX API tests prove a triggered auto-buy can execute only through the explicit auto-buy live gate, market-risk quote-probe checks, and existing Privy `/execute` path; Ribbot build passes with the automation execution activity label; and the Worker dry-run succeeds. It is accepted at live level only after AKLO approves a private bot/live dry run with real Privy credentials, Titan quotes, SOL balance, and a known target token.

The current copytrade live-readiness milestone is accepted at code level when FTX API tests prove an observed copytrade target transaction can execute only through the explicit copytrade live gate, parsed simple SOL/SPL intent checks, market-risk quote-probe checks for buys, and existing Privy `/execute` path; Ribbot build passes with the updated storage copy/activity rendering; and the Worker dry-run succeeds. It is accepted at live level only after AKLO approves a private bot/live dry run with real Privy credentials, Titan quotes, a funded wallet, and a known target wallet transaction.

The current bundle-buy live-readiness milestone is accepted at code level when FTX API tests prove a stored basket can execute only through the explicit bundle-buy live gate, base live gate, RPC SOL balance check, per-item market-risk quote-probe checks, and existing Privy `/execute` path; Ribbot build passes with Execute callbacks; and the Worker dry-run succeeds. It is accepted at live level only after AKLO approves a private bot/live dry run with real Privy credentials, Titan quotes, and a funded wallet.

## Idempotence and Recovery

The command scaffold is additive and can be disabled with `TG_TRADER=false`. Local state is stored in `.state/ribbot-trading.json`, which is ignored by git and contains no private keys. If the state file becomes corrupt, move it aside and restart the bot; users can be re-linked from Privy by Telegram ID in a later milestone.

No deploy, Telegram send, Cloudflare secret change, Privy dashboard change, or on-chain transaction should happen without AKLO's explicit approval for that specific action.

## Artifacts and Notes

Useful source references:

- `packages/client-telegram/src/telegramClient.ts` is the interception point for Telegram messages and callback queries.
- `packages/client-telegram/src/messageManager.ts` is the existing LLM-backed chat path and should remain the fallback.
- `../ftx/apps/api/src/routes.ts` exposes `/api/frogx/quotes` and `/api/frogx/swap`, which will become Ribbot's swap backend.
- `../ftx/apps/api/src/tradingBot.ts` owns Ribbot-only FTX trading-bot endpoints, including Privy wallet routing, staged orders, advanced automation config storage, and bundle-buy basket staging/execution.
- `../ftx/apps/api/src/tradingBot.ts` also owns disabled-by-default live copytrade, auto-buy, bundle-buy, and auto-sell execution through FTX gates and the existing Privy `/execute` boundary.
- `../ftx/apps/ui/src/app/ribbot/page.tsx` is the FTX browser-control page for Ribbot `/control` codes.

Validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    > @elizaos/client-telegram@0.1.7 build .../packages/client-telegram
    > tsup --format esm --dts
    ESM Build success
    DTS Build success

Second validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    > @elizaos/client-telegram@0.1.7 build .../packages/client-telegram
    > tsup --format esm --dts
    ESM Build success
    DTS Build success

Third validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    > @elizaos/client-telegram@0.1.7 build .../packages/client-telegram
    > tsup --format esm --dts
    ESM Build success
    DTS Build success

Fourth validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    > @elizaos/client-telegram@0.1.7 build .../packages/client-telegram
    > tsup --format esm --dts
    ESM Build success
    DTS Build success

Fifth validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    > @elizaos/client-telegram@0.1.7 build .../packages/client-telegram
    > tsup --format esm --dts
    ESM Build success
    DTS Build success

Control-page validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  48 passed (48)

    cd ../ftx/apps/ui && node_modules/.bin/next build
    Route (app)
    /ribbot  7.08 kB  109 kB

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Execution-boundary validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  51 passed (51)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Token-safety validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  101 passed (101)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Market-risk validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  104 passed (104)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Bundle-buy validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  111 passed (111)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Referral/reward validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  114 passed (114)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Activity/history validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  116 passed (116)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Account-dashboard validation transcript:

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

Auto-sell live-readiness validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  117 passed (117)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    Vars: TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED: "false"
    --dry-run: exiting now.

Auto-buy live-readiness validation transcript:

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  118 passed (118)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    Vars: TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED: "false"
    Vars: TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED: "false"
    --dry-run: exiting now.

Scheduled-order hardening validation transcript (2026-07-10):

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  127 passed (127)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd packages/client-telegram && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    Vars: TRADING_BOT_SCHEDULER_ENABLED: "false"
    Vars: TRADING_BOT_SCHEDULER_LIVE_EXECUTION_ENABLED: "false"
    --dry-run: exiting now.

Scheduled-order reconciliation validation transcript (2026-07-10):

    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  138 passed (138)

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd packages/client-telegram && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
    Vars: TRADING_BOT_SCHEDULER_ENABLED: "false"
    Vars: TRADING_BOT_SCHEDULER_LIVE_EXECUTION_ENABLED: "false"
    Vars: TRADING_BOT_SCHEDULER_RECONCILE_AFTER_SECONDS: "60"
    --dry-run: exiting now.

FTX profile revamp validation transcript (2026-07-10):

    cd ../ftx/apps/ui && node_modules/.bin/vitest run
    Test Files  3 passed (3)
    Tests  9 passed (9)

    node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    node_modules/.bin/next build
    /profile                                9.6 kB         111 kB

    Browser fixture checks:
    desktop innerWidth 1440, scrollWidth 1440
    mobile innerWidth 390, scrollWidth 390

Direct execution reconciliation validation transcript (2026-07-10):

    cd ../ftx/apps/api && node_modules/.bin/vitest run src/tradingBot.test.ts src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  146 passed (146)

    cd ../../ribbot/packages/client-telegram && ../../node_modules/.bin/vitest run src/trading/frogx.test.ts src/trading/state.test.ts
    Test Files  2 passed (2)
    Tests  8 passed (8)

    ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-direct-execution-dry-run
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    --dry-run: exiting now.

Bundle sequence reconciliation validation transcript (2026-07-10):

    cd ../ftx/apps/api && node_modules/.bin/vitest run src/tradingBot.test.ts src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  151 passed (151)

    cd ../../ribbot && corepack pnpm exec vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  2 passed (2)
    Tests  16 passed (16)

    cd packages/client-telegram && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    corepack pnpm --filter @elizaos/client-telegram run build
    ESM Build success
    DTS Build success

    cd ../ftx/apps/api && node_modules/.bin/wrangler deploy --dry-run --outdir /private/tmp/ftx-api-dry-run-20260710-bundle
    Durable Objects: TRADING_BOT_ACCOUNTS: TradingBotAccountStore
    Vars: TRADING_BOT_BUNDLE_BUY_LIVE_EXECUTION_ENABLED: "false"
    --dry-run: exiting now.

    cd ../ftx/apps/ui && node_modules/.bin/vitest run
    Tests  9 passed (9)
    node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0
    node_modules/.bin/next build
    exit 0

    Browser fixture checks:
    populated desktop innerWidth 1440, scrollWidth 1440
    populated mobile innerWidth 390, scrollWidth 390
    mobile pagination reached frogs 9-10; picker scrolled and closed with Escape

    Broad FTX API tsc remains at its pre-existing 12-error baseline; no bundle error was added.

Advanced monitor reconciliation validation transcript (2026-07-10):

    cd ../ftx && apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  161 passed (161)

    cd ../ribbot && node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  2 passed (2)
    Tests  25 passed (25)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    exit 0

    node_modules/.bin/pnpm --filter @elizaos/client-telegram build
    ESM/DTS build success

    cd ../ftx && apps/api/node_modules/.bin/wrangler deploy --dry-run --config apps/api/wrangler.toml
    TRADING_BOT_ADVANCED_RECONCILE_AFTER_SECONDS: "60"
    --dry-run: exiting now.

    Broad FTX API tsc remains at its pre-existing 12-error baseline; no advanced-monitor error was added.

Privy account-control validation transcript (2026-07-10):

    cd ../ftx/apps/ui && node_modules/.bin/vitest run
    Test Files  5 passed (5)
    Tests  21 passed (21)

    node_modules/.bin/tsc --noEmit -p tsconfig.json
    exit 0

    node_modules/.bin/next build
    exit 0

    cd ../ftx && apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  161 passed (161)

    cd ../ribbot && node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    exit 0

    packages/client-telegram: ESM/DTS build success
    FTX Worker dry-run: exit 0

    Browser fixture desktop innerWidth 1440, scrollWidth 1440
    Browser fixture mobile innerWidth 390, scrollWidth 390
    Pause confirmation visible at both viewports; unexpected console errors 0

    Configured Privy identity/export/signer controls are unit-tested only.
    Dashboard/domain setup and all live Privy actions remain approval-gated.

Milestone 39 adds bounded unresolved-execution escalation without weakening the no-resend invariant. FTX stores/returns `manualReviewAfter`, `manualReviewRequiredAt`, and `manualReviewReason` for direct, scheduled, bundle, and advanced execution paths; a deterministic account event makes the escalation durable. Ribbot carries those fields through API contracts and local cache, renders deadlines/reasons across the relevant command surfaces, and shows operator lock/review guidance once required. This is not manual resolution: no endpoint can mark an execution terminal without Privy/Solana evidence.

Bounded manual-review validation transcript (2026-07-10):

    cd ../ftx/apps/api && node_modules/.bin/vitest run src/tradingBot.test.ts src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  166 passed (166)

    node_modules/.bin/wrangler deploy --dry-run
    TRADING_BOT_MANUAL_REVIEW_AFTER_SECONDS: "900"
    --dry-run: exiting now.

    cd ../../ribbot && node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  2 passed (2)
    Tests  28 passed (28)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    exit 0

    cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts
    ESM/DTS build success

    git diff --check
    exit 0 in both repos

    Broad FTX API tsc remains at its pre-existing 12-error baseline; this milestone added no compiler error.
    No deploy, Telegram send, Privy live call, Solana transaction, or Cloudflare mutation occurred.

Milestone 40 makes escalation operable without creating a force-state backdoor. FTX stores review cases in the global Durable Object and exposes operator-token list, acknowledge, and reconcile routes. Reconcile dispatches to the existing direct, scheduled, bundle, or advanced read-only path, rejects stale execution identities, and records resolution only from terminal evidence. Normal reconciliation closes existing cases automatically. Ribbot only labels the resulting account events, and `plans/trading-bot-manual-review-runbook.md` documents private operation and stop conditions.

Operator review queue validation transcript (2026-07-10):

    cd ../ftx/apps/api && node_modules/.bin/vitest run src/tradingBot.test.ts src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  171 passed (171)

    node_modules/.bin/wrangler deploy --dry-run
    --dry-run: exiting now.

    cd ../../ribbot && node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts
    Tests  28 passed (28)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    exit 0

    cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts
    ESM/DTS build success

    git diff --check
    exit 0 in both repos

    Broad FTX API tsc remains at the pre-existing 12-error baseline; no operator-review error was added.
    No operator secret was configured and no deploy, Telegram send, live Privy call, or transaction occurred.

Milestone 41 adds bounded confirmed wallet-balance-flow indexing without moving RPC or account authority into Ribbot. FTX `/pnl` inspects up to 12 missing `swap_executed` signatures with Solana `getTransaction`, rejects failed transactions, wallet mismatches, unexpected token deltas, missing amounts, and malformed balances, and derives wallet-level input/output asset deltas from owned SOL/SPL pre/post balances. Wallet-owned token-account lamports are included so ATA rent is neutralized, and the transaction fee is added back only for the fee payer. Accepted flows become deterministic `swap_fill_reconciled` account events; a second PNL refresh reuses the event and performs no duplicate transaction lookup. Ribbot displays confirmed/estimated counts and labels the activity event. This is confirmed balance flow, not decoded DEX-route execution; USD cost remains net SOL flow valued at the current SOL price and realized/FIFO tax-lot accounting is not implemented.

Confirmed-fill validation transcript (2026-07-10):

    cd ../ftx
    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  172 passed (172)

    apps/api/node_modules/.bin/wrangler deploy --dry-run --config apps/api/wrangler.toml
    --dry-run: exiting now.

    cd ../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts
    Tests  29 passed (29)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    exit 0

    node_modules/.bin/pnpm --filter @elizaos/client-telegram build
    ESM/DTS build success

    Broad FTX API tsc remains at the pre-existing 12-error baseline; this milestone added no compiler error.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 42 adds the Trojan-style interaction settings missing from the hardened execution core. FTX preference normalization, Durable Object state, public defaults, and the browser control page now share Simple/Advanced mode, two-to-four buy/sell presets, separate priority fees, confirmation preference, and sell protection. Simple mode forces stored confirmation off. Ribbot refreshes FTX state before menus, pasted-token cards, and market previews; builds buttons from stored presets; applies the sell fee to direct, scheduled, and auto-sell tickets; and immediately advances confirm-off tickets through the existing FTX route. Sell protection overrides that shortcut above 75%. This changes Telegram interaction only: dry-run behavior and every Ribbot, FTX, Privy, wallet, signer, risk, revocation, and live-execution gate remain intact.

Mode/preset validation transcript (2026-07-10):

    cd ../ftx
    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  174 passed (174)

    cd apps/ui && node_modules/.bin/vitest run
    Test Files  5 passed (5)
    Tests  21 passed (21)

    node_modules/.bin/tsc --noEmit -p tsconfig.json
    node_modules/.bin/next build
    exit 0; production build succeeded with existing dependency/lint warnings

    cd ../../../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts packages/client-telegram/src/trading/TradingBot.policy.test.ts
    Test Files  3 passed (3)
    Tests  33 passed (33)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    npm run build --workspace=@elizaos/client-telegram
    exit 0; ESM/DTS build succeeded

    Authenticated mocked `/ribbot` state rendered mode/preset/fee/protection controls at 1440px and 390px with no horizontal overflow or overlap.
    Worker dry-run and both git diff checks passed. Broad FTX API tsc remains at the same 12-error baseline.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 43 replaces the read-only ten-line holdings dump with a Telegram-native position manager. The list excludes FTX-hidden and zero-balance tokens before pagination, clamps stale page indexes, and keeps five holdings per page. When FTX PNL is ready, the list and detail cards show portfolio value, token value, price/change, estimated cost, unrealized PNL, trade counts, and fill coverage; otherwise Ribbot makes a second FTX positions request and renders honest balance-only state. Position buttons reuse the FTX-synced buy/sell presets and existing FTX execution, market-risk, token-safety, and preference endpoints. No new Ribbot RPC, pricing, signing, broadcast, or secret boundary was introduced.

Position-manager validation transcript (2026-07-12):

    cd ../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts packages/client-telegram/src/trading/TradingBot.policy.test.ts packages/client-telegram/src/trading/positionView.test.ts
    Test Files  4 passed (4)
    Tests  37 passed (37)

    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    npm run build --workspace=@elizaos/client-telegram
    exit 0; ESM/DTS build succeeded

    cd ../ftx
    apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
    Test Files  2 passed (2)
    Tests  174 passed (174)

    apps/api/node_modules/.bin/wrangler deploy --dry-run --config apps/api/wrangler.toml
    --dry-run: exiting now

    Callback tests cover hidden/zero filtering, stale-page clamping, page parsing, and Telegram's 64-byte payload limit.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 44 turns the original max-buy copytrade watcher into an FTX-owned managed strategy. FTX stores strategy details in the Durable Object, derives fixed or percentage buy sizing from the observed target transaction, caps spend, applies duplicate-position, token-authority, liquidity, market-cap, target-minimum, and blacklist rules, mirrors target sell percentage against the user's current position, and uses separate buy/sell priority fees. `/copytrade pause|resume <id>` and inline controls call FTX's lifecycle endpoint; paused strategies do not scan and executing strategies cannot be paused. Legacy stored rows preserve their prior 100%-up-to-cap and duplicate-buy semantics, while new Ribbot configs default duplicate buys off. The no-resend execution and reconciliation boundary is unchanged.

Managed-copytrade validation transcript (2026-07-12):

    cd ../ftx/apps/api
    ./node_modules/.bin/vitest run
    Test Files  2 passed (2)
    Tests  177 passed (177)

    ./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-copytrade-worker-check
    --dry-run: exiting now

    cd ../../../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/TradingBot.policy.test.ts packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/positionView.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  4 passed (4)
    Tests  41 passed (41)

    node_modules/.bin/tsc -p packages/client-telegram/tsconfig.json --noEmit
    (cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts)
    exit 0; typecheck and ESM/DTS build succeeded

    Both git diff checks passed. Broad FTX API tsc remains at the same 12-error baseline.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 45 adds mutable strategy management without weakening the execution boundary. `/api/frogx/trading-bot/copytrade/update` revalidates a complete strategy and lets the Durable Object update only staged or paused rows; it rejects managed-wallet changes and executing/terminal state. Same-target edits preserve the consumed-signature cursor, while target changes clear monitor state for the existing no-trade baseline path. `/copytrade/duplicate` reads and revalidates the source inside FTX, then creates a fresh staged row with no inherited cursor. Ribbot fetches the latest FTX row before merging `/copytrade edit <id> key=value ...`, never mutates local cache after a rejected request, and asks FTX to perform `/copytrade duplicate <id> [tag=name]`. The extracted parser directly tests legacy adds, managed adds, edits, clears, toggles, fees, malformed options, and duplicates.

Copytrade-management validation transcript (2026-07-12):

    cd ../ftx/apps/api
    ./node_modules/.bin/vitest run
    Test Files  2 passed (2)
    Tests  180 passed (180)

    ./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-copytrade-edit-worker-check
    --dry-run: exiting now

    cd ../../../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/copyTradeCommand.test.ts packages/client-telegram/src/trading/TradingBot.policy.test.ts packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/positionView.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  5 passed (5)
    Tests  49 passed (49)

    node_modules/.bin/tsc -p packages/client-telegram/tsconfig.json --noEmit
    (cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts)
    exit 0; typecheck and ESM/DTS build succeeded

    Both git diff checks passed. Broad FTX API tsc remains at the same 12-error baseline.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 46 adds the remaining documented Trojan copytrade filter without introducing a metadata oracle. `excludePumpFunTokens` defaults false for old and new rows unless explicitly enabled, persists in `strategy_json`, survives edit/duplicate, and is returned to Ribbot. During target-intent derivation FTX checks parsed transaction account keys for Pump's official bonding-curve program before deriving either a buy or sell. A match rejects the copy before balance, quote, `/execute`, or Privy calls. The distinct PumpSwap program is deliberately not blocked. Ribbot exposes `excludepump=on|off` in add/edit grammar and summaries but never makes the classification decision.

Pump-exclusion validation transcript (2026-07-12):

    cd ../ftx/apps/api
    ./node_modules/.bin/vitest run
    Test Files  2 passed (2)
    Tests  181 passed (181)

    ./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-pump-filter-worker-check
    --dry-run: exiting now

    cd ../../../ribbot
    node_modules/.bin/vitest run packages/client-telegram/src/trading/copyTradeCommand.test.ts packages/client-telegram/src/trading/TradingBot.policy.test.ts packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/positionView.test.ts packages/client-telegram/src/trading/state.test.ts
    Test Files  5 passed (5)
    Tests  49 passed (49)

    node_modules/.bin/tsc -p packages/client-telegram/tsconfig.json --noEmit
    (cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts)
    exit 0; typecheck and ESM/DTS build succeeded

    Both git diff checks passed. Broad FTX API tsc remains at the same 12-error baseline.
    No deploy, Telegram send, live Privy/Solana call, secret change, or external mutation occurred.

Milestone 47 closes the code-level push-notification gap without moving lifecycle authority out of FTX. `ActivityAlertPoller` reads at most 100 recent FTX activity rows for a bounded, rotating set of locally known Telegram users. The first ready response stores a baseline and sends nothing. Later responses ignore non-alert account chatter, group duplicate swap/scheduled/advanced/review rows by execution identity, preserve older undelivered groups when a message-size cap is reached, and send one direct batch per user per poll. A successful Telegram response advances the bounded event-ID cursor; a failed response leaves those IDs unseen and stores an exponential retry delay. `TelegramClient` starts the poller after bot initialization and awaits its cleanup before stopping Telegraf.

The operator configuration is false by default:

    RIBBOT_ACTIVITY_ALERTS_ENABLED=false
    RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS=30000
    RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL=25
    RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE=5

Enabling also requires `TG_TRADER=true` and `RIBBOT_FTX_API_TOKEN`. The interval is clamped to 10-300 seconds, users per poll to 1-100, and events per message to 1-10. FTX remains the event authority; the poller does not call wallet, quote, order, execution, signing, or reconciliation mutation routes.

Activity-alert validation transcript (2026-07-12):

    node_modules/.bin/vitest run packages/client-telegram/src/trading
    Test Files  7 passed (7)
    Tests  58 passed (58)

    node_modules/.bin/tsc -p packages/client-telegram/tsconfig.json --noEmit
    (cd packages/client-telegram && ../../node_modules/.bin/tsup --format esm --dts)
    exit 0; typecheck and ESM/DTS build succeeded

    Formatting and git diff checks passed.
    No deploy, Telegram send, live FTX/Privy/Solana call, secret read/change, or external mutation occurred.

Milestone 48 continues the web-app revamp on the bot's own control surface. FTX `/ribbot` now presents session access and account identity as horizontal exchange bands, then uses one desktop workspace grid: trading defaults occupy the primary track while wallet access, watchlist, and hidden tokens stack in the secondary track. Mobile linearizes the same four numbered sections. Form labels are no longer nested cards, binary controls render as stable toggles, destructive wallet/bot actions retain a distinct pink treatment, and the palette uses green, cyan, pink, and amber accents over neutral operational surfaces. The menu now exposes the same swap/perps/Ribbot/profile/leaderboard/airdrop routes as the broader exchange shell. No endpoint, body shape, signer action, or execution gate changed.

Ribbot-control UI validation transcript (2026-07-12):

    cd ../ftx/apps/ui
    ./node_modules/.bin/vitest run
    Test Files  6 passed (6)
    Tests  23 passed (23)

    ./node_modules/.bin/tsc --noEmit -p tsconfig.json
    ./node_modules/.bin/next build
    exit 0; typecheck and production build succeeded

    cd ../api
    ./node_modules/.bin/vitest run
    Test Files  2 passed (2)
    Tests  181 passed (181)
    ./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-ribbot-ui-revamp-worker-check
    --dry-run: exiting now

    Local CDP browser checks: empty and mocked populated states at 1440px and 390px.
    Both widths reported scrollWidth === innerWidth; controls remained non-overlapping.
    The temporary browser fixture was removed from source before final checks.
    No deploy, live account, Telegram send, FTX/Privy/Solana call, secret read/change, or external mutation occurred.

Milestone 49 implements Trojan-style account-level Auto Buy for pasted contract addresses while preserving the existing token-specific staged rules. `/autobuy instant on <SOL> <min liquidity USD> [max market cap USD]` persists a separate default-off FTX profile; `off` disables it. Ribbot refreshes the FTX account, requires an FTX-managed Privy wallet, runs the existing FTX market-risk endpoint, and either falls back to the normal token panel with a fail-closed reason or creates the normal ticket and immediately advances it through Ribbot's unchanged dry-run/live gates. The execution request carries `instant_auto_buy`; FTX independently reloads the profile, requires exact amount/slippage/priority-fee and SOL-to-token direction, reruns market risk, and reaches Privy only after those checks pass. The FTX `/ribbot` workspace edits the same profile.

Instant Auto Buy validation transcript (2026-07-12):

    FTX API: 175 tests passed.
    Ribbot: 61 tests passed; TypeScript and ESM/DTS build passed.
    FTX UI: focused tests, TypeScript, and production Next build passed.
    Local Playwright checks at 1440px and 390px reported scrollWidth === innerWidth and rendered the stored toggle/amount/liquidity/market-cap values without overlap.
    Broad FTX API tsc remains at its pre-existing strict-TypeScript baseline; no new diagnostic points to this milestone.
    No deploy, Telegram send, live FTX/Privy/Solana call, secret read/change, or external mutation occurred.

Milestone 50 closes the misleading quote-probe warning gap. Ribbot market scans and Instant Auto Buy now translate `not_configured`, `skipped`, and `unavailable` probes into an explicit statement that FTX did not verify liquidity or price impact and that the result is not a safety pass. FTX uses the same fail-closed language for Instant Auto Buy, copytrade buys, bundle buys, sniper buys, and token-specific auto-buy before any Privy request.

Quote-probe messaging validation transcript (2026-07-12):

    FTX API: 176 tests passed, including a no-Titan Instant Auto Buy assertion that verifies no Privy request.
    Ribbot: 64 tests passed; TypeScript passed.
    Both git diff checks passed.
    No deploy, Telegram send, live FTX/Privy/Solana call, secret read/change, or external mutation occurred.

Milestone 51 starts the genuine multi-wallet foundation required by Trojan parity. FTX account storage now persists up to ten wallet slots and an active wallet ID, lazily migrates legacy single-wallet state, and projects the selected slot through the existing fields used by current direct trades. Privy inventory sync accepts only embedded Privy Solana wallets with a wallet ID and excludes linked external wallets. Ribbot `/wallet` renders the authoritative inventory and `/wallet select <number>` changes it only through authenticated FTX storage. The current `/bundle` feature is relabeled Basket Buy because it is a multi-token single-wallet basket; Trojan's same-token multi-wallet bundle remains explicitly unfinished.

Multi-wallet foundation validation transcript (2026-07-12):

    FTX API: 179 tests passed, including two-wallet sync, external-wallet exclusion, selection proxy, and active-field projection.
    Ribbot: 68 tests passed; TypeScript and ESM/DTS build passed.
    FTX Worker dry-run compiled the Durable Object migration and exited without deployment.
    No deploy, Telegram send, live Privy/Solana call, secret read/change, or external mutation occurred.

## Interfaces and Dependencies

The milestone 1 implementation defines:

- `TradingBot` in `packages/client-telegram/src/trading/TradingBot.ts`, with `handleMessage(ctx)` and `handleCallbackQuery(ctx)` methods that return `true` when they handled an update.
- `loadTradingConfig(runtime)` in `packages/client-telegram/src/trading/config.ts`, which reads feature flags and public endpoint settings without reading secret files.
- `TradingStateStore` in `packages/client-telegram/src/trading/state.ts`, which stores non-secret user settings and metadata.
- `ActivityAlertPoller` and `buildActivityAlertBatch` in `packages/client-telegram/src/trading/activityAlerts.ts`, which project authenticated FTX activity into deduplicated Telegram updates while persisting only non-secret delivery IDs/timestamps in `TradingStateStore`.
- `buildPositionPage` and callback helpers in `packages/client-telegram/src/trading/positionView.ts`, which provide deterministic hidden/zero filtering, pagination, stale-page clamping, and Telegram-safe position action payloads without network access.
- `parseCopyTradeCommand` in `packages/client-telegram/src/trading/copyTradeCommand.ts`, which provides the pure deterministic add/edit/duplicate grammar and reports malformed named options before any FTX request.
- `parseAutoBuyIntent` in `packages/client-telegram/src/trading/autoBuyCommand.ts`, which deterministically separates the account-level Instant Auto Buy profile from token-specific staged auto-buy rules.
- `parseWalletCommand` in `packages/client-telegram/src/trading/walletCommand.ts`, which keeps quote-only address linking distinct from numbered FTX active-wallet selection.
- `provisionTradingWallet` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/wallet` for quote-only external wallet links or FTX-managed Privy wallet provisioning.
- `fetchTradingAccount` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/account` for the read-only Telegram `/account`, `/status`, and `/sync` dashboard and refreshes Ribbot's non-secret local account cache.
- `fetchBuyQuote` in `packages/client-telegram/src/trading/frogx.ts`, which requests a SOL-to-token quote from the existing FrogX quote endpoint.
- `buildSwapTransaction` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/swap` after a Telegram order ticket is confirmed.
- `fetchSwapExecutionStatus` and `fetchWithdrawalExecutionStatus` in `packages/client-telegram/src/trading/frogx.ts`, which call FTX read-only Privy-reference status endpoints. Ribbot locks unresolved tickets in its non-secret cache and status callbacks never resend wallet RPC.
- FTX operator review routes live only in `../ftx/apps/api/src/tradingBot.ts`: `GET /api/frogx/trading-bot/operator/reviews`, `POST .../acknowledge`, and `POST .../reconcile`. They require `TRADING_BOT_OPERATOR_TOKEN`, which must never enter Ribbot. Ribbot consumes only the resulting non-secret account activity events.
- `executeStoredBundleBuyConfig` and `fetchStoredBundleBuyExecutionStatus` in `packages/client-telegram/src/trading/frogx.ts`, which call FTX's atomic bundle execution and read-only reconciliation endpoints. Ribbot persists only non-secret sequence progress and never resends or auto-resumes from a status callback.
- `fetchCopyTradeExecutionStatus`, `fetchAutoBuyExecutionStatus`, and `fetchAutoSellExecutionStatus` in `packages/client-telegram/src/trading/frogx.ts`, which call FTX's authenticated per-config GET-only reconciliation surfaces. Ribbot rehydrates returned config state and never sends from these callbacks.
- `fetchPositions` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/positions` for SOL/SPL balances used by `/positions` and percentage sell tickets.
- `fetchPnl` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/pnl` for live positions, current Jupiter valuation, confirmed wallet-balance-flow coverage, and explicit execution-metadata fallback. Ribbot renders the coverage but does not inspect chain transactions or index fills itself.
- `fetchActivity` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/activity` for read-only recent account events rendered by `/activity`, `/history`, `/trades`, and `/events`.
- `fetchTokenSafety` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/token-safety` for review-only mint authority, freeze authority, supply, pricing, and risk flags rendered by `/safety` aliases and pasted-token Safety buttons.
- `fetchMarketRisk` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/market-risk` for review-only token-safety, market-cap, SOL pricing, and quote/liquidity-probe flags rendered by `/scan` aliases and pasted-token Scan buttons.
- `fetchReferralSummary` and `applyReferralCode` in `packages/client-telegram/src/trading/frogx.ts`, which call FTX/FrogX `/api/frogx/trading-bot/referrals` for non-secret referral-code display and one-time referrer linking.
- `storeAutoBuyConfig` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/auto-buy`; FTX can include market-risk warnings in the storage response and Ribbot renders those warnings without starting execution.
- `validateScheduledOrder`, `storeScheduledOrder`, `fetchScheduledOrders`, and `cancelStoredScheduledOrder` in `packages/client-telegram/src/trading/frogx.ts`, which call FTX/FrogX staged order validation/storage/list/cancel endpoints. New Ribbot staged limit, stop-loss, trailing-stop, and DCA tickets use FTX storage and treat local `.state` as a cache.
- `validateWithdrawal` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/withdrawals/validate` before Ribbot stores staged SOL or SPL withdrawal metadata.
- `storeCopyTradeConfig`, `fetchCopyTradeConfigs`, `controlStoredCopyTradeConfig`, `updateStoredCopyTradeConfig`, `duplicateStoredCopyTradeConfig`, `cancelStoredCopyTradeConfig`, and the corresponding sniper/auto/bundle clients in `packages/client-telegram/src/trading/frogx.ts`, which call FTX/FrogX advanced automation storage/control endpoints before Ribbot caches non-secret config metadata. Edit and duplicate have no local-only fallback.
- `StoredAdvancedAutomationMonitor` in `packages/client-telegram/src/trading/frogx.ts` and `AdvancedAutomationMonitor` in `packages/client-telegram/src/trading/state.ts`, which carry only non-secret FTX execution/reconciliation metadata. `/copytrade`, `/sniper`, `/autobuy`, and `/autosell` render every non-cancelled lifecycle and never use cached monitor state to send a transaction.
- `requestControlCode` in `packages/client-telegram/src/trading/frogx.ts`, which calls FTX/FrogX `/api/frogx/trading-bot/control/code` so Ribbot can hand users to the FTX `/ribbot` page without handling browser session tokens.

Future Privy integration should use FTX Worker secrets, not Ribbot env:

- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_AUTHORIZATION_KEY_ID`
- `PRIVY_AUTHORIZATION_PRIVATE_KEY`
- `PRIVY_WALLET_POLICY_IDS`
- `RIBBOT_TRADING_BOT_TOKEN`

Ribbot should use:

- `RIBBOT_TRADING_ENABLED`
- `RIBBOT_TRADING_DRY_RUN`
- `FROGX_API_BASE_URL`
- `RIBBOT_FTX_API_TOKEN`

Do not put any secret values in this repository.
