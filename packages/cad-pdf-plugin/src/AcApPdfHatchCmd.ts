import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcApPaletteService,
  acapZoomToVisible,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import {
  type AcDbDatabase,
  type AcDbEntity,
  type AcDbHatch,
  type AcDbObjectId
} from '@mlightcad/data-model'

import { AcApPdfHatchSession, type PdfHatchRow } from './AcApPdfHatchSession'
import { acapPdfT } from './acapPdfI18n'
import {
  acapPdfCreateRecoveredHatch,
  acapPdfHatchPatternLabel,
  acapPdfRecoverHatches,
  pdfEntitiesToHatchInput
} from './pdfHatchRecover'
import {
  type AcUiPdfHatchAddResult,
  AcUiPdfHatchPanel
} from './ui/AcUiPdfHatchPanel'

/** Delay before an edit redraws the preview (ms). */
const PREVIEW_DELAY = 120

/** Space around a hatch framed during the review, as a share of its size. */
const FOCUS_MARGIN = 0.3

type Row = PdfHatchRow<AcDbObjectId>

/**
 * `pdfhatch`: turns the loose strokes a PDF made of a pattern hatch back
 * into hatch objects.
 *
 * 1. Select the strokes together with the lines around them (a crossing
 *    window over the hatched area is enough).
 * 2. Strokes that form a regular pattern are matched against `acadiso.pat`,
 *    a user-defined single or crossed pattern, or else measured as a custom
 *    pattern. The boundary comes from closed shapes in the selection or the
 *    faces the selected line work encloses.
 * 3. A review panel opens in the palette with the hatches previewed in
 *    place of their strokes. Per hatch the user includes or skips it,
 *    changes its pattern, scale and angle (each change is refitted to the
 *    strokes and scored), and areas the recognition missed are added by
 *    picking a point inside them. Apply converts in one step; Cancel, or
 *    closing the palette, changes nothing. Without a DOM, every hatch found
 *    is converted directly.
 *
 * A hatch only replaces the entities it re-draws completely.
 */
