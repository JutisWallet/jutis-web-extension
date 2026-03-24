import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseEther,
  parseUnits
} from "ethers";
import type { HDNodeWallet } from "ethers";

import type {
  AccountRecord,
  ActivityRecord,
  AssetRecord,
  NetworkConfig,
  ReceiveInfo,
  SendDraft,
  SendPreview,
  SubmittedTransaction,
  WalletNetworkAdapter,
  WalletVaultSecret
} from "@/core/models/types";
import { ValidationError } from "@/core/services/errors";
import { UsdReferenceService } from "@/core/services/usd-reference-service";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

export class BaseWalletAdapter implements WalletNetworkAdapter {
  private readonly usdReferenceService = new UsdReferenceService();

  constructor(readonly network: NetworkConfig) {}

  async getAccounts(secret: WalletVaultSecret | null, _cantonIdentity?: unknown): Promise<AccountRecord[]> {
    if (!secret) {
      return [];
    }

    const wallet = this.getWallet(secret);

    return [
      {
        id: "base-primary",
        networkId: this.network.id,
        label: "Base account",
        address: wallet.address as `0x${string}`,
        shortId: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
        support: "real"
      }
    ];
  }

  async getAssets(secret: WalletVaultSecret | null, _cantonIdentity?: unknown): Promise<AssetRecord[]> {
    if (!secret) {
      return [];
    }

    const wallet = this.getWallet(secret);
    const provider = this.getProvider();

    try {
      const balance = await provider.getBalance(wallet.address);
      const amount = Number(formatEther(balance)).toFixed(4);

      return [
        {
          id: "base-eth",
          networkId: this.network.id,
          symbol: "ETH",
          name: "Ether",
          amount,
          decimals: 18,
          usdReference: this.usdReferenceService.toUsdReference("ETH", amount),
          change24h: 2.1,
          isPrimary: true,
          visible: true,
          verified: true,
          support: "real",
          kind: "native"
        }
      ];
    } catch {
      return [
        {
          id: "base-eth",
          networkId: this.network.id,
          symbol: "ETH",
          name: "Ether",
          amount: "0.0000",
          decimals: 18,
          usdReference: this.usdReferenceService.unavailable(
            "Base balance could not be read, so the ETH USD reference is unavailable."
          ),
          visible: true,
          verified: true,
          support: "partial",
          kind: "native"
        }
      ];
    }
  }

  async getActivity(_accounts: AccountRecord[]): Promise<ActivityRecord[]> {
    return [];
  }

  async getReceiveInfo(account: AccountRecord): Promise<ReceiveInfo> {
    return {
      networkId: this.network.id,
      label: "Base address",
      value: account.address ?? "",
      note: "Only send Base-compatible assets to this address."
    };
  }

  async getSendPreview(secret: WalletVaultSecret | null, draft: SendDraft, assets: AssetRecord[]): Promise<SendPreview> {
    if (!secret) {
      throw new ValidationError("Unlock the wallet before preparing a Base transfer.");
    }

    if (!isAddress(draft.to)) {
      throw new ValidationError("Recipient must be a valid Base address.");
    }

    const asset = assets.find((entry) => entry.id === draft.assetId);

    if (!asset) {
      throw new ValidationError("Selected asset was not found.");
    }

    if (Number(draft.amount) <= 0) {
      throw new ValidationError("Amount must be greater than zero.");
    }

    if (Number(draft.amount) > Number(asset.amount)) {
      throw new ValidationError("Amount exceeds the available asset balance.");
    }

    const warnings: string[] = [];
    let estimatedFeeNative: string | null = null;
    const nativeAsset = assets.find((entry) => entry.kind === "native");

    try {
      const provider = this.getProvider();
      const wallet = this.getWallet(secret).connect(provider);
      const feeData = await provider.getFeeData();

      if (asset.kind === "native") {
        const gasLimit = await provider.estimateGas({
          from: wallet.address,
          to: getAddress(draft.to),
          value: parseEther(draft.amount)
        });

        const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice;
        if (maxFee) {
          estimatedFeeNative = formatEther(maxFee * gasLimit);

          if (Number(draft.amount) + Number(estimatedFeeNative) > Number(asset.amount)) {
            throw new ValidationError("Amount plus estimated fee exceeds the available ETH balance.");
          }
        }
      } else if (asset.contractAddress) {
        const contract = new Contract(asset.contractAddress, ERC20_ABI, wallet);
        const tx = await contract.transfer.populateTransaction(getAddress(draft.to), parseUnits(draft.amount, asset.decimals));
        const gasLimit = await provider.estimateGas({
          from: wallet.address,
          to: tx.to,
          data: tx.data
        });

        const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice;
        if (maxFee) {
          estimatedFeeNative = formatEther(maxFee * gasLimit);

          if (nativeAsset && Number(estimatedFeeNative) > Number(nativeAsset.amount)) {
            throw new ValidationError("Estimated gas exceeds the available ETH balance.");
          }
        }
      } else {
        warnings.push("This token is missing a contract address and cannot be sent.");
      }
    } catch {
      warnings.push("Gas estimation could not be completed. The current preview is best-effort.");
    }

    return {
      networkId: this.network.id,
      asset,
      to: getAddress(draft.to),
      amount: draft.amount,
      usdReference: this.usdReferenceService.scaleReference(asset.usdReference, asset.amount, draft.amount),
      estimatedFeeNative,
      estimatedFeeUsdReference:
        estimatedFeeNative != null
          ? this.usdReferenceService.toUsdReference("ETH", estimatedFeeNative)
          : this.usdReferenceService.unavailable("No fee estimate is available yet."),
      warnings,
      support: warnings.length === 0 ? "real" : "partial"
    };
  }

