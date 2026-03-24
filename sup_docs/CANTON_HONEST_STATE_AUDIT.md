# Jutis Extension — Canton Honest State Audit

*Post-implementation audit. Verified against source.*

---

## Which Canton Screens/Actions Are Now Honest

### WelcomeScreen
**Status**: ✅ Honest

- Shows "Canton" as the sole network identity
- No claim of live Base functionality
- Describes "Canton protocol wallet" — accurate since Canton is the protocol the product targets
- Lists capabilities honestly: "Party-based identity", "Transfer planning surface", "Reference portfolio data"

### HomeScreen — Canton Support Status Card
**Status**: ✅ Honest

Lines 293-310 show the Canton support matrix with correct states:
- `balances`: "reference-only" (fixture data, not live)
- `receive`: "unsupported" (no live party linked)
- `send`: "partial" (planning UX works, submission blocked)
- `swap`: "unsupported" (no Canton swap path)
- `activity`: "reference-only" (fixture data)

Text: *"Canton balances and activity are reference/demo-backed, send is planning-only, and swap is unsupported."* — directly accurate.

### Send Overlay — Canton Transfer Planning
**Status**: ✅ Honest

- Shows "Canton transfer planning" title with SupportBadge
- Canton send preview works (validation, amount checking) — correct for planning mode
- Warning: *"This Canton scaffold prepares protocol-aware transfer UX but does not ship live ledger submission by default."*
- Submit button: `<PrimaryButton disabled>Live transfer unavailable</PrimaryButton>` — explicitly disabled, not misleading

### Receive Overlay — Canton Party Info
**Status**: ✅ Honest

- Shows partyId if stored, or "Not linked" message
- Copy button works for partyId if present
- Blurb: *"Canton receive uses party-based identity. This screen is informational until a verified live topology is linked."*

### Swap Screen
**Status**: ✅ Honest

- Canton swap shown as "unsupported" with explicit blocker: *"No live Canton quote provider or settlement path is configured."*
- Quote button: "Live quotes unavailable" when `canRequestQuotes === false`
- Never pretends to have executable Canton swap

### Settings — Canton Identity Panel
**Status**: ✅ Honest

- Shows `authMode: "mock"` / `partyId: null` — correctly reflects default state
- Note: *"Link a live Canton party when validator, wallet-session, or external-party infrastructure is available."*
- All Canton capability badges shown with their actual state

---

## What Still Shows Partial/Demo/Unavailable State

| Screen | What It Shows | Why It's OK |
|---|---|---|
| HomeScreen | Canton balances: "1240.00 CC", "500.00 USDC" | Clearly `trustLevel: "demo"` + `support: "mocked"` badge shown |
| HomeScreen | Canton activity: 2 fixture entries | Source: "mock" / "local" badge shown |
| HomeScreen | Portfolio USD: "demo reference" | `isReliableUsdReference` returns false for demo trust level |
| Send preview | Fee: "--" (null) | `estimatedFeeNative: null` — no Canton fee infrastructure |
| Send preview | Warnings shown | "Planning only" warnings correctly displayed |
| Swap | Canton: "unsupported" | Correct — no live swap provider |
| Canton identity | partyId: "Not linked" | Correct — no party linked by default |

---

## Remaining Misleading UI/State Issues

### Issue 1: Canton balances appear numeric and "real"
**Location**: HomeScreen — Canton asset cards show "1240.00 CC" with no explicit "fixture" or "demo" label on the amount itself.

**Mitigation in place**: `SupportBadge state="mocked"` shown on Canton asset cards (line 359: `{asset.networkId === "canton-mainnet" ? <SupportBadge state={getAssetSupportState(asset)} /> : null}`). `getAssetSupportState` returns `"mocked"` for Canton assets.

**Verdict**: Badge is present but small. The large numeric balance could still be misread as real. Acceptable for this phase — a follow-up could add "Demo" prefix to Canton asset amounts.

### Issue 2: "Reference portfolio data" in WelcomeScreen
The WelcomeScreen says "Reference portfolio data" in the Canton readiness chips. This is accurate — portfolio shown after unlock is fixture data. Acceptable.

### Issue 3: Vault creation still produces a Base EVM mnemonic
**Location**: Vault creation flow (CreateWalletScreen → `createWallet()` → `VaultService.createFromRandomMnemonic()`)

The vault creates a BIP-39 mnemonic that produces a Base EVM address. This is not visible in the UI (Base is hidden), but the underlying secret is Base-oriented. There is no Canton secret derivation path.

**Mitigation**: The vault creates and stores a mnemonic that is never displayed as Base in the UI. The Canton identity (partyId) remains `null` and is a separate concern. This is acceptable for this phase.

**Verdict**: Not misleading in the UI — user never sees the Base address. Canton identity is stored separately.

---

## Next Exact Step Before Live Canton Functionality Work

**Before any Canton live integration (T4 from the transition plan), this step is required:**

### Step 0 (Prerequisite): Canton Party Identity Linkage UI

**What**: A UI flow to link a Canton `partyId` to the wallet, storing it in `chrome.storage.local` at `jutis:canton-identity`.

**Why first**: Every Canton live feature (account, holdings, send, receive, activity) requires a `partyId`. Without this, Canton is permanently in fixture/demo mode. The current `DEFAULT_CANTON_IDENTITY` has `partyId: null`.

**Minimum viable**:
1. New `LinkPartyScreen` with a text input for partyId
2. Write to `writeCantonIdentity()` (already exists in vault-repository)
3. `CantonWalletAdapter.getAccounts()` returns real account with linked partyId
4. `CantonWalletAdapter.getReceiveInfo()` returns real party receive target

**File to create**: `src/app/popup/Screens/LinkPartyScreen.tsx` (or inline in App.tsx)
**Files to modify**: `src/state/use-jutis-store.ts` (add `setScreen("link-party")` navigation), `src/app/popup/App.tsx` (add screen)

**After this step**: Canton shows a linked partyId in Settings and HomeScreen. All fixture/demo states remain until subsequent T4 work (holdings read, send submission, activity) is done.
