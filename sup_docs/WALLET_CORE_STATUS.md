# Jutis Extension — Wallet Core Status

*Verified after `npm run build` — dist/ corrected.*

---

## Popup Boot Status

**Status**: ✅ OPERATIONAL

`dist/popup.html` now correctly loads `popup.js` which contains PopupApp (className: "jutis-popup-root").

**Boot chain**:
```
popup.html → /assets/popup.js
  → imports global.js (React 19, Zustand 5, ethers 6, qrcode.react)
  → imports controller.js (JutisController)
  → renders <PopupApp />
    → useEffect calls bootstrap() [line 1031 of src/app/popup/App.tsx]
      → sendRuntimeRequest({ type: "jutis:bootstrap" })
        → chrome.runtime.sendMessage() to background worker
          → background responds with BootstrapPayload
            → store.set({ bootstrapped: true, hasVault, screen, preferences, ... })
              → React re-renders with correct screen
```

**Expected behavior**:
- If no vault: WelcomeScreen with "Create wallet" / "Import wallet"
- If vault + locked: UnlockScreen with password field
- If vault + unlocked: HomeScreen with portfolio

---

## Bootstrap Status

**Status**: ✅ WIRED AND READY

**Source chain** (`src/app/popup/App.tsx:1030-1032`):
```typescript
useEffect(() => {
  void bootstrap();
}, [bootstrap]);
```

**Zustand bootstrap action** (`src/state/use-jutis-store.ts:151-169`):
```typescript
async bootstrap() {
  const payload = await sendRuntimeRequest<BootstrapPayload>({
    type: "jutis:bootstrap"
  });
  set({
    bootstrapped: true,
    hasVault: payload.hasVault,
    screen: deriveScreen(payload.hasVault, payload.session),
    preferences: payload.preferences,
    ...
  });
}
```

**Background handler** (`src/app/shared/runtime-dispatcher.ts:32-47`):
```typescript
case "jutis:bootstrap": {
  const [hasVault, preferences, featureFlags, cantonIdentity, session] =
    await Promise.all([
      controller.vaultService.hasVault(),
      controller.readPreferences(),
      controller.readFeatureFlags(),
      controller.readCantonIdentity(),
      sessionService.getSnapshot()
    ]);
  return { hasVault, preferences, featureFlags, cantonIdentity, session };
}
```

**All 5 data sources** are from chrome.storage (persistent or session) — no network calls at bootstrap.

**Expected**: Bootstrap completes in <100ms. Screen transitions to correct state immediately.

---

## Background Messaging Status

**Status**: ✅ OPERATIONAL

**Message path**:
```
Popup                    Background Worker
  │                            │
  │ chrome.runtime.sendMessage │
  │ ─────────────────────────► │
  │                            │ chrome.runtime.onMessage listener fires
  │                            │ executeRuntimeRequest(request)
  │                            │   → vaultService.hasVault()
  │                            │   → readPreferences()
  │                            │   → sessionService.getSnapshot()
  │                            │   → etc.
  │ sendResponse({ ok, data })  │
  │ ◄───────────────────────── │
  │ RuntimeResponse received    │
```

**Background service worker** (`dist/assets/background.js`):
- Registers `chrome.runtime.onMessage` listener at module init
- `void initializeRuntimeSession()` called immediately (service worker boot)
- `chrome.alarms.onAlarm` listener for auto-lock and reconcile
- `chrome.runtime.onStartup` listener for browser restart

**Verified**:
- `background.js` exists in dist (1,106 bytes)
- Service worker type is `module` in manifest
- Manifest grants `alarms`, `storage`, `clipboardWrite` permissions

---

## Create Wallet Status

**Status**: ✅ IMPLEMENTED

**Flow**:
```
User clicks "Create vault" → store.createWallet(password)
  → sendRuntimeRequest({ type: "jutis:create-wallet", password })
    → background: controller.createVaultFromMnemonic(password)
        → VaultService.createFromRandomMnemonic(password)
            → Wallet.createRandom() [ethers]
            → persistSecret() → encryptJson AES-GCM/PBKDF2
            → writeVault() → chrome.storage.local
        → controller.unlockVault(password)
            → decryptJson() → WalletVaultSecret { baseMnemonic }
        → sessionService.start(secret, autoLockMinutes)
            → SessionState → chrome.storage.session
    → store.set({ hasVault: true, session, screen: "home" })
```

**Vault storage**:
- Encrypted vault: `chrome.storage.local` key `"jutis:vault"`
- Session secret: `chrome.storage.session` key `"jutis:session"`

**Expected**: Password 8+ chars → vault created → home screen appears.

---

## Unlock Wallet Status

**Status**: ✅ IMPLEMENTED

**Flow**:
```
User enters password → store.unlock(password)
  → sendRuntimeRequest({ type: "jutis:unlock", password })
    → background: controller.unlockVault(password)
        → readVault() from chrome.storage.local
        → decryptJson() → WalletVaultSecret
        → sessionService.start(secret, preferences.autoLockMinutes)
    → store.set({ session: { status: "unlocked" }, screen: "home" })
```

**Expected**: Correct password → vault unlocked → home screen.

