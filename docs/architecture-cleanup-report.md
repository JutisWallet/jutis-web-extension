# Architecture Cleanup Report

Date: 2026-03-21

## Scope

This cleanup targeted the duplicate and excluded legacy runtime that had remained under `src/` after the active runtime moved to the newer `src/app` + service-layer architecture.

The goal was to leave one unambiguous active runtime architecture without breaking the current working build.

## Summary

Cleanup result:

- The excluded legacy runtime files were removed.
- The unused content-script build stub was removed from the active build.
- Root config now points at the real active runtime instead of relying on exclusions to hide the old one.
- The current build still passes typecheck, lint, and production build.

Verification after cleanup:

- `npm.cmd run typecheck` -> passed
- `npm.cmd run lint` -> passed
- `npm.cmd run build` -> passed

## What Was Removed

### Legacy root entry and styling

- `src/main.tsx`
- `src/env.d.ts`
- `src/types.ts`
- `src/styles.css`

Reason:

- These belonged to the old root-driven runtime and were no longer part of the active compile or build path.
- Keeping them made `index.html` and the repo structure misleading.

### Legacy helpers tied only to the removed scaffold

- `src/lib/utils.ts`
- `src/lib/extension.ts`

Reason:

- These helpers were only referenced by the old scaffold.
- The active runtime uses different formatting and runtime access patterns.

### Legacy built-in network and asset definitions

- `src/data/builtinNetworks.ts`
- `src/data/builtinTokens.ts`

Reason:

- These were part of the removed legacy state model.
- The active runtime uses `src/core/models/fixtures.ts` and `src/core/models/types.ts`.

### Legacy storage and crypto wrapper layer

- `src/storage/storage.ts`
- `src/security/vault.ts`

Reason:

- These implemented the old vault and persistence model.
- The active runtime uses `src/storage/extension-storage.ts`, `src/storage/vault-repository.ts`, `src/core/services/vault-service.ts`, and `src/security/crypto.ts`.

### Legacy core orchestration and registry files

- `src/core/networkRegistry.ts`
- `src/core/priceReferenceService.ts`
- `src/core/swapRegistry.ts`
- `src/core/transactionOrchestrator.ts`

Reason:

- These were older parallel versions of active services now located under `src/core/services/` and `src/core/orchestration/`.

### Legacy state and UI runtime

- `src/state/appStore.ts`
- `src/ui/components.tsx`
- `src/ui/onboarding.tsx`
- `src/ui/runtime.tsx`

Reason:

- This was the old UI/store architecture.
- It was not part of the active build and only referenced the removed legacy files.

### Legacy Base adapter layer

- `src/adapters/base/baseActivity.ts`
- `src/adapters/base/baseAdapter.ts`
- `src/adapters/base/baseSwap.ts`

Reason:

- These were the old Base runtime files referenced only by the removed legacy store.
- The active runtime uses `src/adapters/base/base-wallet-adapter.ts` and `src/adapters/base/services/*`.

### Legacy Canton adapter layer

- `src/adapters/canton/cantonActivity.ts`
- `src/adapters/canton/cantonAdapter.ts`
- `src/adapters/canton/cantonReference.ts`

Reason:

- These were the old Canton runtime files referenced only by the removed legacy store.
- The active runtime uses `src/adapters/canton/canton-wallet-adapter.ts` and `src/adapters/canton/services/*`.

### Unused active-build stub

- `src/app/content/index.ts`

Reason:

- The manifest no longer loads a content script.
- The Vite build was still emitting `content.js`, which created an unnecessary and misleading runtime artifact.

## What Was Archived

Nothing was archived.

Reason:

- The removed legacy runtime was self-contained and inactive.
- Keeping a file archive inside the workspace would have preserved the same ambiguity this cleanup was meant to remove.
- If historical reference is needed later, it should come from external version history rather than from dead runtime files kept in the live repo.

## What Was Kept And Why

### Active runtime entrypoints

- `popup.html`
- `options.html`
- `src/app/popup/main.tsx`
- `src/app/options/main.tsx`
- `src/app/background/index.ts`

Reason:

- These are the actual runtime entrypoints used by the current extension build.

### `index.html`

Kept, but retargeted.

Current role:

- It now points to `src/app/popup/main.tsx` instead of the deleted legacy `src/main.tsx`.

Reason:

- This keeps a convenient Vite root entry for local development while aligning it with the active popup runtime.

### Active service-layer files that are not fully wired yet

