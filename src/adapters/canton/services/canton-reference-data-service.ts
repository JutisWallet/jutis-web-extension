import type { CantonIdentity, CantonHoldingsReadiness, ProductSupportState } from "@/core/models/types";
import { getCantonIdentitySupportState } from "@/lib/support";

export interface CantonFeatureMatrixEntry {
  id: "identity" | "balances" | "receive" | "send" | "activity" | "swap";
  label: string;
  supportState: ProductSupportState;
  implementationSource: string;
  blocker: string;
  nextStep: string;
  summary: string;
}

function getReceiveSupportState(identity: CantonIdentity): ProductSupportState {
  if (identity.partyId && identity.authMode !== "mock" && identity.authMode !== "unlinked" && identity.support === "real") {
    return "live";
  }

  if (identity.partyId) {
    return "partial";
  }

  return "unsupported";
}

function getSendSupportState(identity: CantonIdentity): ProductSupportState {
  if (identity.support === "real" && identity.capabilities.canPrepareTransfers && identity.capabilities.canSubmitTransfers) {
    return "live";
  }

  if (identity.capabilities.canPrepareTransfers) {
    return "partial";
  }

  return "unsupported";
}

export class CantonReferenceDataService {
  getIdentitySummary(identity: CantonIdentity): { supportLabel: ProductSupportState; notes: string[] } {
    const supportLabel = getCantonIdentitySupportState(identity);

    if (identity.partyId && identity.authMode !== "mock" && identity.authMode !== "unlinked") {
      return {
        supportLabel,
        notes: [
          "A Canton party identifier is attached to this profile.",
          "Live holdings, activity, and submission still depend on deployment-specific validator, scan, and ledger wiring."
        ]
      };
    }

    return {
      supportLabel,
      notes: [
        "No verified live Canton party is linked yet.",
        "The current Canton surfaces are reference-mode or planning-mode only."
      ]
    };
  }

  getFeatureMatrix(identity: CantonIdentity, holdingsReadiness: CantonHoldingsReadiness = "demo"): CantonFeatureMatrixEntry[] {
    return [
      {
        id: "identity",
        label: "Identity linkage",
        supportState: getCantonIdentitySupportState(identity),
        implementationSource: "Stored Canton identity metadata in extension storage",
        blocker: "No validator, wallet-session, or external-party onboarding flow is wired in the active runtime.",
        nextStep: "Implement a real Canton party attachment flow and persist verified topology metadata.",
        summary: identity.partyId
          ? "A party identifier may exist, but live capability still depends on the attached topology."
          : "The active profile does not have a verified live Canton party."
      },
      {
        id: "balances",
        label: "Balances and holdings",
        supportState: this.balancesSupportState(holdingsReadiness, identity),
        implementationSource: this.balancesImplementationSource(holdingsReadiness, identity),
        blocker: this.balancesBlocker(holdingsReadiness, identity),
        nextStep: this.balancesNextStep(holdingsReadiness, identity),
        summary: this.balancesSummary(holdingsReadiness, identity)
      },
      {
        id: "receive",
        label: "Receive",
        supportState: getReceiveSupportState(identity),
        implementationSource: "Party-centric receive instructions derived from stored identity metadata",
        blocker: identity.partyId
          ? "Receive can only be considered live after the attached party and topology are verified."
          : "No live Canton party is linked, so Jutis cannot present a live receive target.",
        nextStep: "Verify party linkage against the chosen Canton topology and expose receive instructions only for verified identities.",
        summary: identity.partyId
          ? "Receive guidance can be shown, but it should not be treated as a verified live wallet address."
          : "Receive is blocked until a real Canton party is linked."
      },
      {
        id: "send",
        label: "Send",
        supportState: getSendSupportState(identity),
        implementationSource: "Protocol-aware send preview in `CantonWalletAdapter`; live submission intentionally blocked",
        blocker: "No live signer and ledger submission path is configured.",
        nextStep: "Implement `CantonTransferService` against a real signer and Canton ledger topology.",
        summary: "Jutis can model Canton transfer preparation, but it cannot execute live Canton sends."
      },
      {
        id: "activity",
        label: "Activity",
        supportState: "reference-only",
        implementationSource: "Fixture/demo activity from `CANTON_DEMO_ACTIVITY` and local planning entries",
        blocker: "No live Canton activity indexer or settlement reconciliation is configured.",
        nextStep: "Replace fixture activity with live Scan, validator, or participant-backed activity reads.",
        summary: "The current Canton activity list is reference/demo data, not live account history."
      },
      {
        id: "swap",
        label: "Swap and CC acquisition",
        supportState: "unsupported",
        implementationSource: "Readiness-only metadata from the `Canton Reference Swap Adapter`",
        blocker: "No live Canton quote provider, settlement topology, or CC acquisition path is configured.",
        nextStep: "Integrate a real Canton settlement backend before exposing any public swap support.",
        summary: "Canton swap is not a live feature in this build."
      }
    ];
  }

