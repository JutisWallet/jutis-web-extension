# Jutis Extension — Real Canton Environment Verification Gaps (T4.3-EV)

*Post-implementation audit for T4.3-EV — Real Canton Environment Verification.*

---

## What Is Now More Trustworthy

| What | Before T4.3-EV | After T4.3-EV |
|---|---|---|
| Validator identification | Generic `/api/v1/health` | Canton-specific `/version` with product/version extraction |
| Scan endpoint discovery | Single fixed path | 3 candidate paths tried in order (`/v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts`) |
| Scan-proxy awareness | Not derived or probed | Derived from confirmed validator, probed as preferred authoritative source |
| DSO party id discovery | Not implemented | 3-source fallback chain (validator → scan-proxy → scan) |
| Party visibility verification | Scan-only, scan-proxy unaware | Authoritative scan (scan-proxy preferred) confirms party accounts |
| Ledger endpoint discovery | Single fixed path | 3 candidate paths tried (`/v0/health`, `/health`, `/api/v1/health`) |
| Endpoint kind detection | Not implemented | `CantonEndpointKind` distinguishes validator/scan/ledger/unrecognized |
| Readiness state machine | 6 generic states | 7-state strict progression with honest `read-only-verified` terminal |
| Version reporting | Not available | `version` string extracted from validator `/version` response |

---

## What Still Depends on Assumed Canton API Paths

| Gap | Status | Notes |
|---|---|---|
| **Validator `/version`** | Assumption | Real Canton validator node may not expose `/version` or may require auth; path confirmed by Splice docs but not against live deployment |
| **Scan-proxy under `/v0/scan-proxy`** | Assumption | Splice docs describe `/v0/scan-proxy` as the scan-proxy path under the validator app; assumes Canton v3.x compatibility |
| **DSO party id at `/v0/dso-party-id`** | Assumption | Splice docs confirm this path; real Canton v2.x may differ |
| **Scan accounts at `/v0/accounts`** | Assumption | Splice-specific path; raw Canton participant nodes may use different ACS encoding |
| **Ledger health at `/v0/health`** | Assumption | Ledger API path not confirmed against any real Canton ledger |
| **Auth token format** | Assumption | Bearer token assumed correct; real Canton may require specific JWT format |

---

## Is the Readiness State Machine Real or Theoretical?

**Answer: Theoretical — it is a rigorous state machine but all state transitions depend on unverified API paths.**

The 7-state progression (unconfigured → endpoint-configured → validator-confirmed → scan-confirmed → dso-confirmed → party-visible → read-only-verified) is well-designed:

- Each state is clearly defined and mutually exclusive
- Transitions are strictly ordered (can't skip states)
- The terminal `read-only-verified` state correctly requires all prior verifications

However:
- Every probe path is a docs-backed assumption, not a confirmed real Canton API
- A "reachable" endpoint may return structurally-valid-but-incorrect data
- The state machine verifies **reachability** and **structural validity**, not **semantic correctness**
- Even `read-only-verified` only means: validator responded to `/version`, DSO was returned, and accounts exist for the linked party — it does NOT mean the Canton network is healthy or that transactions can be submitted

**Verdict**: The state machine is a solid architectural foundation. It correctly handles all the states that CAN be verified given a real Canton deployment. The gap is not in the architecture but in the lack of a confirmed real Canton environment to exercise it against.

---

## Is the DSO Party Id Retrieval Real?

**Answer: Partially — path is docs-backed, content is structurally verified, but semantic correctness not checked.**

The DSO party id is retrieved from `/v0/dso-party-id` and the response is checked for a non-empty `partyId` string field. This is meaningful:

- If the endpoint returns a `partyId` → DSO identity exists in the Canton network
- The format of the returned value is captured (e.g., `"dso::primary"`)

However:
- No verification that the returned DSO party id is valid on the specific Canton network
- A misconfigured or malicious Canton node could return a bogus DSO party id
- The DSO party id is not cross-checked against any other source

---

## Is Party Visibility Real?

**Answer: Same partial verification as T4.3-E — confirms account presence, not transactability.**

The authoritative scan (scan-proxy or direct) is queried for `/accounts?party={linkedPartyId}`. A non-empty `accounts` array confirms the party has at least one account on the scan index.

This is the same limitation as T4.3-E:
- A party with zero holdings is still valid but would show `partyVisible: false`
- A party visible on scan may not be able to submit transactions
- No verification against the Canton ledger's active parties set

---

## Terminal Summary

| Question | Answer |
|---|---|
| **Validator `/version` path** | ✅ Probed; docs-backed assumption for Splice/Canton v3.x |
| **Scan-proxy derivation** | ✅ Derived from validator confirmed; `/v0/scan-proxy` path docs-backed |
| **DSO party id retrieval** | ✅ 3-source fallback chain; `/v0/dso-party-id` path docs-backed |
| **Party visibility** | ✅ Authoritative scan (scan-proxy preferred) confirms accounts for partyId |
| **Readiness state machine** | ✅ Strict 7-state progression; `read-only-verified` requires full chain |
| **Can activity integration start safely now?** | **No** — diagnostics infrastructure is now thorough, but all probe paths are docs-backed assumptions; no real Canton participant/scan/ledger API confirmed against a live deployment |
| **Can send submission start safely now?** | **No** — ledger probe is improved but no confirmed live Canton ledger API; T4.4 blocked until a real Canton environment is identified |
| **Next blocker after T4.3-EV:** | **No confirmed real Canton network endpoint** — diagnostics layer is now complete and honest; the fundamental blocker remains: no Canton participant/scan/validator/ledger URL has been confirmed against a real Splice/Canton deployment |

---

## Dependency Chain (Updated)

```
Party linkage (T4.1) ✅
     ↓
Holdings read (T4.3) ✅
     ↓
Holdings hardening (T4.3-H) ✅
     ↓
Environment diagnostics (T4.3-E) ✅
     ↓
Real environment verification (T4.3-EV) ✅ ← THIS PHASE
     ↓
Send submission (T4.4) ← blocked: no real Canton ledger API confirmed
     ↓
Activity read (T4.5) ← blocked: no real Canton scan/activity API confirmed
     ↓
Transaction lifecycle (T4.6)
     ↓
Background reconcile (T4.7)
```

---

## Remaining Honest Limitations

1. **All probe paths are docs-backed assumptions**: `/version`, `/v0/scan-proxy`, `/v0/dso-party-id`, `/v0/accounts`, `/v0/health` — none confirmed against a real Canton v2.x or v3.x deployment.

2. **No production auth security**: All auth tokens stored in plaintext `chrome.storage.local`. Bearer token assumed sufficient; no JWT format validation or token refresh.

3. **Diagnostics are manual**: Users must click "Run diagnostics" to re-probe. No automatic re-evaluation on app startup or refresh.

4. **DSO party id is not cross-verified**: Retrieved from one source; not cross-checked against other environment sources.

5. **Party visibility is scan-only**: Confirms account presence on scan index, not active participation in the Canton network.

6. **No persistence of diagnostics state**: `cantonDiagnostics` is cleared on popup close; must be re-run on reopen.

7. **Ledger readiness does not gate send**: `ledger.reachability === "reachable"` does not mean ledger API will accept or process transfer submissions. T4.4 must implement actual submission probing.
