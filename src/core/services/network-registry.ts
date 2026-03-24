import type { NetworkConfig } from "@/core/models/types";
import { BUILT_IN_NETWORKS } from "@/core/models/fixtures";

export class NetworkRegistry {
  private readonly networks = new Map<string, NetworkConfig>();

  constructor(initialNetworks: NetworkConfig[] = BUILT_IN_NETWORKS) {
    initialNetworks.forEach((network) => {
      this.networks.set(network.id, network);
    });
  }

  list(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  get(id: string): NetworkConfig {
    const network = this.networks.get(id);

    if (!network) {
      throw new Error(`Unknown network: ${id}`);
    }

    return network;
  }
}
