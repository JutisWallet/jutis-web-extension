import { describe, expect, it } from "vitest";

import { CantonWalletAdapter } from "@/adapters/canton/canton-wallet-adapter";
import { CantonReferenceDataService } from "@/adapters/canton/services/canton-reference-data-service";
import { BUILT_IN_NETWORKS, CANTON_DEMO_ASSETS, DEFAULT_CANTON_IDENTITY } from "@/core/models/fixtures";
import { AdapterCapabilityError } from "@/core/services/errors";

describe("Canton capability gating", () => {
  it("reports reference-only and unsupported feature states for the default Canton identity", () => {
    const service = new CantonReferenceDataService();
    const matrix = service.getFeatureMatrix(DEFAULT_CANTON_IDENTITY);

    expect(matrix.find((feature) => feature.id === "balances")?.supportState).toBe("reference-only");
    expect(matrix.find((feature) => feature.id === "receive")?.supportState).toBe("unsupported");
    expect(matrix.find((feature) => feature.id === "send")?.supportState).toBe("partial");
    expect(matrix.find((feature) => feature.id === "activity")?.supportState).toBe("reference-only");
    expect(matrix.find((feature) => feature.id === "swap")?.supportState).toBe("unsupported");
  });

  it("fails closed when a live Canton send is attempted", async () => {
    const adapter = new CantonWalletAdapter(
      BUILT_IN_NETWORKS.find((network) => network.id === "canton-mainnet")!
    );

    await expect(
      adapter.submitSend(
        null,
        {
          networkId: "canton-mainnet",
          assetId: "canton-cc",
          to: "party::receiver",
          amount: "10"
        },
        {
          networkId: "canton-mainnet",
          asset: CANTON_DEMO_ASSETS[0],
          to: "party::receiver",
          amount: "10",
          usdReference: CANTON_DEMO_ASSETS[0].usdReference,
          estimatedFeeNative: null,
          estimatedFeeUsdReference: {
            value: null,
            trustLevel: "unavailable",
            sourceType: "none",
            note: "Unavailable in test."
          },
          warnings: ["Planning only."],
          support: "partial"
        }
      )
    ).rejects.toBeInstanceOf(AdapterCapabilityError);
  });
});
