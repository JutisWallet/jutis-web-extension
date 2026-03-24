# Jutis Extension — Runtime Trace

## Popup Boot Chain

```
dist/popup.html (WRONG - loads options.js)
  → dist/assets/options.js (CONTAINS OptionsApp - split-pane UI)
      → global.js (react, zustand, ethers, qrcode.react imports)
      → controller.js (JutisController singleton export)
      → Renders <OptionsApp /> (maxWidth:1120, 340px sidebar layout)
         → No screen management (no welcome/create/home screens)
         → No bootstrap() call
         → No wallet creation flow
         → No session touch flow

ACTUAL popup.js IS IN options.js, NOT popup.js
dist/options.html (WRONG - loads popup.js)
  → dist/assets/popup.js (CONTAINS PopupApp - wallet UI)
      → global.js
      → controller.js
      → Renders <PopupApp />
         → useEffect calls bootstrap()
         → bootstrap() → sendRuntimeRequest({ type: "jutis:bootstrap" })
         → chrome.runtime.sendMessage() → background worker
```

**Critical finding**: `dist/popup.html` loads the options bundle (OptionsApp) instead of the popup bundle. The actual popup bundle (PopupApp) is loaded by `dist/options.html`. The popup and options HTML entry points have **swapped script references**.

---

## Background Boot Chain

```
Service Worker starts (background.js)
  → Module: imports controller.js, runtime-dispatcher.ts, errors.ts, extension-storage.ts
  → sessionService = new SessionService()  [line 9 of background/index.ts]
  → void initializeRuntimeSession()         [line 97 - called immediately]

initializeRuntimeSession():
  1. configureSessionStorageAccess()
     → chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
     → Returns void if API unavailable (Chrome 112+ check)
  2. sessionService.enforceExpiry()
     → getSnapshot() → readSessionState() → returns { status: "locked" } if no session
  3. controller.reconcileBackgroundActivity()
     → baseActivityIndexer.reconcilePendingTransactions()
     → Reads Base transactions from storage, checks RPC for receipt updates
     → Gracefully handles RPC failures (returns [] on error)
  4. syncAutoLockAlarm()
     → Sets chrome.alarm for vault auto-lock expiry
  5. syncBaseReconcileAlarm()
     → Sets periodic alarm if pending transactions exist

chrome.runtime.onStartup listener:
  → On browser restart: calls lockAndSyncSession()
  → Session is cleared, vault stays but requires re-unlock

chrome.alarms.onAlarm listener:
  → AUTO_LOCK_ALARM → lockAndSyncSession() → session.lock() + sync alarm
  → BASE_RECONCILE_ALARM → reconcileBackgroundActivity() + reschedule alarm

chrome.runtime.onMessage listener [background/index.ts:63]:
  → Receives RuntimeRequest from popup
  → Calls executeRuntimeRequest(message) [runtime-dispatcher.ts]
  → sendResponse({ ok: true, data }) on success
  → sendResponse({ ok: false, error }) on failure
  → Returns true (async response)
```

The background worker is a proper MV3 service worker. All listeners are registered synchronously at module evaluation time. The worker is woken by `chrome.runtime.sendMessage` from the popup.

---

## Message Passing Chain

