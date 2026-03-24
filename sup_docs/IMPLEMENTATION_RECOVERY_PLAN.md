# Jutis Extension — Implementation Recovery Plan

---

## Phase 0: Diagnosis and Verification

**Goal**: Confirm the exact state of build artifacts before proceeding.

### Steps

1. **Re-run the build** to get a clean artifact set:
   ```powershell
   npm.cmd install
   npm.cmd run build
   ```
   This will confirm whether the `dist/popup.html` / `dist/options.html` script swap is a persistent build bug or a one-time artifact corruption.

2. **Inspect the freshly-built `dist/` HTML files**:
   - `dist/popup.html` should reference `/assets/popup.js`
   - `dist/options.html` should reference `/assets/options.js`
   - If still swapped → build config bug confirmed
   - If corrected → prior build was corrupted

3. **Attempt to load in Chrome developer mode**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder
   - Verify the extension appears with an icon
   - Click the icon to open the popup

4. **Check browser console** (background service worker and popup):
   - Open extension popup → right-click → Inspect
   - Check service worker logs via `chrome://extensions/` → "Service worker" link
   - Look for runtime errors, CSP violations, or script failures

---

## Phase 1: Minimal Path to "Extension Loads Successfully"

**Goal**: Get the extension to install, show an icon, and open the popup UI without errors.

### 1.1 — Create Extension Icons (P0)

**Problem**: No icon files exist anywhere in the project.

**Solution**:
1. Create `public/assets/` directory
2. Design or generate icon PNG files matching the Jutis brand (graphite dark + lime accent, per `docs/design-audit.md`)
3. Create at minimum:
   - `public/assets/icon-48.png` (48×48)
   - `public/assets/icon-128.png` (128×128)
4. Optionally also: `icon-16.png`, `icon-32.png`, `icon-192.png`

**Source reference**: `designed_source/carbon_main_wallet_*/screen.png` show the visual identity to base the icon on.

### 1.2 — Update Manifest with Icons (P0)

**Problem**: Manifest has no `icons` field.

**Solution** — add to `public/manifest.json`:
```json
"icons": {
  "48": "assets/icon-48.png",
  "128": "assets/icon-128.png"
}
```

### 1.3 — Fix Script Reference Swap (P0 — Conditional)

**Problem**: `dist/popup.html` loads `options.js` and vice versa.

**Solution**:
- If confirmed persistent after re-build: investigate `vite.config.ts` rollup input naming
- The `rollupOptions.input` keys are `popup` and `options` — this should produce correct output names
- Likely cause: manual edit of `dist/` HTML files or a prior incorrect fix
- **Fix**: After re-running build, verify `dist/popup.html` references `popup.js`. If still wrong, check for a stale cache or duplicate HTML output

### 1.4 — Add `content_security_policy` (P2)

**Problem**: MV3 manifest without CSP may cause runtime issues.

**Solution** — add to `public/manifest.json`:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

---

## Phase 2: Path to "Extension Actually Works"

**Goal**: Make the core wallet features functional — create/import wallet, view portfolio, send on Base.

### 2.1 — Verify Base Network Integration (P1)

**Problem**: `host_permissions` only covers `https://mainnet.base.org/*` — may not be sufficient for all Base block explorer and RPC calls.

**Solution**:
1. Test creating a wallet and checking portfolio balance
2. If Base balances show as "0" or RPC errors appear in console:
   - Verify `https://mainnet.base.org` is reachable from the machine
   - Add `https://base.blockscout.com/*` to `host_permissions` for explorer enrichment
   - Check if an API key is required for the Base RPC endpoint

### 2.2 — Verify Vault Creation Flow (P1)

**Problem**: Vault creation uses password-based encryption — must verify the unlock flow works end-to-end.

**Solution**:
1. In popup: click "Create wallet"
2. Enter password (8+ chars)
3. Verify vault is created and session starts
4. Lock wallet and unlock again with same password
5. Confirm portfolio loads (demo data if Base RPC is unavailable)

### 2.3 — Canton Adapter Boundary Review (P1)

**Problem**: Canton features are intentionally reference-only in this build.

**Solution**:
- Review `docs/canton-capability-matrix.md` for what Canton features are live vs. stub
- Canton send/swap cannot be made live without live Canton ledger topology
- This is a known limitation documented in the README and docs
- No action needed unless Canton integration is a Phase 3 goal

### 2.4 — Swap Integration (P1)

