# Base Wallet Architecture

Date: 2026-03-21

## Architecture Goal

Provide a first-class Base experience inside Jutis using standard EVM wallet architecture, while keeping it modular enough to support more EVM-compatible networks later without contaminating Canton abstractions.

## Design Principles

1. Local key custody belongs to the encrypted extension vault.
2. Chain and asset state come from adapter services, not React components.
3. Transaction history is local-journal-first, explorer-enriched second.
4. Swap provider logic stays out of wallet core.
5. Custom network support is permissioned and explicit.

## Layered Design

```text
UI Layer
  -> onboarding, portfolio, send, receive, activity, swap, settings

Application State Layer
  -> selected address, selected network, pending tx, token visibility

Wallet Core Layer
  -> vault access, portfolio aggregation, transaction orchestration

Base Adapter Layer
  -> BaseWalletAdapter
  -> BaseTransactionService
  -> BaseActivityIndexer
  -> BaseSwapAdapter

Storage and Security Layer
  -> encrypted seed/private key storage
  -> local tx journal
  -> network and token preferences
```

## Account Model

```ts
interface BaseAccount {
  networkId: string;
  address: `0x${string}`;
  derivationPath?: string;
  imported: boolean;
}
```

The vault stores secret material. The adapter derives addresses and signs transactions. UI code never handles raw secrets.

## Network Model

```ts
interface EvmNetworkConfig {
  id: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  symbol: string;
  name: string;
  testnet: boolean;
  custom: boolean;
}
```

Built-in:

- `base-mainnet`

Optional developer preset:

- `base-sepolia`

## Asset Model

```ts
interface BaseAsset {
  networkId: string;
  symbol: string;
  name: string;
  address?: `0x${string}`;
  decimals: number;
  kind: "native" | "erc20";
  visible: boolean;
  verified: boolean;
}
```

Jutis should keep a curated built-in list and support manual import for ERC-20 contracts.

## `BaseWalletAdapter`

Responsibilities:

- derive or import the active EVM account
- read native and ERC-20 balances
- estimate gas and fees
- prepare and submit transactions
- expose receive information

It must not:

- render UI
- own persistent activity history decisions
- hardcode swap provider logic

## `BaseTransactionService`

Responsibilities:

- validate destination addresses
- create send previews
- estimate gas costs
- sign and submit native or ERC-20 transactions
- journal the submitted transaction locally

## `BaseActivityIndexer`

Responsibilities:

- persist transactions initiated in Jutis
- poll receipts for status changes
- optionally enrich account history from explorer/indexer APIs

This means Base history is real for Jutis-submitted transactions even if full historical indexing is not configured.

## `BaseSwapAdapter`

Responsibilities:

- request normalized quotes from an external provider adapter
- build approval requirements
- build execution plan
- submit approval and swap transactions through `BaseTransactionService`

## Send Flow

1. user selects asset and recipient
2. address validation runs locally
3. gas and fee preview are estimated from RPC
4. confirmation screen shows:
   - amount
   - asset
   - estimated fee
   - USD reference
   - network
5. submission writes to local journal
6. receipt polling updates pending to confirmed or failed

## Receive Flow

Receive should show:

- checksum EVM address
- QR code
- copy action
- Base network note

## Activity Flow

Sources in descending reliability order:

1. local Jutis journal
2. transaction receipt polling
3. optional Blockscout enrichment

Explorer enrichment is optional because it expands runtime dependencies and host access. The wallet should function even without it.

## Custom Network Strategy

Custom EVM networks are future-valid, but must remain behind explicit settings:

- user-entered metadata
- chain id uniqueness check
- host permission request
- warning copy for non-built-in RPCs

Base itself remains a built-in trusted default and should not share the same warning level as arbitrary custom EVM networks.

## Provider Injection Future Hook

Jutis should eventually support:

- EIP-1193 provider requests
- EIP-6963 provider announcement
- per-site permissions
- signature and transaction approval prompts

This is an extension-facing boundary, not a blocker for internal wallet v1 flows.

## Jutis-Specific Decisions

1. Base is the real locally generated/imported key network in the current scaffold.
2. Base sends can be implemented with standard EVM tooling.
3. Base historical activity is marked `real` for wallet-originated transactions and `partial` for broad imported-account history until an indexer is configured.
4. Swap execution remains provider-pluggable and adapter-owned.
