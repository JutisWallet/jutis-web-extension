const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJson(payload: unknown, password: string, iterations = 210_000): Promise<{
  cipherText: string;
  iv: string;
  salt: string;
  iterations: number;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveEncryptionKey(password, salt, iterations);
  const encodedPayload = textEncoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedPayload);

  return {
    cipherText: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    iterations
  };
}

export async function decryptJson<T>(encrypted: {
  cipherText: string;
  iv: string;
  salt: string;
  iterations: number;
}, password: string): Promise<T> {
  const key = await deriveEncryptionKey(password, fromBase64(encrypted.salt), encrypted.iterations);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encrypted.iv) as unknown as BufferSource
    },
    key,
    fromBase64(encrypted.cipherText) as unknown as BufferSource
  );

  return JSON.parse(textDecoder.decode(new Uint8Array(decrypted))) as T;
}
