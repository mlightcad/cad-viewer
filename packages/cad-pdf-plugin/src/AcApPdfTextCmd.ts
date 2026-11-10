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

/**
 * `pdftext`: converts exploded text (SHX line text or outlined fonts that a
 * PDF stores as paths) back into `AcDbText`.
 *
 * Semi-automatic workflow:
 * 1. The user selects the strokes (a window around the text is enough;
 *    frames and other large strokes are ignored).
 * 2. Strokes are clustered into text lines with an estimated position,
 *    height and rotation.
 * 3. Each line is highlighted and the user types its text. The suggestion
 *    comes from the glyph dictionary (shapes the user already confirmed) or,
 *    when a recognizer is registered in {@link AcApTextRecognitionService},
 *    from OCR. Enter accepts the suggestion, or skips the line without one.
 * 4. Lines whose glyphs are all known are converted without asking.
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

    await this.hintWhenOcrUnavailable()

    const dictionary = AcApPdfTextCmd.glyphDictionary
    const editor = AcApDocManager.instance.editor
    let converted = 0
    let automatic = 0
    let skipped = 0
    let previous: string | undefined

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      const known = dictionary.lookup(line)
      if (known) {
        this.convertLine(context, line, known, entityById)
        converted++
        automatic++
        previous = known
        continue
      }

      selectionSet.clear()
      selectionSet.add(line.strokes.map(stroke => stroke.id))
      const suggestion = await this.recognize(line, previous)

      const prompt = new AcEdPromptStringOptions(
        acapPdfT(
          suggestion
            ? 'jig.pdftext.enterTextWithSuggestion'
            : 'jig.pdftext.enterText',
          {
            index: index + 1,
            count: lines.length,
            suggestion: suggestion ?? ''
          }
        )
      )
      prompt.allowSpaces = true
      prompt.allowEmpty = true
      if (suggestion) {
        prompt.defaultValue = suggestion
        prompt.useDefaultValue = true
      }
      const result = await editor.getString(prompt)
      if (
        result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.None
      ) {
        // Esc stops; lines converted so far are kept.
        skipped += lines.length - index
        break
      }

      const typed = (result.stringResult ?? '').trim()
      const text = typed || suggestion
      if (!text) {
        skipped++
        continue
      }
      dictionary.learn(line, text)
      this.convertLine(context, line, text, entityById)
      converted++
      previous = text
    }

    selectionSet.clear()
    AcApPdfTextCmd.saveDictionary()
    this.notify(
      acapPdfT('jig.pdftext.summary', { converted, automatic, skipped })
    )
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

  /** Asks registered recognizers for the line text, when any exist. */
  private async recognize(
    line: PdfTextLineCandidate,
    hint: string | undefined
  ): Promise<string | undefined> {
    if (!AcApTextRecognitionService.hasRecognizer) return undefined
    const image = renderLineImage(line)
    if (!image) return undefined
    return AcApTextRecognitionService.recognize({
      image,
      hint,
      locale: AcApI18n.currentLocale
    })
  }

  /** Replaces the line strokes with one `AcDbText`. */
  private convertLine(
    context: AcApContext,
    line: PdfTextLineCandidate<AcDbObjectId>,
    textString: string,
    entityById: Map<AcDbObjectId, AcDbEntity>
  ) {
    const ids = line.strokes.map(stroke => stroke.id)
    const source = entityById.get(ids[0])
    const text = new AcDbText()
    text.textString = textString
    text.position = new AcGePoint3d(line.position.x, line.position.y, 0)
    text.height = line.height
    text.rotation = line.rotation
    if (source) {
      text.layer = source.layer
      text.color = source.color.clone()
    }
    context.doc.database.tables.blockTable.modelSpace.appendEntity(text)
    context.doc.entityService.eraseEntities(ids)
  }
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
