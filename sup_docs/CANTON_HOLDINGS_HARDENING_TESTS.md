# Jutis Extension — Canton Holdings Hardening Tests (T4.3-H)

*Manual smoke test procedures for the Canton holdings read honesty hardening.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (load unpacked)
- Extension must have a vault created (create wallet flow completes)
- Service worker DevTools open for storage inspection
- Network tab open (for inspecting fetch requests)
- Optional: a local mock server to simulate various endpoint responses

---

## T1 — Malformed URL Test

**Steps**:
1. Navigate to Settings → "Link party" (or "Change party")
2. Enter party: `party::malformed-test`
3. Enter Scan API URL: `not-a-valid-url` (no protocol, no host)
4. Click **"Link party"**
5. Return to HomeScreen

**Expected**:
- Party linked with malformed URL stored
- HomeScreen shows demo Canton balances ("1240.00 CC", "500.00 USDC") — demo fallback
- Service worker console warning:
  ```
  [CantonHoldingsService] Endpoint unreachable for party party::malformed-test: ...
  ```
  OR the malformed URL is caught before the fetch attempt

**Feature matrix verification**:
```javascript
controller.getCantonFeatureMatrix(identity).find(e => e.id === "balances")
// supportState: "unsupported"
// blocker: "Configured scanApiUrl is not a valid http/https URL..."
// summary: "Configured URL is malformed — demo Canton balances are shown..."
```

---

## T2 — Unreachable Endpoint Test

**Steps**:
1. From Settings → "Change party"
2. Enter party: `party::unreachable-test`
3. Enter Scan API URL: `https://canton-scan-unreachable.example/api`
4. Click **"Link party"**
5. Return to HomeScreen

**Expected**:
- Party linked
- HomeScreen shows demo Canton balances (fallback triggered)
- Service worker console warning contains:
  ```
  [CantonHoldingsService] Endpoint unreachable for party party::unreachable-test
  ```

**Feature matrix**:
```javascript
// supportState: "unsupported"
// blocker: "Configured scanApiUrl is unreachable..."
// summary: "Configured URL is unreachable — demo Canton balances are shown..."
```

---

## T3 — Unauthorized Endpoint Test

**Steps**:
1. Set up a mock that responds to `GET /api/v1/accounts?party=party::auth-test` with HTTP 401 or 403
2. Enter party: `party::auth-test`
3. Enter Scan API URL: your mock server URL
4. Leave auth token empty (or enter wrong token)
5. Link the party
6. Return to HomeScreen

**Expected**:
- HomeScreen shows demo Canton balances
- Service worker console warning:
  ```
  [CantonHoldingsService] Endpoint unauthorized (401) for party party::auth-test.
  Attach a valid scanAuthToken to access live holdings.
  ```

**Feature matrix**:
```javascript
// supportState: "unsupported"
// blocker: "Configured scanApiUrl requires authentication..."
// summary: "Configured URL requires auth — demo Canton balances are shown..."
```

---

## T4 — Invalid Payload Test

**Steps**:
1. Set up a mock that responds with 200 OK but wrong JSON shape, e.g.:
   ```json
   { "balances": [{ "id": "cc-1", "balance": "100" }] }
   ```
   (missing `accounts` key)
2. Or responds with an empty accounts array:
   ```json
   { "accounts": [] }
   ```
3. Enter party and URL in LinkPartyScreen
4. Link the party
5. Return to HomeScreen

**Expected**:
- HomeScreen shows demo Canton balances
- Console warning (for wrong shape):
  ```
  [CantonHoldingsService] Endpoint returned unexpected payload shape for party...
  Expected { accounts: [...] }, got: { "balances": [...] }
  ```
- Console warning (for empty accounts):
  ```
  [CantonHoldingsService] Endpoint returned empty accounts array for party...
  ```

**Feature matrix**:
```javascript
// supportState: "unsupported"
// blocker: "Configured scanApiUrl returned invalid payload..."
// summary: "Configured URL returned invalid data — demo Canton balances are shown..."
```

---

## T5 — Successful Live Payload Test

**Steps**:
1. Set up a mock that responds to `GET /api/v1/accounts?party=party::live-test` with:
   ```json
   {
     "accounts": [
       { "id": "cc-1", "assetId": "CC", "balance": "5000.00", "name": "Canton Coin", "decimals": 2, "usdValue": 5000 },
       { "id": "usdc-1", "assetId": "USDC", "balance": "2500.00", "name": "USDC", "decimals": 2, "usdValue": 2500 }
     ]
   }
   ```
2. Enter party: `party::live-test`
3. Enter Scan API URL: your mock server URL
4. Click **"Link party"**
5. Return to HomeScreen

