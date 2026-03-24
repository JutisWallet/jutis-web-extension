import type { SessionSnapshot, SessionState, WalletVaultSecret } from "@/core/models/types";
import { SessionLockedError } from "@/core/services/errors";
import { clearSessionState, readSessionState, writeSessionState } from "@/storage/vault-repository";

const SESSION_VERSION = 1 as const;

function clampAutoLockMinutes(value: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(value) : 15, 1), 120);
}

function getExpiry(nowMs: number, autoLockMinutes: number): string {
  return new Date(nowMs + clampAutoLockMinutes(autoLockMinutes) * 60_000).toISOString();
}

function toSnapshot(sessionState: SessionState): SessionSnapshot {
  return {
    status: "unlocked",
    unlockedAt: sessionState.unlockedAt,
    lastActivityAt: sessionState.lastActivityAt,
    expiresAt: sessionState.expiresAt,
    autoLockMinutes: sessionState.autoLockMinutes
  };
}

export class SessionService {
  async getSnapshot(): Promise<SessionSnapshot> {
    const sessionState = await this.getActiveSessionState();
    return sessionState ? toSnapshot(sessionState) : { status: "locked" };
  }

  async start(secret: WalletVaultSecret, autoLockMinutes: number): Promise<SessionSnapshot> {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    // The decrypted vault secret is kept only in extension session storage so popup
    // windows can be reopened without re-entering the password on every click.
    // This is still a browser-extension tradeoff, not production-grade custody.
    const sessionState: SessionState = {
      version: SESSION_VERSION,
      secret,
      unlockedAt: now,
      lastActivityAt: now,
      expiresAt: getExpiry(nowMs, autoLockMinutes),
      autoLockMinutes: clampAutoLockMinutes(autoLockMinutes)
    };

    await writeSessionState(sessionState);
    return toSnapshot(sessionState);
  }

  async lock(): Promise<SessionSnapshot> {
    await clearSessionState();
    return { status: "locked" };
  }

  async touch(): Promise<SessionSnapshot> {
    const sessionState = await this.getActiveSessionState();

    if (!sessionState) {
      return { status: "locked" };
    }

    const nowMs = Date.now();
    const nextSessionState: SessionState = {
      ...sessionState,
      lastActivityAt: new Date(nowMs).toISOString(),
      expiresAt: getExpiry(nowMs, sessionState.autoLockMinutes)
    };

    await writeSessionState(nextSessionState);
    return toSnapshot(nextSessionState);
  }

  async syncAutoLock(autoLockMinutes: number): Promise<SessionSnapshot> {
    const sessionState = await this.getActiveSessionState();

    if (!sessionState) {
      return { status: "locked" };
    }

    const nowMs = Date.now();
    const nextSessionState: SessionState = {
      ...sessionState,
      autoLockMinutes: clampAutoLockMinutes(autoLockMinutes),
      lastActivityAt: new Date(nowMs).toISOString(),
      expiresAt: getExpiry(nowMs, autoLockMinutes)
    };

    await writeSessionState(nextSessionState);
    return toSnapshot(nextSessionState);
  }

  async getSecretOrThrow({ touch = true }: { touch?: boolean } = {}): Promise<WalletVaultSecret> {
    const sessionState = await this.getActiveSessionState();

    if (!sessionState) {
      throw new SessionLockedError();
    }

    if (touch) {
      const nextSessionState: SessionState = {
        ...sessionState,
        lastActivityAt: new Date().toISOString(),
        expiresAt: getExpiry(Date.now(), sessionState.autoLockMinutes)
      };
      await writeSessionState(nextSessionState);
      return nextSessionState.secret;
    }

    return sessionState.secret;
  }

  async enforceExpiry(): Promise<SessionSnapshot> {
    return this.getSnapshot();
  }

  async getAlarmTimestamp(): Promise<number | null> {
    const sessionState = await this.getActiveSessionState();
    return sessionState ? new Date(sessionState.expiresAt).getTime() : null;
  }

  private async getActiveSessionState(): Promise<SessionState | null> {
    const sessionState = await readSessionState();

    if (!sessionState) {
      return null;
    }

    if (new Date(sessionState.expiresAt).getTime() <= Date.now()) {
      // Expired sessions are removed immediately so stale decrypted material does not
      // survive popup reopen or a restarted service worker within the same browser session.
      await clearSessionState();
      return null;
    }

    return sessionState;
  }
}
