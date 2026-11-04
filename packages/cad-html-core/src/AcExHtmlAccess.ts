import {
  type AcExHtmlBinaryEncoding,
  acexHtmlBytesToText,
  acexHtmlTextToBytes
} from './AcExHtmlBinaryText'
import type { AcExHtmlEncodedSnapshot } from './AcExHtmlSnapshotCodec'

/** Access-control manifest schema version embedded in exported HTML. */
export const ACEX_HTML_ACCESS_VERSION = 1 as const

/** Remaining time window (ms) before expiry when the viewer shows a countdown. */
export const ACEX_HTML_EXPIRY_COUNTDOWN_MS = 10 * 60 * 1000

/** Supported HTML export validity periods. */
export type AcExHtmlExpiryDays = 1 | 7 | 30 | 'never' | 'custom'

/**
 * Access metadata embedded in protected HTML exports.
 *
 * When {@link AcExHtmlAccessManifest.encrypted} is `true`, the monolithic
 * snapshot or each embedded progressive chunk is AES-GCM encrypted and requires
 * the export password to decode.
 */
export interface AcExHtmlAccessManifest {
  /** Manifest schema version. */
  v: typeof ACEX_HTML_ACCESS_VERSION
  /** Unix timestamp (ms) after which the file must not open; `null` = no expiry. */
  expiresAt: number | null
  /** When `true`, the snapshot or embedded chunk payloads are password-encrypted. */
  encrypted: boolean
  /** Base64 PBKDF2 salt; present when {@link AcExHtmlAccessManifest.encrypted} is `true`. */
  salt?: string
}

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const IV_BYTES = 12

const LOCALE_TO_BCP47: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  cs: 'cs',
  tr: 'tr',
  ar: 'ar'
}

/**
 * Computes the expiry timestamp from a validity period and export time.
 *
 * When `expiryDays` is `'custom'`, returns `customExpiresAt` (or `null`).
 */
export function acexHtmlResolveExpiresAt(
  expiryDays: AcExHtmlExpiryDays,
  exportedAt = Date.now(),
  customExpiresAt?: number | null
): number | null {
  if (expiryDays === 'never') {
    return null
  }
  if (expiryDays === 'custom') {
    return customExpiresAt ?? null
  }
  return exportedAt + expiryDays * 24 * 60 * 60 * 1000
}

/**
 * Returns whether export options require an access manifest in the HTML file.
 */
export function acexHtmlNeedsAccessControl(options: {
  expiresAt: number | null
  password?: string
}): boolean {
  const hasPassword = Boolean(options.password?.trim())
  return options.expiresAt != null || hasPassword
}

/**
 * Returns whether an access manifest has passed its expiry time.
 */
export function acexHtmlIsAccessExpired(
  manifest: AcExHtmlAccessManifest,
  now = Date.now()
): boolean {
  return manifest.expiresAt != null && now > manifest.expiresAt
}

/**
 * Returns whether the near-expiry countdown should be shown.
 */
export function acexHtmlIsExpiryCountdownActive(
  expiresAt: number,
  now = Date.now()
): boolean {
  const remaining = expiresAt - now
  return remaining > 0 && remaining <= ACEX_HTML_EXPIRY_COUNTDOWN_MS
}

/**
 * Formats an absolute expiry timestamp for display in the given locale.
 */
