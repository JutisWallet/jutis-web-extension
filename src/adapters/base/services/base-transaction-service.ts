import type { AssetRecord, SendDraft, SendPreview, SubmittedTransaction, WalletVaultSecret } from "@/core/models/types";
import type { BaseWalletAdapter } from "@/adapters/base/base-wallet-adapter";
import type { BaseTransactionLifecycleService } from "@/adapters/base/services/base-transaction-lifecycle-service";

export class BaseTransactionService {
  constructor(
    private readonly adapter: BaseWalletAdapter,
    private readonly lifecycleService: BaseTransactionLifecycleService
  ) {}

  preview(secret: WalletVaultSecret | null, draft: SendDraft, assets: AssetRecord[]): Promise<SendPreview> {
    return this.adapter.getSendPreview(secret, draft, assets);
  }

  async submit(secret: WalletVaultSecret | null, draft: SendDraft, preview: SendPreview): Promise<SubmittedTransaction> {
    const submitted = await this.adapter.submitSend(secret, draft, preview);
    const [account] = await this.adapter.getAccounts(secret, null);

    if (!account) {
      throw new Error("No Base account was available to persist the submitted transaction lifecycle.");
    }

    await this.lifecycleService.recordSubmittedTransaction({
      account,
      draft,
      preview,
      submitted
    });

    return submitted;
  }
}
