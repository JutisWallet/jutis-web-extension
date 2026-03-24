import type { SwapExecutionReadiness, SwapProviderStatus, SwapQuoteRequest, SwapQuoteTruth, SwapRoute } from "@/core/models/types";

export interface SwapProvider {
  readonly id: string;
  readonly label: string;
  readonly networkId: string;
  readonly quoteTruth: SwapQuoteTruth;
  readonly executionReadiness: SwapExecutionReadiness;
  readonly publicClaimReady: boolean;
  readonly note: string;
  readonly blockers: string[];
  quote(request: SwapQuoteRequest): Promise<SwapRoute[]>;
}

export class SwapProviderRegistry {
  private readonly providers = new Map<string, SwapProvider[]>();

  register(provider: SwapProvider): void {
    const existing = this.providers.get(provider.networkId) ?? [];
    existing.push(provider);
    this.providers.set(provider.networkId, existing);
  }

  getProviders(networkId: string): SwapProvider[] {
    return this.providers.get(networkId) ?? [];
  }

  getProviderStatuses(networkId: string): SwapProviderStatus[] {
    return this.getProviders(networkId).map((provider) => ({
      providerId: provider.id,
      providerLabel: provider.label,
      networkId: provider.networkId,
      quoteTruth: provider.quoteTruth,
      executionReadiness: provider.executionReadiness,
      publicClaimReady: provider.publicClaimReady,
      note: provider.note,
      blockers: provider.blockers
    }));
  }
}
