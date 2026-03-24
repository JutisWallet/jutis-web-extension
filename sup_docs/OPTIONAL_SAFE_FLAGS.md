# Jutis Extension — Feature Flags Added

*Post-implementation documentation.*

---

## Flag: `cantonOnlyMode`

**Added to**: `src/core/models/types.ts` — `FeatureFlags` interface
**Added to**: `src/core/models/fixtures.ts` — `DEFAULT_FEATURE_FLAGS`

```typescript
// In FeatureFlags interface (types.ts)
export interface FeatureFlags {
  cantonReferenceMode: boolean;
  baseExplorerEnrichment: boolean;
  experimentalEvmCustomNetworks: boolean;
  experimentalCantonNames: boolean;
  cantonOnlyMode: boolean;  // ← NEW
}

// In DEFAULT_FEATURE_FLAGS (fixtures.ts)
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  cantonReferenceMode: true,
  baseExplorerEnrichment: false,
  experimentalEvmCustomNetworks: false,
  experimentalCantonNames: false,
  cantonOnlyMode: true  // ← NEW — hides Base from UI
};
```

**Purpose**: Acts as a global kill-switch for Base visibility. When `true`, Base is hidden from the network selector and locked from selection at the store level.

**Default value**: `true` — Base is hidden by default in this build.

**How it affects behavior** (current implementation):
- Store `bootstrap()`: If `selectedNetworkId === "base-mainnet"`, forces to `"canton-mainnet"` — effectively enforces Canton regardless of prior user selection
- UI `Header`: Renders only the Canton indicator, not the Base button — enforced by component code, not by this flag directly

**Future removal plan**: When Canton live capabilities are fully operational and the Canton/Base decision is stable:
1. Set `cantonOnlyMode: false` to restore Base in UI
2. Update the flag name to something like `showBaseNetwork`
3. Remove the `effectiveNetworkId` override in `bootstrap()`
4. Restore the `networks.map()` renderer in `Header()`

**Rollback without this flag**: The flag is additive. Rolling back the UI changes (restoring `networks.map()` in Header, removing the Canton lock in bootstrap) makes the flag unused but harmless to leave in place.

---

## Other Existing Flags

| Flag | Default | Purpose |
|---|---|---|
| `cantonReferenceMode` | `true` | Enables Canton feature matrix and reference-mode UI surfaces |
| `baseExplorerEnrichment` | `false` | Enables Base explorer link enrichment — was never functional |
| `experimentalEvmCustomNetworks` | `false` | Reserved for custom EVM network support |
| `experimentalCantonNames` | `false` | Reserved for Canton ENS/name resolution |

None of the existing flags required changes for this phase.