  async submitSend(secret: WalletVaultSecret | null, draft: SendDraft, preview: SendPreview): Promise<SubmittedTransaction> {
    if (!secret) {
      throw new ValidationError("Unlock the wallet before submitting a Base transfer.");
    }

    const provider = this.getProvider();
    const wallet = this.getWallet(secret).connect(provider);
    const asset = preview.asset;

    if (asset.kind === "native") {
      const response = await wallet.sendTransaction({
        to: preview.to,
        value: parseEther(draft.amount)
      });

      return {
        id: response.hash,
        networkId: this.network.id,
        status: "submitted",
        hash: response.hash,
        explorerUrl: this.network.explorerUrl ? `${this.network.explorerUrl}tx/${response.hash}` : undefined
      };
    }

    if (!asset.contractAddress) {
      throw new ValidationError("This token cannot be sent because its contract address is missing.");
    }

    const contract = new Contract(asset.contractAddress, ERC20_ABI, wallet);
    const response = await contract.transfer(getAddress(preview.to), parseUnits(draft.amount, asset.decimals));

    return {
      id: response.hash,
      networkId: this.network.id,
      status: "submitted",
      hash: response.hash,
      explorerUrl: this.network.explorerUrl ? `${this.network.explorerUrl}tx/${response.hash}` : undefined
    };
  }

  getSupportNotes(): string[] {
    return [
      "Base uses standard EVM custody inside the Jutis vault.",
      "Jutis-relevant Base sends reconcile against live RPC receipts after local submission.",
      "Full inbound and third-party Base history still requires a managed indexer or explorer API.",
      "Public Base RPC endpoints are rate-limited and should be replaced for production use."
    ];
  }

  async importToken(secret: WalletVaultSecret | null, contractAddress: `0x${string}`): Promise<AssetRecord> {
    if (!secret) {
      throw new ValidationError("Unlock the wallet before importing a token.");
    }

    const wallet = this.getWallet(secret);
    const provider = this.getProvider();
    const contract = new Contract(contractAddress, ERC20_ABI, provider);
    const [symbol, decimals, balance] = await Promise.all([
      contract.symbol(),
      contract.decimals(),
      contract.balanceOf(wallet.address)
    ]);

    const amount = formatUnits(balance, decimals);

    return {
      id: `base-token-${contractAddress.toLowerCase()}`,
      networkId: this.network.id,
      symbol,
      name: symbol,
      amount,
      decimals,
      usdReference: this.usdReferenceService.unavailable(
        "Imported ERC-20 token pricing is unavailable until a live token price source is configured."
      ),
      visible: true,
      verified: false,
      support: "partial",
      kind: "erc20",
      contractAddress
    };
  }

  private getProvider(): JsonRpcProvider {
    if (!this.network.rpcUrl) {
      throw new Error(`No RPC URL configured for ${this.network.id}.`);
    }

    return new JsonRpcProvider(this.network.rpcUrl, this.network.chainId);
  }

  private getWallet(secret: WalletVaultSecret): Wallet | HDNodeWallet {
    if (secret.basePrivateKey) {
      return new Wallet(secret.basePrivateKey);
    }

    if (secret.baseMnemonic) {
      return Wallet.fromPhrase(secret.baseMnemonic);
    }

    throw new Error("No Base secret material is available.");
  }
}
