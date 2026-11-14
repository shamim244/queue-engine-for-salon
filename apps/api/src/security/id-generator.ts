/**
 * Cryptographically Secure Pseudo-Random Identifier Generator
 * Replaces Math.random() with high-entropy CSPRNG (Web Crypto API).
 */
export function generateSecureId(prefix = '', length = 8): string {
  const bytes = new Uint8Array(Math.ceil(length));
  crypto.getRandomValues(bytes);
  // Base36 encoding of random bytes for clean readable alphanumeric IDs
  let str = '';
  for (let i = 0; i < bytes.length && str.length < length; i++) {
    str += (bytes[i] % 36).toString(36);
  }
  return `${prefix}${str}`;
}

export function generateCryptoUuid(): string {
  return crypto.randomUUID();
}
