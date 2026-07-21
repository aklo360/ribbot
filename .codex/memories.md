# Ribbot Snapshot

Ribbot's production runtime is standalone Telegraf, not Eliza. The service
entrypoint is built from `packages/client-telegram/src/standalone.ts` and
started by `scripts/run-ribbot.zsh`.

The existing deterministic trading module remains feature-rich and routes all
wallet, account, quote, swap, position, order, automation, and execution calls
through FTX/FrogX. Ribbot holds no Privy app secret or signing key. The FTX
Worker owns Privy user lookup, managed-wallet matching/provisioning, policy
checks, signing, and transaction broadcast.

`/nfts [page]` plus `/collectibles` and `/frogs` render Solana Business Frogs
across every stored embedded Privy wallet through authenticated FTX. Ribbot sends
Telegram ID and pagination only; FTX owns wallet aggregation and the collection-
filtered DAS lookup. Menu buttons expose the view in both modes.

`/alpha` plus `/signals` and `/hoodalpha` render FTX's read-only Robinhood Chain
scanner snapshot. `/alpha on|off|status` controls a default-off per-user alert
preference. The lifecycle-owned poller baselines existing signals and advances a
durable exactly-once cursor only after successful Telegram delivery. FTX owns
market ingestion, wallet scoring, global roster/signal state, and the 30-day
window; Ribbot owns presentation and delivery only. Keep
`RIBBOT_ALPHA_ALERTS_ENABLED=false` without explicit activation approval. AKLO
approved the production override on 2026-07-20; the Mini LaunchAgent is live,
one user is opted in and baselined, and checked-in defaults remain false.

The next undeployed extension adds `/volume`, `/vol`, and `/pairs` plus concise
new-pair/high-volume/surge cards. Volume and convergence events use the same FTX
snapshot, opt-in, poll, backoff, and cursor; either command's `on|off` toggles the
shared feed. Deployment needs fresh approval because an already opted-in chat
would begin receiving a new proactive message category.

Production credential aliases are resolved by the runner. Ribbot-side trading
defaults to disabled and dry-run. FTX live execution and monitor gates are also
disabled. Do not change either set of gates without explicit approval.

The prior known managed wallet was not deleted or replaced during the 2026-07-12
recovery. Exact wallet ownership still needs a user-triggered `/wallet` lookup
through the live bot; automated verification must not create a replacement.
