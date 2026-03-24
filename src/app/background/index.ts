import { controller } from "@/app/shared/controller";
import { executeRuntimeRequest, getSessionService } from "@/app/shared/runtime-dispatcher";
import type { RuntimeRequest, RuntimeResponse } from "@/app/shared/runtime-types";
import { WalletError } from "@/core/services/errors";
import { configureSessionStorageAccess } from "@/storage/extension-storage";

const AUTO_LOCK_ALARM = "jutis:auto-lock";
const BASE_RECONCILE_ALARM = "jutis:base-reconcile";
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
    await chrome.alarms.create(BASE_RECONCILE_ALARM, {
      periodInMinutes: 1
    });
  }
}

async function initializeRuntimeSession(): Promise<void> {
  await configureSessionStorageAccess();
  await sessionService.enforceExpiry();
  await controller.reconcileBackgroundActivity();
  await syncAutoLockAlarm();
  await syncBaseReconcileAlarm();
}

async function lockAndSyncSession(): Promise<void> {
  await sessionService.lock();
  await syncAutoLockAlarm();
}

chrome.runtime.onStartup.addListener(() => {
  // We intentionally require a fresh unlock after browser restart.
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
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeRequest, _sender, sendResponse) => {
  void (async () => {
    try {
      const data = await executeRuntimeRequest(message);
      await syncAutoLockAlarm();
      await syncBaseReconcileAlarm();

      sendResponse({
        ok: true,
        data
      } satisfies RuntimeResponse<typeof data>);
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
