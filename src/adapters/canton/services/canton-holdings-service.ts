import type { AssetRecord, CantonIdentity, CantonHoldingsReadiness } from "@/core/models/types";
import { CANTON_DEMO_ASSETS } from "@/core/models/fixtures";

/**
 * CantonHoldingsService
 *
 * Reads Canton holdings from a configured scan API, with honest capability tracking.
 *
 * Readiness states (in order of evaluation):
 *   demo          — no scanApiUrl configured; demo fixtures returned
 *   malformed     — scanApiUrl is not a valid https?:// URL
 *   unreachable   — endpoint did not respond (network error or timeout)
 *   unauthorized  — endpoint responded with 401 or 403
 *   invalid-payload — endpoint responded but payload shape is wrong
 *   live          — endpoint responded with valid { accounts: [...] } containing at least one account
 *
 * Auth: If scanAuthToken is set, an Authorization: Bearer {token} header is attached.
 * Only "live" means live Canton holdings are actually being returned. All other states
 * return demo fixtures with the appropriate support label so the UI is never misleading.
 */
export class CantonHoldingsService {
  /**
   * Last known readiness state. Re-evaluated on every getAssets() call.
   * Not persisted — recalculated from live probe each time.
   */
  private lastReadiness: CantonHoldingsReadiness = "demo";

  /**
   * Validate that a given string is a potentially reachable URL.
   * Returns true for http:// and https:// URLs with a non-empty host.
   */
  isValidScanUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Probe the configured scanApiUrl to determine its current readiness state.
   * Does not mutate any state — callers use the result to decide what to return.
   *
   * Sets this.lastReadiness as a side effect.
   */
  async probe(
    scanApiUrl: string,
    partyId: string,
    authToken?: string
  ): Promise<CantonHoldingsReadiness> {
    // Step 1: URL format check
    if (!this.isValidScanUrl(scanApiUrl)) {
      this.lastReadiness = "malformed";
      return this.lastReadiness;
    }

    const baseUrl = scanApiUrl.replace(/\/$/, "");
    const url = `${baseUrl}/api/v1/accounts?party=${encodeURIComponent(partyId)}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000)
      });
    } catch (err) {
      // Network unreachable or timeout
      console.warn(
        `[CantonHoldingsService] Endpoint unreachable for party ${partyId}: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
      this.lastReadiness = "unreachable";
      return this.lastReadiness;
    }

    // Step 3: Auth check
    if (response.status === 401 || response.status === 403) {
      console.warn(
        `[CantonHoldingsService] Endpoint unauthorized (${response.status}) for party ${partyId}. ` +
          `Attach a valid scanAuthToken to access live holdings.`
      );
      this.lastReadiness = "unauthorized";
      return this.lastReadiness;
    }

    // Step 4: Non-OK status
    if (!response.ok) {
      console.warn(
        `[CantonHoldingsService] Endpoint returned HTTP ${response.status} for party ${partyId}. ` +
          `Falling back to demo holdings.`
      );
      this.lastReadiness = "unreachable";
      return this.lastReadiness;
    }

