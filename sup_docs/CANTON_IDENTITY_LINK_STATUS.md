# Jutis Extension — Canton Identity Link Status

*Post-implementation. Build verified.*

---

## Files Changed

| File | Change |
|---|---|
| `src/app/shared/runtime-types.ts` | Added `CantonIdentityPayload` interface; added `jutis:update-canton-identity` to `RuntimeRequest` union |
| `src/app/shared/runtime-dispatcher.ts` | Added handler for `jutis:update-canton-identity`; imports `DEFAULT_CANTON_IDENTITY`, `DEFAULT_CANTON_CAPABILITIES` |
| `src/state/use-jutis-store.ts` | Added `linkParty()` and `unlinkParty()` actions; added `CantonIdentityPayload` import; added `"link-party"` to `PopupScreen` |
| `src/app/popup/App.tsx` | Added `LinkPartyScreen` component; added "Link party" / "Change party" button in Settings; added `setScreen` to Settings hook; added `link-party` screen to render tree |

---

## Storage Path Used

**Key**: `"jutis:canton-identity"` in `chrome.storage.local`

**Read path**: `controller.readCantonIdentity()` → `readCantonIdentity()` → `persistentStorage.get("jutis:canton-identity")` → `DEFAULT_CANTON_IDENTITY` if absent

**Write path**: `controller.writeCantonIdentity(identity)` → `writeCantonIdentity(identity)` → `persistentStorage.set("jutis:canton-identity", identity)`

**Existing persistence functions reused**: `writeCantonIdentity()` and `readCantonIdentity()` in `vault-repository.ts` — no new storage functions needed.

---

## UI Flow Added

### Link Party Screen (`LinkPartyScreen`)

**Navigation**: Accessed from Settings → "Canton identity" section → "Link party" (or "Change party" if already linked)

**States**:
1. **No party linked**: Shows empty partyId input field, "Link party" button
2. **Party already linked**: Shows currently linked partyId highlighted, "Unlink party" button, "Cancel" button
3. **During operation**: "Linking..." / "Unlinking..." busy state, button disabled
4. **On error**: Red error banner with message, input retained

**Screen content**:
- Explanatory text about what party linking means
- Warning that holdings and history remain demo data
- Party ID input (when unlinked)
- Current linked party display (when linked)
- Error banner (on failure)
- Save/Unlink + Cancel buttons

**After success**: Navigates back to Settings screen with updated Canton identity reflected.

---

## Linked/Unlinked Behavior

### When Linking
1. User enters partyId string
2. `linkParty(partyId.trim())` called
3. Runtime request: `{ type: "jutis:update-canton-identity", partyId: trimmed }`
4. Dispatcher creates `CantonIdentity` with `partyId` set, `authMode: "unlinked"`, `support: "partial"`, `capabilities: DEFAULT_CANTON_CAPABILITIES`
5. Written to `chrome.storage.local` at `"jutis:canton-identity"`
6. Store `cantonIdentity` state updated
7. Returns to Settings screen

### When Unlinking
1. User clicks "Unlink party"
2. `unlinkParty()` called (no argument)
3. Runtime request: `{ type: "jutis:update-canton-identity", partyId: null }`
4. Dispatcher resets identity to `DEFAULT_CANTON_IDENTITY` (all defaults)
5. Written to storage
6. Store `cantonIdentity` state updated
7. Returns to Settings screen

### On Popup Reopen / Bootstrap
- `bootstrap()` calls `controller.readCantonIdentity()` which reads from storage
- If a partyId was previously linked, it is restored from storage
- Settings shows "Change party" if `partyId !== null`
- Receive screen uses the stored `partyId`

### On Browser Restart
- Session secret is cleared (intentional)
- Canton identity stored in `chrome.storage.local` persists across restart
- Party linking is preserved across browser restarts

---

## Validation Rules

| Rule | Behavior |
|---|---|
| Empty input | `linkParty` trims input, rejects if `!trimmed`, sets error: "Party identifier cannot be empty." |
| Whitespace-only | Treated as empty, rejected |
| Storage write failure | Caught in `try/catch`, error: "Failed to link Canton party." shown |
| Runtime error | Propagates as error message in store |
| Unlink failure | Same error handling pattern as link failure |

**No ledger validation**: PartyId format is not validated against a live Canton ledger. Any non-empty string is accepted and stored. This is intentional — the first version is conservative.

---

## CantonIdentity Written Structure

When linking a party:
```typescript
{
  networkId: "canton-mainnet",
  partyId: "<user-provided string>",  // trimmed, non-empty
  authMode: "unlinked",              // intentionally not "mock"
  capabilities: DEFAULT_CANTON_CAPABILITIES,  // same defaults
  support: "partial"                  // still partial — not upgraded to "real"
}
```

When unlinking:
```typescript
DEFAULT_CANTON_IDENTITY = {
  networkId: "canton-mainnet",
  partyId: null,
  authMode: "mock",
  capabilities: { canReadHoldings: true, canReadActivity: true, canPrepareTransfers: true, canSubmitTransfers: false, ... },
  support: "partial"
}
```

---

## Known Limitations

1. **No ledger verification**: PartyId is stored as-is. No check that it corresponds to a real Canton party.
2. **No auth mode upgrade**: Linking a party does not change `authMode` from `"unlinked"`. In future, attaching a validator JWT or other credentials would upgrade this.
3. **No topology URL configuration**: This phase does not add `validatorApiUrl`, `ledgerApiUrl`, or `scanApiUrl` fields. Those remain unset.
4. **No Canton ledger connectivity**: Linking a party does not enable live holdings, live activity, or live sends. Those require separate work (T4.x from the transition plan).
5. **Party ID format not validated**: Any non-empty string is accepted. Extremely long strings may cause UI overflow issues.
6. **No confirmation step on unlink**: User clicks "Unlink" and it immediately calls the action.

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` increased from ~45KB to ~48KB (LinkPartyScreen added). All other bundles unchanged.
