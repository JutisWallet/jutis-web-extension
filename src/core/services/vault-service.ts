import { Wallet } from "ethers";

import type { PersistedVault, WalletVaultSecret } from "@/core/models/types";
import { decryptJson, encryptJson } from "@/security/crypto";
import { readVault, writeVault } from "@/storage/vault-repository";

export class VaultService {
  async hasVault(): Promise<boolean> {
    return Boolean(await readVault());
  }

  async createFromRandomMnemonic(password: string): Promise<PersistedVault> {
    const wallet = Wallet.createRandom();

    if (!wallet.mnemonic?.phrase) {
      throw new Error("Failed to generate a mnemonic.");
    }

    return this.persistSecret(password, { baseMnemonic: wallet.mnemonic.phrase });
  }

  async createFromMnemonic(password: string, mnemonic: string): Promise<PersistedVault> {
    Wallet.fromPhrase(mnemonic.trim());
    return this.persistSecret(password, { baseMnemonic: mnemonic.trim() });
  }

  async createFromPrivateKey(password: string, privateKey: `0x${string}`): Promise<PersistedVault> {
    new Wallet(privateKey);
    return this.persistSecret(password, { basePrivateKey: privateKey });
  }

  async unlock(password: string): Promise<WalletVaultSecret> {
    const persisted = await readVault();

    if (!persisted) {
      throw new Error("No vault exists.");
    }

    return decryptJson<WalletVaultSecret>(persisted, password);
  }

  private async persistSecret(password: string, secret: WalletVaultSecret): Promise<PersistedVault> {
    const encrypted = await encryptJson(secret, password);
    const now = new Date().toISOString();
    const persisted: PersistedVault = {
      version: 1,
      cipherText: encrypted.cipherText,
      iv: encrypted.iv,
      salt: encrypted.salt,
      iterations: encrypted.iterations,
      createdAt: now,
      updatedAt: now
    };

    await writeVault(persisted);
    return persisted;
  }
}
