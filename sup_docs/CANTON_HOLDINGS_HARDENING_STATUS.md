# Jutis Extension — Canton Holdings Hardening Status (T4.3-H)

*Post-implementation. Build verified.*

---

## Files Changed

| File | Change |
|---|---|
| `src/core/models/types.ts` | Added `CantonHoldingsReadiness` type union; added `scanAuthToken?: string` to `CantonIdentity` |
| `src/app/shared/runtime-types.ts` | Added `scanAuthToken?: string \| null` to `jutis:update-canton-identity` request |
| `src/app/shared/runtime-dispatcher.ts` | Passes `scanAuthToken` through to `writeCantonIdentity()`; removed incorrect `support` logic |
| `src/state/use-jutis-store.ts` | Updated `linkParty(partyId, scanApiUrl?, scanAuthToken?)` signature and implementation |
| `src/app/popup/App.tsx` | `LinkPartyScreen` gains `scanAuthToken` input field; updated linked-state display; updated explanatory text |
| `src/adapters/canton/canton-wallet-adapter.ts` | `holdingsService` changed from `private` to `readonly` (public for controller access) |
| `src/adapters/canton/services/canton-holdings-service.ts` | Complete rewrite with honest `HoldingsReadiness` enum, URL validation, auth token support, probe method, per-readiness asset labeling |
| `src/core/orchestration/jutis-controller.ts` | `getCantonFeatureMatrix()` now passes `holdingsReadiness` from `holdingsService.getLastReadiness()` to the service |
| `src/adapters/canton/services/canton-reference-data-service.ts` | `getFeatureMatrix()` now accepts `holdingsReadiness` parameter; balances entry uses honest helper methods; maps readiness → support state |

---

## Assumptions Corrected

### Before (incorrect assumptions that were fixed):

| Location | Incorrect Assumption | Fixed To |
|---|---|---|
| Feature matrix `balances` entry | `scanApiUrl && partyId` → `"live"` | Only actual successful probe → `"live"` |
| Feature matrix blocker text | Assumed URL → live possible | Blockers now reflect actual failure mode |
| Asset `support` on demo fallback | Always `"partial"` | `"unsupported"` for malformed/unreachable/unauthorized; `"mocked"` for demo |
| Asset `support` on live | Used `"live"` (invalid for `AdapterSupportLevel`) | `"real"` — the correct live value in `AdapterSupportLevel` |
| Auth token | Not supported at all | Optional `scanAuthToken` field plumbed through storage → fetch |
| `CantonIdentity.support` in dispatcher | Set to `"partial"` based on `scanApiUrl` presence | Always `"partial"` — no false correlation |

---

## New Capability State Model

**`CantonHoldingsReadiness`** — evaluated on every `getAssets()` call via `probe()`:

| State | Meaning | UI Effect |
|---|---|---|
| `demo` | No `scanApiUrl` configured | Demo fixtures shown, `support: "mocked"` |
| `malformed` | `scanApiUrl` is not a valid `http://`/`https://` URL | Demo fixtures shown, `support: "unsupported"`, warning logged |
| `unreachable` | URL is valid but endpoint timed out or network error | Demo fixtures shown, `support: "unsupported"`, warning logged |
| `unauthorized` | Endpoint responded with HTTP 401 or 403 | Demo fixtures shown, `support: "unsupported"`, warning logged |
| `invalid-payload` | Endpoint responded but payload shape is wrong or accounts array empty | Demo fixtures shown, `support: "unsupported"`, warning logged |
| `live` | Endpoint returned valid `{ accounts: [...] }` with at least one account | Live accounts shown, `support: "real"`, `trustLevel: "live"` |

**Feature matrix `balances` support state mapping:**

| Readiness | ProductSupportState shown |
|---|---|
| `live` | `"live"` |
| `demo` | `"reference-only"` |
| `malformed` / `unreachable` / `unauthorized` / `invalid-payload` | `"unsupported"` |

---

## Auth-Aware Holdings Support

**Added**: `scanAuthToken?: string` field in `CantonIdentity` and all layers.

**Flow**:
1. User enters Bearer token in LinkPartyScreen "Scan auth token (optional)" field
2. Stored in `chrome.storage.local` at `jutis:canton-identity` as `scanAuthToken`
3. On `getAssets()`, `CantonHoldingsService.probe()` and `fetchLiveAccounts()` attach:
   ```
   Authorization: Bearer {scanAuthToken}
   ```
4. If endpoint returns 401/403 → readiness = `"unauthorized"` → demo shown, warning logged

**Security note**: `scanAuthToken` is stored in plaintext in `chrome.storage.local`. This is acceptable for development; production deployments should use session-based auth or a more secure secret store. No secrets are hardcoded — the token must be entered by the user.

**Deferred**: Auth mode upgrade path (from `"unlinked"` to `"validator-jwt"` etc.) is NOT implemented. `scanAuthToken` is a direct bearer token only.

---

## What Qualifies as Truly Live Holdings

**Before**: `scanApiUrl && partyId` → treated as live

**After**: All of the following must be true:
1. `scanApiUrl` is a valid `http://` or `https://` URL (format check)
2. The endpoint responds within 8 seconds (reachability check)
3. The endpoint does NOT return 401 or 403 (auth check)
4. The response parses as valid JSON with an `accounts` array (shape check)
5. The `accounts` array contains at least one entry (non-empty check)

Only then is `HoldingsReadiness = "live"` and `AssetRecord.support = "real"`.

---

## What Still Falls Back to Demo

| Scenario | Readiness | Demo Shown |
|---|---|---|
| No `scanApiUrl` configured | `demo` | Yes — `"mocked"` |
| `scanApiUrl` is malformed (not a URL) | `malformed` | Yes — `"unsupported"` |
| URL is valid but server unreachable | `unreachable` | Yes — `"unsupported"` |
| URL reachable but returns 401/403 | `unauthorized` | Yes — `"unsupported"` |
| URL reachable but returns invalid JSON or wrong shape | `invalid-payload` | Yes — `"unsupported"` |
| URL reachable, valid JSON, but `accounts` is empty | `invalid-payload` | Yes — `"unsupported"` |
| All checks pass with non-empty accounts | `live` | No — live accounts returned |

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` increased to ~49KB (LinkPartyScreen grew with auth token field). `controller.js` increased to ~381KB (new readiness types and helpers bundled).
