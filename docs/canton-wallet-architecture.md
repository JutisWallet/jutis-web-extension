# Canton Wallet Architecture

Date: 2026-03-21

## Architecture Goal

Jutis must support Canton as a first-class built-in network without flattening it into an Ethereum mental model. The extension owns wallet UX, local session security, and transaction journaling, while Canton-specific identity, holdings, transfer, and activity semantics remain inside dedicated adapters.

## Design Principles

1. Party identity is the Canton primitive, not an address.
2. Local extension state and protocol identity are separate.
3. Scan, Validator, and Ledger are different sources with different truth scopes.
4. Unsupported topology-dependent behavior is exposed as a capability flag, not hidden.
5. CC is a first-class instrument in domain modeling and UI ordering.

## Layered Design

```text
UI Layer
  -> popup and options surfaces
  -> Canton-aware receive, send, activity, and settings flows

Application State Layer
  -> unlocked session state
  -> selected network, asset filters, pending intents

Wallet Core Layer
  -> account abstraction
  -> portfolio aggregation
  -> transaction orchestration
  -> USD reference composition

Canton Adapter Layer
  -> CantonWalletAdapter
  -> CantonTransferService
  -> CantonActivityIndexer
  -> CantonReferenceDataService
  -> CantonSwapAdapter

Storage and Security Layer
  -> encrypted local vault
  -> local activity journal
  -> feature flags and preferences
```

## Core Domain Model

## Identity Model

```ts
type CantonAuthMode =
  | "unlinked"
  | "validator-jwt"
  | "external-party"
  | "wallet-session"
  | "mock";

interface CantonIdentity {
  networkId: string;
  partyId: string | null;
  displayName?: string;
  participantId?: string;
  validatorApiUrl?: string;
  scanApiUrl?: string;
  ledgerApiUrl?: string;
  authMode: CantonAuthMode;
  capabilities: CantonCapabilities;
}
```

`partyId` is nullable because a fresh Jutis vault does not imply a valid Canton party. That attachment must happen explicitly.

## Asset Model

```ts
interface CantonInstrumentId {
  admin: string;
  symbol: string;
}

interface CantonHolding {
  instrumentId: CantonInstrumentId;
  amount: string;
  ownerPartyId: string;
  contractId?: string;
  source: "ledger" | "scan" | "mock";
  locked?: boolean;
}
```

## Activity Model

```ts
interface CantonActivityItem {
  id: string;
  networkId: string;
  kind: "send" | "receive" | "swap" | "approval" | "system";
  status: "created" | "submitted" | "pending" | "confirmed" | "failed";
  source: "local-journal" | "scan" | "validator" | "mock";
  instrumentId?: CantonInstrumentId;
  amount?: string;
  fromPartyId?: string;
  toPartyId?: string;
  transactionId?: string;
  occurredAt: string;
  note?: string;
}
```

## Adapter Boundaries

## `CantonWalletAdapter`

Responsibilities:

- expose Canton identity status to the app
- fetch holdings and balances from configured sources
- expose receive instructions for a party
- resolve network topology and capability flags

It must not:

- own encrypted vault logic
- assume ledger submission is always available
- invent party ids from local secret material

## `CantonTransferService`

Responsibilities:

- validate recipient party or future ANS recipient
- prepare token-standard transfer intent
- hand off signing or approval to the configured Canton signer boundary
- submit or mark the action as unsupported
- update local transaction state

## `CantonActivityIndexer`

Responsibilities:

- merge local submissions with scan-backed visible activity
- map transport status into Jutis activity states
- tag provenance clearly for the UI

## `CantonReferenceDataService`

Responsibilities:

- scan topology discovery
- participant hosting lookups
- selected CC aggregate and traffic context
- future ANS resolution hooks

## `CantonSwapAdapter`

Responsibilities:

- quote support capability checks
- build token-standard settlement legs
- surface route execution readiness
- stop honestly at `settlement_ready` when ledger execution is unavailable

## Read and Write Split

## Reads

### Scan-backed reads

- synchronizer and scan topology
- DSO-visible CC activity
- ANS and aggregate reads
- traffic/reference context

### Ledger-backed reads

- party-private holdings
- party-private transaction consequences
- command result confirmation

### Validator-backed reads

- primary party resolution for validator-hosted users
- validator wallet status where deployment permits it

## Writes

Writes should flow through a single orchestration path:

1. local user confirms intent
2. Jutis validates topology and capabilities
3. transfer or swap command is prepared
4. signing or approval boundary is invoked
5. ledger submission is attempted if configured
6. local activity journal is updated immediately
7. indexer reconciles later network results

## Receive Flow

Jutis should present Canton receive as:

- party id
- optional display label
- optional ANS name when configured later
- short explanatory copy that the sender may need to transfer to a Canton party, not an EVM address

If the wallet is unlinked:

- the receive screen should explain that a Canton party must be attached before inbound transfers are actionable

## Send Flow

### Supported now in architecture

- recipient validation
- asset selection
- amount entry
- local review and confirmation
- adapter capability evaluation
- pending and failed state tracking

### Real execution requirements

- party-linked Canton identity
- deployed token-standard compatible contracts
- signer boundary
- ledger submission endpoint

If these are not present, Jutis must render the flow as:

- form and review: available
- submit: blocked by adapter capability
- error copy: explicit and protocol-specific

## CC Handling

CC should receive:

- top ordering in Canton asset lists
- network badge or highlight
- dedicated detail copy
- optional traffic-reference context in developer mode

Jutis should not assume CC is the only Canton asset, but it should be the default primary asset.

## Status Tracking

Jutis normalizes Canton status into:

- `created`
- `submitted`
- `pending`
- `confirmed`
- `failed`

Mapping rules:

- `created`: local review accepted, no network handoff yet
- `submitted`: signer boundary or API accepted submission
- `pending`: waiting on ledger or reconciler confirmation
- `confirmed`: ledger or trusted indexer confirms terminal success
- `failed`: signing rejected, command failed, or timeout escalated

## Capability Flags

Every Canton identity must expose:

```ts
interface CantonCapabilities {
  canReadHoldings: boolean;
  canReadActivity: boolean;
  canPrepareTransfers: boolean;
  canSubmitTransfers: boolean;
  canQuoteSwaps: boolean;
  canExecuteSwaps: boolean;
  canResolveNames: boolean;
}
```

The UI uses these flags to avoid fake buttons or misleading empty success states.

## Future Name Resolution

Jutis should ship a dormant `NameResolutionService` contract now:

```ts
interface NameResolutionService {
  resolve(input: string, networkId: string): Promise<NameResolutionResult | null>;
}
```

For Canton v1:

- default implementation returns `null`
- future ANS-backed implementation is enabled only when endpoint and topology support exist

## Jutis-Specific Decisions

1. The local Jutis vault may exist before Canton identity exists.
2. Base and Canton portfolio sections are unified at the UI layer, not at the protocol layer.
3. Canton activity and balances are tagged by provenance to distinguish real, partial, and mock data.
4. Swap is modeled fully, but route execution support is exposed per adapter and per route.

## Implementation Note For This Repo

This codebase should implement the following concrete boundaries even when full Canton infra is absent:

- `CantonWalletAdapter`
- `CantonTransferService`
- `CantonActivityIndexer`
- `CantonReferenceDataService`
- `CantonSwapAdapter`

Each boundary should contain:

- exact capability flags
- explicit TODOs for topology-dependent integration
- no EVM terminology leakage
