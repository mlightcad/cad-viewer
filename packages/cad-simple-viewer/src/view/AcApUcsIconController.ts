import {
  AcDbDatabase,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { ML_UI_Z_COMMAND_LINE } from '../editor/global/AcEdUiLayout.js'
import { readGripAppearance } from '../editor/grip/AcEdGripAppearance.js'
import { AcEdGripHandle } from '../editor/grip/AcEdGripHandle.js'
import { AcEdRubberBand } from '../editor/input/ui/AcEdRubberBand.js'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView.js'
import { type AcApUcsFrame, AcApUcsService } from '../service/AcApUcsService.js'
import type { AcApUcsIconOverlay } from './AcApUcsIconOverlay.js'

/**
 * Host hooks so this controller never imports {@link AcApDocManager} (that
 * cycle breaks Jest/CJS command registration). {@link AcTrView2d} supplies them.
 */
export interface AcApUcsIconControllerHost {
  /** False when the active drawing is read-only. Defaults to true. */
  canWrite?: () => boolean
  /** Fallback database when the view renderer has none bound yet. */
  getDatabase?: () => AcDbDatabase | undefined
}

type UcsGripKind = 'origin' | 'x' | 'y'

/** Pointer movement (CSS px) before a hold-drag commits on button release. */
const DRAG_THRESHOLD_PX = 4

const windowListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: false
}

/**
 * Hover / select / grip-edit for the UCS icon when Selectable is enabled.
 *
 * Selection is driven by pointer events on the icon DOM node itself (when
 * selectable) so thin SVG strokes are not the only hit target. Canvas
 * click-path {@link trySelect} remains as a fallback.
 *
 * Grip edit matches AutoCAD: click-and-drag, or click the grip then pick a
 * point / press Enter. Commits go through {@link AcApUcsService.applyFrame}.
 */
export class AcApUcsIconController {
  private selected = false
  private hovering = false
  private grips: {
    kind: UcsGripKind
    handle: AcEdGripHandle
  }[] = []
  private dragging: {
    kind: UcsGripKind
    startFrame: AcApUcsFrame
    /** Drawing that owned the icon when the drag began (not curDocument). */
    database: AcDbDatabase
    /** Grip location in WCS at drag start (rubber-band / osnap lastPoint). */
    gripBaseWcs: AcGePoint3d
    /** Client coords of the initiating pointerdown (move threshold). */
    startClientX: number
    startClientY: number
    /** True while the initiating pointer button is still held. */
    pointerDown: boolean
    /** Moved past {@link DRAG_THRESHOLD_PX} while the button was held. */
    moved: boolean
    /** Latest resolved WCS under the cursor (for Enter / place). */
    lastWcs: AcGePoint3d
  } | null = null
  private rubberBand: AcEdRubberBand | null = null
  private disposed = false
  private pointerEventsEnabled = false

  private readonly onIconPointerMove = (e: PointerEvent) =>
    this.handleIconPointerMove(e)
  private readonly onIconPointerLeave = () => this.setHovering(false)
  private readonly onIconPointerDown = (e: PointerEvent) =>
    this.handleIconPointerDown(e)
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
  private readonly onDragMove = (e: PointerEvent) => this.handleDragMove(e)
  private readonly onDragUp = (e: PointerEvent) => this.handleDragUp(e)
  private readonly onPlacePointerDown = (e: PointerEvent) =>
    this.handlePlacePointerDown(e)
  private readonly onUcsChanged = () => {
    this.syncPointerEvents()
    this.refreshGrips()
  }

  constructor(
    private readonly view: AcEdBaseView,
    private readonly overlay: AcApUcsIconOverlay,
    private readonly host: HTMLElement,
    private readonly hostAccess: AcApUcsIconControllerHost = {}
  ) {
    const el = this.overlay.element
    // Hover follows the X/Y strokes, not the whole triad bounding box.
    el.addEventListener('pointermove', this.onIconPointerMove)
    el.addEventListener('pointerleave', this.onIconPointerLeave)
    el.addEventListener('pointerdown', this.onIconPointerDown)
    document.addEventListener('keydown', this.onKeyDown)
    AcApUcsService.events.ucsChanged.addEventListener(this.onUcsChanged)
    this.syncPointerEvents()
  }

  get isSelected(): boolean {
    return this.selected
  }

  /**
   * Canvas-path fallback: try to select the UCS icon at canvas coordinates.
   */
  trySelect(canvasX: number, canvasY: number): boolean {
    if (!this.canInteract()) {
      this.clearSelection()
      return false
    }
    if (!this.overlay.hitTest(canvasX, canvasY)) {
      return false
    }
    this.selectIcon()
    return true
  }

  /** Clear selection when the user clicks empty space or disables the icon. */
  clearSelection(): void {
    this.setSelected(false)
  }

