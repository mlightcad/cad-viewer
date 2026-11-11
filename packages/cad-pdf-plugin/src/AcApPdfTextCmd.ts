import {
  type AcApContext,
  AcApDocManager,
  AcApFontUtil,
  AcApI18n,
  AcApLlmSettingsService,
  AcApPaletteService,
  AcApTextRecognitionService,
  acapZoomToVisible,
  AcEdCommand,
  AcEdOpenMode,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import {
  type AcDbEntity,
  type AcDbObjectId,
  AcGeBox2d,
  AcGePoint2d
} from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import {
  AcApPdfTextSession,
  type PdfTextMeasurer,
  type PdfTextRow,
  type PdfTextRowSource
} from './AcApPdfTextSession'
import { pdfEntityToStroke } from './pdfEntityStrokes'
import {
  clusterPdfTextStrokes,
  type PdfTextLineCandidate,
  type PdfTextStroke
} from './recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary'
import {
  classifyPdfTextLineFont,
  type PdfTextFontKind
} from './recognition/pdfTextFontKind'
import { AcUiPdfTextPanel } from './ui/AcUiPdfTextPanel'

/** `localStorage` key of the persisted glyph dictionary. */
export const PDF_GLYPH_STORAGE_KEY = 'mlightcad.pdftext.glyphs.v1'

/** Most glyph shapes kept in storage (the most recently confirmed). */
const PDF_GLYPH_STORAGE_LIMIT = 5000

/** Height of the rendered text line image sent to a recognizer, in pixels. */
const OCR_IMAGE_TEXT_HEIGHT = 48

/** Delay before the preview follows an edit in the panel, in ms. */
const PREVIEW_DELAY = 120

/** Margin around a line framed in the drawing (passed to `zoomTo`). */
const FOCUS_MARGIN = 3

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
 *    height and rotation, and each line is classified as SHX line text or
 *    TrueType outline text.
 * 3. Lines whose glyphs are all in the glyph dictionary (shapes the user
 *    already typed) are read from it.
 * 4. All remaining lines are sent at once to OCR, when a recognizer is
 *    registered in {@link AcApTextRecognitionService}.
 * 5. A review panel opens in the palette. Per font kind the user picks an
 *    existing text style or creates one, checks or replaces its fonts and
 *    adjusts the size; per line the user fixes or types the text. The result
 *    is previewed in the drawing. Apply converts everything in one undo step;
 *    Cancel, or closing the palette, changes nothing. Without a DOM, what
 *    was read is converted directly with the suggested styles.
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
    context.view.selectionSet.clear()

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
    const sources: PdfTextRowSource[] = texts.map(text =>
      text ? 'dictionary' : 'unread'
    )

    // 2. All other lines go to OCR at once.
    await this.recognizeAll(lines, texts)
    texts.forEach((text, i) => {
      if (text && sources[i] === 'unread') sources[i] = 'ocr'
    })

    const session = new AcApPdfTextSession<AcDbObjectId>({
      db: context.doc.database,
      fontKind: styleFontKind,
      rows: lines.map((line, i) => ({
        line,
        kind: classifyPdfTextLineFont(line),
        text: texts[i] ?? '',
        source: sources[i],
        included: !!texts[i]
      }))
    })

    // 3. The user reviews styles, fonts and texts in the palette.
    if (typeof document !== 'undefined') {
      const apply = await this.review(context, session, entityById)
      if (!apply) {
        session.restoreStyles()
        this.notify(acapPdfT('jig.pdftext.cancelled'))
        return
      }
    }

    // 4. Convert in one database edit (one redraw instead of one per line).
    const changesExisting = session.kinds.some(kind =>
      session.changesExistingStyle(kind)
    )
    const fonts = session.syncStyles()
    await loadFonts(fonts)
    const measure = await prepareMeasure(fonts)
    const ready = session.readyRows
    const ids: AcDbObjectId[] = []
    const entities = ready.map(row => {
      ids.push(...row.line.strokes.map(stroke => stroke.id))
      return createRowEntity(session, row, entityById, measure)
    })
    if (entities.length > 0) {
      context.doc.database.tables.blockTable.modelSpace.appendEntity(entities)
      context.doc.entityService.eraseEntities(ids)
    }
    // Texts that already used a style whose fonts changed must redraw.
    if (changesExisting) AcApDocManager.instance.regen()

    // Only text the user typed is trusted to recognize other drawings.
    for (const { line, text } of session.learnable) {
      dictionary.learn(line, text)
    }
    AcApPdfTextCmd.saveDictionary()

    this.notify(
      acapPdfT('jig.pdftext.summary', {
        converted: ready.length,
        automatic: ready.filter(row => row.source !== 'typed').length,
        skipped: lines.length - ready.length
      })
    )
  }

  /**
   * Shows the review panel in the palette and previews the result in the
   * drawing until the user applies or cancels.
   *
   * @returns Whether the user applied.
   */
  private async review(
    context: AcApContext,
    session: AcApPdfTextSession<AcDbObjectId>,
    entityById: Map<AcDbObjectId, AcDbEntity>
  ): Promise<boolean> {
    const view = context.view
    const strokeIds = session.rows.flatMap(row =>
      row.line.strokes.map(stroke => stroke.id)
    )
    // Glyphs taught by a typed line fill the other lines reusing them. They
    // are learned in a copy so that Cancel teaches nothing.
    const scratch = new PdfGlyphDictionary()
    scratch.load(AcApPdfTextCmd.glyphDictionary.toJSON())

    let previews: AcDbEntity[] = []
    /** Strokes of the focused line, highlighted (no grips, unlike a selection). */
    let focused: AcDbObjectId[] = []
    let hidden = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let generation = 0

    const clearPreview = () => {
      for (const text of previews) view.removeTransientEntity(text.objectId)
      previews = []
    }
    const refreshPreview = async () => {
      const current = ++generation
      const fonts = session.syncStyles()
      await loadFonts(fonts)
      const measure = await prepareMeasure(fonts)
      // A newer edit (or the end of the review) superseded this one.
      if (current !== generation) return
      clearPreview()
      previews = session.readyRows.map(row =>
        createRowEntity(session, row, entityById, measure)
      )
      if (previews.length > 0) view.addTransientEntity(previews)
    }
    const schedulePreview = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        void refreshPreview()
      }, PREVIEW_DELAY)
    }
    const setHidden = (hide: boolean) => {
      hidden = hide
      for (const id of strokeIds) view.setEntitySceneVisible(id, !hide)
    }

    let finish: (apply: boolean) => void = () => {}
    const result = new Promise<boolean>(resolve => {
      finish = resolve
    })
    const panel = new AcUiPdfTextPanel<AcDbObjectId>({
      session,
      fonts: AcApDocManager.instance.avaiableFonts,
      replacementFont: font => AcApFontUtil.getReplacementFontName(font),
      onChange: schedulePreview,
      onFocusRows: (rows, zoom) => {
        if (focused.length > 0) view.unhighlight(focused)
        const lines = rows.map(row => row.line)
        focused = lines.flatMap(line => line.strokes.map(stroke => stroke.id))
        if (focused.length > 0) view.highlight(focused)
        const box = zoom ? linesBox(lines) : undefined
        if (box) {
          acapZoomToVisible(
            view,
            box,
            FOCUS_MARGIN,
            handle.coveredInsets(view.canvas)
          )
        }
      },
      onCommitRow: index => {
        const row = session.rows[index]
        if (!row) return []
        for (const { line, text } of session.learnableOf(row)) {
          scratch.learn(line, text)
        }
        return session.fillUnread(line => scratch.lookup(line))
      },
      onHideStrokes: setHidden,
      onClose: apply => finish(apply)
    })
    // Panel callbacks only run after this, once the user interacts.
    const handle = AcApPaletteService.open(
      {
        id: 'pdftext',
        title: acapPdfT('jig.pdftext.panel.title'),
        element: panel.element
      },
      { container: view.container }
    )
    handle.onClosed(() => finish(false))

    try {
      await refreshPreview()
      panel.focusFirstUnread()
      return await result
    } finally {
      if (timer) clearTimeout(timer)
      generation++
      clearPreview()
      if (hidden) setHidden(false)
      if (focused.length > 0) view.unhighlight(focused)
      handle.close()
      panel.destroy()
    }
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
   * network, quota, ...) instead of leaving unexplained unread lines.
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
}

