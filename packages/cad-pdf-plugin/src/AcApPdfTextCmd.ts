import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcApLlmSettingsService,
  AcApTextRecognitionService,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptStatus,
  AcEdPromptStringOptions,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import {
  type AcDbEntity,
  type AcDbObjectId,
  AcDbText,
  AcGePoint3d
} from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import { pdfEntityToStroke } from './pdfEntityStrokes'
import {
  clusterPdfTextStrokes,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary'

/** `localStorage` key of the persisted glyph dictionary. */
export const PDF_GLYPH_STORAGE_KEY = 'mlightcad.pdftext.glyphs.v1'

/** Most glyph shapes kept in storage (the most recently confirmed). */
const PDF_GLYPH_STORAGE_LIMIT = 5000

/** Height of the rendered text line image sent to a recognizer, in pixels. */
const OCR_IMAGE_TEXT_HEIGHT = 48

/** Longest recognizer error message shown to the user. */
const OCR_ERROR_MESSAGE_LIMIT = 200

/**
 * `pdftext`: converts exploded text (SHX line text or outlined fonts that a
 * PDF stores as paths) back into `AcDbText`.
 *
 * Workflow:
 * 1. The user selects the strokes (a window around the text is enough;
 *    frames and other large strokes are ignored).
 * 2. Strokes are clustered into text lines with an estimated position,
 *    height and rotation.
 * 3. Lines whose glyphs are all in the glyph dictionary (shapes the user
 *    already typed) are read from it.
 * 4. All remaining lines are sent at once to OCR, when a recognizer is
 *    registered in {@link AcApTextRecognitionService}.
 * 5. Everything read is converted in one edit, without asking. Lines nothing
 *    could read are highlighted one by one for the user to type (empty skips,
 *    Esc stops). The whole run is one undo step.
 *
 * The dictionary is kept in `localStorage` (the 5000 most recently
 * confirmed shapes), so later runs, on this drawing or
 * another one using the same font, recognize more and more lines on their own.
 */
export class AcApPdfTextCmd extends AcEdCommand {
  private static readonly dictionary = new PdfGlyphDictionary()
  private static dictionaryLoaded = false
  /** Set once the "OCR is off" hint was shown, so it does not nag. */
  private static ocrHintShown = false

  /**
   * The shared glyph dictionary, loaded from `localStorage` on first use so
   * glyphs taught in earlier sessions are recognized too.
   */
  static get glyphDictionary(): PdfGlyphDictionary {
    if (!AcApPdfTextCmd.dictionaryLoaded) {
      AcApPdfTextCmd.dictionaryLoaded = true
      try {
        const raw = globalThis.localStorage?.getItem(PDF_GLYPH_STORAGE_KEY)
        if (raw) AcApPdfTextCmd.dictionary.load(JSON.parse(raw))
      } catch {
        // Storage unavailable or corrupt: start empty.
      }
    }
    return AcApPdfTextCmd.dictionary
  }

  private static saveDictionary() {
    try {
      globalThis.localStorage?.setItem(
        PDF_GLYPH_STORAGE_KEY,
        JSON.stringify(
          AcApPdfTextCmd.dictionary.toJSON(PDF_GLYPH_STORAGE_LIMIT)
        )
      )
    } catch {
      // Quota or privacy mode: the session dictionary still works.
    }
  }

  /** Set once an OCR failure was reported in this run, so it does not nag. */
  private ocrErrorShown = false

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdftext'
    })
    if (!resolved) return
    const selectionSet = context.view.selectionSet
    selectionSet.clear()

    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    const strokes: PdfTextStroke<AcDbObjectId>[] = []
    resolved.entities.forEach((entity, i) => {
      const id = resolved.ids[i]
      const stroke = pdfEntityToStroke(entity, id)
      if (!stroke) return
      entityById.set(id, entity)
      strokes.push(stroke)
    })

    const { lines } = clusterPdfTextStrokes(strokes)
    if (lines.length === 0) {
      this.notify(AcApI18n.t('jig.pdftext.noCandidates'), 'warning')
      return
    }

    this.ocrErrorShown = false
    await this.hintWhenOcrUnavailable()

    // 1. Lines whose glyphs are all known need neither OCR nor the user.
    const dictionary = AcApPdfTextCmd.glyphDictionary
    const texts: Array<string | undefined> = lines.map(line =>
      dictionary.lookup(line)
    )
    const automatic = texts.filter(Boolean).length

    // 2. All other lines go to OCR at once, then everything read so far is
    // converted in one database edit (one redraw instead of one per line).
    const recognized = await this.recognizeAll(lines, texts)
    let resolvedCount = automatic + recognized
    this.convertLines(
      context,
      lines.flatMap((line, i) => (texts[i] ? [{ line, text: texts[i] }] : [])),
      entityById
    )

    // 3. Only lines nothing could read are typed by the user. Glyphs taught
    // by a typed line are looked up again, so typing one line can read the
    // remaining lines that reuse its glyphs.
    const read: Array<{
      line: PdfTextLineCandidate<AcDbObjectId>
      text: string
    }> = []
    const editor = AcApDocManager.instance.editor
    let typedCount = 0
    let skipped = 0
    for (let index = 0; index < lines.length; index++) {
      if (texts[index]) continue
      const line = lines[index]
      const known = dictionary.lookup(line)
      if (known) {
        texts[index] = known
        read.push({ line, text: known })
        resolvedCount++
        continue
      }
      selectionSet.clear()
      selectionSet.add(line.strokes.map(stroke => stroke.id))
      const prompt = new AcEdPromptStringOptions(
        acapPdfT('jig.pdftext.enterText', {
          index: index + 1,
          count: lines.length
        })
      )
      prompt.allowSpaces = true
      prompt.allowEmpty = true
      const result = await editor.getString(prompt)
      if (
        result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.None
      ) {
        // Esc stops; lines read or typed so far are kept.
        skipped += texts.slice(index).filter(text => !text).length
        break
      }
      const text = (result.stringResult ?? '').trim()
      if (!text) {
        skipped++
        continue
      }
      dictionary.learn(line, text)
      texts[index] = text
      read.push({ line, text })
      typedCount++
    }
    selectionSet.clear()
    this.convertLines(context, read, entityById)

    AcApPdfTextCmd.saveDictionary()
    this.notify(
      acapPdfT('jig.pdftext.summary', {
        converted: resolvedCount + typedCount,
        automatic: resolvedCount,
        skipped
      })
    )
  }

  /**
   * Sends every line `texts` has no entry for to OCR in one batch, behind the
   * busy indicator, and fills `texts` in place.
   *
   * OCR answers are not taught to the glyph dictionary: only text the user
   * typed is trusted to recognize other drawings.
   *
   * @returns How many lines OCR read.
   */
  private async recognizeAll(
    lines: PdfTextLineCandidate<AcDbObjectId>[],
    texts: Array<string | undefined>
  ): Promise<number> {
    if (!AcApTextRecognitionService.hasRecognizer) return 0
    const pending: number[] = []
    const images: string[] = []
    lines.forEach((line, i) => {
      if (texts[i]) return
      const image = renderLineImage(line)
      if (!image) return
      pending.push(i)
      images.push(image)
    })
    if (images.length === 0) return 0

    const results = await AcApDocManager.instance.withBusyIndicator(
      () =>
        AcApTextRecognitionService.recognizeBatch(
          { images, locale: AcApI18n.currentLocale },
          { onError: error => this.reportOcrError(error) }
        ),
      acapPdfT('jig.pdftext.recognizing', { count: images.length })
    )
    let recognized = 0
    pending.forEach((lineIndex, i) => {
      if (!results[i]) return
      texts[lineIndex] = results[i]
      recognized++
    })
    return recognized
  }

  /**
   * Tells the user once per session how to turn on OCR suggestions when the
   * shared AI model settings report no image-capable model.
   */
  private async hintWhenOcrUnavailable() {
    if (AcApPdfTextCmd.ocrHintShown) return
    const status = await AcApLlmSettingsService.getStatus()
    if (!status || status.vision) return
    AcApPdfTextCmd.ocrHintShown = true
    this.notify(AcApI18n.t('jig.pdftext.ocrNotConfigured'))
  }

  /**
   * Tells the user, once per run, why no suggestion came (bad API key,
   * network, quota, ...) instead of leaving an unexplained empty prompt.
   */
  private reportOcrError(error: unknown) {
    console.warn('[pdftext] Text recognition failed:', error)
    if (this.ocrErrorShown) return
    this.ocrErrorShown = true
    this.notify(
      acapPdfT('jig.pdftext.ocrFailed', { message: ocrErrorMessage(error) }),
      'error'
    )
  }

  /**
   * Replaces the strokes of each line with one `AcDbText`, in one append
   * and one erase so the view is updated once.
   */
  private convertLines(
    context: AcApContext,
    items: Array<{ line: PdfTextLineCandidate<AcDbObjectId>; text: string }>,
    entityById: Map<AcDbObjectId, AcDbEntity>
  ) {
    if (items.length === 0) return
    const ids: AcDbObjectId[] = []
    const texts = items.map(({ line, text: textString }) => {
      const lineIds = line.strokes.map(stroke => stroke.id)
      ids.push(...lineIds)
      const source = entityById.get(lineIds[0])
      const text = new AcDbText()
      text.textString = textString
      text.position = new AcGePoint3d(line.position.x, line.position.y, 0)
      text.height = line.height
      text.rotation = line.rotation
      if (source) {
        text.layer = source.layer
        text.color = source.color.clone()
      }
      return text
    })
    context.doc.database.tables.blockTable.modelSpace.appendEntity(texts)
    context.doc.entityService.eraseEntities(ids)
  }
}