    // Step 5: Parse and validate payload shape
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      console.warn(
        `[CantonHoldingsService] Endpoint returned invalid JSON for party ${partyId}. ` +
          `Falling back to demo holdings.`
      );
      this.lastReadiness = "invalid-payload";
      return this.lastReadiness;
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !Array.isArray((data as Record<string, unknown>)["accounts"])
    ) {
      console.warn(
        `[CantonHoldingsService] Endpoint returned unexpected payload shape for party ${partyId}. ` +
          `Expected { accounts: [...] }, got: ${JSON.stringify(data).slice(0, 200)}`
      );
      this.lastReadiness = "invalid-payload";
      return this.lastReadiness;
    }

    const accounts = (data as { accounts: unknown[] })["accounts"];

    // Step 6: Check for at least one account
    if (accounts.length === 0) {
      console.warn(
        `[CantonHoldingsService] Endpoint returned empty accounts array for party ${partyId}. ` +
          `Treating as unavailable — demo holdings shown.`
      );
      this.lastReadiness = "invalid-payload";
      return this.lastReadiness;
    }

    // Step 7: All checks passed — live
    this.lastReadiness = "live";
    return this.lastReadiness;
  }

  /**
   * Returns the last known readiness state from a prior probe().
   * Returns "demo" if probe() has never been called.
   */
  getLastReadiness(): CantonHoldingsReadiness {
    return this.lastReadiness;
  }

  /**
   * Get Canton assets. Always returns a valid AssetRecord[].
   *
   * Logic:
   * - No scanApiUrl configured → "demo" readiness → demo fixtures with support "mocked"
   * - scanApiUrl malformed     → "malformed" readiness → demo fixtures with support "unsupported"
   * - probe() returns non-live → demo fixtures with support "unsupported"
   * - probe() returns "live"  → normalize live accounts with support "live"
   *
   * Auth token is forwarded to probe() so it can be used in the fetch request.
   */
  async getAssets(identity: CantonIdentity): Promise<AssetRecord[]> {
    const scanApiUrl = identity.scanApiUrl;
    const partyId = identity.partyId;
    const authToken = identity.scanAuthToken;

    // No live source configured — demo mode
    if (!scanApiUrl || !partyId) {
      this.lastReadiness = "demo";
      return this.buildDemoAssets("mocked");
    }

    // Check URL format before attempting network call
    if (!this.isValidScanUrl(scanApiUrl)) {
      this.lastReadiness = "malformed";
      return this.buildDemoAssets("unsupported");
    }

    // Probe the endpoint to determine actual readiness
    const readiness = await this.probe(scanApiUrl, partyId, authToken);

    // Not live — return demo fixtures labeled appropriately
    if (readiness !== "live") {
      return this.buildDemoAssets("unsupported");
    }

    // Live — refetch accounts and normalize them
    const accounts = await this.fetchLiveAccounts(scanApiUrl, partyId, authToken);
    if (!accounts || accounts.length === 0) {
      this.lastReadiness = "invalid-payload";
      return this.buildDemoAssets("unsupported");
    }

    return this.normalizeLiveAccounts(accounts);
  }

  /**
   * Fetch raw live account records from the Canton scan API.
   * Returns null on any error.
   */
  private async fetchLiveAccounts(
    scanApiUrl: string,
    partyId: string,
    authToken?: string
  ): Promise<CantonLiveAccount[] | null> {
    const baseUrl = scanApiUrl.replace(/\/$/, "");
    const url = `${baseUrl}/api/v1/accounts?party=${encodeURIComponent(partyId)}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) return null;

      const data = (await response.json()) as CantonHoldingsApiResponse;
      return data.accounts ?? null;
    } catch {
      return null;
    }
  }

  private buildDemoAssets(support: AssetRecord["support"]): AssetRecord[] {
    return CANTON_DEMO_ASSETS.map((asset) => ({
      ...asset,
      support
    })) as AssetRecord[];
  }

  private normalizeLiveAccounts(accounts: CantonLiveAccount[]): AssetRecord[] {
    return accounts.map((account) => {
      const amount = account.balance ?? "0";
      const symbol = account.assetId ?? "UNKNOWN";
      const usdValue = this.parseUsdValue(account.usdValue);

      return {
        id: `canton::${account.id}`,
        networkId: "canton-mainnet",
        symbol: symbol.toUpperCase(),
        name: account.name ?? symbol,
        amount,
        decimals: account.decimals ?? 2,
        usdReference: {
          value: usdValue,
          trustLevel: "live" as const,
          sourceType: "market-feed" as const,
          asOf: new Date().toISOString(),
          note: "Live Canton holdings from configured scan API."
        },
        change24h: 0,
        isPrimary: symbol.toLowerCase() === "cc",
        visible: true,
        verified: true,
        support: "real" as const,
        kind: "canton" as const,
        instrumentAdmin: account.instrumentAdmin ?? `canton::${account.id}`
      } satisfies AssetRecord;
    });
  }

  private parseUsdValue(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

interface CantonHoldingsApiResponse {
  accounts?: CantonLiveAccount[];
}

export interface CantonLiveAccount {
  id: string;
  assetId: string;
  balance: string;
  name?: string;
  decimals?: number;
  usdValue?: number | string;
  instrumentAdmin?: string;
}
