# Jutis Extension — Minimum Runtime Plan

## Scope for This Phase

**Goal**: Make Jutis operational for Base wallet operations. Canton is a strategic target layered on top of a working runtime — do not touch Canton integration code in this phase.

**Do not touch**:
- Canton wallet adapter (`src/adapters/canton/`)
- Canton swap adapter
- Canton activity indexer
- Canton reference data service
- Canton capability matrix
- Any Canton-specific UI paths
- Swap engine and swap adapters (Base or Canton)
- USD reference service (leave as static development prices)
- Any design or visual polish

---

## Smallest Path to a Functioning Wallet Core

### Step 1: Fix the HTML script swap (P0)

**Problem**: `dist/popup.html` loads `options.js` and `dist/options.html` loads `popup.js`. The wallet UI never renders in the popup.

**Action**: Re-run the build and inspect `dist/popup.html` and `dist/options.html` to confirm the swap state.

```powershell
npm.cmd run build
# Then inspect:
# - dist/popup.html should have /assets/popup.js
# - dist/options.html should have /assets/options.js
```

**If swap persists after rebuild**:
- Investigate `vite.config.ts` rollup `output.entryFileNames` and `input` key naming
- The `rollupOptions.input` keys are `popup` and `options` — verify these produce correct output filenames
- Manually verify `dist/assets/popup.js` contains `PopupApp` (search for `bootstrap` or `screen` or `jutis-popup-root`)
- Manually verify `dist/assets/options.js` contains `OptionsApp` (search for `jutis-options-root`)

**If swap is corrected by rebuild**: Proceed to Step 2.

**If swap persists**: The issue is in the rollup configuration. Do NOT manually edit `dist/` files — fix the config.

---

### Step 2: Verify service worker starts and responds (P0)

After fixing the HTML, verify the background service worker is actually running:

1. Open `chrome://extensions/`
2. Find Jutis Wallet → "Service Worker" link
3. Click to open DevTools for the service worker
4. Run in console: `chrome.runtime.sendMessage({ type: "jutis:bootstrap" })`
5. Should return a response object with `hasVault`, `session`, `preferences`, etc.

**What to look for**:
- If response returns quickly → service worker is working
- If no response or error → service worker is not responding

**Common failure**: Service worker crashes on startup. Check the service worker DevTools console for red errors (especially related to `chrome.storage` API access).

---

### Step 3: Verify session storage access (P1 — session persistence)

**Problem**: `configureSessionStorageAccess()` requires Chrome 112+. If unavailable, `sessionStorageLike` falls back to `MemoryStorage` (plain Map), which loses session data on every service worker restart.

**Action**: Check if `chrome.storage.session.setAccessLevel` is available:
```javascript
// Run in service worker DevTools console:
console.log(typeof chrome.storage.session.setAccessLevel)
// "function" = available (Chrome 112+)
// "undefined" = NOT available → MemoryStorage fallback
```

**If NOT available**: The session will not persist across service worker restarts. This is a known issue. The vault is still secure (encrypted in `chrome.storage.local`), but users will need to re-enter their password after ~30 seconds of popup being closed.

**Fix**: Do not use MemoryStorage fallback for session. If `chrome.storage.session` exists but `setAccessLevel` doesn't, use `chrome.storage.session` directly without `setAccessLevel`. The `setAccessLevel` only restricts access to TRUSTED_CONTEXTS — without it, the session data is still session-scoped (cleared on browser close, not on service worker restart).

---

### Step 4: Verify Base network connectivity (P1)

**Action**: After creating/unlocking a wallet, check the browser console (popup DevTools):

1. Open popup → Create wallet → Enter password → Click "Create vault"
2. After vault is created, the home screen should show ETH balance
3. Open DevTools on the popup → check for errors in console

**Expected behavior**:
- ETH balance should appear (live from `https://mainnet.base.org` RPC)
- If RPC is unreachable: balance shows `0.0000` with "partial" support badge
- No console errors (only warnings acceptable)

**If balance shows 0 and RPC errors appear**: The Base RPC is rate-limited or unreachable. Options:
1. Wait and retry (public RPCs are rate-limited)
2. Use a different RPC endpoint (Infura, Alchemy — requires API key)
3. For development: use a local Base testnet node

**For now**: Accept that balance may show 0 on mainnet if RPC is rate-limited. The vault creation/unlock flow should still work even if balance shows 0.

---

### Step 5: Verify vault creation and unlock flow (P0)

