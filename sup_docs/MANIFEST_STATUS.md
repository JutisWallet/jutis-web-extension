# Jutis Extension — Manifest Status

## Manifest Location

A `manifest.json` file **exists** in two locations:

| Location | Status |
|---|---|
| `public/manifest.json` | Exists — static source file, copied to dist during build |
| `dist/manifest.json` | Exists — build output, identical to public version |

Both files are identical and contain a valid Manifest V3 declaration.

---

## "Manifest Dosyan Yok" Error Explanation

The Turkish error **"manifest dosyan yok"** means "manifest file is missing."

This error almost certainly occurs because the extension is being loaded from the **wrong directory**. Users must load the extension from `dist/` (the build output directory), not from the project root, `src/`, or `public/`.

**Correct load path**: Chrome Developer Mode → "Load unpacked" → select the `dist/` folder

**Why the confusion arises**:
- The source `manifest.json` lives in `public/` which is not a standard extension load target
- Many developers expect to load directly from `src/` but Chrome requires a `manifest.json` at the load root
- The `public/` folder is a Vite `publicDir` convention for static assets, not the extension entry point

---

## Current Manifest Contents

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

---

## Field-by-Field Analysis

### ✅ Present and Correct

| Field | Value | Notes |
|---|---|---|
| `manifest_version` | `3` | MV3 — current standard |
| `name` | `"Jutis Wallet"` | Valid extension name |
| `version` | `"0.1.0"` | Semantic version |
| `action.default_title` | `"Jutis"` | Toolbar tooltip |
| `action.default_popup` | `"popup.html"` | Popup entry — file exists in dist |
| `options_page` | `"options.html"` | Options entry — file exists in dist |
| `background.service_worker` | `"assets/background.js"` | File exists in dist |
| `background.type` | `"module"` | Correct for ESM service worker |
| `permissions` | `["alarms", "clipboardWrite", "storage"]` | Minimal, appropriate |
| `host_permissions` | `["https://mainnet.base.org/*"]` | Base RPC access |

### ❌ Missing (Required for Production)

| Field | Severity | Impact |
|---|---|---|
| `icons` | **P0** | Extension has no icon — fails to display in browser toolbar. Chrome requires at least one icon to show in extensions list |
| `action.default_icon` | **P2** | Toolbar button renders with no icon image |
| `content_security_policy` | **P2** | MV3 best practice; missing may cause runtime CSP violations |

### ⚠️ Potentially Insufficient

| Field | Concern |
|---|---|
| `host_permissions` | `https://mainnet.base.org/*` — may not cover all needed URLs. Block explorers and subdomains may be blocked |

---

## Minimum Manifest Fields Required for MV3

A **minimum viable MV3 manifest** requires:

```json
{
  "manifest_version": 3,
  "name": "...",
  "version": "...",
  "action": {
    "default_popup": "popup.html"  // OR default_icon for toolbar
  },
  "background": {
    "service_worker": "..."
  }
}
```

**Jutis meets the structural minimum** — it has `action.default_popup` and a background service worker. However, without `icons`, the extension will not display a usable toolbar icon.

---

## Full MV3 Manifest Comparison

| MV3 Field | Jutis Has | Jutis Value | Status |
|---|---|---|---|
| `manifest_version` | ✅ | `3` | OK |
| `name` | ✅ | `"Jutis Wallet"` | OK |
| `version` | ✅ | `"0.1.0"` | OK |
| `description` | ✅ | `"A protocol-aware extension..."` | OK |
| `action.default_popup` | ✅ | `"popup.html"` | OK |
| `action.default_title` | ✅ | `"Jutis"` | OK |
| `action.default_icon` | ❌ | — | **Missing** |
| `options_page` | ✅ | `"options.html"` | OK |
| `background.service_worker` | ✅ | `"assets/background.js"` | OK |
| `background.type` | ✅ | `"module"` | OK |
| `permissions` | ✅ | 3 perms | OK |
| `host_permissions` | ✅ | Base only | OK |
| `icons` | ❌ | — | **Missing** |
| `content_security_policy` | ❌ | — | **Missing** |
| `web_accessible_resources` | ❌ | — | Not needed currently |
| `content_scripts` | ❌ | — | Not part of this extension |
| `sidepanel` | ❌ | — | Not part of this extension |
| `_locales` | ❌ | — | English only |

---

## Icon Requirements

**Chrome requires icon files in one of these forms**:

1. **In manifest `icons` field** (recommended approach):
   ```json
   "icons": {
     "16": "assets/icon-16.png",
     "48": "assets/icon-48.png",
     "128": "assets/icon-128.png"
   }
   ```

2. **Named as toolbar icons** (action.default_icon):
   ```json
   "action": {
     "default_icon": {
       "16": "assets/action-icon-16.png",
       "32": "assets/action-icon-32.png"
     }
   }
   ```

**Current state**: No icons exist anywhere in the project. The `public/assets/` directory does not exist. There is no icon field in the manifest.

**Icon design source**: The `designed_source/carbon_main_wallet_*/screen.png` files and `docs/design-audit.md` contain the UI design reference. A branded Jutis icon (lime accent on dark graphite, matching the wallet's visual identity) should be created from these references.

**Formats needed**: PNG, 16×16, 48×48, 128×128 (minimum for Chrome Web Store compliance)

---

## Manifest Not Generated Dynamically

The manifest is **not** generated by the build tool. Evidence:

1. `vite.config.ts` rollup configuration only handles JavaScript/HTML input/output — no manifest generation
2. `public/manifest.json` is a static file read directly
3. Vite's `publicDir: "public"` copy only passes through the file as-is
4. No plugin like `vite-plugin-extension-manifest` is present in `package.json` or `vite.config.ts`

The manifest is static and must be edited manually to add missing fields.

---

## Next Steps for Manifest

1. **P0**: Add `icons` field with at least one icon PNG file in `public/assets/`
2. **P1**: Add `content_security_policy` to prevent CSP violations
3. **P2**: Add `action.default_icon` for the toolbar button
4. **P2**: Consider broader `host_permissions` if needed for block explorer URLs
5. **P3**: Add `_locales/` folder for i18n (required for Chrome Web Store)

---

*Manifest file read directly from `public/manifest.json` and `dist/manifest.json` — both verified identical.*