```
Popup (PopupApp rendered, but in WRONG context due to HTML swap)
  → store.bootstrap() [zustand action]
    → sendRuntimeRequest<BootstrapPayload>({ type: "jutis:bootstrap" })
      → isExtensionRuntimeAvailable() = true (chrome.runtime exists in extension context)
      → chrome.runtime.sendMessage(request) [runtime-client.ts:24]
        → Sends to background service worker
        → chrome.runtime.sendMessage is async; waits for response

Background Service Worker (always awake while popup is open)
  → chrome.runtime.onMessage listener fires
    → executeRuntimeRequest(message) [runtime-dispatcher.ts]
      → Switch on message.type
      → For "jutis:bootstrap":
          • controller.vaultService.hasVault() [vault-service.ts]
            → readVault() from persistentStorage (chrome.storage.local)
          • controller.readPreferences() [vault-repository.ts]
            → persistentStorage.get("jutis:prefs") ?? DEFAULT_PREFERENCES
          • controller.readFeatureFlags()
            → persistentStorage.get("jutis:flags") ?? DEFAULT_FEATURE_FLAGS
          • controller.readCantonIdentity()
            → persistentStorage.get("jutis:canton-identity") ?? DEFAULT_CANTON_IDENTITY
          • sessionService.getSnapshot() [session-service.ts]
            → readSessionState() from sessionStorageLike
            → If expired: clear and return { status: "locked" }
            → Else: return { status: "unlocked", unlockedAt, lastActivityAt, expiresAt }
      → Returns BootstrapPayload

  → Background sends RuntimeResponse via sendResponse()

Popup receives response:
  → set({ bootstrapped: true, hasVault, screen, preferences, ... })
  → Zustand triggers re-render
  → If hasVault=false → WelcomeScreen
  → If hasVault=true and session.locked → UnlockScreen
  → If hasVault=true and session.unlocked → HomeScreen
```

**Fallback path**: If `isExtensionRuntimeAvailable()` returns false (non-extension context), `sendRuntimeRequest` falls back to direct `executeRuntimeRequest()` import and call. This is the Vite dev server path. In the built extension, `chrome.runtime` is always available.

---

## Storage Chain

```
persistentStorage = ChromeStorageArea(chrome.storage.local)
  Keys used:
    "jutis:vault"           → PersistedVault (encrypted vault)
    "jutis:prefs"           → WalletPreferences
    "jutis:canton-identity" → CantonIdentity
    "jutis:flags"           → FeatureFlags
    "jutis:activity"        → ActivityRecord[] (legacy, migrated to base-transactions)
    "jutis:base-transactions" → BaseTrackedTransactionRecord[]
    "jutis:session"         → SessionState (via sessionStorageLike below)

sessionStorageLike = ChromeStorageArea(chrome.storage.session)
  Key used:
    "jutis:session" → SessionState (decrypted vault secret, auto-lock expiry)

configureSessionStorageAccess():
  → chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  → Only available in Chrome 112+
  → If unavailable: silently returns (no-op)
  → Does NOT fall back to MemoryStorage; just skips the access level config
```

**Vault persistence**:
```
VaultService.createFromRandomMnemonic(password)
  → Wallet.createRandom() [ethers]
  → persistSecret() encrypts with AES-GCM/PBKDF2
  → writeVault() → persistentStorage.set("jutis:vault", PersistedVault)

VaultService.unlock(password)
  → readVault() → persistentStorage.get("jutis:vault")
  → decryptJson(persisted, password) → WalletVaultSecret
  → Returns { baseMnemonic: string } or { basePrivateKey: `0x${string}` }
```

**Session persistence**:
```
SessionService.start(secret, autoLockMinutes)
  → SessionState stored in chrome.storage.session (not localStorage)
  → sessionStorageLike.set("jutis:session", SessionState)
  → Secret (decrypted vault) lives in session storage
  → Auto-lock alarm set via chrome.alarms API
```

---

## Wallet Initialization Chain (Unlock → Portfolio Load)

