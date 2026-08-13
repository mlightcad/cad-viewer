import {
  AcDbCircle,
  AcDbLine,
  AcDbObjectId,
  AcDbPolyline,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGiLineWeight
} from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlCallout,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot,
  AcTrHtmlGroup,
  AcTrHtmlStamp
} from '@mlightcad/three-renderer'

import type { AcEdBaseView } from '../../editor'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import type { AcTrView2d } from '../../view'
import { bindMarkupCalloutGrips } from './AcApMarkupCalloutDrag'
import {
  getMarkupHistory,
  getSessionUndo,
  runMarkupEdit
} from './AcApMarkupHistory'
import type { AcApMarkupShapeOutline } from './AcApMarkupShapeCallout'
import { getMarkupStore, MARKUP_LAYER, MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type {
  AcApMarkupAttachedCallout,
  AcApMarkupPoint2d,
  AcApMarkupRecord
} from './AcApMarkupTypes'
import {
  cssToMarkupColor,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth
} from './AcApMarkupUtil'

const CLOUD_DIAMETER_PIXELS = 8

function asView2d(view: AcEdBaseView): AcTrView2d {
  return view as AcTrView2d
}

function pixelToWorldDistance(
  view: AcEdBaseView,
  pixelDistance: number,
  referencePoint: AcGePoint2dLike
): number {
  const screenPoint1 = view.worldToScreen(referencePoint)
  const screenPoint2 = { x: screenPoint1.x + pixelDistance, y: screenPoint1.y }
  const worldPoint2 = view.screenToWorld(screenPoint2)
  return Math.abs(worldPoint2.x - referencePoint.x)
}

/**
 * Rebuild a closed revision-cloud polyline between two opposite corners.
 */
export function buildMarkupCloud(
  cloud: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike,
  view: AcEdBaseView
): void {
  cloud.reset(false)

  const minX = Math.min(firstPoint.x, secondPoint.x)
  const maxX = Math.max(firstPoint.x, secondPoint.x)
  const minY = Math.min(firstPoint.y, secondPoint.y)
  const maxY = Math.max(firstPoint.y, secondPoint.y)
  const width = maxX - minX
  const height = maxY - minY
  const centerPoint = new AcGePoint2d((minX + maxX) / 2, (minY + maxY) / 2)
  const cloudDiameter = pixelToWorldDistance(
    view,
    CLOUD_DIAMETER_PIXELS,
    centerPoint
  )
  const chordLength = Math.max(cloudDiameter, 1e-6)
  const numSegmentsX = Math.max(4, Math.ceil(width / chordLength) * 2)
  const numSegmentsY = Math.max(4, Math.ceil(height / chordLength) * 2)

  const points: AcGePoint2d[] = []
  const bulges: (number | undefined)[] = []
  let segmentIndex = 0
  const calculateBulge = (outward: boolean): number => (outward ? 0.4 : -0.4)

  for (let i = 0; i <= numSegmentsX; i++) {
    const t = i / numSegmentsX
    points.push(new AcGePoint2d(minX + width * t, minY))
    bulges.push(i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : undefined)
  }
  for (let i = 1; i <= numSegmentsY; i++) {
    const t = i / numSegmentsY
    points.push(new AcGePoint2d(maxX, minY + height * t))
    bulges.push(i < numSegmentsY ? calculateBulge(segmentIndex++ % 2 === 0) : undefined)
  }
  for (let i = 1; i <= numSegmentsX; i++) {
    const t = 1 - i / numSegmentsX
    points.push(new AcGePoint2d(minX + width * t, maxY))
    bulges.push(i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : undefined)
  }
  for (let i = 1; i < numSegmentsY; i++) {
    const t = 1 - i / numSegmentsY
    points.push(new AcGePoint2d(minX, minY + height * t))
    bulges.push(
      i < numSegmentsY - 1 ? calculateBulge(segmentIndex++ % 2 === 0) : undefined
    )
  }

  for (let i = 0; i < points.length; i++) {
    cloud.addVertexAt(i, points[i], bulges[i])
  }
  cloud.closed = true
}

/** Build a closed rectangle polyline between two opposite corners. */
export function buildMarkupRect(
  rect: AcDbPolyline,
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): void {
  rect.reset(false)
  rect.addVertexAt(0, new AcGePoint2d(first.x, first.y))
  rect.addVertexAt(1, new AcGePoint2d(second.x, first.y))
  rect.addVertexAt(2, new AcGePoint2d(second.x, second.y))
  rect.addVertexAt(3, new AcGePoint2d(first.x, second.y))
  rect.closed = true
}

function fitCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): CanvasRenderingContext2D | null {
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  return ctx
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = 12
  const left = {
    x: to.x - ux * size - uy * size * 0.45,
    y: to.y - uy * size + ux * size * 0.45
  }
  const right = {
    x: to.x - ux * size + uy * size * 0.45,
    y: to.y - uy * size - ux * size * 0.45
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(left.x, left.y)
  ctx.lineTo(right.x, right.y)
  ctx.closePath()
  ctx.fill()
}

function drawLeader(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  anchor: { x: number; y: number },
  color: string,
  withArrow = true,
  lineWidth = 2
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(anchor.x, anchor.y)
  ctx.stroke()
  if (withArrow) {
    drawArrowHead(ctx, anchor, tip, color)
  }
}

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  color: string,
  lineWidth = 1.5
): void {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.28
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.strokeRect(x, y, w, h)
}

