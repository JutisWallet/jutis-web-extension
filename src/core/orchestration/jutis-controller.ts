import type {
  AccountRecord,
  CantonIdentity,
  CantonEnvironmentDiagnostics,
  PersistedVault,
  PortfolioSnapshot,
  ReceiveInfo,
  SendDraft,
  SendPreview,
  SubmittedTransaction,
  SwapReadiness,
  SwapQuoteRequest,
  SwapRoute,
  WalletPreferences,
  WalletVaultSecret
} from "@/core/models/types";
import { BUILT_IN_NETWORKS } from "@/core/models/fixtures";
import { BaseWalletAdapter } from "@/adapters/base/base-wallet-adapter";
import { BaseActivityIndexer } from "@/adapters/base/services/base-activity-indexer";
import { BaseSwapAdapter } from "@/adapters/base/services/base-swap-adapter";
import { BaseTransactionService } from "@/adapters/base/services/base-transaction-service";
import { CantonWalletAdapter } from "@/adapters/canton/canton-wallet-adapter";
import { CantonActivityIndexer } from "@/adapters/canton/services/canton-activity-indexer";
import { CantonReferenceDataService, type CantonFeatureMatrixEntry } from "@/adapters/canton/services/canton-reference-data-service";
import { CantonSwapAdapter } from "@/adapters/canton/services/canton-swap-adapter";
import { CantonEnvironmentService } from "@/adapters/canton/services/canton-environment-service";
import { QuoteEngine } from "@/swap/quote-engine";
import { SwapProviderRegistry } from "@/swap/swap-provider-registry";
import { UsdReferenceService } from "@/core/services/usd-reference-service";
import { VaultService } from "@/core/services/vault-service";
import { NetworkRegistry } from "@/core/services/network-registry";
import {
  readActivityJournal,
  readCantonIdentity,
  readFeatureFlags,
  readPreferences,
  writeActivityJournal,
  writeCantonIdentity,
  writeFeatureFlags,
  writePreferences
} from "@/storage/vault-repository";

export class JutisController {
  readonly vaultService = new VaultService();
  readonly networkRegistry = new NetworkRegistry(BUILT_IN_NETWORKS);

  private readonly baseAdapter = new BaseWalletAdapter(this.networkRegistry.get("base-mainnet"));
  private readonly baseActivityIndexer = new BaseActivityIndexer(this.networkRegistry.get("base-mainnet"));
  private readonly baseTransactionService = new BaseTransactionService(
    this.baseAdapter,
    this.baseActivityIndexer.getLifecycleService()
  );
  private readonly cantonAdapter = new CantonWalletAdapter(this.networkRegistry.get("canton-mainnet"));
  private readonly cantonActivityIndexer = new CantonActivityIndexer();
  private readonly cantonReferenceDataService = new CantonReferenceDataService();
  private readonly cantonEnvironmentService = new CantonEnvironmentService();
  private readonly usdReferenceService = new UsdReferenceService();
  private readonly quoteEngine: QuoteEngine;

  constructor() {
    const registry = new SwapProviderRegistry();
    registry.register(new BaseSwapAdapter());
    registry.register(new CantonSwapAdapter());
    this.quoteEngine = new QuoteEngine(registry);
  }

  listNetworks() {
    return this.networkRegistry.list();
  }

  async readPreferences(): Promise<WalletPreferences> {
    return readPreferences();
  }

  async writePreferences(next: WalletPreferences): Promise<void> {
    await writePreferences(next);
  }

  async readFeatureFlags() {
    return readFeatureFlags();
  }

  async writeFeatureFlags(next: Awaited<ReturnType<typeof readFeatureFlags>>): Promise<void> {
    await writeFeatureFlags(next);
  }

  async readCantonIdentity(): Promise<CantonIdentity> {
    return readCantonIdentity();
  }

  async writeCantonIdentity(next: CantonIdentity): Promise<void> {
    await writeCantonIdentity(next);
  }

  async createVaultFromMnemonic(password: string): Promise<PersistedVault> {
    return this.vaultService.createFromRandomMnemonic(password);
  }

  async importVaultFromMnemonic(password: string, mnemonic: string): Promise<PersistedVault> {
    return this.vaultService.createFromMnemonic(password, mnemonic);
  }

  async importVaultFromPrivateKey(password: string, privateKey: `0x${string}`): Promise<PersistedVault> {
    return this.vaultService.createFromPrivateKey(password, privateKey);
  }

  async unlockVault(password: string): Promise<WalletVaultSecret> {
    return this.vaultService.unlock(password);
  }

