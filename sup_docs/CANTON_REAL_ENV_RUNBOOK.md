# Jutis Extension — Real Environment Verification Runbook (T4.3-Handoff)

*Step-by-step procedure for testing Jutis against a real Canton environment when URLs become available.*

---

## Prerequisites

- Chrome with Jutis extension loaded from `dist/`
- Extension vault created and unlocked
- Service worker DevTools open (Console + Network tabs)
- Real or mock Canton endpoint URLs available

---

## Before You Start: Collect Environment Data

Using **CANTON_ENVIRONMENT_HANDOFF.md**, collect from your operator/environment:

```
Validator API URL: _______________
Scan API URL:      _______________
Ledger API URL:    _______________  (optional)
Scan auth token:   _______________  (if required)
Validator auth token: _______________  (if required)
Linked party id:   party::_______________
Environment type:  local-dev / operator-hosted / custom
```

---

## Step 1 — Select the Right Profile

In Jutis: **Settings → Canton environment → Configure environment**

At the top of the Environment Profile section, select the appropriate button:

| If your environment is... | Select... |
|---|---|
| Local Canton Quickstart running on your machine | `local-dev` |
| A testnet or staging environment run by an operator | `operator-hosted` |
| Any manually configured environment | `custom` |

This is a label. It does not change probe behavior.

---

## Step 2 — Enter Validator URL First

1. In the **Validator API URL** field, enter the validator app base URL
2. Enter the **Validator auth token** if the endpoint requires one
3. Click **Save environment**

**Expected**: No error on save. The URL is now persisted.

---

## Step 3 — Run Initial Diagnostics

1. Click **Run diagnostics**
2. Wait up to 8 seconds per endpoint

**Interpret the Validator result:**

| If you see... | It means... |
|---|---|
| `validator: reachable — Canton vX.X.X` | Validator confirmed. `/version` responded with valid Canton version JSON. |
| `validator: reachable — Canton validator app` | Validator confirmed. `/version` responded but no version string extracted. |
| `validator: unreachable` | Validator did not respond within 8s. Check URL, network, and firewall. |
| `validator: unauthorized` | Validator requires auth. Add the Bearer token and save again. |
| `validator: malformed` | URL format is invalid (must be http/https). Fix the URL. |

---

## Step 4 — Enter Scan URL and Re-Diagnose

1. Enter the **Scan API URL** in the Scan API URL field
2. Enter **Scan auth token** if required
3. Click **Save environment**
4. Click **Run diagnostics** again

**Interpret the Scan result:**

| If you see... | It means... |
|---|---|
| `scan: reachable — Scan confirmed — N account(s) found` | Scan is live. N accounts returned for the configured party. |
| `scan: reachable — Scan confirmed — no accounts found` | Scan is live but the party has no accounts (or wrong party id). |
| `scan: unreachable` | Scan did not respond. Check URL. |
| `scan: invalid-response` | URL responded but none of the expected paths (`/v0/accounts`, `/api/v0/accounts`, `/api/v1/accounts`) returned valid JSON. |

---

## Step 5 — Check Readiness Progression

After each diagnostic run, look at the **Environment readiness** badge:

| Badge state | Readiness level | Meaning |
|---|---|---|
| `reference-only` | `unconfigured` | No URLs configured at all |
| `partial` | `endpoint-configured` | URLs set but not yet probed |
| `partial` | `validator-confirmed` | Validator confirmed; scan not yet confirmed |
| `partial` | `scan-confirmed` | Validator + scan confirmed; DSO not retrieved yet |
| `partial` | `dso-confirmed` | DSO party id retrieved; party visibility not confirmed |
| `live` | `party-visible` | Linked party confirmed present in scan accounts |
| `live` | `read-only-verified` | Full chain verified: validator + DSO + party visible |

**The diagnostic summary text** (shown below the badge) gives the full context. Read it.

---

## Step 6 — Verify Party Visibility

If the linked party id is known:

1. Go to **Settings → Link Canton party**
2. Enter the **party identifier** (e.g., `party::1234567890`)
3. Enter the **Scan auth token** if the scan requires it
4. Click **Link party**
5. Go back to **Settings → Configure environment**
6. Click **Run diagnostics** again

