import { create } from "zustand";

import { sendRuntimeRequest, RuntimeClientError } from "@/app/shared/runtime-client";
import type {
  BootstrapPayload,
  PreferencesPayload,
  RefreshPayload,
  SendPreviewPayload,
  SessionPayload,
  SubmitSendPayload,
  SwapReadinessPayload,
  SwapQuotePayload,
  CantonIdentityPayload,
  CantonEnvironmentDiagnosticsPayload
} from "@/app/shared/runtime-types";
import type {
  ActivityRecord,
  CantonIdentity,
  CantonEnvironmentDiagnostics,
  FeatureFlags,
  PortfolioSnapshot,
  SendDraft,
  SendPreview,
  SwapReadiness,
  SessionSnapshot,
  SwapLifecycleState,
  SwapQuoteRequest,
  SwapRoute,
  WalletPreferences
} from "@/core/models/types";

export type PopupScreen = "welcome" | "create" | "import" | "unlock" | "home" | "activity" | "swap" | "friend" | "settings" | "link-party" | "environment" | "dapp-connect" | "token-details" | "register";
export type Overlay = "send" | "receive" | "activity-detail" | "connection-request" | null;

interface JutisStoreState {
  bootstrapped: boolean;
  hasVault: boolean;
  screen: PopupScreen;
  overlay: Overlay;
  session: SessionSnapshot;
  snapshot: PortfolioSnapshot | null;
  preferences: WalletPreferences | null;
  featureFlags: FeatureFlags | null;
  cantonIdentity: CantonIdentity | null;
  cantonDiagnostics: CantonEnvironmentDiagnostics | null;
  selectedActivityId: string | null;
  selectedTokenId: string | null;
  sendDraft: SendDraft;
  sendPreview: SendPreview | null;
  swapRequest: SwapQuoteRequest;
  swapReadiness: SwapReadiness | null;
  swapRoutes: SwapRoute[];
  swapState: SwapLifecycleState;
  error: string | null;
  busy: boolean;
  bootstrap(): Promise<void>;
  createWallet(password: string): Promise<void>;
  importFromMnemonic(password: string, mnemonic: string): Promise<void>;
  importFromPrivateKey(password: string, privateKey: `0x${string}`): Promise<void>;
  unlock(password: string): Promise<void>;
  lock(): Promise<void>;
  refresh(): Promise<void>;
  touchSession(): Promise<void>;
  setScreen(screen: PopupScreen): void;
  setOverlay(overlay: Overlay): void;
  setSelectedActivity(activityId: string | null): void;
  setSelectedTokenId(tokenId: string | null): void;
  updateSendDraft(patch: Partial<SendDraft>): void;
  previewSend(): Promise<void>;
  submitSend(): Promise<void>;
  loadSwapReadiness(networkId?: string): Promise<void>;
  requestSwapQuotes(): Promise<void>;
  updateSwapRequest(patch: Partial<SwapQuoteRequest>): void;
  updatePreferences(patch: Partial<WalletPreferences>): Promise<void>;
  linkParty(partyId: string, scanApiUrl?: string, scanAuthToken?: string, validatorAuthToken?: string, ledgerAuthToken?: string): Promise<void>;
  unlinkParty(): Promise<void>;
  diagnoseEnvironment(): Promise<void>;
  updateCantonEnvironment(partial: { validatorApiUrl?: string; ledgerApiUrl?: string; scanApiUrl?: string; validatorAuthToken?: string; ledgerAuthToken?: string; cantonEnvironmentProfile?: string }): Promise<void>;
  clearError(): void;
}

const DEFAULT_SEND_DRAFT: SendDraft = {
  networkId: "canton-mainnet",
  assetId: "canton-cc",
  to: "",
  amount: ""
};

const DEFAULT_SWAP_REQUEST: SwapQuoteRequest = {
  networkId: "canton-mainnet",
  fromAssetId: "canton-cc",
  toAssetId: "canton-usdc",
  amount: "1",
  slippageBps: 50
};

function isSessionLockedError(error: unknown): boolean {
  return error instanceof RuntimeClientError && error.code === "SESSION_LOCKED";
}

