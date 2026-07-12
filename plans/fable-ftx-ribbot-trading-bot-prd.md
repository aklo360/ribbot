# PRD: Finish FTX-Routed Ribbot Telegram Trading Bot

Status: active implementation PRD; Fable handoff retained for history
Date: 2026-07-06; resumed by LLPhant 2026-07-10
Primary objective: turn Ribbot into a full-featured Telegram trading bot comparable to Trojan on Solana, with all wallet, signing, routing, automation, and execution controlled by FTX/FrogX.

Continuation checkpoint: Fable stopped after the 2026-07-06 P0 Telegram UX/type-safety pass recorded in `plans/trojan-style-trading-bot.md`; FTX backend files were unchanged after the prior 2026-07-04 implementation. LLPhant resumed on 2026-07-10 and hardened scheduled orders, direct swaps/withdrawals, bundle sequences, copytrade, sniper, auto-buy, and auto-sell with atomic FTX claims where applicable, Privy idempotency keys, explicit lifecycle state, read-only Privy reconciliation, stale-write protection, deterministic activity/PNL events, and Ribbot recovery rendering. Sniper now observes Jupiter recent first-pool launches inside FTX, baselines/deduplicates candidates, applies strict source/risk/cap/cooldown/account checks, and remains live-disabled by default. Executing advanced configs expose user-triggered Check Status through authenticated FTX GET-only reconciliation routes. A shared 900-second default manual-review clock escalates every unresolved execution family through durable FTX metadata/events and Ribbot lock guidance. A separate FTX operator token now protects a global pull-based queue, audit-only acknowledgement, and evidence-only reconciliation; no endpoint can force terminal state or resend. FTX PNL now lazily indexes bounded confirmed wallet-level asset flow from Solana balances and reports explicit confirmed/estimated coverage, while USD output remains net-SOL/current-price estimation without decoded DEX-route fills or realized/FIFO tax lots. The FTX `/profile` revamp and code-level bot-first Privy claim/export/signer-control flow were also completed and browser/build verified where no live identity was required. Milestone 42 added FTX-owned Simple/Advanced mode, dynamic buy/sell presets, separate sell fees, and sell protection across Telegram and `/ribbot`; confirm-off tickets still use the same FTX execution boundary, while protected sells above 75% retain explicit confirmation. Milestone 43 added paginated FTX-valued holdings and per-position Buy/Sell/Scan/Safety/Hide controls without adding any Ribbot-side RPC or execution authority. No deploy or live Privy/Solana/Telegram action occurred.

Milestone 44 adds FTX-owned managed copytrade strategies: optional tags, fixed or percentage sizing, a hard buy cap, target-buy minimum, separate sell priority fee, copy-sell and duplicate-buy controls, renounced-mint enforcement, minimum/maximum market cap, liquidity probing, token blacklists, and durable pause/resume. Ribbot parses and renders these controls, but FTX stores and enforces them before `/execute`; executing strategies cannot be paused, paused strategies do not scan, and every ambiguous send remains on the existing read-only no-resend reconciliation path. At that checkpoint strategy edit/duplicate and Pump.fun exclusion remained; milestones 45 and 46 below complete them. Live verification remains unfinished, and blind execution retries remain intentionally prohibited.

Milestone 45 completes strategy edit/duplicate parity at code level. FTX exposes authenticated update and duplicate mutations backed by the Durable Object: updates accept a complete revalidated strategy only from staged/paused state, preserve the monitor cursor for same-target edits, clear it when the target changes, and never mutate the managed wallet; duplicates are created inside FTX as fresh staged rows with empty monitor state. Ribbot adds deterministic edit/duplicate commands and buttons, fetches FTX before merging partial edits, and never falls back to local mutation. At that checkpoint Pump.fun exclusion remained; milestone 46 below completes it. Approved live verification remains unfinished.

Milestone 46 completes Trojan's PumpFun bonding-curve exclusion at code level. Official Trojan documentation scopes the option to PumpFun tokens still on the bonding curve, while Pump's official protocol documentation distinguishes the Pump bonding-curve program from PumpSwap. FTX therefore persists a false-by-default `excludePumpFunTokens` strategy flag and rejects a copied buy or sell only when the parsed target transaction invokes the official Pump bonding-curve program; PumpSwap remains eligible. Ribbot carries the setting through add/edit/duplicate, cache migration, and summaries, but performs no classification itself. Approved live verification remains unfinished.

Milestone 47 completes code-level automatic trade-status alerts. A false-by-default Ribbot poller reads only authenticated FTX activity, baselines existing events without sending, groups duplicate transaction/automation/review rows, batches new execution/failure/reconciliation/manual-review updates, and advances a durable non-secret event cursor only after Telegram confirms delivery. Failed deliveries retain the events and use persisted exponential backoff; polling and message sizes are bounded. The poller cannot execute, reconcile, sign, or broadcast. Enabling and privately verifying Telegram delivery remains approval-gated.

Milestone 48 completes the `/ribbot` slice of the FTX web-app revamp. The control page now uses a flat exchange workspace with session/account bands, a primary trading-defaults track, and stacked wallet/Privy, watchlist, and hidden-token sections; mobile linearizes the same numbered sections without horizontal overflow. Navigation now matches the broader exchange shell. Session exchange, preference writes, wallet controls, Privy identity checks, and FTX pause/restore contracts are unchanged. UI tests, typecheck, production build, and local 1440px/390px empty/populated browser checks pass; the browser fixture was removed before final verification.

## 1. Executive Summary

Ribbot should become the Telegram-native trading front end for Solana Business Frogs users. Users should be able to open Telegram, create or recover a managed wallet, inspect positions, buy/sell tokens, manage automation, run safety checks, withdraw, track PNL/activity, and hand off account management to the FTX web app.