  /** Called each frame after the overlay updates so grips track the icon. */
  sync(): void {
    if (this.disposed) return
    this.syncPointerEvents()
    if (!this.canInteract()) {
      if (this.selected || this.hovering) {
        this.clearSelection()
        this.setHovering(false)
      }
      this.destroyGrips()
      return
    }
    if (this.selected && !this.dragging) {
      this.refreshGrips()
    }
  }

  dispose(): void {
    this.disposed = true
    this.endDrag()
    AcApUcsService.setDisplayPreviewFrame(null, this.tryDb())
    this.destroyGrips()
    const el = this.overlay.element
    el.removeEventListener('pointermove', this.onIconPointerMove)
    el.removeEventListener('pointerleave', this.onIconPointerLeave)
    el.removeEventListener('pointerdown', this.onIconPointerDown)
    document.removeEventListener('keydown', this.onKeyDown)
    AcApUcsService.events.ucsChanged.removeEventListener(this.onUcsChanged)
    this.overlay.setPointerEventsEnabled(false)
  }

  private handleIconPointerMove(e: PointerEvent) {
    if (!this.canInteract()) {
      this.setHovering(false)
      return
    }
    const canvas = this.view.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    this.setHovering(this.overlay.hitTestAxes(canvas.x, canvas.y))
  }