function lockedSessionState(): SessionSnapshot {
  return { status: "locked" };
}

function deriveScreen(hasVault: boolean, session: SessionSnapshot): PopupScreen {
  if (!hasVault) {
    return "welcome";
  }

  return session.status === "unlocked" ? "home" : "unlock";
}

function applyLockedState(message?: string) {
  useJutisStore.setState(() => ({
    session: lockedSessionState(),
    snapshot: null,
    screen: "unlock",
    overlay: null,
    sendPreview: null,
    swapRoutes: [],
    swapState: "idle",
    busy: false,
    error: message ?? "Your session expired. Unlock the wallet again to continue."
  }));
}

function updateSendDraftFromSnapshot(state: JutisStoreState, snapshot: PortfolioSnapshot): SendDraft {
  // Canton-primary: always prefer Canton assets, never default to Base on refresh
  const cantonAssets = snapshot.assets.filter((asset) => asset.networkId === "canton-mainnet");
  const firstAsset = cantonAssets[0] ?? snapshot.assets.find((asset) => asset.networkId === "canton-mainnet") ?? snapshot.assets[0];

  if (!firstAsset) {
    return state.sendDraft;
  }

  return {
    ...state.sendDraft,
    networkId: "canton-mainnet",
    assetId: firstAsset.id
  };
}

