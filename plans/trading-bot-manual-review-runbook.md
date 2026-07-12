# FTX/Ribbot Manual Review Runbook

Status: code-level workflow; production configuration and live use require AKLO approval
Date: 2026-07-10

## Purpose

This runbook handles FTX/Privy execution references that remain unresolved past `TRADING_BOT_MANUAL_REVIEW_AFTER_SECONDS`. FTX owns the queue and reconciliation. Ribbot only renders non-secret review activity.

The workflow never retries the original execution, never calls Privy wallet RPC, and never lets an operator force success or failure. A case resolves only when the existing Privy transaction GET returns terminal provider evidence.

## Prerequisites

- `TRADING_BOT_ACCOUNTS` is bound to `TradingBotAccountStore`.
- `TRADING_BOT_OPERATOR_TOKEN` is configured as a Worker secret, separately from `RIBBOT_TRADING_BOT_TOKEN`.
- Privy app credentials are configured in FTX for read-only transaction lookup.
- The operator token is available only in the approved private shell. Never put it in Ribbot, a URL, source control, browser storage, screenshots, or logs.
- Production deployment, secret changes, and live review actions require explicit AKLO approval.

Use placeholders below. Do not paste real tokens into committed files or shared output.

```bash
export FTX_API_BASE_URL="https://approved-ftx-worker.example"
export TRADING_BOT_OPERATOR_TOKEN="<read-from-approved-secret-store>"
```

## List Active Cases

```bash
curl -sS \
  -H "Authorization: Bearer ${TRADING_BOT_OPERATOR_TOKEN}" \
  "${FTX_API_BASE_URL}/api/frogx/trading-bot/operator/reviews?status=active&limit=50"
```

Review these fields before acting:

- `caseId`
- `telegramUserId`
- `executionKind`
- `resourceId`
- `executionId`
- `referenceId`
- `manualReviewRequiredAt`
- `reason`
- `lastCheckStatus` and `lastCheckError`

## Acknowledge

Acknowledgement records operator ownership and an audit event. It does not change the order/config/ticket lifecycle.

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer ${TRADING_BOT_OPERATOR_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"caseId":"<case-id>","note":"Investigating provider status"}' \
  "${FTX_API_BASE_URL}/api/frogx/trading-bot/operator/reviews/acknowledge"
```

## Evidence-Only Reconciliation

This action invokes the existing FTX reconciliation path. It performs Privy transaction GET only, validates the stored wallet and Solana chain, and does not submit or resend a transaction.

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer ${TRADING_BOT_OPERATOR_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"caseId":"<case-id>","note":"Read-only provider recheck"}' \
  "${FTX_API_BASE_URL}/api/frogx/trading-bot/operator/reviews/reconcile"
```

Interpret the response:

- `status: resolved`, `resolution: executed`: Privy returned `confirmed` or `finalized`, or bundle item reconciliation proved complete.
- `status: resolved`, `resolution: failed`: Privy returned a terminal failure status, or bundle reconciliation proved a terminal/partial stop.
- `status: unresolved`: keep the case locked. Do not confirm, cancel, retry, rebuild, or manually mark terminal.
- `checkStatus: reference_mismatch` or `stale_execution`: stop and inspect FTX state before any further action.
- `checkStatus: not_configured`: fix approved FTX configuration; do not move credentials into Ribbot.

## Closure And Audit

Normal user/cron reconciliation also closes an existing review case when terminal evidence arrives. Resolution records `execution_manual_review_resolved`; acknowledgement records `execution_manual_review_acknowledged`. Ribbot `/activity` can display both without receiving operator credentials.

List resolved cases for audit:

```bash
curl -sS \
  -H "Authorization: Bearer ${TRADING_BOT_OPERATOR_TOKEN}" \
  "${FTX_API_BASE_URL}/api/frogx/trading-bot/operator/reviews?status=resolved&limit=50"
```

## Stop Conditions

Stop immediately if any request attempts a non-GET Privy transaction operation, wallet RPC, swap build, withdrawal build, Telegram send, or Solana send. The code-level operator path is not authorized for any of those actions.

If a case remains unresolved after repeated checks, leave it acknowledged and locked. Out-of-band evidence is not enough to mutate FTX state until a separately designed verifier can cryptographically bind that evidence to the stored execution intent.

## Rollback

Removing `TRADING_BOT_OPERATOR_TOKEN` disables all public operator routes with `not_configured`. It does not change live gates, queued cases, execution state, account events, or Ribbot behavior. Do not delete review rows to hide unresolved executions.