  async loadPortfolio(secret: WalletVaultSecret | null, cantonIdentity: CantonIdentity | null): Promise<PortfolioSnapshot> {
    const [baseAccounts, cantonAccounts] = await Promise.all([
      this.baseAdapter.getAccounts(secret, cantonIdentity),
      this.cantonAdapter.getAccounts(secret, cantonIdentity)
    ]);
    const [baseAssets, cantonAssets] = await Promise.all([
      this.baseAdapter.getAssets(secret, cantonIdentity),
      this.cantonAdapter.getAssets(secret, cantonIdentity)
    ]);
    const [baseActivity, localJournal, cantonActivity] = await Promise.all([
      this.baseActivityIndexer.list(baseAccounts),
      readActivityJournal(),
      this.cantonActivityIndexer.list()
    ]);

    const accounts = [...cantonAccounts, ...baseAccounts];
    const assets = [...cantonAssets, ...baseAssets];
    const activity = [...localJournal.filter((entry) => entry.networkId !== "base-mainnet"), ...baseActivity, ...cantonActivity].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
    const totalUsdReference = this.usdReferenceService.aggregate(
      assets.map((asset) => asset.usdReference),
      "Portfolio USD is only shown when every visible asset has a usable reference."
    );

    return {
      totalUsdReference,
      byNetwork: this.networkRegistry.list().map((network) => ({
        networkId: network.id,
        totalUsdReference: this.usdReferenceService.aggregate(
          assets.filter((asset) => asset.networkId === network.id).map((asset) => asset.usdReference),
          `${network.name} USD is only shown when every visible asset on that network has a usable reference.`
        ),
        support: network.support
      })),
      accounts,
      assets,
      activity
    };
  }

  async getReceiveInfo(account: AccountRecord): Promise<ReceiveInfo> {
    if (account.networkId === "base-mainnet") {
      return this.baseAdapter.getReceiveInfo(account);
    }

    return this.cantonAdapter.getReceiveInfo(account);
  }

  async previewSend(secret: WalletVaultSecret | null, draft: SendDraft, snapshot: PortfolioSnapshot): Promise<SendPreview> {
    const assets = snapshot.assets.filter((asset) => asset.networkId === draft.networkId);

    if (draft.networkId === "base-mainnet") {
      return this.baseAdapter.getSendPreview(secret, draft, assets);
    }

    return this.cantonAdapter.getSendPreview(secret, draft, assets);
  }

  async submitSend(secret: WalletVaultSecret | null, draft: SendDraft, preview: SendPreview): Promise<SubmittedTransaction> {
    const result =
      draft.networkId === "base-mainnet"
        ? await this.baseTransactionService.submit(secret, draft, preview)
        : await this.cantonAdapter.submitSend(secret, draft, preview);

    if (draft.networkId === "base-mainnet") {
      return result;
    }

    const journalEntry = {
      id: result.id,
      networkId: draft.networkId,
      accountId: draft.networkId === "base-mainnet" ? "base-primary" : "canton-primary",
      kind: "send" as const,
      status: result.status,
      title: `Sent ${draft.amount} ${preview.asset.symbol}`,
      subtitle: preview.to,
      amount: `${draft.amount} ${preview.asset.symbol}`,
      symbol: preview.asset.symbol,
      usdReference: preview.usdReference,
      hash: result.hash,
      explorerUrl: result.explorerUrl,
      from: draft.networkId === "base-mainnet" ? "Local Base vault" : "Linked Canton party",
      to: preview.to,
      createdAt: new Date().toISOString(),
      support: preview.support,
      source: "local" as const,
      detail: result.note
    };
    const existing = await readActivityJournal();
    await writeActivityJournal([journalEntry, ...existing]);

    return result;
  }

  async reconcileBackgroundActivity(): Promise<void> {
    await this.baseActivityIndexer.reconcilePendingTransactions();
  }

  async hasPendingBackgroundActivity(): Promise<boolean> {
    return this.baseActivityIndexer.hasPendingTransactions();
  }

  getCantonFeatureMatrix(identity: CantonIdentity): CantonFeatureMatrixEntry[] {
    const holdingsReadiness = this.cantonAdapter.holdingsService.getLastReadiness();
    return this.cantonReferenceDataService.getFeatureMatrix(identity, holdingsReadiness);
  }

  getCantonIdentitySummary(identity: CantonIdentity) {
    return this.cantonReferenceDataService.getIdentitySummary(identity);
  }

  async diagnoseCantonEnvironment(identity: CantonIdentity): Promise<CantonEnvironmentDiagnostics> {
    return this.cantonEnvironmentService.diagnose(identity);
  }

  getSwapReadiness(networkId: string): SwapReadiness {
    return this.quoteEngine.getReadiness(networkId);
  }

  async getSwapQuotes(request: SwapQuoteRequest): Promise<SwapRoute[]> {
    return this.quoteEngine.getQuotes(request);
  }

  getSupportNotes(networkId: string): string[] {
    if (networkId === "base-mainnet") {
      return this.baseAdapter.getSupportNotes();
    }

    return this.cantonAdapter.getSupportNotes();
  }
}
