export class WalletError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "WalletError";
  }
}

export class AdapterCapabilityError extends WalletError {
  constructor(message: string) {
    super(message, "ADAPTER_CAPABILITY");
    this.name = "AdapterCapabilityError";
  }
}

export class LockedVaultError extends WalletError {
  constructor() {
    super("The vault is locked.", "VAULT_LOCKED");
    this.name = "LockedVaultError";
  }
}

export class SessionLockedError extends WalletError {
  constructor(message = "The wallet session is locked. Unlock the vault again to continue.") {
    super(message, "SESSION_LOCKED");
    this.name = "SessionLockedError";
  }
}

export class ValidationError extends WalletError {
  constructor(message: string) {
    super(message, "VALIDATION");
    this.name = "ValidationError";
  }
}
