import { describe, expect, it } from "vitest";

import type { AssetRecord, NetworkConfig, UsdReference, WalletVaultSecret } from "@/core/models/types";
import { ValidationError } from "@/core/services/errors";
import { BaseWalletAdapter } from "@/adapters/base/base-wallet-adapter";

function createUsdReference(): UsdReference {
  return {
    value: 1000,
    trustLevel: "estimated",
    sourceType: "static-reference",
    note: "Test-only USD reference."
  };
}

function createBaseEthAsset(amount: string): AssetRecord {
  return {
    id: "base-eth",
    networkId: "base-mainnet",
    symbol: "ETH",
    name: "Ether",
    amount,
    decimals: 18,
    usdReference: createUsdReference(),
    visible: true,
    verified: true,
    support: "real",
    kind: "native"
  };
}

const BASE_NETWORK: NetworkConfig = {
  id: "base-mainnet",
  name: "Base",
  kind: "evm",
  symbol: "ETH",
  accentColor: "#8ab4ff",
  explorerUrl: "https://base.blockscout.com/",
  rpcUrl: "https://mainnet.base.org",
  chainId: 8453,
  builtIn: true,
  testnet: false,
  support: "partial"
};

const SECRET: WalletVaultSecret = {
  basePrivateKey: "0x59c6995e998f97a5a004497e5da18b775f7c3d8e4e6d0f2d6f4858cc5b64cf2a"
};

describe("BaseWalletAdapter.getSendPreview", () => {
  it("rejects send preview when the wallet is locked", async () => {
    const adapter = new BaseWalletAdapter(BASE_NETWORK);

    await expect(
      adapter.getSendPreview(
        null,
        {
          networkId: "base-mainnet",
          assetId: "base-eth",
          to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
          amount: "0.1"
        },
        [createBaseEthAsset("1.5")]
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects invalid recipient addresses before any RPC-dependent work", async () => {
    const adapter = new BaseWalletAdapter(BASE_NETWORK);

    await expect(
      adapter.getSendPreview(
        SECRET,
        {
          networkId: "base-mainnet",
          assetId: "base-eth",
          to: "not-an-address",
          amount: "0.1"
        },
        [createBaseEthAsset("1.5")]
      )
    ).rejects.toThrow("Recipient must be a valid Base address.");
  });

  it("rejects transfers that exceed the available asset balance", async () => {
    const adapter = new BaseWalletAdapter(BASE_NETWORK);

    await expect(
      adapter.getSendPreview(
        SECRET,
        {
          networkId: "base-mainnet",
          assetId: "base-eth",
          to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
          amount: "2.0"
        },
        [createBaseEthAsset("1.0")]
      )
    ).rejects.toThrow("Amount exceeds the available asset balance.");
  });
});
