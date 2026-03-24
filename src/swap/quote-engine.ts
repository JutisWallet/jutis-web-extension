import type { SwapQuoteRequest, SwapReadiness, SwapRoute } from "@/core/models/types";
import type { SwapProviderRegistry } from "@/swap/swap-provider-registry";

export class QuoteEngine {
  constructor(private readonly registry: SwapProviderRegistry) {}

  async getQuotes(request: SwapQuoteRequest): Promise<SwapRoute[]> {
    const providers = this.registry
      .getProviders(request.networkId)
      .filter((provider) => provider.quoteTruth === "live" && provider.executionReadiness === "ready" && provider.publicClaimReady);

    if (providers.length === 0) {
      return [];
    }

    const quotes = await Promise.all(providers.map(async (provider) => provider.quote(request)));

    return quotes
      .flat()
      .sort((left, right) => Number(right.outputAmount) - Number(left.outputAmount));
  }

  getReadiness(networkId: string): SwapReadiness {
    const providers = this.registry.getProviderStatuses(networkId);
    const canRequestQuotes = providers.some(
      (provider) => provider.quoteTruth === "live" && provider.executionReadiness === "ready" && provider.publicClaimReady
    );
    const blockers = [...new Set(providers.flatMap((provider) => provider.blockers))];

    return {
      networkId,
      canRequestQuotes,
      canExecute: canRequestQuotes,
      publicClaimReady: canRequestQuotes,
      summary:
        providers.length === 0
          ? "No swap provider is registered for this network."
          : canRequestQuotes
            ? "At least one live swap provider is configured for this network."
            : "No public-ready live swap provider is configured for this network.",
      blockers,
      providers
    };
  }
}
