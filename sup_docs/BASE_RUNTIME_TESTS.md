# Jutis Extension — Base Runtime Tests

*Tests assume popup/output wiring is fixed and PopupApp renders correctly in the toolbar popup.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (Load unpacked)
- Service worker DevTools open for inspection
- Extension must be in unlocked state (create or import wallet first)

---

## 1. Service Worker Checks

### 1.1 Service Worker Boot

**Steps**:
1. Open `chrome://extensions`
2. Find Jutis card → click **Service worker** link
3. DevTools console opens for the service worker

**Expected**:
- No red errors in console on load
- `f()` executes silently (the IIFE that calls `initializeRuntimeSession()`)

```javascript
// To verify session service is initialized:
const s = await import("./runtime-dispatcher.js").then(m => m.getSessionService())
console.log(await s.getSnapshot())
// Expected: { status: "locked" } or { status: "unlocked", unlockedAt: ..., expiresAt: ... }
```

### 1.2 Bootstrap Message

**Steps** (in service worker console):
```javascript
chrome.runtime.sendMessage({ type: "jutis:bootstrap" })
```

**Expected response**:
```json
{
  "ok": true,
  "data": {
    "hasVault": true,
    "session": { "status": "unlocked", ... },
    "preferences": { "autoLockMinutes": 5, "selectedNetworkId": "base-mainnet", ... },
    "featureFlags": { ... },
    "cantonIdentity": null
  }
}
```

### 1.3 Base Adapter Direct Check

**Steps** (in service worker console):
```javascript
const { controller } = await import("./controller.js")
const snap = await controller.loadPortfolio({ baseMnemonic: "your mnemonic here" }, null)
// Or use session secret if unlocked:
const session = await controller.sessionService.getSnapshot()
if (session.status === "unlocked") {
  const snap = await controller.loadPortfolio(session, null)
  console.log("Base accounts:", snap.accounts.filter(a => a.networkId === "base-mainnet"))
  console.log("Base assets:", snap.assets.filter(a => a.networkId === "base-mainnet"))
}
```

**Expected**:
- `accounts` array contains one record with `networkId: "base-mainnet"`, `support: "real"`, valid `0x...` address
- `assets` array contains ETH record with numeric `amount` or `"0.0000"` if RPC unavailable

---

## 2. Popup Checks

### 2.1 Popup Renders PopupApp

**Steps**:
1. Click Jutis icon in Chrome toolbar
2. Popup window opens

**Expected**:
- Title bar: "Jutis"
- Either WelcomeScreen (no vault), UnlockScreen (vault locked), or HomeScreen (vault unlocked)
- No OptionsApp split-pane content

### 2.2 Network Selection Persists

**Steps**:
1. With wallet unlocked, verify "Base" network is selected in header
2. Close popup
3. Reopen popup
4. Check network selection

**Expected**: Base network remains selected (persisted in preferences via `chrome.storage.local`)

### 2.3 Screen State After Reopen

**Steps**:
1. Unlock wallet → HomeScreen shown
2. Close popup completely (click away or press Escape)
3. Reopen popup within auto-lock period

**Expected**: HomeScreen shown again (session still valid in `chrome.storage.session`)

**If auto-lock period expired**: UnlockScreen shown.

---

## 3. Balance Checks

### 3.1 Base ETH Balance — Live RPC

**Steps**:
1. Unlock wallet (or create new)
2. HomeScreen shows Base portfolio
3. Locate ETH asset card

**Expected**:
- ETH amount: numeric value (e.g., "0.0000" to "9999.1234")
- Badge: green "live" if RPC responded successfully
- USD value: estimated at $3,420/ETH (static, not live)

### 3.2 Base ETH Balance — RPC Unavailable

**Steps**:
1. With balance visible, disconnect network or block RPC
2. Click Refresh

**Expected**:
- Amount: "0.0000"
- Badge: yellow "partial"
- USD value: "unavailable" message
- No error banner/toast

### 3.3 Balance Precision

**Steps**: Create wallet → check ETH amount of newly derived account

**Expected**: Amount displayed to 4 decimal places (e.g., "0.0000" for zero balance)

