# Jutis Extension — Core Blockers

---

## P0 — Blocks Core Wallet Runtime

### 1. Popup HTML loads wrong bundle (options.js instead of popup.js)

**File**: `dist/popup.html` (and reverse for `dist/options.html`)

**Evidence** (file contents read directly):
- `dist/popup.html` → `<script type="module" crossorigin src="/assets/options.js">`
- `dist/options.html` → `<script type="module" crossorigin src="/assets/popup.js">`

**Effect**:
- `dist/popup.html` renders **OptionsApp** (split-pane workspace UI) instead of **PopupApp** (wallet UI)
- OptionsApp has no screen management, no bootstrap(), no wallet action handlers
- The popup window shows a static workspace UI — no welcome/create/import/home flow accessible
- The toolbar popup is effectively non-functional for wallet operations

**Root cause in build layer**: `vite.config.ts` rollup `input` configuration correctly names entries `popup` and `options`. The swap is a build artifact error (HTML files in `dist/` reference the wrong output bundle name).

**Fix**: Rebuild with `npm run build` — if swap persists, investigate rollup output naming. The source `popup.html` and `options.html` at project root have correct references and are the Vite dev entries; the `dist/` copies appear swapped.

**Impact on user**: Wallet cannot be created, imported, or unlocked through the popup.

---

## P1 — Loads But Actions Fail

### 2. Base RPC connectivity unverified

**Evidence**: `src/core/models/fixtures.ts:31` — `rpcUrl: "https://mainnet.base.org"`. This is a public RPC endpoint. No API key is configured.

**Effect**:
- `BaseWalletAdapter.getAssets()` calls `provider.getBalance(wallet.address)` via JsonRpcProvider
- If `https://mainnet.base.org` is rate-limited, unreachable, or requires an API key, balance queries fail silently → returns `amount: "0.0000"` with `support: "partial"`
- `BaseTransactionLifecycleService.reconcilePendingTransactions()` calls `provider.getBlockNumber()` and `provider.getTransactionReceipt()` — same failure modes
- Wallet can be created/unlocked but shows zero balance and no activity

**Fix**: Verify `https://mainnet.base.org` is reachable. For production: add an API key or use a rate-limit-resilient RPC provider (Infura, Alchemy, etc.)

### 3. Service worker lifecycle — session secret in memory only

**Evidence**: `src/storage/extension-storage.ts:43-44`:
```typescript
export const sessionStorageLike: StorageLike =
  typeof chrome !== "undefined" && chrome.storage?.session ? new ChromeStorageArea(chrome.storage.session) : new MemoryStorage();
```

**Effect**:
- `configureSessionStorageAccess()` (background/index.ts:46-54) requires Chrome 112+ `chrome.storage.session.setAccessLevel` API
- If running on older Chrome or if `setAccessLevel` fails silently: `sessionStorageLike` falls back to `MemoryStorage`
- **MemoryStorage is a plain JS Map** — all session data is lost when the service worker is restarted by Chrome
- Service workers in MV3 are killed after ~30 seconds of inactivity
- Every popup open after service worker kill would lose the session secret → vault appears locked even if it was recently unlocked
- The vault itself (encrypted in `chrome.storage.local`) survives

**Severity**: This is a **critical runtime bug** if `chrome.storage.session.setAccessLevel` is unavailable or fails. The `MemoryStorage` fallback makes the session effectively non-persistent across service worker restarts.

**Note**: `chrome.storage.local` is always available in MV3 service workers, but the session secret is stored in `sessionStorageLike` (chrome.storage.session), not local. This is intentional (session storage clears on browser close), but if `sessionStorageLike` uses MemoryStorage, it clears on every service worker restart.

### 4. `createWallet` busy state not cleared on error path

**Evidence**: `src/state/use-jutis-store.ts:188`:
```typescript
} catch (error) {
  set({ busy: false, error: error instanceof Error ? error.message : "Failed to create wallet." });
}
```

The error path correctly clears `busy`. However, if `sendRuntimeRequest` **never resolves** (e.g., background service worker does not respond), `busy` stays `true` forever and the error banner never shows. This is an edge case of Blocker #1 (popup loading OptionsApp means createWallet is never called anyway).

---

## P2 — Non-Core Feature Blockers

### 5. Canton integration is fixture/demo-only

**Evidence**: `src/adapters/canton/canton-wallet-adapter.ts` and `fixtures.ts` confirm Canton returns hardcoded demo assets and activity. `README.md` explicitly states Canton is "reference and planning mode" in this build.

**Effect**: Canton balances, activity, send, and swap are non-functional by design. Not a runtime bug — documented intentional limitation.

**Fix**: Integrate real Canton ledger/signer/topology when available. Out of scope for Base-first operational target.

### 6. Swap is intentionally fail-closed

