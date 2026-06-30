/** Encryption format version embedded in {@link ENCRYPTED_API_KEY_PREFIX}. */
const CRYPTO_VERSION = 1

/** Application-specific salt used for PBKDF2 key derivation. */
const SALT = 'cad-agent-plugin-api-key-v1'

/** AES-GCM initialization vector length in bytes. */
const IV_LENGTH = 12

/**
 * Prefix that marks an API key value as encrypted in `localStorage`.
 *
 * Payloads use the form `enc:v{version}:{base64(iv + ciphertext)}`.
 */
export const ENCRYPTED_API_KEY_PREFIX = `enc:v${CRYPTO_VERSION}:`

/**
 * Builds the password material for PBKDF2 from the page origin and {@link SALT}.
 *
 * @returns A string bound to the current browsing origin (or `file://` when unavailable).
 */
function getEncryptionMaterial(): string {
  const origin =
    typeof globalThis.location?.origin === 'string'
      ? globalThis.location.origin
      : 'file://'
  return `${origin}:${SALT}`
}

/**
 * Derives the AES-GCM key used to encrypt and decrypt stored API keys.
 *
 * Uses PBKDF2 (SHA-256, 100k iterations) over {@link getEncryptionMaterial}.
 *
 * @returns A 256-bit {@link CryptoKey} suitable for AES-GCM.
 */
async function deriveCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getEncryptionMaterial()),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100_000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encodes a byte array as a standard base64 string.
 *
 * @param bytes - Raw bytes to encode.
 * @returns Base64 representation of `bytes`.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/**
 * Decodes a standard base64 string into a byte array.
 *
 * @param value - Base64 text to decode.
 * @returns Decoded bytes.
 */
function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * Encrypts an API key for storage in `localStorage`.
 *
 * Uses AES-GCM with a random {@link IV_LENGTH}-byte IV prepended to the ciphertext.
 * Empty input returns an empty string without invoking Web Crypto.
 *
 * @param apiKey - Plaintext provider API key.
 * @returns Encrypted payload prefixed with {@link ENCRYPTED_API_KEY_PREFIX}.
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  if (!apiKey) {
    return ''
  }

  const key = await deriveCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(apiKey)
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  const payload = new Uint8Array(iv.length + cipherText.byteLength)
  payload.set(iv, 0)
  payload.set(new Uint8Array(cipherText), iv.length)

  return `${ENCRYPTED_API_KEY_PREFIX}${toBase64(payload)}`
}

/**
 * Decrypts an API key previously stored by {@link encryptApiKey}.
 *
 * Values without {@link ENCRYPTED_API_KEY_PREFIX} are returned unchanged so legacy
 * plaintext entries can be migrated on the next save. Decryption failures yield
 * an empty string.
 *
 * @param encryptedApiKey - Encrypted payload or legacy plaintext value.
 * @returns Plaintext API key, or an empty string when input is empty or decryption fails.
 */
export async function decryptApiKey(encryptedApiKey: string): Promise<string> {
  if (!encryptedApiKey) {
    return ''
  }

  if (!encryptedApiKey.startsWith(ENCRYPTED_API_KEY_PREFIX)) {
    return encryptedApiKey
  }

  try {
    const key = await deriveCryptoKey()
    const payload = fromBase64(
      encryptedApiKey.slice(ENCRYPTED_API_KEY_PREFIX.length)
    )
    const iv = payload.slice(0, IV_LENGTH)
    const cipherText = payload.slice(IV_LENGTH)
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherText
    )
    return new TextDecoder().decode(plainBuffer)
  } catch {
    return ''
  }
}
