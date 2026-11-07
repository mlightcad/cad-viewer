import { AcGePoint2d, AcGePoint3d } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../editor/view/AcEdBaseView'
import {
  type AcApUcsFrame,
  AcApUcsService
} from '../service/AcApUcsService'

const ICON_SIZE = 56
const AXIS_LEN = 28

/**
 * DOM overlay that draws the AutoCAD-style UCS triad (X red / Y green, W for World).
 */
export class AcApUcsIconOverlay {
  private readonly _el: HTMLDivElement
  private readonly _svg: SVGSVGElement
  private readonly _xLine: SVGLineElement
  private readonly _yLine: SVGLineElement
  private readonly _xLabel: SVGTextElement
  private readonly _yLabel: SVGTextElement
  private readonly _wLabel: SVGTextElement
  private _disposed = false

  constructor(private readonly _host: HTMLElement) {
    const hostPosition = getComputedStyle(this._host).position
    if (hostPosition === 'static') {
      this._host.style.position = 'relative'
    }

    this._el = document.createElement('div')
    this._el.className = 'ml-ucs-icon'
    this._el.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'z-index:5',
      `width:${ICON_SIZE}px`,
      `height:${ICON_SIZE}px`,
      'display:none'
    ].join(';')

    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this._svg.setAttribute('width', String(ICON_SIZE))
    this._svg.setAttribute('height', String(ICON_SIZE))
    this._svg.setAttribute('viewBox', `0 0 ${ICON_SIZE} ${ICON_SIZE}`)

    this._xLine = this.createLine('#e53935')
    this._yLine = this.createLine('#43a047')
    this._xLabel = this.createLabel('X', '#e53935')
    this._yLabel = this.createLabel('Y', '#43a047')
    this._wLabel = this.createLabel('W', '#90caf9')
    this._wLabel.style.fontSize = '11px'
    this._wLabel.style.fontWeight = '700'

    this._svg.append(
      this._xLine,
      this._yLine,
      this._xLabel,
      this._yLabel,
      this._wLabel
    )
    this._el.appendChild(this._svg)
    this._host.appendChild(this._el)
  }

  update(view: AcEdBaseView): void {
    if (this._disposed) return
    const icon = AcApUcsService.getIconSettings()
    if (!icon.on) {
      this._el.style.display = 'none'
      return
    }

    const frame = AcApUcsService.getActiveFrame()
    const isWorld = AcApUcsService.isWorldFrame(frame)
    this._wLabel.style.display = isWorld ? '' : 'none'

    const originScreen = this.resolveScreenPosition(view, frame, icon.atOrigin)
    if (!originScreen) {
      this._el.style.display = 'none'
      return
    }

    const ox = ICON_SIZE * 0.28
    const oy = ICON_SIZE * 0.72
    const xDir = this.screenAxisDirection(view, frame, 'x')
    const yDir = this.screenAxisDirection(view, frame, 'y')

    this.setLine(this._xLine, ox, oy, ox + xDir.x * AXIS_LEN, oy + xDir.y * AXIS_LEN)
    this.setLine(this._yLine, ox, oy, ox + yDir.x * AXIS_LEN, oy + yDir.y * AXIS_LEN)
    this.setLabel(
      this._xLabel,
      ox + xDir.x * (AXIS_LEN + 6),
      oy + xDir.y * (AXIS_LEN + 6)
    )
    this.setLabel(
      this._yLabel,
      ox + yDir.x * (AXIS_LEN + 6),
      oy + yDir.y * (AXIS_LEN + 6)
    )
    this.setLabel(this._wLabel, ox - 2, oy + 12)

    this._el.style.display = 'block'
    this._el.style.left = `${originScreen.x - ox}px`
    this._el.style.top = `${originScreen.y - oy}px`
  }

  dispose(): void {
    this._disposed = true
    this._el.remove()
  }

  private resolveScreenPosition(
    view: AcEdBaseView,
    frame: AcApUcsFrame,
    atOrigin: boolean
  ): AcGePoint2d | null {
    if (atOrigin) {
      const screen = view.worldToScreen(
        new AcGePoint2d(frame.origin.x, frame.origin.y)
      )
      const margin = 8
      if (
        screen.x < margin ||
        screen.y < margin ||
        screen.x > view.width - margin ||
        screen.y > view.height - margin
      ) {
        // Origin not visible — fall back to lower-left like AutoCAD.
        return new AcGePoint2d(margin + 8, view.height - margin - 8)
      }
      return screen
    }
    return new AcGePoint2d(16, view.height - 16)
  }

  private screenAxisDirection(
    view: AcEdBaseView,
    frame: AcApUcsFrame,
    axis: 'x' | 'y'
  ): { x: number; y: number } {
    const origin = frame.origin
    const dir = axis === 'x' ? frame.xAxis : frame.yAxis
    const tip = new AcGePoint3d(
      origin.x + dir.x,
      origin.y + dir.y,
      origin.z + dir.z
    )
    const o = view.worldToScreen(new AcGePoint2d(origin.x, origin.y))
    const t = view.worldToScreen(new AcGePoint2d(tip.x, tip.y))
    const dx = t.x - o.x
    const dy = t.y - o.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) {
      return axis === 'x' ? { x: 1, y: 0 } : { x: 0, y: -1 }
    }
    return { x: dx / len, y: dy / len }
  }

  private createLine(color: string): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    return line
  }

  private createLabel(text: string, color: string): SVGTextElement {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.textContent = text
    label.setAttribute('fill', color)
    label.setAttribute('font-size', '12')
    label.setAttribute('font-family', 'sans-serif')
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    return label
  }

  private setLine(
    line: SVGLineElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
  }

  private setLabel(label: SVGTextElement, x: number, y: number) {
    label.setAttribute('x', String(x))
    label.setAttribute('y', String(y))
  }
}
