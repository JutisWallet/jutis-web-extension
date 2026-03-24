export type NetworkKind = "canton" | "evm";
export type AdapterSupportLevel = "real" | "partial" | "mocked" | "unsupported";
export type ProductSupportState = "live" | "partial" | "reference-only" | "unsupported";
export type TransactionStatus = "created" | "submitted" | "pending" | "confirmed" | "failed";
export type ActivityKind = "send" | "receive" | "swap" | "approval" | "system";
export type UsdTrustLevel = "live" | "stale" | "estimated" | "demo" | "unavailable";
export type PriceSourceType =
  | "market-feed"
  | "cached-market-feed"
  | "static-reference"
  | "demo-reference"
  | "composite"
  | "none";
export type SwapQuoteTruth = "live" | "simulated" | "reference-only" | "none";
export type SwapExecutionReadiness = "ready" | "blocked" | "unsupported";

/**
 * Canton holdings readiness — reflects the result of probing the configured scanApiUrl.
 * Only "live" means live Canton holdings are being returned. All other states
 * mean the source is not live and holdings should be treated accordingly.
 */
export type CantonHoldingsReadiness =
  /** No scanApiUrl is configured. Demo fixtures are shown. */
  | "demo"
  /** scanApiUrl is configured but URL format is invalid (not a valid https?:// URL). */
  | "malformed"
  /** scanApiUrl is configured and valid but the endpoint is unreachable or timed out. */
  | "unreachable"
  /** scanApiUrl is configured and reached but returned 401/403 — authentication required or invalid token. */
  | "unauthorized"
  /** scanApiUrl responded but the payload shape does not match the expected { accounts: [] } structure. */
  | "invalid-payload"
  /** scanApiUrl responded with a valid payload containing at least one account. Holdings are live. */
  | "live";

/**
 * Honest Canton environment readiness — only "read-only-verified" means a real
 * Canton environment has been confirmed with DSO identity and party visibility.
 *
 * State progression (must be reached in order):
 *   unconfigured             — no endpoints configured at all
 *   endpoint-configured      — URLs configured but not yet probed
 *   validator-confirmed      — validator /version responded with valid Canton info
 *   scan-confirmed           — scan endpoint confirmed (direct or via scan-proxy)
 *   dso-confirmed           — DSO party id successfully retrieved from environment
 *   party-visible           — linked partyId confirmed present in scan data
 *   read-only-verified      — DSO + party visible: read-only live Canton wallet is active
 *
 * No state above "unconfigured" implies send or activity is enabled.
 */
export type CantonEnvironmentReadiness =
  /** No scan, validator, or ledger URLs configured. Demo mode. */
  | "unconfigured"
  /** URLs configured but not yet probed. */
  | "endpoint-configured"
  /** Validator /version responded with valid Canton version info. */
  | "validator-confirmed"
  /** Scan endpoint confirmed reachable (direct scan or via scan-proxy path). */
  | "scan-confirmed"
  /** DSO party id successfully retrieved from /v0/dso-party-id or scan-proxy path. */
  | "dso-confirmed"
  /** Linked partyId is confirmed present in the scan/scan-proxy account data. */
  | "party-visible"
  /**
   * Full read-only verification achieved: validator confirmed, DSO retrieved,
   * and linked party is visible in scan/scan-proxy.
   * This is the only state in which holdings should be treated as genuinely live.
   */
  | "read-only-verified";

/**
 * Kinds of Canton endpoints as identified by probing.
 */
export type CantonEndpointKind =
  /** Endpoint not yet probed or not configured. */
  | "unknown"
  /** Endpoint responded to /version — confirmed as a Canton validator app. */
  | "validator"
  /** Endpoint responded to scan or scan-proxy paths — confirmed as Canton participant/scan. */
  | "scan"
  /** Endpoint confirmed as a Canton ledger API. */
  | "ledger"
  /** Endpoint responded but did not match any known Canton endpoint pattern. */
  | "unrecognized";

/**
 * Result of probing a single Canton endpoint.
 */
export type EndpointReachability =
  | "not-configured"
  | "malformed"
  | "unreachable"
  | "unauthorized"
  | "invalid-response"
  | "reachable";

export interface EndpointDiagnostics {
  /** The URL that was probed (null if not configured). */
  url: string | null;
  /** Whether an auth token was included in the probe request. */
  authToken: boolean;
  /** What kind of Canton endpoint was identified. */
  endpointKind: CantonEndpointKind;
  /** Reachability status. */
  reachability: EndpointReachability;
  /** Human-readable detail from the probe. */
  detail: string;
  /** Version string from /version if available. */
  version: string | null;
  /** Whether this endpoint has been probed. */
  probed: boolean;
}

