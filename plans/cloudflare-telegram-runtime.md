# Move Ribbot's Telegram runtime to Cloudflare

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows the active ExecPlan standard and builds on the product and safety boundaries in `plans/trojan-style-trading-bot.md`.

## Purpose / Big Picture

Ribbot currently starts as a long-running Node process that polls Telegram and writes its non-secret cache to a local JSON file. After this change, Telegram will deliver updates to a Cloudflare Worker webhook, a Cloudflare Durable Object will serialize each update and persist the non-secret cache in SQLite, and scheduled or delayed checks will use Cloudflare cron and Durable Object alarms. No Mac, including the Mac Mini, will need to remain online for Ribbot to answer Telegram users.

The user-visible proof is a production Worker health endpoint that returns HTTP 200 and a Telegram webhook whose registered URL points at that Worker. Sending `/start` to the bot must return Ribbot's onboarding menu, including the disabled “Spot Trading — Coming Soon” action. Replaying the same Telegram update ID must not produce a second reply or a second FTX request.

## Progress

- [x] (2026-08-10 01:45Z) Audited the standalone Telegram process, local JSON state, activity polling, Frog confirmation timers, FTX authentication boundary, and current Cloudflare deployment configuration.
- [x] (2026-08-10 01:50Z) Chose a webhook Worker plus a single SQLite-backed Durable Object, with at-most-once Telegram update processing and no Mac Mini runtime.
- [x] (2026-08-10 02:00Z) Implemented memory-backed `TradingStateStore` operation and durable bulk-sell prompt state while preserving the existing local-file standalone mode.
- [x] (2026-08-10 02:10Z) Implemented the Worker webhook, durable update ledger, SQLite user cache, scheduled maintenance, bounded Frog confirmation alarms, and focused tests.
- [x] (2026-08-10 02:05Z) Proved the Worker bundle, Ribbot tests, type checks, and FTX `/ribbot` UI checks pass: 44 focused Ribbot tests, both Ribbot TypeScript targets, a 117.5 KiB gzip Wrangler bundle with no Sharp/libvips code, six FTX page tests, FTX TypeScript, and the production FTX Cloudflare build.
- [x] (2026-08-10 02:15Z) Audited repository privacy and visibility, committed private Ribbot as `25f2e21` and public FTX as `5cb4960`, and pushed both to GitHub with each repository zero commits behind its remote.
- [x] (2026-08-10 02:20Z) Deployed FTX Pages deployment `6be72fd9` and Ribbot Worker version `0251c825-b026-417c-9c89-319290e149b4` from the laptop without starting a Mini process.
- [x] (2026-08-10 02:30Z) Added and deployed FTX's non-breaking Cloudflare service-credential path as public commit `2971ce8`; all 280 API tests passed and production Worker version `fcdd8db3-1984-4784-99dc-6c835fe1d34e` accepted the new credential.
- [x] (2026-08-10 02:35Z) Bound all three Ribbot production secrets through Cloudflare's secret manager. The Telegram token moved once through a zero-output pipe from the verified `llphant` secret file; it was not copied to the laptop or a repository. Production health now returns HTTP 200.
- [ ] Register and verify the Telegram webhook. Paused because `getWebhookInfo` reports 116 pending updates: registration without dropping them may generate stale replies, while dropping them is irreversible and needs explicit approval.

## Surprises & Discoveries

- Observation: FTX already authenticates Ribbot with the Worker secret `RIBBOT_TRADING_BOT_TOKEN` and accepts the legacy alias `FROGX_BOT_API_TOKEN`; its API contract does not need to move.
  Evidence: `ftx/apps/api/src/robinhoodAlpha.ts` reads those bindings and compares the request's Bearer token.

- Observation: Ribbot's local cache uses synchronous `node:fs`, while Cloudflare's mutable virtual filesystem is request-local and is not durable state.
  Evidence: `packages/client-telegram/src/trading/state.ts` writes one JSON file after each mutation. The Cloudflare runtime therefore needs an explicit durable adapter rather than a path change.

