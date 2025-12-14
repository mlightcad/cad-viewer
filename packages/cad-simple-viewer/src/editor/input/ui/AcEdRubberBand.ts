import { AcGePoint2dLike, AcGePoint3d } from '@mlightcad/data-model'

import { AcEdBaseView } from '../../view'

/**
 * Options for the AcEdRubberBand preview.
 */
export interface AcEdRubberBandOptions {
  /**
   * The color used for the rubber-band lines and label. Defaults to green (#0f0).
   */
  color?: string

  /**
   * The length of the perpendicular lines (perpLineAtBase and perpLineAtCursor)
   * in pixels or world units. Defaults to 50.
   */
  perpendicularLength?: number

  /**
   * If true, only the baseLine will be shown. Other lines are hidden.
   */
  showBaseLineOnly?: boolean
}

/**
 * AcEdRubberBand provides a temporary CAD-style rubber-band preview.
 *
 * It can draws a CAD-like reference rectangle:
 * 1. baseLine: solid line from the last point to the cursor.
 * 2. perpLineAtBase: dashed perpendicular line at the base point.
 * 3. perpLineAtCursor: dashed perpendicular line at the cursor.
 * 4. connectorLine: dashed line connecting the ends of the two perpendicular lines.
 * 5. distance label displayed near connectorLine
 *
 * And draw one arc:
 * 1. xAxisLine: horizontal reference line starting at base point
 * 2. angleArc: arc showing angle between baseLine and x-axis (radius = baseLine length)
 * 3. angle label shown at midpoint of the arc
 */
export class AcEdRubberBand {
  private view: AcEdBaseView
  private basePoint?: AcGePoint3d

  private container: HTMLDivElement | null = null

  // main geometry
  private baseLine: HTMLDivElement | null = null
  private perpLineAtBase: HTMLDivElement | null = null
  private perpLineAtCursor: HTMLDivElement | null = null
  private connectorLine: HTMLDivElement | null = null

  // labels
  private labelEl: HTMLDivElement | null = null
  private angleLabelEl: HTMLDivElement | null = null

  // angle visuals (SVG)
  private xAxisLine: HTMLDivElement | null = null
  private angleSvg: SVGSVGElement | null = null
  private anglePath: SVGPathElement | null = null

  private options: AcEdRubberBandOptions = {}

  /** Returns the parent container element that holds all rubber-band HTML elements. */
  get element() {
    return this.container
  }

  constructor(view: AcEdBaseView) {
    this.view = view
  }

  /**
   * Starts the rubber-band preview.
   * @param basePoint The starting point in world coordinates.
   */
  start(basePoint: AcGePoint2dLike, options?: AcEdRubberBandOptions) {
    this.basePoint = new AcGePoint3d(basePoint)
    this.options = options || {}

    const color = this.options.color || '#0f0'

    // --------------------------------------------------------------------
    // Create parent container
    // --------------------------------------------------------------------
    this.container = document.createElement('div')
    this.container.style.position = 'fixed'
    this.container.style.left = '0'
    this.container.style.top = '0'
    this.container.style.pointerEvents = 'none'
    this.container.style.zIndex = '99999'
    document.body.appendChild(this.container)

    // --------------------------------------------------------------------
    // Always create baseLine
    // --------------------------------------------------------------------
    this.baseLine = document.createElement('div')
    this.baseLine.style.position = 'fixed'
    this.baseLine.style.borderTop = `1px solid ${color}`
    this.container.appendChild(this.baseLine)

    const createDashed = () => {
      const el = document.createElement('div')
      el.style.position = 'fixed'
      el.style.borderTop = `1px dashed ${color}`
      this.container!.appendChild(el)
      return el
    }

    if (!this.options.showBaseLineOnly) {
      // perpendiculars + connector
      this.perpLineAtBase = createDashed()
      this.perpLineAtCursor = createDashed()
      this.connectorLine = createDashed()

      // distance label
      this.labelEl = document.createElement('div')
      this.labelEl.style.position = 'fixed'
      // this.labelEl.style.background = 'rgba(0,0,0,0.6)'
      this.labelEl.style.color = color
      this.labelEl.style.fontSize = '12px'
      this.labelEl.style.padding = '2px 4px'
      this.labelEl.style.borderRadius = '4px'
      this.container.appendChild(this.labelEl)

      // X-axis reference line
      this.xAxisLine = document.createElement('div')
      this.xAxisLine.style.position = 'fixed'
      this.xAxisLine.style.borderTop = `1px solid ${color}`
      this.container.appendChild(this.xAxisLine)

      // SVG for angle arc
      // We'll create an SVG sized dynamically on each update (width = height = 2*radius)
      this.angleSvg = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      )
      // Let the SVG be absolutely positioned; we set left/top/width/height in update()
      this.angleSvg.setAttribute(
        'style',
        'position:absolute; overflow:visible; pointer-events:none;'
      )
      // Path element for the arc
      this.anglePath = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )
      this.anglePath.setAttribute('fill', 'none')
      this.anglePath.setAttribute('stroke', color)
      this.anglePath.setAttribute('stroke-width', '1')
      this.anglePath.setAttribute('stroke-dasharray', '4 4')
      this.angleSvg.appendChild(this.anglePath)
      this.container.appendChild(this.angleSvg)

