import { controller } from "@/app/shared/controller";
import { executeRuntimeRequest, getSessionService } from "@/app/shared/runtime-dispatcher";
import type { RuntimeRequest, RuntimeResponse } from "@/app/shared/runtime-types";
import { WalletError } from "@/core/services/errors";
import { configureSessionStorageAccess } from "@/storage/extension-storage";
import { cantonApiClient } from "@/adapters/canton/services/canton-api-client";

const AUTO_LOCK_ALARM = "jutis:auto-lock";
const BASE_RECONCILE_ALARM = "jutis:base-reconcile";
const CANTON_SYNC_ALARM = "jutis:canton-sync";

const sessionService = getSessionService();

async function syncAutoLockAlarm(): Promise<void> {
  await chrome.alarms.clear(AUTO_LOCK_ALARM);
  const when = await sessionService.getAlarmTimestamp();
  if (when) {
    await chrome.alarms.create(AUTO_LOCK_ALARM, { when });
  }
}

async function syncBaseReconcileAlarm(): Promise<void> {
  await chrome.alarms.clear(BASE_RECONCILE_ALARM);
  if (await controller.hasPendingBackgroundActivity()) {
    await chrome.alarms.create(BASE_RECONCILE_ALARM, { periodInMinutes: 1 });
  }
}

/**
 * Canton backend sync alarm — fires every 5 minutes.
 * Keeps the JWT token fresh and caches latest balance and activity.
 */
async function syncCantonAlarm(): Promise<void> {
  await chrome.alarms.clear(CANTON_SYNC_ALARM);
  await chrome.alarms.create(CANTON_SYNC_ALARM, { periodInMinutes: 5 });
}

async function reconcileCantonBackend(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get("canton:partyId");
    const partyId = stored["canton:partyId"] as string | undefined;
    if (!partyId) return;

    await cantonApiClient.authenticate(partyId);
    console.log("[Canton] Backend sync successful — party:", partyId);

    const balance = await cantonApiClient.getBalance(partyId);
    await chrome.storage.local.set({ "canton:lastBalance": balance });

    const activity = await cantonApiClient.getActivity(partyId);
    await chrome.storage.local.set({ "canton:lastActivity": activity });

  } catch (err) {
    // Backend unreachable — fail silently, mock data continues
    console.warn("[Canton] Backend sync failed:", err instanceof Error ? err.message : String(err));
  }
}

async function initializeRuntimeSession(): Promise<void> {
  await configureSessionStorageAccess();
  await sessionService.enforceExpiry();
  await controller.reconcileBackgroundActivity();
  await syncAutoLockAlarm();
  await syncBaseReconcileAlarm();
  await syncCantonAlarm();
  // Trigger an immediate sync on startup
  void reconcileCantonBackend();
}

async function lockAndSyncSession(): Promise<void> {
  await sessionService.lock();
  await syncAutoLockAlarm();
  // Clear Canton token on lock
  cantonApiClient.clearToken();
}

chrome.runtime.onStartup.addListener(() => {
  void lockAndSyncSession();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void lockAndSyncSession();
    return;
  }
  if (alarm.name === BASE_RECONCILE_ALARM) {
    void (async () => {
      await controller.reconcileBackgroundActivity();
      await syncBaseReconcileAlarm();
    })();
    return;
  }
  if (alarm.name === CANTON_SYNC_ALARM) {
    void reconcileCantonBackend();
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeRequest, _sender, sendResponse) => {
  void (async () => {
    try {
      const data = await executeRuntimeRequest(message);
      await syncAutoLockAlarm();
      await syncBaseReconcileAlarm();
      sendResponse({ ok: true, data } satisfies RuntimeResponse<typeof data>);
    } catch (error) {
      await syncAutoLockAlarm();
      await syncBaseReconcileAlarm();
      if (error instanceof WalletError) {
        sendResponse({
          ok: false,
          error: error.message,
          code: error.code
        } satisfies RuntimeResponse<never>);
        return;
      }
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected runtime failure."
      } satisfies RuntimeResponse<never>);
    }
  })();
  return true;
});

void initializeRuntimeSession();