**Problem**: Swap is intentionally disabled (fail-closed) until a live provider is integrated.

**Solution**:
- `BaseSwapAdapter` currently uses development quote adapter
- To make swap live: integrate a real swap provider (e.g., 1inch, 0x, or Uniswap SDK)
- This is documented as a production step in README

---

## Phase 3: Production-Ready Cleanup

**Goal**: Polish, security hardening, and store-ready compliance.

### 3.1 — Add `_locales/` for i18n

**Problem**: English-only; Chrome Web Store requires at least one locale.

**Solution**: Create `public/_locales/en/messages.json` with extension name and description:
```json
{
  "app_name": { "message": "Jutis Wallet" },
  "app_description": { "message": "A protocol-aware extension wallet for Canton and Base." }
}
```

### 3.2 — Toolbar Action Icon

**Problem**: `action.default_icon` is not set — toolbar button shows no image.

**Solution**: Add `default_icon` to the `action` field in manifest:
```json
"action": {
  "default_title": "Jutis",
  "default_popup": "popup.html",
  "default_icon": {
    "16": "assets/action-icon-16.png",
    "32": "assets/action-icon-32.png"
  }
}
```

### 3.3 — Review and Harden `host_permissions`

**Problem**: Only Base mainnet RPC is declared; additional URLs may be needed.

**Solution**: Audit all network calls in the codebase and ensure all required host permissions are declared. Consider adding:
- Block explorer URLs for transaction history
- Any additional RPC endpoints

### 3.4 — Full CSP Audit

**Problem**: CSP is minimal.

**Solution**: Review actual resource loading (fonts, external CDN calls if any) and add appropriate CSP directives.

### 3.5 — Security Audit

**Problem**: No external security review was performed during development.

**Recommended actions**:
- Review `src/security/crypto.ts` for encryption strength
- Verify `vault-service.ts` secret handling
- Confirm no secrets or private keys are ever exposed to content scripts or web pages
- Run `npm run lint` and `npm run test` to ensure no regressions

### 3.6 — Chrome Web Store Submission Prep

Per `docs/extension-publish-and-test-guide.md`, ensure:
- 128×128 icon is high quality (used in store listing)
- Privacy policy URL is prepared
- Screenshots of the wallet UI are captured
- `options_page` is fully functional as a settings surface

---

## Implementation Risks and Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Build script swap persists after re-run | Medium | High | Investigate `vite.config.ts` rollup input naming — likely a config issue |
| Base RPC not reachable | Medium | High | Verify network connectivity before testing Base features |
| Icons not designed/created | High | Medium | Create placeholder icons or use a simple generated icon to unblock loading |
| Canton integration scope unclear | Medium | Medium | Confirm whether Canton live integration is a Phase 2 or Phase 3 goal |
| Swap provider not integrated | High | Medium | Swap will remain non-functional — intentional per docs |

### Key Assumptions

1. **Chrome-only target** — manifest uses MV3, no Firefox/Safari cross-browser work assumed
2. **Build pipeline is otherwise functional** — only the HTML script swap appears broken
3. **Icons are the primary blocker** — extension should load once icons are added
4. **Canton is intentionally stubbed** — not a bug but a documented design decision
5. **User is loading from wrong directory** — "manifest dosyan yok" is a user error, not a missing file

---

## Ordered Implementation Phases

```
Phase 0: Diagnosis & Verification (1 pass)
  └── Re-run build, inspect dist/, attempt load in Chrome

Phase 1: Extension Loads (Icon Fix + Manifest Update)
  ├── 1.1 Create public/assets/ + icon PNG files
  ├── 1.2 Add icons field to manifest
  ├── 1.3 Fix script swap (if persistent)
  └── 1.4 Add CSP to manifest

Phase 2: Extension Actually Works (Functional Verification)
  ├── 2.1 Verify Base network connectivity
  ├── 2.2 Test vault create/import/unlock flow
  ├── 2.3 Canton boundary review (confirm intent)
  └── 2.4 Swap integration planning

Phase 3: Production-Ready
  ├── 3.1 Add _locales/ folder
  ├── 3.2 Toolbar action icons
  ├── 3.3 host_permissions audit
  ├── 3.4 Full CSP audit
  ├── 3.5 Security review
  └── 3.6 Store submission prep
```

---

*Recovery plan based on direct repository inspection. Phase 0 (diagnostic build) must be executed before committing to Phase 1 implementation.*
