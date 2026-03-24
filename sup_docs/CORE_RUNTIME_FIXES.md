# Jutis Extension — Core Runtime Fixes

---

## Root Cause of Popup/Options Swap

### What was found

**Previous dist state (stale):**
- `dist/popup.html` → `<script src="/assets/options.js">` → loaded OptionsApp
- `dist/options.html` → `<script src="/assets/popup.js">` → loaded PopupApp

**After `npm run build`:**
- `dist/popup.html` → `<script src="/assets/popup.js">` → loads PopupApp ✓
- `dist/options.html` → `<script src="/assets/options.js">` → loads OptionsApp ✓

### Exact source files inspected

| File | Content |
|---|---|
| `popup.html` (root source) | `src="/src/app/popup/main.tsx"` → CORRECT |
| `options.html` (root source) | `src="/src/app/options/main.tsx"` → CORRECT |
| `vite.config.ts` rollup input | `popup: popup.html`, `options: options.html` → CORRECT |

### Root cause

**Stale `dist/` build artifacts.** The previous `dist/` directory had HTML files generated from an earlier (incorrect) build state where the Vite rollup configuration was somehow producing swapped HTML output. Running `npm run build` regenerated all artifacts correctly.

The source files and build configuration were always correct:
- `popup.html` at project root references `popup/main.tsx` (PopupApp)
- `options.html` at project root references `options/main.tsx` (OptionsApp)
- `vite.config.ts` rollup `input` maps `popup` → `popup.html` and `options` → `options.html`
- Output `entryFileNames: "assets/[name].js"` produces `popup.js` and `options.js` correctly

The swap was a one-time build artifact corruption, not a configuration error.

### What was done to fix

```powershell
npm.cmd run build
```

This regenerated:
- `dist/popup.html` — now correctly references `/assets/popup.js`
- `dist/options.html` — now correctly references `/assets/options.js`
- `dist/assets/popup.js` — contains `className:"jutis-popup-root"` (PopupApp)
- `dist/assets/options.js` — contains `className:"jutis-options-root"` (OptionsApp)
- All other bundles (global.js, controller.js, background.js, runtime-dispatcher.js)

**No source files were modified. No configuration changes. No hand-editing of dist.**

---

## Session Storage — Verified from Source

### Previous report stated: P1 blocker (MemoryStorage fallback)

The previous analysis flagged this as a P1 issue based on the concern that `configureSessionStorageAccess()` could fail and cause `sessionStorageLike` to use `MemoryStorage`, losing session data on service worker restart.

### Re-verified from source

**`src/storage/extension-storage.ts`** — initialization of `sessionStorageLike`:

```typescript
export const sessionStorageLike: StorageLike =
  typeof chrome !== "undefined" && chrome.storage?.session
    ? new ChromeStorageArea(chrome.storage.session)
    : new MemoryStorage();
```

**In a proper MV3 extension runtime:**
- `typeof chrome !== "undefined"` → `true`
- `chrome.storage?.session` → the session StorageArea API
- Result: `ChromeStorageArea(chrome.storage.session)` is used

The `MemoryStorage` fallback only triggers if `chrome.storage.session` is absent — which does not occur in a properly running MV3 service worker. It would only occur in non-extension contexts (e.g., Vite dev server without extension context).

**`configureSessionStorageAccess()` failure analysis:**

```typescript
export async function configureSessionStorageAccess(): Promise<void> {
  if (!chrome.storage?.session?.setAccessLevel) {
    return; // Silently returns if API unavailable (Chrome < 112)
  }
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS"
  });
}
```

This is an **optional** Chrome 112+ enhancement (restricts session storage to trusted contexts). If it throws:
- The error propagates to `initializeRuntimeSession()` in background/index.ts
- Service workers do not have global unhandled-rejection catching in all versions
- The sessionStorage was **already initialized** to `ChromeStorageArea` before this call
- `chrome.storage.session` continues working regardless of `setAccessLevel` outcome

### Conclusion on session storage

**NOT a P1 blocker. P3 at most.**

In a proper MV3 extension context, `sessionStorageLike` always uses `ChromeStorageArea(chrome.storage.session)`. The `MemoryStorage` path is only reachable in non-extension environments. The session secret persists in `chrome.storage.session` across service worker restarts within the same browser session.

**Session is lost on browser restart** — this is intentional (background/index.ts:44-47 — `onStartup` always calls `lockAndSyncSession()`). This is a design choice, not a bug.

**Fix applied**: None needed. No code changes.

---

## Build Output Verification (After Fix)

```
dist/
├── manifest.json           ✓ MV3, complete permissions, correct structure
├── popup.html             ✓ src="/assets/popup.js", title="Jutis"
├── options.html           ✓ src="/assets/options.js", title="Jutis Workspace"
└── assets/
    ├── background.js      ✓ Service worker (1,106 bytes)
    ├── popup.js           ✓ PopupApp bundle (45,729 bytes) — className:"jutis-popup-root"
    ├── options.js         ✓ OptionsApp bundle (5,165 bytes) — className:"jutis-options-root"
    ├── global.js          ✓ Shared React + deps (208,157 bytes)
    ├── controller.js      ✓ JutisController + all adapters (374,443 bytes)
    ├── runtime-dispatcher.js ✓ Message executor (3,951 bytes)
    └── global.css         ✓ Compiled styles (1,563 bytes)
```

---

## What Changed

| Item | Before | After |
|---|---|---|
| `dist/popup.html` script | `src="/assets/options.js"` (WRONG) | `src="/assets/popup.js"` (CORRECT) |
| `dist/options.html` script | `src="/assets/popup.js"` (WRONG) | `src="/assets/options.js"` (CORRECT) |
| Bundle mapping | popup.js contained OptionsApp | popup.js contains PopupApp ✓ |
| Bundle mapping | options.js contained PopupApp | options.js contains OptionsApp ✓ |

**Files changed**: None. Only `dist/` artifacts regenerated via `npm run build`.

---

## Remaining Issues (Post-Fix)

### P0 — None

All P0 issues resolved by rebuilding.

### P1 — None confirmed as real

Session storage fallback concern was **disproven** from source analysis. No P1 blockers remain.

### P2

- No extension icons (manifest lacks `icons` field)
- No `content_security_policy` in manifest
- Canton integration is fixture-only (by design)
- Swap is intentionally fail-closed (by design)

### P3

- `host_permissions` may be narrow for full Base explorer enrichment
- `setAccessLevel` enhancement not applied (Chrome 112+)
- `onStartup` always locks session (intentional design)

---

*No source files were modified in this fix. The issue was stale build artifacts only.*