/**
 * Attach a shape callout (leader without arrow + text bubble) to a markup group,
 * with drag grips for tip (on outline) and text bubble.
 */
function publishAttachedCallout(
  view2d: AcTrView2d,
  group: AcTrHtmlGroup,
  record: AcApMarkupRecord,
  callout: AcApMarkupAttachedCallout,
  color: ReturnType<typeof cssToMarkupColor>,
  layer: string,
  layoutId: string | undefined,
  cleanups: Array<() => void>,
  outline: AcApMarkupShapeOutline
): void {
  const container = view2d.container
  const overlay = new AcTrHtmlCanvasOverlay({
    id: `${record.id}-shape-leader`,
    container,
    layer,
    layoutId
  })
  group.addCanvas(overlay)

  const live: { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d } = {
    tip: { ...callout.tip },
    anchor: { ...callout.anchor }
  }

  const redraw = () => {
    const ctx = fitCanvas(overlay.canvas, container)
    if (!ctx) return
    drawLeader(
      ctx,
      view2d.worldToScreen(live.tip),
      view2d.worldToScreen(live.anchor),
      record.style.color,
      false,
      markupCanvasLineWidth(
        record.style.lineWeight != null && record.style.lineWeight > 0
          ? record.style.lineWeight
          : MARKUP_LINE_WEIGHT
      )
    )
  }
  redraw()
  view2d.events.viewChanged.addEventListener(redraw)
  cleanups.push(() => view2d.events.viewChanged.removeEventListener(redraw))

  const bubble = new AcTrHtmlCallout({
    id: `${record.id}-shape-bubble`,
    color,
    text: callout.text || record.text || '',
    fontSize: record.style.fontSize,
    worldPosition: live.anchor,
    layer,
    layoutId
  })
  const tipDot = new AcTrHtmlDot({
    id: `${record.id}-shape-tip`,
    color,
    worldPosition: live.tip,
    layer,
    layoutId
  })
  group.add(bubble, tipDot)

  cleanups.push(
    bindMarkupCalloutGrips({
      view: view2d,
      group,
      tipEl: tipDot,
      bubbleEl: bubble,
      state: live,
      outline,
      onDragStart: () => {
        getMarkupStore().setSelectedId(record.id)
        view2d.htmlTransientManager.selectGroup(record.id)
      },
      onLiveChange: redraw,
      onCommit: next => {
        const current = getMarkupStore().get(record.id)
        if (!current || current.geometry.type !== outline.kind) return
        const geom = current.geometry
        if (
          geom.type !== 'cloud' &&
          geom.type !== 'rect' &&
          geom.type !== 'circle'
        ) {
          return
        }
        runMarkupEdit(view2d, 'Move Callout', () => {
          getMarkupStore().updateGeometry(record.id, {
            ...geom,
            callout: {
              tip: next.tip,
              anchor: next.anchor,
              text: geom.callout?.text ?? callout.text
            }
          })
        })
      }
    })
  )
}