export function acexHtmlFormatExpiresAt(
  expiresAt: number,
  locale = 'en'
): string {
  const bcp47 = LOCALE_TO_BCP47[locale] ?? locale
  try {
    return new Date(expiresAt).toLocaleString(bcp47, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return new Date(expiresAt).toISOString()
  }
}

/**
 * Formats a remaining duration as `M:SS` or `H:MM:SS`.
 */
export function acexHtmlFormatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`
  }
  return `${minutes}:${ss}`
}

/**
 * Parses the `#mlcad-access` JSON manifest from an exported HTML file.
 */
export function acexHtmlParseAccessManifest(
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
 * Builds an access manifest for {@link acexHtmlPackHtml}.
 */
export function acexHtmlBuildAccessManifest(options: {
  expiresAt: number | null
  password?: string
  salt?: string
}): AcExHtmlAccessManifest | undefined {
  if (!acexHtmlNeedsAccessControl(options)) {
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
 * Derives an AES-GCM key from a password and optional salt.
 * When `saltBase64` is omitted, a fresh random salt is generated.
 */
export async function acexHtmlCreateAccessKey(
  password: string,
  saltBase64?: string
): Promise<{ key: CryptoKey; salt: string }> {
  const salt =
    saltBase64 != null && saltBase64.trim()
      ? new Uint8Array(base64ToUint8(saltBase64))
      : crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await deriveAcExHtmlAccessKey(password, salt)
  return { key, salt: uint8ToBase64(salt) }
}

/**
 * Encrypts raw bytes with AES-GCM. Returns `iv || ciphertext`.
 */
export async function acexHtmlEncryptBytes(
  key: CryptoKey,
  plain: Uint8Array
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plainCopy = new Uint8Array(plain)
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainCopy)
  )
  const combined = new Uint8Array(iv.length + encrypted.length)
  combined.set(iv, 0)
  combined.set(encrypted, iv.length)
  return combined
}

/**
 * Decrypts AES-GCM bytes produced by {@link acexHtmlEncryptBytes}.
 *
 * @throws When the key is wrong or the ciphertext is invalid.
 */
export async function acexHtmlDecryptBytes(
  key: CryptoKey,
  combined: Uint8Array
): Promise<Uint8Array> {
  const iv = new Uint8Array(combined.subarray(0, IV_BYTES))
  const ciphertext = new Uint8Array(combined.subarray(IV_BYTES))
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  )
}

/**
 * Encrypts a gzip-compressed snapshot payload for password-protected HTML export.
 *
 * @param encoding - Text encoding of {@link payload} and the returned ciphertext
 *   (defaults to `base85`, matching {@link acexHtmlEncodeSnapshot}).
 */
export async function acexHtmlEncryptSnapshotPayload(
  password: string,
  payload: string,
  encoding: AcExHtmlBinaryEncoding = 'base85'
): Promise<{ encryptedPayload: string; salt: string }> {
  const { key, salt } = await acexHtmlCreateAccessKey(password)
  const plainBytes = acexHtmlTextToBytes(payload, encoding)
  const combined = await acexHtmlEncryptBytes(key, plainBytes)
  return {
    encryptedPayload: acexHtmlBytesToText(combined, encoding),
    salt
  }
}

/**
 * Decrypts a password-protected snapshot payload from an exported HTML file.
 *
 * @param encoding - Text encoding of the ciphertext and the returned gzip payload.
 * @throws When the password is wrong or the ciphertext is invalid.
 */
export async function acexHtmlDecryptSnapshotPayload(
  password: string,
  encryptedPayload: string,
  saltBase64: string,
  encoding: AcExHtmlBinaryEncoding = 'base85'
): Promise<string> {
  const { key } = await acexHtmlCreateAccessKey(password, saltBase64)
  const plainBytes = await acexHtmlDecryptBytes(
    key,
    acexHtmlTextToBytes(encryptedPayload, encoding)
  )
  return acexHtmlBytesToText(plainBytes, encoding)
}

/** Encodes bytes as standard base64 (for HTML embedding). */
export function acexHtmlBytesToBase64(bytes: Uint8Array): string {
  return uint8ToBase64(bytes)
}

/** Decodes standard base64 to bytes. */
export function acexHtmlBase64ToBytes(base64: string): Uint8Array {
  return base64ToUint8(base64)
}

/**
 * Applies password encryption to an encoded snapshot when a password is set.
 */
export async function acexHtmlProtectEncodedSnapshot(
  encoded: AcExHtmlEncodedSnapshot,
  options: { expiresAt: number | null; password?: string }
): Promise<{
  encoded: AcExHtmlEncodedSnapshot
  manifest?: AcExHtmlAccessManifest
}> {
  if (!acexHtmlNeedsAccessControl(options)) {
    return { encoded }
  }

  const password = options.password?.trim()
  if (password) {
    const { encryptedPayload, salt } = await acexHtmlEncryptSnapshotPayload(
      password,
      encoded.payload
    )
    return {
      encoded: {
        payload: encryptedPayload,
        compression: encoded.compression
      },
      manifest: acexHtmlBuildAccessManifest({
        expiresAt: options.expiresAt,
        password,
        salt
      })
    }
  }

  return {
    encoded,
    manifest: acexHtmlBuildAccessManifest({
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
