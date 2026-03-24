# Extension Publish And Test Guide

Date: 2026-03-21

## Executive Summary

This document explains how to test, package, and review the Jutis browser extension in its current state.

Current readiness, honestly:

| Stage | Current status | Notes |
|---|---|---|
| Local development | Yes | Suitable for local build, unpacked loading, manual QA, and architecture validation |
| Internal alpha | Partial at best | Only if testers understand that Base is the only narrow real path and Canton is still non-live |
| Public beta | No | Too many security, confirmation, pricing, and infrastructure gaps remain |
| Production | No | Do not market or publish this as a production-ready wallet today |

Important truths before testing or publishing:

- Base is the only network with a real end-to-end wallet path in the current build.
- Base still uses a public RPC and is not hardened enough for real users or meaningful funds.
- Canton is intentionally modeled as protocol-aware but non-live.
- Swap is not a live feature.
- The safest current use is local development and internal review.

## 1. Local Development Testing

### 1.1 Prerequisites

- Windows PowerShell is the documented local shell
- Node.js and npm installed
- Chromium-based browser available
  - Google Chrome
  - Brave
  - Microsoft Edge

### 1.2 Install Dependencies

From the repository root:

```powershell
npm.cmd install
```

### 1.3 Run The Project

There are two useful local modes.

#### UI preview mode

```powershell
npm.cmd run dev
```

Use this when you want fast iteration on popup or options UI.

Important limitation:

- this is not the real extension runtime
- the dev server can fall back to local runtime execution instead of the real Chromium extension message path
- do not treat dev-server behavior as proof that popup, background, alarms, or session behavior are correct

#### Real extension test mode

```powershell
npm.cmd run build
```

This produces the real extension package in `dist/`.

Use unpacked-extension loading from `dist/` for:

- popup testing
- options page testing
- background worker testing
- storage/session behavior
- real Manifest V3 behavior

### 1.4 Load The Unpacked Extension In Chromium

1. Build the extension:

```powershell
npm.cmd run build
```

2. Open the browser extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

3. Enable `Developer mode`.

4. Click `Load unpacked`.

5. Select the repo’s `dist/` folder:

`C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\dist`

6. Pin the extension to the toolbar if needed.

Expected result:

- Jutis loads without manifest errors
- popup opens from the toolbar icon
- options page is available from the extension details page
- service worker appears in the extension details page as an inspectable background worker

### 1.5 Verify Popup, Options, Background Worker, And Storage Behavior

#### Popup

Open the toolbar icon and verify:

- welcome screen renders
- create/import flows render correctly
- lock/unlock transitions work
- home, activity, swap, and settings tabs render
- Canton support badges are visible and honest

To inspect popup DevTools:

- open the popup
- right-click inside the popup and choose `Inspect`

#### Options page

Open from the extension details page or the extension context menu and verify:

- workspace page loads
- Canton capability states are visible
- portfolio summary renders
- no missing-runtime errors occur

#### Background worker

From the extensions page:

- find Jutis
- click `Service worker` or `Inspect views`

Verify:

- no startup errors
- no runtime message errors when popup is used
- alarms are created only when expected

#### Storage behavior

From the service worker console, inspect extension storage:

```javascript
await chrome.storage.local.get()
await chrome.storage.session.get()
```

Expected local keys:

- `jutis:vault`
- `jutis:prefs`
- `jutis:canton-identity`
- `jutis:flags`
- `jutis:activity`
- `jutis:base-transactions`

Expected session key while unlocked:

- `jutis:session`

Verify:

- vault exists after create/import
- session exists while unlocked
- session clears after lock
- session clears after timeout or browser restart

### 1.6 Test Base Wallet Flows Safely

The current built-in Base network is Base mainnet, not a safe isolated testnet.

That means:

- Base receive can be tested safely without funds
- Base send preview can be tested safely without broadcasting
- Base send submission should only be tested with a throwaway wallet and dust-level funds

Recommended safe Base testing posture:

- create a fresh throwaway wallet just for this repo
- fund it with a tiny amount only
- use send preview extensively before any broadcast
- if you test broadcast, send a trivial amount between two throwaway addresses you control
- never use meaningful funds

Safe Base checklist:

- create wallet
- unlock
- confirm a Base address appears
- test receive copy and QR rendering
- test send preview with:
  - valid address
  - invalid address
  - amount too large
  - zero amount
- only after preview validation passes should you test a real broadcast

### 1.7 Test Unsupported Canton Flows Correctly

Do not test Canton as if it were live.

What you should verify:

- Canton home surface shows support-state indicators
- Canton balances read as `reference-only`
- Canton activity reads as `reference-only`
- Canton receive does not show a fake live QR
- Canton send ends in a blocked or disabled live-execution state
- Canton swap reads as unsupported or readiness-only

What you should not assume:

- Canton holdings are live
- Canton activity is live history
- Canton send can settle on a real Canton topology
- Canton swap or CC acquisition is operational

Expected current truth in-product:

- Canton is a protocol-aware reference and planning surface
- not a live operational wallet path

### 1.8 Manual QA Checklist Before Any Release

Run this checklist on an unpacked build from `dist/`.

General:

- load unpacked extension successfully
- popup opens without console errors
- options page opens without console errors
- background worker starts without errors

Onboarding:

- create wallet succeeds
- import invalid mnemonic fails
- import invalid private key fails
- unlock with wrong password fails
- unlock with correct password succeeds

Session:

- manual lock works
- closing popup and reopening preserves unlocked state until timeout
- browser restart forces a fresh lock
- auto-lock timeout actually clears unlocked state

Base:

- receive screen shows a valid address
- QR renders
- copy works
- preview validation catches bad address and bad amounts
- transaction detail updates after a real dust-level test send
- activity state moves from local submission toward chain truth

Canton:

- home/status copy never implies live support
- send screen is planning-only
- receive screen is informational only
- activity detail includes truthfulness messaging
- swap screen reads as unsupported or blocked

Settings:

- auto-lock preference changes persist
- developer mode toggle persists
- reference/demo Canton data toggle persists

Swap:

- Base does not present simulated quotes as live execution
- Canton swap remains clearly unsupported

## 2. Verification Steps Before Release

Run these from the repository root.

### 2.1 Automated Verification

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected outcome:

- all commands pass on the same commit

### 2.2 Manifest Review

Review:

- `public/manifest.json`
- `dist/manifest.json`

Confirm:

- `manifest_version` is `3`
- popup path is `popup.html`
- options path is `options.html`
- service worker path is `assets/background.js`
- permissions are still minimal
- no content script has appeared unexpectedly
- no `web_accessible_resources` are exposed unless deliberately added

### 2.3 Permission Review

Use `docs/extension-runtime-audit.md`.

Confirm:

- `storage` is still required
- `alarms` is still required
- `clipboardWrite` is still justified or explicitly accepted as temporary
- host permissions remain narrow
- no new permissions were added without a documented reason

### 2.4 Bundle Output Check

Inspect `dist/` after build.

Confirm expected artifacts:

- `popup.html`
- `options.html`
- `manifest.json`
- `assets/background.js`
- `assets/popup.js`
- `assets/options.js`

Check for regressions:

- no content script output unexpectedly reappears
- no unused manifest entrypoints are present
- no obviously wrong asset names are referenced by the manifest

### 2.5 Dead-Code And Unused-Surface Review

Review:

- manifest entries
- build outputs
- runtime topology docs

Ask:

- is a new permission present without a live feature?
- is a content script being built or shipped unintentionally?
- is a new runtime chunk actually reachable, or is it dead?
- is any UI surface implying live support for a non-live feature?

### 2.6 Environment And Runtime Configuration Review

Current state:

- there are no environment variables in active use
- Base RPC is hardcoded
- Canton remains non-live

Before release, explicitly review:

- Base RPC origin
- manifest host permissions
- version number in `package.json`
- version number in `public/manifest.json`
- whether release notes match what is actually live

## 3. Unpacked Extension Testing Checklist