**New expected result if party is visible:**
- Readiness badge: `live`
- Summary: `Linked party is visible in Canton network. DSO: dso::...`
- `partyVisible: true` in `cantonDiagnostics`

**If party is NOT visible:**
- Readiness badge: `partial`
- Summary: `DSO party id retrieved: dso::... Party visibility not confirmed.`
- `partyVisible: false`
- Possible causes: wrong party id, party has no accounts yet, scan doesn't index this party

---

## Step 7 — Enter Ledger URL (Optional)

If a ledger URL was provided:

1. Enter the **Ledger API URL** in the Ledger API field
2. Enter **Ledger auth token** if required
3. Save and run diagnostics

**Interpret the Ledger result:**

| If you see... | It means... |
|---|---|
| `ledger: reachable — Ledger API reachable` | Ledger health probe succeeded on one of the tried paths |
| `ledger: unreachable` | Ledger did not respond. It may not be exposed in this environment. |
| `ledger: not-configured` | No ledger URL was entered |

**Important**: `ledger: reachable` does NOT mean send submission will work. It only means the health endpoint responded. The actual transfer submission API (`POST /v0/transfers` or similar) has not been tested.

---

## Step 8 — Full Diagnostic Interpretation

A **fully verified** environment shows:

```
Environment readiness: live (read-only-verified)

Summary:
Canton environment fully verified. DSO: dso::primary. Party visible.
Read-only live mode active.
```

With details:
- Validator: `reachable` with Canton version
- Scan: `reachable` with N account(s) found
- Scan-proxy: `reachable` (if derived from validator)
- Ledger: `reachable` or `not-configured`
- `dsoPartyId: "dso::primary"`
- `partyVisible: true`
- `readOnlyVerified: true`

---

## Failure Interpretation Guide

| Symptom | Likely Cause | Next Step |
|---|---|---|
| Validator always `unreachable` | Wrong URL, firewall, or Canton node not running | Verify URL is correct and Canton node is running |
| Validator `unauthorized` | Missing or wrong Bearer token | Request correct token from operator |
| Validator `reachable` but not identified as Canton | `/version` doesn't return Canton product | Confirm this is a Canton/Splice validator app |
| Scan always `invalid-response` | Wrong URL or wrong path structure | Ask operator for exact scan API URL and path |
| Scan reachable but `partyVisible: false` | Party id not present in scan accounts | Verify party id is correct; ask operator if party is indexed |
| DSO never retrieved | `/v0/dso-party-id` not exposed | This is acceptable — DSO retrieval is best-effort |
| Readiness stuck at `validator-confirmed` | Scan/scan-proxy not reachable | Focus on getting scan URL correct first |
| Readiness stuck at `dso-confirmed` | Party id not linked or not visible | Link the party id in LinkPartyScreen |

---

## Stop / Go Line for Activity Integration

**GO — proceed to activity integration when:**

```
✅ Validator: reachable (Canton confirmed)
✅ Scan or scan-proxy: reachable with accounts for linked partyId
✅ DSO party id: retrieved (or explicitly not available in this env)
✅ partyVisible: true
✅ readOnlyVerified: true
```

**STOP — do NOT proceed to activity integration when:**

```
❌ Validator unreachable or unidentified
❌ No scan or scan-proxy reachable
❌ partyVisible: false (party not found in scan accounts)
❌ No confirmed real Canton environment at all
```

Even if `partyVisible: true`, if the environment is `operator-hosted` without confirmed uptime or auth, treat it as experimental until real load has been tested.

---

## What Still Does NOT Prove Send Readiness

Even after reaching `read-only-verified`:

| What was NOT tested | Why it matters |
|---|---|
| Ledger transfer submission endpoint | Jutis only probes `/v0/health` on ledger. Submit path is unknown. |
| Party authorization to submit | Party visibility only confirms accounts exist, not that party can submit. |
| Ledger accepts signed transactions | No transaction signing or submission has been attempted. |
| Ledger auth for writes | Write auth (if different from read auth) is untested. |
