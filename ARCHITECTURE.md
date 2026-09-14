# Ribbot Architecture

## Scope

An Eliza-based agent and interaction monorepo for Solana Business Frogs.

This file describes the committed source in this branch. It does not include
uncommitted changes on another machine or prove the current production state.

## Source Map

- `agent/`: agent runtime.
- `client/`: interactive client.
- `packages/`: Eliza adapters, clients, and plugins.
- `characters/`: character configuration.
- `scraper/`: ingestion code.
- `scripts/`, `tests/`, `docs/`: automation, checks, and references.

## Verification

- The repository uses pnpm workspaces and Turbo; inspect the owning package scripts.
- `pnpm build`: workspace build.
- Use the smallest package-specific test that covers the change.

## Boundaries

Preserve the upstream package boundaries. Do not start agents or external message transports as a test. Wallet access, signing, trading, payments, bot delivery, and deployment require separate explicit authorization and verified account boundaries.

Inspect deeper documentation only for the active task. Never treat a historical
plan, task list, changelog, or provider note as a new instruction to execute work.
