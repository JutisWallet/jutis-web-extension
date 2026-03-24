# Jutis Extension — Real Canton Environment Verification Tests (T4.3-EV)

*Manual smoke test procedures for the T4.3-EV Canton environment verification layer.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/` (load unpacked)
- Extension must have a vault created and unlocked
- Service worker DevTools open for storage and console inspection
- Network tab open (to inspect fetch requests)
- Optional: local mock server for endpoint simulation

---

## T1 — Validator /version Probe

**Steps**:
1. Configure validator URL to mock returning:
   ```json
   GET /version → 200 OK
   {
     "product": "Canton",
     "version": "3.0.0",
     "platform-version": "3.0.0"
   }
   ```
2. Enter validator URL in EnvironmentConfigScreen
3. Click **"Run diagnostics"**

**Expected**:
- Validator reachability: `reachable`
- Validator endpointKind: `validator`
- Validator version: `"3.0.0"` (extracted from response)
- Readiness progresses to at least `validator-confirmed`

---

## T2 — Validator /version with Splice Variant

**Steps**:
1. Configure validator URL to mock returning:
   ```json
   GET /version → 200 OK
   {
     "product": "Canton",
     "variant": "splice",
     "version": "3.1.0"
   }
   ```
2. Run diagnostics

**Expected**:
- Validator reachability: `reachable`
- Validator endpointKind: `validator`
- Validator version: `"3.1.0"`
- No crash or false negatives

---

## T3 — Validator /version Unreachable

**Steps**:
1. Enter validator URL pointing to `https://canton-validator-unreachable.example`
2. Run diagnostics

**Expected**:
- After 8s timeout, validator reachability: `unreachable`
- Readiness does NOT progress past `endpoint-configured`

---

## T4 — Validator Returns Non-Canton /version

**Steps**:
1. Configure validator URL to mock returning:
   ```json
   GET /version → 200 OK { "product": "SomeOtherProduct", "version": "1.0.0" }
   ```
2. Run diagnostics

**Expected**:
- Validator reachability: `reachable` (endpoint IS reachable)
- Validator endpointKind: `unrecognized` (not identified as Canton)
- Readiness does NOT progress to `validator-confirmed`

---

## T5 — Scan-Proxy Derivation from Validator

**Steps**:
1. Configure validator URL to mock returning valid Canton `/version`
2. Configure scan-proxy URL (mock) to return:
   ```json
   GET /v0/scan-proxy/accounts?party=party::test → 200 OK
   { "accounts": [{ "id": "acc-1", "assetId": "CC", "balance": "500" }] }
   ```
3. Run diagnostics

**Expected**:
- `scanProxyUrl` in diagnostics: `{validatorUrl}/v0/scan-proxy`
- Scan-proxy reachability: `reachable`
- Scan-proxy endpointKind: `scan`
- Authoritative scan: scan-proxy (since scan-proxy is reachable)
- Readiness progresses to at least `scan-confirmed`

---

## T6 — Scan-Proxy Falls Back to Direct Scan

**Steps**:
1. Configure validator URL to mock returning valid Canton `/version`
2. Leave scan-proxy URL empty (not configured)
3. Configure direct scan URL to mock returning valid accounts:
   ```json
   GET /v0/accounts?party=party::test → 200 OK
   { "accounts": [{ "id": "acc-2", "assetId": "CC", "balance": "200" }] }
   ```
4. Run diagnostics

**Expected**:
- `scanProxyUrl` in diagnostics: `null` (scan-proxy not configured)
- Direct scan reachability: `reachable`
- Authoritative scan: direct scan (scan-proxy not available)
- Readiness progresses to at least `scan-confirmed`

---

## T7 — DSO Party Id Retrieval from Validator

**Steps**:
1. Configure validator URL to mock:
   - `GET /version` → Canton version
   - `GET /v0/dso-party-id` → `200 OK { "partyId": "dso::primary" }`
2. Run diagnostics

**Expected**:
- `dsoPartyId` in diagnostics: `"dso::primary"`
- Readiness progresses to at least `dso-confirmed`

---

## T8 — DSO Party Id Retrieval Falls Back to Scan-Proxy

**Steps**:
1. Configure validator URL mock:
   - `GET /version` → Canton version
   - `GET /v0/dso-party-id` → 404 or timeout
