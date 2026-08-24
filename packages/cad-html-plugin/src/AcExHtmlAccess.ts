import type { AcExEncodedSnapshot } from './AcExSnapshotCodec'

/** Access-control manifest schema version embedded in exported HTML. */
export const ACEX_HTML_ACCESS_VERSION = 1 as const

/** Supported HTML export validity periods in days. */
export type AcApHtmlExpiryDays = 1 | 7 | 30 | 'never'

/**
 * Access metadata embedded in protected HTML exports.
 *
 * When {@link AcExHtmlAccessManifest.encrypted} is `true`, the snapshot payload
 * is AES-GCM encrypted and requires the export password to decode.
 */
export interface AcExHtmlAccessManifest {
  /** Manifest schema version. */
  v: typeof ACEX_HTML_ACCESS_VERSION
  /** Unix timestamp (ms) after which the file must not open; `null` = no expiry. */
  expiresAt: number | null
  /** When `true`, the snapshot script body is password-encrypted. */
  encrypted: boolean
  /** Base64 PBKDF2 salt; present when {@link AcExHtmlAccessManifest.encrypted} is `true`. */
  salt?: string
}

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const IV_BYTES = 12

/**
 * Computes the expiry timestamp from a validity period and export time.
 */
export function resolveAcApHtmlExpiresAt(
  expiryDays: AcApHtmlExpiryDays,
  exportedAt = Date.now()
): number | null {
  if (expiryDays === 'never') {
    return null
  }
  return exportedAt + expiryDays * 24 * 60 * 60 * 1000
}

/**
 * Returns whether export options require an access manifest in the HTML file.
 */
export function needsAcExHtmlAccessControl(options: {
  expiresAt: number | null
  password?: string
}): boolean {
  const hasPassword = Boolean(options.password?.trim())
  return options.expiresAt != null || hasPassword
}

/**
 * Returns whether an access manifest has passed its expiry time.
 */
export function isAcExHtmlAccessExpired(
  manifest: AcExHtmlAccessManifest,
  now = Date.now()
): boolean {
  return manifest.expiresAt != null && now > manifest.expiresAt
}

/**
 * Parses the `#mlcad-access` JSON manifest from an exported HTML file.
 */
export function parseAcExHtmlAccessManifest(
  raw: string | null | undefined
): AcExHtmlAccessManifest | null {
  const text = raw?.trim()
  if (!text) {
    return null
  }
  try {
    const parsed = JSON.parse(text) as AcExHtmlAccessManifest
    if (parsed?.v !== ACEX_HTML_ACCESS_VERSION) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Builds an access manifest for {@link packHtml}.
 */
export function buildAcExHtmlAccessManifest(options: {
  expiresAt: number | null
  password?: string
  salt?: string
}): AcExHtmlAccessManifest | undefined {
  if (!needsAcExHtmlAccessControl(options)) {
    return undefined
  }
  const encrypted = Boolean(options.password?.trim())
  return {
    v: ACEX_HTML_ACCESS_VERSION,
    expiresAt: options.expiresAt,
    encrypted,
    ...(encrypted && options.salt ? { salt: options.salt } : {})
  }
}

/**
 * Encrypts a gzip-compressed snapshot payload for password-protected HTML export.
 */
export async function encryptAcExHtmlSnapshotPayload(
  password: string,
  payload: string
): Promise<{ encryptedPayload: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveAcExHtmlAccessKey(password, salt)
  const plainBytes = new Uint8Array(base64ToUint8(payload))
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      plainBytes
    )
  )
  const combined = new Uint8Array(iv.length + encrypted.length)
  combined.set(iv, 0)
  combined.set(encrypted, iv.length)
  return {
    encryptedPayload: uint8ToBase64(combined),
    salt: uint8ToBase64(salt)
  }
}

/**
 * Decrypts a password-protected snapshot payload from an exported HTML file.
 *
 * @throws When the password is wrong or the ciphertext is invalid.
 */
export async function decryptAcExHtmlSnapshotPayload(
  password: string,
  encryptedPayload: string,
  saltBase64: string
): Promise<string> {
  const salt = new Uint8Array(base64ToUint8(saltBase64))
  const key = await deriveAcExHtmlAccessKey(password, salt)
  const combined = base64ToUint8(encryptedPayload)
  const iv = new Uint8Array(combined.subarray(0, IV_BYTES))
  const ciphertext = new Uint8Array(combined.subarray(IV_BYTES))
  const plainBytes = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  )
  return uint8ToBase64(plainBytes)
}

/**
 * Applies password encryption to an encoded snapshot when a password is set.
 */
export async function protectAcExHtmlEncodedSnapshot(
  encoded: AcExEncodedSnapshot,
  options: { expiresAt: number | null; password?: string }
): Promise<{
  encoded: AcExEncodedSnapshot
  manifest?: AcExHtmlAccessManifest
}> {
  if (!needsAcExHtmlAccessControl(options)) {
    return { encoded }
  }

  const password = options.password?.trim()
  if (password) {
    const { encryptedPayload, salt } = await encryptAcExHtmlSnapshotPayload(
      password,
      encoded.payload
    )
    return {
      encoded: {
        payload: encryptedPayload,
        compression: encoded.compression
      },
      manifest: buildAcExHtmlAccessManifest({
        expiresAt: options.expiresAt,
        password,
        salt
      })
    }
  }

  return {
    encoded,
    manifest: buildAcExHtmlAccessManifest({
      expiresAt: options.expiresAt
    })
  }
}

async function deriveAcExHtmlAccessKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