**Expected**:
- HomeScreen shows "5000.00 CC" and "2500.00 USDC" (not demo)
- Network tab shows `GET /api/v1/accounts?party=party::live-test`
- Console: no `[CantonHoldingsService]` warnings (only debug/info)

**Feature matrix**:
```javascript
controller.getCantonFeatureMatrix(identity).find(e => e.id === "balances")
// supportState: "live"
// implementationSource: "Live Canton holdings from configured scan API..."
// summary: "Portfolio shows live Canton holdings from the configured scan node."
```

**Asset record verification**:
```javascript
const snapshot = await sendRuntimeRequest({ type: "jutis:refresh" });
const cantonAssets = snapshot.snapshot.assets.filter(a => a.networkId === "canton-mainnet");
// cantonAssets[0].support === "real"
// cantonAssets[0].usdReference.trustLevel === "live"
// cantonAssets[0].usdReference.sourceType === "market-feed"
```

---

## T6 — Demo Fallback Labeling Test (No URL Configured)

**Steps**:
1. Link a party WITHOUT any scanApiUrl: `party::demo-only-test`
2. Leave Scan API URL and auth token fields empty
3. Link the party
4. Return to HomeScreen

**Expected**:
- HomeScreen shows demo Canton balances ("1240.00 CC", "500.00 USDC")
- LinkPartyScreen linked state shows: "Scan API: not configured — demo balances shown"
- LinkPartyScreen shows: "Auth token: not set"

**Feature matrix**:
```javascript
// supportState: "reference-only"
// blocker: "No scan API URL is configured..."
// summary: "No scanApiUrl configured — demo Canton balances are shown..."
```

**Asset record**:
```javascript
// cantonAssets[0].support === "mocked"  (not "partial" or "real")
```

---

## T7 — Popup Reopen Persistence Test

**Steps**:
1. Link a party with scanApiUrl: `party::persist-test`
2. Close popup completely
3. Reopen Jutis popup
4. Unlock if needed
5. Return to HomeScreen

**Expected**: Same holdings state (live or demo) as before popup close. Readiness re-evaluated on first `getAssets()` call after reopen.

---

## T8 — Refresh Re-Evaluation Test

**Steps**:
1. Link a party with scanApiUrl pointing to a live mock
2. Observe live balances
3. In mock server, change balance to `"9999.00"` CC
4. Trigger a refresh (pull to refresh or refresh icon)
5. Observe HomeScreen balances

**Expected**: Balances reflect updated mock response after refresh. Readiness remains `"live"` if mock still responds correctly.

---

## T9 — Auth Token Flow Test

**Steps**:
1. Set up a mock that requires `Authorization: Bearer test-token-abc` and responds to `party::auth-live-test`
2. In LinkPartyScreen, enter:
   - Party: `party::auth-live-test`
   - Scan API URL: your mock server URL
   - Auth token: `test-token-abc`
3. Link the party
4. Return to HomeScreen

**Expected**:
- HomeScreen shows live balances (mock responded with correct token)
- Network tab shows request includes `Authorization: Bearer test-token-abc`

**Without correct token** (same mock, wrong token entered):
- HomeScreen shows demo balances
- Console warning: `Endpoint unauthorized (401/403) for party party::auth-live-test`

---

## T10 — Unlink Resets Readiness to Demo

**Steps**:
1. From T5 (live test state), click **"Change party"**
2. Click **"Unlink party"**
3. Observe HomeScreen

**Expected**:
- All Canton identity cleared (partyId: null, scanApiUrl: undefined, scanAuthToken: undefined)
- HomeScreen returns to demo Canton balances ("1240.00 CC", "500.00 USDC")
- Feature matrix shows `reference-only` for balances

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| T1: Malformed URL | Demo fallback, "unsupported" feature matrix | ☐ |
| T2: Unreachable endpoint | Demo fallback, "unreachable" readiness, warning logged | ☐ |
| T3: Unauthorized endpoint | Demo fallback, "unauthorized" readiness, warning logged | ☐ |
| T4: Invalid payload | Demo fallback, "invalid-payload" readiness for both wrong shape and empty accounts | ☐ |
| T5: Successful live payload | Live balances shown, no warnings, feature matrix "live" | ☐ |
| T6: Demo fallback labeling | Demo balances shown, support "mocked", feature matrix "reference-only" | ☐ |
| T7: Popup reopen persistence | State preserved across popup close/reopen | ☐ |
| T8: Refresh re-evaluation | Balances update after mock server change | ☐ |
| T9: Auth token flow | Correct token → live; wrong/missing token → demo + unauthorized | ☐ |
| T10: Unlink resets readiness | Demo balances restored after unlink | ☐ |
