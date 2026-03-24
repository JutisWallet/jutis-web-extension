import type { UsdReference } from "@/core/models/types";

export function formatUsdReference(reference: UsdReference | null | undefined): string {
  if (!reference || reference.value == null) {
    return "--";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: reference.value >= 100 ? 2 : 4
  }).format(reference.value);

  if (reference.trustLevel === "live") {
    return formatted;
  }

  if (reference.trustLevel === "unavailable") {
    return "--";
  }

  return `~${formatted}`;
}

export function getUsdTrustLabel(reference: UsdReference | null | undefined): string {
  if (!reference) {
    return "Unavailable";
  }

  switch (reference.trustLevel) {
    case "live":
      return "Live";
    case "stale":
      return "Stale";
    case "estimated":
      return "Estimated";
    case "demo":
      return "Demo";
    case "unavailable":
      return "Unavailable";
  }
}

export function getUsdTrustMessage(reference: UsdReference | null | undefined): string {
  if (!reference) {
    return "USD reference is unavailable.";
  }

  switch (reference.trustLevel) {
    case "live":
      return reference.note ?? "USD reference is live.";
    case "stale":
      return reference.note ?? "USD reference is stale.";
    case "estimated":
      return reference.note ?? "USD value is estimated from a non-live reference source.";
    case "demo":
      return reference.note ?? "USD value comes from demo data.";
    case "unavailable":
      return reference.note ?? "USD reference is unavailable.";
  }
}

export function isReliableUsdReference(reference: UsdReference | null | undefined): boolean {
  return reference?.trustLevel === "live" || reference?.trustLevel === "stale";
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function shortValue(value: string, visible = 6): string {
  if (value.length <= visible * 2) {
    return value;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}
