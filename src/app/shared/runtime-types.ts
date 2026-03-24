import type {
  CantonIdentity,
  CantonEnvironmentDiagnostics,
  FeatureFlags,
  PortfolioSnapshot,
  SendDraft,
  SendPreview,
  SessionSnapshot,
  SubmittedTransaction,
  SwapReadiness,
  SwapQuoteRequest,
  SwapRoute,
  WalletPreferences
} from "@/core/models/types";

export interface BootstrapPayload {
  hasVault: boolean;
  preferences: WalletPreferences;
  featureFlags: FeatureFlags;
  cantonIdentity: CantonIdentity;
  session: SessionSnapshot;
}

export interface RefreshPayload {
  snapshot: PortfolioSnapshot;
  session: SessionSnapshot;
}

export interface SendPreviewPayload {
  preview: SendPreview;
  session: SessionSnapshot;
}

export interface SubmitSendPayload {
  submitted: SubmittedTransaction;
  session: SessionSnapshot;
}

export interface SwapQuotePayload {
  routes: SwapRoute[];
  readiness: SwapReadiness;
  session: SessionSnapshot;
}

export interface SwapReadinessPayload {
  readiness: SwapReadiness;
}

export interface PreferencesPayload {
  preferences: WalletPreferences;
  session: SessionSnapshot;
}

export interface SessionPayload {
  session: SessionSnapshot;
}

export interface CantonIdentityPayload {
  cantonIdentity: CantonIdentity;
  session: SessionSnapshot;
}

export interface CantonEnvironmentDiagnosticsPayload {
  diagnostics: CantonEnvironmentDiagnostics;
  cantonIdentity: CantonIdentity;
  session: SessionSnapshot;
}

export type RuntimeRequest =
  | { type: "jutis:bootstrap" }
  | { type: "jutis:create-wallet"; password: string }
  | { type: "jutis:import-mnemonic"; password: string; mnemonic: string }
  | { type: "jutis:import-private-key"; password: string; privateKey: `0x${string}` }
  | { type: "jutis:unlock"; password: string }
  | { type: "jutis:lock" }
  | { type: "jutis:touch-session" }
  | { type: "jutis:refresh" }
  | { type: "jutis:preview-send"; draft: SendDraft }
  | { type: "jutis:submit-send"; draft: SendDraft; preview: SendPreview }
  | { type: "jutis:swap-readiness"; networkId: string }
  | { type: "jutis:swap-quotes"; request: SwapQuoteRequest }
  | { type: "jutis:update-preferences"; patch: Partial<WalletPreferences> }
  | { type: "jutis:update-canton-identity"; partyId: string | null; scanApiUrl?: string | null; scanAuthToken?: string | null; validatorAuthToken?: string | null; ledgerAuthToken?: string | null; validatorApiUrl?: string | null; ledgerApiUrl?: string | null }
  | { type: "jutis:update-canton-environment"; validatorApiUrl?: string | null; ledgerApiUrl?: string | null; scanApiUrl?: string | null; validatorAuthToken?: string | null; ledgerAuthToken?: string | null; cantonEnvironmentProfile?: string | null }
  | { type: "jutis:diagnose-canton-environment" };

export interface RuntimeSuccess<T> {
  ok: true;
  data: T;
}

export interface RuntimeFailure {
  ok: false;
  error: string;
  code?: string;
}

export type RuntimeResponse<T> = RuntimeSuccess<T> | RuntimeFailure;
