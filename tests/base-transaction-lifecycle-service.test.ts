import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivityRecord,
  BaseTrackedTransactionRecord,
  NetworkConfig
} from "@/core/models/types";

const repositoryState = vi.hoisted(() => ({
  baseTransactions: [] as BaseTrackedTransactionRecord[],
  activityJournal: [] as ActivityRecord[]
}));

const providerState = vi.hoisted(() => ({
  latestBlockNumber: 100,
  receipt: null as { status: 0 | 1; blockNumber: number } | null,
  transaction: null as { hash: `0x${string}` } | null,
  block: null as { timestamp: number } | null,
  error: null as Error | null
}));

vi.mock("@/storage/vault-repository", () => ({
  readActivityJournal: vi.fn(async () => repositoryState.activityJournal),
  readBaseTransactions: vi.fn(async () => repositoryState.baseTransactions),
  writeActivityJournal: vi.fn(async (entries: ActivityRecord[]) => {
    repositoryState.activityJournal = entries;
  }),
  writeBaseTransactions: vi.fn(async (records: BaseTrackedTransactionRecord[]) => {
    repositoryState.baseTransactions = records;
  })
}));

vi.mock("ethers", () => ({
  JsonRpcProvider: class MockJsonRpcProvider {
    async getBlockNumber() {
      if (providerState.error) {
        throw providerState.error;
      }

      return providerState.latestBlockNumber;
    }

    async getTransactionReceipt() {
      if (providerState.error) {
        throw providerState.error;
      }

      return providerState.receipt;
    }

    async getTransaction() {
      if (providerState.error) {
        throw providerState.error;
      }

      return providerState.transaction;
    }

    async getBlock() {
      if (providerState.error) {
        throw providerState.error;
      }

      return providerState.block;
    }
  }
}));

import { BaseTransactionLifecycleService } from "@/adapters/base/services/base-transaction-lifecycle-service";

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

function createTrackedRecord(
  patch: Partial<BaseTrackedTransactionRecord> = {}
): BaseTrackedTransactionRecord {
  return {
    id: "0xtest-hash",
    networkId: "base-mainnet",
    accountId: "base-primary",
    accountAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    kind: "send",
    status: "submitted",
    title: "Sent 0.1 ETH",
    subtitle: "Broadcast by Jutis. Waiting for Base RPC visibility.",
    amount: "0.1 ETH",
    symbol: "ETH",
    usdReference: {
      value: 10,
      trustLevel: "estimated",
      sourceType: "static-reference",
      note: "Test reference"
    },
    hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    explorerUrl: "https://base.blockscout.com/tx/0x1111",
    from: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    to: "0x1111111111111111111111111111111111111111",
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:00:00.000Z",
    submittedAt: "2026-03-21T10:00:00.000Z",
    support: "real",
    source: "local",
    detail: "Locally submitted.",
    ...patch
  };
}

describe("BaseTransactionLifecycleService", () => {
  beforeEach(() => {
    repositoryState.baseTransactions = [];
    repositoryState.activityJournal = [];
    providerState.latestBlockNumber = 100;
    providerState.receipt = null;
    providerState.transaction = null;
    providerState.block = null;
    providerState.error = null;
  });

  it("moves a submitted transaction to pending once the RPC can see it", async () => {
    repositoryState.baseTransactions = [createTrackedRecord()];
    providerState.transaction = {
      hash: "0x1111111111111111111111111111111111111111111111111111111111111111"
    };

    const service = new BaseTransactionLifecycleService(BASE_NETWORK);
    const [record] = await service.reconcilePendingTransactions();

    expect(record.status).toBe("pending");
    expect(record.source).toBe("rpc");
    expect(record.subtitle).toBe("Pending confirmation");
    expect(repositoryState.baseTransactions[0]?.status).toBe("pending");
  });

  it("moves a pending transaction to confirmed once a successful receipt is available", async () => {
    repositoryState.baseTransactions = [createTrackedRecord({ status: "pending", subtitle: "Pending confirmation" })];
    providerState.receipt = {
      status: 1,
      blockNumber: 98
    };
    providerState.block = {
      timestamp: 1_700_000_000
    };

    const service = new BaseTransactionLifecycleService(BASE_NETWORK);
    const [record] = await service.reconcilePendingTransactions();

    expect(record.status).toBe("confirmed");
    expect(record.source).toBe("rpc");
    expect(record.blockNumber).toBe(98);
    expect(record.confirmations).toBe(3);
    expect(record.confirmedAt).toBe("2023-11-14T22:13:20.000Z");
  });

  it("moves a submitted transaction to failed when the onchain receipt reports a revert", async () => {
    repositoryState.baseTransactions = [createTrackedRecord()];
    providerState.receipt = {
      status: 0,
      blockNumber: 99
    };
    providerState.block = {
      timestamp: 1_700_000_000
    };

    const service = new BaseTransactionLifecycleService(BASE_NETWORK);
    const [record] = await service.reconcilePendingTransactions();

    expect(record.status).toBe("failed");
    expect(record.failureReason).toBe("The transaction was mined but reverted onchain.");
    expect(record.source).toBe("rpc");
  });
});
