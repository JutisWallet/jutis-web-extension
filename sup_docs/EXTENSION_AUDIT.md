# Jutis Extension — Full Extension Audit

## Executive Summary

**Jutis Wallet** is a Manifest V3 browser extension wallet supporting Canton Network and Base Network. The codebase is React + TypeScript with a Vite build pipeline. A `dist/` build exists and appears functional, but there are critical issues that would prevent the extension from loading cleanly in a browser's developer mode.

The most urgent finding: **the browser reports "manifest dosyan yok" (manifest file missing)**, yet `public/manifest.json` and `dist/manifest.json` both exist. This discrepancy strongly suggests the user is attempting to load from the wrong directory (root or `src/`) rather than from the `dist/` output folder. The build artifacts in `dist/` are also affected by **swapped script references** in the HTML entry points.

---

## Current Repo Structure Summary

```
web-extension-jutis/
├── public/                     # Static assets + manifest source
│   ├── manifest.json           # MV3 manifest (exists, incomplete)
│   └── assets/                 # EMPTY — no icon files present
├── src/
│   ├── app/
│   │   ├── popup/             # Popup UI entry
│   │   ├── options/           # Options/settings UI entry
│   │   ├── background/        # Service worker entry
│   │   └── shared/            # Runtime dispatcher, controller, runtime-client
│   ├── ui/components/          # Shared UI kit (kit.tsx)
│   ├── ui/styles/             # global.css
│   ├── core/                   # Vault, network registry, session, errors, models, orchestration
│   ├── adapters/
│   │   ├── base/              # Base EVM wallet adapter
│   │   └── canton/            # Canton wallet adapter
│   ├── swap/                  # Swap state machine, quote engine, provider registry
│   ├── storage/               # Extension storage, vault repository
│   ├── security/              # Crypto utilities
│   └── state/                 # Zustand store
├── dist/                      # Build output (exists, functional structure)
│   ├── manifest.json
│   ├── popup.html             # References /assets/options.js (WRONG — see notes)
│   ├── options.html           # References /assets/popup.js (WRONG — see notes)
│   └── assets/
│       ├── background.js
│       ├── popup.js
│       ├── options.js
│       ├── controller.js
│       ├── global.js
│       ├── global.css
│       └── runtime-dispatcher.js
├── docs/                      # Architecture and research docs
├── tests/                     # Vitest unit tests
├── popup.html                 # Dev source entry (correct: popup.js)
├── options.html               # Dev source entry (correct: options.js)
├── index.html                 # Dev root entry (points to popup)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

---

## Detected Extension Type

**Popup-centric wallet extension** with background service worker.

- **Popup UI** (`popup.html`): Full wallet surface — home, activity, swap, settings screens; send/receive overlays
- **Options UI** (`options.html`): Split-pane management/workspace surface for settings and network overview
- **Background service worker** (`src/app/background/index.ts`): Handles alarms, auto-lock, message routing, background reconciliation
- **No content scripts** defined
- **No side panel** defined
- **No devtools page** defined
- **No offscreen documents** defined

Architecture is a hybrid:
- React UI surfaces (popup + options) communicate with the background service worker via `chrome.runtime.sendMessage`
- Background worker owns all business logic (vault, adapters, swap engine) via `JutisController`
- Popup and options pages are pure React UI; they delegate all operations through the message dispatcher

---

## Detected Stack / Tooling

| Concern | Technology |
|---|---|
| UI framework | React 19.1 + TypeScript 5.8 |
| State management | Zustand 5.0 |
| Build tool | Vite 6.3.5 |
| Bundler | Rollup (via Vite) |
| Crypto | ethers 6.15 |
| QR rendering | qrcode.react 4.2 |
| Linting | ESLint 9 + typescript-eslint |
| Testing | Vitest 2.1 |
| Extension types | chrome-types 0.1 |
| Path alias | `@/*` → `src/*` |
| Module type | ESM (`"type": "module"`) |

---

## Existing Extension-Related Components

### Core Files (Source)

| File | Purpose | Status |
|---|---|---|
| `public/manifest.json` | MV3 extension manifest | Exists, incomplete (no icons) |
| `src/app/background/index.ts` | Service worker entry | Exists, functional |
| `src/app/popup/main.tsx` | Popup React entry | Exists |
| `src/app/popup/App.tsx` | Popup root component | Exists (1131 lines) |
| `src/app/options/main.tsx` | Options React entry | Exists |
| `src/app/options/App.tsx` | Options root component | Exists (208 lines) |
| `src/app/shared/runtime-dispatcher.ts` | Background-side message handler | Exists |
| `src/app/shared/runtime-client.ts` | Popup-side message sender | Exists |
| `src/app/shared/controller.ts` | JutisController export | Exists |
| `src/core/orchestration/jutis-controller.ts` | Main orchestrator | Exists |
| `src/state/use-jutis-store.ts` | Zustand store | Exists |
| `src/storage/extension-storage.ts` | Extension storage wrapper | Exists |
| `src/storage/vault-repository.ts` | Vault persistence | Exists |
| `src/security/crypto.ts` | Crypto utilities | Exists |
| `src/core/services/vault-service.ts` | Vault creation/unlock | Exists |
| `src/core/services/session-service.ts` | Session management | Exists |
| `src/adapters/base/` | Base wallet adapter + services | Exists |
| `src/adapters/canton/` | Canton wallet adapter + services | Exists |
| `src/swap/` | Swap engine, registry, quote engine | Exists |
| `src/ui/components/kit.tsx` | Shared UI components | Exists |
| `src/ui/styles/global.css` | Global styles | Exists |

### Build Output (`dist/`)

All expected output files exist:
- `dist/manifest.json`
- `dist/popup.html`, `dist/options.html`
- `dist/assets/background.js`, `popup.js`, `options.js`, `controller.js`, `global.js`, `global.css`, `runtime-dispatcher.js`

---

## Missing Critical Files

### P0 — Loading Blockers

1. **Extension icons are entirely absent**
   - `manifest.json` declares no `icons` field at all
   - `public/assets/` directory is empty (does not even exist as a directory — `public/assets/` path not found)
   - No `icon-16.png`, `icon-48.png`, `icon-128.png` or equivalent
   - Browser extensions **require at least one icon** to display in the browser toolbar

2. **`public/assets/` directory does not exist**
   - The `publicDir: "public"` in `vite.config.ts` points to this folder
   - No icon files are present to be copied to dist output
   - This is a build-system gap — icons need to be created or the manifest needs to drop icon references

### P1 — Functional Blockers

3. **`dist/popup.html` references the wrong JavaScript bundle**
   - Source `popup.html` correctly references `/src/app/popup/main.tsx` (dev)
   - But `dist/popup.html` contains `<script type="module" crossorigin src="/assets/options.js">` — it loads `options.js` instead of `popup.js`
   - `dist/options.html` has the reverse problem: `<script type="module" crossorigin src="/assets/popup.js">` instead of `options.js`
   - The popup UI would render using the options bundle; options UI would render using the popup bundle

4. **Manifest `host_permissions` is likely insufficient for Base RPC**
   - `"host_permissions": ["https://mainnet.base.org/*"]`
   - While this covers the RPC endpoint, actual wallet operations may need `https://mainnet.base.org` (without trailing `/*`) and potentially other URLs for block explorers

### P2 — Secondary Issues

5. **No `_locales/` internationalization folder**
   - Extension has no i18n support declared
   - `manifest.json` has no `default_locale` field
   - Not a loading blocker, but limits publishability to the Chrome Web Store

6. **`index.html` at root is not extension-valid**
   - Points to `/src/app/popup/main.tsx` for Vite dev only
   - Should not be loaded as an extension page

7. **No `web_accessible_resources` declared**
   - No resources are exposed to web pages
   - If the extension later needs to inject content or expose APIs to websites, this will need to be added

8. **No `content_security_policy` in manifest**
   - MV3 requires a CSP; current manifest omits it
   - May cause CSP violations at runtime depending on what resources are loaded

9. **No `action` icons defined**
   - `manifest.json` has `action.default_title` but no `action.default_icon`
   - The toolbar icon button would render with no image

---

## Broken References / Unresolved Imports

### Build-Output HTML Script Swap (Critical)
- `dist/popup.html` → `/assets/options.js` (should be `/assets/popup.js`)
- `dist/options.html` → `/assets/popup.js` (should be `/assets/options.js`)

This is evidenced by reading the actual file contents. The source HTML files (`popup.html`, `options.html` at root) are correct — the swap happens during or after the build.

**Unclear cause**: The `vite.config.ts` rollup configuration correctly names the entries `popup` and `options`, and rollup should output the correct names. The swap may be a one-time build artifact error, or there may be an undetected naming issue in the rollup config.

---

## Manifest Status

**Location**: `public/manifest.json` and `dist/manifest.json` (both exist and are identical)

**Version**: Manifest V3

**Current contents**:
```json
{
  "manifest_version": 3,
  "name": "Jutis Wallet",
  "version": "0.1.0",
  "description": "A protocol-aware extension wallet for Canton and Base.",
  "action": {
    "default_title": "Jutis",
    "default_popup": "popup.html"
  },
  "options_page": "options.html",
  "background": {
    "service_worker": "assets/background.js",
    "type": "module"
  },
  "permissions": ["alarms", "clipboardWrite", "storage"],
  "host_permissions": ["https://mainnet.base.org/*"]
}
```

**Missing from manifest**:
- `icons` field (P0)
- `action.default_icon` (P2)
- `content_security_policy` (P2)
- `manifest_version` is correctly declared as `3`

**Note**: The browser error "manifest dosyan yok" (manifest file missing) strongly suggests the user is attempting to load the extension from the project root or `src/` directory, not from `dist/`. The `dist/` folder does contain a valid `manifest.json`.

---

## Build Status Guess

**Build command**: `npm run build` → `tsc --noEmit && vite build`

**Build result**: Likely successful (all artifacts present in `dist/`)

**Known build artifact issue**: `dist/popup.html` and `dist/options.html` have swapped script references

**Build pipeline trace**:
1. Vite processes `popup.html` and `options.html` from project root
2. Rollup bundles `src/app/popup/main.tsx` → `dist/assets/popup.js`
3. Rollup bundles `src/app/options/main.tsx` → `dist/assets/options.js`
4. Rollup bundles `src/app/background/index.ts` → `dist/assets/background.js`
5. Vite copies `public/` contents (including `manifest.json`) to `dist/`
6. Vite copies HTML files to `dist/`

**Result**: The `dist/` folder should be loadable in Chrome's developer mode if the user points to `dist/` as the extension directory.

---

## Runtime Status Guess

### Would load if `dist/` is used correctly
- Background service worker initializes with alarm listeners and message handler
- Popup and options pages render React UI
- Zustand store bootstraps via `chrome.runtime.sendMessage` to background

### Likely runtime failures
1. **Toolbar icon missing** — extension installs but shows no icon in browser toolbar (or a broken icon placeholder)
2. **Script swap bug** — if `dist/popup.html` truly loads `options.js`, the popup would fail to render the wallet UI correctly (or vice versa)
3. **Base RPC unreachable** — Canton is reference-only by design; Base network integration would fail without a reachable `https://mainnet.base.org` RPC

### Known partial/mocked features (by design)
- Canton balances and activity: reference-only or partial
- Canton send: planning-only
- Canton swap: unsupported
- Base swap: intentionally disabled until live provider integrated
- USD pricing: demo/reference values, not live market data

---

## Security / Privacy Observations

1. **Vault encryption** — `vault-service.ts` uses password-based encryption; secret is kept in extension session storage, not localStorage
2. **Auto-lock via alarms** — session expires based on `autoLockMinutes` preference; enforced by `chrome.alarms`
3. **No external network calls from background** — Canton is reference-only; Base RPC calls are limited to declared host permission
4. **No content scripts that inject into pages** — reduces attack surface vs. inject-script extensions
5. **Clipboard write permission** — used only for copy-address functionality in popup UI
6. **No telemetry or analytics** — codebase contains no external reporting calls

---

## What Is Needed to Load in Browser Developer Mode

**Minimum (P0)**:
1. Add extension icon files (at minimum one 48x48 or larger PNG) to `public/` or `public/assets/`
2. Add `icons` field to `manifest.json` pointing to those icon files
3. Verify `dist/` is the directory loaded in Chrome developer mode (not root or `src/`)
4. Fix swapped script references in `dist/popup.html` and `dist/options.html` (or rebuild to correct)

**Result after P0 fixes**: Extension should load in developer mode with a visible (placeholder or custom) icon.

---

## What Is Needed to Actually Work

1. Fix `dist/` HTML script reference swap (P0 — functional)
2. Add functional Base RPC endpoint verification (P1)
3. Integrate real Canton topology (P1 — for Canton features to be live)
4. Add a live swap provider adapter for Base (P1 — for swap to work)
5. Add USD reference price provider (P2 — for real portfolio valuations)
6. Add Canton ledger/signer integration (P1 — for Canton send to be live)
7. Add proper `content_security_policy` to manifest (P2)
8. Add `_locales/` folder for i18n (P3 — for Chrome Web Store)

---

## Confidence Level Per Section

| Section | Confidence |
|---|---|
| Extension type | High — clear from structure and docs |
| Stack/tooling | High — unambiguous from configs |
| Missing icon files | High — `public/assets/` verified empty/non-existent |
| Script swap in dist/ | High — actual file content read and confirmed |
| Manifest contents | High — file read directly |
| Runtime behavior guesses | Medium — based on code review, not live execution |
| Build status | Medium — artifacts present, but build not run during audit |
| Security observations | Medium — code review only, no penetration testing |

---

*Audit completed based on direct file inspection. No live build or runtime testing performed during this phase.*