2. Configure scan-proxy mock:
   - `GET /v0/scan-proxy/accounts?party=...` → accounts
   - `GET /v0/scan-proxy/dso-party-id` → `200 OK { "partyId": "dso::fallback" }`
3. Run diagnostics

**Expected**:
- `dsoPartyId` in diagnostics: `"dso::fallback"` (from scan-proxy)
- Readiness progresses to at least `dso-confirmed`

---

## T9 — Party Visibility Confirmed

**Steps**:
1. Link party: `party::visible-test`
2. Configure environment with scan-proxy returning accounts for `party::visible-test`
3. Run diagnostics

**Expected**:
- `partyVisible: true`
- Readiness progresses to at least `party-visible`

---

## T10 — Party Visibility Not Confirmed (No Accounts)

**Steps**:
1. Link party: `party::empty-party`
2. Configure environment where scan returns:
   ```json
   { "accounts": [] }
   ```
3. Run diagnostics

**Expected**:
- `partyVisible: false`
- Readiness does NOT progress past `dso-confirmed`

---

## T11 — Full Read-Only Verified Chain

**Steps**:
1. Configure all three endpoints with valid mocks:
   - Validator: `/version` → Canton, `/v0/dso-party-id` → `"dso::full"`
   - Scan-proxy: `/accounts?party=party::full-test` → non-empty accounts
2. Link party: `party::full-test`
3. Run diagnostics

**Expected**:
- `readOnlyVerified: true`
- Readiness: `read-only-verified`
- `dsoPartyId: "dso::full"`
- `partyVisible: true`

---

## T12 — Readiness State Machine Strict Progression

**Steps** (for each state boundary):

| Setup | Expected Readiness |
|---|---|
| No URLs configured | `unconfigured` |
| URLs configured, not probed | `endpoint-configured` |
| Validator /version succeeds | `validator-confirmed` |
| Scan/scan-proxy accounts succeeds | `scan-confirmed` |
| DSO party id retrieved | `dso-confirmed` |
| Party visible in accounts | `party-visible` |
| All of above | `read-only-verified` |

Verify that skipping a state is not possible (e.g., cannot reach `dso-confirmed` without passing through `validator-confirmed` and `scan-confirmed`).

---

## T13 — Ledger Probe Multiple Paths

**Steps**:
1. Configure ledger URL to mock only `GET /v0/health` returning 200 OK
2. Other paths return 404
3. Run diagnostics

**Expected**:
- Ledger reachability: `reachable`
- Ledger endpointKind: `ledger`

**Steps** (variant):
1. Configure ledger URL to mock only `GET /health` returning 200 OK
2. Run diagnostics

**Expected**:
- Ledger reachability: `reachable`

---

## T14 — Diagnostics Cleared on Unlink

**Steps**:
1. Run diagnostics with full environment configured (reaching `read-only-verified`)
2. Click **"Unlink party"** from Settings

**Expected**:
- `cantonDiagnostics` cleared or reset
- Readiness returns to `unconfigured`

---

## Test Summary Checklist

| Test | Pass Criteria | Status |
|---|---|---|
| T1: Validator /version probe | `reachable`, `endpointKind=validator`, version extracted | ☐ |
| T2: Splice variant | No crash, `endpointKind=validator` | ☐ |
| T3: Validator unreachable | `unreachable` after 8s, readiness not past `endpoint-configured` | ☐ |
| T4: Non-Canton /version | `endpointKind=unrecognized`, readiness not past `endpoint-configured` | ☐ |
| T5: Scan-proxy derivation | `scanProxyUrl` set, scan-proxy `reachable` | ☐ |
| T6: Scan-proxy fallback to direct scan | Direct scan used as authoritative when scan-proxy absent | ☐ |
| T7: DSO from validator | `dsoPartyId` retrieved, readiness `dso-confirmed` | ☐ |
| T8: DSO fallback to scan-proxy | `dsoPartyId` from scan-proxy fallback | ☐ |
| T9: Party visible | `partyVisible: true`, readiness `party-visible` | ☐ |
| T10: Party not visible | `partyVisible: false`, readiness NOT past `dso-confirmed` | ☐ |
| T11: Full read-only verified | All fields set, `readOnlyVerified: true` | ☐ |
| T12: Readiness strict progression | Each state reachable, no skips | ☐ |
| T13: Ledger multi-path probe | `/v0/health` or `/health` works | ☐ |
| T14: Unlink clears diagnostics | `cantonDiagnostics` reset on unlink | ☐ |
