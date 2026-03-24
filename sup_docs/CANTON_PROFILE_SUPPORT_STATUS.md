# Jutis Extension — Canton Profile Support Status (T4.3-Handoff)

*Build verified. Profile support added in T4.3-Handoff phase.*

---

## Files Changed

| File | Change |
|---|---|
| `src/core/models/types.ts` | Added `cantonEnvironmentProfile?: string` to `CantonIdentity` interface with documentation comment |
| `src/app/shared/runtime-types.ts` | Added `scanApiUrl?: string \| null` and `cantonEnvironmentProfile?: string \| null` to `jutis:update-canton-environment` request type |
| `src/app/shared/runtime-dispatcher.ts` | Added `scanApiUrl` handling to `update-canton-environment` handler; added `cantonEnvironmentProfile` preservation on unlink (when resetting to `DEFAULT_CANTON_IDENTITY`); added `scanApiUrl` field to environment update |
| `src/state/use-jutis-store.ts` | Extended `updateCantonEnvironment` action signature to accept `scanApiUrl` and `cantonEnvironmentProfile`; updated runtime request payload |
| `src/app/popup/App.tsx` | Added profile selector (local-dev / operator-hosted / custom) to `EnvironmentConfigScreen`; added editable `InputField` for scan API URL; added profile badge display next to readiness; removed read-only scan URL display |

---

## Profile Support Added

**Yes — minimal profile support added.**

Three named profiles are now available as a selector in `EnvironmentConfigScreen`:

| Profile | Meaning |
|---|---|
| `local-dev` | Local Canton/Splice quickstart stack or local development environment |
| `operator-hosted` | Environment provided by a validator operator or node provider |
| `custom` | Manually configured environment (default when none selected) |

The profile is a **display-only label**. It does not:
- Change any probe path or behavior
- Alter timeouts or retry logic
- Affect auth handling
- Enable or disable features

It exists solely to help users and operators track which kind of environment is configured.

---

## Backward Compatibility

| What | Status |
|---|---|
| Existing `cantonIdentity` in storage | ✅ Compatible — `cantonEnvironmentProfile` field is optional; old stored identities without this field work correctly |
| `update-canton-environment` requests | ✅ Compatible — `scanApiUrl` and `cantonEnvironmentProfile` are both optional; existing callers without these fields behave identically |
| Unlink party behavior | ✅ Preserved — `cantonEnvironmentProfile` is now preserved on unlink (previously it was reset with `DEFAULT_CANTON_IDENTITY`) |
| Diagnostics display | ✅ Unchanged — readiness and probe results displayed identically regardless of profile |

---

## Environment Profiles and What They Represent

An environment profile is stored as `cantonEnvironmentProfile` on `CantonIdentity`. It represents the **source** of the endpoint configuration:

```
cantonIdentity {
  validatorApiUrl: "https://validator.example/api"    ← from operator or local-dev
  scanApiUrl: "https://scan.example/api"             ← from operator or local-dev
  ledgerApiUrl: "https://ledger.example/api"         ← from operator or local-dev
  cantonEnvironmentProfile: "operator-hosted"         ← which kind of source
  partyId: "party::12345"                            ← from operator or self-generated
}
```

When switching environments, update the profile label to reflect the new source. This is purely informational.

---

## Scan URL Configurability

**Scan URL is now independently configurable in `EnvironmentConfigScreen`** (previously it was only set via `LinkPartyScreen`).

This means all three endpoint URLs (scan, validator, ledger) can be configured from one screen, which is the natural place for environment configuration. The `LinkPartyScreen` remains the place to set the party id and scan auth token.

If scan URL is set in both screens, the last save wins (same `cantonIdentity` in storage).

---

## What Kinds of Environments Can Be Represented

| Environment | Profile | URLs Required | Auth |
|---|---|---|---|
| Local Canton Quickstart | `local-dev` | validator + scan (+ ledger if available) | Likely none |
| Operator-hosted testnet | `operator-hosted` | validator + scan + ledger | Bearer tokens likely |
| Operator-hosted production | `operator-hosted` | validator + scan + ledger | Bearer tokens required |
| Manual custom | `custom` | Any combination | Any |
| Demo / unconfigured | (none) | None | N/A |

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` increased from ~54KB to ~55KB (new profile selector + scan input). `runtime-dispatcher.js` increased from ~5.4KB to ~5.7KB (new fields in environment update). `use-jutis-store.js` unchanged in size meaningfully. All other assets unchanged.