The hard architecture constraint is that every privileged operation routes through FTX/FrogX. Ribbot is a deterministic Telegram UX layer and non-secret local cache. Ribbot must not own Privy app credentials, signer keys, private keys, wallet policy IDs, transaction signing, or broadcasting. FTX owns Privy user/wallet provisioning, account storage, quote/swap execution, risk checks, automation monitors, live execution gates, and audit events.

This PRD is the handoff point for finishing the product from the current implementation state. It is not a deploy instruction. Do not deploy, send Telegram messages, change Cloudflare secrets, make real Privy calls, or send on-chain transactions without AKLO's explicit approval for that specific action.

## 2. Source Of Truth

Start by inspecting current files on disk. Do not rely on this PRD alone if the worktree has moved.

Primary Ribbot files:
- `packages/client-telegram/src/telegramClient.ts`
- `packages/client-telegram/src/trading/TradingBot.ts`
- `packages/client-telegram/src/trading/activityAlerts.ts`
- `packages/client-telegram/src/trading/config.ts`
- `packages/client-telegram/src/trading/frogx.ts`
- `packages/client-telegram/src/trading/state.ts`
- `plans/trojan-style-trading-bot.md`
- `plans/trading-bot-manual-review-runbook.md`
- `CHANGELOG.md`

Primary FTX files:
- `../ftx/apps/api/src/tradingBot.ts`
- `../ftx/apps/api/src/tradingBot.test.ts`
- `../ftx/apps/api/src/index.ts`
- `../ftx/apps/api/src/env.ts`
- `../ftx/apps/api/wrangler.toml`
- `../ftx/apps/ui/src/app/ribbot/page.tsx`
- `../ftx/AGENTS.md`
- `../ftx/CHANGELOG.md`
- `../ftx/.codex/sys_arch.md`

Current local verification at the 2026-07-12 continuation checkpoint:
- FTX API tests passed: `apps/api/node_modules/.bin/vitest run` from `../ftx/apps/api` with 181 tests passing.
- Ribbot trading tests passed: `node_modules/.bin/vitest run packages/client-telegram/src/trading` with 58 tests passing.
- Ribbot package build passed: `corepack pnpm --filter @elizaos/client-telegram run build`.
- Ribbot Telegram package typecheck passed: `../../node_modules/.bin/tsc --noEmit -p tsconfig.json`.
- FTX Worker dry-run passed: from `../ftx/apps/api`, `node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run`.
- FTX UI tests passed with 23 tests, UI typecheck passed, and the Next production build passed.
- Populated `/profile` browser fixtures passed at 1440px and 390px with no horizontal overflow; mobile pagination and the scrollable/dismissible profile-frog picker were exercised.
- Authenticated local `/ribbot` browser fixtures passed at 1440px and emulated 390px with no horizontal overflow; FTX-backed mode, preset, separate-fee, confirmation, sell-protection, and Sniper settings rendered from mocked account state. No live account, Privy, Telegram, or Solana service was contacted.
- Broad FTX API `tsc --noEmit` still reports the same 12 pre-existing errors in test crypto typing, advanced-config narrowing, token safety, and token cleanup; this continuation added no new compiler error.
- `git diff --check` passed in both repos.
- No live deploy, live Privy call, Telegram send, or on-chain transaction was performed.

## 3. Current Product State

