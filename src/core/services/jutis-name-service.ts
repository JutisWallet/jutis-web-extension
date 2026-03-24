/**
 * JutisNameService
 *
 * Provides @username / friend resolution and management for Jutis.
 *
 * Architecture:
 * - This service owns Jutis's social identity domain model (JutisHandle, FriendConnection, etc.)
 * - It wraps any adopted external resolver behind a clean Jutis-owned interface
 * - Currently uses LOCAL storage only — no live Canton name service is confirmed
 * - When a real Canton-backed name service is available, only this service's internals need replacing
 *
 * Adoption strategy:
 * - LOCAL first: stores handles and friend lists in chrome.storage.local
 * - RESOLVER adapter: resolveHandle() is the plug point for a real @name resolver
 * - When Canton name contracts are available, implement a CantonNameResolver and inject it here
 *
 * This service does NOT:
 * - Make live Canton name service calls (no confirmed endpoint exists)
 * - Claim live social resolution capability in the UI
 * - Replace Canton party identity with a social handle
 */

import type { FriendConnection, FriendReadiness, FriendSearchResult, JutisHandle } from "@/core/models/social-types";

const STORAGE_KEY = "jutis:friends";

interface StoredFriends {
  version: 1;
  friends: JutisHandle[];
}

/**
 * Default readiness when no real resolver is configured.
 */
function defaultReadiness(): FriendReadiness {
  return {
    canSearch: false,
    canAddFriends: false,
    friendCount: 0,
    summary: "No live name resolver configured.",
    blockers: ["No Canton @name service endpoint confirmed", "Friend resolution is local/mock only"]
  };
}

export class JutisNameService {
  /**
   * Attempt to resolve an @username to a JutisHandle.
   *
   * Currently: local-only lookup in stored friends list.
   * Future: inject a CantonNameResolver adapter when a real endpoint is confirmed.
   *
   * @param handle The handle to resolve (with or without @ prefix)
   */
  async resolveHandle(handle: string): Promise<JutisHandle | null> {
    const normalized = handle.startsWith("@") ? handle.slice(1) : handle;
    const friends = await this.loadFriends();
    return friends.find((f) => f.handle.toLowerCase() === normalized.toLowerCase()) ?? null;
  }

  /**
   * Search for handles matching a query string.
   *
   * Currently: local substring match against stored friends.
   * Future: delegate to a real Canton name service resolver.
   *
   * @param query The search query (with or without @ prefix)
   */
  async searchFriends(query: string): Promise<FriendSearchResult[]> {
    const normalized = query.startsWith("@") ? query.slice(1) : query;

    if (!normalized.trim()) {
      return [];
    }

    const friends = await this.loadFriends();
    const lowerQuery = normalized.toLowerCase();

    // Local search: substring match against stored friends
    const matches = friends.filter((f) => f.handle.toLowerCase().includes(lowerQuery));

    return matches.map((f) => ({
      handle: f.handle,
      displayName: f.displayName,
      state: "reference-only" as const,
      note: "Found in local friend list. Live resolution unavailable."
    }));
  }

  /**
   * Add a handle to the local friends list.
   *
   * @param handle The handle to add
   * @param displayName Optional display name
   */
  async addFriend(handle: JutisHandle): Promise<void> {
    const friends = await this.loadFriends();
    const normalized = handle.handle.startsWith("@")
      ? handle.handle.slice(1)
      : handle.handle;

    // Avoid duplicates
    if (friends.some((f) => f.handle.toLowerCase() === normalized.toLowerCase())) {
      return;
    }

    friends.push({
      ...handle,
      handle: normalized,
      addedAt: handle.addedAt ?? new Date().toISOString()
    });

    await this.saveFriends(friends);
  }

  /**
   * Remove a handle from the local friends list.
   *
   * @param handleId The handle string to remove
   */
  async removeFriend(handleId: string): Promise<void> {
    const normalized = handleId.startsWith("@") ? handleId.slice(1) : handleId;
    const friends = await this.loadFriends();
    const filtered = friends.filter(
      (f) => f.handle.toLowerCase() !== normalized.toLowerCase()
    );
    await this.saveFriends(filtered);
  }

  /**
   * List all stored friends.
   */
  async listFriends(): Promise<FriendConnection[]> {
    const friends = await this.loadFriends();
    return friends.map((f) => ({
      handle: f.handle,
      displayName: f.displayName,
      partyId: f.partyId,
      addedAt: f.addedAt ?? new Date().toISOString(),
      state: "reference-only" as const
    }));
  }

  /**
   * Get friend feature readiness.
   *
   * Returns honest state: no live resolver means canSearch/canAddFriends are false.
   */
  async getReadiness(): Promise<FriendReadiness> {
    const friends = await this.loadFriends();
    return {
      canSearch: false,
      canAddFriends: true,
      friendCount: friends.length,
      summary:
        friends.length === 0
          ? "No friends added yet. Search for @usernames to add them."
          : `${friends.length} friend${friends.length === 1 ? "" : "s"} added. Live resolution unavailable.`,
      blockers:
        friends.length === 0
          ? []
          : ["No live @name resolver confirmed — using local list only"]
    };
  }

  private async loadFriends(): Promise<JutisHandle[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const stored = result[STORAGE_KEY] as StoredFriends | undefined;
        resolve(stored?.friends ?? []);
      });
    });
  }

  private async saveFriends(friends: JutisHandle[]): Promise<void> {
    const stored: StoredFriends = { version: 1, friends };
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: stored }, resolve);
    });
  }
}

export const jutisNameService = new JutisNameService();
