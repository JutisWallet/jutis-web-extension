import { controller } from "@/app/shared/controller";
import { SessionService } from "@/core/services/session-service";
import { DEFAULT_CANTON_IDENTITY, DEFAULT_CANTON_CAPABILITIES } from "@/core/models/fixtures";
import type {
  BootstrapPayload,
  PreferencesPayload,
  RefreshPayload,
  RuntimeRequest,
  SwapReadinessPayload,
  SendPreviewPayload,
  SessionPayload,
  SubmitSendPayload,
  SwapQuotePayload,
  CantonIdentityPayload,
  CantonEnvironmentDiagnosticsPayload
} from "@/app/shared/runtime-types";

const sessionService = new SessionService();

export function getSessionService(): SessionService {
  return sessionService;
}

export async function executeRuntimeRequest(request: RuntimeRequest): Promise<
  | BootstrapPayload
  | PreferencesPayload
  | RefreshPayload
  | SendPreviewPayload
  | SessionPayload
  | SubmitSendPayload
  | SwapQuotePayload
  | SwapReadinessPayload
  | CantonIdentityPayload
  | CantonEnvironmentDiagnosticsPayload
> {
  switch (request.type) {
    case "jutis:bootstrap": {
      const [hasVault, preferences, featureFlags, cantonIdentity, session] = await Promise.all([
        controller.vaultService.hasVault(),
        controller.readPreferences(),
        controller.readFeatureFlags(),
        controller.readCantonIdentity(),
        sessionService.getSnapshot()
      ]);

      return {
        hasVault,
        preferences,
        featureFlags,
        cantonIdentity,
        session
      };
    }
    case "jutis:create-wallet": {
      await controller.createVaultFromMnemonic(request.password);
      const [preferences, secret] = await Promise.all([
        controller.readPreferences(),
        controller.unlockVault(request.password)
      ]);

      return {
        session: await sessionService.start(secret, preferences.autoLockMinutes)
      };
    }
    case "jutis:import-mnemonic": {
      await controller.importVaultFromMnemonic(request.password, request.mnemonic);
      const [preferences, secret] = await Promise.all([
        controller.readPreferences(),
        controller.unlockVault(request.password)
      ]);

      return {
        session: await sessionService.start(secret, preferences.autoLockMinutes)
      };
    }
    case "jutis:import-private-key": {
      await controller.importVaultFromPrivateKey(request.password, request.privateKey);
      const [preferences, secret] = await Promise.all([
        controller.readPreferences(),
        controller.unlockVault(request.password)
      ]);

      return {
        session: await sessionService.start(secret, preferences.autoLockMinutes)
      };
    }
    case "jutis:unlock": {
      const [preferences, secret] = await Promise.all([
        controller.readPreferences(),
        controller.unlockVault(request.password)
      ]);

      return {
        session: await sessionService.start(secret, preferences.autoLockMinutes)
      };
    }
    case "jutis:lock":
      return {
        session: await sessionService.lock()
      };
    case "jutis:touch-session":
      return {
        session: await sessionService.touch()
      };
    case "jutis:refresh": {
      const [secret, cantonIdentity] = await Promise.all([
        sessionService.getSecretOrThrow(),
        controller.readCantonIdentity()
      ]);
      const snapshot = await controller.loadPortfolio(secret, cantonIdentity);

      return {
        snapshot,
        session: await sessionService.getSnapshot()
      };
    }
    case "jutis:preview-send": {
      const [secret, cantonIdentity] = await Promise.all([
        sessionService.getSecretOrThrow(),
        controller.readCantonIdentity()
      ]);
      const snapshot = await controller.loadPortfolio(secret, cantonIdentity);
      const preview = await controller.previewSend(secret, request.draft, snapshot);

      return {
        preview,
        session: await sessionService.getSnapshot()
      };
    }
    case "jutis:submit-send": {
      const secret = await sessionService.getSecretOrThrow();
      const submitted = await controller.submitSend(secret, request.draft, request.preview);

      return {
        submitted,
        session: await sessionService.getSnapshot()
      };
    }
    case "jutis:swap-readiness":
      return {
        readiness: controller.getSwapReadiness(request.networkId)
      };
    case "jutis:swap-quotes":
      await sessionService.getSecretOrThrow({ touch: false });

      return {
        readiness: controller.getSwapReadiness(request.request.networkId),
        routes: await controller.getSwapQuotes(request.request),
        session: await sessionService.touch()
      };
    case "jutis:update-preferences": {
      const current = await controller.readPreferences();
      const preferences = {
        ...current,
        ...request.patch
      };

      await controller.writePreferences(preferences);

      return {
        preferences,
        session:
          request.patch.autoLockMinutes !== undefined
            ? await sessionService.syncAutoLock(preferences.autoLockMinutes)
            : await sessionService.touch()
      };
    }
    case "jutis:update-canton-identity": {
      const currentIdentity = await controller.readCantonIdentity();

      const nextIdentity = request.partyId == null
        ? { ...DEFAULT_CANTON_IDENTITY, cantonEnvironmentProfile: currentIdentity.cantonEnvironmentProfile }
        : {
            ...currentIdentity,
            partyId: request.partyId,
            scanApiUrl: request.scanApiUrl !== undefined ? (request.scanApiUrl ?? undefined) : currentIdentity.scanApiUrl,
            scanAuthToken: request.scanAuthToken !== undefined ? (request.scanAuthToken ?? undefined) : currentIdentity.scanAuthToken,
            validatorAuthToken: request.validatorAuthToken !== undefined ? (request.validatorAuthToken ?? undefined) : currentIdentity.validatorAuthToken,
            ledgerAuthToken: request.ledgerAuthToken !== undefined ? (request.ledgerAuthToken ?? undefined) : currentIdentity.ledgerAuthToken,
            validatorApiUrl: request.validatorApiUrl !== undefined ? (request.validatorApiUrl ?? undefined) : currentIdentity.validatorApiUrl,
            ledgerApiUrl: request.ledgerApiUrl !== undefined ? (request.ledgerApiUrl ?? undefined) : currentIdentity.ledgerApiUrl,
            authMode: "unlinked" as const,
            support: "partial" as const,
            capabilities: DEFAULT_CANTON_CAPABILITIES
          };

      await controller.writeCantonIdentity(nextIdentity);

      return {
        cantonIdentity: nextIdentity,
        session: await sessionService.getSnapshot()
      };
    }
    case "jutis:diagnose-canton-environment": {
      const identity = await controller.readCantonIdentity();
      const diagnostics = await controller.diagnoseCantonEnvironment(identity);

      return {
        diagnostics,
        cantonIdentity: identity,
        session: await sessionService.getSnapshot()
      };
    }
    case "jutis:update-canton-environment": {
      const currentIdentity = await controller.readCantonIdentity();

      const nextIdentity: typeof currentIdentity = {
        ...currentIdentity,
        scanApiUrl: request.scanApiUrl !== undefined ? (request.scanApiUrl ?? undefined) : currentIdentity.scanApiUrl,
        validatorApiUrl: request.validatorApiUrl !== undefined ? (request.validatorApiUrl ?? undefined) : currentIdentity.validatorApiUrl,
        ledgerApiUrl: request.ledgerApiUrl !== undefined ? (request.ledgerApiUrl ?? undefined) : currentIdentity.ledgerApiUrl,
        validatorAuthToken: request.validatorAuthToken !== undefined ? (request.validatorAuthToken ?? undefined) : currentIdentity.validatorAuthToken,
        ledgerAuthToken: request.ledgerAuthToken !== undefined ? (request.ledgerAuthToken ?? undefined) : currentIdentity.ledgerAuthToken,
        cantonEnvironmentProfile: request.cantonEnvironmentProfile !== undefined ? (request.cantonEnvironmentProfile ?? undefined) : currentIdentity.cantonEnvironmentProfile
      };

      await controller.writeCantonIdentity(nextIdentity);

      return {
        cantonIdentity: nextIdentity,
        session: await sessionService.getSnapshot()
      };
    }
  }
}
