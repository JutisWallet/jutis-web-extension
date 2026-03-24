import type {
  ActivityRecord,
  BaseTrackedTransactionRecord,
  CantonIdentity,
  FeatureFlags,
  PersistedVault,
  SessionState,
  WalletPreferences
} from "@/core/models/types";
import { DEFAULT_CANTON_IDENTITY, DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "@/core/models/fixtures";
import { persistentStorage, sessionStorageLike } from "@/storage/extension-storage";

const KEYS = {
  vault: "jutis:vault",
  prefs: "jutis:prefs",
  cantonIdentity: "jutis:canton-identity",
  flags: "jutis:flags",
  activity: "jutis:activity",
  baseTransactions: "jutis:base-transactions",
  session: "jutis:session"
} as const;

export async function readVault(): Promise<PersistedVault | undefined> {
  return persistentStorage.get<PersistedVault>(KEYS.vault);
}

export async function writeVault(vault: PersistedVault): Promise<void> {
  await persistentStorage.set(KEYS.vault, vault);
}

export async function readPreferences(): Promise<WalletPreferences> {
  return (await persistentStorage.get<WalletPreferences>(KEYS.prefs)) ?? DEFAULT_PREFERENCES;
}

export async function writePreferences(preferences: WalletPreferences): Promise<void> {
  await persistentStorage.set(KEYS.prefs, preferences);
}

export async function readCantonIdentity(): Promise<CantonIdentity> {
  return (await persistentStorage.get<CantonIdentity>(KEYS.cantonIdentity)) ?? DEFAULT_CANTON_IDENTITY;
}

export async function writeCantonIdentity(identity: CantonIdentity): Promise<void> {
  await persistentStorage.set(KEYS.cantonIdentity, identity);
}

export async function readFeatureFlags(): Promise<FeatureFlags> {
  return (await persistentStorage.get<FeatureFlags>(KEYS.flags)) ?? DEFAULT_FEATURE_FLAGS;
}

export async function writeFeatureFlags(flags: FeatureFlags): Promise<void> {
  await persistentStorage.set(KEYS.flags, flags);
}

export async function readActivityJournal(): Promise<ActivityRecord[]> {
  return (await persistentStorage.get<ActivityRecord[]>(KEYS.activity)) ?? [];
}

export async function writeActivityJournal(activity: ActivityRecord[]): Promise<void> {
  await persistentStorage.set(KEYS.activity, activity);
}

export async function readBaseTransactions(): Promise<BaseTrackedTransactionRecord[]> {
  return (await persistentStorage.get<BaseTrackedTransactionRecord[]>(KEYS.baseTransactions)) ?? [];
}

export async function writeBaseTransactions(records: BaseTrackedTransactionRecord[]): Promise<void> {
  await persistentStorage.set(KEYS.baseTransactions, records);
}

export async function readSessionState(): Promise<SessionState | undefined> {
  return sessionStorageLike.get<SessionState>(KEYS.session);
}

export async function writeSessionState(sessionState: SessionState): Promise<void> {
  await sessionStorageLike.set(KEYS.session, sessionState);
}

export async function clearSessionState(): Promise<void> {
  await sessionStorageLike.remove(KEYS.session);
}
