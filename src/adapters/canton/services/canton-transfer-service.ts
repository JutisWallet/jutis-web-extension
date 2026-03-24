import type { SendDraft, SendPreview, SubmittedTransaction } from "@/core/models/types";
import { AdapterCapabilityError } from "@/core/services/errors";

export class CantonTransferService {
  async preview(_draft: SendDraft, preview: SendPreview): Promise<SendPreview> {
    return preview;
  }

  async submit(): Promise<SubmittedTransaction> {
    throw new AdapterCapabilityError(
      "Live Canton transfer execution requires token-standard contracts, signer integration, and ledger submission topology."
    );
  }
}
