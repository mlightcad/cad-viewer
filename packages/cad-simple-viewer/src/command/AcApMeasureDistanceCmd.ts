import {
  AcCmColor,
  AcDbLine,
  AcGePoint3dLike,
  AcGiLineWeight
} from '@mlightcad/data-model'

import { AcApContext } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdCorsorType,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdViewMode
} from '../editor'
import { AcApI18n } from '../i18n'
import { makeBadge, makeDot, makeLiveBadge, measurementColor } from '../util'
import { AcTrView2d } from '../view'
import { registerMeasurementCleanup } from './AcApClearMeasurementsCmd'

/** Returns the 2D Euclidean distance between two world points. */
function calcDist(p1: AcGePoint3dLike, p2: AcGePoint3dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Preview jig for the distance measurement command.
 *
 * Renders a live rubber-band line from the fixed first point to the current
 * cursor position. The badge showing the live distance is rendered by the
 * jig itself and is removed when the jig ends — it is intentionally short-lived
 * and intrinsic to the interactive input UX.
 */
export class AcApMeasureDistanceJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _line: AcDbLine
  private _p1: AcGePoint3dLike
  private _view: AcEdBaseView
  private _badge: HTMLDivElement

  constructor(view: AcEdBaseView, p1: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._p1 = p1
    this._view = view
    this._line = new AcDbLine(p1, p1)
    this._line.color = color
    this._line.lineWeight = AcGiLineWeight.LineWeight070

    // Live badge — short-lived, cleaned up in end()
    this._badge = makeLiveBadge(color)
  }

  get entity(): AcDbLine {
    return this._line
  }

  update(p2: AcGePoint3dLike) {
    this._line.endPoint = p2

    const dist = calcDist(this._p1, p2)
    if (dist < 0.0001) {
      this._badge.style.display = 'none'
      return
    }

    this._badge.textContent = `~ ${dist.toFixed(3)} m`
    this._badge.style.display = 'block'

    const mid = { x: (this._p1.x + p2.x) / 2, y: (this._p1.y + p2.y) / 2 }
    const rect = this._view.canvas.getBoundingClientRect()
    const s = this._view.worldToScreen(mid)
    this._badge.style.left = `${s.x + rect.left}px`
    this._badge.style.top = `${s.y + rect.top}px`
  }

  end() {
    super.end()
    this._badge.remove()
  }
}

/**
 * Command that measures the straight-line distance between two points.
 *
 * Prompts the user to pick two world points, then registers a transient CAD
 * line between them. Persistent DOM overlays (dots + badge) are placed via
 * {@link AcTrHtmlTransientManager} using CSS2DObject, so they track zoom/pan
 * automatically without manual viewChanged listeners.
 */
export class AcApMeasureDistanceCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const color = measurementColor(context.doc.database)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        const p1Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureDistance.firstPoint')
        )
        const p1 = await editor.getPoint(p1Prompt)

        const p2Prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measureDistance.secondPoint')
        )
        p2Prompt.useBasePoint = true
        p2Prompt.jig = new AcApMeasureDistanceJig(context.view, p1, color)
        const p2 = await editor.getPoint(p2Prompt)

        const dist = calcDist(p1, p2)

        // CAD transient line (zoom/pan aware, rendered by the engine)
        const line = new AcDbLine(p1, p2)
        line.color = color
        line.lineWeight = AcGiLineWeight.LineWeight070
        context.view.addTransientEntity(line)

        // Persistent overlays via htmlTransientManager (auto-positioned by CSS2DRenderer)
        const htManager = (context.view as AcTrView2d).htmlTransientManager
        const id = `dist-${Date.now()}`
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }

        htManager.add(`${id}-dot1`, makeDot(color), p1, 'measurement')
        htManager.add(`${id}-dot2`, makeDot(color), p2, 'measurement')
        htManager.add(
          `${id}-badge`,
          makeBadge(color, `~ ${dist.toFixed(3)} m`),
          mid,
          'measurement'
        )

        registerMeasurementCleanup(() => {
          context.view.removeTransientEntity(line.objectId)
          htManager.remove(`${id}-dot1`)
          htManager.remove(`${id}-dot2`)
          htManager.remove(`${id}-badge`)
        })
      })
    )
  }
}