/**
 * Full Canton environment diagnostics — the result of running real Canton environment
 * verification against configured endpoints.
 */
export interface CantonEnvironmentDiagnostics {
  /** Scan endpoint diagnostics (direct scan URL). */
  scan: EndpointDiagnostics;
  /** Validator app diagnostics. */
  validator: EndpointDiagnostics;
  /** Ledger API diagnostics. */
  ledger: EndpointDiagnostics;
  /** Scan-proxy URL derived from the validator app (if discovered). */
  scanProxyUrl: string | null;
  /** Overall environment readiness. */
  readiness: CantonEnvironmentReadiness;
  /**
   * DSO party id retrieved from the environment.
   * Retrieved from /v0/dso-party-id on the validator, or from scan-proxy if available.
   * Null until dso-confirmed state is reached.
   */
  dsoPartyId: string | null;
  /**
   * Whether the linked partyId was found in the scan/scan-proxy account data.
   * Only meaningful after scan-confirmed state.
   */
  partyVisible: boolean;
  /**
   * Whether the environment has been fully verified for read-only use.
   * True only when readiness === "read-only-verified".
   */
  readOnlyVerified: boolean;
  /** Human-readable summary of the full diagnostic result. */
  summary: string;
}

export type SwapLifecycleState =
  | "idle"
  | "quoting"
  | "quoted"
  | "reviewing"
  | "approval-required"
  | "executing"
  | "submitted"
  | "pending"
  | "confirmed"
  | "failed"
  | "unsupported";

export interface NetworkConfig {
  id: string;
  name: string;
  kind: NetworkKind;
  symbol: string;
  accentColor: string;
  explorerUrl?: string;
  rpcUrl?: string;
  chainId?: number;
  builtIn: boolean;
  testnet: boolean;
  support: AdapterSupportLevel;
}

export interface CantonCapabilities {
  canReadHoldings: boolean;
  canReadActivity: boolean;
  canPrepareTransfers: boolean;
  canSubmitTransfers: boolean;
  canQuoteSwaps: boolean;
  canExecuteSwaps: boolean;
  canResolveNames: boolean;
}

export interface WalletVaultSecret {
  baseMnemonic?: string;
  basePrivateKey?: `0x${string}`;
}

export interface PersistedVault {
  version: 1;
  cipherText: string;
  iv: string;
  salt: string;
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  version: 1;
  secret: WalletVaultSecret;
  unlockedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  autoLockMinutes: number;
}

export interface SessionSnapshot {
  status: "locked" | "unlocked";
  unlockedAt?: string;
  lastActivityAt?: string;
  expiresAt?: string;
  autoLockMinutes?: number;
}

export interface CantonIdentity {
  networkId: string;
  partyId: string | null;
  displayName?: string;
  authMode: "unlinked" | "validator-jwt" | "external-party" | "wallet-session" | "mock";
  /** Optional Bearer token for authenticated scan API reads. */
  scanAuthToken?: string;
  /** Optional Bearer token for authenticated validator API calls. */
  validatorAuthToken?: string;
  /** Optional Bearer token for authenticated ledger API calls (transfer submission). */
  ledgerAuthToken?: string;
  scanApiUrl?: string;
  validatorApiUrl?: string;
  ledgerApiUrl?: string;
  /**
   * Environment profile label: "local-dev" | "operator-hosted" | "custom" | undefined.
   * Display-only hint about the source of this environment configuration.
   * Does not affect probe behavior.
   */
  cantonEnvironmentProfile?: string;
  capabilities: CantonCapabilities;
  support: AdapterSupportLevel;
}

export interface AccountRecord {
  id: string;
  networkId: string;
  label: string;
  address?: `0x${string}`;
  partyId?: string;
  shortId: string;
  support: AdapterSupportLevel;
}

export interface UsdReference {
  value: number | null;
  trustLevel: UsdTrustLevel;
  sourceType: PriceSourceType;
  asOf?: string;
  staleAt?: string;
  note?: string;
}

export interface AssetRecord {
  id: string;
  networkId: string;
  symbol: string;
  name: string;
  amount: string;
  decimals: number;
  usdReference: UsdReference;
  change24h?: number;
  isPrimary?: boolean;
  visible: boolean;
  verified: boolean;
  support: AdapterSupportLevel;
  kind: "native" | "erc20" | "canton";
  contractAddress?: `0x${string}`;
  instrumentAdmin?: string;
}