Already implemented at code level:
- Telegram trading router behind `TG_TRADER=true`.
- FTX-authoritative Simple/Advanced mode, two-to-four buy/sell presets, separate buy/sell priority fees, confirmation preference, and sell protection. Simple mode forces confirmation off in FTX state; Ribbot refreshes FTX before menus/trade previews, immediately advances confirm-off tickets through the existing execution boundary, and still requires explicit confirmation for protected sells above 75%.
- FTX-routed `/wallet` provisioning and quote-only wallet link path.
- FrogX quote previews for buy/sell flows.
- Confirm/cancel market order tickets.
- FTX `/execute` live market execution path, disabled unless FTX live gates and Privy signer config are present.
- Read-only FTX direct swap/withdrawal status endpoints plus Ribbot Check Status callbacks. Ambiguous Privy responses lock the local ticket, validated status checks never resend, and malformed/409 execution bodies fail closed.
- FTX positions, PNL, activity, account dashboard, account sync, and control-code handoff.
- Disabled-by-default automatic trade-status alerts sourced only from FTX activity, with no-send initial baselining, execution-reference deduplication, bounded batches/user rotation, durable successful-delivery cursors, and persisted retry backoff.
- Trojan-style position management: `/positions [page]` shows five visible FTX holdings per page with balance/value/PNL when available and FTX balance-only fallback; `/position <mint>` and row buttons expose all configured Buy/Sell presets plus Scan, Safety, Hide/Unhide, Back, and Menu actions.
- FTX `/ribbot` browser control page for non-secret account settings plus scoped Privy Telegram login, exact identity/wallet matching, isolated Solana export, confirmed app-signer removal, FTX pause, and configured signer/policy restoration. Login never creates a second wallet and no export material enters FTX or Ribbot.
- Rebuilt FTX `/profile` wallet identity workspace with honest connection/data states, real Tapestry social/recent-trade metrics, owned Frog collection/PFP controls, activity, and threshold milestones.
- Token cleanup review, token safety, and market-risk scans.
- Staged limit, stop-loss, trailing-stop, and DCA order storage through FTX.
- FTX scheduled-order scanner for dry-run trigger state, plus disabled live scheduler gate.
- FTX scheduled-order reconciliation by persisted Privy reference ID, including pending/success/terminal-failure handling and expected execution-state checks; reconciliation never sends a transaction.
- Staged SOL/SPL withdrawals and FTX-owned withdrawal execution path.
- Staged copytrade/sniper/auto-buy/bundle-buy/auto-sell config storage through FTX.
- Managed copytrade strategy storage and enforcement through FTX: fixed or percentage sizing, max spend, target minimum, separate sell fee, copy-sell/duplicate controls, renounced authority, liquidity and min/max market-cap checks, blacklist, official Pump bonding-curve exclusion, staged/paused lifecycle controls, validated staged/paused updates, and FTX-created duplicates. Ribbot offers pause/resume/edit/duplicate commands and inline controls but cannot classify or execute a trade itself.
- Advanced monitor checks for copytrade, sniper, auto-buy, and auto-sell. Sniper uses Jupiter Tokens V2 recent first-pool data, records an initial no-trade baseline, advances a persistent cursor, deduplicates processed mints, and filters configured launch sources.
- Disabled-by-default live readiness for copytrade, sniper, auto-buy, auto-sell, and user-triggered bundle-buy execution through FTX and Privy.
- Atomic copytrade/sniper/auto-buy/auto-sell execution claims and read-only Privy reconciliation. Ambiguous sends stay locked, stale writes are rejected, one-shot auto rules resolve terminally, standing copytrade resumes only after terminal resolution, sniper resumes until its max-snipes cap, and reconciled trades emit deterministic activity/PNL events without resending.
- Authenticated per-config copytrade/sniper/auto-buy/auto-sell status endpoints plus Ribbot Check Status callbacks. They reload FTX's authoritative config, invoke only the existing Privy GET reconciliation after the safety window, and never call `/execute` or resend a transaction.
- Ribbot renders non-cancelled advanced configs across staged/executing/failed/executed state with Privy status, signature, and failure details; locked cancellation conflicts refresh from FTX rather than mutating local cache.
- Atomic bundle execution claim/progress state plus Ribbot Check Status. Ambiguous items remain locked for read-only FTX/Privy reconciliation; interrupted partial baskets never auto-resume.
- Shared bounded-age unresolved-execution escalation. FTX derives a configurable review deadline from the persisted execution start for direct, scheduled, bundle, and advanced paths, records a deterministic non-secret `execution_manual_review_required` event after expiry, and returns the deadline/timestamp/reason to Ribbot. Ribbot persists and renders those fields with explicit no-retry/operator-inspection guidance; escalation does not mark success/failure or send again.
- FTX-owned operator review queue. `TRADING_BOT_OPERATOR_TOKEN` is separate from Ribbot auth and protects list, acknowledge, and reconcile routes. Acknowledgement is audit-only; reconcile invokes existing Privy GET-only wallet/chain checks for direct, scheduled, bundle, and advanced cases and closes only on terminal evidence. Normal terminal reconciliation also closes queued cases. Ribbot only renders acknowledgement/resolution activity; the no-secret workflow is in `plans/trading-bot-manual-review-runbook.md`.
- Referral/reward hooks as tracking-only account metadata.
- Local Ribbot state is a non-secret cache under ignored `.state/`.

Known incomplete areas:
- Trojan multi-wallet parity is foundational, not complete. FTX now persists/discovers up to ten managed Privy wallet slots and Telegram can select the active slot. Creating additional managed wallets, importing an existing wallet, per-wallet account controls, disperse, ETH/SOL bridge flows, and automation that continues across inactive slots remain unfinished.
- The existing `/bundle` implementation is a multi-token basket in one wallet and is now labeled Basket Buy. Trojan Bundle Buy means buying one token across selected wallets; true multi-wallet bundle validation, balance preflight, atomic claim/progress, execution, and reconciliation are not implemented yet.
- Live verification has not been performed with approved real Privy credentials, signer policy, funded wallet, Telegram bot session, and Solana execution.
- Privy account control is code-complete but not live-configured or live-verified. The Privy Dashboard Telegram/domain setup and matching public app/signer/policy IDs must pass `plans/privy-account-control-live-checklist.md` before use.
- Scheduled, direct, bundle, copytrade, sniper, auto-buy, and auto-sell reconciliation, bounded-age escalation, the operator queue, and push-alert projection/delivery state are mock-verified but not live-verified. Persistent Privy `not_found` or lookup errors correctly remain locked; operator-secret configuration, private alert enablement, private workflow verification, and operational dashboarding remain.
- Sniper is code-complete but not live-configured or live-verified. Jupiter launchpad classifications for the supported `pump`, `raydium`, and `moonshot` source filters must be checked against approved live feed samples before enabling execution.
- Referral fee share, payouts, claimable rewards, and token transfers are not implemented.
- Confirmed wallet-balance-flow indexing is implemented with a bounded read-only Solana lookup and deterministic FTX events. Decoded DEX-route fills, production live transaction-shape verification, historical execution-time USD valuation, and realized/FIFO tax-lot PNL are not implemented; unresolved flows remain explicitly estimated from execution metadata.
- Core Trojan-style mode, preset, and confirmation behavior is implemented; remaining Telegram UX work is consistency and live usability verification across the long-tail commands.
- Managed copytrade is code-complete for sizing, current verified filters including Pump's bonding curve, pause/resume, edit, and duplicate. An approved live target-wallet exercise is not complete. Blind retries are out of scope because they violate the persisted no-resend execution boundary.

## 4. Non-Negotiable Constraints

1. FTX/FrogX owns all privileged operations.
   - Ribbot calls FTX endpoints.
   - FTX validates, gates, builds, signs via Privy, broadcasts, records events.

2. Ribbot must never hold secret material.
   - No Privy app secret, authorization private key, signer policy ID secrets, private keys, seed phrases, raw wallet export, Cloudflare secrets, or bot execution credentials in Ribbot code/state/logs.
   - Ribbot may store non-secret public wallet address, Privy user ID, Privy wallet ID, preferences, cached staged metadata, and returned non-secret signatures/event metadata.

