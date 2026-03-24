/**
 * Jutis social / @name domain types.
 *
 * These types define Jutis's own social identity surface.
 * They are wrapped around any adopted external foundation so Jutis
 * owns the domain model regardless of the underlying resolver.
 */

export type FriendCapabilityState = "live" | "partial" | "reference-only" | "unsupported";

/** A resolved Jutis handle / @username. */
export interface JutisHandle {
  handle: string;
  displayName?: string;
  partyId?: string;
  avatarUrl?: string;
  bio?: string;
  addedAt?: string;
}

/** Result of searching for a handle. */
export interface FriendSearchResult {
  handle: string;
  displayName?: string;
  state: FriendCapabilityState;
  note?: string;
}

/** A confirmed friend connection. */
export interface FriendConnection {
  handle: string;
  displayName?: string;
  partyId?: string;
  addedAt: string;
  state: FriendCapabilityState;
}

/** Friend feature readiness. */
export interface FriendReadiness {
  canSearch: boolean;
  canAddFriends: boolean;
  friendCount: number;
  summary: string;
  blockers: string[];
}
