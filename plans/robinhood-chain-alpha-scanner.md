# Build a Robinhood Chain profitable-wallet alpha scanner with Ribbot signals

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows the global LLPhant execution-plan standard in `~/.codex/PLANS.md`. It governs coordinated changes in the sibling `ftx` and `ribbot` repositories inside the SolanaBFS umbrella workspace.

## Purpose / Big Picture

Ribbot should surface read-only Robinhood Chain alpha signals modeled on the linked Solana scanner: periodically find the chain's strongest new pools, identify their most active profitable buyers, reject noisy or low-evidence wallets, and emit a signal when several qualified wallets buy the same fresh token in a short window. A user should be able to run `/alpha` to inspect the latest signals and roster health, opt into proactive notifications with `/alpha on`, and opt out with `/alpha off`. This feature must never build, sign, broadcast, or automatically execute a Robinhood Chain transaction.

FTX/FrogX owns chain ingestion, scoring, global roster state, signal deduplication, and the authenticated read API. Ribbot owns Telegram commands, per-user opt-in state, notification cursors, presentation, and delivery. Every live scanner and proactive-alert loop remains disabled by default until separately configured and deployed.

## Progress

- [x] (2026-07-21 02:49Z) Read project rules, prior changelogs, runtime architecture, and the linked X post.
- [x] (2026-07-21 02:49Z) Verified Robinhood Chain mainnet and the live read-only data path through official chain docs, GeckoTerminal pool/trade APIs, DEX Screener, and Blockscout.
- [x] (2026-07-21 03:10Z) Implemented the FTX pure scoring engine, bounded GeckoTerminal ingestion, Durable Object state, authenticated signals route, and disabled-by-default scheduled runner.
- [x] (2026-07-21 03:10Z) Implemented the Ribbot API client, `/alpha` command family, opt-in state, durable cursors, and disabled-by-default proactive poller.
- [x] (2026-07-21 03:10Z) Added focused and regression coverage in both repositories; completed Ribbot TypeScript/build/no-network checks and the FTX Worker dry-run bundle.
- [x] (2026-07-21 03:10Z) Updated both repositories' changelogs, local memories, architecture, and operational rules; recorded verification evidence and remaining activation work here.
- [x] (2026-07-21 03:59Z) After explicit approval, pushed FTX `305f0ad` and Ribbot `96d189f`, deployed production `frogx-api`, enabled the Mini Ribbot alert override, rebuilt/restarted `com.solanabfs.ribbot`, and verified the live opt-in state.
- [x] (2026-07-21 03:59Z) Diagnosed production GeckoTerminal throttling and Workers-runtime fetch binding, shipped FTX fixes `c73cb7e` and `0bc1398`, and verified the first persisted production snapshot plus Ribbot baseline.

## Surprises & Discoveries

- Observation: Robinhood Chain mainnet is already live with chain ID 4663, although its public testnet announcement is only months old.
  Evidence: the official connection docs list mainnet RPC `https://rpc.mainnet.chain.robinhood.com`, explorer `https://robinhoodchain.blockscout.com`, and mainnet chain ID 4663.
- Observation: GeckoTerminal's Robinhood network adapter exposes pool trades with the originating transaction wallet, direction, USD volume, token addresses, and timestamp, which is enough for a read-only deterministic first implementation.
  Evidence: `GET https://api.geckoterminal.com/api/v2/networks/robinhood/pools/<pool>/trades` returned `tx_from_address`, `kind`, `volume_in_usd`, and `block_timestamp` for live Uniswap trades.
- Observation: the source concept asks for a 30-day backtest, but Robinhood Chain mainnet has not existed for 30 full days yet.
  Evidence: official/public launch references place mainnet launch on 2026-07-01; implementation began on 2026-07-21.
- Observation: a first live read-only scan correctly produces no roster or signals because the new store has not accumulated the required three-token wallet history.
  Evidence: the in-memory smoke scan observed 4 runner pools, 753 trades, and 286 candidate wallets, then returned 0 roster wallets, 0 signals, and provisional warnings rather than weakening thresholds.
- Observation: `pnpm` is not on this Mini workspace's `PATH`, although repository-local binaries are installed.
  Evidence: validation used the installed Vitest, TypeScript, tsup, and Wrangler binaries directly. The final 204-test FTX suite and Worker bundle passed; the standalone Ribbot package also typechecked and built.
- Observation: the full FTX TypeScript command currently reports 14 errors in pre-existing `tradingBot.ts` and test code outside this scanner change.
  Evidence: none of the reported diagnostics reference `robinhoodAlpha.ts`; the full 204-test regression and Wrangler Worker compilation pass. This remains an existing repository cleanup item rather than being silently described as clean.