export interface ActivityRecord {
  id: string;
  networkId: string;
  accountId: string;
  kind: ActivityKind;
  status: TransactionStatus;
  title: string;
  subtitle: string;
  amount?: string;
  symbol?: string;
  usdReference?: UsdReference;
  hash?: string;
  explorerUrl?: string;
  from?: string;
  to?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  confirmations?: number;
  blockNumber?: number;
  failureReason?: string;
  support: AdapterSupportLevel;
  source: "local" | "scan" | "validator" | "rpc" | "mock";
  detail?: string;
}

export interface BaseTrackedTransactionRecord extends ActivityRecord {
  networkId: "base-mainnet";
  hash: `0x${string}`;
  accountAddress: `0x${string}`;
  submittedAt: string;
}

export interface PortfolioSnapshot {
  totalUsdReference: UsdReference;
  byNetwork: Array<{
    networkId: string;
    totalUsdReference: UsdReference;
    support: AdapterSupportLevel;
  }>;
  accounts: AccountRecord[];
  assets: AssetRecord[];
  activity: ActivityRecord[];
}

export interface SendDraft {
  networkId: string;
  assetId: string;
  to: string;
  amount: string;
}

export interface SendPreview {
  networkId: string;
  asset: AssetRecord;
  to: string;
  amount: string;
  usdReference: UsdReference;
  estimatedFeeNative: string | null;
  estimatedFeeUsdReference: UsdReference;
  warnings: string[];
  support: AdapterSupportLevel;
}

export interface SubmittedTransaction {
  id: string;
  networkId: string;
  status: TransactionStatus;
  hash?: string;
  explorerUrl?: string;
  note?: string;
}

export interface ReceiveInfo {
  networkId: string;
  label: string;
  value: string;
  note: string;
}

export interface SwapQuoteRequest {
  networkId: string;
  fromAssetId: string;
  toAssetId: string;
  amount: string;
  slippageBps: number;
}

export interface SwapExecutionStep {
  id: string;
  label: string;
  type: "approval" | "swap" | "canton-settlement" | "review";
  status: "pending" | "ready" | "submitted" | "confirmed" | "failed" | "unsupported";
  note?: string;
}

export interface SwapRoute {
  id: string;
  networkId: string;
  providerId: string;
  providerLabel: string;
  fromAssetId: string;
  toAssetId: string;
  inputAmount: string;
  outputAmount: string;
  estimatedFeeUsdReference: UsdReference;
  priceImpactBps: number;
  slippageBps: number;
  support: AdapterSupportLevel;
  warnings: string[];
  steps: SwapExecutionStep[];
}

export interface SwapProviderStatus {
  providerId: string;
  providerLabel: string;
  networkId: string;
  quoteTruth: SwapQuoteTruth;
  executionReadiness: SwapExecutionReadiness;
  publicClaimReady: boolean;
  note: string;
  blockers: string[];
}

export interface SwapReadiness {
  networkId: string;
  canRequestQuotes: boolean;
  canExecute: boolean;
  publicClaimReady: boolean;
  summary: string;
  blockers: string[];
  providers: SwapProviderStatus[];
}

export interface SwapSession {
  state: SwapLifecycleState;
  request: SwapQuoteRequest;
  routes: SwapRoute[];
  selectedRouteId?: string;
  lastUpdatedAt: string;
}

export interface WalletPreferences {
  selectedNetworkId: string;
  selectedCurrency: "USD";
  autoLockMinutes: number;
  developerMode: boolean;
  showMockData: boolean;
  visibleAssetIds: string[];
}

export interface FeatureFlags {
  cantonReferenceMode: boolean;
  baseExplorerEnrichment: boolean;
  experimentalEvmCustomNetworks: boolean;
  experimentalCantonNames: boolean;
  cantonOnlyMode: boolean;
}

export interface WalletNetworkAdapter {
  readonly network: NetworkConfig;
  getAccounts(secret: WalletVaultSecret | null, cantonIdentity: CantonIdentity | null): Promise<AccountRecord[]>;
  getAssets(secret: WalletVaultSecret | null, cantonIdentity: CantonIdentity | null): Promise<AssetRecord[]>;
  getActivity(accounts: AccountRecord[]): Promise<ActivityRecord[]>;
  getReceiveInfo(account: AccountRecord): Promise<ReceiveInfo>;
  getSendPreview(secret: WalletVaultSecret | null, draft: SendDraft, assets: AssetRecord[]): Promise<SendPreview>;
  submitSend(
    secret: WalletVaultSecret | null,
    draft: SendDraft,
    preview: SendPreview
  ): Promise<SubmittedTransaction>;
  getSupportNotes(): string[];
}
