# Canton Research

Date: 2026-03-21

## Executive Position

The most correct Canton wallet architecture for Jutis is not a browser-first mnemonic wallet pretending that Canton is EVM. It is a layered wallet product that:

- keeps local wallet UX and secure session handling in the extension
- models Canton identity as a party-centric capability, not an address-centric account
- reads public and reference network data through Scan APIs
- resolves user and party relationships through Validator APIs when validator-hosted flows are used
- uses Ledger API and token-standard-compatible transaction preparation for party-private state and submissions
- keeps unsupported or topology-dependent steps behind explicit adapters

## Local Repository Findings

### `canton-mcp`

The local `canton-mcp` repository is a builder base, not a runnable app. Relevant findings:

- `AGENTS.md` and `APP_GENERATION_GUIDE.md` explicitly position `wallet-adapter`, `party-identity`, `token-standard`, `swap-engine`, `validator-client`, and `scan-client` as the important building blocks.
- `docs/canton-ecosystem-map.md` cleanly splits protocol/runtime, contract, integration, and product layers.
- `docs/ecosystem-supplement-validator-scan.md` clarifies the intended split:
  - Validator API for identity and party mapping
  - Scan API for transaction history and registry-style data
  - Ledger or wallet for holdings and direct state
- `recipes/real-ledger-submission.md` is explicit that real holdings, transfers, and swap settlement require JSON Ledger API v2 wiring.
- `recipes/wallet-app.md`, `token-app.md`, and `swap-app.md` show the expected boundary between wallet session, holdings, balances, and swap orchestration.

### `canton-mvp`

The local `canton-mvp` repository adds concrete product patterns:

- `docs/wallet-layer.md` defines a provider-agnostic wallet interface with `connect`, `getSession`, `prepareTransaction`, `requestSigning`, and `getHoldings`.
- `docs/identity-and-party-model.md` separates app users from Canton parties and supports validator-based, wallet-based, and manual allocation sources.
- `docs/token-standard-abstraction.md` models token holdings via `instrumentId`, `amount`, and optional `contractId`, with multi-leg settlement helpers.
- `docs/network-adapters.md` recommends normalized DTOs for `scan-client` and `validator-client`.
- `docs/stubs-and-boundaries.md` states that real ledger submission and real wallet adapters are not production-wired in the reference base.

## External Protocol Findings

### What to use for a wallet of our own

The current Splice/Canton documentation says a custom wallet should build on the Canton Network Token Standard APIs, not on the internal Splice wallet internals:

- Validator API docs mark internal wallet endpoints as not intended for third-party wallet builders and recommend the token standard instead.
- Legacy wallet transfer offers are deprecated in favor of token-standard workflows.

### Read-path split

The current official app development overview makes the split explicit:

- Ledger API is for the ledger view of parties hosted on a validator and for command submission.
- Scan APIs are for the SV/DSO-visible view of the network, infrastructure, and reference data.
- Validator APIs are for higher-level validator-hosted user and wallet workflows.

### Scan API scope

Official Scan docs state:

- Scan stores update history, ACS snapshots, and reference data.
- It only observes subtransactions visible to the DSO party.
- This includes Canton Coin transfers and governance operations.
- It excludes most private application state not involving that party.

This matters for Jutis: Scan is useful for CC and network reference data, but cannot be treated as a universal private-wallet history source.

### Name service

Current documentation exposes an ANS API on validator nodes and ANS-related aggregate lookup through Scan. That is enough to justify a future `NameResolutionService`, but not enough to claim universal human-name resolution is already wired in Jutis v1.

## Answers To The Required Research Questions

## 1. What is the most correct wallet architecture for Canton?

The correct architecture is party-centric and adapter-driven:

- local extension vault for user-authenticated session state
- `CantonWalletAdapter` for user-visible wallet flows
- `CantonIdentityService` for app user to party linkage
- `CantonReferenceDataService` for Scan-based topology, registry, and public CC data
- `CantonTransferService` for transfer preparation and execution orchestration
- `CantonActivityIndexer` for merged local journal plus scan-backed visible activity
- `CantonSwapAdapter` for token-standard allocation and DvP-style swap orchestration

The extension should not invent a local Canton address format or derive Canton identity from the Base mnemonic. Canton identity must be attached through a real party mapping or validator-hosted/external-signing flow.

## 2. Which parts are user wallet UX, participant/ledger integration, and validator/scan/reference data?

### User wallet UX

- onboarding copy and security acknowledgements
- party linking or wallet-session linking
- portfolio, balances, receive instructions, send confirmation
- local pending state, error recovery, session lock/unlock

### Participant or ledger integration

- holdings queries for party-private state
- token-standard transfer preparation
- command submission
- settlement submission for swaps
- confirmation polling for submitted transactions

### Validator/scan/reference data

- validator-hosted user to primary party resolution
- external-party or wallet attachment flows
- scan topology and synchronizer discovery
- DSO-visible CC and governance activity
- ANS and public aggregate lookups
- traffic and network reference data

