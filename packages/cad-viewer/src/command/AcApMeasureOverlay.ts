import { AcEdBaseView, AcTrView2d } from '@mlightcad/cad-simple-viewer'

type WorldPt = { x: number; y: number }

type LabelRecord = {
  worldPt: WorldPt
  el: HTMLDivElement
}

/**
 * Singleton overlay manager for measurement annotations.
 *
 * Lines and dots are rendered via AcTrView2d.addMeasureLine / addMeasurePoints,
 * which create THREE.js objects inside the overlay scene. They automatically
 * follow pan/zoom with zero coordinate recalculation.
 *
 * Text labels are HTML divs; only their screen position is updated on viewChanged.
 */
export class AcApMeasureOverlay {
  private static _instance: AcApMeasureOverlay | null = null

  private _view: AcTrView2d | null = null
  private _labelContainer: HTMLDivElement | null = null
  private _labels: LabelRecord[] = []

  private constructor() {}

  static get instance(): AcApMeasureOverlay {
    if (!AcApMeasureOverlay._instance) {
      AcApMeasureOverlay._instance = new AcApMeasureOverlay()
    }
    return AcApMeasureOverlay._instance
  }

  init(view: AcEdBaseView) {
    const v = view as AcTrView2d
    if (this._view === v) return
    this._view = v

    const container = (view as unknown as { _container: HTMLElement })._container
    if (!container) return
    container.style.position = 'relative'

    if (!this._labelContainer) {
      const div = document.createElement('div')
      div.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:11;'
      container.appendChild(div)
      this._labelContainer = div
    }

    view.events.viewChanged.addEventListener(() => this._updateLabelPositions())
  }

  addDot(view: AcEdBaseView, p: WorldPt) {
    this.init(view)
    this._view?.addMeasurePoints([p])
  }

  addSegment(view: AcEdBaseView, p1: WorldPt, p2: WorldPt) {
    this.init(view)
    this._view?.addMeasureLine([p1, p2])
  }

  addDistanceLabel(view: AcEdBaseView, p1: WorldPt, p2: WorldPt, text: string) {
    this.init(view)
    this._view?.addMeasureLine([p1, p2])
    this._view?.addMeasurePoints([p1, p2])
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    this._addLabel(view, mid, text, 'translate(-50%,-130%)', 'rgba(0,0,0,0.7)', '#00e5ff')
  }

  addAngleLabel(view: AcEdBaseView, vertex: WorldPt, arm1: WorldPt, arm2: WorldPt, text: string) {
    this.init(view)
    // First arm is already drawn incrementally by the command;
    // only draw the second arm and its endpoint here.
    this._view?.addMeasureLine([vertex, arm2])
    this._view?.addMeasurePoints([arm2])

    // Draw an arc between the two arms
    const dx1 = arm1.x - vertex.x
    const dy1 = arm1.y - vertex.y
    const dx2 = arm2.x - vertex.x
    const dy2 = arm2.y - vertex.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    const radius = Math.min(len1, len2) * 0.3

    let startAngle = Math.atan2(dy1, dx1)
    let endAngle = Math.atan2(dy2, dx2)

    // Normalize so we always sweep the smaller angle
    let sweep = endAngle - startAngle
    if (sweep < 0) sweep += Math.PI * 2
    if (sweep > Math.PI) {
      // Swap to take the shorter arc
      const tmp = startAngle
      startAngle = endAngle
      endAngle = tmp
      sweep = Math.PI * 2 - sweep
    }

    // Generate arc polyline points
    const arcSegments = 32
    const arcPoints: WorldPt[] = []
    for (let i = 0; i <= arcSegments; i++) {
      const t = startAngle + (sweep * i) / arcSegments
      arcPoints.push({
        x: vertex.x + radius * Math.cos(t),
        y: vertex.y + radius * Math.sin(t)
      })
    }
    this._view?.addMeasureLine(arcPoints)

    // Place label at the arc midpoint
    const midAngle = startAngle + sweep / 2
    const labelRadius = radius * 1.4
    const labelPt = {
      x: vertex.x + labelRadius * Math.cos(midAngle),
      y: vertex.y + labelRadius * Math.sin(midAngle)
    }
    this._addLabel(view, labelPt, text, 'translate(-50%,-50%)', 'rgba(0,0,0,0.7)', '#00e5ff')
  }

  addAreaLabel(view: AcEdBaseView, pts: WorldPt[], text: string) {
    this.init(view)
    this._view?.addMeasureLine([...pts, pts[0]])
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    this._addLabel(view, { x: cx, y: cy }, text, 'translate(-50%,-50%)', 'rgba(0,60,180,0.8)', '#fff')
  }

  clear() {
    this._view?.clearOverlay()
    for (const label of this._labels) {
      label.el.parentElement?.removeChild(label.el)
    }
    this._labels = []
  }

  private _addLabel(
    view: AcEdBaseView,
    worldPt: WorldPt,
    text: string,
    transform: string,
    bg: string,
    color: string
  ) {
    if (!this._labelContainer) return
    const el = document.createElement('div')
    el.textContent = text
    const screen = view.worldToScreen(worldPt)
    el.style.cssText = `
      position:absolute;
      left:${screen.x}px;
      top:${screen.y}px;
      transform:${transform};
      background:${bg};
      color:${color};
      font-size:12px;
      font-family:monospace;
      padding:2px 6px;
      border-radius:3px;
      white-space:nowrap;
    `
    this._labelContainer.appendChild(el)
    this._labels.push({ worldPt, el })
  }

  private _updateLabelPositions() {
    if (!this._view) return
    for (const label of this._labels) {
      const screen = this._view.worldToScreen(label.worldPt)
      label.el.style.left = `${screen.x}px`
      label.el.style.top = `${screen.y}px`
    }
  }
}