Use a fresh `dist/` build and a Chromium-based browser.

### 3.1 Create Wallet

- open popup
- click `Create wallet`
- enter a valid password
- confirm wallet creation succeeds
- verify `jutis:vault` appears in `chrome.storage.local`

Expected:

- vault is created
- session starts
- Base account becomes available

### 3.2 Import Wallet

Test both valid and invalid paths.

Valid path:

- import a known valid mnemonic or private key
- verify unlock succeeds

Invalid path:

- import invalid mnemonic
- import invalid private key

Expected:

- invalid input is rejected
- valid input creates a usable vault

### 3.3 Lock / Unlock

- lock manually
- verify protected actions require unlock again
- unlock with wrong password and confirm failure
- unlock with correct password and confirm success

### 3.4 Base Receive

- switch to Base
- open receive overlay
- verify address renders
- verify QR renders
- test copy

Expected:

- address looks like a real EVM address
- copy writes the address you see

### 3.5 Base Send Preview

Without broadcasting:

- test invalid address
- test zero amount
- test amount above balance
- test a valid small amount

Expected:

- validation errors for invalid cases
- preview generated for valid case
- USD and fee display are clearly not overclaimed if unavailable or estimated

### 3.6 Base Send Submission In A Safe Testing Context

Only do this with a throwaway wallet and dust-level funds.

Suggested flow:

- fund the throwaway wallet lightly
- send a trivial amount to another throwaway address you control
- inspect resulting activity entry

Expected:

- submission creates a local transaction entry
- status progresses through submitted and pending if RPC sees it
- status becomes confirmed or failed based on receipt truth

### 3.7 Activity And Status Checks

Verify:

- Base activity detail shows hash, network, timestamps, and status
- Base lifecycle transitions are visible
- Canton activity entries show truthfulness support-state indicators

### 3.8 Settings Checks

Verify:

- auto-lock value changes persist
- developer mode persists
- reference/demo Canton data toggle persists
- session section reflects lock/unlock timing

### 3.9 Capability Labels For Canton

Verify:

- home screen shows Canton support status
- Canton balances show `reference-only`
- Canton receive shows informational status
- Canton send shows planning-only state
- Canton activity detail shows truthfulness messaging
- options page shows Canton capability matrix-style states

### 3.10 Swap Truthfulness Checks

Verify:

- Base swap does not present simulated quotes as live public support
- Canton swap stays blocked or unsupported
- no quote UI implies executable market integration where none exists

## 4. Pre-Publication Release Checklist

### 4.1 Before Calling It Local Dev

These must be true:

- build passes
- typecheck passes
- lint passes
- tests pass
- unpacked extension loads from `dist/`

This repo meets that bar today.

### 4.2 Before Calling It Alpha

Alpha should mean internal testers can exercise it intentionally, not that it is safe for the public.

These should be true:

- all local-dev criteria are met
- manual QA checklist has been completed on an unpacked build
- unsupported Canton paths are visibly gated
- Base send preview and dust-level send behave correctly
- session and auto-lock behavior have been tested manually
- release notes clearly say what is real and what is not
- testers are instructed to use throwaway wallets only

Current honesty judgment:

- this repo is close to internal alpha-style evaluation only if expectations are tightly controlled
- it is not appropriate for a public alpha claim yet

### 4.3 Before Calling It Beta

Beta should mean a small external audience can use it without being misled.

These should be true:

- all alpha criteria are met
- managed Base RPC is in place
- Base confirmation and reconciliation are reliable
- pricing is live or clearly suppressed when unavailable
- swap remains hidden unless actually live
- extension runtime automation exists
- permission review is complete
- security review has progressed beyond self-audit
- observability and support process exist

Current honesty judgment:

- Jutis does not meet beta readiness today

### 4.4 Before Calling It Production-Ready

These must be true:

- all beta criteria are met
- security hardening and external review are complete
- key management and export/recovery flows are reviewed
- transaction confirmation safety is materially stronger
- manifest and permission posture are fully justified
- incident response and rollback process exist
- dependency, compliance, and privacy disclosures are complete
- only truly live features are marketed as supported
- if Canton is advertised as live, real Canton validator, scan, ledger, and signer topology are integrated

