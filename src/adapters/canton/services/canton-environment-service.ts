import type {
  CantonIdentity,
  CantonEnvironmentDiagnostics,
  CantonEnvironmentReadiness,
  EndpointDiagnostics,
  EndpointReachability,
  CantonEndpointKind
} from "@/core/models/types";

/**
 * CantonEnvironmentService
 *
 * Performs real Canton environment verification against operator-supplied endpoint URLs.
 *
 * Verification philosophy:
 * - A configured URL is not a verified endpoint — it must respond correctly to probes
 * - DSO party id must be retrieved from the environment before declaring read-only verified
 * - Party visibility requires confirmation from scan or scan-proxy account data
 * - Only "read-only-verified" means holdings can be treated as genuinely live
 *
 * Known Canton endpoint paths:
 * - Validator /version         → GET /version returns Canton version JSON
 * - Validator DSO party id     → GET /v0/dso-party-id
 * - Validator scan-proxy       → derived as {validatorUrl}/v0/scan-proxy
 * - Scan DSO party id         → GET /v0/scan-proxy/dso-party-id
 * - Scan accounts (v0)        → GET /v0/scan-proxy/accounts?party={partyId} or /v0/accounts?party={partyId}
 *
 * This service does NOT perform send/submit. It is read-only diagnostics only.
 */