- Observation: the current shell has Cloudflare account credentials but does not expose either `TELEGRAM_BOT_TOKEN_RIBBOT` or `RIBBOT_FTX_API_TOKEN`.
  Evidence: a presence-only environment audit reported the Cloudflare account variables present and both Ribbot secret variables absent; no secret value was read.

- Observation: Frog contact sheets use the native `sharp` module, which is not required for correct trading behavior and should not be bundled into the Worker.
  Evidence: `TradingBot.ts` can already fall back to text when a contact sheet is unavailable. The Node runtime will continue receiving the renderer by dependency injection; the Worker will use text or the original NFT URL.

- Observation: Wrangler 4.120.0's bundled local runtime supports compatibility dates through 2026-08-08, one day earlier than the work date.
  Evidence: the first local start rejected `2026-08-09`; changing only `wrangler.toml` to `2026-08-08` started the Worker successfully without losing required Node compatibility.

- Observation: GitHub publication did not update the production FTX page, and direct Wrangler deployment cannot authenticate from the laptop.
  Evidence: the public `/ribbot` JavaScript chunk still contains the old “Set up Spot & NFT trading” copy after both pushes; Wrangler 3.114.15 and 4.120.0 both report that the saved auth is expired, and `CLOUDFLARE_API_TOKEN` is absent.

- Observation: Telegram has 116 pending updates and no existing webhook.
  Evidence: the read-only `getWebhookInfo` response returned an empty URL and `pending_update_count: 116`. The attempted cutover was rejected before execution; Telegram configuration is unchanged.

## Decision Log

- Decision: keep FTX as the only execution, Privy, signing, and policy control plane; move only Telegram delivery, non-secret cache persistence, and Telegram-side scheduling into Ribbot's Cloudflare Worker.
  Rationale: this preserves every existing live-trading gate and avoids duplicating security-sensitive execution state.
  Date/Author: 2026-08-10 / LLPhant

- Decision: use one named `RibbotCoordinator` Durable Object with SQLite storage instead of per-user objects.
  Rationale: Telegram updates are naturally ordered through one webhook, global activity polling needs to enumerate users, and one serialized coordinator makes duplicate suppression and alarm scheduling straightforward. FTX remains authoritative for account and execution state, so the Ribbot database remains a bounded non-secret cache.
  Date/Author: 2026-08-10 / LLPhant

- Decision: record an update ID before handling it and never automatically replay a failed update.
  Rationale: at-most-once behavior is safer than an accidental duplicate trade request. A transient failure receives a bounded error response and requires a new explicit user action; read-only FTX status checks remain available for ambiguous executions.
  Date/Author: 2026-08-10 / LLPhant

- Decision: retain the standalone Node entry point for local checks but do not deploy or start it on the Mac Mini.
  Rationale: it remains a useful development fallback and its file-backed state tests protect compatibility, while production ownership moves completely to Cloudflare.
  Date/Author: 2026-08-10 / LLPhant

- Decision: add a second FTX credential for the Cloudflare Worker instead of rotating the unretrievable legacy token.
  Rationale: the additive `RIBBOT_CLOUDFLARE_TOKEN` path gives Cloudflare an independently managed credential without breaking an unknown legacy client or changing any execution gate.
  Date/Author: 2026-08-10 / LLPhant

## Outcomes & Retrospective

Implementation, publication, Cloudflare deployment, and secret binding are complete. FTX accepts the new additive service credential, Ribbot health returns HTTP 200, Telegram identifies the migrated token as `@HeyRibbot` ID `8352807424`, and the verified Mini has no Ribbot application process or launcher. Webhook activation remains paused with Telegram unchanged because its 116 pending updates require an explicit delete-or-deliver decision; no `/start` message or other Telegram reply has been sent.