Current honesty judgment:

- Jutis is not production-ready

## 5. How To Publish The Extension

### 5.1 Prepare The Production Build

1. Update version numbers intentionally:
   - `package.json`
   - `public/manifest.json`

2. Run verification:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

3. Review the built manifest in:

`dist/manifest.json`

### 5.2 What Folder Should Be Packaged

Package the contents of `dist/`.

The zip root must contain:

- `manifest.json`
- `popup.html`
- `options.html`
- `assets/...`

Do not zip the entire repository for store submission.

### 5.3 Create The Zip Package

From PowerShell, package the contents of `dist/`:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\jutis-extension-0.1.0.zip -Force
```

After zipping, verify:

- the zip opens cleanly
- `manifest.json` is at the zip root
- the zip contains only release artifacts, not source files

### 5.4 Metadata And Assets Usually Needed For Store Publishing

Typical browser-extension store requirements include:

- extension name
- short description
- long description
- screenshots
- promotional images
- icon set
- support contact
- website or support URL if available
- privacy policy if data handling requires it
- clear explanation of permissions

Current repo warning:

- this repo still needs a careful public-facing description because Canton is not live
- screenshots must not imply live swap or live Canton execution

### 5.5 Security And Privacy Disclosures To Review Before Publishing

Review all of the following before any store submission:

- what wallet data is stored locally
- whether any user data leaves the device
- what host permissions exist and why
- whether telemetry exists
- whether crash/error reporting exists
- whether keys ever leave local custody
- whether pricing and swap claims are honest

Current honesty requirement:

- state clearly that Base is the only narrow real path
- do not imply Canton is fully supported
- do not imply swap is live

### 5.6 Chrome Web Store Publishing At A High Level

High-level flow:

1. Create or use a Chrome Web Store developer account.
2. Open the developer dashboard.
3. Create a new extension item or a new version of an existing item.
4. Upload the zip built from `dist/`.
5. Fill in listing metadata, screenshots, and policy answers.
6. Review permissions and privacy disclosures carefully.
7. Submit for review.
8. Wait for review outcome and address any store feedback.

Do not rely on store review to catch product-truthfulness issues for you. Those must be handled before submission.

### 5.7 Keep Release Notes And Versioning Disciplined

Recommended discipline:

- keep `package.json` version and `public/manifest.json` version in sync
- write release notes per version
- describe only what is actually live
- call out breaking changes
- record permission changes explicitly
- record manifest changes explicitly

Do not write release notes that market:

- live Canton send
- live Canton activity
- live Canton swap
- live Base swap

unless those paths are actually integrated and tested

## 6. Post-Publication Checks

### 6.1 Sanity Test After Publish

After the store version is live:

- install the published build from the store
- open popup
- open options page
- inspect extension details and permissions
- create/import on a throwaway wallet
- verify Base receive still works
- verify Canton still reads as non-live

### 6.2 Crash And Error Observation

Current repo limitation:

- there is no mature observability stack yet

That means post-publication observation is currently manual and support-driven.

Minimum checks:

- watch browser console and service worker errors
- monitor user-reported failures
- track whether unlock, send preview, or activity regressions are reported

### 6.3 Permission Regression Checks

After publish, re-check:

- no unexpected new permissions
- no widened host permissions
- no reintroduced content script
- no new runtime surface that lacks audit coverage

### 6.4 Rollback And Update Discipline

Recommended discipline:

- keep previous release zip artifacts archived
- keep per-version release notes archived
- if a release regresses runtime or permissions, stop promotion and prepare a patched version immediately
- do not bundle unrelated risky changes into emergency updates

## Final Guidance

Treat the current repo as:

- suitable for local development
- suitable for unpacked testing
- possibly suitable for tightly controlled internal evaluation

Do not treat it as:

- public beta-ready
- production-ready
- safe for meaningful funds

That is the correct release and testing posture for Jutis today.
