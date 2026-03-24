# Base Research

Date: 2026-03-21

## Executive Position

Base should be treated as a standard EVM network inside Jutis, but implemented with extension-wallet discipline:

- local key custody in the extension vault
- chain-aware JSON-RPC access
- EIP-1193-compatible provider architecture for future dapp injection
- strict custom-network validation
- activity derived from local journal plus explorer/indexer enrichment
- swap execution behind provider-agnostic quote and execution interfaces

## Core Research Findings

## Standard account model

For Base, the correct wallet account model is:

- seed phrase or imported private key under local encrypted vault
- one or more derived EVM addresses
- chain selection by chain id
- JSON-RPC transport to the configured Base endpoint
- transaction and token handling through standard EVM tooling

This is compatible with EIP-1193 for injected-provider support and EIP-6963 for multi-wallet discovery later.

## Built-in Base network defaults

Official Base documentation currently lists:

- Base Mainnet RPC: `https://mainnet.base.org`
- Base Mainnet chain id: `8453`
- Base currency: `ETH`
- Base explorer: `https://base.blockscout.com/`
- Base Sepolia RPC: `https://sepolia.base.org`
- Base Sepolia chain id: `84532`

The same page also states that the public RPC endpoints are rate-limited and not intended for production systems. Jutis should therefore ship Base mainnet as a built-in network config, but production deployments should encourage a dedicated RPC provider.

## JSON-RPC integration

Base is EVM-compatible, so the expected wallet transport is:

- `eth_chainId`
- `eth_requestAccounts`
- `eth_sendTransaction`
- `eth_estimateGas`
- `eth_call`
- `eth_getBalance`
- `eth_getTransactionReceipt`

Jutis can build its internal adapter on top of a library such as `ethers`, while preserving an EIP-1193-facing provider boundary for future dapp connectivity.

## Safe custom EVM network addition

Adding custom EVM networks later is technically valid, but it must be guarded:

- require explicit chain id
- require HTTPS RPC in production mode
- validate native currency metadata
- validate block explorer URL shape
- require user confirmation before host permission expansion
- prevent duplicate chain ids with conflicting labels

Jutis should not silently accept arbitrary RPC URLs into the built-in network list.

## Asset detection strategy

The safest Base v1 strategy is:

1. built-in token list for ETH and a curated small set such as USDC
2. manual token import by contract address
3. ERC-20 metadata lookup on import
4. no broad auto-import of all token balances by default

Rationale:

- automatic import is noisy
- scam token surfacing is a real wallet UX problem
- extension popups benefit from a tighter trusted list

## Activity indexing strategy

RPC alone is enough for:

- tx submission
- receipt lookup
- gas estimation
- polling known tx hashes

RPC alone is not enough for a strong historical activity feed for an arbitrary imported account. For that, Jutis should use:

- a local sent-transaction journal for guaranteed wallet-initiated history
- optional explorer or indexer enrichment

Base’s docs list Blockscout and Etherscan as supported explorers. Blockscout’s API docs provide address transaction and log endpoints, which makes it a sensible optional indexer adapter for Jutis.

## Swap architecture for Base

Base swap support should not hardcode one provider into core wallet logic. Jutis should implement:

- `SwapProviderRegistry`
- provider adapters returning normalized quotes
- route comparison by output, fees, slippage, and warnings
- execution service that submits approvals and swaps through the active provider

Because providers change faster than the wallet core, Jutis should expect a provider proxy layer or provider-specific adapters at the edge of the system.

## Bridge considerations

Bridge support is important for Base long term, but should remain out of Jutis v1 core scope. The correct v1 move is:

- reserve a bridge entry point in architecture
- do not mix bridge flows into send or swap
- keep bridge as a future module with separate risk controls

## Implications For Jutis

1. Base can have real local key custody from day one.
2. Base activity can be real for Jutis-originated transactions and partial for imported historical activity unless an explorer adapter is configured.
3. Token import should be manual-first.
4. Provider injection is a future-capable boundary, not a prerequisite for shipping internal wallet flows.
5. Public Base RPC should be treated as development-friendly, not production-grade.

## Source Notes

External sources:

- [Base network information](https://docs.base.org/docs/network-information/)
- [Base block explorers](https://docs.base.org/chain/block-explorers)
- [EIP-1193 provider API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963 provider discovery](https://eips.ethereum.org/EIPS/eip-6963)
- [Blockscout address transactions API](https://docs.blockscout.com/api-reference/get-address-transactions)
- [Blockscout address logs API](https://docs.blockscout.com/api-reference/get-address-logs)
