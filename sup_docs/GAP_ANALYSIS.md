# Jutis Extension — Gap Analysis

---

## Exists

### Core Extension Scaffolding
- `public/manifest.json` — MV3 manifest (exists but incomplete)
- `src/app/background/index.ts` — Service worker (full alarm + message handling)
- `src/app/popup/main.tsx` + `App.tsx` — Popup UI entry and full component
- `src/app/options/main.tsx` + `App.tsx` — Options UI entry and full component
- `src/app/shared/runtime-dispatcher.ts` — Background message executor
- `src/app/shared/runtime-client.ts` — Popup message sender
- `src/app/shared/controller.ts` — Controller singleton export

### Business Logic
- `src/core/orchestration/jutis-controller.ts` — Full orchestrator (wallet adapters, vault, swap, portfolio)
- `src/state/use-jutis-store.ts` — Zustand store (all UI state)
- `src/storage/extension-storage.ts` — chrome.storage wrapper
- `src/storage/vault-repository.ts` — Persistent storage I/O
- `src/security/crypto.ts` — Crypto utilities
- `src/core/services/vault-service.ts` — Vault creation/unlock/import
- `src/core/services/session-service.ts` — Session + auto-lock
- `src/core/services/network-registry.ts` — Network registry
- `src/core/services/errors.ts` — WalletError class
- `src/core/services/usd-reference-service.ts` — USD pricing
- `src/core/models/fixtures.ts` — BUILT_IN_NETWORKS, demo assets, demo activity
- `src/core/models/types.ts` — All TypeScript types

### Adapters
- `src/adapters/base/base-wallet-adapter.ts` — Base EVM adapter
- `src/adapters/base/services/base-activity-indexer.ts`
- `src/adapters/base/services/base-transaction-service.ts`
- `src/adapters/base/services/base-transaction-lifecycle-service.ts`
- `src/adapters/base/services/base-swap-adapter.ts`
- `src/adapters/canton/canton-wallet-adapter.ts`
- `src/adapters/canton/services/canton-activity-indexer.ts`
- `src/adapters/canton/services/canton-transfer-service.ts`
- `src/adapters/canton/services/canton-swap-adapter.ts`
- `src/adapters/canton/services/canton-reference-data-service.ts`

### Swap Layer
- `src/swap/swap-state-machine.ts`
- `src/swap/swap-provider-registry.ts`
- `src/swap/quote-engine.ts`

### UI
- `src/ui/components/kit.tsx` — All shared components (BrandMark, Chip, SupportBadge, PrimaryButton, SecondaryButton, SectionCard, InputField, Metric, NavButton, Divider)
- `src/ui/styles/global.css` — Global styles

### Build System
- `package.json` with all dependencies declared
- `vite.config.ts` — Vite + React + Rollup config
- `tsconfig.json`, `tsconfig.node.json`
- `vitest.config.ts`
- `eslint.config.js`
- `dist/` — Full build output with all expected artifacts

### Docs
- 20 `.md` files in `docs/` covering architecture, research, security, testing, and publishing

### Tests
- 4 unit test files covering vault, base adapter, transaction lifecycle, and canton capability gating

---

## Missing

### P0 — Prevents Extension Loading

1. **Extension icon files**
   - No PNG icon files anywhere in the project
   - `public/assets/` does not exist
   - Manifest has no `icons` field

2. **`dist/popup.html` wrong script reference**
   - Points to `/assets/options.js` instead of `/assets/popup.js`
   - Would cause popup to fail to render wallet UI

3. **`dist/options.html` wrong script reference**
   - Points to `/assets/popup.js` instead of `/assets/options.js`
   - Would cause options page to render popup UI

### P1 — Loads But Core Functionality Broken

4. **Base RPC connectivity not verified**
   - `host_permissions` only allows `https://mainnet.base.org/*`
   - No explicit RPC URL in manifest; Base adapter relies on configured RPC
   - Real wallet operations would fail without reachable RPC

5. **Canton integration is stub/reference-only by design**
   - Canton adapter boundaries exist but live Canton topology not connected
   - Canton balances, activity, send, swap are explicitly non-functional by design
   - Not a bug but a documented limitation

