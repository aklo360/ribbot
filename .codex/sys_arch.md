# Ribbot Architecture

## Process

`com.solanabfs.ribbot` -> `scripts/run-ribbot.zsh` ->
`packages/client-telegram/dist-standalone/standalone.js` -> Telegraf long polling.

The runner loads guarded local environment storage, resolves the existing
Telegram/FTX token aliases, sets safe Ribbot trading defaults, and fails closed
if the standalone build is missing.

## Boundaries

- Telegram command parsing, menus, callbacks, and non-secret cache: Ribbot.
- NFT presentation and pagination: Ribbot; active-wallet selection, ownership
  lookup, filtering, and normalized metadata: authenticated FTX API.
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
