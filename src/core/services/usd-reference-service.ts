import type { PriceSourceType, UsdReference, UsdTrustLevel } from "@/core/models/types";

interface UnitPriceQuote {
  unitPrice: number;
  trustLevel: Exclude<UsdTrustLevel, "unavailable">;
  sourceType: Exclude<PriceSourceType, "none" | "composite">;
  asOf?: string;
  staleAt?: string;
  note?: string;
}

interface PriceReferenceProvider {
  getQuote(symbol: string): UnitPriceQuote | null;
}

class StaticUsdReferenceProvider implements PriceReferenceProvider {
  private readonly prices: Record<string, number> = {
    ETH: 3420,
    USDC: 1,
    CC: 1,
    "USDC (Canton)": 1
  };

  getQuote(symbol: string): UnitPriceQuote | null {
    const unitPrice = this.prices[symbol];

    if (unitPrice == null) {
      return null;
    }

    return {
      unitPrice,
      trustLevel: "estimated",
      sourceType: "static-reference",
      asOf: new Date().toISOString(),
      note: "Static development USD reference. Not a live market price."
    };
  }
}

const TRUST_SEVERITY: Record<UsdTrustLevel, number> = {
  live: 0,
  stale: 1,
  estimated: 2,
  demo: 3,
  unavailable: 4
};

function roundUsd(value: number): number {
  return Number(value.toFixed(2));
}

function parseAmount(amount: string): number | null {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : null;
}

function selectWorstTrustLevel(references: UsdReference[]): UsdTrustLevel {
  return references.reduce<UsdTrustLevel>((worst, reference) => {
    return TRUST_SEVERITY[reference.trustLevel] > TRUST_SEVERITY[worst] ? reference.trustLevel : worst;
  }, "live");
}

function normalizeNote(parts: Array<string | undefined>): string | undefined {
  const unique = [...new Set(parts.filter((part): part is string => Boolean(part?.trim())))];
  return unique.length > 0 ? unique.join(" ") : undefined;
}

export class UsdReferenceService {
  constructor(private readonly provider: PriceReferenceProvider = new StaticUsdReferenceProvider()) {}

  getQuote(symbol: string): UnitPriceQuote | null {
    return this.provider.getQuote(symbol);
  }

  toUsdReference(symbol: string, amount: string): UsdReference {
    const quote = this.getQuote(symbol);
    const parsedAmount = parseAmount(amount);

    if (!quote || parsedAmount == null) {
      return this.unavailable(
        quote ? "Amount could not be parsed for USD reference." : `No USD reference source is configured for ${symbol}.`
      );
    }

    return {
      value: roundUsd(quote.unitPrice * parsedAmount),
      trustLevel: quote.trustLevel,
      sourceType: quote.sourceType,
      asOf: quote.asOf,
      staleAt: quote.staleAt,
      note: quote.note
    };
  }

  demoReference(value: number, note?: string): UsdReference {
    return {
      value: roundUsd(value),
      trustLevel: "demo",
      sourceType: "demo-reference",
      asOf: new Date().toISOString(),
      note: note ?? "Demo USD reference from fixture data. Not live market pricing."
    };
  }

  staleReference(value: number, options?: { asOf?: string; staleAt?: string; note?: string }): UsdReference {
    return {
      value: roundUsd(value),
      trustLevel: "stale",
      sourceType: "cached-market-feed",
      asOf: options?.asOf,
      staleAt: options?.staleAt,
      note: options?.note ?? "USD reference is stale."
    };
  }

  unavailable(note?: string): UsdReference {
    return {
      value: null,
      trustLevel: "unavailable",
      sourceType: "none",
      note: note ?? "USD reference is unavailable."
    };
  }

  scaleReference(reference: UsdReference, fullAmount: string, partialAmount: string): UsdReference {
    if (reference.value == null) {
      return {
        ...reference
      };
    }

    const full = parseAmount(fullAmount);
    const partial = parseAmount(partialAmount);

    if (!full || partial == null) {
      return this.unavailable("USD reference could not be scaled because the amount is invalid.");
    }

    return {
      ...reference,
      value: roundUsd((reference.value / full) * partial)
    };
  }

  aggregate(references: UsdReference[], note?: string): UsdReference {
    if (references.length === 0) {
      return this.unavailable(note ?? "No USD references are available for this view.");
    }

    if (references.some((reference) => reference.value == null || reference.trustLevel === "unavailable")) {
      return this.unavailable(note ?? "At least one visible asset has no trustworthy USD reference.");
    }

    const total = references.reduce((sum, reference) => sum + (reference.value ?? 0), 0);
    const trustLevel = selectWorstTrustLevel(references);
    const sourceType =
      references.every((reference) => reference.sourceType === references[0].sourceType)
        ? references[0].sourceType
        : "composite";
    const timestamps = references.map((reference) => reference.asOf).filter((value): value is string => Boolean(value));

    return {
      value: roundUsd(total),
      trustLevel,
      sourceType,
      asOf: timestamps.length > 0 ? timestamps.sort()[0] : undefined,
      note: normalizeNote([note, ...references.map((reference) => reference.note)])
    };
  }
}