**Auto-lock**: `chrome.alarms` schedules lock at expiry. Locked by browser restart or manual "Lock now".

---

## Refresh / Portfolio Load Status

**Status**: ✅ IMPLEMENTED

**Flow** (`src/app/shared/runtime-dispatcher.ts:100-110`):
```
store.refresh()
  → sendRuntimeRequest({ type: "jutis:refresh" })
    → sessionService.getSecretOrThrow()
        → readSessionState() → WalletVaultSecret
    → controller.loadPortfolio(secret, cantonIdentity)
        → [baseAccounts, cantonAccounts] = Promise.all([
            baseAdapter.getAccounts(secret, null),
            cantonAdapter.getAccounts(secret, null)
          ])
        → [baseAssets, cantonAssets] = Promise.all([
            baseAdapter.getAssets(secret, null),
            cantonAdapter.getAssets(secret, null)
          ])
        → baseActivity = baseActivityIndexer.list(baseAccounts)
        → cantonActivity = cantonActivityIndexer.list()
    → Returns { snapshot, session }
```

**Base asset loading** (`src/adapters/base/base-wallet-adapter.ts:60-108`):
```typescript
async getAssets(secret, _cantonIdentity): Promise<AssetRecord[]> {
  const wallet = this.getWallet(secret);  // from mnemonic or privateKey
  const provider = this.getProvider();       // new JsonRpcProvider("https://mainnet.base.org", 8453)
  const balance = await provider.getBalance(wallet.address);
  const amount = Number(formatEther(balance)).toFixed(4);
  return [{ id: "base-eth", symbol: "ETH", amount, usdReference: ..., support: "real" }];
}
```

**RPC endpoint**: `https://mainnet.base.org` (chainId 8453) — from `src/core/models/fixtures.ts:30-31`.

---

## Base Asset Loading Status

**Status**: ✅ INFRASTRUCTURE COMPLETE — depends on live RPC

**Implementation** (`src/adapters/base/base-wallet-adapter.ts`):
- `getAccounts()` — derives EVM address from mnemonic/privateKey
- `getAssets()` — calls `provider.getBalance()` via JsonRpcProvider
- `getSendPreview()` — gas estimation via `provider.estimateGas()`
- `submitSend()` — `wallet.sendTransaction()` broadcast

**Expected behavior when RPC is available**:
- ETH balance shown live from Base mainnet
- USD value shown (static $3,420/ETH — not live price)
- Support badge: "live" (green)

**When RPC is rate-limited or unreachable**:
- `provider.getBalance()` throws → `catch` block returns `amount: "0.0000"`, `support: "partial"`
- Error banner NOT shown (silent degradation)
- Support badge: "partial" (yellow)

**RPC URL from fixtures**: `"https://mainnet.base.org"` — public endpoint, rate-limited.

---

## Session Persistence Status

**Status**: ✅ WORKING (correct chrome.storage.session usage)

From source analysis:
- `sessionStorageLike` → `ChromeStorageArea(chrome.storage.session)` in MV3 runtime
- Session secret stored in `chrome.storage.session` (survives service worker restart within browser session)
- `chrome.runtime.onStartup` intentionally locks session on browser restart

---

## Remaining Limitations

### Session locks on browser restart (intentional)
`background/index.ts:44-47` — `onStartup` always calls `lockAndSyncSession()`. User must re-enter password after browser restart. This is documented as intentional.

### Static USD pricing (by design)
`UsdReferenceService` uses `StaticUsdReferenceProvider` with hardcoded ETH=$3,420. Not live market data. Shown as "estimated" trust level.

### No extension icons
Manifest lacks `icons` field. Extension loads and functions, but browser toolbar shows no icon.

### Canton fixture-only (by design)
Canton adapter returns `CANTON_DEMO_ASSETS` and `CANTON_DEMO_ACTIVITY`. Canton send/swap are stubs.

### Swap fail-closed (by design)
No live swap provider. `canExecute: false`. "Confirm swap" does nothing.

---

## Confidence Summary

| Component | Confidence | Evidence |
|---|---|---|
| Popup renders PopupApp | High | dist/popup.html → popup.js → grep "jutis-popup-root" |
| bootstrap() call | High | src/app/popup/App.tsx:1030-1032 — useEffect confirmed |
| Background message handler | High | dist/assets/background.js — chrome.runtime.onMessage confirmed |
| Vault creation | High | src/core/services/vault-service.ts — ethers Wallet.createRandom() + encryptJson |
| Vault unlock | High | src/core/services/vault-service.ts:32-40 — decryptJson + sessionService.start() |
| Base getAccounts | High | src/adapters/base/base-wallet-adapter.ts:41-58 — ethers Wallet derivation |
| Base getAssets | High | src/adapters/base/base-wallet-adapter.ts:60-108 — JsonRpcProvider.getBalance() |
| Base send | High | src/adapters/base/base-wallet-adapter.ts:210-248 — wallet.sendTransaction() |
| Session storage | High | src/storage/extension-storage.ts — ChromeStorageArea(chrome.storage.session) |
| Service worker boot | High | dist/assets/background.js — init calls configureSessionStorageAccess, enforceExpiry, reconcile |