---

## 4. Refresh Checks

### 4.1 Refresh Triggers Full Portfolio Reload

**Steps**:
1. HomeScreen with Base network selected
2. Click Refresh button (in header or action bar)
3. Observe loading state → updated balance

**Expected**:
- Brief loading indicator
- Balance updates (or confirms current value)
- `getAccounts`, `getAssets`, and activity reconciliation all execute

### 4.2 Refresh Works After Popup Reopen

**Steps**:
1. HomeScreen → Close popup → Reopen popup → HomeScreen shown
2. Click Refresh

**Expected**: Balance reloads from RPC (same as 4.1)

### 4.3 Refresh With Canton Selected

**Steps**:
1. Switch to Canton network in header
2. Click Refresh

**Expected**: Canton demo assets shown (fixture data), no RPC dependency

---

## 5. Send Validation Checks

### 5.1 Cannot Send Without Unlock

**Steps**:
1. Lock wallet (clear session: `chrome.storage.session.clear()` in SW console)
2. Open popup → UnlockScreen shown
3. Attempt to navigate to Send (if any bypass exists)

**Expected**: Send not accessible while locked — redirects to UnlockScreen

### 5.2 Invalid Recipient Address

**Steps**:
1. Unlock wallet → HomeScreen
2. Open Send overlay (click Send)
3. Select Base network
4. Enter `0xinvalidaddress` as recipient
5. Enter valid amount
6. Attempt preview

**Expected**: Validation error shown — "Recipient must be a valid Base address."

### 5.3 Zero Amount

**Steps**:
1. Send overlay, Base network
2. Enter valid recipient address
3. Enter `0` or negative amount

**Expected**: Validation error — "Amount must be greater than zero."

### 5.4 Amount Exceeds Balance

**Steps**:
1. Send overlay, Base network
2. Enter valid recipient address
3. Enter amount greater than shown ETH balance (e.g., "999999")

**Expected**: Validation error — "Amount exceeds the available asset balance."

### 5.5 Amount Plus Fee Exceeds Balance

**Steps**:
1. Send overlay, Base network
2. Enter valid recipient address
3. Enter amount close to but less than balance (e.g., "0.9000" when balance is "1.0000")
4. Preview is computed

**Expected**: If estimated fee makes total exceed balance → "Amount plus estimated fee exceeds the available ETH balance."

### 5.6 Gas Estimation Failure

**Steps**:
1. Send overlay, Base network
2. With RPC unavailable, enter valid address and amount
3. Trigger preview

**Expected**:
- Preview returns with `warnings: ["Gas estimation could not be completed. The current preview is best-effort."]`
- `estimatedFeeNative: null`
- `support: "partial"`
- Submit button is still enabled (user can proceed with uncertainty)

---

## 6. Receive Checks

### 6.1 Receive Shows Base Address

**Steps**:
1. HomeScreen, Base network selected
2. Click Receive (or QR icon)

**Expected**:
- Overlay shows QR code with Base address encoded
- Address text displayed below QR (valid `0x...` address)
- Label: "Base address"
- Note: "Only send Base-compatible assets to this address."

### 6.2 Address Matches Derived Account

**Steps**:
1. Receive overlay shown with Base address
2. Copy address (tap/click text)
3. Compare with address shown in HomeScreen account card

**Expected**: Same address in both places.

### 6.3 Receive on Canton Network

**Steps**:
1. Switch to Canton network
2. Open Receive overlay

**Expected**: Canton-specific receive info shown (party info, not a Base address/QR)

---

## 7. Popup Reopen / Session Checks

### 7.1 Session Survives Popup Close

**Steps**:
1. Unlock wallet → HomeScreen
2. Close popup (click outside or Escape)
3. Reopen popup immediately

**Expected**: HomeScreen shown (no unlock required)

### 7.2 Session Survives Service Worker Restart

**Steps**:
1. Unlock wallet → HomeScreen
2. In `chrome://extensions`, find Jutis → click **Service worker** → **Stop** button
3. Reopen popup

**Expected**: HomeScreen shown (session survives SW restart within same browser session — `chrome.storage.session` persists)

