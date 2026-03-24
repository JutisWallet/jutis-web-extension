# Security Model

Date: 2026-03-21

## Security Goal

Jutis is a wallet extension. The minimum acceptable model is:

- encrypted secrets at rest
- short-lived unlocked session state
- explicit dangerous-action confirmations
- clean separation between local secret custody and network adapters

## Secret Storage Strategy

Jutis stores secret material only as encrypted vault payloads:

- vault payload is encrypted with AES-GCM
- encryption key is derived from the user password with PBKDF2 through Web Crypto
- random salt and IV are stored alongside ciphertext
- plaintext secret material never persists to extension storage

Stored secret material may include:

- Base mnemonic
- imported Base private key
- non-secret Canton linkage metadata

It must not include:

- raw password
- decrypted mnemonic
- session plaintext cached in persistent storage

Unlocked session plaintext is handled separately from the encrypted vault and is documented in:

- [docs/session-security-review.md](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\docs\session-security-review.md)

## Session Handling

Unlocked state is centrally managed through extension session storage and background runtime enforcement:

- `chrome.storage.session` stores the active unlocked session record
- popup and options UI keep only a session snapshot, not the decrypted secret
- background message handling is the canonical path for privileged wallet actions
- expiry is driven by stored session timestamps plus a real background alarm deadline

When the timer expires:

- unlocked session state is cleared from `chrome.storage.session`
- pending approval state remains, but requires unlock before execution continues

## Auto-Lock

Recommended default:

- 15 minutes

Supported behaviors:

- manual lock from settings
- alarm-based auto-lock
- lock on browser restart as an explicit fresh-authentication boundary
- popup reopen within the same browser session is supported until expiry

## Clipboard and Display Safety

Rules:

- copy actions should be explicit user gestures
- secrets are never auto-copied
- receive identifiers may be copied
- export or reveal actions should require a secondary confirmation

## Input Validation

### Base

- checksum or normalizable EVM address validation
- numeric amount validation
- fee and balance sufficiency checks

### Canton

- party id or future name resolution validation
- capability checks before execution
- no silent fallback to fake address translation

## Confirmation Surfaces

Sensitive actions requiring explicit confirmation:

- send
- swap
- export secret
- import replacement
- adding custom RPC network

Every confirmation surface should show:

- active network
- amount and asset
- destination
- fee or execution cost
- warnings if data is partial or provider-dependent

## Logging Policy

Allowed:

- non-sensitive network ids
- feature flags
- error codes
- anonymized adapter failures

Forbidden:

- mnemonic phrases
- private keys
- raw decrypted vault payloads
- JWTs and auth headers
- transaction payloads that contain secrets

## Extension Hardening

Required baseline:

- Manifest V3
- service-worker background process
- no remote script execution
- narrowly scoped permissions by default
- optional host permission expansion for future custom networks

## Mock And Partial Boundaries

Security honesty matters. The codebase must clearly distinguish:

- real local encryption and lock logic
- real Base key custody
- partial or mock Canton connectivity

No mocked Canton flow may be mislabeled as secured ledger execution.

## Production Follow-Ups

Before production launch:

1. replace PBKDF2 defaults with audited, benchmarked parameters for target hardware
2. add hardware-backed or OS-integrated secret protection where feasible
3. add independent security review
4. implement per-site permission prompts for injected provider flows
5. constrain custom network host permissions behind explicit user approval
