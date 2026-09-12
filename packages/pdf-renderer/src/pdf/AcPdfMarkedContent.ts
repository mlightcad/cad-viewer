import type { PDFContext } from 'pdf-lib'
import { PDFHexString, PDFName, PDFOperator } from 'pdf-lib'

const BDC = 'BDC'
const EMC = 'EMC'

/**
 * Encodes a Unicode string as a PDF text string (UTF-16BE with BOM).
 */
export function pdfActualText(text: string): PDFHexString {
  return PDFHexString.fromText(text)
}

export function beginOcgOperator(resourceName: string): PDFOperator {
  return PDFOperator.of(BDC as never, [
    PDFName.of('OC'),
    PDFName.of(resourceName)
  ])
}

export function beginSpanActualText(
  context: PDFContext,
  text: string
): PDFOperator {
  const dict = context.obj({
    ActualText: pdfActualText(text)
  })
  return PDFOperator.of(BDC as never, [PDFName.of('Span'), dict as never])
}

export function beginEntityOperator(
  context: PDFContext,
  payload: {
    handle?: string
    type?: string
    name?: string
    layer?: string
  }
): PDFOperator {
  const dict: Record<string, string> = {}
  if (payload.handle) {
    dict.Handle = payload.handle
  }
  if (payload.type) {
    dict.Type = payload.type
  }
  if (payload.name) {
    dict.Name = payload.name
  }
  if (payload.layer) {
    dict.Layer = payload.layer
  }
  return PDFOperator.of(BDC as never, [
    PDFName.of('Entity'),
    context.obj(dict) as never
  ])
}

export function endMarkedContent(): PDFOperator {
  return PDFOperator.of(EMC as never)
}

/**
 * Strips common MTEXT formatting so ActualText is closer to the visible string.
 */
export function stripMtextCodes(raw: string): string {
  return raw
    .replace(/\\P/gi, '\n')
    .replace(/\\~+/g, ' ')
    .replace(/\{\\[^;]*;/g, '')
    .replace(/\\[A-Za-z][^;\\]*;?/g, '')
    .replace(/[{}]/g, '')
    .trim()
}