**Action sequence**:
1. Open popup (should show WelcomeScreen now — not OptionsApp)
2. Click "Create wallet" → Enter password (8+ chars) and confirm
3. Click "Create vault"
4. **Expected**: Loading state → Home screen with ETH balance
5. Click "Lock now" in settings
6. **Expected**: Unlock screen
7. Enter password → Unlock
8. **Expected**: Home screen restored

**If this works end-to-end**: The core wallet runtime is functional.

**If "Create vault" click does nothing**: The HTML fix didn't take or there's another issue. Check popup DevTools console.

---

### Step 6: Verify send flow (P1 — Base operational target)

**Action sequence**:
1. With wallet unlocked and balance visible (or showing 0):
2. Click "Send" → Enter recipient address and amount
3. Click "Review transfer"
4. **Expected**: Confirmation screen with fee estimate
5. Click "Confirm transfer"
6. **Expected**: Transaction submitted → activity screen

**Note**: If balance is 0 due to RPC issues, the send will fail with validation error "Amount exceeds available balance". This is correct behavior — you cannot spend funds you don't have.

**If RPC is working but send still fails**: Check service worker console for RPC errors.

---

## Base-First Operational Sequence

```
[Phase 0] Fix HTML script swap
  └── Re-run npm run build → verify dist/popup.html → popup.js

[Phase 1] Verify runtime chain
  ├── Service worker starts and responds to messages
  ├── Session storage persists across popup opens
  ├── Vault creation: password → encrypted vault stored
  ├── Vault unlock: encrypted vault → decrypted secret → session stored
  └── Chrome.storage.local used for vault/preferences persistence

[Phase 2] Verify Base live path
  ├── getBalance() via JsonRpcProvider(https://mainnet.base.org)
  ├── Wallet derivation from mnemonic/privateKey
  ├── Send preview: gas estimation + fee calculation
  └── Send submit: wallet.sendTransaction() via provider

[Phase 3] End-to-end Base flow
  ├── Create wallet → Home screen with ETH balance
  ├── Send ETH → confirmation → broadcast → activity
  ├── Receive → QR code with wallet address
  └── Lock → Unlock → session resumes
```

---

## Canton Prerequisites

Canton can only be layered on top after the following Base runtime items are verified:

1. **Service worker message bus is stable** — Canton adapter calls go through the same `executeRuntimeRequest` dispatcher. If Base works, Canton message passing will work.

2. **Session management is working** — Canton adapter receives `cantonIdentity` from persistent storage. The `readCantonIdentity()` call in `jutis:refresh` already works.

3. **Base wallet is operational first** — The user should be able to create/unlock/send on Base before Canton features are exercised.

4. **Canton live topology must be provided** — Currently the Canton adapter returns fixture data. Real Canton integration requires:
   - A Canton network RPC/ledger endpoint
   - Party-based identity resolution
   - Canton-specific transaction signing (not Ethers-compatible)

**Do not attempt to wire live Canton until**:
- Base send flow works end-to-end
- A Canton validator/ledger topology is available
- Canton signer/party integration is explicitly designed

---

## Explicit "Do Not Touch Yet" List

```
src/adapters/canton/                          — Canton is strategic target, not Phase 1
src/adapters/canton/services/                 — Same as above
src/adapters/base/services/base-swap-adapter.ts — Swap disabled by design
src/adapters/canton/services/canton-swap-adapter.ts — Same as above
src/swap/                                     — Swap intentionally fail-closed
src/core/services/usd-reference-service.ts   — Leave as static prices for now
src/core/models/fixtures.ts (Canton fixtures) — Canton fixture data intentional
src/ui/components/kit.tsx                     — Do not refactor UI components
src/app/popup/App.tsx                        — Do not refactor UI screens
src/app/options/App.tsx                       — Do not refactor options UI
docs/                                        — Do not update docs in this phase
designed_source/                              — Do not touch design sources
```

---

## Minimum Viable Extension Definition for This Phase

A **minimum viable Jutis** for Base-first operational status:

1. Popup renders PopupApp (not OptionsApp) → **Fix HTML swap**
2. Background service worker responds to `jutis:bootstrap` message
3. Vault creation: mnemonic generated, encrypted, stored in `chrome.storage.local`
4. Vault unlock: decrypted, session stored in `chrome.storage.session`
5. Base balance visible: `provider.getBalance()` via `https://mainnet.base.org`
6. Base send preview: gas estimated, fee shown
7. Base send submit: `wallet.sendTransaction()` broadcast
8. Receive: QR code with wallet address displayed
9. Lock/Unlock: session managed, auto-lock alarm working
10. Network switcher: Canton and Base selectable in header

That is the complete Base-first runtime target for this phase.