interface VisualExtras {
  entityIds: AcDbObjectId[]
  dispose: () => void
}

/**
 * Maps markup records to HTML / CAD transient visuals and keeps them in sync
 * with {@link getMarkupStore}.
 */
export class AcApMarkupPresenter {
  private readonly published = new Set<string>()
  private suppressingStoreRemove = false

  /** Publish every record currently in the store onto the view. */
  republishAll(view: AcEdBaseView): void {
    this.clearVisuals(view, { clearStore: false })
    for (const record of getMarkupStore().list()) {
      this.publish(view, record)
    }
  }

  /**
   * Create (or replace) the visual for one record and register it in the HTML
   * transient manager.
   */
  publish(view: AcEdBaseView, record: AcApMarkupRecord): void {
    const view2d = asView2d(view)
    const restoreSelection = getMarkupStore().selectedId === record.id
    if (this.published.has(record.id)) {
      this.unpublish(view, record.id, { keepInStore: true })
    }

    const color = cssToMarkupColor(record.style.color)
    const lineWeight =
      record.style.lineWeight != null && record.style.lineWeight > 0
        ? (record.style.lineWeight as AcGiLineWeight)
        : MARKUP_LINE_WEIGHT
    const canvasLineWidth = markupCanvasLineWidth(lineWeight)
    const layer = MARKUP_LAYER
    const layoutId = record.layoutId
    const extras: VisualExtras = { entityIds: [], dispose: () => undefined }
    const cleanups: (() => void)[] = []

    const group = new AcTrHtmlGroup({
      id: record.id,
      layer,
      layoutId,
      selectable: true
    })

    const geom = record.geometry
    switch (geom.type) {
      case 'text': {
        group.add(
          new AcTrHtmlBadge({
            id: `${record.id}-badge`,
            color,
            text: record.text || 'Note',
            fontSize: record.style.fontSize,
            worldPosition: geom.position,
            layer,
            layoutId
          })
        )
        break
      }
      case 'line':
      case 'arrow': {
        const line = new AcDbLine(
          { x: geom.start.x, y: geom.start.y, z: 0 },
          { x: geom.end.x, y: geom.end.y, z: 0 }
        )
        line.color = color
        line.lineWeight = lineWeight
        view2d.addTransientEntity(line)
        extras.entityIds.push(line.objectId)
        cleanups.push(() => view2d.removeTransientEntity(line.objectId))

        group.add(
          new AcTrHtmlDot({
            id: `${record.id}-dot1`,
            color,
            worldPosition: geom.start,
            layer,
            layoutId
          }),
          new AcTrHtmlDot({
            id: `${record.id}-dot2`,
            color,
            worldPosition: geom.end,
            layer,
            layoutId
          })
        )

        if (geom.type === 'arrow') {
          const container = view2d.container
          const overlay = new AcTrHtmlCanvasOverlay({
            id: `${record.id}-arrow`,
            container,
            layer,
            layoutId
          })
          group.addCanvas(overlay)
          const redraw = () => {
            const ctx = fitCanvas(overlay.canvas, container)
            if (!ctx) return
            const a = view2d.worldToScreen(geom.start)
            const b = view2d.worldToScreen(geom.end)
            drawArrowHead(ctx, a, b, record.style.color)
          }
          redraw()
          view2d.events.viewChanged.addEventListener(redraw)
          cleanups.push(() =>
            view2d.events.viewChanged.removeEventListener(redraw)
          )
        }
        break
      }
      case 'cloud': {
        const cloud = new AcDbPolyline()
        cloud.color = color
        cloud.lineWeight = lineWeight
        buildMarkupCloud(cloud, geom.corner1, geom.corner2, view2d)
        view2d.addTransientEntity(cloud)
        extras.entityIds.push(cloud.objectId)
        cleanups.push(() => view2d.removeTransientEntity(cloud.objectId))

        const mid = {
          x: (geom.corner1.x + geom.corner2.x) / 2,
          y: (geom.corner1.y + geom.corner2.y) / 2
        }
        group.add(
          new AcTrHtmlDot({
            id: `${record.id}-dot`,
            color,
            worldPosition: mid,
            layer,
            layoutId
          })
        )
        if (geom.callout) {
          publishAttachedCallout(
            view2d,
            group,
            record,
            geom.callout,
            color,
            layer,
            layoutId,
            cleanups,
            {
              kind: 'cloud',
              corner1: geom.corner1,
              corner2: geom.corner2
            }
          )
        }
        break
      }
      case 'rect': {
        const rect = new AcDbPolyline()
        rect.color = color
        rect.lineWeight = lineWeight
        buildMarkupRect(rect, geom.corner1, geom.corner2)
        view2d.addTransientEntity(rect)
        extras.entityIds.push(rect.objectId)
        cleanups.push(() => view2d.removeTransientEntity(rect.objectId))

        group.add(
          new AcTrHtmlDot({
            id: `${record.id}-dot`,
            color,
            worldPosition: {
              x: (geom.corner1.x + geom.corner2.x) / 2,
              y: (geom.corner1.y + geom.corner2.y) / 2
            },
            layer,
            layoutId
          })
        )
        if (geom.callout) {
          publishAttachedCallout(
            view2d,
            group,
            record,
            geom.callout,
            color,
            layer,
            layoutId,
            cleanups,
            {
              kind: 'rect',
              corner1: geom.corner1,
              corner2: geom.corner2
            }
          )
        }
        break
      }
      case 'circle': {
        const circle = new AcDbCircle(
          { x: geom.center.x, y: geom.center.y, z: 0 },
          geom.radius
        )
        circle.color = color
        circle.lineWeight = lineWeight
        view2d.addTransientEntity(circle)
        extras.entityIds.push(circle.objectId)
        cleanups.push(() => view2d.removeTransientEntity(circle.objectId))

        group.add(
          new AcTrHtmlDot({
            id: `${record.id}-dot`,
            color,
            worldPosition: geom.center,
            layer,
            layoutId
          })
        )
        if (geom.callout) {
          publishAttachedCallout(
            view2d,
            group,
            record,
            geom.callout,
            color,
            layer,
            layoutId,
            cleanups,
            {
              kind: 'circle',
              center: geom.center,
              radius: geom.radius
            }
          )
        }
        break
      }
      case 'highlight': {
        const container = view2d.container
        const overlay = new AcTrHtmlCanvasOverlay({
          id: `${record.id}-hl`,
          container,
          layer,
          layoutId
        })
        group.addCanvas(overlay)
        const redraw = () => {
          const ctx = fitCanvas(overlay.canvas, container)
          if (!ctx) return
          drawHighlight(
            ctx,
            view2d.worldToScreen(geom.corner1),
            view2d.worldToScreen(geom.corner2),
            record.style.color,
            canvasLineWidth
          )
        }
        redraw()
        view2d.events.viewChanged.addEventListener(redraw)
        cleanups.push(() =>
          view2d.events.viewChanged.removeEventListener(redraw)
        )
        // Invisible hit target at center for selection
        group.add(
          new AcTrHtmlDot({
            id: `${record.id}-dot`,
            color,
            worldPosition: {
              x: (geom.corner1.x + geom.corner2.x) / 2,
              y: (geom.corner1.y + geom.corner2.y) / 2
            },
            layer,
            layoutId
          })
        )
        break
      }
      case 'callout': {
        const container = view2d.container
        const overlay = new AcTrHtmlCanvasOverlay({
          id: `${record.id}-leader`,
          container,
          layer,
          layoutId
        })
        group.addCanvas(overlay)
        const live: { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d } = {
          tip: { ...geom.tip },
          anchor: { ...geom.anchor }
        }
        const redraw = () => {
          const ctx = fitCanvas(overlay.canvas, container)
          if (!ctx) return
          drawLeader(
            ctx,
            view2d.worldToScreen(live.tip),
            view2d.worldToScreen(live.anchor),
            record.style.color,
            true,
            canvasLineWidth
          )
        }
        redraw()
        view2d.events.viewChanged.addEventListener(redraw)
        cleanups.push(() =>
          view2d.events.viewChanged.removeEventListener(redraw)
        )

        const bubble = new AcTrHtmlCallout({
          id: `${record.id}-bubble`,
          color,
          text: record.text || record.comment || 'Callout',
          fontSize: record.style.fontSize,
          worldPosition: live.anchor,
          layer,
          layoutId
        })
        const tipDot = new AcTrHtmlDot({
          id: `${record.id}-tip`,
          color,
          worldPosition: live.tip,
          layer,
          layoutId
        })
        group.add(bubble, tipDot)

        cleanups.push(
          bindMarkupCalloutGrips({
            view: view2d,
            group,
            tipEl: tipDot,
            bubbleEl: bubble,
            state: live,
            onDragStart: () => {
              getMarkupStore().setSelectedId(record.id)
              view2d.htmlTransientManager.selectGroup(record.id)
            },
            onLiveChange: redraw,
            onCommit: next => {
              runMarkupEdit(view2d, 'Move Callout', () => {
                getMarkupStore().updateGeometry(record.id, {
                  type: 'callout',
                  tip: next.tip,
                  anchor: next.anchor
                })
              })
            }
          })
        )
        break
      }
      case 'stamp':
      case 'symbol': {
        const stampId =
          geom.type === 'stamp' ? geom.stampId : geom.symbolId
        const imageUrl = geom.imageUrl
        group.add(
          new AcTrHtmlStamp({
            id: `${record.id}-stamp`,
            color,
            stampId,
            text: record.text,
            imageUrl,
            worldPosition: geom.position,
            layer,
            layoutId
          })
        )
        break
      }
    }

    extras.dispose = () => {
      for (const fn of cleanups) {
        try {
          fn()
        } catch {
          // ignore
        }
      }
    }

    const store = getMarkupStore()
    const prevSelectedChanged = group.onSelectedChanged
    group.onSelectedChanged = (selected, g) => {
      prevSelectedChanged?.(selected, g)
      if (selected) {
        store.setSelectedId(g.id)
        if (extras.entityIds.length > 0) view2d.highlight(extras.entityIds)
      } else {
        if (store.selectedId === g.id) store.setSelectedId(undefined)
        if (extras.entityIds.length > 0) view2d.unhighlight(extras.entityIds)
      }
    }

    const prevVisibleChanged = group.onVisibleChanged
    group.onVisibleChanged = (visible, g) => {
      prevVisibleChanged?.(visible, g)
      for (const objectId of extras.entityIds) {
        view2d.setTransientEntityVisible(objectId, visible)
      }
    }

    const prevDispose = group.onDispose
    group.onDispose = () => {
      prevDispose?.()
      if (extras.entityIds.length > 0) view2d.unhighlight(extras.entityIds)
      extras.dispose()
      this.published.delete(record.id)
      if (!this.suppressingStoreRemove) {
        store.removeRecord(record.id)
      }
    }

    view2d.htmlTransientManager.add(group)
    view2d.isDirty = true
    this.published.add(record.id)

    // Preserve selection across republish (style / label / geometry edits).
    // Removing the previous group clears selection; restore it on the new one.
    if (restoreSelection) {
      getMarkupStore().setSelectedId(record.id)
      view2d.htmlTransientManager.selectGroup(record.id)
    }
  }

