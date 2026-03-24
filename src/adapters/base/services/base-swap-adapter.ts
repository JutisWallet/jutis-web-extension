import type { SwapQuoteRequest, SwapRoute } from "@/core/models/types";
import { AdapterCapabilityError } from "@/core/services/errors";
import type { SwapProvider } from "@/swap/swap-provider-registry";

export class BaseSwapAdapter implements SwapProvider {
  readonly id = "base-dev-quote";
  readonly label = "Base Development Quote Adapter";
  readonly networkId = "base-mainnet";
  readonly quoteTruth = "simulated" as const;
  readonly executionReadiness = "blocked" as const;
  readonly publicClaimReady = false;
  readonly note = "Base swap is disabled in this build because the only provider path is a development-only quote adapter.";
  readonly blockers = [
    "The active Base swap adapter only generates simulated development quotes.",
    "No live Base quote provider is configured.",
    "No approval and swap execution orchestration is wired."
  ];

  async quote(request: SwapQuoteRequest): Promise<SwapRoute[]> {
    throw new AdapterCapabilityError(
      `Base swap quoting is disabled for ${request.networkId} until a live provider and execution path are configured.`
    );
  }
}
