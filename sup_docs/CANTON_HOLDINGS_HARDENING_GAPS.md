# Jutis Extension — Canton Holdings Hardening Gaps (T4.3-H)

*Post-implementation audit for Canton holdings read honesty hardening.*

---

## What Is Now More Trustworthy

| What | Before | After |
|---|---|---|
| Feature matrix balances state | `"live"` whenever `scanApiUrl && partyId` existed | `"live"` only after successful probe with valid non-empty response |
| Demo fixture labeling | `support: "partial"` (ambiguous) | `support: "mocked"` when no URL; `support: "unsupported"` when URL configured but unavailable |
| Asset support for live holdings | `"partial"` (unchanged from default) | `"real"` when probe succeeds |
| Auth token | Not supported | Optional Bearer token stored and sent with every scan API request |
| URL validation | None — any string was accepted | Format validated before fetch attempt |
| Failure mode clarity | Single generic fallback | Six distinct readiness states with specific warnings |
| Feature matrix blockers | Generic "no URL" text | Specific text for each failure mode: malformed, unreachable, unauthorized, invalid-payload |

---

## What Still Depends on Real Canton Infrastructure

| Gap | Status | Notes |
|---|---|---|
| **No real Canton scan API endpoint** | Unchanged | Service is wired but no production Canton scan URL is known. All manual tests require a mock server. |
| **ACS-aware holdings query** | Unchanged | Canton holdings come from Daml ACS. A REST `/accounts` endpoint may not correctly aggregate all active `Fungible` contracts. Real integration may need Canton console queries or an indexer. |
| **No background polling** | Unchanged | Holdings are re-fetched only on explicit refresh. No background polling or caching. |
| **No USD price feed** | Unchanged | Live accounts' `usdValue` is assumed pre-computed by the scan node. If not provided, USD values may be absent or zero. |
| **Auth token stored in plaintext** | New gap introduced | `scanAuthToken` is stored in `chrome.storage.local` in plaintext. Acceptable for dev; not suitable for production secrets. |
| **Bearer token auth only** | New gap introduced | Only direct Bearer token is supported. No JWT parsing, no token refresh, no OAuth flow. The auth mode remains `"unlinked"` even when a token is attached. |
| **`ledgerApiUrl` / `validatorApiUrl` unused** | Unchanged from prior phase | Only `scanApiUrl` is wired. Ledger and validator URLs are in the `CantonIdentity` type but not used by any service. |

---

## Is Auth-Aware Live Holdings Truly Achieved?

**Answer: Partial — auth is plumbed but not verified in production**

The `scanAuthToken` field now flows from user input through to the fetch request as an `Authorization: Bearer` header. This is the minimum viable auth wiring.

However:
- No real Canton participant node is known to test this against
- The 401/403 detection works (demo fallback triggers correctly)
- The token is stored in plaintext — not suitable for production secrets
- The auth mode in `CantonIdentity` remains `"unlinked"` even when a token is attached — there's no path from bearer token to an upgraded `authMode`
- No token rotation, expiry, or refresh mechanism exists

**Verdict**: Auth wiring is in place as a foundation. It's not a complete auth solution.

---

## Terminal Summary

| Question | Answer |
|---|---|
| Configured URL implies live? | **No** — URL must be valid format, reachable, authorized, and return non-empty valid payload |
| Auth-aware holdings support added? | **Partial** — Bearer token field added and plumbed to fetch header; no token mgmt or auth mode upgrade |
| Live holdings require successful fetch? | **Yes** — `HoldingsReadiness === "live"` only after all 5 probe checks pass |
| Unauthorized state handled honestly? | **Yes** — 401/403 detected, readiness = `"unauthorized"`, demo shown, warning logged |
| Demo fallback labeled honestly? | **Yes** — `support: "mocked"` for no-URL; `support: "unsupported"` for configured-but-failed; feature matrix `"reference-only"` vs `"unsupported"` correctly distinguished |
| **Next blocker after holdings hardening:** | **No known real Canton scan API endpoint** — service infrastructure is complete but untested against a real Canton network; T4.4 (send submission) requires `ledgerApiUrl` and a live signer, which are not yet wired |

---

## Dependency Chain (Updated)

```
Party linkage (T4.1) ✅
     ↓
Holdings read (T4.3) ✅
     ↓
Holdings hardening (T4.3-H) ✅ ← THIS PHASE
     ↓
Send submission (T4.4) ← blocked: no real Canton scan API, no ledgerApiUrl, no signer
     ↓
Activity read (T4.5) ← blocked: no scanApiUrl confirmed live, no scan/ledger wiring
     ↓
Transaction lifecycle (T4.6)
     ↓
Background reconcile (T4.7)
```

---

## Remaining Honest Limitations

1. **No live Canton environment**: Without a real Canton participant/scan node URL with valid auth, all holdings are demo. The hardening ensures this is never misrepresented.

2. **ACS complexity unaddressed**: Canton holdings are contract-based, not account-based. The REST `/accounts` endpoint assumption may not hold for all Canton deployments.

3. **`scanAuthToken` is a best-effort foundation**: Bearer token support was added minimally. Production auth would need proper secret management (not `chrome.storage.local` plaintext), token refresh, and an auth mode upgrade path to `"validator-jwt"` or `"wallet-session"`.

4. **No topology verification**: PartyId format is not validated against any Canton network. A party can be linked even if it doesn't exist on the configured network.

5. **Feature matrix is only as current as the last probe**: `getLastReadiness()` returns the result of the most recent `getAssets()` call. If the endpoint changes state between renders, the matrix might show stale information until the next refresh.
