# Privy Account-Control Private Live Checklist

Status: approval-gated; code-level implementation complete, live verification pending

Purpose: verify Ribbot's bot-first Privy claim, export, signer-removal, and signer-restoration flow without exposing credentials or exported wallet material.

## Hard Stops

- Do not deploy, change Privy/Cloudflare/Telegram configuration, open a real export modal, remove or add a signer, or send a transaction without AKLO's explicit approval for that action and environment.
- Never print, screenshot, record, paste, or log the Privy app secret, authorization private key, Telegram bot token, access token, exported Solana private key, or control-session token.
- Use a dedicated low-value test Telegram account and wallet. Verify the wallet address before funding it.
- Keep every FTX live execution gate off during account-control verification.

## Configuration Audit

Record pass/fail only, never values.

- Privy Dashboard: Telegram login enabled for the same Privy app used by FTX wallet provisioning.
- Privy Dashboard: production FTX domain allowed; Telegram bot handle/token configured; seamless Telegram login enabled only for the intended client.
- BotFather: login domain matches the FTX control-page domain.
- Cloudflare Pages: `NEXT_PUBLIC_PRIVY_APP_ID` is present and matches Worker `PRIVY_APP_ID`.
- Cloudflare Pages: `NEXT_PUBLIC_PRIVY_BOT_SIGNER_ID` matches Worker `PRIVY_AUTHORIZATION_KEY_ID`.
- Cloudflare Pages: `NEXT_PUBLIC_PRIVY_BOT_POLICY_IDS` matches the intended restricted wallet policies.
- Worker: app secret, signer private key, and Ribbot API token remain Worker secrets and are absent from all `NEXT_PUBLIC_*` variables and Ribbot runtime configuration.
- Ribbot: `/control` uses a Telegram `login_url` and does not put the one-time FTX code or a Privy token in the URL.

## Private Verification

1. Keep all live trade/withdrawal/automation gates false.
2. From the dedicated Telegram account, run `/wallet`; record only the public Solana address.
3. Run `/control`; verify the response contains a short-lived code and FTX link, then open the link through its Telegram login button.
4. Exchange the FTX code. Confirm the page shows the same Telegram ID, Privy user, and public Solana address.
5. Sign in to Privy with the same Telegram account. Confirm the page reports `Verified`; a different Telegram account must report an account mismatch and expose no export/signer actions.
6. Press `Verify claim`; confirm FTX records the non-secret claim-flow timestamp.
7. With separate explicit approval, open `Export key`. Confirm Privy's isolated modal targets the exact Solana address. Close it without copying or recording the key unless AKLO explicitly approves an actual export.
8. Press `Remove app signers`, cancel once, then confirm only with separate approval. Confirm Privy completes removal and FTX immediately reports bot access paused.
9. While paused, call an FTX live endpoint with its live gate still false or a mocked request; verify revocation is checked before any Privy wallet RPC. Do not send a real transaction.
10. With separate approval, press `Restore signer`. Confirm Privy adds the configured signer/policies and only then FTX clears its local pause.
11. Sign out and repeat the mismatch test. Confirm no wallet action is available to the wrong Privy/Telegram identity.

## Rollback

- Pause FTX bot access from the control page.
- Remove app signers through the authenticated Privy owner flow if signer removal was part of the approved test.
- Keep all live gates false.
- Remove the Pages public Privy identifiers or disable Telegram login if the UI must be withdrawn; never rotate or delete credentials as an unplanned rollback.
- Preserve screenshots only of non-secret UI states. Do not retain screenshots of Privy export content or tokens.

## Acceptance Record

Record date, environment, tester, public wallet address, each pass/fail result, and any non-secret error code. A code-level pass does not count as live acceptance. Live acceptance requires the exact identity tuple, isolated export UI, confirmed signer removal/restoration, FTX pause synchronization, and zero exposed secret material.
