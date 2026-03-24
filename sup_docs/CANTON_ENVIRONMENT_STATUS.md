# Jutis Extension — Canton Environment Diagnostics Status (T4.3-E)

*Post-implementation. Build verified.*

---

## Files Changed

| File | Change |
|---|---|
| `src/core/models/types.ts` | Added `CantonEnvironmentReadiness` enum; added `EndpointDiagnostics` interface; added `CantonEnvironmentDiagnostics` interface; added `validatorAuthToken?: string` and `ledgerAuthToken?: string` to `CantonIdentity` |
| `src/app/shared/runtime-types.ts` | Added `CantonEnvironmentDiagnosticsPayload` interface; added `validatorApiUrl`, `ledgerApiUrl`, `validatorAuthToken`, `ledgerAuthToken` to `jutis:update-canton-identity`; added `jutis:update-canton-environment` request type; added `jutis:diagnose-canton-environment` request type |
| `src/app/shared/runtime-dispatcher.ts` | `update-canton-identity` now reads current identity and preserves existing URL fields; added `update-canton-environment` handler; added `diagnose-canton-environment` handler |
| `src/state/use-jutis-store.ts` | Added `cantonDiagnostics` to state; added `validatorAuthToken`/`ledgerAuthToken` to `linkParty`; added `updateCantonEnvironment` and `diagnoseEnvironment` actions; added `"environment"` to `PopupScreen` type |
| `src/app/popup/App.tsx` | Added `EnvironmentConfigScreen` with endpoint URL/token fields, diagnostics display, save and run-diagnostics buttons; added Canton environment section to Settings; added `environment` screen to render tree |
| `src/core/orchestration/jutis-controller.ts` | Added `CantonEnvironmentService` instance; added `diagnoseCantonEnvironment()` method |
| `src/adapters/canton/services/canton-environment-service.ts` | **New file** — `CantonEnvironmentService` probes scan/validator/ledger endpoints; computes honest `CantonEnvironmentReadiness`; `EndpointDiagnostics` per endpoint |

---

## Environment Fields Added

**In `CantonIdentity`** (all persist to `chrome.storage.local`):

| Field | Type | Purpose |
|---|---|---|
| `scanApiUrl` | `string \| undefined` | Canton scan/participant node URL for holdings reads |
| `scanAuthToken` | `string \| undefined` | Bearer token for scan API auth |
| `validatorApiUrl` | `string \| undefined` | Canton validator API URL (for send validation — future) |
| `validatorAuthToken` | `string \| undefined` | Bearer token for validator API auth |
| `ledgerApiUrl` | `string \| undefined` | Canton ledger API URL (for transaction submission — future) |
| `ledgerAuthToken` | `string \| undefined` | Bearer token for ledger API auth |

---

## Diagnostics Added

**`CantonEnvironmentService`** performs lightweight probes of all three endpoints:

| Endpoint | Probe Path | Auth |
|---|---|---|
| Scan | `GET {scanApiUrl}/api/v1/accounts?party={partyId}` | Bearer token if set |
| Validator | `GET {validatorApiUrl}/api/v1/health` | Bearer token if set |
| Ledger | `GET {ledgerApiUrl}/api/v1/health` | Bearer token if set |

**Per-endpoint `EndpointReachability` states:**
- `not-configured` — URL is null/empty
- `malformed` — URL is set but not a valid http/https URL
- `unreachable` — URL valid but endpoint timed out or network error
- `unauthorized` — Endpoint returned HTTP 401 or 403
- `invalid-response` — Endpoint returned non-OK or non-JSON body
- `reachable` — Endpoint responded with valid JSON

**`CantonEnvironmentReadiness`** (overall summary):

| State | Meaning |
|---|---|
| `demo` | No endpoints configured |
| `configured` | URLs set but not yet probed |
| `partially-reachable` | Some endpoints reachable, others not |
| `unreachable` | All configured endpoints unreachable |
| `unauthorized` | All reachable endpoints unauthorized |
| `party-verified` | Scan API reachable and confirmed partyId has accounts |

**Party verification**: The scan API probe uses the `partyId` to query `/api/v1/accounts?party={partyId}`. If the response has a non-empty `accounts` array, the party is confirmed present in the network.

---

## What Can Now Be Verified

| Check | Method | Result |
|---|---|---|
| `scanApiUrl` format valid | `new URL()` parsing | `malformed` if invalid |
| `scanApiUrl` reachable | 8s timeout fetch to `/api/v1/accounts` | `reachable` / `unreachable` / `unauthorized` |
| `validatorApiUrl` reachable | 8s timeout fetch to `/api/v1/health` | `reachable` / `unreachable` / `unauthorized` |
| `ledgerApiUrl` reachable | 8s timeout fetch to `/api/v1/health` | `reachable` / `unreachable` / `unauthorized` |
| PartyId known on network | Scan API returns non-empty accounts | `party-verified` if true |
| Auth token valid | 401/403 detection on all endpoints | `unauthorized` if denied |

---

## What Still Cannot Be Verified

| Gap | Reason |
|---|---|
| Validator/ledger API contract | No known real Canton validator or ledger API endpoint confirmed. Probes use a generic `/api/v1/health` path which may not exist on real Canton nodes. |
| ACS completeness | Even if scan API returns accounts, the Daml ACS may have additional contracts not included in the REST response. |
| Send readiness | `ledgerApiUrl` is probed but not used for submission (T4.4 is separate). A `reachable` ledger probe does not mean send will work. |
| Party format validation | No Canton-specific party ID format validation. Any non-empty string is accepted. |
| Ledger/validator auth modes | Auth is Bearer token only. No path to upgrade from `"unlinked"` authMode to `"validator-jwt"` etc. |

---

## How Readiness Is Represented

1. **`cantonDiagnostics` in store** — updated on every `diagnoseEnvironment()` call. Shows per-endpoint reachability and overall readiness.
2. **Settings "Canton environment" section** — shows readiness badge and summary. Has "Configure environment" button linking to `EnvironmentConfigScreen`.
3. **EnvironmentConfigScreen** — shows all three endpoint configs with last-known reachability status; "Save" persists changes; "Run diagnostics" re-probes all endpoints.
4. **Feature matrix** — unchanged; still shows `"live"` for balances only when `CantonHoldingsService.probe()` succeeds.

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` increased to ~54KB (new EnvironmentConfigScreen). `controller.js` increased to ~384KB (new CantonEnvironmentService). `runtime-dispatcher.js` increased to ~5.4KB (two new handlers).
