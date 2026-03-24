# Jutis Extension — Canton Environment Handoff (T4.3-Handoff)

*What to collect from a validator operator or node provider to configure Jutis against a real Canton environment.*

---

## What Jutis Needs from an Environment

Jutis performs **read-only** diagnostics of Canton environments. It needs:

| Field | Required? | What it does |
|---|---|---|
| `validatorApiUrl` | Recommended | Base URL of the Canton/Splice validator app. Probed with `GET /version` to confirm Canton identity and extract version. |
| `scanApiUrl` | Recommended | Base URL of the Canton participant/scan API. Probed with `GET /v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts`. Used for holdings reads. |
| `ledgerApiUrl` | Optional | Base URL of the Canton ledger API. Probed with `GET /v0/health`, `/health`, `/api/v1/health`. For future send submission — not used yet. |
| `scanAuthToken` | If required | Bearer token for scan API auth, if the endpoint requires it. |
| `validatorAuthToken` | If required | Bearer token for validator API auth. |
| `ledgerAuthToken` | If required | Bearer token for ledger API auth. |
| `partyId` | Required | The Canton party identifier this wallet is linked to (e.g., `party::1234567890`). Used for holdings reads and party visibility checks. |

---

## Questions to Ask the Validator Operator

Copy-paste this list when reaching out to a validator operator or node provider:

### Endpoint URLs

```
1. What is the URL of your validator app?
   (This is the base URL that exposes the Canton validator REST API)

2. Is a scan/participant API exposed separately from the validator?
   If yes, what is its base URL?

3. Is a scan-proxy path available under the validator app?
   (i.e., does {validatorUrl}/v0/scan-proxy respond to requests?)

4. Is a ledger API exposed?
   If yes, what is its base URL?

5. What is the expected auth method for each endpoint?
   - None (public)
   - Bearer token (what format?)
   - Other (describe)
```

### Party / Identity

```
6. What is the party identifier this wallet should be linked to?
   (e.g., party::1234567890)

7. Is this party hosted by you (the operator) or self-hosted by the user?

8. Is there a DSO (Domain Security Operator) party id for this environment?
   (Jutis will attempt to retrieve it automatically from /v0/dso-party-id)
```

### Environment Classification

```
9. What type of environment is this?
   - Local development / Quickstart (local Canton stack)
   - Operator-hosted testnet
   - Operator-hosted production

10. Are there any rate limits or usage restrictions I should be aware of?

11. Are there any known uptime or availability expectations?
```

---

## What Counts as Sufficient for Read-Only Verification

The following must ALL be true for Jutis to show `read-only-verified` readiness:

| Check | How Jutis verifies it |
|---|---|
| Validator is a real Canton/Splice node | `GET /version` returns JSON with `product: "Canton"` |
| Validator version extracted | `version` field captured from `/version` response |
| Scan or scan-proxy is reachable | At least one accounts path returns valid JSON |
| DSO party id retrieved | `/v0/dso-party-id` on validator → scan-proxy → scan returns a `partyId` string |
| Linked party has accounts on the network | Scan/scan-proxy returns non-empty `accounts` array for `?party={linkedPartyId}` |

**If any of the above fail, Jutis will show a partial readiness state, NOT `read-only-verified`.**

---

## What Is Still Insufficient for Send Readiness

Even `read-only-verified` does NOT mean send submission will work:

| Gap | Reason |
|---|---|
| Ledger API contract unknown | Jutis probes ledger health but has no confirmed path for transfer submission |
| Ledger auth not verified | A `reachable` ledger probe does not mean the ledger will accept a submitted transfer |
| No submit endpoint discovered | Even if `/v0/health` is reachable, the actual `/v0/transfers` or similar submit path is unknown |
| Party authorization not verified | Party visibility confirms accounts exist; it does not confirm the party can submit transactions |

---

## Exact Data Format to Collect

When an operator provides endpoint URLs, collect them in this format:

```
Validator API URL: https://_______________/api
Scan API URL:      https://_______________/api  (or "same as validator" / "not exposed")
Ledger API URL:    https://_______________/api  (or "not exposed")
Scan auth token:   _______________  (or "none")
Validator auth token: _______________  (or "none")
Ledger auth token: _______________  (or "none")
Linked party id:   party::_______________
Environment type:  local-dev / operator-hosted testnet / operator-hosted production
```

---

## What to Do with This Data

1. Open Jutis → Settings → Canton environment → Configure environment
2. Select the appropriate profile: **local-dev**, **operator-hosted**, or **custom**
3. Enter the validator URL, scan URL, and ledger URL (if provided)
4. Enter auth tokens if required
5. Click **Save environment**
6. Click **Run diagnostics**
7. Verify readiness reaches `read-only-verified` before attempting live reads
