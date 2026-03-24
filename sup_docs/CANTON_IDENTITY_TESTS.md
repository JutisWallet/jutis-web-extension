# Jutis Extension — Canton Identity Tests

*Manual smoke test procedures for the Canton identity linkage flow.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (load unpacked)
- Extension must have a vault created (create wallet flow completes)
- Service worker DevTools open for storage inspection

---

## T1 — Link Party Test

**Steps**:
1. Open Jutis popup → create wallet (or import) → unlock → HomeScreen
2. Click **Settings** in bottom nav
3. In "Canton identity" section, click **"Link party"**
4. Verify LinkPartyScreen appears

**Expected**: LinkPartyScreen shown with empty input, explanatory text, and "Link party" button (disabled until input entered).

---

## T2 — Invalid Input Test

**Steps** (from LinkPartyScreen):
1. Click **"Link party"** without entering anything

**Expected**: Error banner: "Party identifier cannot be empty." No network call made.

---

## T3 — Link Party Happy Path

**Steps**:
1. In LinkPartyScreen, enter: `party::test-party-123`
2. Click **"Link party"** button
3. Wait for navigation back to Settings

**Expected**:
- Button shows "Linking..." during operation
- Navigates to Settings screen
- "Canton identity" section now shows party id abbreviated: `party::t...`
- Button text changed to "Change party"

**Storage verification** (in service worker console):
```javascript
const { readCantonIdentity } = await import("./controller.js").then(m => m.controller.readCantonIdentity())
console.log(await readCantonIdentity())
// { networkId: "canton-mainnet", partyId: "party::test-party-123", authMode: "unlinked", support: "partial", ... }
```

---

## T4 — Unlink / Clear Test

**Steps**:
1. From Settings, click **"Change party"** (now visible instead of "Link party")
2. On LinkPartyScreen, click **"Unlink party"**
3. Wait for navigation back to Settings

**Expected**:
- Button shows "Unlinking..." during operation
- Navigates to Settings screen
- "canton identity" section shows: "Party: Not linked"
- Button text changed back to "Link party"

**Storage verification**:
```javascript
console.log(await readCantonIdentity())
// { ..., partyId: null, authMode: "mock", ... }
```

---

## T5 — Popup Reopen Persistence Test

**Steps**:
1. Link a party (e.g., `party::persist-test`)
2. Close popup completely (click outside or Escape)
3. Reopen Jutis popup
4. Navigate to Settings

**Expected**: "Canton identity" section shows the same party id that was just linked. "Change party" button visible.

**If session expired** (redirected to UnlockScreen): Unlock first, then check Settings.

---

## T6 — Browser Restart Persistence Test

**Steps**:
1. Link a party (e.g., `party::restart-test`)
2. Close all Chrome windows / restart browser
3. Open Chrome → click Jutis extension icon
4. Unlock wallet (if locked)
5. Navigate to Settings

**Expected**: Party id preserved in Settings. Storage persists across browser restart because Canton identity is stored in `chrome.storage.local`, not `chrome.storage.session`.

**Note**: Session is lost on restart (intentional). But Canton identity is independent of session.

---

## T7 — Receive Screen Identity Test

**Steps**:
1. Link a party: `party::receive-test`
2. Navigate to HomeScreen
3. Click **Receive** (bottom action bar)
4. Verify receive overlay shows

**Expected for Canton receive**:
- Section card: "Canton receive status"
- Party id displayed: `party::receive-test`
- Copy button present

**Verify party id matches what was linked**:
- Compare displayed party id with what was entered in LinkPartyScreen

---

## T8 — Settings Identity Indicator Test

**Steps**:
1. From Settings, look at "Canton identity" section
2. Check the SupportBadge action

**Expected badge states**:
- No party linked: `getCantonIdentitySupportState()` returns `"partial"` → badge shows `partial`
- Party linked (`authMode: "unlinked"`): `getCantonIdentitySupportState()` returns `"partial"` → badge shows `partial`

**Note**: Linking a party does not change `support` from `"partial"` — because `support` reflects the live capability level of the network, not the presence of a party id.

---

## T9 — Storage Failure Test (Manual)

**Steps**:
1. Open `chrome://extensions`
2. Find Jutis → click **Service worker** link
3. In console, run:
```javascript
// Simulate storage write failure by patching the storage area
const orig = chrome.storage.local.set.bind(chrome.storage.local);
chrome.storage.local.set = (items, cb) => {
  cb(new Error("Simulated storage failure"));
};
```
4. In popup, attempt to link a party

**Expected**: Error banner shown: "Failed to link Canton party." Extension remains stable.

---

## T10 — Change Party Flow

**Steps**:
1. Link a party: `party::original`
2. Go to Settings → "Change party"
3. Enter new party: `party::updated`
4. Click **"Link party"**

**Expected**: Party id updated to `party::updated`. Canton identity section reflects new id.

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| T1: Link party screen navigation | Settings → Link party button opens screen | ☐ |
| T2: Empty input rejection | Error shown, no network call | ☐ |
| T3: Happy path link | Party stored, Settings reflects linked state | ☐ |
| T4: Unlink flow | Party cleared, Settings shows "Not linked" | ☐ |
| T5: Popup reopen persistence | Linked party survives popup close/reopen | ☐ |
| T6: Browser restart persistence | Linked party survives browser restart | ☐ |
| T7: Receive screen with linked party | Receive overlay shows linked party id | ☐ |
| T8: Settings badge state | Badge shows correct partial state | ☐ |
| T9: Storage failure handling | Error banner shown, no crash | ☐ |
| T10: Change party flow | Party id updated correctly | ☐ |
