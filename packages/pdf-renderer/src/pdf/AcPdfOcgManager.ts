import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString
} from 'pdf-lib'

/**
 * Encodes an OCG display name as a PDF text string.
 * ASCII stays as a literal PDFString (max viewer compatibility); non-ASCII
 * uses UTF-16BE hex so CJK names show correctly in the Layers panel.
 */
function encodeOcgDisplayName(text: string): PDFString | PDFHexString {
  if (/^[\x20-\x7E]*$/.test(text)) {
    return PDFString.of(text)
  }
  return PDFHexString.fromText(text)
}

/**
 * Builds Optional Content Groups so Acrobat's Layers panel can toggle CAD layers.
 */
export class AcPdfOcgManager {
  private readonly _doc: PDFDocument
  private readonly _ocgs = new Map<string, { name: string; ref: PDFRef }>()
  private readonly _resourceNames = new Map<string, string>()
  private _nextResourceId = 0

  constructor(doc: PDFDocument) {
    this._doc = doc
  }

  resourceName(layerName: string): string {
    const key = layerName || '0'
    const existing = this._resourceNames.get(key)
    if (existing) {
      return existing
    }
    // Keep ASCII layer keys readable; use short ids for everything else so
    // long CJK names cannot exceed PDF Name limits or collide as `lyr__`.
    const name = /^[A-Za-z0-9_-]+$/.test(key)
      ? `lyr_${key}`
      : `lyr_${this._nextResourceId++}`
    this._resourceNames.set(key, name)
    return name
  }

  ensure(layerName: string): { resourceName: string; ref: PDFRef } {
    const key = layerName || '0'
    const existing = this._ocgs.get(key)
    if (existing) {
      return { resourceName: this.resourceName(key), ref: existing.ref }
    }
    const dict = this._doc.context.obj({
      Type: 'OCG',
      Name: encodeOcgDisplayName(key)
    })
    const ref = this._doc.context.register(dict)
    this._ocgs.set(key, { name: key, ref })
    return { resourceName: this.resourceName(key), ref }
  }

  attachToPage(page: PDFPage) {
    if (this._ocgs.size === 0) {
      return
    }
    const props = this._doc.context.obj({})
    const ocgRefs: PDFRef[] = []
    for (const [layerName, entry] of this._ocgs) {
      props.set(PDFName.of(this.resourceName(layerName)), entry.ref)
      ocgRefs.push(entry.ref)
    }
    page.node.normalize()
    let resources = page.node.Resources()
    if (!resources) {
      resources = this._doc.context.obj({}) as PDFDict
      page.node.set(PDFName.of('Resources'), resources)
    }
    resources.set(PDFName.of('Properties'), props)
    const order = this._doc.context.obj(ocgRefs)
    const ocProperties = this._doc.context.obj({
      OCGs: ocgRefs,
      D: {
        Order: order,
        ON: ocgRefs
      }
    })
    // Indirect ref is more reliable across viewers after page merges.
    const ocPropertiesRef = this._doc.context.register(ocProperties)
    this._doc.catalog.set(PDFName.of('OCProperties'), ocPropertiesRef)
  }

  layerNames(): string[] {
    return [...this._ocgs.keys()]
  }
}

export function setPageNamedResource(
  page: PDFPage,
  category: string,
  name: string,
  value: PDFRef | PDFDict
) {
  page.node.normalize()
  const resources = page.node.Resources()
  if (!resources) {
    return
  }
  let dict = resources.get(PDFName.of(category))
  if (!(dict instanceof PDFDict)) {
    dict = resources.context.obj({})
    resources.set(PDFName.of(category), dict)
  }
  ;(dict as PDFDict).set(PDFName.of(name), value)
}
