# Jutis Extension — Canton Holdings Read Tests (T4.3)

*Manual smoke test procedures for the Canton live holdings read flow.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (load unpacked)
- Extension must have a vault created (create wallet flow completes)
- Service worker DevTools open for storage inspection
- Network tab open (optional) to inspect fetch requests if testing live API

---

## T1 — Link Party WITHOUT Scan API (Demo Fallback)

**Steps**:
1. Open Jutis popup → unlock → HomeScreen
2. Click **Settings** → **"Link party"** (or "Change party" if already linked)
3. Enter party: `party::no-scan-api-test`
4. Leave **Scan API URL** field empty
5. Click **"Link party"**
6. Wait for navigation back to Settings

**Expected**:
- Party linked successfully
- No Scan API URL stored
- HomeScreen shows demo Canton balances ("1240.00 CC", "500.00 USDC") — unchanged from before

**Storage verification**:
```javascript
const identity = await controller.readCantonIdentity();
console.log(identity);
// { networkId: "canton-mainnet", partyId: "party::no-scan-api-test", scanApiUrl: undefined, ... }
```

---

## T2 — Link Party WITH Scan API (Demo Fallback — Unreachable API)

**Steps**:
1. From Settings, click **"Change party"**
2. Enter party: `party::unreachable-scan-test`
3. Enter Scan API URL: `https://canton-scan-unreachable.example/api`
4. Click **"Link party"**
5. Wait for navigation back to Settings

**Expected**:
- Party linked successfully
- Scan API URL stored
- HomeScreen still shows demo Canton balances (fallback triggered due to unreachable URL)
- Service worker console shows warning:
  ```
  [CantonHoldingsService] Failed to fetch live Canton holdings for party party::unreachable-scan-test
  from https://canton-scan-unreachable.example/api: ...
  Falling back to demo holdings.
  ```

**Storage verification**:
```javascript
const identity = await controller.readCantonIdentity();
console.log(identity.scanApiUrl);
// "https://canton-scan-unreachable.example/api"
```

---

## T3 — Live Holdings with Mock Server

**Steps**:
1. Set up a local mock server that responds to:
   ```
   GET /api/v1/accounts?party=party::mock-test

   Response (200 OK):
   {
     "accounts": [
       { "id": "cc-1", "assetId": "CC", "balance": "5000.00", "name": "Canton Coin", "decimals": 2, "usdValue": 5000 },
       { "id": "usdc-1", "assetId": "USDC", "balance": "2500.00", "name": "USDC (Canton)", "decimals": 2, "usdValue": 2500 }
     ]
   }
   ```
2. In Jutis popup, navigate to Settings → "Change party"
3. Enter party: `party::mock-test`
4. Enter Scan API URL: `http://localhost:8765` (or your mock server URL)
5. Click **"Link party"**
6. Wait for navigation back to Settings
7. Return to HomeScreen

**Expected**:
- HomeScreen Canton card shows "5000.00 CC" and "2500.00 USDC" (live from mock)
- USD references show `trustLevel: "live"`, `sourceType: "market-feed"`

**Network tab verification**: A `GET /api/v1/accounts?party=party::mock-test` request should appear in the network tab.

---

## T4 — Holdings Refresh After Topology Change

**Steps**:
1. Link a party with scan API URL configured (from T3)
2. Return to HomeScreen (observe live balances)
3. In mock server, change the returned balance to `"9999.00"` for CC
4. In Jutis popup, **pull to refresh** (or click refresh icon on HomeScreen)
5. Observe Canton balances on HomeScreen

**Expected**: Balances reflect the updated mock server response after refresh.

---

## T5 — Feature Matrix Balances State

**Steps**:
1. Link a party WITHOUT scan API URL (T1 scenario)
2. Open Service Worker DevTools console
3. Run:
```javascript
const identity = await controller.readCantonIdentity();
controller.getCantonFeatureMatrix(identity).find(e => e.id === "balances")
```

**Expected (no scanApiUrl)**:
```javascript
{
  id: "balances",
  supportState: "reference-only",
  implementationSource: "Fixture-driven Canton assets from `CANTON_DEMO_ASSETS`...",
  summary: "The portfolio shows reference/demo Canton holdings..."
}
```

**Steps for scanApiUrl case**:
1. Link a party WITH scan API URL configured
2. Run same command

**Expected (with scanApiUrl)**:
```javascript
{
  id: "balances",
  supportState: "live",
  implementationSource: "Live Canton holdings from configured scan API via `CantonHoldingsService`",
  summary: "Portfolio shows live Canton holdings from the configured scan node."
}
```

---

## T6 — Unlink Party Clears Scan API URL

**Steps**:
1. From Settings, click **"Change party"** (party with scanApiUrl linked)
2. Click **"Unlink party"**
3. Wait for navigation back to Settings

**Expected**:
- Party id cleared
- Scan API URL cleared
- HomeScreen returns to demo balances ("1240.00 CC", "500.00 USDC")

**Storage verification**:
```javascript
const identity = await controller.readCantonIdentity();
console.log(identity.partyId);       // null
console.log(identity.scanApiUrl);   // undefined
console.log(identity.authMode);     // "mock"
```

---

## T7 — Popup Reopen Restores Scan API URL

**Steps**:
1. Link a party WITH scan API URL (T2 or T3 scenario)
2. Close popup completely
3. Reopen Jutis popup
4. Unlock if needed
5. Navigate to Settings

**Expected**: Settings shows the same scanApiUrl that was just linked. No need to re-enter it.

---

## T8 — Browser Restart Persistence

**Steps**:
1. Link a party WITH scan API URL
2. Restart Chrome
3. Open Jutis popup → unlock if needed
4. Navigate to Settings

**Expected**: Scan API URL persisted across browser restart (stored in `chrome.storage.local`).

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| T1: Link without scanApiUrl | Party linked, demo balances shown | ☐ |
| T2: Link with unreachable scanApiUrl | Party + URL stored, demo fallback, warning logged | ☐ |
| T3: Live holdings with mock server | Live balances shown from mock | ☐ |
| T4: Holdings refresh | Balances update after mock server change | ☐ |
| T5: Feature matrix (no scanApiUrl) | balances.supportState = "reference-only" | ☐ |
| T5b: Feature matrix (with scanApiUrl) | balances.supportState = "live" | ☐ |
| T6: Unlink clears scanApiUrl | URL cleared, demo balances restored | ☐ |
| T7: Popup reopen persistence | Scan API URL preserved across popup close | ☐ |
| T8: Browser restart persistence | Scan API URL preserved across restart | ☐ |
