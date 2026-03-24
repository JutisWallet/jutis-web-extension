# Jutis Extension — Manual Smoke Test

*Verified after `npm run build` — dist/ corrected and loadable.*

---

## Prerequisites

- Chrome or Chromium-based browser (Chrome 112+ recommended)
- `npm run build` has completed successfully
- `dist/` folder contains regenerated artifacts

---

## 1. Load Extension in Developer Mode

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder (absolute path: `C:\Users\Nida Bil\Desktop\web-extension-jutis\dist`)

**Expected**: Extension card appears with "Jutis" name, no errors in the card.

**Verify popup loads**:
- Click the **puzzle piece** (Extensions) icon in the Chrome toolbar
- Find "Jutis" in the list
- Click it — popup window should appear showing "Jutis" title in the top bar

---

## 2. Service Worker Verification

1. In `chrome://extensions`, find the Jutis card
2. Click **Service worker** link (or "background page" → "service worker")
3. Chrome DevTools opens for the service worker

**Verify on load**:
- Console should show no red errors
- `f()` call at bottom of `background.js` (the `f()` is the `initializeRuntimeSession()` invocation) fires silently

**Test jutis:bootstrap message**:
1. In the service worker DevTools console, run:
```javascript
chrome.runtime.sendMessage({ type: "jutis:bootstrap" })
```
2. Press Enter

**Expected response** (returned via `sendResponse`):
```json
{
  "ok": true,
  "data": {
    "hasVault": false,
    "session": { "status": "locked" },
    "preferences": { ... },
    "featureFlags": { ... },
    "cantonIdentity": null
  }
}
```

**If hasVault is true**: You have an existing vault from a prior session. Proceed to unlock.

---

## 3. Popup Boot Verification

1. Click the Jutis extension icon in the toolbar
2. Popup window appears

**Expected first-run behavior**:
- Title bar: "Jutis"
- Screen: **WelcomeScreen** — two buttons visible: "Create wallet" and "Import wallet"
- No error banners

**Check React renders**:
- Right-click inside popup → Inspect
- DevTools opens on the popup's page
- In the Elements panel, find `<div id="root">` — it should contain a child with `class="jutis-popup-root"`

---

## 4. Create Wallet Verification

**Steps**:
1. From WelcomeScreen, click **"Create wallet"**
2. Screen transitions to **CreateScreen** with a password field and submit button
3. Enter a password (minimum 8 characters)
4. Click **Create**
5. Wait for processing (typically <2 seconds)

**Expected behavior**:
- Password field clears
- Vault creation executes in background (background service worker)
- Screen transitions to **HomeScreen** showing portfolio
- In the service worker console, `chrome.storage.local` now contains `"jutis:vault"` entry

**Expected home screen state**:
- Header: "Home" or portfolio summary
- Network tabs: Base (primary), Canton (demo)
- Base asset card: ETH balance (may show "—" or "0.0000" if RPC is slow)
- Support badge on ETH: "live" (green) or "partial" (yellow)

---

## 5. Unlock Wallet Verification

**Simulate a locked session**:
1. Open `chrome://extensions` → Jutis card → **Service worker** link
2. In the service worker console, run:
```javascript
chrome.storage.session.clear();
```
3. Click the Jutis extension icon again

**Expected**:
- Popup shows **UnlockScreen** (not HomeScreen)
- Password input field visible
- "Create wallet" / "Import wallet" are NOT visible

**Unlock with password**:
1. Enter the password used in Step 4
2. Click **Unlock**
3. Wait for processing (<1 second)

**Expected**:
- Screen transitions to **HomeScreen**
- Portfolio data loads
- Session secret is now in `chrome.storage.session`

---

## 6. Refresh / Portfolio Load Verification

**From HomeScreen**:
1. Locate the **Refresh** button (typically in header or action bar)
2. Click it

**Expected**:
- Loading indicator appears briefly
- ETH balance on Base network updates (or confirms current value)
- Activity list may update below portfolio

**If RPC is rate-limited**:
- Balance may remain at prior value or show "0.0000"
- No error toast/banner appears (silent degradation — intentional)
- Support badge shows "partial" (yellow) on the asset card

---

## 7. Base Balance Verification

**Check the Base network path**:
1. From HomeScreen, verify "Base" network is selected/visible
2. Look for an ETH asset card

**Expected on live RPC**:
- `Amount`: numeric value (e.g., "0.0000" to "9999.9999")
- `USD`: `$X,XXX.XX` at estimated rate (ETH × $3,420 — static, not live)
- `Support`: "live" badge (green)

**Expected on rate-limited RPC**:
- `Amount`: "0.0000"
- `Support`: "partial" badge (yellow)
- No visible error message

---

## 8. Auto-Lock Verification

**Trigger auto-lock**:
1. Create and unlock a wallet (Steps 4–5)
2. In service worker console, run:
```javascript
chrome.storage.session.clear();
```
3. Wait 1 second
4. Click Jutis icon

**Expected**:
- **UnlockScreen** appears — session was not persisted
- If you set a custom auto-lock time, the session should lock after that duration

---

## 9. Error Cases

### Service worker not responding
- If `chrome.runtime.sendMessage` returns `undefined` after 5 seconds, the service worker is dormant
- Click the Jutis extension icon again to wake it, then retry

### Popup shows wrong screen
- If WelcomeScreen appears but you already created a vault: session expired, re-unlock
- If OptionsApp content appears in popup: stale dist — run `npm run build` again

### Vault creation fails silently
- Check service worker console for errors
- Common cause: `chrome.storage.local` quota exceeded (extremely rare)

### Unlock fails
- Wrong password: error shown on UnlockScreen
- No vault found: redirected to WelcomeScreen

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| Load extension | No manifest error, icon appears in Extensions list | ☐ |
| Popup renders | "Jutis" popup with WelcomeScreen or HomeScreen | ☐ |
| Service worker boots | No console errors on load | ☐ |
| jutis:bootstrap message | Returns `{ hasVault, session, preferences }` | ☐ |
| Create wallet | HomeScreen appears after password submit | ☐ |
| Vault persists in storage.local | `"jutis:vault"` key exists after creation | ☐ |
| Unlock wallet | HomeScreen appears after correct password | ☐ |
| Session in storage.session | `"jutis:session"` key exists after unlock | ☐ |
| Refresh portfolio | Balance updates or shows partial support | ☐ |
| Base ETH balance | Shows numeric amount or "0.0000" on rate-limit | ☐ |
| Auto-lock | Session clears → UnlockScreen shown | ☐ |

---

*All tests assume `npm run build` was run fresh. If popup or options show swapped content, re-run `npm run build`.*