/**
 * The TEXT (or MTEXT for merged rows) of a row, on the layer and in the
 * colour of its strokes.
 */
function createRowEntity(
  session: AcApPdfTextSession<AcDbObjectId>,
  row: PdfTextRow<AcDbObjectId>,
  entityById: Map<AcDbObjectId, AcDbEntity>,
  measure?: PdfTextMeasurer
): AcDbEntity {
  const text = session.createEntity(row, measure)
  const source = entityById.get(row.line.strokes[0]?.id)
  if (source) {
    text.layer = source.layer
    text.color = source.color.clone()
  }
  return text
}

/** Loads the catalog fonts in `fonts` that are not loaded yet. */
async function loadFonts(fonts: string[]) {
  const missing = fonts.filter(
    font =>
      AcApFontUtil.findFontInfoByName(font) && !AcApFontUtil.isFontLoaded(font)
  )
  if (missing.length === 0) return
  try {
    await AcApDocManager.instance.loadFonts(missing)
  } catch (error) {
    // Texts still draw with fallback fonts once these load later.
    console.warn('[pdftext] Could not load text style fonts:', error)
  }
}

/**
 * Loads what width measuring needs and returns the measurer, or `undefined`
 * when the fonts cannot be loaded (the width factor then stays 1).
 */
async function prepareMeasure(
  fonts: string[]
): Promise<PdfTextMeasurer | undefined> {
  try {
    await AcApFontUtil.prepareTextMeasurement(fonts)
  } catch (error) {
    console.warn('[pdftext] Could not load fonts to fit text widths:', error)
    return undefined
  }
  return (text, font, height, bigFont) =>
    AcApFontUtil.measureTextWidth(text, font, height, bigFont || undefined)
}

/** World box around the strokes of lines. */
function linesBox(lines: PdfTextLineCandidate[]): AcGeBox2d | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of lines.flatMap(line => line.strokes)) {
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!Number.isFinite(minX)) return undefined
  return new AcGeBox2d(new AcGePoint2d(minX, minY), new AcGePoint2d(maxX, maxY))
}

/**
 * Engine the viewer draws a style font with: the loaded font's own type,
 * else the font catalog's, else that of the font substituted for a missing
 * one (e.g. a `Standard` style without a known font draws in `simsun`).
 */
function styleFontKind(font: string): PdfTextFontKind | undefined {
  if (!font) return undefined
  const direct =
    AcApFontUtil.getFontType(font) ?? AcApFontUtil.getCatalogFontType(font)
  if (direct) return direct
  const replacement = AcApFontUtil.getReplacementFontName(font)
  if (!replacement || replacement === font) return undefined
  return (
    AcApFontUtil.getFontType(replacement) ??
    AcApFontUtil.getCatalogFontType(replacement)
  )
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