- Observation: Cloudflare cron's first scanner runs hit GeckoTerminal HTTP 429 throttling, and concurrent pool-trade reads also triggered Cloudflare's stalled-response protection.
  Evidence: the filtered production tail captured both warnings. The corrected scanner serializes requests at 2.5-second intervals, consumes or cancels every response body, retries 429/5xx responses with bounded backoff, and retains explicit partial-success warnings.
- Observation: Workers requires global `fetch` to be invoked without an object receiver, unlike the Node test runtime.
  Evidence: the first paced production run failed with `Illegal invocation`; commit `0bc1398` destructures the fetch function before invocation and adds a receiver assertion to regression coverage.
- Observation: the first successful production scan remained useful despite later public-API throttling.
  Evidence: snapshot `2026-07-21T03:55:53.365Z` persisted 12 runner pools, 367 trades, 134 candidate wallets, 0 roster wallets, 0 signals, and explicit warnings for ten skipped pool feeds. Ribbot then recorded one opted-in user, one baseline, and zero delivery failures.

## Decision Log

- Decision: Treat this as a mainnet, signal-only system with no execution path.
  Rationale: the user asked for scanner signals, while the current Ribbot/FTX safety boundary reserves wallet and execution behavior for explicit, separately gated work.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Put chain ingestion and scoring in FTX and Telegram delivery in Ribbot.
  Rationale: this preserves the existing rule that FTX is authoritative for external chain data and global automation state while Ribbot remains a deterministic presentation client.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Use GeckoTerminal for bounded discovery and normalized trades, with public Robinhood/Blockscout links in output; do not scrape DEXTools or depend on a browser.
  Rationale: GeckoTerminal provides the required transaction-origin fields through a stable JSON API, while DEXTools' user-facing site is useful corroboration but is not needed at runtime.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Configure a rolling 30-day scoring window but report the actual observed-day depth and fail closed on low samples.
  Rationale: this implements the intended window honestly without claiming history that cannot exist yet.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Keep scanner scheduling and proactive Telegram delivery disabled by default and require both an operator environment gate and `/alpha on` user opt-in.
  Rationale: periodic third-party reads and unsolicited Telegram sends need explicit operational activation, while manual `/alpha` reads remain deterministic and safe.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Let the initial production scan fail closed instead of fabricating a seed roster or lowering the three-token evidence threshold.
  Rationale: the concept depends on repeated profitable behavior. A new deployment needs to accumulate real observations before any convergence notification is credible.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Preserve a scan when at least one selected pool trade feed succeeds, while labeling every skipped feed; fail closed only when every selected trade feed fails.
  Rationale: anonymous GeckoTerminal throttling is per-request and can affect later pools after valid earlier responses. Discarding valid observations would make the global roster less durable without improving honesty.
  Date/Author: 2026-07-21 / LLPhant
- Decision: Deploy the FTX fixes from a clean temporary checkout after unrelated context-maintenance changes appeared in the primary worktree.
  Rationale: this obeyed the clean-tree release requirement without deleting, stashing, committing, or overwriting another process's `.claude` and `.codex/context-archive` changes.
  Date/Author: 2026-07-21 / LLPhant

## Outcomes & Retrospective

The read-only MVP is implemented across FTX and Ribbot. FTX now owns bounded Robinhood Chain runner/trade ingestion, rolling state, profitable-wallet scoring, behavioral filtering, convergence signals, and an authenticated public snapshot. Ribbot now owns `/alpha` presentation, explicit opt-in/out, durable delivery cursors, initial baselining, bounded polling, exactly-once delivery after success, and retry backoff.

The core loop from the source concept is preserved: runner discovery, top-100 observed buyers per runner, rolling performance evidence, rejection of one-hit/spray/copy-correlated wallets, roster formation, and a four-wallet fresh-token signal. One enrichment remains intentionally incomplete: exact shared-funder/bundler graph detection needs archive funding-graph data, so the live result labels that limitation instead of claiming parity it cannot prove.

Verification completed with 204/204 FTX Worker tests, 80/80 Ribbot package tests, a clean Ribbot package TypeScript check, successful FTX Wrangler and Ribbot standalone bundles, a Ribbot standalone no-network check, a live read-only in-memory scan, and the persisted production snapshot described above. The full FTX TypeScript command remains non-clean because of 14 pre-existing unrelated diagnostics noted above.

