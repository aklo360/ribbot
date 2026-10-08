# Ribbot

Read `ARCHITECTURE.md` completely before substantive work.

- Work only from this exact project root; Frog Trading Exchange is the sibling project `../ftx`.
- Preserve FTX as the authoritative account and execution boundary. Ribbot must not gain duplicate wallet, signer, or transaction authority.
- Never deploy, launch a bot, send Telegram messages, configure credentials, sign, trade, or transact without current explicit approval and live identity verification.
- Retain the upstream Eliza package boundaries where code depends on them; flatten only organization-only or lifecycle folders.
- Deep plans live in `docs/plans/` and are loaded only when their named feature is in scope.
