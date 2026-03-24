# Jutis Extension — Canton-Primary UI Changes

*Post-change documentation. All changes verified against built output.*

---

## Files Changed

| File | Change Type |
|---|---|
| `src/app/popup/App.tsx` | Modified |
| `src/state/use-jutis-store.ts` | Modified |
| `src/core/models/fixtures.ts` | Modified |
| `src/core/models/types.ts` | Modified |
| `public/manifest.json` | Modified |

---

## A. UI / Product Exposure

### `src/app/popup/App.tsx` — `Header()` component

**Before**: Two-button network switcher showing Canton and Base, both active and clickable.

**After**: Single Canton label button, disabled and non-interactive. No Base button rendered.

**Rationale**: Removes the ability for users to switch to Base at the UI level. The Canton button acts as a static indicator.

```typescript
// Canton-only: single disabled Canton indicator, no Base selector
<button disabled style={{ cursor: "default" }}>Canton</button>
```

**Visible effect**: Users no longer see a network picker with Base as an option.

---

### `src/app/popup/App.tsx` — `WelcomeScreen()` component

**Before**:
- Eyebrow: "Canton + Base"
- Headline: "Build your secure multi-network wallet."
- Description: Mentions "real Base local-custody path" and "Canton reference and planning surface"
- Networks section: "Canton reference and planning mode" + "Base live local custody path"

**After**:
- Eyebrow: "Canton"
- Headline: "Your Canton protocol wallet."
- Description: "Jutis provides Canton party identity management, transfer planning, and portfolio tracking through the Canton protocol. Live Canton ledger features are available once a party identity is linked."
- Networks section: "Party-based identity", "Transfer planning surface", "Reference portfolio data"

**Visible effect**: WelcomeScreen reads as Canton-only. No mention of Base anywhere.

---

### `src/app/popup/App.tsx` — `HomeScreen()` line 290 (chip row)

**Before**: When Base network selected: `<Chip accent>EVM live path</Chip>` shown in header chip row.

**After**: Removed. When Canton selected (always now), only `<SupportBadge state={cantonBalances?.supportState ?? "reference-only"} />` is shown.

**Visible effect**: No "EVM live path" badge appears anywhere in the product.

---

## B. Runtime / State Defaults

### `src/state/use-jutis-store.ts` — `DEFAULT_SWAP_REQUEST`

**Before**:
```typescript
{
  networkId: "base-mainnet",
  fromAssetId: "base-eth",
  toAssetId: "canton-cc",
  amount: "1",
  slippageBps: 50
}
```

**After**:
```typescript
{
  networkId: "canton-mainnet",
  fromAssetId: "canton-cc",
  toAssetId: "canton-usdc",
  amount: "1",
  slippageBps: 50
}
```

**Rationale**: Default swap request is now Canton-to-Canton (demo assets), not Base-to-Canton. Canton swap is already blocked and shows honestly.

---

### `src/state/use-jutis-store.ts` — `bootstrap()` action

**Before**: `sendDraft.networkId` set to `payload.preferences.selectedNetworkId` (could be Base if user had Base selected in prior session).

**After**: If `selectedNetworkId === "base-mainnet"`, force to `"canton-mainnet"` before storing preferences and setting sendDraft.

```typescript
const effectiveNetworkId =
  payload.preferences.selectedNetworkId === "base-mainnet"
    ? "canton-mainnet"
    : payload.preferences.selectedNetworkId;
```

**Rationale**: Prevents a user who previously had Base selected from seeing Base state on reopen. Enforces Canton as the only network across sessions.

---

### `src/state/use-jutis-store.ts` — `updateSendDraftFromSnapshot()` helper

**Before**: Used first asset from `selectedNetworkId` or fell back to `snapshot.assets[0]` (could be a Base asset).

**After**: Always selects a Canton asset first. Falls back through Canton assets before considering any other network.

```typescript
const cantonAssets = snapshot.assets.filter(a => a.networkId === "canton-mainnet");
const firstAsset = cantonAssets[0] ?? snapshot.assets[...];
return { ...state.sendDraft, networkId: "canton-mainnet", assetId: firstAsset.id };
```

**Rationale**: On refresh/portfolio load, send draft always resolves to Canton. Never accidentally picks a Base asset.

---

## C. Manifest / Permissions

### `public/manifest.json`

**Before**:
```json
"description": "A protocol-aware extension wallet for Canton and Base.",
"host_permissions": ["https://mainnet.base.org/*"]
```

**After**:
```json
"description": "A protocol-aware extension wallet for Canton.",
"host_permissions": []
```

**Rationale**: Removes the only Base-specific permission. No runtime functionality requires Base RPC URL permission once Base is UI-hidden. The `host_permissions: []` is explicit (avoids inheriting any stale permissions).

---

## D. Feature Flag Added

### `src/core/models/fixtures.ts` + `src/core/models/types.ts`

**Added flag**: `cantonOnlyMode: true` in `DEFAULT_FEATURE_FLAGS` and `FeatureFlags` interface.

**Purpose**: Kill-switch to re-enable Base visibility without code changes. Set to `true` in defaults.

**Rollback**: Set to `false` to restore Base to network selector (after restoring UI code).

---

## Before/After Behavior Summary

| Behavior | Before | After |
|---|---|---|
| Network picker | Canton + Base (both active) | Canton only (disabled indicator) |
| Welcome tagline | "Canton + Base" / "multi-network" | "Canton" / "Canton protocol wallet" |
| Welcome networks chip | "Base live local custody path" visible | Canton-only chips only |
| Home header badge | "EVM live path" when Base selected | Canton SupportBadge only |
| Default swap request | base-mainnet / base-eth / canton-cc | canton-mainnet / canton-cc / canton-usdc |
| Re-selected network after reopen | Whatever was last selected | Always Canton |
| Send draft on refresh | Could pick Base asset | Always Canton asset |
| Manifest description | Mentions Canton and Base | Mentions Canton only |
| Base host permission | `https://mainnet.base.org/*` active | Removed |