## 3. How should CC balances, holdings, transfers, and transaction history be modeled?

### Holdings

Holdings should be modeled as token-standard style records:

- `instrumentId`
- `amount`
- `contractId`
- `ownerPartyId`
- optional lock/preapproval metadata

### Balances

Balances are an aggregation over holdings per instrument, with CC highlighted as the canonical Canton asset.

### Transfers

Transfers should be modeled as intents plus execution lifecycle:

- sender party
- recipient party
- instrument
- amount
- optional reference id
- status through preparation, signing, submission, pending, confirmed, failed

### Activity history

Activity should be modeled as a merged journal:

- local transaction journal for commands initiated by Jutis
- scan-visible CC and governance history when available
- optional validator-hosted wallet activity when topology supports it

## 4. What is the correct approach for transfer flow today?

Current documentation indicates:

- do not build on deprecated Splice transfer offers for new wallet flows
- use Canton Network Token Standard flows
- use Ledger API for actual command submission
- use external signing / transfer preapproval patterns where the deployment requires external signing

Therefore Jutis should model transfer as:

1. resolve sender party and capabilities
2. inspect holdings and required instrument
3. build token-standard transfer or allocation command
4. request signing or approval from the active Canton signer boundary
5. submit through ledger integration
6. track status locally and enrich with scan data where possible

## 5. What data can be read via scan/reference/indexed endpoints versus direct participant/ledger calls?

### Best candidates for Scan

- CC-related visible activity
- synchronizer and scan topology
- validator and sequencer metadata
- party hosting participant lookup
- ANS and aggregate summaries
- traffic and selected reference data

### Must use participant or ledger

- party-private holdings
- private custom token activity
- direct command submission
- final settlement execution
- anything requiring the full private party view

## 6. What swap model is feasible now?

A product-feasible model today is:

- quote and route modeling in Jutis
- token-standard allocation or DvP-compatible settlement modeling for Canton legs
- explicit state machine up to `settlement_ready`
- real ledger settlement only when the deployment provides the necessary token-standard contracts, signer boundary, and ledger endpoint

The local `canton-mvp` and `canton-mcp` material is explicit that settlement wiring is often the incomplete step. Jutis should therefore implement the full swap domain and UX honestly, while marking execution support by route and topology.

## 7. What parts need adapters for later real integration?

- `CantonWalletAdapter`
- `CantonTransferService`
- `CantonActivityIndexer`
- `CantonReferenceDataService`
- `CantonSwapAdapter`
- `NameResolutionService`

These adapters should expose capability flags so the UI can say exactly which parts are live:

- party-linked
- scan-readable
- transfer-ready
- swap-quote-ready
- swap-settlement-ready

## 8. Is there a naming, username, or address-book style protocol or service?

Yes, there is enough evidence for a future-facing naming layer:

- Validator APIs expose ANS APIs.
- Scan aggregates can look up Amulet Name Service records.

What is not justified yet:

- claiming Jutis can already resolve every recipient via ANS in v1
- assuming universal wallet-level username support across all Canton deployments

Jutis should therefore ship a future-ready `NameResolutionService` interface and a disabled UI hook for `@name`-style lookup when no ANS endpoint is configured.

## Product Implications For Jutis

1. Canton onboarding must be an identity-linking flow, not just seed creation.
2. Base and Canton must share wallet UX patterns but not shared account semantics.
3. Canton receive screens should show party-based instructions and topology notes where relevant.
4. Activity must disclose whether an item comes from local submission, scan visibility, or imported history.
5. CC should be treated as a first-class asset with room for traffic/reference context.

## Source Notes

Local sources:

- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\AGENTS.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\docs\canton-ecosystem-map.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\docs\ecosystem-supplement-validator-scan.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\recipes\wallet-app.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\recipes\token-app.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\recipes\swap-app.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mcp\recipes\real-ledger-submission.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mvp\docs\wallet-layer.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mvp\docs\identity-and-party-model.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mvp\docs\token-standard-abstraction.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mvp\docs\network-adapters.md`
- `C:\Users\Nida Bil\Desktop\canton-github\canton-mvp\docs\stubs-and-boundaries.md`

External sources:

- [Splice app development overview](https://docs.sync.global/app_dev/overview/index.html)
- [Splice HTTP APIs overview](https://docs.sync.global/app_dev/overview/splice_app_apis.html)
- [Validator APIs](https://docs.sync.global/app_dev/validator_api/index.html)
- [Scan APIs overview](https://docs.sync.global/app_dev/scan_api/index.html)
- [Scan bulk data API](https://docs.sync.global/app_dev/scan_api/scan_bulk_data_api.html)
- [Scan aggregates API](https://docs.sync.global/app_dev/scan_api/scan_aggregates_api.html)
- [xReserve USDC on Canton overview](https://docs.digitalasset.com/usdc/xreserve/overview.html)
- [Canton quickstart project structure](https://docs.digitalasset.com/build/3.5/quickstart/configure/project-structure-overview.html)
