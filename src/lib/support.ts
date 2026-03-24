import type {
  ActivityRecord,
  AdapterSupportLevel,
  AssetRecord,
  CantonIdentity,
  ProductSupportState
} from "@/core/models/types";

export function mapAdapterSupportLevel(support: AdapterSupportLevel): ProductSupportState {
  switch (support) {
    case "real":
      return "live";
    case "partial":
      return "partial";
    case "mocked":
      return "reference-only";
    case "unsupported":
      return "unsupported";
  }
}

export function getAssetSupportState(asset: AssetRecord): ProductSupportState {
  if (asset.support === "mocked" || asset.usdReference.trustLevel === "demo") {
    return "reference-only";
  }

  return mapAdapterSupportLevel(asset.support);
}

export function getActivitySupportState(activity: ActivityRecord): ProductSupportState {
  if (activity.source === "mock" || activity.support === "mocked") {
    return "reference-only";
  }

  return mapAdapterSupportLevel(activity.support);
}

export function getCantonIdentitySupportState(identity: CantonIdentity): ProductSupportState {
  if (identity.partyId && identity.authMode !== "mock" && identity.authMode !== "unlinked") {
    return identity.support === "real" ? "live" : "partial";
  }

  if (identity.authMode === "mock" || identity.support === "mocked") {
    return "reference-only";
  }

  return "unsupported";
}

export function formatSupportState(state: ProductSupportState): string {
  switch (state) {
    case "live":
      return "live";
    case "partial":
      return "partial";
    case "reference-only":
      return "reference-only";
    case "unsupported":
      return "unsupported";
  }
}