/** One-line, length-limited description of a recognizer error. */
function ocrErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : String(error ?? 'unknown error')
  const text = raw.replace(/\s+/g, ' ').trim() || String(error)
  return text.length > OCR_ERROR_MESSAGE_LIMIT
    ? `${text.slice(0, OCR_ERROR_MESSAGE_LIMIT - 1)}…`
    : text
}

/**
 * Renders a text line upright, dark on white, as a PNG data URL for OCR.
 *
 * @returns The data URL, or `undefined` outside a browser.
 */
function renderLineImage(line: PdfTextLineCandidate): string | undefined {
  if (typeof document === 'undefined') return undefined
  const scale = OCR_IMAGE_TEXT_HEIGHT / line.height
  const pad = OCR_IMAGE_TEXT_HEIGHT * 0.5
  const c = Math.cos(line.rotation)
  const s = Math.sin(line.rotation)
  const local = (x: number, y: number) => {
    const dx = x - line.position.x
    const dy = y - line.position.y
    return { u: dx * c + dy * s, v: -dx * s + dy * c }
  }
  let minV = 0
  let maxV = line.height
  for (const stroke of line.strokes) {
    for (const p of stroke.points) {
      const { v } = local(p.x, p.y)
      minV = Math.min(minV, v)
      maxV = Math.max(maxV, v)
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(line.width * scale + pad * 2)
  canvas.height = Math.ceil((maxV - minV) * scale + pad * 2)
  const g = canvas.getContext('2d')
  if (!g) return undefined
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.strokeStyle = '#000000'
  g.lineWidth = Math.max(1.5, OCR_IMAGE_TEXT_HEIGHT / 16)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const stroke of line.strokes) {
    g.beginPath()
    stroke.points.forEach((p, i) => {
      const { u, v } = local(p.x, p.y)
      const px = pad + u * scale
      const py = pad + (maxV - v) * scale
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    })
    g.stroke()
  }
  return canvas.toDataURL('image/png')
}
