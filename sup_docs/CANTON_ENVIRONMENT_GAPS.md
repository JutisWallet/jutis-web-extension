# Jutis Extension — Canton Environment Diagnostics Gaps (T4.3-E)

*Post-implementation audit for Canton environment diagnostics layer.*

---

## What Is Now More Trustworthy

| What | Before | After |
|---|---|---|
| Endpoint configuration visibility | No UI to configure validator/ledger URLs | Dedicated EnvironmentConfigScreen with URL + auth fields for all three endpoints |
| Scan API diagnostics | Mixed with holdings read | Standalone probe with honest reachability classification |
| Validator/ledger diagnostics | Not implemented | Probe-based reachability for both endpoints |
| Party topology verification | Not performed | Scan API accounts query confirms partyId presence in network |
| Environment readiness summary | Not available | `CantonEnvironmentReadiness` enum with 6 honest levels |
| Auth token for validator/ledger | Not stored | `validatorAuthToken` / `ledgerAuthToken` persisted and sent as Bearer tokens |
| Environment ↔ party separation | Config and identity mixed in one screen | Party linkage (LinkPartyScreen) separate from endpoint config (EnvironmentConfigScreen) |

---

## What Still Depends on Real Canton Infrastructure

| Gap | Status | Notes |
|---|---|---|
| **No known real Canton validator API** | Unchanged | `/api/v1/health` endpoint is assumed — may not exist on real Canton nodes |
| **No known real Canton ledger API** | Unchanged | Same assumption; real ledger API path unknown |
| **No Canton participant/scan API** | Unchanged | No confirmed production Canton scan endpoint |
| **ACS completeness** | Unchanged | Even when scan returns accounts, may not capture all Daml ACS contracts |
| **No real partyId validation** | Unchanged | Party format not validated against any Canton network topology |
| **No auth mode upgrade path** | Unchanged | Bearer token is the only auth mechanism; no path to `"validator-jwt"` or `"wallet-session"` |
| **Ledger auth token plaintext** | New concern | All three auth tokens stored in plaintext in `chrome.storage.local` |
| **Validator/ledger health endpoints** | Assumption | `/api/v1/health` is a reasonable guess but unverified against a real Canton deployment |
| **Send submission** | Not started | `ledgerApiUrl` being reachable does not mean submit will work — T4.4 is separate |
| **Activity/history** | Not started | No Canton activity integration — T4.5 is separate |

---

## Is Party Verification Real or Partial?

**Answer: Partial — it verifies the scan API knows the party, but not that the party can transact.**

The party verification works by checking whether the Canton scan API returns any accounts for the linked `partyId`. This is meaningful:

- If the scan API returns accounts → the partyId is confirmed present in the Canton network
- If the scan API returns empty accounts → the partyId is registered but may have no holdings yet (not the same as being invalid)
- If the scan API is unreachable → party cannot be verified (not the same as invalid)

However:
- A partyId with zero holdings is still a valid Canton party — it just has no assets
- The scan API returning accounts doesn't mean the party can submit transactions
- No verification of the party's validity is performed against the ledger, only the scan index

**Verdict**: Party verification is a useful signal but not a full validity guarantee. It correctly distinguishes "party unknown to this scan node" from "party found with N accounts."

---

## Is Auth Still Dev-Grade Only?

**Answer: Yes — auth support is plumbed but not production-ready.**

Bearer token auth is now wired for all three endpoints:
- Tokens are stored in `chrome.storage.local` (plaintext)
- Tokens are sent as `Authorization: Bearer {token}` on every request
- No token rotation, expiry, or refresh mechanism exists
- No separation between read-only and write tokens

For development and testing with mock servers, this is sufficient. For production, a more secure secret management approach would be needed (extension secrets store, OS keychain, etc.).

---

## Terminal Summary

| Question | Answer |
|---|---|
| **scanApiUrl diagnostics** | ✅ Format check + 8s timeout probe + auth detection + accounts verification + party presence |
| **validatorApiUrl diagnostics** | ✅ Format check + 8s timeout probe + auth detection (assumes `/api/v1/health` path) |
| **ledgerApiUrl diagnostics** | ✅ Format check + 8s timeout probe + auth detection (assumes `/api/v1/health` path) |
| **party verification** | **Partial** — scan API confirms partyId has accounts; does NOT verify party can transact |
| **environment readiness level** | `demo \| configured \| partially-reachable \| unreachable \| unauthorized \| party-verified` — 6 honest levels |
| **Can activity integration start safely now?** | **No** — no confirmed live Canton scan/activity API endpoint; diagnostics infrastructure is ready but environment is not verified |
| **Can send submission start safely now?** | **No** — no confirmed live Canton ledger API; ledger endpoint is probed but not wired for submission |
| **Next blocker after environment diagnostics:** | **No confirmed real Canton network endpoint** — all diagnostics are built and ready, but no Canton participant/scan/validator/ledger URL has been confirmed against a real deployment. T4.4 (send) and T4.5 (activity) remain blocked until a real Canton environment is identified. |

---

## Dependency Chain (Updated)

```
Party linkage (T4.1) ✅
     ↓
Holdings read (T4.3) ✅
     ↓
Holdings hardening (T4.3-H) ✅
     ↓
Environment diagnostics (T4.3-E) ✅ ← THIS PHASE
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

1. **All probes use assumed API paths**: The scan API uses `/api/v1/accounts?party={partyId}` which is the most Canton-idiomatic path, but the actual path may differ by Canton version/deployment. Validator and ledger probes use `/api/v1/health` which is a generic REST convention not confirmed against a real Canton node.

2. **No production auth security**: All auth tokens stored in plaintext `chrome.storage.local`. Acceptable for dev; not suitable for production secrets.

3. **Diagnostics are manual**: Users must click "Run diagnostics" to re-probe. No automatic re-evaluation on app startup or refresh.

4. **Party verification is scan-only**: A party can be confirmed present on the scan node but still not be able to transact (e.g., if its authorization has been revoked). The diagnostics do not detect this.

5. **No persistence of diagnostics state**: `cantonDiagnostics` is not persisted to storage — it is cleared on popup close and must be re-run on reopen. This is intentional (diagnostics are fresh probes, not cached state).