  private handleIconPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    // Click-to-place after a grip click: the triad may sit under the cursor
    // (origin + UCSICON Origin), so the icon itself must accept the place pick.
    if (this.dragging && !this.dragging.pointerDown) {
      e.preventDefault()
      e.stopPropagation()
      this.commitDrag(this.eventToWcs(e) ?? this.dragging.lastWcs)
      return
    }
    if (!this.canInteract()) return
    // Stop the canvas selection gesture from starting / clearing this pick.
    e.preventDefault()
    e.stopPropagation()
    this.selectIcon()
  }

  private selectIcon() {
    const selectionSet = this.view.selectionSet
    if (selectionSet.count > 0) selectionSet.clear()
    const ht = (
      this.view as AcEdBaseView & {
        htmlTransientManager?: { deselectAll: () => void }
      }
    ).htmlTransientManager
    ht?.deselectAll()
    this.setSelected(true)
  }

  private canInteract(): boolean {
    const icon = AcApUcsService.getIconSettings(this.tryDb())
    if (!icon.on || !icon.allowSelectingIcon) return false
    if (!(this.hostAccess.canWrite?.() ?? true)) return false
    if (this.view.editor.isActive) return false
    return this.overlay.geometry != null
  }

  private syncPointerEvents() {
    // Hold-drag: disable hits so the moving origin triad does not swallow
    // pointerup. Click-to-place: keep hits so a pick on the icon commits.
    // Idle: only when canInteract() — never steal canvas picks during an
    // active command (TRIM/EXTEND picking at the UCS origin, etc.).
    let enabled = false
    if (!this.disposed && this.overlay.geometry != null) {
      if (this.dragging) {
        enabled = !this.dragging.pointerDown
      } else {
        enabled = this.canInteract()
      }
    }
    if (enabled === this.pointerEventsEnabled) return
    this.pointerEventsEnabled = enabled
    this.overlay.setPointerEventsEnabled(enabled)
  }

  private setSelected(value: boolean) {
    this.selected = value
    if (!value) {
      this.destroyGrips()
      this.overlay.setVisualState(this.hovering ? 'hover' : 'normal')
      return
    }
    this.overlay.setVisualState('selected')
    this.refreshGrips()
  }

  private setHovering(value: boolean) {
    this.hovering = value
    if (this.selected) return
    this.overlay.setVisualState(value ? 'hover' : 'normal')
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.dragging) {
        e.preventDefault()
        this.cancelDrag()
        return
      }
      if (this.selected) this.clearSelection()
      return
    }
    if ((e.key === 'Enter' || e.key === 'Return') && this.dragging) {
      e.preventDefault()
      this.commitDrag(this.dragging.lastWcs)
    }
  }

  private refreshGrips() {
    if (!this.selected || this.dragging) return
    const geometry = this.overlay.geometry
    if (!geometry) {
      this.destroyGrips()
      return
    }

    const db = this.tryDb()
    const appearance = db
      ? readGripAppearance(db)
      : {
          size: 8,
          colorCss: '#0080ff',
          hotColorCss: '#ff0000'
        }

    if (this.grips.length === 0) {
      const kinds: UcsGripKind[] = ['origin', 'x', 'y']
      for (const kind of kinds) {
        const handle = new AcEdGripHandle(this.host, appearance)
        handle.element.style.zIndex = String(ML_UI_Z_COMMAND_LINE + 1)
        handle.element.style.pointerEvents = 'auto'
        handle.element.addEventListener('pointerdown', ev => {
          if (ev.button !== 0) return
          ev.preventDefault()
          ev.stopPropagation()
          this.beginDrag(kind, ev)
        })
        handle.element.addEventListener('pointerenter', () => {
          if (!this.dragging) handle.setState('hover')
        })
        handle.element.addEventListener('pointerleave', () => {
          if (!this.dragging) handle.setState('normal')
        })
        this.grips.push({ kind, handle })
      }
    } else {
      for (const g of this.grips) {
        g.handle.applyAppearance(appearance)
      }
    }

    for (const g of this.grips) {
      const canvasPos =
        g.kind === 'origin'
          ? geometry.origin
          : g.kind === 'x'
            ? geometry.xTip
            : geometry.yTip
      g.handle.setPosition(this.view.canvasToContainer(canvasPos))
      g.handle.element.style.display = ''
    }
  }

  private destroyGrips() {
    for (const g of this.grips) g.handle.destroy()
    this.grips = []
  }

  private beginDrag(kind: UcsGripKind, startEvent: PointerEvent) {
    const database = this.tryDb()
    if (!database) return
    const frame = AcApUcsService.getActiveFrame(database)
    // OSNAP / polar lastPoint stays at the grip WCS when the drag began.
    const gripBaseWcs = this.currentGripWcs(kind)
    if (!gripBaseWcs) return
    this.dragging = {
      kind,
      startFrame: cloneFrame(frame),
      database,
      gripBaseWcs,
      startClientX: startEvent.clientX,
      startClientY: startEvent.clientY,
      pointerDown: true,
      moved: false,
      lastWcs: gripBaseWcs.clone()
    }
    for (const g of this.grips) {
      g.handle.setState(g.kind === kind ? 'hot' : 'normal')
      g.handle.element.style.display = 'none'
    }
    this.syncPointerEvents()
    this.rubberBand?.dispose()
    this.rubberBand = new AcEdRubberBand(this.view)
    this.rubberBand.start(gripBaseWcs, {
      showBaseLineOnly: true,
      dashedBaseLine: true
    })
    // Pointer listeners (not mouse): preventDefault on pointerdown suppresses
    // compatibility mouseup/mousemove, which left origin drags stuck when the
    // triad sat under the cursor in UCSICON Origin mode.
    window.addEventListener(
      'pointermove',
      this.onDragMove,
      windowListenerOptions
    )
    window.addEventListener('pointerup', this.onDragUp, windowListenerOptions)
    window.addEventListener(
      'pointercancel',
      this.onDragUp,
      windowListenerOptions
    )
  }

  /** Screen grip on the current icon triad → WCS (for rubber-band anchor). */
  private currentGripWcs(kind: UcsGripKind): AcGePoint3d | null {
    const geometry = this.overlay.geometry
    if (!geometry) return null
    const canvasPos =
      kind === 'origin'
        ? geometry.origin
        : kind === 'x'
          ? geometry.xTip
          : geometry.yTip
    const wcs = this.view.screenToWorld(canvasPos)
    return new AcGePoint3d(wcs.x, wcs.y, 0)
  }

  private handleDragMove(e: PointerEvent) {
    if (!this.dragging) return
    const wcs = this.eventToWcs(e)
    if (!wcs) return
    this.dragging.lastWcs = wcs
    if (this.dragging.pointerDown && !this.dragging.moved) {
      const dx = e.clientX - this.dragging.startClientX
      const dy = e.clientY - this.dragging.startClientY
      if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        this.dragging.moved = true
      }
    }
    const next = this.frameFromDrag(
      this.dragging.startFrame,
      this.dragging.kind,
      wcs
    )
    // Preview only — view PLAN follow (UCSFOLLOW) runs on commit in applyFrame.
    AcApUcsService.setDisplayPreviewFrame(next, this.dragging.database)
    this.overlay.update(this.view)
    // Origin rubber-band stays at the drag-start grip (AutoCAD). Axis tips
    // move with the live triad, so re-anchor the dashed line on the tip.
    if (this.dragging.kind !== 'origin') {
      const gripWcs = this.currentGripWcs(this.dragging.kind)
      if (gripWcs) this.rubberBand?.setBasePoint(gripWcs)
    }
    this.rubberBand?.update(wcs)
  }

  private handleDragUp(e: PointerEvent) {
    if (e.type !== 'pointercancel' && e.button !== 0) return
    if (!this.dragging?.pointerDown) return
    const wcs = this.eventToWcs(e) ?? this.dragging.lastWcs
    this.dragging.lastWcs = wcs
    this.dragging.pointerDown = false
    if (this.dragging.moved || e.type === 'pointercancel') {
      this.commitDrag(wcs)
      return
    }
    // Click without drag → AutoCAD click-then-pick mode.
    this.syncPointerEvents()
    window.addEventListener(
      'pointerdown',
      this.onPlacePointerDown,
      windowListenerOptions
    )
  }

  private handlePlacePointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    if (!this.dragging || this.dragging.pointerDown) return
    e.preventDefault()
    e.stopPropagation()
    const wcs = this.eventToWcs(e) ?? this.dragging.lastWcs
    this.commitDrag(wcs)
  }

  private commitDrag(wcs: AcGePoint3dLike) {
    if (!this.dragging) return
    const start = this.dragging.startFrame
    const kind = this.dragging.kind
    const db = this.dragging.database
    this.endDrag()
    AcApUcsService.setDisplayPreviewFrame(null, db)
    const next = this.frameFromDrag(start, kind, wcs)
    AcApUcsService.applyFrame(db, next)
    this.refreshGrips()
  }

  private cancelDrag() {
    if (!this.dragging) return
    const db = this.dragging.database
    this.endDrag()
    AcApUcsService.setDisplayPreviewFrame(null, db)
    this.refreshGrips()
  }

  private endDrag() {
    window.removeEventListener(
      'pointermove',
      this.onDragMove,
      windowListenerOptions
    )
    window.removeEventListener(
      'pointerup',
      this.onDragUp,
      windowListenerOptions
    )
    window.removeEventListener(
      'pointercancel',
      this.onDragUp,
      windowListenerOptions
    )
    window.removeEventListener(
      'pointerdown',
      this.onPlacePointerDown,
      windowListenerOptions
    )
    this.rubberBand?.dispose()
    this.rubberBand = null
    this.view.clearOverlayGripOsnap()
    this.dragging = null
    this.syncPointerEvents()
    for (const g of this.grips) {
      g.handle.element.style.display = ''
      g.handle.setState('normal')
    }
  }

  private frameFromDrag(
    start: AcApUcsFrame,
    kind: UcsGripKind,
    wcs: AcGePoint3dLike
  ): AcApUcsFrame {
    if (kind === 'origin') {
      return {
        origin: new AcGePoint3d(wcs.x, wcs.y, wcs.z ?? start.origin.z),
        xAxis: start.xAxis.clone(),
        yAxis: start.yAxis.clone()
      }
    }
    if (kind === 'x') {
      return AcApUcsService.frameFromPoints(start.origin, wcs, undefined, start)
    }
    const origin = start.origin
    const yDir = normalize({
      x: wcs.x - origin.x,
      y: wcs.y - origin.y,
      z: (wcs.z ?? 0) - origin.z
    })
    const z = normalize(cross(start.xAxis, start.yAxis))
    const zUse = Math.hypot(z.x, z.y, z.z) < 1e-8 ? new AcGePoint3d(0, 0, 1) : z
    const xDir = normalize(cross(yDir, zUse))
    return {
      origin: origin.clone(),
      xAxis: xDir,
      yAxis: yDir
    }
  }

  private eventToWcs(
    e: Pick<PointerEvent, 'clientX' | 'clientY'>
  ): AcGePoint3d | null {
    const canvas = this.view.viewportToCanvas({ x: e.clientX, y: e.clientY })
    const raw = this.view.screenToWorld(canvas)
    const lastPoint = this.dragging?.gripBaseWcs
    const snapped = this.view.resolveOverlayGripPoint(
      { x: raw.x, y: raw.y },
      lastPoint ? { x: lastPoint.x, y: lastPoint.y } : undefined
    )
    return new AcGePoint3d(snapped.x, snapped.y, 0)
  }

  private tryDb(): AcDbDatabase | undefined {
    // Prefer the database bound to this canvas (split / compare views), not
    // whatever document happens to be current when a grip commits.
    const viewWithRenderer = this.view as AcEdBaseView & {
      renderer?: { context?: { database?: AcDbDatabase } }
    }
    return (
      viewWithRenderer.renderer?.context?.database ??
      this.hostAccess.getDatabase?.()
    )
  }
}

function cloneFrame(frame: AcApUcsFrame): AcApUcsFrame {
  return {
    origin: frame.origin.clone(),
    xAxis: frame.xAxis.clone(),
    yAxis: frame.yAxis.clone()
  }
}

function cross(a: AcGePoint3dLike, b: AcGePoint3dLike): AcGePoint3d {
  return new AcGePoint3d(
    a.y * (b.z ?? 0) - (a.z ?? 0) * b.y,
    (a.z ?? 0) * b.x - a.x * (b.z ?? 0),
    a.x * b.y - a.y * b.x
  )
}

function normalize(axis: AcGePoint3dLike): AcGePoint3d {
  const len = Math.hypot(axis.x, axis.y, axis.z ?? 0)
  if (len < 1e-12) return new AcGePoint3d(1, 0, 0)
  return new AcGePoint3d(axis.x / len, axis.y / len, (axis.z ?? 0) / len)
}
