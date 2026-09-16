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