  /**
   * Remove one markup visual. By default also removes the store record.
   */
  unpublish(
    view: AcEdBaseView,
    id: string,
    options?: { keepInStore?: boolean }
  ): void {
    const keepInStore = options?.keepInStore === true
    const apply = () => this.unpublishInternal(view, id, keepInStore)
    if (!keepInStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Delete Markup', apply)
      return
    }
    apply()
  }

  private unpublishInternal(
    view: AcEdBaseView,
    id: string,
    keepInStore: boolean
  ): void {
    const view2d = asView2d(view)
    this.suppressingStoreRemove = keepInStore
    try {
      if (view2d.htmlTransientManager.has(id)) {
        view2d.htmlTransientManager.remove(id)
      } else {
        this.published.delete(id)
        if (!keepInStore) getMarkupStore().removeRecord(id)
      }
    } finally {
      this.suppressingStoreRemove = false
    }
    view2d.isDirty = true
  }

  /** Clear all markup visuals (and optionally store records). */
  clearVisuals(view: AcEdBaseView, options?: { clearStore?: boolean }): void {
    const shouldClearStore = options?.clearStore !== false
    const apply = () => this.clearVisualsInternal(view, shouldClearStore)
    if (shouldClearStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Clear Markups', apply)
      return
    }
    apply()
  }

