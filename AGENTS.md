# Ribbot

Ribbot is a deterministic Telegram trading bot for Solana. Its wallet, account,
quote, swap, position, order, automation, and execution operations must route
through the FTX/FrogX Worker.

## Runtime

- Production starts `packages/client-telegram/dist-standalone/standalone.js`
  through `scripts/run-ribbot.zsh`.
- Do not start the legacy Eliza agent or restore it as the production runtime.
- Legacy Eliza monorepo files remain only because the standalone trading module
  has not yet been extracted into a smaller repository.
- Build with `pnpm --filter @elizaos/client-telegram run build:standalone`.
- Verify configuration without network calls with
  `scripts/run-ribbot.zsh --check`.

## Security

- Ribbot receives only `TELEGRAM_BOT_TOKEN` and the shared
  `RIBBOT_FTX_API_TOKEN`. The runner may resolve their existing deployment
  aliases.
- Privy app secrets, authorization keys, wallet policies, wallet creation,
  signing, and transaction broadcast belong exclusively to FTX/FrogX.
- Never print token values, wallet key material, or secret files.
- Do not create or replace a Privy wallet during smoke testing.
- Keep `RIBBOT_TRADING_ENABLED=false` and `RIBBOT_TRADING_DRY_RUN=true` unless
  live execution is explicitly approved. FTX live gates are separate and must
  also remain false without explicit approval.

## Verification

- `vitest run packages/client-telegram/src/standalone.test.ts packages/client-telegram/src/trading`
- `tsc --noEmit -p packages/client-telegram/tsconfig.json`
- Build the standalone bundle and run `scripts/run-ribbot.zsh --check` before
  loading the LaunchAgent.