```
store.unlock(password)
  → sendRuntimeRequest({ type: "jutis:unlock", password })
    → Background: controller.unlockVault(password)
        → VaultService.unlock(password)
            → readVault() → persistentStorage
            → decryptJson() → WalletVaultSecret { baseMnemonic }
        → sessionService.start(secret, preferences.autoLockMinutes)
            → SessionState stored in chrome.storage.session
    → Background returns SessionPayload { session }

store.refresh()
  → sendRuntimeRequest({ type: "jutis:refresh" })
    → Background: sessionService.getSecretOrThrow()
        → readSessionState() → WalletVaultSecret
        → Throws SESSION_LOCKED if no valid session
    → controller.loadPortfolio(secret, cantonIdentity)
        → [baseAccounts, cantonAccounts] = Promise.all([
              baseAdapter.getAccounts(secret, null),
              cantonAdapter.getAccounts(secret, null)
            ])
            → BaseWalletAdapter.getAccounts():
                → Derives Wallet from mnemonic or private key
                → Returns AccountRecord { id, networkId, label, address }
            → CantonWalletAdapter.getAccounts():
                → Returns fixture/demo account records
        → [baseAssets, cantonAssets] = Promise.all([
              baseAdapter.getAssets(secret, null),
              cantonAdapter.getAssets(secret, null)
            ])
            → BaseWalletAdapter.getAssets():
                → provider = new JsonRpcProvider("https://mainnet.base.org", 8453)
                → balance = provider.getBalance(wallet.address)
                → Returns AssetRecord[] with ETH balance
                → On RPC error: returns { amount: "0.0000", support: "partial" }
            → CantonWalletAdapter.getAssets():
                → Returns CANTON_DEMO_ASSETS fixture data
        → baseActivity = baseActivityIndexer.list(baseAccounts)
            → lifecycleService.listActivity(accounts)
            → reconcilePendingTransactions() via RPC
        → cantonActivity = cantonActivityIndexer.list()
            → Returns CANTON_DEMO_ACTIVITY fixture data
        → Returns PortfolioSnapshot { totalUsdReference, byNetwork, accounts, assets, activity }
    → Background returns RefreshPayload { snapshot, session }
```

---

## Where Passive Failure Starts

**Root cause: HTML/script swap**

`dist/popup.html` contains:
```html
<script type="module" crossorigin src="/assets/options.js"></script>
```
This loads the **options bundle** (OptionsApp — split-pane workspace UI).

`dist/options.html` contains:
```html
<script type="module" crossorigin src="/assets/popup.js"></script>
```
This loads the **popup bundle** (PopupApp — wallet UI).

The popup window loads `popup.html` → renders **OptionsApp** instead of **PopupApp**.

**Effect of OptionsApp rendering in popup context**:
- `OptionsApp` has no screen management (no `screen` state, no `setScreen`)
- `OptionsApp` does NOT call `bootstrap()`
- `OptionsApp` does NOT call `sendRuntimeRequest`
- `OptionsApp` renders a static split-pane workspace UI with network overview
- No welcome screen, no create/import flow, no home screen
- **Buttons do nothing** because no Zustand actions are connected to them
- The UI appears but is completely non-interactive for wallet purposes

This is the **primary cause** of the "passive" state. The wallet UI (PopupApp) is in `options.js`, which is only opened via the options page URL, not via the toolbar popup.

**Secondary analysis: Would PopupApp work if loaded correctly?**
- `PopupApp` calls `bootstrap()` on mount
- `sendRuntimeRequest` goes through `chrome.runtime.sendMessage`
- Background service worker should be woken and respond
- All storage layers use chrome.storage APIs (correct for MV3 extension)
- Vault creation/unlock flows are properly wired
- Base network uses JsonRpcProvider with `https://mainnet.base.org`
- Canton returns fixture data by design

The backend chain is **correctly implemented** — the passivity is entirely due to the HTML script swap preventing PopupApp from loading in the popup context.

---

## Confidence Per Finding

| Finding | Confidence |
|---|---|
| `dist/popup.html` loads options.js | High — file content read directly |
| `dist/options.html` loads popup.js | High — file content read directly |
| popup.js contains PopupApp code | High — bundle content analyzed |
| options.js contains OptionsApp code | High — bundle content analyzed |
| Background worker boot chain correct | High — source analyzed directly |
| Message passing architecture correct | High — code reviewed directly |
| Storage layer correct for MV3 | High — storage interfaces verified |
| Base network adapter correct | High — RPC URL confirmed from fixtures.ts |
| Canton is fixture/reference-only by design | High — confirmed from README and fixture data |
| Service worker is proper MV3 module type | High — manifest confirmed |
| Wallet unlock/create flow correct | High — code chain verified |
| PopupApp bootstrap chain correct | High — React effects and store reviewed |
