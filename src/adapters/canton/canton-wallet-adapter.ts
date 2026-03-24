import type {
  AccountRecord,
  ActivityRecord,
  AssetRecord,
  CantonIdentity,
  NetworkConfig,
  ReceiveInfo,
  SendDraft,
  SendPreview,
  SubmittedTransaction,
  WalletNetworkAdapter,
  WalletVaultSecret
} from "@/core/models/types";
import { CANTON_DEMO_ACTIVITY, CANTON_DEMO_ASSETS, DEFAULT_CANTON_IDENTITY } from "@/core/models/fixtures";
import { AdapterCapabilityError, ValidationError } from "@/core/services/errors";
import { UsdReferenceService } from "@/core/services/usd-reference-service";
import { CantonHoldingsService } from "@/adapters/canton/services/canton-holdings-service";

export class CantonWalletAdapter implements WalletNetworkAdapter {
  private readonly usdReferenceService = new UsdReferenceService();
  readonly holdingsService = new CantonHoldingsService();

  constructor(readonly network: NetworkConfig) {}

  async getAccounts(_secret: WalletVaultSecret | null, cantonIdentity: CantonIdentity | null): Promise<AccountRecord[]> {
    const identity = cantonIdentity ?? DEFAULT_CANTON_IDENTITY;
    const shortId = identity.partyId ? `${identity.partyId.slice(0, 10)}...` : "Not linked";

    return [
      {
        id: "canton-primary",
        networkId: this.network.id,
        label: identity.partyId ? "Canton party" : "Link Canton party",
        partyId: identity.partyId ?? undefined,
        shortId,
        support: identity.support
      }
    ];
  }

  async getAssets(_secret: WalletVaultSecret | null, cantonIdentity: CantonIdentity | null): Promise<AssetRecord[]> {
    const identity = cantonIdentity ?? DEFAULT_CANTON_IDENTITY;
    return this.holdingsService.getAssets(identity);
  }

  async getActivity(_accounts: AccountRecord[]): Promise<ActivityRecord[]> {
    return CANTON_DEMO_ACTIVITY;
  }

  async getReceiveInfo(account: AccountRecord): Promise<ReceiveInfo> {
    return {
      networkId: this.network.id,
      label: "Canton party",
      value: account.partyId ?? "Attach a party before receiving live Canton assets",
      note: account.partyId
        ? "Senders must target your Canton party identity, not an EVM address."
        : "This profile is not yet linked to a live Canton party."
    };
  }

  async getSendPreview(_secret: WalletVaultSecret | null, draft: SendDraft, assets: AssetRecord[]): Promise<SendPreview> {
    const asset = assets.find((entry) => entry.id === draft.assetId);

    if (!asset) {
      throw new ValidationError("Selected Canton asset was not found.");
    }

    if (!draft.to.trim()) {
      throw new ValidationError("Recipient party is required.");
    }

    if (Number(draft.amount) <= 0) {
      throw new ValidationError("Amount must be greater than zero.");
    }

    return {
      networkId: this.network.id,
      asset,
      to: draft.to.trim(),
      amount: draft.amount,
      usdReference: this.usdReferenceService.scaleReference(asset.usdReference, asset.amount, draft.amount),
      estimatedFeeNative: null,
      estimatedFeeUsdReference: this.usdReferenceService.unavailable(
        "Canton fee USD reference is unavailable until live settlement and fee infrastructure is configured."
      ),
      warnings: [
        "This Canton scaffold prepares protocol-aware transfer UX but does not ship live ledger submission by default."
      ],
      support: "partial"
    };
  }

  async submitSend(
    _secret: WalletVaultSecret | null,
    _draft: SendDraft,
    _preview: SendPreview
  ): Promise<SubmittedTransaction> {
    throw new AdapterCapabilityError(
      "Canton transfer submission is intentionally blocked until a live signer and ledger topology are configured."
    );
  }

  getSupportNotes(): string[] {
    return [
      "Canton uses party-based identity, not an address-derived account model.",
      "Balances and activity are currently demo or reference-mode data unless a live topology is configured.",
      "Transfer and swap execution stay behind explicit capability checks."
    ];
  }
}