## Context and Orientation

The private `ribbot` repository contains the Telegram client. `packages/client-telegram/src/standalone.ts` is the current polling process. `packages/client-telegram/src/trading/TradingBot.ts` parses commands, renders menus, calls FTX, and owns process-local timers. `packages/client-telegram/src/trading/state.ts` stores a non-secret local cache. `packages/client-telegram/src/trading/activityAlerts.ts` performs one bounded FTX activity poll and also exposes an interval-based Node wrapper.

The public sibling `ftx` repository is the product and execution control plane. Its Cloudflare Worker owns account records, Privy wallet policy, signing, broadcast, reconciliation, and all live gates. Ribbot calls it with a shared Bearer token. This plan does not change any FTX trading flag, wallet, signer, transaction, or execution policy.

A Cloudflare Worker is request-driven JavaScript hosted by Cloudflare. A Durable Object is a single-threaded Cloudflare object with durable storage; here it prevents two Telegram updates from mutating the cache concurrently. An alarm is a Durable Object callback scheduled for a future time; here it replaces the three-second process timer used to reconcile submitted Frog trades. A cron trigger invokes bounded maintenance every minute and replaces the process interval used for activity alerts.

## Plan of Work

First, update `packages/client-telegram/src/trading/state.ts` so `TradingStateStore` can be constructed from an in-memory snapshot, can export a safe snapshot, and only touches the filesystem when given a file path. Move the two-minute bulk-sell prompt deadline into `TradingUser` so it survives separate webhook requests.

Next, update `packages/client-telegram/src/trading/TradingBot.ts` to accept injected state and an optional Frog contact-sheet renderer. Expose one bounded activity poll and one bounded pass over pending Frog confirmations. Disable process timers in Worker mode while preserving them in standalone mode. Update `standalone.ts` and `telegramClient.ts` to inject the existing Sharp renderer so Node behavior remains unchanged.

Then add `packages/client-telegram/src/worker.ts` and `packages/client-telegram/wrangler.toml`. The public Worker accepts `GET /health` and `POST /telegram` only. The webhook route rejects a missing or incorrect `X-Telegram-Bot-Api-Secret-Token`, rejects invalid JSON or an invalid update ID, and forwards valid updates to the named coordinator. The coordinator initializes SQLite tables for users, processed update IDs, and metadata; it suppresses duplicates, loads only the relevant user for an update, calls Telegraf, and persists the resulting cache. Its alarm reconciles pending Frog tickets, and its maintenance route runs one activity pass, prunes old update IDs, and reschedules an alarm if work remains.

Finally, add focused tests for authentication, duplicate suppression, state persistence, and Spot's no-action response. Run a Wrangler dry-run bundle to prove that native Sharp is absent from the Worker graph. After privacy checks and commits, deploy the FTX UI with its existing Pages command and deploy Ribbot with Wrangler. Production activation requires setting `TELEGRAM_BOT_TOKEN`, `RIBBOT_FTX_API_TOKEN`, and a newly generated `RIBBOT_WEBHOOK_SECRET` as Worker secrets, then calling Telegram `setWebhook` with the Worker URL, matching secret token, and allowed message and callback updates. Because Telegram currently retains pending updates, the queue disposition must be explicitly approved before this final call.

## Concrete Steps

Work from the `ribbot` repository root unless a command explicitly names the sibling FTX repository.

After implementation, run:

    pnpm exec vitest run packages/client-telegram/src/trading/TradingBot.beta.test.ts packages/client-telegram/src/worker.test.ts
    pnpm exec tsc --noEmit -p packages/client-telegram/tsconfig.json
    WRANGLER_LOG_PATH=/tmp/ribbot-wrangler.log wrangler deploy --dry-run --config packages/client-telegram/wrangler.toml

The focused tests must pass, TypeScript must exit zero, and Wrangler must report a successful bundle without importing `sharp`.