**Evidence**: `BaseSwapAdapter` and `CantonSwapAdapter` exist but are development-only quote adapters. `QuoteEngine.getReadiness()` returns `canExecute: false` by default. `README.md` confirms: "swap is intentionally disabled until live provider and execution integrations exist."

**Effect**: Swap UI shows readiness state but "Confirm swap" does nothing. Not a runtime bug.

### 7. USD pricing is static/demo

**Evidence**: `src/core/services/usd-reference-service.ts` — `StaticUsdReferenceProvider` uses hardcoded prices (ETH: $3420). `README.md` confirms: "current values are explicitly estimated, demo, or unavailable."

**Effect**: Portfolio USD values are not live market prices. Not a runtime bug — documented limitation.

### 8. No content scripts, sidepanel, or devtools pages

**Evidence**: `manifest.json` has no `content_scripts`, `sidepanel`, or `devtools` fields. `vite.config.ts` only builds popup, options, and background entries.

**Effect**: Extension cannot inject into web pages or provide a side panel. This is architectural — not a bug.

---

## P3 — Cleanup / Technical Debt

### 9. No extension icons

**Evidence**: `public/assets/` does not exist. Manifest has no `icons` field.

**Effect**: Extension installs but shows no icon in browser toolbar. Loading still works (Chrome allows loading without icons).

### 10. `content_security_policy` not declared in manifest

**Evidence**: `public/manifest.json` has no `content_security_policy` field.

**Effect**: Browser uses default CSP. May cause issues if extension later loads external resources.

### 11. `host_permissions` may be too narrow for full Base block explorer enrichment

**Evidence**: `host_permissions: ["https://mainnet.base.org/*"]` — only covers RPC. Block explorer URLs (`https://base.blockscout.com/*`) are not declared.

**Effect**: `base-explorer-enrichment` feature flag (in DEFAULT_FEATURE_FLAGS) is unused in current codebase. If enabled later, explorer API calls would be blocked.

### 12. `RuntimeClientError` fallback path imports executeRuntimeRequest dynamically

**Evidence**: `src/app/shared/runtime-client.ts:19-21`:
```typescript
if (!isExtensionRuntimeAvailable()) {
  const { executeRuntimeRequest } = await import("@/app/shared/runtime-dispatcher");
  return executeRuntimeRequest(request) as Promise<T>;
}
```

**Effect**: This fallback works for Vite dev (non-extension context) but is not a true extension message pass — no response flows back to the caller. The fallback is one-way (popup executes and returns, but no `RuntimeResponse` is constructed). This is fine for dev but means the fallback path cannot properly handle errors from the dispatcher.

### 13. Service worker `onStartup` always locks session

**Evidence**: `src/app/background/index.ts:44-47`:
```typescript
chrome.runtime.onStartup.addListener(() => {
  void lockAndSyncSession();
});
```

**Effect**: Every browser restart requires re-entering the password. This is intentional ("We intentionally require a fresh unlock after browser restart") but means if a user closes and reopens the browser, they see the unlock screen instead of a resumed session.

### 14. `getAlarmTimestamp` returns `null` if session is locked

**Evidence**: `src/core/services/session-service.ts:116-118`:
```typescript
async getAlarmTimestamp(): Promise<number | null> {
  const sessionState = await this.getActiveSessionState();
  return sessionState ? new Date(sessionState.expiresAt).getTime() : null;
}
```

When `null`, `syncAutoLockAlarm` does not create an alarm. Correct behavior, but if `sessionStorageLike` is using MemoryStorage (see Blocker #3), this path may return `null` incorrectly after service worker restart.

---

## Summary Table

| # | Blocker | Priority | Type | Root File |
|---|---|---|---|---|
| 1 | Popup HTML loads options.js instead of popup.js | **P0** | Runtime | `dist/popup.html` |
| 2 | Base RPC connectivity unverified | **P1** | Functional | `fixtures.ts`, `base-wallet-adapter.ts` |
| 3 | Session MemoryStorage fallback on older Chrome | **P1** | Functional | `extension-storage.ts` |
| 4 | Busy state stuck if background never responds | **P1** | Edge case | `use-jutis-store.ts` |
| 5 | Canton fixture-only | P2 | Intentional | `canton-wallet-adapter.ts` |
| 6 | Swap fail-closed | P2 | Intentional | `quote-engine.ts` |
| 7 | Static USD pricing | P2 | Intentional | `usd-reference-service.ts` |
| 8 | No content scripts/sidepanel | P2 | Architecture | manifest.json |
| 9 | No extension icons | P3 | Cleanup | `public/assets/` |
| 10 | No CSP declared | P3 | Cleanup | manifest.json |
| 11 | Narrow host_permissions | P3 | Cleanup | manifest.json |
| 12 | Fallback path not a true message pass | P3 | Dev only | `runtime-client.ts` |
| 13 | onStartup always locks | P3 | Design | `background/index.ts` |
| 14 | MemoryStorage breaks alarm after SW restart | P3 | Edge case | `extension-storage.ts` |
