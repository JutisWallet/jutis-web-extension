# Product Baseline

Date: 2026-03-21

## What A Modern Wallet Extension Must Cover

Jutis should be judged against current wallet-extension expectations, not against a single protocol demo.

## Onboarding

Required baseline:

- clear create/import split
- explicit secret-handling warnings
- password creation with confirmation
- recovery phrase acknowledgment
- deterministic first account creation
- network defaults visible from the start

Jutis response:

- create and import are first-class onboarding flows
- Base account can be created locally
- Canton identity is attached honestly instead of silently invented

## Security

Required baseline:

- encrypted local secrets
- auto-lock
- unlock session expiry
- guarded export/import
- low-leak logging
- clear transaction confirmation language

Jutis response:

- Web Crypto based encrypted vault
- session lock service
- explicit dangerous-action warnings
- no plaintext secrets in extension storage

## Permission Prompts

Required baseline:

- a wallet should not perform privileged actions silently
- future dapp connectivity requires site-scoped approvals

Jutis response:

- transaction approvals are modeled explicitly
- dapp-site permissions are left as a future provider-injection phase, not silently implied

## Transaction Confirmation

Required baseline:

- amount
- asset
- destination
- network
- fee
- status feedback

Jutis response:

- send and swap both use explicit review states
- Canton review copy can explain capability limitations when routes are not execution-ready

## Activity UI

Required baseline:

- pending, confirmed, failed visibility
- recent list
- detail drill-down
- explorer links where valid

Jutis response:

- unified cross-network activity list
- provenance-aware entries
- detail overlays

## Network UX

Required baseline:

- obvious active network
- safe switching
- built-in trusted defaults
- controlled custom-network management

Jutis response:

- Canton and Base ship as built-in defaults
- custom network support is reserved for EVM-safe additions later
- Canton is never treated as an EVM custom network

## Token Management

Required baseline:

- default trusted assets
- visibility toggles
- manual import
- protection against spam assets

Jutis response:

- curated Base defaults
- CC-first Canton presentation
- token visibility state

## Swap UX

Required baseline:

- quote results
- route comparison
- slippage controls
- fees
- approval states
- execution tracking

Jutis response:

- quote and route domain modeled as core product surface
- Base uses pluggable provider architecture
- Canton shows truthful execution support per route

## Failure States

Required baseline:

- RPC unavailable
- bad recipient
- insufficient funds
- rejected signature
- stalled pending tx

Jutis response:

- typed adapter errors
- network and capability badges
- empty, loading, and partial-data states in the UI

## Phishing and Spoofing Resistance

Required baseline:

- destination and network are obvious in approval surfaces
- arbitrary token imports are not over-trusted
- external integrations show trust state

Jutis response:

- strong confirmation hierarchy
- built-in asset verification flags
- future ecosystem cards modeled after trusted-card patterns from the design source

## Extension Performance Constraints

Required baseline:

- popup must render quickly
- state rehydration must be minimal
- long-running work belongs outside heavy React trees

Jutis response:

- adapter reads flow through services
- popup UI uses concise state slices
- background service worker owns lock alarms and long-lived orchestration hooks

## Conclusion

A serious browser wallet is not just a token list. It is a security product, a network orchestration product, and an approval UX product. Jutis needs all three lenses simultaneously, especially because Canton and Base have materially different trust and identity models.
