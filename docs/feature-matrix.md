# Feature Matrix

Date: 2026-03-21

Support-state vocabulary for product-facing Canton surfaces:

- `live`
- `partial`
- `reference-only`
- `unsupported`

Use `docs/canton-capability-matrix.md` as the source of truth for the precise Canton support state. This broader matrix still mixes product status and delivery status.

| Feature | Canton status | Base status | Real / partial / mocked | Implementation note | Next step |
|---|---|---|---|---|---|
| Onboarding shell | live | live | real | Shared extension onboarding and lock flow | polish copy and tests |
| Create wallet | partial | live | partial | Base secret generation is local; Canton identity is not invented automatically | add real Canton identity attach flow |
| Import wallet | partial | live | partial | Base mnemonic/private key import supported; Canton import is metadata-link oriented | add validator and external-party attach UI |
| Lock / unlock | live | live | real | Encrypted local vault and session lock are shared | add stronger session persistence recovery tests |
| Portfolio home | reference-only | partial | partial | Unified UI with provenance-aware balances | wire live Base RPC and Canton adapters in real deployments |
| CC prioritization | reference-only | n/a | partial | CC displayed as first-class Canton asset in adapter results | wire live CC holdings source |
| USD display | reference-only | partial | partial | `UsdReferenceService` is shared and adapter-fed | replace static references with live price feeds |
| Receive | partial | live | partial | Base address and QR are real; Canton receive depends on party linkage | add ANS-aware Canton receive hints |
| Send native asset | unsupported | live | partial | Base path can be real with RPC; Canton submit requires live topology | wire Canton transfer execution via ledger |
| Send token | partial | partial | partial | Base ERC-20 path exists; Canton token-standard flow modeled behind adapter | add tested execution against real providers |
| Activity list | reference-only | partial | partial | Local journal is real; explorer/scan enrichment is optional | add Blockscout and Scan reconciler adapters |
| Transaction detail | reference-only | partial | partial | Unified detail surface uses known tx metadata | hydrate richer explorer and ledger details |
| Status tracking | reference-only | partial | partial | Local state machine tracks pending and result states | add durable background reconciliation |
| Network switcher | live | live | real | Canton and Base are built-in networks | add gated custom EVM network support |
| Token visibility | live | live | real | Shared preferences layer | add verified token import warnings |
| Swap entry point | unsupported | unsupported | real | Real UI surface with route state machine | extend provider coverage |
| Swap quotes | unsupported | unsupported | partial | Base dev provider and Canton capability-based routes | plug in live provider adapters |
| Swap execution | unsupported | unsupported | partial | Base execution depends on configured provider; Canton mostly architecture-bound | implement live Base provider and Canton settlement path |
| Fee preview | partial | partial | partial | Base gas estimation can be real; Canton cost is capability-dependent | add richer Canton fee/reference inputs |
| Settings | live | live | real | Lock, currency, dev mode, feature flags, network metadata | add password rotation and export flow |
| Name resolution hooks | unsupported | unsupported | mocked | Future ANS-ready interface exists | add real ANS adapter when endpoints are configured |