export const useJutisStore = create<JutisStoreState>((set, get) => ({
  bootstrapped: false,
  hasVault: false,
  screen: "welcome",
  overlay: null,
  session: lockedSessionState(),
  snapshot: null,
  preferences: null,
  featureFlags: null,
  cantonIdentity: null,
  cantonDiagnostics: null,
  selectedActivityId: null,
  selectedTokenId: null,
  sendDraft: DEFAULT_SEND_DRAFT,
  sendPreview: null,
  swapRequest: DEFAULT_SWAP_REQUEST,
  swapReadiness: null,
  swapRoutes: [],
  swapState: "idle",
  error: null,
  busy: false,
  async bootstrap() {
    const payload = await sendRuntimeRequest<BootstrapPayload>({
      type: "jutis:bootstrap"
    });

    const effectiveNetworkId =
      payload.preferences.selectedNetworkId === "base-mainnet"
        ? "canton-mainnet"
        : payload.preferences.selectedNetworkId;

    set({
      bootstrapped: true,
      hasVault: payload.hasVault,
        screen: deriveScreen(payload.hasVault, payload.session),
        preferences: { ...payload.preferences, selectedNetworkId: effectiveNetworkId },
        featureFlags: payload.featureFlags,
        cantonIdentity: payload.cantonIdentity,
        session: payload.session,
        swapReadiness: null,
        sendDraft: {
          ...DEFAULT_SEND_DRAFT,
          networkId: effectiveNetworkId
        }
      });
  },
  async createWallet(password) {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:create-wallet",
        password
      });

      set({
        hasVault: true,
        session: payload.session,
        screen: deriveScreen(true, payload.session),
        busy: false
      });
      await get().refresh();
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : "Failed to create wallet." });
    }
  },
  async importFromMnemonic(password, mnemonic) {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:import-mnemonic",
        password,
        mnemonic
      });

      set({
        hasVault: true,
        session: payload.session,
        screen: deriveScreen(true, payload.session),
        busy: false
      });
      await get().refresh();
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : "Failed to import mnemonic." });
    }
  },
  async importFromPrivateKey(password, privateKey) {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:import-private-key",
        password,
        privateKey
      });

      set({
        hasVault: true,
        session: payload.session,
        screen: deriveScreen(true, payload.session),
        busy: false
      });
      await get().refresh();
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : "Failed to import private key." });
    }
  },
  async unlock(password) {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:unlock",
        password
      });

      set({
        session: payload.session,
        screen: deriveScreen(get().hasVault, payload.session),
        busy: false
      });
      await get().refresh();
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : "Failed to unlock wallet." });
    }
  },
  async lock() {
    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:lock"
      });

      set({
        session: payload.session,
        snapshot: null,
        screen: "unlock",
        overlay: null,
        sendPreview: null,
        swapRoutes: [],
        swapState: "idle",
        error: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to lock wallet." });
    }
  },
  async refresh() {
    try {
      const payload = await sendRuntimeRequest<RefreshPayload>({
        type: "jutis:refresh"
      });

      set((state) => ({
        snapshot: payload.snapshot,
        session: payload.session,
        sendDraft: updateSendDraftFromSnapshot(state, payload.snapshot)
      }));
    } catch (error) {
      if (isSessionLockedError(error)) {
        applyLockedState();
        return;
      }

      set({ error: error instanceof Error ? error.message : "Failed to refresh portfolio." });
    }
  },
  async touchSession() {
    try {
      const payload = await sendRuntimeRequest<SessionPayload>({
        type: "jutis:touch-session"
      });

      set({
        session: payload.session
      });

      if (payload.session.status === "locked" && get().hasVault) {
        applyLockedState();
      }
    } catch (error) {
      if (isSessionLockedError(error)) {
        applyLockedState();
        return;
      }

      set({ error: error instanceof Error ? error.message : "Failed to update session activity." });
    }
  },
  setScreen(screen) {
    set({ screen, overlay: null, error: null });
  },
  setOverlay(overlay) {
    set({ overlay, error: null });
  },
  setSelectedActivity(activityId) {
    set({ selectedActivityId: activityId });
  },
  setSelectedTokenId(tokenId) {
    set({ selectedTokenId: tokenId });
  },
  updateSendDraft(patch) {
    set((state) => ({
      sendDraft: {
        ...state.sendDraft,
        ...patch
      },
      sendPreview: null
    }));
  },
  async previewSend() {
    const { sendDraft } = get();

    try {
      const payload = await sendRuntimeRequest<SendPreviewPayload>({
        type: "jutis:preview-send",
        draft: sendDraft
      });

      set({
        sendPreview: payload.preview,
        session: payload.session,
        error: null
      });
    } catch (error) {
      if (isSessionLockedError(error)) {
        applyLockedState();
        return;
      }

      set({ error: error instanceof Error ? error.message : "Failed to preview transaction." });
    }
  },
  async submitSend() {
    const { sendDraft, sendPreview } = get();

    if (!sendPreview) {
      return;
    }

    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<SubmitSendPayload>({
        type: "jutis:submit-send",
        draft: sendDraft,
        preview: sendPreview
      });

      set({
        busy: false,
        overlay: null,
        sendPreview: null,
        session: payload.session
      });
      await get().refresh();
      get().setScreen("activity");
    } catch (error) {
      if (isSessionLockedError(error)) {
        set({ busy: false });
        applyLockedState();
        return;
      }

      set({ busy: false, error: error instanceof Error ? error.message : "Failed to submit transaction." });
    }
  },
  async requestSwapQuotes() {
    const { swapReadiness, swapRequest } = get();

    if (!swapReadiness?.canRequestQuotes) {
      set({
        swapRoutes: [],
        swapState: "unsupported",
        error: null
      });
      return;
    }

    set({ swapState: "quoting", error: null });

    try {
      const payload = await sendRuntimeRequest<SwapQuotePayload>({
        type: "jutis:swap-quotes",
        request: swapRequest
      });

      set({
        swapReadiness: payload.readiness,
        swapRoutes: payload.routes,
        swapState: payload.routes.length > 0 ? "quoted" : "unsupported",
        session: payload.session
      });

      if (payload.session.status === "locked" && get().hasVault) {
        applyLockedState("Your session expired while requesting swap quotes.");
      }
    } catch (error) {
      if (isSessionLockedError(error)) {
        applyLockedState("Your session expired while requesting swap quotes.");
        return;
      }

      set({
        swapReadiness,
        swapState: "failed",
        error: error instanceof Error ? error.message : "Failed to request swap quotes."
      });
    }
  },
  async loadSwapReadiness(networkId) {
    const targetNetworkId = networkId ?? get().swapRequest.networkId;

    try {
      const payload = await sendRuntimeRequest<SwapReadinessPayload>({
        type: "jutis:swap-readiness",
        networkId: targetNetworkId
      });

      set((state) => ({
        swapReadiness: payload.readiness,
        swapRoutes: payload.readiness.canRequestQuotes ? state.swapRoutes : [],
        swapState:
          payload.readiness.canRequestQuotes
            ? state.swapState === "unsupported"
              ? "idle"
              : state.swapState
            : "unsupported"
      }));
    } catch (error) {
      set({
        swapReadiness: null,
        swapRoutes: [],
        swapState: "failed",
        error: error instanceof Error ? error.message : "Failed to load swap readiness."
      });
    }
  },
  updateSwapRequest(patch) {
    set((state) => ({
      swapRequest: {
        ...state.swapRequest,
        ...patch
      },
      swapReadiness: patch.networkId && patch.networkId !== state.swapRequest.networkId ? null : state.swapReadiness,
      swapRoutes: patch.networkId && patch.networkId !== state.swapRequest.networkId ? [] : state.swapRoutes,
      swapState: "idle"
    }));
  },
  async updatePreferences(patch) {
    try {
      const payload = await sendRuntimeRequest<PreferencesPayload>({
        type: "jutis:update-preferences",
        patch
      });

      set({
        preferences: payload.preferences,
        session: payload.session
      });

      if (payload.session.status === "locked" && get().hasVault) {
        applyLockedState("Your session was locked while applying updated auto-lock settings.");
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update preferences." });
    }
  },
  async linkParty(partyId: string, scanApiUrl?: string, scanAuthToken?: string, validatorAuthToken?: string, ledgerAuthToken?: string) {
    const trimmed = partyId.trim();
    if (!trimmed) {
      set({ error: "Party identifier cannot be empty." });
      return;
    }

    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<CantonIdentityPayload>({
        type: "jutis:update-canton-identity",
        partyId: trimmed,
        scanApiUrl: scanApiUrl?.trim() || null,
        scanAuthToken: scanAuthToken?.trim() || null,
        validatorAuthToken: validatorAuthToken?.trim() || null,
        ledgerAuthToken: ledgerAuthToken?.trim() || null
      });

      set({
        busy: false,
        cantonIdentity: payload.cantonIdentity,
        screen: "settings"
      });
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Failed to link Canton party."
      });
    }
  },
  async unlinkParty() {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<CantonIdentityPayload>({
        type: "jutis:update-canton-identity",
        partyId: null
      });

      set({
        busy: false,
        cantonIdentity: payload.cantonIdentity,
        screen: "settings"
      });
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Failed to unlink Canton party."
      });
    }
  },
  async diagnoseEnvironment() {
    try {
      const payload = await sendRuntimeRequest<CantonEnvironmentDiagnosticsPayload>({
        type: "jutis:diagnose-canton-environment"
      });

      set({ cantonDiagnostics: payload.diagnostics });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to run Canton environment diagnostics." });
    }
  },
  async updateCantonEnvironment(partial: { validatorApiUrl?: string; ledgerApiUrl?: string; scanApiUrl?: string; validatorAuthToken?: string; ledgerAuthToken?: string; cantonEnvironmentProfile?: string }) {
    set({ busy: true, error: null });

    try {
      const payload = await sendRuntimeRequest<CantonIdentityPayload>({
        type: "jutis:update-canton-environment",
        scanApiUrl: partial.scanApiUrl?.trim() || null,
        validatorApiUrl: partial.validatorApiUrl?.trim() || null,
        ledgerApiUrl: partial.ledgerApiUrl?.trim() || null,
        validatorAuthToken: partial.validatorAuthToken?.trim() || null,
        ledgerAuthToken: partial.ledgerAuthToken?.trim() || null,
        cantonEnvironmentProfile: partial.cantonEnvironmentProfile?.trim() || null
      });

      set({ busy: false, cantonIdentity: payload.cantonIdentity });
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Failed to update Canton environment."
      });
    }
  },
  clearError() {
    set({ error: null });
  }
}));

export function selectActivity(snapshot: PortfolioSnapshot | null, selectedId: string | null): ActivityRecord | null {
  if (!snapshot || !selectedId) {
    return null;
  }

  return snapshot.activity.find((item) => item.id === selectedId) ?? null;
}
