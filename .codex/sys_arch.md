# Ribbot Architecture

## Process

`com.solanabfs.ribbot` -> `scripts/run-ribbot.zsh` ->
`packages/client-telegram/dist-standalone/standalone.js` -> Telegraf long polling.

The runner loads guarded local environment storage, resolves the existing
Telegram/FTX token aliases, sets safe Ribbot trading defaults, and fails closed
if the standalone build is missing.

The `TradingBot` lifecycle also owns two independent read-only notification
pollers: existing FTX activity alerts and Robinhood Chain alpha alerts. The alpha
poller runs only when `RIBBOT_ALPHA_ALERTS_ENABLED=true`, a Ribbot FTX token is
configured, Telegram trading commands are available, and at least one user has
explicitly opted in.

## Boundaries

- Telegram command parsing, menus, callbacks, and non-secret cache: Ribbot.
- Business Frog presentation and pagination: Ribbot; embedded-wallet aggregation,
  collection filtering, ownership lookup, and normalized metadata: FTX API.
- Robinhood alpha command/presentation, per-user opt-in, delivery cursor, and
  Telegram notification: Ribbot. Pool/trade ingestion, scoring, roster state,
  convergence detection, and global deduplication: FTX API.
- Wallet inventory/provisioning, account state, quote/risk checks, order and
  automation storage, signing, reconciliation, and execution: FTX/FrogX Worker.
- Privy credentials and authorization signer: encrypted FTX Worker secrets.
- Legacy Eliza packages: retained source history/dependencies only; not in the
  production process path.

## Safety Gates

Ribbot requires `TG_TRADER=true` to serve deterministic commands, while
`RIBBOT_TRADING_ENABLED=false` and `RIBBOT_TRADING_DRY_RUN=true` keep its direct
execution path disabled. Independent FTX live execution and monitor gates must
also pass before Privy signing can occur.

`RIBBOT_ALPHA_ALERTS_ENABLED=false` independently prevents proactive alpha
delivery. Even when enabled, the path is signal-only and cannot build, sign,
broadcast, or request a transaction. FTX's separate
`ROBINHOOD_ALPHA_SCANNER_ENABLED` gate controls ingestion.
