# Extension Runtime Audit

Date: 2026-03-21

## Executive Summary

The active extension runtime is a relatively clean Manifest V3 setup:

- one popup entry
- one options entry
- one background service worker
- no active content script
- no injected provider bridge
- one narrow host permission for the Base RPC origin

The current manifest posture is close to least-privilege for the features that actually ship today.

The main remaining caution areas are:

- `clipboardWrite` is still granted even though the copy actions are user-gesture driven and may be removable after targeted QA
- the Base RPC host permission is hardcoded to a single production origin and should remain narrow until a safer network-configuration model exists
- popup and options still bundle a dev-fallback runtime path, which is intentional but not part of the manifest runtime

Safe cleanup applied in this pass:

- removed the empty `web_accessible_resources` array from `public/manifest.json`
- removed a redundant `chrome.runtime.onInstalled` initialization path from the background worker

## Active Runtime Topology

Current active runtime path:

- `popup.html` -> `src/app/popup/main.tsx`
- `options.html` -> `src/app/options/main.tsx`
- background service worker -> `src/app/background/index.ts`

Runtime separation:

- popup and options are UI surfaces only
- privileged actions go through `chrome.runtime.sendMessage(...)`
- background owns alarm scheduling and runtime request handling
- non-extension fallback in `src/app/shared/runtime-client.ts` exists only for local dev/preview style execution

There is no active:

- content script
- injected provider
- `web_accessible_resources` exposure
- `tabs`, `scripting`, `activeTab`, or `webRequest` permission use

## Manifest V3 Correctness

Current manifest file: `public/manifest.json`

Current manifest state:

- `manifest_version: 3`
- `action.default_popup: popup.html`
- `options_page: options.html`
- `background.service_worker: assets/background.js`
- `background.type: module`

Audit result:

- MV3 structure is correct for the active runtime
- popup/options/background files match the Vite build outputs
- no stale content-script declaration remains
- no unused `web_accessible_resources` declaration remains after this pass

## Permission Audit

| Permission | Why it exists | Truly required now? | Keep / remove / defer | Notes |
|---|---|---|---|---|
| `storage` | Persist encrypted vault, preferences, Canton identity metadata, Base transaction lifecycle records, and session state | Yes | Keep | Core runtime dependency |
| `alarms` | Enforce auto-lock expiry and schedule Base reconciliation polling | Yes | Keep | Required by the current background behavior |
| `clipboardWrite` | Supports copy actions for Base receive address and Canton reference party id from the popup | Uncertain | Defer removal until QA | Current copy flows are user-click initiated and may work without the permission, but that was not re-verified in this pass |

### Permission Notes

`storage`

- justified
- required for the current wallet architecture
- cannot be removed without replacing persistence entirely

`alarms`

- justified by actual background behavior
- now actively used for session expiry and Base reconciliation
- should remain until those flows are redesigned

`clipboardWrite`

- currently used only from explicit user interactions in the popup
- may be removable in Chromium because `navigator.clipboard.writeText(...)` is called from direct click handlers
- was intentionally not removed in this pass because copy UX was not re-validated across the supported browser targets

## Host Permission Scope

Current host permissions:

- `https://mainnet.base.org/*`

Why it exists:

- required for the live Base JSON-RPC path used by `ethers`
- covers balance reads, gas estimation, transaction submission, and receipt polling

Least-privilege assessment:

- narrow
- single-origin
- no wildcard across unrelated domains
- no Canton host permissions are granted yet because Canton is not live

Recommended posture:

- keep the current Base origin narrow while Base RPC remains hardcoded
- do not add explorer, swap-provider, or Canton service origins to the manifest until those integrations are actually live
- if custom EVM networks are introduced later, move to a deliberate permission strategy instead of broad wildcard host permissions

## Background Behavior Audit

Background entry: `src/app/background/index.ts`

Current responsibilities:

- configure trusted-only session storage access
- enforce session expiry on worker initialization
- reconcile pending Base transactions
- keep the auto-lock alarm aligned with the current session
- keep the Base reconciliation alarm aligned with pending lifecycle records
- handle runtime messages from popup/options
- force a fresh lock on browser startup

Assessment:

- responsibilities are appropriate for the background service worker
- no DOM/UI concerns are mixed into the background path
- message handling is centralized rather than duplicated in popup/options
- the worker stays relatively small and privilege-focused

Cleanup applied:

- removed a redundant `chrome.runtime.onInstalled` initialization listener because top-level worker initialization already covers that path

Residual concern:

- top-level initialization still performs runtime housekeeping every time the worker wakes
- that is acceptable today, but should be monitored if more network-heavy background tasks are added later

## Popup / Options / Runtime Separation

Popup:

- user-facing wallet surface
- send/receive/activity/swap/settings UX
- no direct Chrome alarm management

Options:

- workspace and management surface
- reads the same runtime/controller state model
- does not duplicate background responsibilities

Background:

- runtime authority for session alarms and request dispatch

Shared runtime boundary:

- `src/app/shared/runtime-client.ts`
- `src/app/shared/runtime-dispatcher.ts`
- `src/app/shared/runtime-types.ts`

Assessment:

- separation is clear
- popup and options are not acting like background workers
- privileged state transitions are routed through one controlled boundary

## Content Script Status

Current status:

- no content script is declared in the manifest
- no active `src/app/content/*` runtime exists
- the build no longer emits a content-script bundle

Assessment:

- this is correct for the current product
- there is no dapp connection or page-injection feature today
- content script permissions and runtime should stay absent until that feature actually exists

Recommendation:

- do not reintroduce a content script or `web_accessible_resources` until a reviewed provider-bridge design exists

## Clipboard Usage Justification

Current usage:

- popup receive overlay copies the Base address
- popup Canton receive overlay copies the reference party id when one exists

Why it exists:

- wallet UX expects one-click copy for receive identifiers

Security and permission assessment:

- the current copy actions are explicit user actions, not automatic writes
- there is no background clipboard behavior
- there is no clipboard read access

Recommendation:

- keep the copy UX
- treat `clipboardWrite` as a removal candidate, not a guaranteed keeper
- remove it only after Chromium QA confirms the current direct-click copy flows still work in the packaged extension without the permission

## Unused Runtime and Build Artifacts

### Removed in this pass

- empty `web_accessible_resources` declaration in `public/manifest.json`
- redundant install-time initialization listener in `src/app/background/index.ts`

### Intentionally retained

- `index.html`
  - not an extension entrypoint
  - retained as a Vite dev entry for the popup runtime

- `assets/runtime-dispatcher.js` chunk in build output
  - not a manifest entry
  - still conditionally reachable through the non-extension dev fallback in `runtime-client.ts`
  - not safe to classify as dead without refactoring the dev fallback path

- `assets/controller.js` chunk in build output
  - shared runtime code used by background and the dev fallback path
  - not a manifest entry, but not dead

### No longer present

- no content-script bundle
- no manifest-declared content script
- no injected-provider bridge assets

## Permissions That Should Be Removed or Deferred

Remove now:

- none beyond the empty `web_accessible_resources` cleanup already applied

Defer until feature exists:

- any content-script-related permission
- any injected-provider or page-access surface
- any broader host permissions for explorers, swap providers, or Canton services

Candidate for future removal after QA:

- `clipboardWrite`

## Recommended Production-Safe Manifest Posture

Short-term safe posture:

- keep `storage`
- keep `alarms`
- keep only the single Base RPC host permission
- keep no content scripts
- keep no `web_accessible_resources`
- keep no broad optional site-access permissions

Before a production launch, the manifest should still be reviewed against:

- exact RPC provider plan
- whether clipboard writes truly need explicit permission
- whether a minimum supported Chromium version should be declared once the session-storage API matrix is finalized
- any future dapp/provider bridge design

## Final Audit Judgment

The current extension runtime is reasonably tight for the features that actually exist.

What is good:

- MV3 shape is correct
- permission set is small
- host permission scope is narrow
- no content script or injected runtime is accidentally shipping
- popup/options/background boundaries are clear

What still needs future review:

- whether `clipboardWrite` can be removed safely
- how future custom networks or live Canton integrations will avoid permission sprawl
- whether the dev fallback chunks should be separated more aggressively from the packaged extension path