3. FTX live execution must remain disabled by default.
   - Base gate: `TRADING_BOT_LIVE_EXECUTION_ENABLED=true`.
   - Per-feature gates must remain explicit and false by default.
   - Missing requirements must produce clear non-secret errors.

4. No external action without AKLO approval.
   - No deploys.
   - No Telegram sends.
   - No Cloudflare secret changes.
   - No Privy dashboard changes.
   - No on-chain sends.
   - No messages/notifications to external people/channels.

5. Do not read or print secrets.
   - Never read `.env`, `.dev.vars`, `~/.secrets.env`, or secret stores.
   - `.env.example` is safe to inspect/update.

6. Local state is cache, not authority.
   - FTX `TradingBotAccountStore` is the source of truth for account state, staged orders/configs, and execution events.
   - Ribbot should recover from FTX whenever possible.

## 5. Target User Experience

The target experience should feel like a serious Solana Telegram trading bot:

User can:
- Start Ribbot and see a concise trading menu.
- Create or recover a managed FTX/Privy Solana wallet.
- Deposit SOL/tokens to the displayed wallet.
- Paste a token mint and immediately see Buy, Sell, Scan, Safety, Watch, and Menu actions.
- Choose Simple or Advanced mode and configure two-to-four buy/sell preset buttons plus separate buy/sell priority fees.
- Buy or sell with clear amount, slippage, route, estimated output, and confirm/cancel.
- View positions, PNL, recent activity, settings, watchlist, hidden tokens, and account state.
- Stage and manage limit orders, stop losses, trailing stops, and DCA.
- Configure copytrade, auto-buy, auto-sell, bundle buys, and sniper settings.
- Withdraw SOL/SPL tokens after an explicit Send confirmation.
- Open FTX `/ribbot` for richer account controls.
- Revoke bot access and have future FTX live execution blocked before any Privy call.

Telegram responses should be compact, action-oriented, and scan-friendly. Avoid explanatory walls unless a command fails or needs risk disclosure.

## 6. Functional Requirements

### 6.1 Wallet And Account

Required:
- `/wallet` requests FTX-managed Privy wallet provisioning.
- `/wallet <solana address>` remains quote-only and cannot execute.
- Ribbot displays only public wallet address and non-secret metadata.
- `/account`, `/status`, `/sync` fetch FTX account snapshots and refresh local cache.
- `/control` and `/manage` request FTX one-time control codes and link to the FTX `/ribbot` page when configured.

Remaining work:
- Configure the approved Privy Telegram login/domain client and matching public app/signer/policy IDs.
- Run `plans/privy-account-control-live-checklist.md` only after explicit approval; do not expose export material.
- Add user-facing copy that distinguishes:
  - quote-only external wallet
  - FTX-managed Privy wallet
  - revoked bot access
  - missing signer/live gates

Acceptance:
- No private key or signer secret is ever displayed, returned, stored, or logged.
- Revoked account live execution returns a revoked error before any Privy signing request.
- A user can recover account state in Telegram from FTX after local `.state` cache loss.

### 6.1A Trading Modes And Presets

Required:
- FTX account state owns `simple|advanced` mode, confirmation preference, two-to-four unique positive buy presets, two-to-four unique sell presets from above 0% through 100%, separate buy/sell priority fees, and sell protection.
- Simple mode forces stored confirmation off and shows the core wallet, positions, PNL, watchlist, activity, settings, account, and withdrawal loop. Advanced mode exposes the full order/automation/control menu.
- Pasted-token buttons are generated from FTX-stored presets. Ribbot refreshes FTX account state before menus and buy/sell previews so browser changes do not leave Telegram stale.
- Confirm-off tickets immediately advance through the existing FTX `/execute` boundary; this never bypasses dry-run, account, wallet, revocation, signer, risk, or FTX live gates.
- Sell protection forces explicit Telegram confirmation only when the requested sell is above 75%.

Remaining work:
- Privately exercise Simple and Advanced mode in a real Telegram session after explicit approval.
- Decide whether confirmation interaction needs cryptographic/server-side evidence in a future FTX API; the current control is Telegram UX policy and does not weaken FTX execution authentication or gates.

Acceptance:
- Invalid, duplicate, or out-of-range presets fail validation and do not mutate FTX account state.
- A browser settings change appears on the next Telegram menu/token/trade preview when FTX is available.
- A 75% protected sell may use confirm-off behavior; a sell above 75% cannot.

### 6.2 Market Buy/Sell

Required:
- `/buy <mint> <SOL>` quotes through FrogX/FTX.
- Pasted mint cards expose Buy/Scan/Safety/Watch actions.
- Confirmed market tickets call FTX `/api/frogx/trading-bot/execute` only when Ribbot live mode is enabled.
- FTX revalidates account, wallet, revocation, live gate, Privy config, and builds a fresh swap before signing.
- Ambiguous execution responses become `execution_pending`; Check Status calls FTX `/api/frogx/trading-bot/execute/status`, which performs a Privy GET by deterministic reference and never resends wallet RPC.

Remaining work:
- Live-verify the full market buy/sell path with AKLO-approved credentials and a small funded wallet.
- Add explicit simulation or confirmation quality checks if the current FTX path does not already prove failed transactions are handled cleanly.
- Improve token amount formatting by fetching token metadata/decimals where output is still raw.
- Privately verify direct cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry.

Acceptance:
- Unit tests cover disabled gate, quote-only rejection, revocation rejection, mocked Privy success, ambiguous response, read-only status resolution, wallet mismatch, terminal failure, pending, and not-found.
- Private live test proves one buy and one sell either confirm on chain or fail with clear user-facing errors and no retry loop.

### 6.3 Positions, PNL, Activity