export class AcApPdfHatchCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfhatch'
    })
    if (!resolved) return
    context.view.selectionSet.clear()

    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    resolved.entities.forEach((entity, i) =>
      entityById.set(resolved.ids[i], entity)
    )
    const input = pdfEntitiesToHatchInput(entityById)
    const recovery = acapPdfRecoverHatches(input)
    const session = new AcApPdfHatchSession({
      input,
      tolerance: recovery.tolerance,
      hatches: recovery.hatches.map(found => found.hatch)
    })

    const interactive = typeof document !== 'undefined'
    if (session.rows.length === 0 && !interactive) {
      this.notify(AcApI18n.t('jig.pdfhatch.noHatches'), 'warning')
      return
    }
    if (interactive) {
      if (session.rows.length === 0) {
        this.notify(AcApI18n.t('jig.pdfhatch.noHatches'), 'warning')
      }
      const apply = await this.review(context, session, entityById)
      if (!apply) {
        this.notify(acapPdfT('jig.pdfhatch.cancelled'))
        return
      }
    }

    const db = context.doc.database
    const created = session.readyRows.flatMap(row => {
      const entity = createEntity(db, session, row, entityById)
      return entity ? [{ row, entity }] : []
    })
    if (created.length === 0) return
    db.tables.blockTable.modelSpace.appendEntity(
      created.map(item => item.entity)
    )
    // Only strokes a created hatch re-draws go, each once.
    const erased = [...new Set(created.flatMap(item => item.row.consumed))]
    context.doc.entityService.eraseEntities(erased)
    this.notify(
      acapPdfT('jig.pdfhatch.summary', {
        count: created.length,
        patterns: patternList(created.map(item => item.row)),
        strokes: erased.length
      })
    )
  }

  /**
   * Shows the review panel in the palette and previews the hatches in the
   * drawing until the user applies or cancels.
   *
   * @returns Whether the user applied.
   */
  private async review(
    context: AcApContext,
    session: AcApPdfHatchSession<AcDbObjectId>,
    entityById: Map<AcDbObjectId, AcDbEntity>
  ): Promise<boolean> {
    const view = context.view
    const db = context.doc.database
    let previews: AcDbHatch[] = []
    /** Strokes hidden now (those the included hatches replace). */
    const hidden = new Set<AcDbObjectId>()
    let hideStrokes = true
    /** Strokes of the selected hatch, shown highlighted over its preview. */
    let focused: AcDbObjectId[] = []
    let timer: ReturnType<typeof setTimeout> | undefined

    const clearPreview = () => {
      for (const entity of previews) view.removeTransientEntity(entity.objectId)
      previews = []
    }
    const updateVisibility = () => {
      const show = new Set(focused)
      const want = new Set<AcDbObjectId>()
      if (hideStrokes) {
        for (const id of session.erasedIds) if (!show.has(id)) want.add(id)
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
      clearPreview()
      previews = session.readyRows
        .map(row => createEntity(db, session, row, entityById))
        .filter((entity): entity is AcDbHatch => !!entity)
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
    const focus = (row: Row | undefined, zoom: boolean) => {
      if (focused.length > 0) view.unhighlight(focused)
      focused = row ? [...row.consumed] : []
      updateVisibility()
      if (focused.length > 0) view.highlight(focused)
      if (!row || !zoom) return
      const box = createEntity(db, session, row, entityById)?.geometricExtents
      if (box && Number.isFinite(box.min.x)) {
        acapZoomToVisible(
          view,
          box,
          FOCUS_MARGIN,
          handle.coveredInsets(view.canvas)
        )
      }
    }
    const addRegion = async (): Promise<
      AcUiPdfHatchAddResult<AcDbObjectId>
    > => {
      const prompt = new AcEdPromptPointOptions(
        acapPdfT('jig.pdfhatch.pickPoint')
      )
      let result
      try {
        result = await AcApDocManager.instance.editor.getPoint(prompt)
      } catch {
        // An aborted or invalid input ends the pick, not the review.
        return 'cancelled'
      }
      if (result.status !== AcEdPromptStatus.OK || !result.value) {
        return 'cancelled'
      }
      return session.addRegion({ x: result.value.x, y: result.value.y })
    }

    let finish: (apply: boolean) => void = () => {}
    const result = new Promise<boolean>(resolve => {
      finish = resolve
    })
    const panel = new AcUiPdfHatchPanel<AcDbObjectId>({
      session,
      hideStrokes,
      onChange: schedulePreview,
      onFocusRow: focus,
      onHideStrokes: hide => {
        hideStrokes = hide
        updateVisibility()
      },
      onAddRegion: addRegion,
      onClose: apply => finish(apply)
    })
    // Panel callbacks only run after this, once the user interacts.
    const handle = AcApPaletteService.open(
      {
        id: 'pdfhatch',
        title: acapPdfT('jig.pdfhatch.panel.title'),
        element: panel.element
      },
      { container: view.container }
    )
    handle.onClosed(() => finish(false))

    try {
      refreshPreview()
      panel.selectFirst()
      return await result
    } finally {
      if (timer) clearTimeout(timer)
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

/** The hatch entity of a row, on the layer and in the colour of its strokes. */
function createEntity(
  db: AcDbDatabase,
  session: AcApPdfHatchSession<AcDbObjectId>,
  row: Row,
  entityById: Map<AcDbObjectId, AcDbEntity>
): AcDbHatch | undefined {
  const source = session.sourceOf(row)
  return acapPdfCreateRecoveredHatch(
    db,
    row.hatch,
    source === undefined ? undefined : entityById.get(source)
  )
}

/** `ANSI31 ×2, AR-B816` for the summary. */
function patternList(rows: Row[]): string {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = acapPdfHatchPatternLabel(row.hatch)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
    .join(', ')
}