  private balancesSupportState(
    readiness: CantonHoldingsReadiness,
    _identity: CantonIdentity
  ): ProductSupportState {
    if (readiness === "live") return "live";
    if (readiness === "demo") return "reference-only";
    return "unsupported";
  }

  private balancesImplementationSource(
    readiness: CantonHoldingsReadiness,
    identity: CantonIdentity
  ): string {
    if (readiness === "live") {
      return "Live Canton holdings from configured scan API via `CantonHoldingsService`";
    }
    if (readiness === "demo") {
      return "Fixture-driven Canton assets from `CANTON_DEMO_ASSETS` via `CantonWalletAdapter`";
    }
    if (readiness === "malformed") {
      return "Configured scanApiUrl is malformed — demo fixtures shown";
    }
    if (readiness === "unauthorized") {
      return "Configured scanApiUrl requires authentication — demo fixtures shown";
    }
    if (readiness === "unreachable") {
      return "Configured scanApiUrl is unreachable — demo fixtures shown";
    }
    return "Configured scanApiUrl returned invalid payload — demo fixtures shown";
  }

  private balancesBlocker(
    readiness: CantonHoldingsReadiness,
    identity: CantonIdentity
  ): string {
    if (readiness === "demo") {
      return "No scan API URL is configured — demo balances shown. Enter a Canton scan API URL in party linkage to enable live reads.";
    }
    if (readiness === "malformed") {
      return "Configured scanApiUrl is not a valid http/https URL. Fix the URL or remove it to suppress this warning.";
    }
    if (readiness === "unreachable") {
      return "Configured scanApiUrl is unreachable. Check network connectivity and URL. Demo balances are shown in the meantime.";
    }
    if (readiness === "unauthorized") {
      return "Configured scanApiUrl requires authentication. Attach a valid scanAuthToken to read live holdings.";
    }
    if (readiness === "invalid-payload") {
      return "Configured scanApiUrl responded with unexpected data. The endpoint may not be a Canton holdings service. Demo balances are shown.";
    }
    return "Live Canton holdings are available from the configured scan API.";
  }

  private balancesNextStep(
    readiness: CantonHoldingsReadiness,
    identity: CantonIdentity
  ): string {
    if (readiness === "live") {
      return "Holdings are live. Implement send submission for full Canton workflow.";
    }
    if (readiness === "demo") {
      return "Configure a Canton scan API URL in the party linkage screen.";
    }
    if (readiness === "malformed") {
      return "Correct the scanApiUrl field in the party linkage screen.";
    }
    if (readiness === "unreachable") {
      return "Verify the scanApiUrl is correct and the server is reachable from the browser.";
    }
    if (readiness === "unauthorized") {
      return "Add a valid scanAuthToken (Bearer token) in the party linkage screen.";
    }
    return "Investigate the Canton scan API endpoint — payload shape was unexpected.";
  }

  private balancesSummary(
    readiness: CantonHoldingsReadiness,
    identity: CantonIdentity
  ): string {
    if (readiness === "live") {
      return "Portfolio shows live Canton holdings from the configured scan node.";
    }
    if (readiness === "demo") {
      return "No scanApiUrl configured — demo Canton balances are shown. These are not real holdings.";
    }
    if (readiness === "malformed") {
      return "Configured URL is malformed — demo Canton balances are shown. Live reads are blocked.";
    }
    if (readiness === "unreachable") {
      return "Configured URL is unreachable — demo Canton balances are shown. Check network and URL.";
    }
    if (readiness === "unauthorized") {
      return "Configured URL requires auth — demo Canton balances are shown. Attach a scanAuthToken to read live holdings.";
    }
    return "Configured URL returned invalid data — demo Canton balances are shown. The endpoint may not be a Canton scan service.";
  }
}
