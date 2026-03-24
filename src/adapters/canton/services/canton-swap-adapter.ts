import type { SwapQuoteRequest, SwapRoute } from "@/core/models/types";
import { AdapterCapabilityError } from "@/core/services/errors";
import type { SwapProvider } from "@/swap/swap-provider-registry";

export class CantonSwapAdapter implements SwapProvider {
  readonly id = "canton-reference-route";
  readonly label = "Canton Reference Swap Adapter";
  readonly networkId = "canton-mainnet";
  readonly quoteTruth = "reference-only" as const;
  readonly executionReadiness = "unsupported" as const;
  readonly publicClaimReady = false;
  readonly note = "Canton swap is disabled in this build because there is no live settlement topology or executable provider path.";
  readonly blockers = [
    "Canton swap remains architecture-only until live settlement infrastructure is configured.",
    "No live Canton quote provider is configured.",
    "No executable Canton settlement or CC acquisition path is wired."
  ];

  async quote(request: SwapQuoteRequest): Promise<SwapRoute[]> {
    throw new AdapterCapabilityError(
      `Canton swap quoting is disabled for ${request.networkId} until a live quote and settlement path are configured.`
    );
  }
}