Required:
- `/positions` uses FTX RPC positions.
- `/positions [page]` filters FTX-hidden/zero balances, clamps stale pages, and exposes one detail button per holding.
- `/position <mint>` shows FTX value/price/change/cost/PNL/trade/fill data when available, falls back honestly to FTX balances, and exposes the FTX-synced Buy/Sell presets, Scan, Safety, and Hide/Unhide actions.
- `/pnl` uses FTX account events plus live positions and Jupiter prices.
- `/activity`, `/history`, `/trades`, `/events` display FTX account events.

Remaining work:
- Privately verify confirmed-fill parsing against approved real Titan/Jupiter buy and sell transactions, including existing/new ATAs, platform fees, and wrapped-SOL account shapes.
- Exercise pagination and every position callback in a real Telegram session after explicit approval; local tests prove view math and payload limits but are not Telegram delivery evidence.
- Add historical execution-time USD valuation and realized/FIFO tax-lot accounting if production PNL requires those semantics.
- Make activity labels fully cover copytrade, auto-buy, auto-sell, bundle-buy, scheduled orders, and withdrawals.

Acceptance:
- Telegram views should remain useful when some prices or events are missing.
- Position pages remain navigable after balances disappear, hidden tokens leave the list, and PNL pricing is unavailable; every trade/preference action still routes through FTX.
- PNL must distinguish confirmed wallet-balance flow from execution-metadata fallback and must not describe it as decoded DEX-route execution, realized PNL, or tax-lot PNL.

### 6.4 Risk And Token Review

Required:
- `/safety`, `/safe`, `/risk`, `/rugcheck` call FTX token-safety endpoint.
- `/scan`, `/market`, `/liquidity` call FTX market-risk endpoint.
- `/cleanup` returns review-only cleanup candidates and only mutates preferences or stages sells after explicit user action.

Remaining work:
- Wire risk checks more deeply into pre-buy confirmations if not already visible enough.
- Missing or unavailable Titan quote verification is now explicit: Telegram scans and every FTX-routed automated buy state that liquidity/price impact were not verified, that this is not a safety pass, and remain blocked before Privy.
- Add richer liquidity/source checks when FTX gets an approved on-chain liquidity model.

Acceptance:
- Review endpoints never trade, sign, broadcast, hide, or sell without explicit follow-up action.
- Auto-buy, bundle-buy, and copytrade buy execution reject danger flags and non-ready quote probes.

### 6.5 Limit, Stop, Trailing, DCA

Required:
- Commands stage FTX-owned order metadata:
  - `/limit buy <mint> <SOL> below <price>`
  - `/limit sell <mint> <percent> above <price>`
  - `/stop <mint> <percent> below <price>`
  - `/trailing <mint> <sell percent> <trail percent>`
  - `/dca buy <mint> <total SOL> <orders> <interval minutes>`
- `/orders` syncs from FTX and cancel buttons call FTX before local cache mutation.
- Sell-side staged orders resolve token balances from FTX positions.

Remaining work:
- Live-verify limit/stop/trailing/DCA behind `TRADING_BOT_SCHEDULER_LIVE_EXECUTION_ENABLED=true` only after explicit approval.
- Privately verify scheduled cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retries.
- Keep mocked coverage proving atomic claims, FTX `/execute` routing, unique DCA slices, idempotency headers, blocked dependencies, ambiguous-response state, reconciliation outcomes, stale-write rejection, success state, and terminal failure state.

Acceptance:
- Staging/list/cancel remains non-secret and FTX-owned.
- Live scheduler does nothing unless scheduler enabled, scheduler live gate true, base live gate true, stored Privy wallet matches, no revocation, and signer config passes.
- Triggered orders have idempotency/replay protection and clear staged/executing/executed/cancelled/failed state.
- Ambiguous responses remain `executing`; reconciliation validates the Privy reference, stored wallet, Solana chain, and current execution identity before persisting a result, and never resends.

### 6.6 Withdrawals

Required:
- `/withdraw sol <amount> <destination>`
- `/withdraw <mint> <percent|all> <destination>`
- `/withdrawals` list/cancel staged tickets.
- Send callback calls FTX `/withdrawals/execute` only when Ribbot live gates allow it.
- FTX builds SOL/SPL transfers and signs/broadcasts through Privy only after live gate, RPC, wallet match, revocation, and signer checks.
- Ambiguous transfer responses become `execution_pending`; Check Status calls FTX `/withdrawals/status` and never rebuilds or resends the transfer.

Remaining work:
- Live-verify SOL withdrawal and SPL withdrawal with AKLO-approved credentials/funded wallet.
- Ensure destination validation and ATA behavior are user-visible where needed.
- Privately verify withdrawal cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery.

Acceptance:
- No withdrawal transaction is built/signed/broadcast from Ribbot.
- Token withdrawals never guess balances.
- Live test proves clean success and clean failure behavior.

### 6.7 Copytrade

Required:
- `/copytrade add <target-wallet> fixed <SOL> <min liquidity USD> [options]`
- `/copytrade add <target-wallet> percent <%> <max SOL> <min liquidity USD> [options]`
- Options cover tag, copy sells, duplicate buys, renounced mint authority, Pump bonding-curve exclusion, minimum target buy, minimum/maximum market cap, and a comma-separated mint blacklist.
- `/copytrade` lists FTX configs.
- Cancel, pause, and resume go through FTX; executing strategies remain locked.
- `/copytrade edit <config-id> key=value ...` loads the latest FTX row, merges explicit fields only, and submits a complete replacement to FTX; target changes clear the old cursor for a fresh no-trade baseline.
- `/copytrade duplicate <config-id> [tag=name]` creates a new staged strategy inside FTX with empty monitor state.
- FTX monitor can baseline/detect target-wallet signatures.
- Live execution readiness exists behind `TRADING_BOT_COPYTRADE_LIVE_EXECUTION_ENABLED=true`.

