import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistedVault } from "@/core/models/types";

const repositoryState = vi.hoisted(() => ({
  storedVault: undefined as PersistedVault | undefined
}));

vi.mock("@/storage/vault-repository", () => ({
  readVault: vi.fn(async () => repositoryState.storedVault),
  writeVault: vi.fn(async (vault: PersistedVault) => {
    repositoryState.storedVault = vault;
  })
}));

import { VaultService } from "@/core/services/vault-service";

describe("VaultService", () => {
  beforeEach(() => {
    repositoryState.storedVault = undefined;
  });

  it("creates an encrypted vault from a random mnemonic and unlocks it successfully", async () => {
    const service = new VaultService();

    const persisted = await service.createFromRandomMnemonic("correct horse battery staple");

    expect(persisted.version).toBe(1);
    expect(persisted.cipherText).toBeTruthy();
    expect(persisted.cipherText.includes("baseMnemonic")).toBe(false);
    expect(repositoryState.storedVault).toEqual(persisted);

    const unlocked = await service.unlock("correct horse battery staple");

    expect(unlocked.baseMnemonic).toBeTruthy();
    expect(unlocked.baseMnemonic?.split(" ").length).toBeGreaterThanOrEqual(12);
    expect(unlocked.basePrivateKey).toBeUndefined();
  });

  it("rejects invalid import material for mnemonic and private-key vault creation", async () => {
    const service = new VaultService();

    await expect(service.createFromMnemonic("test-password", "not a valid mnemonic")).rejects.toThrow();
    await expect(service.createFromPrivateKey("test-password", "0x1234" as `0x${string}`)).rejects.toThrow();
  });

  it("unlocks successfully with the correct password and fails with the wrong password", async () => {
    const service = new VaultService();
    const privateKey = "0x59c6995e998f97a5a004497e5da18b775f7c3d8e4e6d0f2d6f4858cc5b64cf2a" as const;

    await service.createFromPrivateKey("strong-password", privateKey);

    await expect(service.unlock("strong-password")).resolves.toEqual({
      basePrivateKey: privateKey
    });
    await expect(service.unlock("wrong-password")).rejects.toThrow();
  });
});