      // Angle label (HTML) positioned in screen coords at arc midpoint
      this.angleLabelEl = document.createElement('div')
      this.angleLabelEl.style.position = 'fixed'
      // this.angleLabelEl.style.background = 'rgba(0,0,0,0.6)'
      this.angleLabelEl.style.color = color
      this.angleLabelEl.style.fontSize = '12px'
      this.angleLabelEl.style.padding = '2px 4px'
      this.angleLabelEl.style.borderRadius = '4px'
      this.container.appendChild(this.angleLabelEl)
    }
  }

  /**
   * Updates the rubber-band lines to a new target point.
   * @param targetPoint The current cursor position in world coordinates.
   */
  update(targetPoint: AcGePoint2dLike) {
    if (!this.container || !this.basePoint || !this.baseLine) return

    const rect = this.view.canvas.getBoundingClientRect()
    const p0 = this.view.wcs2Cwcs(this.basePoint)
    const p3 = this.view.wcs2Cwcs(targetPoint)

    const offsetX = rect.left
    const offsetY = rect.top

    const drawLine = (
      line: HTMLDivElement,
      start: AcGePoint2dLike,
      end: AcGePoint2dLike
    ) => {
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      line.style.width = `${length}px`
      line.style.transformOrigin = '0 0'
      line.style.transform = `translate(${start.x + offsetX}px, ${start.y + offsetY}px) rotate(${angle}deg)`
    }

    // --------------------------------------------------------------------
    // Always update baseLine
    // --------------------------------------------------------------------
    drawLine(this.baseLine, p0, p3)

    if (this.options.showBaseLineOnly) return

    // --------------------------------------------------------------------
    // Update remaining rectangle geometry
    // --------------------------------------------------------------------
    if (!this.perpLineAtBase || !this.perpLineAtCursor || !this.connectorLine)
      return

    const dx = p3.x - p0.x
    const dy = p3.y - p0.y
    const lengthBase = Math.sqrt(dx * dx + dy * dy)

    // protect against zero-length base line
    if (lengthBase === 0) {
      // hide or collapse other visuals
      if (this.perpLineAtBase) this.perpLineAtBase.style.width = '0px'
      if (this.perpLineAtCursor) this.perpLineAtCursor.style.width = '0px'
      if (this.connectorLine) this.connectorLine.style.width = '0px'
      if (this.xAxisLine) this.xAxisLine.style.width = '0px'
      if (this.anglePath) this.anglePath.setAttribute('d', '')
      if (this.angleLabelEl) this.angleLabelEl.style.display = 'none'
      return
    }

    const perpLen = this.options.perpendicularLength ?? 50

    // perpendicular unit
    const ux = -dy / lengthBase
    const uy = dx / lengthBase

    // perpendicular endpoints
    const pBasePerp = { x: p0.x + ux * perpLen, y: p0.y + uy * perpLen }
    const pCursorPerp = { x: p3.x + ux * perpLen, y: p3.y + uy * perpLen }

    drawLine(this.perpLineAtBase, p0, pBasePerp)
    drawLine(this.perpLineAtCursor, p3, pCursorPerp)
    drawLine(this.connectorLine, pBasePerp, pCursorPerp)

    // --------------------------------------------------------------------
    // Distance label
    // --------------------------------------------------------------------
    if (this.labelEl) {
      const midX = (pBasePerp.x + pCursorPerp.x) / 2 + offsetX
      const midY = (pBasePerp.y + pCursorPerp.y) / 2 + offsetY - 24

      const dist = Math.sqrt(
        (targetPoint.x - this.basePoint.x) ** 2 +
          (targetPoint.y - this.basePoint.y) ** 2
      )

      this.labelEl.textContent = dist.toFixed(3)
      this.labelEl.style.left = `${midX - 20}px`
      this.labelEl.style.top = `${midY}px`
      this.labelEl.style.display = ''
    }

    // --------------------------------------------------------------------
    // Horizontal X-axis line (same length as base line)
    // --------------------------------------------------------------------
    if (this.xAxisLine) {
      const pX = { x: p0.x + lengthBase, y: p0.y }
      drawLine(this.xAxisLine, p0, pX)
    }

    // --------------------------------------------------------------------
    // Angle arc (radius = length of base line)
    // Arc from end of x-axis (p0 + radius * +X) to end of baseLine (p3).
    // --------------------------------------------------------------------
    if (this.angleSvg && this.anglePath && this.angleLabelEl) {
      const radius = lengthBase

      // center (screen) of the arc
      const centerScreenX = p0.x + offsetX
      const centerScreenY = p0.y + offsetY

      // We need coordinates relative to the SVG's top-left.
      // We'll make the SVG have width = height = 2*radius and be positioned
      // at (center - radius). Then coordinates inside SVG are:
      // start = (2r, r), end = (r + r*cos(theta), r + r*sin(theta))

      // angle between +X and baseLine in screen coordinate system
      const angleRad = Math.atan2(p3.y - p0.y, p3.x - p0.x)
      const angleDeg = (angleRad * 180) / Math.PI

      // mid-angle for placing label (middle of arc)
      const midAngle = angleRad / 2

      // SVG position and sizing
      const svgLeft = centerScreenX - radius
      const svgTop = centerScreenY - radius
      const svgSize = radius * 2

      // set SVG attributes and position
      this.angleSvg.style.left = `${svgLeft}px`
      this.angleSvg.style.top = `${svgTop}px`
      this.angleSvg.setAttribute('width', `${svgSize}`)
      this.angleSvg.setAttribute('height', `${svgSize}`)
      this.angleSvg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`)

      // compute start and end in SVG local coords (origin top-left)
      const cx = radius
      const cy = radius
      const sx = cx + radius // = 2*radius
      const sy = cy
      const ex = cx + radius * Math.cos(angleRad)
      const ey = cy + radius * Math.sin(angleRad)

      // large-arc-flag: whether to take the long way around
      const largeArcFlag = Math.abs(angleRad) > Math.PI ? '1' : '0'
      // sweep-flag: for screen coords (y downwards), positive angle => sweep=1
      const sweepFlag = angleRad >= 0 ? '1' : '0'

      // build path: Move to start, arc to end
      const d = `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${ex} ${ey}`
      this.anglePath.setAttribute('d', d)

      // angle label (absolute degrees)
      const angleValueDeg = Math.abs(angleDeg)
      const angleText = `${angleValueDeg.toFixed(1)}°`

      // midpoint of arc in screen coords
      const midScreenX = centerScreenX + radius * Math.cos(midAngle)
      const midScreenY = centerScreenY + radius * Math.sin(midAngle)

      this.angleLabelEl.textContent = angleText
      // center the label roughly
      const labelRectApproxWidth = 40 // rough centering; exact can be done by measuring
      this.angleLabelEl.style.left = `${midScreenX - labelRectApproxWidth / 2}px`
      this.angleLabelEl.style.top = `${midScreenY - 12}px`
      this.angleLabelEl.style.display = ''
    }
  }

  /** Disposes all HTML elements associated with this rubber-band. */
  dispose() {
    if (this.container) this.container.remove()
    this.container = null

    this.baseLine = null
    this.perpLineAtBase = null
    this.perpLineAtCursor = null
    this.connectorLine = null

    this.labelEl = null
    this.angleLabelEl = null

    this.xAxisLine = null
    this.angleSvg = null
    this.anglePath = null
  }
}
