/**
 * Encodes a Unicode string as a PDF text string (UTF-16BE with BOM) rendered
 * as hex inside content streams.
 */
export function pdfHexText(text: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  }
  return `<${hex}>`
}

/**
 * Drops C0/C1 controls (except tab/LF/CR) and soft hyphens so marked-content
 * property values stay Acrobat-safe when encoded as PDF text strings.
 */
export function sanitizePdfTextString(text: string): string {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      out += ch
    } else if (cp < 0x20) {
      // Other C0 controls: omit.
    } else if (cp >= 0x20 && cp < 0x7f) {
      out += ch
    } else if (cp === 0xad) {
      // Soft hyphen: omit.
    } else if (cp >= 0x7f && cp <= 0x9f) {
      // C1 controls: omit.
    } else {
      out += ch
    }
  }
  return out
}

/**
 * UTF-16BE hex text string suitable for `/Entity` (and similar) property
 * values. Hex keeps the content stream ASCII-only, so the latin1 byte writer
 * cannot turn a Unicode code unit's low byte into an unescaped `)` / `(` / `\\`
 * that prematurely terminates a PDF literal — which is what made Acrobat
 * report "An error exists on this page" for CAD block names.
 */
export function pdfEntityText(text: string): string | undefined {
  const cleaned = sanitizePdfTextString(text)
  return cleaned.length > 0 ? pdfHexText(cleaned) : undefined
}

/**
 * PDF literal string escaped for content streams serialized as single bytes
 * (`charCodeAt & 0xff`). Escapes are based on the byte that will actually be
 * written, not the full Unicode code unit.
 */
export function pdfLiteral(text: string): string {
  let out = '('
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) & 0xff
    if (c === 0x5c || c === 0x28 || c === 0x29) {
      out += '\\' + String.fromCharCode(c)
    } else if (c === 0x0a) {
      out += '\\n'
    } else if (c === 0x0d) {
      out += '\\r'
    } else if (c === 0x09) {
      out += '\\t'
    } else if (c < 0x20 || c >= 0x7f) {
      out += '\\' + c.toString(8).padStart(3, '0')
    } else {
      out += String.fromCharCode(c)
    }
  }
  return out + ')'
}

/**
 * Strips common MTEXT formatting so ActualText is closer to the visible string.
 *
 * `\P` (paragraph break) is matched case-sensitively on purpose: the
 * case-insensitive flag also consumed the `\p` of paragraph-property codes
 * like `\pxqc;`, leaking their trailing text ("xqc;") into the output.
 */
export function stripMtextCodes(raw: string): string {
  return raw
    .replace(/\\P/g, '\n')
    .replace(/\\~+/g, ' ')
    .replace(/\{\\[^;]*;/g, '')
    .replace(/\\[A-Za-z][^;\\]*;?/g, '')
    .replace(/[{}]/g, '')
    .trim()
}
