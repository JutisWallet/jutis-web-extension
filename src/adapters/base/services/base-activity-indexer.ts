import type { AccountRecord, ActivityRecord, NetworkConfig } from "@/core/models/types";

import { BaseTransactionLifecycleService } from "@/adapters/base/services/base-transaction-lifecycle-service";

export class BaseActivityIndexer {
  private readonly lifecycleService: BaseTransactionLifecycleService;

  constructor(network: NetworkConfig) {
    this.lifecycleService = new BaseTransactionLifecycleService(network);
  }

  async list(accounts: AccountRecord[]): Promise<ActivityRecord[]> {
    return this.lifecycleService.listActivity(accounts);
  }

  async reconcilePendingTransactions(): Promise<void> {
    await this.lifecycleService.reconcilePendingTransactions();
  }

  async hasPendingTransactions(): Promise<boolean> {
    return this.lifecycleService.hasPendingTransactions();
  }

  getLifecycleService(): BaseTransactionLifecycleService {
    return this.lifecycleService;
  }
}
