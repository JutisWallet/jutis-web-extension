import type {
  ActivityRecord,
  AssetRecord,
  CantonCapabilities,
  CantonIdentity,
  FeatureFlags,
  NetworkConfig,
  UsdReference,
  WalletPreferences
} from "@/core/models/types";

export const BUILT_IN_NETWORKS: NetworkConfig[] = [
  {
    id: "canton-mainnet",
    name: "Canton",
    kind: "canton",
    symbol: "CC",
    accentColor: "#dce87a",
    explorerUrl: "https://sync.global/",
    builtIn: true,
    testnet: false,
    support: "partial"
  },
  {
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
  }
];

export const DEFAULT_CANTON_CAPABILITIES: CantonCapabilities = {
  canReadHoldings: true,
  canReadActivity: true,
  canPrepareTransfers: true,
  canSubmitTransfers: false,
  canQuoteSwaps: true,
  canExecuteSwaps: false,
  canResolveNames: false
};

export const DEFAULT_CANTON_IDENTITY: CantonIdentity = {
  networkId: "canton-mainnet",
  partyId: null,
  authMode: "mock",
  capabilities: DEFAULT_CANTON_CAPABILITIES,
  support: "partial"
};

export const DEFAULT_PREFERENCES: WalletPreferences = {
  selectedNetworkId: "canton-mainnet",
  selectedCurrency: "USD",
  autoLockMinutes: 15,
  developerMode: true,
  showMockData: true,
  visibleAssetIds: []
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  cantonReferenceMode: true,
  baseExplorerEnrichment: false,
  experimentalEvmCustomNetworks: false,
  experimentalCantonNames: false,
  cantonOnlyMode: true  // When true, Base is hidden from the UI and locked from selection
};

function demoUsdReference(value: number, note?: string): UsdReference {
  return {
    value,
    trustLevel: "demo",
    sourceType: "demo-reference",
    asOf: new Date().toISOString(),
    note: note ?? "Demo USD reference from fixture data. Not live market pricing."
  };
}

export const CANTON_DEMO_ASSETS: AssetRecord[] = [
  {
    id: "canton-cc",
    networkId: "canton-mainnet",
    symbol: "CC",
    name: "Canton Coin",
    amount: "1240.00",
    decimals: 2,
    usdReference: demoUsdReference(1240, "Demo CC valuation from fixture data. Not live Canton reference data."),
    change24h: 2.4,
    isPrimary: true,
    visible: true,
    verified: true,
    support: "mocked",
    kind: "canton",
    instrumentAdmin: "dso::mainnet"
  },
  {
    id: "canton-usdc",
    networkId: "canton-mainnet",
    symbol: "USDC",
    name: "USDC (Canton)",
    amount: "500.00",
    decimals: 2,
    usdReference: demoUsdReference(500, "Demo USDC valuation from fixture data. Not live settlement or market data."),
    visible: true,
    verified: true,
    support: "mocked",
    kind: "canton",
    instrumentAdmin: "circle::xreserve"
  }
];

export const CANTON_DEMO_ACTIVITY: ActivityRecord[] = [
  {
    id: "canton-activity-1",
    networkId: "canton-mainnet",
    accountId: "canton-primary",
    kind: "receive",
    status: "confirmed",
    title: "Received CC",
    subtitle: "Visible through scan-backed demo data",
    amount: "120 CC",
    symbol: "CC",
    usdReference: demoUsdReference(120),
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    support: "mocked",
    source: "mock"
  },
  {
    id: "canton-activity-2",
    networkId: "canton-mainnet",
    accountId: "canton-primary",
    kind: "send",
    status: "pending",
    title: "Transfer review prepared",
    subtitle: "Awaiting real ledger submission capability",
    amount: "50 CC",
    symbol: "CC",
    usdReference: demoUsdReference(50),
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    support: "partial",
    source: "local"
  }
];
