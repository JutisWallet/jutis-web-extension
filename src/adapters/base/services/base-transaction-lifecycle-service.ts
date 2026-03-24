import { JsonRpcProvider } from "ethers";

import type {
  AccountRecord,
  BaseTrackedTransactionRecord,
  NetworkConfig,
  SendDraft,
  SendPreview,
  SubmittedTransaction
} from "@/core/models/types";
import {
  readActivityJournal,
  readBaseTransactions,
  writeActivityJournal,
  writeBaseTransactions
} from "@/storage/vault-repository";

function isTrackedHash(value: string | undefined): value is `0x${string}` {
  return Boolean(value && value.startsWith("0x"));
}

function dedupeTrackedTransactions(
  records: BaseTrackedTransactionRecord[]
): BaseTrackedTransactionRecord[] {
  const byHash = new Map<string, BaseTrackedTransactionRecord>();

  for (const record of records) {
    const existing = byHash.get(record.hash);
    const existingUpdatedAt = existing?.updatedAt ?? existing?.createdAt ?? "";
    const nextUpdatedAt = record.updatedAt ?? record.createdAt;

    if (!existing || existingUpdatedAt.localeCompare(nextUpdatedAt) <= 0) {
      byHash.set(record.hash, record);
    }
  }

  return [...byHash.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export class BaseTransactionLifecycleService {
  constructor(private readonly network: NetworkConfig) {}

  async listActivity(accounts: AccountRecord[]): Promise<BaseTrackedTransactionRecord[]> {
    await this.migrateLegacyJournalEntries(accounts);
    const tracked = await this.reconcilePendingTransactions();
    const addresses = new Set(
      accounts
        .map((account) => account.address?.toLowerCase())
        .filter((address): address is string => Boolean(address))
    );

    if (addresses.size === 0) {
      return tracked;
    }

    return tracked.filter((record) => addresses.has(record.accountAddress.toLowerCase()));
  }

  async recordSubmittedTransaction({
    account,
    draft,
    preview,
    submitted
  }: {
    account: AccountRecord;
    draft: SendDraft;
    preview: SendPreview;
    submitted: SubmittedTransaction;
  }): Promise<BaseTrackedTransactionRecord> {
    if (!account.address || !submitted.hash || !isTrackedHash(submitted.hash)) {
      throw new Error("A Base tracked transaction requires both a source address and a transaction hash.");
    }

    await this.migrateLegacyJournalEntries([account]);

    const now = new Date().toISOString();
    const record: BaseTrackedTransactionRecord = {
      id: submitted.id,
      networkId: "base-mainnet",
      accountId: account.id,
      accountAddress: account.address,
      kind: "send",
      status: "submitted",
      title: `Sent ${draft.amount} ${preview.asset.symbol}`,
      subtitle: "Broadcast by Jutis. Waiting for Base RPC visibility.",
      amount: `${draft.amount} ${preview.asset.symbol}`,
      symbol: preview.asset.symbol,
      usdReference: preview.usdReference,
      hash: submitted.hash,
      explorerUrl: submitted.explorerUrl,
      from: account.address,
      to: preview.to,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      support: "real",
      source: "local",
      detail: submitted.note ?? "The transaction hash was returned locally. Confirmation now depends on Base RPC receipt data."
    };

    const existing = await readBaseTransactions();
    const next = dedupeTrackedTransactions([record, ...existing]);
    await writeBaseTransactions(next);

    return record;
  }

  async reconcilePendingTransactions(): Promise<BaseTrackedTransactionRecord[]> {
    await this.migrateLegacyJournalEntries();

    const records = await readBaseTransactions();

    if (records.length === 0) {
      return [];
    }

    const provider = this.getProvider();
    const latestBlockNumber = await provider.getBlockNumber();
    const reconciled = await Promise.all(records.map((record) => this.reconcileRecord(record, provider, latestBlockNumber)));
    const next = dedupeTrackedTransactions(reconciled);
    await writeBaseTransactions(next);

    return next;
  }

  async hasPendingTransactions(): Promise<boolean> {
    await this.migrateLegacyJournalEntries();
    const records = await readBaseTransactions();
    return records.some((record) => record.status === "submitted" || record.status === "pending");
  }

  private async migrateLegacyJournalEntries(accounts: AccountRecord[] = []): Promise<void> {
    const [tracked, journal] = await Promise.all([readBaseTransactions(), readActivityJournal()]);
    const fallbackAddress = accounts.find((account) => account.networkId === "base-mainnet")?.address;
    const legacyBaseEntries = journal.filter(
      (entry) => entry.networkId === "base-mainnet" && Boolean(entry.hash) && isTrackedHash(entry.hash)
    );

    if (legacyBaseEntries.length === 0) {
      return;
    }

    const migrated = legacyBaseEntries.reduce<BaseTrackedTransactionRecord[]>((records, entry) => {
        const accountAddress =
          entry.from && entry.from.startsWith("0x") ? (entry.from as `0x${string}`) : fallbackAddress;

        if (!accountAddress) {
          return records;
        }

        records.push({
          ...entry,
          networkId: "base-mainnet" as const,
          hash: entry.hash as `0x${string}`,
          accountAddress,
          submittedAt: entry.createdAt,
          updatedAt: entry.updatedAt ?? entry.createdAt,
          detail: entry.detail ?? "Migrated from the legacy Base activity journal."
        });

        return records;
      }, []);

    if (migrated.length === 0) {
      return;
    }

    await Promise.all([
      writeBaseTransactions(dedupeTrackedTransactions([...migrated, ...tracked])),
      writeActivityJournal(journal.filter((entry) => entry.networkId !== "base-mainnet"))
    ]);
  }

  private async reconcileRecord(
    record: BaseTrackedTransactionRecord,
    provider: JsonRpcProvider,
    latestBlockNumber: number
  ): Promise<BaseTrackedTransactionRecord> {
    if (record.status === "confirmed" || record.status === "failed") {
      return record;
    }

    try {
      const receipt = await provider.getTransactionReceipt(record.hash);

      if (receipt) {
        const block = await provider.getBlock(receipt.blockNumber);
        const confirmations = Math.max(latestBlockNumber - receipt.blockNumber + 1, 1);
        const updatedAt = new Date().toISOString();

        if (receipt.status === 0) {
          return {
            ...record,
            status: "failed",
            source: "rpc",
            updatedAt,
            blockNumber: receipt.blockNumber,
            confirmations,
            failureReason: "The transaction was mined but reverted onchain.",
            subtitle: "Failed onchain",
            detail: "Base RPC returned a failed receipt for this transaction."
          };
        }

        return {
          ...record,
          status: "confirmed",
          source: "rpc",
          updatedAt,
          confirmedAt: block ? new Date(block.timestamp * 1000).toISOString() : updatedAt,
          blockNumber: receipt.blockNumber,
          confirmations,
          subtitle: confirmations > 1 ? `${confirmations} confirmations` : "Confirmed onchain",
          detail: `Confirmed on Base in block ${receipt.blockNumber}.`
        };
      }

      const transaction = await provider.getTransaction(record.hash);

      if (transaction) {
        return {
          ...record,
          status: "pending",
          source: "rpc",
          updatedAt: new Date().toISOString(),
          subtitle: "Pending confirmation",
          detail: "The transaction is visible through Base RPC and is waiting for a mined receipt."
        };
      }

      return {
        ...record,
        status: "submitted",
        updatedAt: new Date().toISOString(),
        subtitle: "Waiting for RPC visibility",
        detail: "Jutis broadcast this transaction, but the configured Base RPC endpoint has not surfaced it yet."
      };
    } catch (error) {
      return {
        ...record,
        updatedAt: new Date().toISOString(),
        subtitle: record.status === "pending" ? "Pending confirmation" : record.subtitle,
        detail:
          error instanceof Error
            ? `Base RPC reconciliation is currently unavailable: ${error.message}`
            : "Base RPC reconciliation is currently unavailable."
      };
    }
  }

  private getProvider(): JsonRpcProvider {
    if (!this.network.rpcUrl) {
      throw new Error(`No RPC URL configured for ${this.network.id}.`);
    }

    return new JsonRpcProvider(this.network.rpcUrl, this.network.chainId);
  }
}