Production activation is complete. `frogx-api` final Worker version `be3fc991-1f14-40f6-983b-1db7adc6e52a` runs commit `0bc1398` with the scanner override on. Mini `com.solanabfs.ribbot` runs the built `96d189f` release with its LaunchAgent alpha-alert override on. AKLO's `/alpha on` state is persisted and baselined; there were no delivery failures. No signal was sent because the initial roster and signal sets are empty, and no chain transaction, wallet action, signing, or broadcast occurred.

## Context and Orientation

The FTX Worker lives in sibling repository `ftx`, with request routing and scheduled events in `apps/api/src/index.ts`, environment types in `apps/api/src/env.ts`, and the existing global trading-bot Durable Object in `apps/api/src/tradingBot.ts`. A Durable Object is a Cloudflare Worker component that serializes access to persistent SQLite state; this plan reuses the existing binding instead of creating a new deployment migration.

Ribbot lives in this repository. Production uses the standalone Telegraf entrypoint `packages/client-telegram/src/standalone.ts`. Deterministic commands are handled in `packages/client-telegram/src/trading/TradingBot.ts`, FTX HTTP calls are in `packages/client-telegram/src/trading/frogx.ts`, durable non-secret Telegram state is in `packages/client-telegram/src/trading/state.ts`, and the existing activity-alert lifecycle provides the pattern for a bounded, retry-safe poller.

The scanner's “runner” is a fresh or trending liquidity pool with enough real USD liquidity and volume to analyze. A “roster wallet” is a transaction-origin address with enough distinct token observations, positive estimated returns, and an acceptable win rate after deterministic filters. A “convergence signal” is created only when at least four unique roster wallets make buy trades for the same fresh token inside the configured time window. Estimated returns are research signals, not audited tax-lot accounting or investment advice.

## Plan of Work

In FTX, add a focused `apps/api/src/robinhoodAlpha.ts` module containing the external JSON adapters, pure scoring and filter functions, bounded scan orchestration, response types, and authenticated read projection. Store a bounded scanner snapshot in the singleton trading-bot Durable Object using a small internal GET/PUT endpoint. Route `GET /api/frogx/trading-bot/robinhood-alpha` through existing Ribbot bearer authentication. Call the scan runner from the existing five-minute scheduled event, but have the runner immediately return unless `ROBINHOOD_ALPHA_SCANNER_ENABLED=true`; when enabled, its persisted `nextScanAt` enforces the configured scan cadence. No scanner code may call execution, Privy, wallet, swap, or transaction-submission paths.

The pure engine will combine new and trending pools, filter obviously unusable pools, fetch a bounded number of recent trades per selected pool, rank up to 100 buyers per runner by USD buy volume, and maintain rolling wallet/token observations. It will reject low-evidence one-hit wallets, launch sprayers, negative-return wallets, low-win-rate wallets, and addresses with excessive same-second correlation. It will deduplicate wallet addresses, pool trades, and signal keys. Output includes the exact thresholds, observed history depth, data-source warnings, roster summaries, and Blockscout/GeckoTerminal links so Ribbot never implies certainty.

In Ribbot, add typed `fetchRobinhoodAlphaSignals` support, a small pure presentation module, and an `AlphaSignalPoller` patterned after the existing activity poller. Extend non-secret user state with `alphaSignalsEnabled` and a bounded delivery cursor. Add `/alpha`, `/alpha on`, `/alpha off`, and `/alpha status`; manual reads show current scanner state, while the poller only selects opted-in users and only runs when `RIBBOT_ALPHA_ALERTS_ENABLED=true`. The first successful poll baselines existing signals, later polls deliver each unseen signal once, and failed Telegram deliveries keep the signal unseen with exponential retry backoff.

Finally, document false-by-default configuration, update repository changelogs and architecture snapshots, and run focused tests followed by full typecheck/build checks proportionate to each repository. Production overrides require separate explicit approval, which AKLO supplied on 2026-07-20.

## Concrete Steps

Work in `ftx`:

    cd /Users/llphant/projects/solanaBFS/ftx
    cd apps/api
    node_modules/.bin/vitest run src
    node_modules/.bin/wrangler deploy --dry-run --outdir /private/tmp/frogx-alpha-wrangler-20260721-2

Work in `ribbot`:

    cd /Users/llphant/projects/solanaBFS/ribbot
    node_modules/.bin/vitest run packages/client-telegram
    node_modules/.bin/tsc --noEmit -p packages/client-telegram/tsconfig.json
    cd packages/client-telegram
    ../../node_modules/.bin/tsup src/standalone.ts --format esm --out-dir dist-standalone --clean --sourcemap
    TELEGRAM_BOT_TOKEN=test-token RIBBOT_FTX_API_TOKEN=test-token TG_TRADER=true node dist-standalone/standalone.js --check