  /**
   * Clear markup visuals (and optionally store records) for one layout only.
   */
  clearLayout(
    view: AcEdBaseView,
    layoutId: string,
    options?: { clearStore?: boolean }
  ): void {
    const shouldClearStore = options?.clearStore !== false
    const apply = () => {
      const ids = getMarkupStore()
        .list()
        .filter(record => record.layoutId === layoutId)
        .map(record => record.id)
      for (const id of ids) {
        this.unpublish(view, id, { keepInStore: !shouldClearStore })
      }
      asView2d(view).isDirty = true
    }
    if (shouldClearStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Clear Markups', apply)
      return
    }
    apply()
  }

  private clearVisualsInternal(
    view: AcEdBaseView,
    shouldClearStore: boolean
  ): void {
    const view2d = asView2d(view)
    this.suppressingStoreRemove = true
    try {
      view2d.htmlTransientManager.deselectAll()
      view2d.htmlTransientManager.clear(MARKUP_LAYER)
      view2d.htmlTransientManager.clear(MARKUP_LIVE_LAYER)
      this.published.clear()
    } finally {
      this.suppressingStoreRemove = false
    }
    if (shouldClearStore) {
      getMarkupStore().clear({ markDirty: true })
    }
    view2d.isDirty = true
  }

  /** Drop published-id tracking after the view/scene was discarded. */
  forgetPublished(): void {
    this.published.clear()
  }

