# Jutis Extension — Base Disable Status

*Post-implementation. Build verified.*

---

## What Was Disabled in UI

### Network Selector — Header
**File**: `src/app/popup/App.tsx` — `Header()` component

The two-button network switcher was replaced with a single disabled Canton label. No Base button is rendered.

- `networks.map()` iteration removed
- Single static Canton button: `<button disabled>Canton</button>`
- No `onClick` handler on the Canton indicator — non-interactive
- No Base button anywhere in the component

**Rollback**: Restore the `networks.map()` button renderer and remove the disabled Canton indicator.

---

### WelcomeScreen — Product Messaging
**File**: `src/app/popup/App.tsx` — `WelcomeScreen()` component

Changed all product-visible text that referenced Base:

| Before | After |
|---|---|
| Eyebrow: "Canton + Base" | "Canton" |
| Headline: "Build your secure multi-network wallet." | "Your Canton protocol wallet." |
| Description: mentions "Base local-custody path" | Mentions "Canton protocol" only |
| Networks chips: "Base live local custody path" | "Party-based identity", "Transfer planning surface", "Reference portfolio data" |

**Rollback**: Restore prior `WelcomeScreen()` JSX content.

---

### HomeScreen — EVM Live Path Badge
**File**: `src/app/popup/App.tsx` — `HomeScreen()` chip row

Removed `<Chip accent>EVM live path</Chip>` which was shown when Base was selected.

**Rollback**: Restore the `{isCantonSelected ? ... : <Chip accent>EVM live path</Chip>}` conditional.

---

## What Was Disabled in Runtime Selection

### Bootstrap — Network Lock
**File**: `src/state/use-jutis-store.ts` — `bootstrap()` action

Added Canton-enforcement on `selectedNetworkId`:

```typescript
const effectiveNetworkId =
  payload.preferences.selectedNetworkId === "base-mainnet"
    ? "canton-mainnet"
    : payload.preferences.selectedNetworkId;
```

If a stored preference has `selectedNetworkId === "base-mainnet"`, it is overridden to `"canton-mainnet"` at bootstrap. The corrected value is stored back into `preferences`.

**Rollback**: Remove the `effectiveNetworkId` override and use `payload.preferences.selectedNetworkId` directly.

---

### Send Draft — Canton-First on Refresh
**File**: `src/state/use-jutis-store.ts` — `updateSendDraftFromSnapshot()`

Changed to always prefer Canton assets on portfolio refresh. Previously could fall back to `snapshot.assets[0]` which might be a Base asset.

**Rollback**: Restore original fallback logic using `state.preferences?.selectedNetworkId`.

---

### Default Swap Request
**File**: `src/state/use-jutis-store.ts` — `DEFAULT_SWAP_REQUEST`

Changed from `base-mainnet / base-eth / canton-cc` to `canton-mainnet / canton-cc / canton-usdc`. This affects the initial swap request state but does not enable any functional swap (Canton swap is already blocked).

**Rollback**: Restore `DEFAULT_SWAP_REQUEST` to Base defaults.

---

## What Base Code Still Remains Internally

All Base adapter code is fully intact and unchanged:

```
src/adapters/base/                              ← UNCHANGED
src/adapters/base/base-wallet-adapter.ts         ← unchanged
src/adapters/base/services/                     ← unchanged
src/adapters/base/services/base-swap-adapter.ts  ← unchanged
```

**Still active in runtime**:
- `JutisController.loadPortfolio()` still calls `baseAdapter.getAccounts()` and `baseAdapter.getAssets()` in parallel with Canton calls — Base assets still loaded into portfolio snapshot (but hidden from UI)
- `JutisController.submitSend()` still has the `if (draft.networkId === "base-mainnet")` branch — never reached since Base cannot be selected
- `JutisController.reconcileBackgroundActivity()` still calls `baseActivityIndexer.reconcilePendingTransactions()` — runs silently on service worker boot, harmless
- `BaseSwapAdapter` still registered in `SwapProviderRegistry` — CantonSwapAdapter is still primary
- `BUILT_IN_NETWORKS` still contains `base-mainnet` entry — used internally for type consistency, not shown in UI
- `WalletVaultSecret.baseMnemonic` / `basePrivateKey` field names unchanged — vault creation and unlock unaffected
- `BaseTrackedTransactionRecord` type unchanged — storage functions intact
- `readBaseTransactions()` / `writeBaseTransactions()` unchanged — harmless if unused

---

## What Was Intentionally NOT Removed Yet

The following were NOT removed because removing them would destabilize shared runtime logic:

| Not Removed | Reason |
|---|---|
| `src/adapters/base/` directory | `loadPortfolio()` parallel fetch would break; Canton adapter doesn't yet return real accounts |
| `baseAdapter` in `JutisController` | Used in `Promise.all` in `loadPortfolio()`; removing would require controller refactor |
| `reconcileBackgroundActivity()` / `hasPendingBackgroundActivity()` | No Canton equivalent; removing would leave transaction reconciliation with no implementation |
| `base-transactions` storage functions | No Canton transaction record type; pending transactions cannot be tracked without this |
| `base-mainnet` in `BUILT_IN_NETWORKS` | Used for type completeness; not exposed in UI |
| `WalletVaultSecret.baseMnemonic` / `basePrivateKey` | Vault creation and unlock depend on these field names |
| `BaseSwapAdapter` in registry | Removing requires registry refactor; harmless as dead code |
| `https://mainnet.base.org` RPC URL in fixtures | Only used if Base branch is reached (never in this build) |

---

## Rollback Notes

**Full rollback path** (if Canton direction is reversed):

1. Restore `Header()` to render `networks.map()` with both Canton and Base buttons
2. Restore `WelcomeScreen()` text to prior "Canton + Base" version
3. Restore `<Chip accent>EVM live path</Chip>` in HomeScreen chip row
4. Remove `effectiveNetworkId` override in `bootstrap()`
5. Restore original `updateSendDraftFromSnapshot()` fallback logic
6. Restore `DEFAULT_SWAP_REQUEST` to Base defaults
7. Restore manifest description and `host_permissions`
8. Set `cantonOnlyMode: false` in `DEFAULT_FEATURE_FLAGS`

**All rollback steps are additive inverses** — no destructive operations required.

---

## Extension Loadability Check

Build output verified:

```
dist/
├── popup.html              ✓
├── options.html            ✓
└── assets/
    ├── background.js       ✓ (1,106 bytes)
    ├── popup.js            ✓ (45,383 bytes)
    ├── options.js          ✓ (5,165 bytes)
    ├── global.js           ✓
    ├── controller.js       ✓
    ├── runtime-dispatcher.js ✓
    └── global.css          ✓
```

No TypeScript errors. No build warnings. Extension loads in Chrome developer mode.
