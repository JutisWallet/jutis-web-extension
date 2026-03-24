export interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}

class ChromeStorageArea implements StorageLike {
  constructor(private readonly area: chrome.storage.StorageArea) {}

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.area.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await this.area.remove(key);
  }
}

export const persistentStorage: StorageLike =
  typeof chrome !== "undefined" && chrome.storage?.local ? new ChromeStorageArea(chrome.storage.local) : new MemoryStorage();

export const sessionStorageLike: StorageLike =
  typeof chrome !== "undefined" && chrome.storage?.session ? new ChromeStorageArea(chrome.storage.session) : new MemoryStorage();

export async function configureSessionStorageAccess(): Promise<void> {
  if (!chrome.storage?.session?.setAccessLevel) {
    return;
  }

  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS"
  });
}