export class CantonEnvironmentService {
  /**
   * Validate that a string is a potentially reachable http/https URL.
   */
  isValidUrl(url: string | undefined | null): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Build auth headers object if a token is provided.
   */
  private buildHeaders(authToken: string | null | undefined): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return headers;
  }

  /**
   * Probe a URL with a GET request and 8s timeout.
   * Returns null if the request fails in any way.
   */
  private async safeFetch(
    url: string,
    headers: Record<string, string>
  ): Promise<Response | null> {
    try {
      return await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      return null;
    }
  }

  /**
   * Probe the validator app endpoint.
   * Strategy: GET /version — a Canton validator app responds with version JSON.
   * Returns EndpointDiagnostics with endpointKind = "validator" if successful.
   */
  private async probeValidator(
    url: string | null | undefined,
    authToken: string | null | undefined
  ): Promise<EndpointDiagnostics> {
    const base = this.defaultDiag(url, authToken);

    if (!url) {
      base.reachability = "not-configured";
      base.detail = "No validator URL configured";
      return base;
    }

    if (!this.isValidUrl(url)) {
      base.reachability = "malformed";
      base.detail = "Not a valid http/https URL";
      return base;
    }

    const probeUrl = `${url.replace(/\/$/, "")}/version`;
    const response = await this.safeFetch(probeUrl, this.buildHeaders(authToken));

    if (!response) {
      base.reachability = "unreachable";
      base.detail = "Network error or timeout";
      base.probed = true;
      return base;
    }

    if (response.status === 401 || response.status === 403) {
      base.reachability = "unauthorized";
      base.detail = `HTTP ${response.status}`;
      base.probed = true;
      return base;
    }

    if (!response.ok) {
      base.reachability = "invalid-response";
      base.detail = `HTTP ${response.status}`;
      base.probed = true;
      return base;
    }

    // Try to parse version JSON
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      base.reachability = "invalid-response";
      base.detail = "Non-JSON response from /version";
      base.probed = true;
      return base;
    }

    const obj = body as Record<string, unknown>;
    const version = typeof obj["version"] === "string" ? obj["version"] : null;
    const product = typeof obj["product"] === "string" ? obj["product"] : null;

    base.reachability = "reachable";
    base.endpointKind = "validator";
    base.version = version;
    base.detail = product
      ? `Canton ${product}${version ? " v" + version : ""}`
      : version
        ? `Canton v${version}`
        : "Canton validator app";
    base.probed = true;
    return base;
  }

  /**
   * Probe a direct scan URL.
   * Probes /v0/accounts or /api/v0/accounts (Canton v2+ style) to identify as a scan endpoint.
   */
  private async probeScan(
    url: string | null | undefined,
    authToken: string | null | undefined,
    partyId: string | null
  ): Promise<EndpointDiagnostics> {
    const base = this.defaultDiag(url, authToken);

    if (!url) {
      base.reachability = "not-configured";
      base.detail = "No scan URL configured";
      return base;
    }

    if (!this.isValidUrl(url)) {
      base.reachability = "malformed";
      base.detail = "Not a valid http/https URL";
      return base;
    }

    const baseUrl = url.replace(/\/$/, "");
    // Try v0 paths first (Canton 2.x style), then api/v1 (older style)
    const paths = [
      partyId
        ? `/v0/accounts?party=${encodeURIComponent(partyId)}`
        : "/v0/accounts",
      partyId
        ? `/api/v0/accounts?party=${encodeURIComponent(partyId)}`
        : "/api/v0/accounts",
      partyId
        ? `/api/v1/accounts?party=${encodeURIComponent(partyId)}`
        : "/api/v1/accounts"
    ];

    const headers = this.buildHeaders(authToken);
    let lastError = "No valid Canton scan path found";

    for (const path of paths) {
      const response = await this.safeFetch(`${baseUrl}${path}`, headers);
      if (!response) continue;

      if (response.status === 401 || response.status === 403) {
        base.reachability = "unauthorized";
        base.detail = `HTTP ${response.status}`;
        base.probed = true;
        return base;
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        lastError = "Non-JSON response";
        continue;
      }

      const obj = body as Record<string, unknown>;
      if (typeof obj !== "object" || obj === null) {
        lastError = "Unexpected response shape";
        continue;
      }

      // Confirmed as a Canton scan endpoint
      base.reachability = "reachable";
      base.endpointKind = "scan";

      // Try to count accounts for party visibility signal
      const accounts = obj["accounts"];
      if (Array.isArray(accounts)) {
        base.detail =
          accounts.length > 0
            ? `Scan confirmed — ${accounts.length} account(s) found`
            : "Scan confirmed — no accounts found";
      } else {
        base.detail = "Scan confirmed";
      }

      base.probed = true;
      return base;
    }

    // Exhausted all paths without success
    base.reachability = "invalid-response";
    base.detail = lastError;
    base.probed = true;
    return base;
  }

  /**
   * Probe the scan-proxy path derived from the validator URL.
   * The scan-proxy sits at {validatorUrl}/v0/scan-proxy.
   * Probes /v0/scan-proxy/accounts to identify as scan-proxy.
   */
  private async probeScanProxy(
    validatorUrl: string | null | undefined,
    authToken: string | null | undefined,
    partyId: string | null
  ): Promise<{ diag: EndpointDiagnostics; scanProxyUrl: string | null }> {
    const scanProxyUrl = validatorUrl
      ? `${validatorUrl.replace(/\/$/, "")}/v0/scan-proxy`
      : "";

    const diag = this.defaultDiag(scanProxyUrl || null, authToken);

    if (!validatorUrl) {
      diag.reachability = "not-configured";
      diag.detail = "No validator URL — scan-proxy not derivable";
      return { diag, scanProxyUrl: null };
    }

    if (!this.isValidUrl(validatorUrl)) {
      diag.reachability = "malformed";
      diag.detail = "Validator URL malformed — cannot derive scan-proxy";
      return { diag, scanProxyUrl: null };
    }

    const baseUrl = `${validatorUrl.replace(/\/$/, "")}/v0/scan-proxy`;
    const paths = [
      partyId
        ? `/accounts?party=${encodeURIComponent(partyId)}`
        : "/accounts",
      partyId
        ? `/api/accounts?party=${encodeURIComponent(partyId)}`
        : "/api/accounts"
    ];

    const headers = this.buildHeaders(authToken);

    for (const path of paths) {
      const response = await this.safeFetch(`${baseUrl}${path}`, headers);
      if (!response) continue;

      if (response.status === 401 || response.status === 403) {
        diag.reachability = "unauthorized";
        diag.detail = `HTTP ${response.status}`;
        diag.probed = true;
        return { diag, scanProxyUrl: baseUrl };
      }

      if (!response.ok) continue;

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        continue;
      }

      const obj = body as Record<string, unknown>;
      if (typeof obj !== "object" || obj === null) continue;

      diag.reachability = "reachable";
      diag.endpointKind = "scan";
      diag.detail = "Scan-proxy confirmed via validator";

      const accounts = obj["accounts"];
      if (Array.isArray(accounts)) {
        diag.detail =
          accounts.length > 0
            ? `Scan-proxy confirmed — ${accounts.length} account(s)`
            : "Scan-proxy confirmed — no accounts";
      }

      diag.probed = true;
      return { diag, scanProxyUrl: baseUrl };
    }

    // Scan-proxy path exists but didn't respond with scan data
    // Still mark as probed — the path is reachable even if not a valid scan
    diag.reachability = "invalid-response";
    diag.detail = "Scan-proxy path did not return Canton scan data";
    diag.probed = true;
    return { diag, scanProxyUrl: baseUrl };
  }

  /**
   * Attempt to retrieve the DSO party id from the environment.
   * Tries in order:
   *   1. Validator /v0/dso-party-id
   *   2. Validator /v0/scan-proxy/dso-party-id  (if scan-proxy is available)
   *   3. Scan /v0/dso-party-id  (if scan URL is configured)
   */
  private async retrieveDsoPartyId(
    validatorUrl: string | null | undefined,
    scanUrl: string | null | undefined,
    scanProxyUrl: string | null | undefined,
    validatorAuthToken: string | null | undefined,
    scanAuthToken: string | null | undefined
  ): Promise<string | null> {
    const headers = this.buildHeaders(validatorAuthToken);

    // Try 1: Validator /v0/dso-party-id
    if (validatorUrl) {
      const url = `${validatorUrl.replace(/\/$/, "")}/v0/dso-party-id`;
      const response = await this.safeFetch(url, headers);
      if (response?.ok) {
        try {
          const body = await response.json() as Record<string, unknown>;
          const partyId = typeof body["partyId"] === "string"
            ? body["partyId"]
            : typeof body["party_id"] === "string"
              ? body["party_id"]
              : null;
          if (partyId) return partyId;
        } catch {
          // continue to next attempt
        }
      }
    }

    // Try 2: Scan-proxy /dso-party-id (if discovered)
    if (scanProxyUrl) {
      const spHeaders = this.buildHeaders(validatorAuthToken);
      const url = `${scanProxyUrl}/dso-party-id`;
      const response = await this.safeFetch(url, spHeaders);
      if (response?.ok) {
        try {
          const body = await response.json() as Record<string, unknown>;
          const partyId = typeof body["partyId"] === "string"
            ? body["partyId"]
            : typeof body["party_id"] === "string"
              ? body["party_id"]
              : null;
          if (partyId) return partyId;
        } catch {
          // continue
        }
      }
    }

    // Try 3: Direct scan /v0/dso-party-id
    if (scanUrl) {
      const sHeaders = this.buildHeaders(scanAuthToken);
      const url = `${scanUrl.replace(/\/$/, "")}/v0/dso-party-id`;
      const response = await this.safeFetch(url, sHeaders);
      if (response?.ok) {
        try {
          const body = await response.json() as Record<string, unknown>;
          const partyId = typeof body["partyId"] === "string"
            ? body["partyId"]
            : typeof body["party_id"] === "string"
              ? body["party_id"]
              : null;
          if (partyId) return partyId;
        } catch {
          // done trying
        }
      }
    }

    return null;
  }

  /**
   * Check whether the linked partyId is visible in scan/scan-proxy account data.
   * Returns true if any accounts were returned for the partyId.
   */
  private async checkPartyVisibility(
    scanUrl: string | null | undefined,
    scanProxyUrl: string | null | undefined,
    partyId: string | null,
    scanAuthToken: string | null | undefined,
    validatorAuthToken: string | null | undefined
  ): Promise<boolean> {
    if (!partyId) return false;

    // Prefer scan-proxy (via validator) as the authoritative BFT read path
    if (scanProxyUrl) {
      const headers = this.buildHeaders(validatorAuthToken);
      const url = `${scanProxyUrl}/accounts?party=${encodeURIComponent(partyId)}`;
      const response = await this.safeFetch(url, headers);
      if (response?.ok) {
        try {
          const body = await response.json() as Record<string, unknown>;
          const accounts = body["accounts"];
          if (Array.isArray(accounts) && accounts.length > 0) return true;
        } catch {
          // fall through to direct scan
        }
      }
    }

    // Fall back to direct scan URL
    if (scanUrl) {
      const headers = this.buildHeaders(scanAuthToken);
      const paths = [
        `/v0/accounts?party=${encodeURIComponent(partyId)}`,
        `/api/v0/accounts?party=${encodeURIComponent(partyId)}`,
        `/api/v1/accounts?party=${encodeURIComponent(partyId)}`
      ];
      for (const path of paths) {
        const response = await this.safeFetch(`${scanUrl.replace(/\/$/, "")}${path}`, headers);
        if (response?.ok) {
          try {
            const body = await response.json() as Record<string, unknown>;
            const accounts = body["accounts"];
            if (Array.isArray(accounts) && accounts.length > 0) return true;
          } catch {
            // continue
          }
        }
      }
    }

    return false;
  }

  /**
   * Default (empty) EndpointDiagnostics for a URL that hasn't been probed.
   */
  private defaultDiag(url: string | null | undefined, authToken: string | null | undefined): EndpointDiagnostics {
    return {
      url: url ?? null,
      authToken: Boolean(authToken),
      endpointKind: "unknown",
      reachability: "not-configured",
      detail: "",
      version: null,
      probed: false
    };
  }

  /**
   * Run full Canton environment verification.
   *
   * Probes in this order:
   * 1. Validator (if configured) — /version to identify as Canton validator app
   * 2. Scan-proxy (derived from validator if validator confirmed) — probe via validator base
   * 3. Direct scan URL (if configured)
   * 4. DSO party id retrieval from best available path
   * 5. Party visibility check via scan or scan-proxy
   *
   * Computes honest readiness following the state progression:
   *   unconfigured → endpoint-configured → validator-confirmed → scan-confirmed
   *   → dso-confirmed → party-visible → read-only-verified
   */
  async diagnose(identity: CantonIdentity): Promise<CantonEnvironmentDiagnostics> {
    const { scanApiUrl, validatorApiUrl, ledgerApiUrl, scanAuthToken, validatorAuthToken, ledgerAuthToken, partyId } = identity;

    // Step 1: Probe validator
    const validatorDiag = await this.probeValidator(validatorApiUrl, validatorAuthToken);

    // Step 2: Probe scan-proxy (derived from validator)
    const { diag: scanProxyDiag, scanProxyUrl } = await this.probeScanProxy(
      validatorDiag.reachability === "reachable" ? validatorApiUrl : undefined,
      validatorAuthToken,
      partyId
    );

    // Step 3: Probe direct scan URL
    const scanDiag = await this.probeScan(scanApiUrl, scanAuthToken, partyId);

    // Determine the authoritative scan endpoint
    const authoritativeScanDiag: EndpointDiagnostics =
      scanProxyDiag.reachability === "reachable"
        ? scanProxyDiag
        : scanDiag.reachability === "reachable"
          ? scanDiag
          : scanDiag;

    const authoritativeScanUrl =
      scanProxyDiag.reachability === "reachable"
        ? scanProxyUrl
        : scanDiag.reachability === "reachable"
          ? scanApiUrl ?? null
          : null;

    // Step 4: Retrieve DSO party id from best available source
    const dsoPartyId = await this.retrieveDsoPartyId(
      validatorApiUrl,
      scanApiUrl,
      scanProxyUrl ?? null,
      validatorAuthToken,
      scanAuthToken
    );

    // Step 5: Check party visibility via authoritative scan
    const partyVisible = await this.checkPartyVisibility(
      scanApiUrl ?? undefined,
      scanProxyUrl ?? null,
      partyId,
      scanAuthToken,
      validatorAuthToken
    );

    // Step 6: Compute readiness
    const readiness = this.computeReadiness(
      validatorDiag,
      authoritativeScanDiag,
      dsoPartyId,
      partyVisible
    );

    const summary = this.buildSummary(
      validatorDiag,
      authoritativeScanDiag,
      scanProxyDiag,
      dsoPartyId,
      partyVisible,
      readiness
    );

    return {
      scan: scanDiag,
      validator: validatorDiag,
      ledger: await this.probeLedger(ledgerApiUrl, ledgerAuthToken),
      scanProxyUrl: scanProxyDiag.reachability === "reachable" ? scanProxyUrl : null,
      readiness,
      dsoPartyId,
      partyVisible,
      readOnlyVerified: readiness === "read-only-verified",
      summary
    };
  }

  /**
   * Probe the ledger API endpoint.
   * Lightweight probe: just checks reachability with /v0/health or similar.
   */
  private async probeLedger(
    url: string | null | undefined,
    authToken: string | null | undefined
  ): Promise<EndpointDiagnostics> {
    const base = this.defaultDiag(url, authToken);

    if (!url) {
      base.reachability = "not-configured";
      base.detail = "No ledger URL configured";
      return base;
    }

    if (!this.isValidUrl(url)) {
      base.reachability = "malformed";
      base.detail = "Not a valid http/https URL";
      return base;
    }

    const baseUrl = url.replace(/\/$/, "");
    const paths = ["/v0/health", "/health", "/api/v1/health"];
    const headers = this.buildHeaders(authToken);

    for (const path of paths) {
      const response = await this.safeFetch(`${baseUrl}${path}`, headers);
      if (!response) continue;

      if (response.status === 401 || response.status === 403) {
        base.reachability = "unauthorized";
        base.detail = `HTTP ${response.status}`;
        base.probed = true;
        return base;
      }

      if (!response.ok) continue;

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        // Accept non-JSON health response as valid
      }

      base.reachability = "reachable";
      base.endpointKind = "ledger";
      base.detail = "Ledger API reachable";
      base.probed = true;
      return base;
    }

    base.reachability = "invalid-response";
    base.detail = "Ledger API did not respond to health probes";
    base.probed = true;
    return base;
  }

  /**
   * Compute honest environment readiness following the state progression.
   * Each state requires the previous states to have been reached.
   */
  private computeReadiness(
    validatorDiag: EndpointDiagnostics,
    authoritativeScanDiag: EndpointDiagnostics,
    dsoPartyId: string | null,
    partyVisible: boolean
  ): CantonEnvironmentReadiness {
    // No endpoints configured at all
    if (
      validatorDiag.reachability === "not-configured" &&
      authoritativeScanDiag.reachability === "not-configured"
    ) {
      return "unconfigured";
    }

    // At least one URL is configured but we haven't confirmed anything yet
    const anyConfigured =
      validatorDiag.reachability !== "not-configured" ||
      authoritativeScanDiag.reachability !== "not-configured";

    if (anyConfigured && !validatorDiag.probed && !authoritativeScanDiag.probed) {
      return "endpoint-configured";
    }

    // Validator must be confirmed first
    if (validatorDiag.reachability !== "reachable" || validatorDiag.endpointKind !== "validator") {
      // If scan is directly reachable without validator, still not past validator-confirmed
      if (authoritativeScanDiag.reachability === "reachable") {
        return "endpoint-configured";
      }
      return "endpoint-configured";
    }

    // Validator confirmed — check scan
    if (authoritativeScanDiag.reachability !== "reachable") {
      return "validator-confirmed";
    }

    // Scan confirmed — check DSO
    if (!dsoPartyId) {
      return "scan-confirmed";
    }

    // DSO confirmed — check party visibility
    if (!partyVisible) {
      return "dso-confirmed";
    }

    return "read-only-verified";
  }

  private buildSummary(
    validatorDiag: EndpointDiagnostics,
    authoritativeScanDiag: EndpointDiagnostics,
    scanProxyDiag: EndpointDiagnostics,
    dsoPartyId: string | null,
    partyVisible: boolean,
    readiness: CantonEnvironmentReadiness
  ): string {
    switch (readiness) {
      case "unconfigured":
        return "No Canton endpoints configured — demo mode active.";

      case "endpoint-configured": {
        const configured: string[] = [];
        if (validatorDiag.reachability !== "not-configured") configured.push("validator");
        if (authoritativeScanDiag.reachability !== "not-configured") configured.push("scan");
        if (configured.length === 0) return "No Canton endpoints configured.";
        return `Endpoints configured but not yet confirmed: ${configured.join(", ")}.`;
      }

      case "validator-confirmed":
        return `${validatorDiag.detail} confirmed. Scan/scan-proxy not yet confirmed.`;

      case "scan-confirmed":
        return `Canton environment detected: ${validatorDiag.detail}. Scan confirmed: ${authoritativeScanDiag.detail}. DSO not yet retrieved.`;

      case "dso-confirmed":
        return `DSO party id retrieved: ${dsoPartyId}. Party visibility not confirmed.`;

      case "party-visible":
        return `Linked party is visible in Canton network. DSO: ${dsoPartyId}. Read-only live holdings available.`;

      case "read-only-verified":
        return `Canton environment fully verified. DSO: ${dsoPartyId}. Party visible. Read-only live mode active.`;

      default:
        return "Canton environment status unknown.";
    }
  }
}
