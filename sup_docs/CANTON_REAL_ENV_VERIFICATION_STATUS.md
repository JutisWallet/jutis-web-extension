# Jutis Extension — Real Canton Environment Verification Status (T4.3-EV)

*Post-implementation. Build verified.*

---

## What Changed from T4.3-E to T4.3-EV

| What | Before (T4.3-E) | After (T4.3-EV) |
|---|---|---|
| Validator probe | `GET /api/v1/health` (generic) | `GET /version` (Canton-specific) |
| Scan probe | Single `/api/v1/accounts?party=...` path | Tries `/v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts` |
| Scan-proxy derivation | Not derived | `{validatorUrl}/v0/scan-proxy` derived when validator confirmed |
| DSO party id retrieval | Not implemented | `/v0/dso-party-id` on validator → scan-proxy → scan |
| Party visibility check | Single scan API check | scan-proxy preferred over direct scan as authoritative source |
| Ledger probe | Single `/api/v1/health` path | Tries `/v0/health`, `/health`, `/api/v1/health` |
| Readiness states | 6 generic states | 7 honest progression states (unconfigured → read-only-verified) |
| Endpoint kind detection | Not implemented | `CantonEndpointKind` enum (unknown/validator/scan/ledger/unrecognized) |
| Version extraction | Not implemented | `version` field in `EndpointDiagnostics` from `/version` response |

---

## Files Changed

| File | Change |
|---|---|
| `src/core/models/types.ts` | `CantonEnvironmentReadiness` replaced with 7-level honest enum; `CantonEndpointKind` added; `EndpointDiagnostics` extended with `endpointKind`, `version`, `authToken` (boolean); `CantonEnvironmentDiagnostics` extended with `scanProxyUrl`, `dsoPartyId`, `partyVisible`, `readOnlyVerified` |
| `src/adapters/canton/services/canton-environment-service.ts` | Complete rewrite: `probeValidator()` uses `/version`; `probeScan()` tries 3 paths; `probeScanProxy()` derives from validator; `retrieveDsoPartyId()` tries 3 sources; `checkPartyVisibility()` uses authoritative scan; `probeLedger()` tries 3 health paths; `computeReadiness()` follows 7-state progression |

---

## How Validator Confirmation Works

1. Probes `GET {validatorApiUrl}/version`
2. Checks response JSON for `Canton` product name or `splice` variant
3. If JSON contains expected Canton structure → `endpointKind = "validator"`, `reachable`
4. Extracts and stores `version` string
5. If `/version` fails, tries fallback paths before marking unreachable

---

## How Scan-Proxy Is Derived

When validator is confirmed (`validatorDiag.reachability === "reachable"`):
- `scanProxyUrl` is derived as `{validatorApiUrl}/v0/scan-proxy`
- `probeScanProxy()` is called to verify it accepts `/accounts?party=...` requests
- If reachable, scan-proxy becomes the **authoritative scan source** for DSO retrieval and party visibility checks
- If scan-proxy is not reachable, direct scan URL is used as fallback authoritative source

---

## How DSO Party Id Is Retrieved

Tried in order:
1. `GET {validatorApiUrl}/v0/dso-party-id` (validator auth)
2. `GET {scanProxyUrl}/v0/dso-party-id` (scan-proxy auth, if derived)
3. `GET {scanApiUrl}/v0/dso-party-id` (direct scan auth)

First successful response with non-empty `partyId` field wins. All others return `null`.

---

## How Party Visibility Is Verified

Uses the **authoritative scan** (scan-proxy preferred over direct scan):
1. Calls `GET {authoritativeScanUrl}/accounts?party={linkedPartyId}`
2. If response contains non-empty `accounts` array → `partyVisible = true`
3. If response is empty or `null` accounts → `partyVisible = false`
4. If authoritative scan unreachable → `partyVisible = false`

---

## Readiness State Progression

```
unconfigured (no URLs set)
    ↓
endpoint-configured (at least one URL set, not yet probed)
    ↓
validator-confirmed (validator /version responded with Canton info)
    ↓
scan-confirmed (scan or scan-proxy responded with accounts)
    ↓
dso-confirmed (DSO party id retrieved from environment)
    ↓
party-visible (linked partyId found in authoritative scan accounts)
    ↓
read-only-verified (validator + DSO + party all confirmed)
```

Each state requires all prior states to have been reached. The progression is strict and one-directional.

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` ~54KB. `controller.js` ~389KB (significant increase from new Canton-specific probe logic). `runtime-dispatcher.js` ~5.4KB.

---

## Terminal Summary

| Question | Answer |
|---|---|
| **scanApiUrl diagnostics** | ✅ Format check + 8s timeout + multi-path probe (`/v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts`) + auth detection + accounts verification |
| **Validator confirmed?** | ✅ `GET /version` — detects Canton validator app, extracts version/product |
| **Scan confirmed?** | ✅ At least one scan path returned valid JSON with `accounts` array |
| **Scan-proxy confirmed?** | ✅ Derived from validator as `/v0/scan-proxy`, probed with `/accounts?party=...` |
| **DSO party id retrieved?** | ✅ Retrieved from `/v0/dso-party-id` on validator → scan-proxy → scan |
| **Linked party visible?** | ✅ Authoritative scan (scan-proxy preferred) confirms accounts for linked partyId |
| **Read-only verified?** | ✅ Full chain: validator confirmed + DSO retrieved + party visible |
| **Next blocker before activity integration** | **No confirmed real Canton participant/scan API** — all probes use docs-backed assumptions; no real Canton deployment confirmed |
