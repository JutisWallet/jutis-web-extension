# Jutis

Jutis is a browser extension wallet foundation designed for two built-in networks:

- Canton Network
[![ff}](https://i.hizliresim.com/jup9qoi.png)](https://hizliresim.com/jup9qoi)

This repository is intentionally product-architecture-first. It does not pretend that Canton behaves like EVM, and it does not hide missing protocol infrastructure behind fake success flows.

## What This Repo Includes

- a Manifest V3 extension scaffold
- React + TypeScript popup and options surfaces
- a Carbon-derived design system translated from local `designed_source/`
- secure local vault scaffolding with password-based encryption
- Base wallet adapter with standard EVM account handling
- Canton wallet adapter boundaries with explicit capability flags
- unified portfolio, activity, send, receive, swap-readiness, and settings surfaces
- architecture and protocol research docs in `docs/`

## Architecture Summary

The codebase is structured as a clean single-repo application with equivalent domain separation:

- `src/app`
- `src/ui`
- `src/core`
- `src/adapters/base`
- `src/adapters/canton`
- `src/swap`
- `src/storage`
- `src/security`
- `src/state`

This maps directly to the required product layers:

- UI layer
- application state layer
- wallet core layer
- network adapters
- transaction orchestration layer
- secure storage and key management layer
- indexing and activity layer
- swap layer
- settings and preferences layer

## Active Runtime Path

The active runtime architecture is now unambiguous:

- `popup.html` -> `src/app/popup/main.tsx`
- `options.html` -> `src/app/options/main.tsx`
- background worker -> `src/app/background/index.ts`
- `index.html` is retained only as a Vite dev entry and points to the same popup runtime

There is no active legacy `src/main.tsx` scaffold anymore, and there is no active content-script or injected-provider runtime in the current build.

## Design Source

The UI is derived from the local `designed_source/` folder, not invented from scratch.

Key preserved traits:

- graphite dark surfaces
- lime-accent primary actions
- dense rounded cards
- compact uppercase metadata
- oversized portfolio typography
- split-pane management view for expanded surfaces

See `docs/design-audit.md`.

## Support-State Vocabulary

Jutis uses the same Canton support-state language in product surfaces and docs:

- `live`: backed by a real operational integration path
- `partial`: some real or protocol-aware behavior exists, but the full live flow is incomplete
- `reference-only`: driven by fixtures, demo data, or planning/reference metadata rather than live protocol truth
- `unsupported`: intentionally blocked or not implemented

For the exact Canton breakdown, see `docs/canton-capability-matrix.md`.

## Real Vs Partial Vs Mocked

### Real

- extension scaffold and routing surface
- local encrypted vault primitives
- lock and unlock flow
- Base key custody model
- Base send preview architecture
- unified transaction and swap state modeling

### Partial

- Base network integration: real adapter shape, runtime success depends on installed dependencies and reachable RPC
- Base activity: strong for Jutis-originated activity, not a full historical indexer yet
- Canton balances and activity: protocol-correct domain model with `reference-only` or `partial` support states and explicit capability flags
- USD reference handling: domain-level trust model exists; current values are explicitly estimated, demo, or unavailable unless a live provider is added later
- swap: shared engine and readiness model exist, but public swap support is intentionally disabled until live provider and execution integrations exist

### Mocked

- Canton live transfer execution
- Canton live swap settlement
- Canton live name resolution
- Base live quote-provider execution beyond the included development quote adapter

See `docs/feature-matrix.md` for the full per-feature breakdown.

## Core Docs

- `docs/design-audit.md`
- `docs/canton-research.md`
- `docs/canton-wallet-architecture.md`
- `docs/canton-capability-matrix.md`
- `docs/base-research.md`
- `docs/base-wallet-architecture.md`
- `docs/product-baseline.md`
- `docs/swap-architecture.md`
- `docs/swap-readiness.md`
- `docs/security-model.md`
- `docs/feature-matrix.md`

## Development Notes

- This repo currently uses `npm.cmd` in Windows PowerShell because the plain `npm` PowerShell shim may be blocked by execution policy on some machines.
- Base is configured as the real locally generated/imported network.
- Canton is modeled honestly as a party-centric integration surface that still needs deployment-specific wiring for live execution.

## Turkish-Friendly Notes

- `Canton` tarafi bilerek EVM gibi modellenmedi.
- `Base` tarafi yerel anahtar kasasi ile gercek wallet mantigina daha yakin kuruldu.
- `Canton` icin eksik olan kisimlar adapter sinirlarinda acikca isaretlendi.
- Uretim oncesi asamada canli RPC, Canton signer/ledger topolojisi ve swap provider entegrasyonlari eklenmeli.

## Next Production Steps

1. Install dependencies and run typecheck and build.
2. Replace the Base development swap adapter with a live provider adapter.
3. Attach a real Canton identity and ledger submission path.
4. Add durable receipt and activity reconciliation in the background worker.
5. Add audited export and password-rotation flows.
