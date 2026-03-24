# Jutis Extension — LocalNet / Splice Quickstart Compatibility (T4.3-Handoff)

*What Jutis currently assumes vs what LocalNet / Splice Quickstart likely exposes.*

---

## What Jutis Currently Assumes

Jutis probes the following Canton/Splice endpoints:

### Validator App

| Path | Method | Expected Response | Status |
|---|---|---|---|
| `GET /version` | Validator base URL | `{ product: "Canton", version: "3.x.x", ... }` | **Assumed** — not confirmed against LocalNet |
| `GET /v0/dso-party-id` | Validator base URL | `{ partyId: "dso::..." }` | **Assumed** — not confirmed against LocalNet |

### Validator scan-proxy (derived)

| Path | Method | Expected Response | Status |
|---|---|---|---|
| `GET {validatorUrl}/v0/scan-proxy/accounts?party=...` | Derived from validator | `{ accounts: [...] }` | **Assumed** — not confirmed |
| `GET {validatorUrl}/v0/scan-proxy/dso-party-id` | Derived from validator | `{ partyId: "dso::..." }` | **Assumed** — not confirmed |

### Direct Scan API

| Path | Method | Expected Response | Status |
|---|---|---|---|
| `GET /v0/accounts?party=...` | Scan base URL | `{ accounts: [...] }` | **Assumed** — not confirmed against LocalNet |
| `GET /api/v0/accounts?party=...` | Scan base URL | `{ accounts: [...] }` | **Fallback** — older Canton style |
| `GET /api/v1/accounts?party=...` | Scan base URL | `{ accounts: [...] }` | **Fallback** — legacy style |
| `GET /v0/dso-party-id` | Scan base URL | `{ partyId: "dso::..." }` | **Assumed** — not confirmed |

### Ledger API

| Path | Method | Expected Response | Status |
|---|---|---|---|
| `GET /v0/health` | Ledger base URL | Any 200 OK | **Assumed** — not confirmed |
| `GET /health` | Ledger base URL | Any 200 OK | **Assumed** — not confirmed |
| `GET /api/v1/health` | Ledger base URL | Any 200 OK | **Legacy fallback** |

---

## What Likely Matches Splice/Quickstart

Based on Splice documentation and Canton v3.x architecture:

### Likely Compatible

| Endpoint | Reason |
|---|---|
| `GET /version` on validator | Standard Canton validator app entry point; Splice Quickstart exposes this |
| `GET /v0/dso-party-id` on validator | Splice-specific path for DSO identity; Quickstart should expose this |
| `GET /v0/scan-proxy/accounts` under validator | Splice scan-proxy architecture; this is a core Splice design pattern |
| `GET /v0/accounts` on scan API | Canton participant node REST API; standard Canton v2+/v3.x pattern |

### Likely Requires Mapping / Adaptation

| Endpoint | Uncertainty |
|---|---|
| Direct scan URL vs scan-proxy | LocalNet may only expose scan-proxy, not a separate direct scan URL. Jutis handles this: scan-proxy is checked first, direct scan is fallback. |
| Scan API base URL | In LocalNet, the scan API might be hosted at the same URL as the validator, or at a different port. The path structure (`/v0/accounts`) is likely the same. |
| Auth requirements | LocalNet Quickstart may not require auth. Production operator-hosted environments likely will. Jutis supports optional Bearer tokens. |
| Party id format | LocalNet Quickstart generates party ids in `party::...` format. This matches what Jutis expects. |

### Unknown / Must Be Confirmed

| Gap | Notes |
|---|---|
| LocalNet scan-proxy path exact format | Is it exactly `/v0/scan-proxy` or does it differ by port/host? |
| Whether direct scan URL is separate from validator in LocalNet | May be `http://localhost:4001` vs validator at `http://localhost:4000` |
| Whether `/api/v0/accounts` or `/v0/accounts` is the active path in LocalNet | Jutis tries both — one will work |
| Ledger API presence in LocalNet | LocalNet may not include a ledger API; Jutis will show `not-configured` |
| Health check path for ledger | If ledger is present, `/v0/health` is the expected path |

---

## What Was Added for LocalNet Readiness

**Nothing was hardcoded.** The following additions make Jutis ready to test against LocalNet when URLs are available:

1. **Profile selector** (`local-dev` / `operator-hosted` / `custom`) — purely a label, no probe behavior change
2. **Scan URL configurable in EnvironmentConfigScreen** — LocalNet may expose scan separately from validator
3. **`cantonEnvironmentProfile`** field on `CantonIdentity` — persists the profile label across sessions
4. **Multi-path probe fallback** — Jutis already tries `/v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts` automatically, covering different Canton versions

---

## Path Compatibility Matrix

| Path | LocalNet (likely) | Operator-Prod (likely) | Jutis probe strategy |
|---|---|---|---|
| `/version` | ✅ | ✅ | Single path |
| `/v0/dso-party-id` (validator) | ✅ | ✅ | Single path |
| `/v0/scan-proxy/accounts` | ✅ | ✅ | Derived + probed |
| `/v0/accounts` (scan) | ⚠️ may differ | ⚠️ may differ | Multi-path fallback |
| `/api/v0/accounts` | ⚠️ older Canton | ⚠️ older Canton | Fallback |
| `/v0/health` (ledger) | ⚠️ may not exist | ⚠️ may not exist | Optional, 3-path fallback |

---

## Conclusion

**LocalNet compatibility: Partial** — Jutis has the right probe architecture and multi-path fallback logic. The key paths (`/version`, `/v0/scan-proxy`, `/v0/dso-party-id`) are docs-backed Splice assumptions. Actual LocalNet endpoint paths must be confirmed by entering LocalNet URLs and running diagnostics. No hardcoded LocalNet URLs exist in the codebase.