  /** Select the HTML group for a markup id. */
  select(view: AcEdBaseView, id: string): void {
    asView2d(view).htmlTransientManager.selectGroup(id)
    getMarkupStore().setSelectedId(id)
  }

  /** Zoom roughly to a markup's primary world point. */
  focus(view: AcEdBaseView, record: AcApMarkupRecord): void {
    const p = primaryPoint(record)
    if (!p) return
    const view2d = asView2d(view)
    const pad = 50
    const box = new AcGeBox2d()
      .expandByPoint({ x: p.x - pad, y: p.y - pad })
      .expandByPoint({ x: p.x + pad, y: p.y + pad })
    view2d.zoomTo(box, 1.5)
    this.select(view, record.id)
  }
}

function primaryPoint(
  record: AcApMarkupRecord
): AcGePoint3dLike | undefined {
  const g = record.geometry
  switch (g.type) {
    case 'text':
    case 'stamp':
    case 'symbol':
      return { x: g.position.x, y: g.position.y, z: 0 }
    case 'line':
    case 'arrow':
      return {
        x: (g.start.x + g.end.x) / 2,
        y: (g.start.y + g.end.y) / 2,
        z: 0
      }
    case 'cloud':
    case 'rect':
    case 'highlight':
      return {
        x: (g.corner1.x + g.corner2.x) / 2,
        y: (g.corner1.y + g.corner2.y) / 2,
        z: 0
      }
    case 'circle':
      return { x: g.center.x, y: g.center.y, z: 0 }
    case 'callout':
      return { x: g.anchor.x, y: g.anchor.y, z: 0 }
    default:
      return undefined
  }
}

let sharedPresenter: AcApMarkupPresenter | undefined

/** Shared presenter for the active viewer session. */
export function getMarkupPresenter(): AcApMarkupPresenter {
  if (!sharedPresenter) sharedPresenter = new AcApMarkupPresenter()
  return sharedPresenter
}

/**
 * Reset markup store, visuals tracking, and undo history for a new drawing.
 * Call before {@link AcTrView2d.clear} so overlay dispose does not look like
 * user deletes and leftover undo cannot republish the previous drawing.
 */
export function resetMarkupSession(): void {
  getMarkupHistory().clear()
  getSessionUndo().clear()
  getMarkupStore().reset()
  getMarkupPresenter().forgetPublished()
  acapNotifyUndoStackChanged()
}

/**
 * Upsert a record into the store and publish its visual (undoable).
 */
export function commitMarkup(
  view: AcEdBaseView,
  record: AcApMarkupRecord
): void {
  runMarkupEdit(view, 'Create Markup', () => {
    getMarkupStore().upsert(record)
    getMarkupPresenter().publish(view, record)
  })
}