6. **Swap is intentionally disabled**
   - No live swap provider integrated
   - `BaseSwapAdapter` exists but is a development quote adapter only

7. **USD pricing is demo/reference**
   - No live price feed
   - All USD values are fixture-based

### P2 — Secondary Issues

8. **No `content_security_policy` in manifest**
   - MV3 best practice; missing may cause CSP violations in some contexts

9. **`host_permissions` pattern may be too narrow**
   - `https://mainnet.base.org/*` may not cover all needed URLs (explorer, RPC subdomains)

10. **`action.default_icon` missing**
    - Toolbar button has no icon image

11. **`public/assets/` directory missing**
    - No directory exists for static extension assets

12. **No `_locales/` folder**
    - No i18n; limits Chrome Web Store distribution to English only

13. **`web_accessible_resources` not declared**
    - No resources exposed to web pages (may be intentional)

14. **`index.html` at root**
    - Not a valid extension entry; Vite dev server artifact only

---

## Broken

### 1. `dist/popup.html` / `dist/options.html` Script Swap (P0)

**Evidence**: File contents read directly.

- `dist/popup.html` contains `<script type="module" crossorigin src="/assets/options.js">`
- `dist/options.html` contains `<script type="module" crossorigin src="/assets/popup.js">`

The source HTML files at project root (`popup.html`, `options.html`) have correct references. This swap is either:
- A build artifact error that needs correction in `dist/`
- Or a misdiagnosis that needs verification by re-running `npm run build`

**Impact**: Popup would render options bundle (wrong UI); options page would render popup bundle (wrong UI).

### 2. Browser "Manifest Dosyan Yok" Error (P0 — Perceived)

**Evidence**: User reported error message.

This error likely occurs because the user is loading the extension from the wrong directory. The `dist/` folder has a valid `manifest.json`. If loading from root or `src/`, no manifest would be found.

**Resolution path**: Confirm `dist/` is used as the extension load directory in Chrome's developer mode.

---

## Unclear / Needs Confirmation

1. **Build script swap root cause**
   - Was `npm run build` run successfully? The HTML swap could be from a failed or interrupted prior build
   - Does re-running `npm run build` correct the script references?
   - Is there a rollup configuration issue causing the swap?

2. **Runtime behavior of swapped HTML**
   - Does the popup actually fail to load, or does the options bundle also render a functional popup UI (since both apps share the same controller)?
   - Does the runtime client fallback (`sendRuntimeRequest` in `runtime-client.ts`) work when extension context is unavailable during development?

3. **Base RPC endpoint**
   - Is `https://mainnet.base.org` actually reachable from the machine running the extension?
   - Are there any API keys required?

4. **Canton topology**
   - Is there an intended Canton validator or ledger endpoint that should be configured?
   - Is the Canton "party linkage" meant to be connected to a live environment in the future?

5. **Icon design**
   - Are icon files planned/expected from the `designed_source/` references?
   - What size/formats are needed?

---

## Prioritized Blockers Summary

| Priority | Item | Impact |
|---|---|---|
| **P0** | Extension icons missing | Extension cannot display in toolbar; may fail to install |
| **P0** | `dist/popup.html` wrong script | Popup renders incorrectly or fails |
| **P0** | `dist/options.html` wrong script | Options renders incorrectly |
| **P0** | User loading from wrong directory | Manifest not found error |
| **P1** | Base RPC connectivity unverified | Base wallet operations fail at runtime |
| **P1** | Canton live integration not wired | Canton features remain reference-only |
| **P1** | No live swap provider | Swap feature non-functional |
| **P2** | Manifest missing CSP | Potential CSP violations |
| **P2** | `host_permissions` narrow | Some Base URLs may be blocked |
| **P2** | No `action.default_icon` | Toolbar button has no image |
| **P2** | No `_locales/` folder | English-only; limits store distribution |
| **P3** | No content scripts | Cannot inject into web pages |
| **P3** | No `web_accessible_resources` | Cannot expose resources to web |
| **P3** | `index.html` at root | Dev artifact cluttering extension namespace |
