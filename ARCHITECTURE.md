# Ribbot Architecture

## Purpose

Ribbot is the independently versioned agent and Telegram interaction layer for Solana Business Frogs. It is based on the Eliza monorepo and integrates with Frog Trading Exchange through explicit API boundaries.

## Project Map

- `agent/`: primary agent runtime.
- `client/`: interactive client surface.
- `packages/`: shared Eliza and Ribbot packages.
- `packages/bookmap-readonly-bridge/`: local Bookmap add-on that exports bounded market-data snapshots and has no execution authority.
- `scraper/`: bounded ingestion tooling.
- `characters/`: agent character configuration.
- `scripts/`: development, verification, and runtime helpers.
- `tests/`: repository-level checks.
- `docs/`: upstream documentation, project references, and implementation history.
- `docs/plans/`: deep feature plans and operational runbooks; never startup context.

The upstream high-cohesion layout is an intentional exception to blind flattening. Do not move `agent/`, `client/`, `packages/`, or `scraper/` without a separate dependency-aware migration.

`../ftx` is a sibling repository and owns authoritative account, wallet, and execution state. Ribbot renders and requests operations through that boundary; it does not sign or send independently.

## Boundaries

Telegram delivery, bot/runtime launch, Cloudflare deployment, credentials, wallet operations, and trading are external effects requiring exact current approval and verified identities. Historical Mini services, LaunchAgents, deployment IDs, or changelog entries do not establish current availability or authority.

## Verification

Use the narrowest owning-package test and TypeScript check first. Run the relevant package or standalone build when runtime behavior changes. Network, Telegram, wallet, and production checks remain separately gated.
