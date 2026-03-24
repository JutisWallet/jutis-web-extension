# Jutis Extension — Canton Environment Diagnostics Tests (T4.3-E)

*Manual smoke test procedures for the Canton environment diagnostics layer.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (load unpacked)
- Extension must have a vault created and unlocked
- Service worker DevTools open for storage and console inspection
- Network tab open (to inspect fetch requests)
- Optional: local mock server for endpoint simulation

---

## T1 — Settings Environment Section Navigation

**Steps**:
1. Open Jutis popup → Settings
2. Find the "Canton environment" section (below "Canton identity")

**Expected**:
- "Canton environment" section visible with descriptive text
- "Configure environment" button present
- Clicking "Configure environment" navigates to EnvironmentConfigScreen

---

## T2 — Environment Screen Save (No Changes)

**Steps**:
1. Navigate to Settings → "Configure environment"
2. Click **"Save environment"** with all fields empty

**Expected**:
- No crash or error
- If party is linked, party remains linked (save does not affect partyId)
- Returns to Settings

---

## T3 — Malformed Endpoint URL Config

**Steps**:
1. In EnvironmentConfigScreen, enter a malformed validator URL: `not-a-url`
2. Click **"Save environment"**
3. Click **"Run diagnostics"**

**Expected**:
- Save succeeds (malformed URLs are accepted — diagnostics reports the problem)
- Diagnostics shows `malformed` for the affected endpoint
- No crash

**Service worker console**: warning about malformed URL for validator endpoint

---

## T4 — Unreachable Endpoint Test

**Steps**:
1. In EnvironmentConfigScreen, enter validator URL: `https://canton-validator-unreachable.example/api`
2. Save the environment
3. Click **"Run diagnostics"**

**Expected**:
- After 8 seconds (timeout), diagnostics shows `unreachable` for validator
- Other endpoints (scan, ledger) show their respective states

**Console warning**: `[CantonEnvironmentService] Endpoint unreachable for validator...`

---

## T5 — Unauthorized Endpoint Test

**Steps**:
1. Configure a mock server that responds to `GET /api/v1/health` with HTTP 401
2. Enter validator URL pointing to mock: `https://mock.example/validator`
3. Save and run diagnostics

**Expected**:
- Validator shows `unauthorized` in diagnostics
- Console warning includes `HTTP 401 — authentication required or denied`

---

## T6 — Valid Reachable Endpoint (Mock)

**Steps**:
1. Set up a mock server responding to:
   - `GET /api/v1/health` → `200 OK { "status": "ok" }`
2. Enter validator URL pointing to mock
3. Save and run diagnostics

**Expected**:
- Validator shows `reachable` in diagnostics
- No warnings for that endpoint

---

## T7 — Mixed Endpoint State (One Good, One Bad)

**Steps**:
1. Configure validator URL to mock returning `200 OK` (reachable)
2. Configure ledger URL to `https://ledger-unreachable.example` (unreachable)
3. Leave scan URL empty (not-configured)
4. Run diagnostics

**Expected**:
- Validator: `reachable`
- Ledger: `unreachable`
- Scan: `not-configured`
- Overall readiness: `partially-reachable`

---

## T8 — Popup Reopen Persistence Test

**Steps**:
1. In EnvironmentConfigScreen, enter validator and ledger URLs
2. Save environment
3. Close popup completely
4. Reopen Jutis popup → Settings → "Configure environment"

**Expected**: URL fields pre-filled with the values just saved. No need to re-enter.

---

## T9 — Party Verification Test

**Steps**:
1. Link a party: `party::verify-test` with scan URL pointing to a mock that returns:
   ```json
   { "accounts": [{ "id": "cc-1", "assetId": "CC", "balance": "100" }] }
   ```
2. Run diagnostics

**Expected**:
- Scan: `reachable`
- `partyVerified: true` in diagnostics response
- Overall readiness: `party-verified`

**If mock returns empty accounts `[]`**:
- Scan: `reachable` (endpoint is up)
- `partyVerified: false` (no accounts found for party)
- Overall readiness: `partially-reachable` (not `party-verified`)

---

## T10 — Readiness Summary Accuracy Test

**Steps** (for each CantonEnvironmentReadiness level):

| Setup | Expected Readiness |
|---|---|
| All three URLs empty | `demo` |
| URLs set but not probed yet | `configured` |
| One reachable, others empty | `partially-reachable` |
| All configured unreachable | `unreachable` |
| All configured return 401/403 | `unauthorized` |
| Scan reachable + accounts returned | `party-verified` |

Run diagnostics after each setup and verify the readiness matches the expected value.

---

## T11 — Environment Save Does Not Affect Party

**Steps**:
1. Link a party: `party::env-party-test`
2. Go to EnvironmentConfigScreen
3. Enter validator URL and save
4. Go back to Settings

**Expected**:
- Party id unchanged: `party::env-party-test`
- Party is still linked
- Environment URLs updated independently

---

## T12 — Unlink Resets Environment

**Steps**:
1. With party linked and environment URLs configured, click **"Unlink party"** from Settings

**Expected**:
- Party cleared
- Environment URLs also cleared (since `DEFAULT_CANTON_IDENTITY` has no URLs)

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| T1: Settings environment navigation | "Canton environment" section visible, navigates to EnvironmentConfigScreen | ☐ |
| T2: Environment save (no changes) | Save succeeds, no crash | ☐ |
| T3: Malformed URL | Diagnostics reports `malformed`, save succeeds | ☐ |
| T4: Unreachable endpoint | Diagnostics reports `unreachable` after 8s | ☐ |
| T5: Unauthorized endpoint | Diagnostics reports `unauthorized`, HTTP 401 detected | ☐ |
| T6: Reachable endpoint | Diagnostics reports `reachable`, no warning | ☐ |
| T7: Mixed state | Correct `partially-reachable`, per-endpoint states accurate | ☐ |
| T8: Popup reopen persistence | URLs persisted across popup close/reopen | ☐ |
| T9: Party verification (found) | `partyVerified: true`, readiness `party-verified` | ☐ |
| T9b: Party verification (empty) | `partyVerified: false`, readiness NOT `party-verified` | ☐ |
| T10: Readiness summary accuracy | Each readiness level correctly detected | ☐ |
| T11: Environment save does not affect party | Party unchanged after environment save | ☐ |
| T12: Unlink resets environment | URLs cleared when party unlinked | ☐ |
