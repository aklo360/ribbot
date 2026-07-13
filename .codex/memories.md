# Ribbot Snapshot

Ribbot's production runtime is standalone Telegraf, not Eliza. The service
entrypoint is built from `packages/client-telegram/src/standalone.ts` and
started by `scripts/run-ribbot.zsh`.

The existing deterministic trading module remains feature-rich and routes all
wallet, account, quote, swap, position, order, automation, and execution calls
through FTX/FrogX. Ribbot holds no Privy app secret or signing key. The FTX
Worker owns Privy user lookup, managed-wallet matching/provisioning, policy
checks, signing, and transaction broadcast.

`/nfts [page]` plus `/collectibles` and `/frogs` render the active account's NFT
holdings through authenticated FTX. Ribbot sends Telegram ID and pagination only;
FTX derives the active wallet and owns the Solana DAS lookup. Menu buttons expose
the view in both Simple and Advanced modes.

Production credential aliases are resolved by the runner. Ribbot-side trading
defaults to disabled and dry-run. FTX live execution and monitor gates are also
disabled. Do not change either set of gates without explicit approval.

The prior known managed wallet was not deleted or replaced during the 2026-07-12
recovery. Exact wallet ownership still needs a user-triggered `/wallet` lookup
through the live bot; automated verification must not create a replacement.