Remaining work:
- Live-verify copytrade with an approved target wallet transaction.
- Expand transaction parsing only if it remains safe; reject ambiguous token-token or multi-token deltas.
- Privately verify copytrade cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry.

Acceptance:
- Fixed buys use the configured amount; percentage buys derive from observed target SOL spend and never exceed the configured cap.
- Target-minimum, duplicate-position, blacklist, renounced-authority, liquidity, and min/max market-cap filters are enforced inside FTX before execution.
- Copied sells require copy-sell opt-in, mirror the target sell percentage against the user's FTX-reported position, and use the strategy's sell priority fee.
- Paused strategies are excluded from monitor scans, and only paused/staged strategies can transition through the control endpoint.
- `excludepump=on` rejects target transactions invoking the official Pump bonding-curve program and does not reject graduated PumpSwap AMM transactions.
- Buys run FTX risk/quote checks.
- All execution goes through FTX `/execute` and Privy.
- FTX claims before send; ambiguous execution remains visible and locked until read-only reconciliation returns a terminal provider result.

### 6.8 Auto-Buy

Required:
- `/settings autobuy on|off`
- `/autobuy add <mint> <max SOL> <min liquidity USD>`
- `/autobuy` list/cancel FTX configs.
- Live execution readiness exists behind `TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED=true`.

Remaining work:
- Live-verify with a known target token and Titan quote credentials.
- Replace "liquidity monitoring unconfigured" with a real approved trigger/source model if required for production.
- Privately verify auto-buy cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry.

Acceptance:
- Account opt-in required.
- SOL balance checked.
- Token safety and market-risk quote probe pass before execution.
- FTX `/execute` and Privy path used for all sends.
- One-shot rules cannot replay after an ambiguous response and resolve to `executed` or `failed` only through the persisted execution identity.

### 6.9 Auto-Sell

Required:
- `/settings autosell on|off`
- `/autosell add <mint> <sell percent> [above|below <price>]`
- `/autosell` list/cancel FTX configs.
- FTX monitor observes Jupiter Price V3 trigger crossings.
- Live execution readiness exists behind `TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED=true`.

Remaining work:
- Live-verify with a funded wallet and known token balance.
- Improve partial balance/decimals display in Telegram.
- Privately verify auto-sell cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry.

Acceptance:
- Account opt-in required.
- RPC positions resolve token balance.
- FTX `/execute` and Privy path used for all sends.
- One-shot rules cannot replay after an ambiguous response and resolve to `executed` or `failed` only through the persisted execution identity.

### 6.10 Bundle Buy

Required:
- `/bundle add <mintA> <SOL> <mintB> <SOL> <min liquidity USD> [max market cap USD]`
- `/bundle` lists FTX baskets.
- Cancel goes through FTX.
- Execute button calls FTX `/api/frogx/trading-bot/bundle-buy/execute`.
- FTX preflights total SOL balance and every item risk/quote probe before any sequential swap starts.

Remaining work:
- Live-verify with an approved private run.
- Add better basket summary UX for many items.
- Privately verify bundle cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry or auto-resume.

Acceptance:
- Bundle execution requires `TRADING_BOT_BUNDLE_BUY_LIVE_EXECUTION_ENABLED=true`, base live gate, RPC SOL balance, risk/quote success for every item, stored Privy wallet match, no revocation, and signer config.
- FTX atomically claims a staged basket, persists attempted/confirmed counts, and rejects competing Execute/Cancel actions.
- Check Status reads only attempted Privy references and never resends. Fully confirmed baskets become `executed`; terminal or confirmed partial baskets become `failed`, and remaining items require a fresh basket.
- Ribbot records/renders only returned non-secret signatures, progress, and activity metadata.

### 6.11 Sniper

Required:
- `/sniper add <source> <max SOL> <min liquidity USD> <max snipes>`
- `/sniper` list/cancel FTX configs.
- `/settings sniper on|off` controls the FTX-stored account opt-in.
- FTX monitors Jupiter Tokens V2 recent first-pool launches, records a no-trade baseline cursor, deduplicates processed mints, and matches `any|pump|raydium|moonshot` against Jupiter launchpad classification.
- Eligible live buys can only route through FTX `/execute` and Privy after the separate sniper/base/monitor gates, account opt-in, max-snipes/spend/cooldown, token-authority, liquidity, market-cap, SOL balance, market-risk, and quote-probe checks pass.
- `/sniper/status` performs GET-only Privy reconciliation and never executes or resends.

Remaining work:
- Configure `JUPITER_API_KEY` and privately verify representative live feed samples without enabling live execution.
- Confirm source-filter coverage against Jupiter's current launchpad values; unsupported or unclassified launchpads must continue to fail source-specific filters.
- Privately verify sniper cases through the completed evidence-only operator queue and privately enable/verify the completed alert delivery; do not add blind retry.
- Run one tiny approved private live test only after all FTX/Privy gates and rollback criteria are reviewed.

Acceptance:
- Existing pools at monitor startup are never traded, and dry-run observations cannot be retroactively executed.
- Every sniper execution routes through FTX `/execute` and Privy; Ribbot stores only non-secret state.
- Ambiguous, duplicate, unclassified, over-cap, cooldown-blocked, or unsafe launches fail closed.
- All sniper monitor/live gates and account opt-in default false.

### 6.12 Referrals And Rewards

Required:
- `/referral`, `/referral <code>`, `/rewards`, `/start <code>` fetch/apply FTX referral metadata.
- Current rewards are tracking-only.

Remaining work:
- Decide if fee share or payout is in scope.
- If in scope, design a separate FTX-owned accounting and payout system with explicit legal/product approval.

Acceptance:
- No fee share, payout, claimable balance, signing, transfer, or on-chain claim state exists until explicitly implemented.

