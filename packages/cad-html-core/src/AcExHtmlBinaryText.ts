/**
 * Dense text encodings for embedding binary ACEX payloads in UTF-8 HTML.
 *
 * Base85 uses a 25% expansion (4 bytes → 5 chars) versus base64's ~33%, and
 * the alphabet omits characters that break HTML `<script>` text (`<`, `>`, `/`,
 * `&`, quotes, backslash, whitespace).
 */

/** HTML-safe 85-character alphabet (no `< > / & \\ " ' \` space`). */
const BASE85_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%()*+,-.;=?@[]^_{|}~'

const BASE85_DECODE = new Int16Array(128).fill(-1)
for (let i = 0; i < BASE85_ALPHABET.length; i++) {
  BASE85_DECODE[BASE85_ALPHABET.charCodeAt(i)!] = i
}

/** Text encoding used inside offline HTML `<script>` payload bodies. */
export type AcExHtmlBinaryEncoding = 'base64' | 'base85'

/**
 * Reads the trailing `;base64` / `;base85` token from a script MIME type.
 * Defaults to `base64` for legacy exports that omit the token.
 */
export function parseAcExHtmlBinaryEncoding(
  mimeType: string | null | undefined
): AcExHtmlBinaryEncoding {
  const mime = mimeType?.toLowerCase() ?? ''
  if (mime.includes(';base85') || mime.endsWith('base85')) {
    return 'base85'
  }
  return 'base64'
}

/** Encodes bytes with the selected HTML binary text encoding. */
export function acExHtmlBytesToText(
  bytes: Uint8Array,
  encoding: AcExHtmlBinaryEncoding
): string {
  return encoding === 'base85'
    ? acExHtmlBytesToBase85(bytes)
    : uint8ToBase64(bytes)
}

/** Decodes an HTML binary text payload with the selected encoding. */
export function acExHtmlTextToBytes(
  text: string,
  encoding: AcExHtmlBinaryEncoding
): Uint8Array {
  const payload =
    text.length > 0 &&
    (text.charCodeAt(0) <= 32 || text.charCodeAt(text.length - 1) <= 32)
      ? text.trim()
      : text
  return encoding === 'base85'
    ? acExHtmlBase85ToBytes(payload)
    : base64ToUint8(payload)
}

/**
 * Encodes bytes as HTML-safe base85 (pad to 4-byte groups, emit ceil(n·5/4) chars).
 */
export function acExHtmlBytesToBase85(bytes: Uint8Array): string {
  const length = bytes.length
  if (length === 0) return ''

  const pad = (4 - (length % 4)) % 4
  const paddedLen = length + pad
  const chars: string[] = []
  for (let i = 0; i < paddedLen; i += 4) {
    const b0 = bytes[i] ?? 0
    const b1 = i + 1 < length ? bytes[i + 1]! : 0
    const b2 = i + 2 < length ? bytes[i + 2]! : 0
    const b3 = i + 3 < length ? bytes[i + 3]! : 0
    let value = ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3
    const digits = new Array<number>(5)
    for (let k = 4; k >= 0; k--) {
      digits[k] = value % 85
      value = (value / 85) | 0
    }
    for (let k = 0; k < 5; k++) {
      chars.push(BASE85_ALPHABET[digits[k]!]!)
    }
  }

  const outLen = Math.ceil((length * 5) / 4)
  return chars.slice(0, outLen).join('')
}

/**
 * Decodes HTML-safe base85 produced by {@link acExHtmlBytesToBase85}.
 *
 * Incomplete final groups are padded with the max digit (Ascii85 `u` rule) so
 * truncating `ceil(n·5/4)` encode chars round-trips the original `n` bytes.
 */
export function acExHtmlBase85ToBytes(text: string): Uint8Array {
  const input = text.replace(/\s+/g, '')
  const length = input.length
  if (length === 0) return new Uint8Array(0)

  const byteLength = Math.floor((length * 4) / 5)
  const padChars = (5 - (length % 5)) % 5
  const totalChars = length + padChars
  const out = new Uint8Array((totalChars / 5) * 4)
  const padDigit = BASE85_ALPHABET.length - 1
  let o = 0

  for (let i = 0; i < totalChars; i += 5) {
    let value = 0
    for (let k = 0; k < 5; k++) {
      const digit =
        i + k < length
          ? decodeBase85Char(input.charCodeAt(i + k))
          : padDigit
      value = value * 85 + digit
    }
    out[o++] = (value >>> 24) & 0xff
    out[o++] = (value >>> 16) & 0xff
    out[o++] = (value >>> 8) & 0xff
    out[o++] = value & 0xff
  }

  return out.subarray(0, byteLength)
}

function decodeBase85Char(code: number): number {
  if (code < 0 || code >= BASE85_DECODE.length) {
    throw new Error('Invalid base85 character')
  }
  const digit = BASE85_DECODE[code]!
  if (digit < 0) {
    throw new Error('Invalid base85 character')
  }
  return digit
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
