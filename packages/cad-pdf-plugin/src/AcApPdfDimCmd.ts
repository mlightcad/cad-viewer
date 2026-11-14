import {
  type AcApContext,
  AcApI18n,
  AcApPaletteService,
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

import { AcApPdfDimSession } from './AcApPdfDimSession'
import { acapPdfT } from './acapPdfI18n'
import { AcApPdfTextCmd } from './AcApPdfTextCmd'
import {
  acapPdfCreateDimensions,
  acapPdfDisposeDimensionPreviews,
  pdfEntitiesToDimInput,
  type PdfDimEntity
} from './pdfDimensionConvert'
import { acapPdfPrepareDimStrokeTexts } from './pdfDimStrokeTexts'
import { recognizePdfDimensions } from './recognition/pdfDimensionPattern'
import { AcUiPdfDimPanel } from './ui/AcUiPdfDimPanel'

/** Delay before an edit redraws the preview (ms). */
const PREVIEW_DELAY = 120

/** Space around a dimension framed during the review. */
const FOCUS_MARGIN = 3

/**
 * `pdfdim`: turns exploded dimensions from a PDF back into dimension objects.
 *
 * 1. Select a region (a window around the dimensions is enough).
 * 2. Arrowheads, dimension lines, extension lines and value texts (including
 *    exploded stroke digits) are recognized. A review panel opens in the
 *    palette: edit each value, pick or create a dim style, then Apply.
 * 3. Without a DOM, every dimension found is converted directly.
 */
export class AcApPdfDimCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfdim'
    })
    if (!resolved) return
    context.view.selectionSet.clear()

    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    resolved.entities.forEach((entity, i) =>
      entityById.set(resolved.ids[i], entity)
    )
    const input = pdfEntitiesToDimInput(entityById)
    acapPdfPrepareDimStrokeTexts(
      input,
      entityById,
      AcApPdfTextCmd.glyphDictionary
    )
    const candidates = recognizePdfDimensions(input)
    const session = new AcApPdfDimSession({
      db: context.doc.database,
      candidates
    })

    const interactive = typeof document !== 'undefined'
    if (session.rows.length === 0 && !interactive) {
      this.notify(AcApI18n.t('jig.pdfdim.noDimensions'), 'warning')
      return
    }
    if (interactive) {
      if (session.rows.length === 0) {
        this.notify(AcApI18n.t('jig.pdfdim.noDimensions'), 'warning')
      }
      const apply = await this.review(context, session, entityById)
      if (!apply) {
        this.notify(acapPdfT('jig.pdfdim.cancelled'))
        return
      }
    }

    const accepted = session.candidatesForApply()
    if (accepted.length === 0) return
    const styleName = session.ensureStyle()
    const scale = session.scale
    acapPdfCreateDimensions(
      context.doc.database,
      accepted,
      scale,
      candidate => entityById.get(candidate.text.id)?.layer,
      styleName
    )
    context.doc.entityService.eraseEntities(
      accepted.flatMap(candidate => candidate.consumed)
    )
    this.notify(
      acapPdfT('jig.pdfdim.summary', {
        count: accepted.length,
        scale: formatScale(scale),
        style: styleName
      })
    )
  }

  /**
   * Shows the review panel and previews recovered dimensions as transients
   * until the user applies or cancels.
   */
  private async review(
    context: AcApContext,
    session: AcApPdfDimSession<AcDbObjectId>,
    entityById: Map<AcDbObjectId, AcDbEntity>
  ): Promise<boolean> {
    const view = context.view
    const db = context.doc.database
    let previews: PdfDimEntity[] = []
    /** Strokes hidden now (those the included dimensions replace). */
    const hidden = new Set<AcDbObjectId>()
    let hideStrokes = true
    /** Strokes of the selected dimension, shown highlighted over its preview. */
    let focused: AcDbObjectId[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    let generation = 0
    let settled = false

    const erasedIds = () =>
      new Set(
        session.rows.flatMap(row =>
          row.included ? row.candidate.consumed : []
        )
      )

    const clearPreview = () => {
      for (const entity of previews) {
        view.removeTransientEntity(entity.objectId)
      }
      if (previews.length > 0) acapPdfDisposeDimensionPreviews(db, previews)
      previews = []
    }
    const updateVisibility = () => {
      // Hide every consumed stroke when requested — including the focused row.
      // (Hatch review keeps the focused boundary visible; here the transient
      // dimension is the preview, so leaving originals visible looks broken.)
      const want = new Set<AcDbObjectId>()
      if (hideStrokes) {
        for (const id of erasedIds()) want.add(id)
      }
      for (const id of [...hidden]) {
        if (want.has(id)) continue
        view.setEntitySceneVisible(id, true)
        hidden.delete(id)
      }
      for (const id of want) {
        if (hidden.has(id)) continue
        view.setEntitySceneVisible(id, false)
        hidden.add(id)
      }
    }
    const refreshPreview = () => {
      const gen = ++generation
      clearPreview()
      const accepted = session.candidatesForApply()
      if (accepted.length === 0) {
        updateVisibility()
        return
      }
      // Preview must not call ensureStyle(): Cancel should leave the dim-style
      // table untouched (same contract as pdfhatch / pdftext).
      const created = acapPdfCreateDimensions(
        db,
        accepted,
        session.scale,
        candidate => entityById.get(candidate.text.id)?.layer,
        session.workingStyleName,
        {
          append: false,
          appearanceFrom: session.appearanceFromStyle
        }
      )
      if (gen !== generation) {
        acapPdfDisposeDimensionPreviews(db, created)
        return
      }
      previews = created
      if (previews.length > 0) view.addTransientEntity(previews)
      updateVisibility()
    }
    const schedulePreview = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        refreshPreview()
      }, PREVIEW_DELAY)
    }
    const focus = (
      row: (typeof session.rows)[number] | undefined,
      zoom: boolean
    ) => {
      if (focused.length > 0) view.unhighlight(focused)
      focused = row ? [...row.candidate.consumed] : []
      updateVisibility()
      if (focused.length > 0) view.highlight(focused)
      if (!row || !zoom) return
      const box = idsBox(row.candidate.consumed, entityById)
      if (box) {
        acapZoomToVisible(
          view,
          box,
          FOCUS_MARGIN,
          handle.coveredInsets(view.canvas)
        )
      }
    }

    let finish: (apply: boolean) => void = () => {}
    const result = new Promise<boolean>(resolve => {
      finish = apply => {
        if (settled) return
        settled = true
        resolve(apply)
      }
    })

    // Open first so focus/zoom can read coveredInsets from the palette handle.
    const panelHost = document.createElement('div')
    const handle = AcApPaletteService.open(
      {
        id: 'pdfdim',
        title: acapPdfT('jig.pdfdim.panel.title'),
        element: panelHost
      },
      { container: view.container }
    )
    handle.onClosed(() => finish(false))

    const panel = new AcUiPdfDimPanel<AcDbObjectId>({
      session,
      hideStrokes,
      onChange: schedulePreview,
      onFocusRow: focus,
      onHideStrokes: hide => {
        hideStrokes = hide
        updateVisibility()
      },
      onClose: apply => finish(apply)
    })
    panelHost.appendChild(panel.element)

    try {
      panel.selectFirst()
      refreshPreview()
      return await result
    } finally {
      if (timer) clearTimeout(timer)
      generation++
      clearPreview()
      if (focused.length > 0) view.unhighlight(focused)
      focused = []
      hideStrokes = false
      updateVisibility()
      handle.close()
      panel.destroy()
    }
  }
}

function idsBox(
  ids: AcDbObjectId[],
  entityById: Map<AcDbObjectId, AcDbEntity>
): AcGeBox2d | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of ids) {
    const entity = entityById.get(id)
    if (!entity) continue
    try {
      const box = entity.geometricExtents
      if (!box) continue
      minX = Math.min(minX, box.min.x)
      minY = Math.min(minY, box.min.y)
      maxX = Math.max(maxX, box.max.x)
      maxY = Math.max(maxY, box.max.y)
    } catch {
      // Fonts / empty geometry.
    }
  }
  if (!Number.isFinite(minX)) return undefined
  return new AcGeBox2d(new AcGePoint2d(minX, minY), new AcGePoint2d(maxX, maxY))
}

function formatScale(scale: number) {
  return Number(scale.toPrecision(6)).toString()
}