### 7.3 Session Lost on Browser Restart

**Steps**:
1. Unlock wallet → HomeScreen
2. Close all Chrome windows / restart browser
3. Open Chrome → click Jutis extension icon

**Expected**: UnlockScreen shown (session intentionally cleared on `chrome.runtime.onStartup`)

### 7.4 Network Selection Survives Reopen

**Steps**:
1. Select Canton network
2. Close popup
3. Reopen popup

**Expected**: Canton still selected (persisted in `chrome.storage.local`)

### 7.5 Selected Asset Survives Reopen

**Steps**:
1. HomeScreen, Base network, ETH selected
2. Close popup
3. Reopen popup

**Expected**: ETH still the selected asset (send draft persists within session, not across closes — confirmed from store defaults on bootstrap)

---

## 8. Failure Scenarios

### 8.1 No Vault — Welcome Screen

**Steps**: Fresh profile — load extension, no prior vault

**Expected**:
- WelcomeScreen with "Create wallet" and "Import wallet" buttons
- No crash, no error

### 8.2 Wrong Unlock Password

**Steps**:
1. Create wallet with password "correctpassword"
2. Lock session: `chrome.storage.session.clear()` in SW console
3. Open popup → UnlockScreen
4. Enter "wrongpassword" and submit

**Expected**: Error message on UnlockScreen — "Incorrect password" or similar

### 8.3 RPC Rate Limit — getBalance Fails

**Steps**:
1. Unlock wallet
2. Wait for or simulate rate limit on `https://mainnet.base.org`
3. Refresh portfolio

**Expected**:
- Balance: "0.0000"
- Badge: "partial" (yellow)
- No crash
- No error banner

### 8.4 Submit Send When RPC Down

**Steps**:
1. Send overlay, valid inputs
2. Shut down or block `https://mainnet.base.org`
3. Click Confirm/Send

**Expected**: Submission fails with error shown in UI — transaction NOT recorded

### 8.5 Pending Transaction Never Confirms

**Steps**:
1. Submit a send transaction while RPC is working
2. Immediately block RPC
3. Wait for reconcile alarm (1 minute)
4. Check pending transaction status

**Expected**:
- Transaction stays in "submitted" or "pending" status
- Detail note updated to "Base RPC reconciliation is currently unavailable"
- No crash

### 8.6 Empty Send Draft Network Mismatch

**Steps**:
1. Send overlay, Base network selected
2. Switch network to Canton in header while send overlay is open

**Expected** (verify from code):
- Send draft retains Base networkId until explicitly changed
- No silent cross-network send

---

## Test Summary Checklist

| Test | Pass Criteria | Tested |
|---|---|---|
| SW boot — no console errors | Clean console | ☐ |
| SW — jutis:bootstrap message | Returns hasVault + session | ☐ |
| SW — loadPortfolio returns Base accounts | account.networkId === "base-mainnet" | ☐ |
| Popup — renders PopupApp (not OptionsApp) | Welcome/Unlock/Home screen visible | ☐ |
| Popup — network selection persists | Base selected after reopen | ☐ |
| Popup — HomeScreen after reopen (unlocked) | No re-unlock needed | ☐ |
| Balance — live RPC | Numeric amount, green badge | ☐ |
| Balance — RPC unavailable | "0.0000", yellow "partial" badge | ☐ |
| Refresh — triggers reload | Loading state → updated balance | ☐ |
| Send — invalid address rejected | Validation error shown | ☐ |
| Send — zero amount rejected | Validation error shown | ☐ |
| Send — insufficient balance rejected | Validation error shown | ☐ |
| Send — amount+fee exceeds balance | Validation error shown | ☐ |
| Send — gas estimation failure | Warning, partial badge, submit enabled | ☐ |
| Receive — shows Base QR + address | Valid 0x address in QR | ☐ |
| Session — survives popup close | HomeScreen after reopen | ☐ |
| Session — survives SW restart | HomeScreen after SW stop+reopen | ☐ |
| Session — lost on browser restart | UnlockScreen after restart | ☐ |
| Submit — RPC down fails gracefully | Error shown, no phantom tx recorded | ☐ |
