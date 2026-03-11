import { AcDbLine, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { eventBus } from '../editor/global/eventBus'
import { AcApI18n } from '../i18n'
import { createMeasurementLine } from '../util'
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

  constructor(view: AcEdBaseView, p1: AcGePoint3dLike) {
    super(view)
    this._p1 = p1
    this._view = view
    this._line = createMeasurementLine(p1, p1)

    // Live badge — short-lived, cleaned up in end()
    this._badge = document.createElement('div')
    this._badge.style.cssText =
      'position:fixed;background:rgba(255,255,255,0.95);color:#1e40af;' +
      'font-size:13px;font-family:sans-serif;font-weight:500;' +
      'padding:3px 14px;border-radius:20px;pointer-events:none;' +
      'transform:translate(-50%,-50%);white-space:nowrap;' +
      'box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:99999;display:none;'
    document.body.appendChild(this._badge)
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
 * line between them with `registerMeasurementCleanup` so it can be removed by
 * the Clear Measurements command. The persistent DOM overlay (dots + badge) is
 * handled by the `useMeasurements` composable in `cad-viewer`, which listens for
 * the `measurement-added` event emitted here.
 */
export class AcApMeasureDistanceCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor

    const p1Prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureDistance.firstPoint')
    )
    const p1 = await editor.getPoint(p1Prompt)

    const p2Prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.measureDistance.secondPoint')
    )
    p2Prompt.useBasePoint = true
    p2Prompt.jig = new AcApMeasureDistanceJig(context.view, p1)
    const p2 = await editor.getPoint(p2Prompt)

    const dist = calcDist(p1, p2)

    // CAD transient line (zoom/pan aware, rendered by the engine)
    const line = createMeasurementLine(p1, p2)
    context.view.addTransientEntity(line)

    registerMeasurementCleanup(() => {
      context.view.removeTransientEntity(line.objectId)
    })

    // Notify the useMeasurements composable to render the persistent DOM overlay
    eventBus.emit('measurement-added', { type: 'distance', p1, p2, dist })
  }
}