- `src/adapters/base/services/base-activity-indexer.ts`
- `src/adapters/base/services/base-transaction-service.ts`
- `src/adapters/canton/services/canton-transfer-service.ts`
- `src/adapters/canton/services/canton-reference-data-service.ts`
- `src/swap/swap-state-machine.ts`

Reason:

- These are not legacy duplicates.
- They are part of the current architecture boundary, even though some are not fully exercised by the active runtime yet.
- Removing them in this cleanup would have deleted current domain seams rather than old duplicate scaffolding.

### Tooling config retained intentionally

- `tsconfig.node.json`
- `vite.config.ts`
- `eslint.config.js`

Reason:

- These are live toolchain files.
- They were cleaned up, not removed.

## Config And Documentation Changes

### Config updates

- `tsconfig.json`
  - Simplified from a selective allowlist of active files to `src/**/*`, which is now safe because the duplicate legacy runtime is gone.
- `eslint.config.js`
  - Removed ignores that were only hiding deleted legacy files.
- `vite.config.ts`
  - Removed the stale `content` entry from the build inputs.

### Entrypoint updates

- `index.html`
  - Repointed from deleted `src/main.tsx` to active `src/app/popup/main.tsx`.

### Documentation updates

- `README.md`
  - Added an explicit `Active Runtime Path` section.
  - Documented that the repo no longer has an active legacy `src/main.tsx` scaffold.
  - Documented that there is no active content-script or injected-provider runtime in the current build.

## Active Runtime Path After Cleanup

The active runtime architecture is now:

- Popup:
  - `popup.html`
  - `src/app/popup/main.tsx`
  - `src/app/popup/App.tsx`
- Options:
  - `options.html`
  - `src/app/options/main.tsx`
  - `src/app/options/App.tsx`
- Background:
  - `src/app/background/index.ts`

Shared runtime layers:

- Controller:
  - `src/app/shared/controller.ts`
- State:
  - `src/state/use-jutis-store.ts`
- Core domain:
  - `src/core/models/*`
  - `src/core/orchestration/*`
  - `src/core/services/*`
- Adapters:
  - `src/adapters/base/base-wallet-adapter.ts`
  - `src/adapters/base/services/*`
  - `src/adapters/canton/canton-wallet-adapter.ts`
  - `src/adapters/canton/services/*`
- Storage and security:
  - `src/storage/*`
  - `src/security/*`
- UI kit and styles:
  - `src/ui/components/kit.tsx`
  - `src/ui/styles/global.css`
- Swap layer:
  - `src/swap/*`

There is no longer a second runtime architecture under `src/` competing with this one.

## Residual Technical Debt

The duplicate scaffold cleanup is complete, but the following technical debt still remains:

### 1. Partially wired service seams still exist

Examples:

- `src/adapters/base/services/base-activity-indexer.ts`
- `src/adapters/base/services/base-transaction-service.ts`
- `src/adapters/canton/services/canton-transfer-service.ts`
- `src/adapters/canton/services/canton-reference-data-service.ts`
- `src/swap/swap-state-machine.ts`

Why it remains:

- These are part of the active architecture, but they are not yet fully integrated into the runtime flow.
- They are not duplicate scaffolds, so they were kept.

### 2. Session lifecycle is still incomplete

Why it remains:

- The cleanup did not change the underlying session architecture.
- The unlocked secret still lives in popup memory and auto-lock enforcement still needs real central session ownership.

### 3. Canton remains intentionally non-live

Why it remains:

- The cleanup removed the old fake/parallel runtime, but it did not make Canton live.
- Canton still depends on future validator, scan, signer, and ledger topology work.

### 4. Swap is still not live

Why it remains:

- The cleanup removed the old duplicate swap runtime, but the active Base swap adapter is still a development quote adapter and Canton swap still stops at the adapter boundary.

### 5. Bundle size warning remains

Why it remains:

- The cleanup reduced one unnecessary build artifact by removing the content entry, but the main shared bundle is still over 500 kB minified.

## Safe Removal Decisions

Files that were not removed because doing so would have been unsafe or misleading:

- `index.html`
  - kept because it now serves as a dev-friendly entry aligned with the active popup runtime
- active service-layer boundary files
  - kept because they are part of the current architecture, even when not fully integrated yet
- `tsconfig.node.json`
  - kept because it is a tooling configuration file, not a duplicate runtime

## Final State

The repository now has one clear runtime architecture.

There is no longer:

- an active `src/main.tsx` path
- a second Zustand store competing with the active one
- a second Base adapter stack
- a second Canton adapter stack
- an unused content-script build output

The build remains working, and the current runtime boundary is materially clearer than before cleanup.