### 6.13 FTX Web App

Required:
- FTX web surfaces must feel like one exchange product and use consistent navigation, account state, spacing, controls, and responsive behavior.
- `/profile` must use only real connected-wallet, Tapestry, trade-history, and owned-NFT data for user metrics.
- Disconnected, loading, upstream-error, no-profile, empty-collection, and populated profile states must remain distinct.
- Profile-frog selection may write only through the existing FTX/Tapestry boundary; no private wallet material belongs in the page.

Remaining work:
- Carry the profile and `/ribbot` pages' quieter operational design into the home swap, leaderboard, and perps surfaces without erasing their domain-specific workflows.
- Replace the shared placeholder XP chip with authoritative XP data or remove it.
- Add wallet-signature authorization to mutable profile operations before treating profile writes as production-secure identity controls.

Acceptance:
- No synthetic points, rank, badge, balance, PNL, or execution state is presented as real account data.
- Desktop and mobile browser checks prove no horizontal overflow, text clipping, incoherent overlap, or unreachable controls.
- UI tests, typecheck, and production build pass.

## 7. Environment And Gates

FTX secrets/vars:
- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_AUTHORIZATION_KEY_ID`
- `PRIVY_AUTHORIZATION_PRIVATE_KEY`
- `PRIVY_WALLET_POLICY_IDS`
- `RIBBOT_TRADING_BOT_TOKEN`
- `SOLANA_RPC_URL`
- Optional Titan/Jupiter env required by existing quote/risk paths.

Ribbot vars:
- `TG_TRADER=true`
- `FROGX_API_BASE_URL=<FTX API base URL>`
- `RIBBOT_FTX_API_TOKEN=<matches FTX RIBBOT_TRADING_BOT_TOKEN>`
- `RIBBOT_TRADING_ENABLED=true` for live Telegram confirmations.
- `RIBBOT_TRADING_DRY_RUN=false` for live Telegram confirmations.
- `RIBBOT_ACTIVITY_ALERTS_ENABLED=false` by default; explicit `true` enables the read-only FTX activity poller only when `TG_TRADER` and the FTX token are also configured.
- Optional bounded alert tuning: `RIBBOT_ACTIVITY_ALERT_POLL_INTERVAL_MS=30000`, `RIBBOT_ACTIVITY_ALERT_MAX_USERS_PER_POLL=25`, and `RIBBOT_ACTIVITY_ALERT_MAX_EVENTS_PER_MESSAGE=5`.

FTX live gates:
- `TRADING_BOT_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_SCHEDULER_ENABLED=false` by default.
- `TRADING_BOT_SCHEDULER_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_SCHEDULER_RECONCILE_AFTER_SECONDS=60` by default; this is a race-window delay, not a retry timer.
- `TRADING_BOT_ADVANCED_MONITOR_ENABLED=false` by default.
- `TRADING_BOT_COPYTRADE_MONITOR_ENABLED=false` by default.
- `TRADING_BOT_COPYTRADE_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_SNIPER_MONITOR_ENABLED=false` by default.
- `TRADING_BOT_SNIPER_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_SNIPER_COOLDOWN_SECONDS=60` by default.
- `JUPITER_API_KEY` is required for the recent-pool monitor; `JUPITER_TOKENS_API_URL` defaults to Jupiter Tokens V2 recent.
- `TRADING_BOT_AUTO_BUY_MONITOR_ENABLED=false` by default.
- `TRADING_BOT_AUTO_BUY_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_BUNDLE_BUY_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_AUTO_SELL_MONITOR_ENABLED=false` by default.
- `TRADING_BOT_AUTO_SELL_LIVE_EXECUTION_ENABLED=false` by default.
- `TRADING_BOT_ADVANCED_RECONCILE_AFTER_SECONDS=60` before GET-only reconciliation of an ambiguous copytrade/auto attempt.
- `TRADING_BOT_MANUAL_REVIEW_AFTER_SECONDS=900` before any still-unresolved direct, scheduled, bundle, or advanced execution is flagged for operator review. This flag never retries or changes lifecycle state.
- `TRADING_BOT_OPERATOR_TOKEN` is a separate Worker secret for operator review list/acknowledge/reconcile routes. Never expose it to Ribbot or browser code.

## 8. Prioritized Remaining Work

Current code checkpoint (2026-07-12): Trojan-style account-level Auto Buy on pasted contract addresses is complete locally. It is a separate default-off FTX profile, uses `/autobuy instant on|off`, fails closed through FTX market-risk checks, tags final execution for a second authoritative FTX check, and is editable in the FTX `/ribbot` workspace. It has not been deployed or live-verified.

P0: Product hardening before live use
- Core menu/mode/preset/confirmation and position-management coherence is complete; continue tightening errors and long-tail automation callbacks.
- Managed copytrade sizing, filters including Pump bonding-curve exclusion, pause/resume, edit, and duplicate are complete at code level.
- Continue the FTX web-app revamp from the completed `/profile` and `/ribbot` milestones across the home swap, leaderboard, perps, and shared shell.
- Ensure every command has Menu/Back/Cancel paths where useful.
- Ensure no command silently falls through to LLM when it should be deterministic.
- Ensure all failure messages say whether FTX did not execute, Ribbot did not sign, or a live gate is missing.
- Configure and privately verify the completed operator review queue/runbook only after approval; privately enable/verify the completed push alert delivery and design an operations dashboard without ever reusing the original send.
- Keep tests green and docs current.

P1: Live verification preparation
- Write a private live-run checklist that does not expose secrets.
- Verify FTX Worker secrets are configured through Cloudflare without printing values.
- Verify Ribbot has only `RIBBOT_FTX_API_TOKEN`, not Privy secrets.
- Prepare tiny funded wallet and test token plan.
- Run market buy/sell, withdrawal, auto-sell, auto-buy, copytrade, and bundle-buy private live checks only after AKLO approval.

P2: True Privy account management
- Code-level Telegram-authenticated claim/export and signer remove/restore controls are complete as of 2026-07-10.
- Configure and privately live-verify the Privy Dashboard/domain/public-ID prerequisites using `plans/privy-account-control-live-checklist.md` only after approval.
- Preserve FTX-side bot-access revocation as a fast local safety layer.

P3: Live scheduled execution
- Code-level execution through FTX `/execute`, atomic claims, Privy idempotency keys, status transitions, DCA slice identities, read-only Privy reconciliation, stale-write rejection, and mocked trigger/reconciliation coverage are complete as of 2026-07-10.
- Live-verify limit/stop/trailing/DCA only after AKLO approves real Privy credentials, a funded wallet, and Solana sends.
- Privately verify scheduled cases through the shared operator queue/runbook; keep automatic resends prohibited.

P4: Sniper
- Code-level FTX-only Jupiter recent-pool monitoring, risk/cap/cooldown/account gates, atomic execution, read-only reconciliation, Ribbot opt-in/status rendering, and false-by-default live gate are complete as of 2026-07-10.
- Privately verify live Jupiter launchpad classification and one tiny gated execution only after AKLO approves credentials, funding, deployment target, and on-chain sends.
- Privately verify sniper cases through the shared operator queue/runbook and privately enable/verify the completed alert delivery; keep automatic resends prohibited.

P5: Production analytics/reconciliation
- Code-level bounded confirmed wallet-balance-flow indexing for PNL/activity is complete as of 2026-07-10; privately verify real transaction shapes before relying on it in production.
- Add historical USD valuation and realized/FIFO accounting if those product semantics are required.
- Add richer per-token metadata/decimals display.
- Add operational dashboards/alerts for failures and revoked accounts.

## 9. Verification Matrix

Run these after implementation changes:

FTX:
```bash
cd ../ftx
apps/api/node_modules/.bin/vitest run apps/api/src/tradingBot.test.ts apps/api/src/airdrop.test.ts
git diff --check
```

FTX Worker dry-run:
```bash
cd ../ftx/apps/api
node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/ftx-api-dry-run
```

FTX UI:
```bash
cd ../ftx/apps/ui
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit -p tsconfig.json
node_modules/.bin/next build
```

Ribbot:
```bash
cd .
node_modules/.bin/vitest run packages/client-telegram/src/trading/copyTradeCommand.test.ts packages/client-telegram/src/trading/frogx.test.ts packages/client-telegram/src/trading/state.test.ts packages/client-telegram/src/trading/TradingBot.policy.test.ts packages/client-telegram/src/trading/positionView.test.ts
corepack pnpm --filter @elizaos/client-telegram run build
(cd packages/client-telegram && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json)
git diff --check
```

The tsc step matters: the tsup build transpiles without type-checking, and it previously hid a real runtime bug (`settings.priorityFee` vs `priorityFeeLamports`). Keep the trading module at zero `tsc --noEmit` errors.

Optional stale-language search:
```bash
rg -n "Privy secret|private key|signer key|bundle-buy is staged metadata only|sniper/bundle|non-executing" .
```

Do not use a green build as proof of live readiness. Live readiness requires private live tests with explicit approval and real confirmation evidence.

## 10. Definition Of Done

The project is done only when all of these are true:

- Ribbot provides the implemented Telegram trading UX for Simple/Advanced modes, configurable buy/sell presets, active-wallet selection, buy/sell, positions, PNL, activity, settings, watchlists, cleanup, safety, scans, withdrawals, limit/stop/trailing/DCA, copytrade, auto-buy, auto-sell, multi-token basket buy, sniper, referrals, and account control. Full parity still requires the explicitly incomplete multi-wallet operations and true multi-wallet Bundle Buy above.
- Every wallet/trading operation routes through FTX/FrogX.
- FTX owns Privy, signing, broadcast, execution gates, automation monitors, and durable account/event state.
- Ribbot has no Privy secrets, signer secrets, private keys, policy secrets, or transaction signing/broadcast code.
- All live paths fail closed by default and require explicit FTX gates.
- Ambiguous direct, scheduled, copytrade, auto-buy, auto-sell, and bundle sends remain locked for read-only reconciliation; no status check, retry handler, cron, or callback blindly resends a Privy transaction or auto-resumes a partial basket.
- Code-level tests pass for disabled gates, auth, invalid input, revocation, quote-only wallets, and mocked successful execution.
- Worker dry-run passes.
- Ribbot package build passes.
- FTX UI tests, typecheck, production build, and representative desktop/mobile browser checks pass.
- Private live verification has been completed for market buy/sell, withdrawals, copytrade, auto-buy, auto-sell, bundle-buy, scheduled orders, and sniper if sniper live execution is in scope.
- FTX `/ribbot` implements code-level Privy-authenticated claim/export and signer remove/restore UX; production acceptance additionally requires the no-secret private checklist to pass after explicit approval.
- Docs and changelogs accurately describe the final behavior.

## 11. Continuation Checklist

1. Inspect `git status --short` in both `../ftx` and `.`.
2. Read `../ftx/AGENTS.md`, `../ftx/CHANGELOG.md`, `CHANGELOG.md`, and `plans/trojan-style-trading-bot.md`.
3. Inspect current FTX routes and Ribbot command handlers before editing.
4. Pick the next unfinished P0/P1 item from this PRD.
5. Keep all changes scoped to the FTX/Ribbot boundary.
6. Run the verification matrix.
7. Update `CHANGELOG.md` and `plans/trojan-style-trading-bot.md` when behavior changes.
8. Do not deploy or run live tests without AKLO's explicit approval.
