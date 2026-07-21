# Ribbot Snapshot

Production is standalone Telegraf built from `src/standalone.ts` and started by
`scripts/run-ribbot.zsh`; never deploy Eliza.

The deterministic trading module routes all wallet, account, quote, swap,
position, order, automation, and execution calls through FTX/FrogX. Ribbot holds
no Privy secret or signing key. FTX owns managed-wallet matching, policy checks,
signing, and broadcast.

`/nfts`, `/collectibles`, and `/frogs` render Business Frogs across stored
embedded wallets through authenticated FTX. Ribbot sends identity/pagination;
FTX owns wallet aggregation and collection-filtered DAS lookup.

`/alpha` plus `/signals` and `/hoodalpha` render FTX's read-only Robinhood Chain
scanner snapshot. `/alpha on|off|status` controls per-user alerts. The poller
baselines existing signals and advances its exactly-once cursor only after
delivery. FTX owns ingestion, scoring, global signal state, and the 30-day
window; Ribbot owns presentation/delivery. Keep
`RIBBOT_ALPHA_ALERTS_ENABLED=false` without explicit activation approval. AKLO
approved the production override on 2026-07-20; the Mini LaunchAgent is live,
one user is opted in and baselined, and checked-in defaults remain false.

The deployed volume extension adds `/volume`, `/vol`, and `/pairs` plus concise
new-pair/high-volume/surge cards. Volume and convergence events use the same FTX
snapshot, opt-in, poll, backoff, and cursor; either command's `on|off` toggles the
shared feed. The first production snapshot stored 17 volume events; the one
opted-in chat baselined them with no delivery timestamp or failure, so only later
events can generate a DM.

Production credential aliases are resolved by the runner. Ribbot-side trading
defaults to disabled and dry-run. FTX live execution and monitor gates are also
disabled. Do not change either set of gates without explicit approval.

The prior known managed wallet was not deleted or replaced during the 2026-07-12
recovery. Exact wallet ownership still needs a user-triggered `/wallet` lookup
through the live bot; automated verification must not create a replacement.