For the FTX UI, work from the sibling `ftx` repository root and run:

    pnpm --filter @frogx/ui test --run apps/ui/src/app/ribbot/page.test.tsx
    pnpm --filter @frogx/ui typecheck
    pnpm --filter @frogx/ui build:worker

Before either deploy, fetch the remote, verify the local branch is not behind, verify repository visibility, inspect the staged diff and tracked file names for private/global context, commit, and push. Do not SSH to, clone on, start on, or restart the Mac Mini.

## Validation and Acceptance

Automated acceptance requires a valid webhook secret to receive HTTP 200 from a valid update and HTTP 401 from a missing or incorrect secret. Sending the same update ID twice must produce one Telegram handler invocation. A first update must create a durable user row, and a later coordinator instance must reload it. The `/spot` command and Spot callback must only render “coming soon” and must not call FTX.

Production acceptance requires `GET <worker-url>/health` to return HTTP 200 with a JSON body identifying Ribbot and a healthy coordinator. Telegram `getWebhookInfo` must report the exact Worker `/telegram` URL, zero pending updates after cutover, and no recent delivery error. A private `/start` message must return the onboarding menu. No process or service is to be started on the Mac Mini as part of this plan.

## Idempotence and Recovery

Schema creation uses `CREATE TABLE IF NOT EXISTS`, update IDs are unique, and webhook registration is replace-in-place, so deployment and activation can be retried. If the Worker deploys but activation cannot complete, leave Telegram on its prior state rather than registering an unverified webhook. If activation fails after webhook replacement, call Telegram `deleteWebhook` to stop deliveries; do not start the Mini fallback without a new explicit instruction. Cloudflare deployment rollback uses the previous Worker version, while the SQLite cache is retained. Because FTX is authoritative for execution and account data, cache loss must not cause a transaction resend.

## Artifacts and Notes

Expected health response:

    {"ok":true,"service":"ribbot","runtime":"cloudflare"}

Required secret bindings, named only and never committed, are `TELEGRAM_BOT_TOKEN`, `RIBBOT_FTX_API_TOKEN`, and `RIBBOT_WEBHOOK_SECRET`. The production FTX API secret paired with the Cloudflare Worker is the additive `RIBBOT_CLOUDFLARE_TOKEN`; legacy `RIBBOT_TRADING_BOT_TOKEN` and `FROGX_BOT_API_TOKEN` credentials remain accepted and unchanged.

## Interfaces and Dependencies

`TradingStateStore` must expose a memory constructor or factory and `exportSnapshot(): StoreShape`. `TradingBot` must accept options containing `store`, `buildFrogContactSheet`, and `scheduleFrogConfirmations`; it must expose `pollActivityAlertsOnce()` and `reconcilePendingFrogTrades()` without exposing signing or execution internals.

The Worker exports the default `fetch` and `scheduled` handlers plus the `RibbotCoordinator` Durable Object class required by Wrangler. Its environment interface contains the Durable Object binding, the three secrets named above, `TG_TRADER`, the existing Ribbot/FTX feature flags, and the FTX API base URL. Telegraf remains the Telegram transport library. Cloudflare SQLite is the only production persistence added by this migration.

Plan revision note (2026-08-10): created after the runtime and credential audit to make the Mac-to-Cloudflare migration restartable and to document the production activation blocker without copying secret material.

Plan revision note (2026-08-10): updated after implementation and the local Worker/Durable Object acceptance pass; recorded the supported compatibility date and narrowed the remaining work to final verification, publication, secret binding, and webhook activation.

Plan revision note (2026-08-10): updated after GitHub publication and the failed production authentication gate; recorded exact commits, the unchanged public page, and the approval-gated Cloudflare/Ribbot credential blockers.

Plan revision note (2026-08-10): updated after Cloudflare deployment and secret activation; replaced obsolete authentication blockers with the observed 116-update Telegram queue decision and recorded that no webhook write or Mini process occurred.