The checked-in runner itself was not invoked because it sources the guarded local secret store; the built standalone's `--check` path proves configuration without reading that file or contacting Telegram/FTX.

Deploy commands, the Mini service restart, and both production overrides were executed only after AKLO explicitly approved the confirmed production targets. No test notification was sent; future direct messages are limited to newly detected signals for users who explicitly run `/alpha on`.

## Validation and Acceptance

FTX pure tests must prove that four qualified unique wallets inside the configured window create exactly one signal; three wallets do not; duplicate trades, copy-correlated wallets, spray wallets, one-hit wallets, and negative-return wallets do not qualify; rerunning identical input is idempotent; stale trades do not alert; low-sample history remains visibly provisional; and external/API failure retains the last good snapshot with an explicit warning.

FTX route tests must prove missing or wrong bearer authentication is rejected, missing Durable Object configuration returns a fail-closed status, and a ready snapshot returns no secret, wallet, signer, or execution field. The scheduled runner test must prove it is a no-op by default and honors `nextScanAt` when enabled.

Ribbot tests must prove command parsing and opt-in transitions, honest empty/not-configured/error copy, signal formatting with token and explorer links, initial baselining without delivery, exactly-once delivery after a new signal, per-user opt-out, and retry after a failed send. Existing trading tests, TypeScript validation, the standalone bundle, and the no-network runner check must still pass.

Acceptance is reached when `/alpha` can render a fixture-backed FTX snapshot, four qualifying test wallets produce one proactive message for an opted-in test user, no message is sent to an opted-out user, and all production gates remain false in checked-in configuration.

## Idempotence and Recovery

Every scan is keyed by normalized transaction identity and every signal by chain, token, roster-wallet set, and time bucket, so reruns are safe. Scanner state is bounded to the rolling window plus a limited recent-signal list. A failed scan never replaces the last good roster or signals; it only records failure metadata. Removing the new route and scheduled call leaves existing trading state untouched. Ribbot state migration is additive and defaults every existing user to opted out.

If production activation later causes excessive external reads, set `ROBINHOOD_ALPHA_SCANNER_ENABLED=false`; if Telegram delivery is noisy, set `RIBBOT_ALPHA_ALERTS_ENABLED=false`. Neither rollback changes trading or wallet gates. Do not delete Durable Object data as part of rollback.

## Artifacts and Notes

The linked source concept was recovered as: scan each day's runners every few hours; collect the top 100 traders per runner; filter copy bots, bundlers, farms, one-hit wallets, and launch sprayers; backtest survivors over 30 days; maintain a profitable roster; signal when four or more roster wallets buy the same fresh token in a tight window.

Robinhood mainnet constants verified during research are chain ID `4663`, native gas token `ETH`, wrapped ETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`, public RPC `https://rpc.mainnet.chain.robinhood.com`, and explorer `https://robinhoodchain.blockscout.com`.

## Interfaces and Dependencies

`ftx/apps/api/src/robinhoodAlpha.ts` exports serializable `RobinhoodAlphaSnapshot`, `RobinhoodAlphaSignal`, `RobinhoodAlphaWalletScore`, `RobinhoodAlphaPool`, `RobinhoodAlphaTrade`, `RobinhoodAlphaStoredState`, and `RobinhoodAlphaConfig` types; the pure `buildRobinhoodAlphaSnapshot` function; `runRobinhoodAlphaScanner(env)` for scheduled ingestion; and `getRobinhoodAlphaSignals(request, env)` for Ribbot reads. It uses Worker-native `fetch` and the existing Durable Object binding only. It adds no browser, Python runtime, wallet SDK, or execution dependency.

`ribbot/packages/client-telegram/src/trading/frogx.ts` must export the matching read-only result types and `fetchRobinhoodAlphaSignals`. `alphaSignals.ts` must export pure message projection plus `AlphaSignalPoller`. `state.ts` must expose opt-in and cursor methods that preserve the existing JSON schema. `TradingBot.ts` must own the command and callback presentation, while standalone startup/shutdown must manage both pollers through the existing `TradingBot` lifecycle.

Plan revision note (2026-07-21 02:49Z): Initial self-contained plan created after live source and data-path validation.

Plan revision note (2026-07-21 03:10Z): Marked implementation and verification complete, recorded live fail-closed smoke evidence, documented the shared-funder enrichment gap and existing FTX TypeScript diagnostics, and left deployment/activation explicitly out of scope pending approval.

Plan revision note (2026-07-21 03:59Z): Recorded explicit production approval, release commits and versions, Mini activation, GeckoTerminal/Workers corrections, the first persisted live snapshot, and successful Ribbot opt-in baselining.
