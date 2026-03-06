import {
  AcApDocManager,
  eventBus,
  MeasurementRecord
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted } from 'vue'

// ─── Local DOM helpers ────────────────────────────────────────────────────────
// These were removed from cad-simple-viewer to comply with the project rule:
// "avoid putting any UI logic in package cad-simple-viewer".

function makeDot(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText =
    'position:fixed;width:12px;height:12px;border-radius:50%;' +
    'background:#60a5fa;border:2px solid white;box-sizing:border-box;' +
    'pointer-events:none;transform:translate(-50%,-50%);z-index:99999;'
  return el
}

function makeBadge(text = ''): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = text
  el.style.cssText =
    'position:fixed;background:rgba(255,255,255,0.95);color:#1e40af;' +
    'font-size:13px;font-family:sans-serif;font-weight:500;' +
    'padding:3px 14px;border-radius:20px;pointer-events:none;' +
    'transform:translate(-50%,-50%);white-space:nowrap;' +
    'box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:99999;'
  return el
}

function placeAt(el: HTMLElement, sx: number, sy: number, rect: DOMRect): void {
  el.style.left = `${sx + rect.left}px`
  el.style.top = `${sy + rect.top}px`
}

// ─── Arc canvas helper ────────────────────────────────────────────────────────

function drawArcOnCanvas(
  canvas: HTMLCanvasElement,
  g: { cx: number; cy: number; r: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): void {
  const view = AcApDocManager.instance.curView
  if (!view) return

  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  canvas.style.left = `${rect.left}px`
  canvas.style.top = `${rect.top}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)

  const sc = view.worldToScreen({ x: g.cx, y: g.cy })
  const ss = view.worldToScreen(p1)
  const se = view.worldToScreen(p2)
  const screenR = Math.hypot(ss.x - sc.x, ss.y - sc.y)

  const sa = Math.atan2(ss.y - sc.y, ss.x - sc.x)
  const ea = Math.atan2(se.y - sc.y, se.x - sc.x)

  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const cwSpan = norm(ea - sa)
  const antiClockwise = cwSpan > Math.PI

  ctx.beginPath()
  ctx.arc(sc.x, sc.y, screenR, sa, ea, antiClockwise)
  ctx.strokeStyle = '#60a5fa'
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.restore()
}

// ─── Area canvas helper ───────────────────────────────────────────────────────

function drawAreaOnCanvas(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[]
): void {
  const view = AcApDocManager.instance.curView
  if (!view) return

  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  canvas.style.left = `${rect.left}px`
  canvas.style.top = `${rect.top}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx || points.length < 3) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)

  const spts = points.map(p => view.worldToScreen(p))

  ctx.beginPath()
  ctx.moveTo(spts[0].x, spts[0].y)
  for (let i = 1; i < spts.length; i++) ctx.lineTo(spts[i].x, spts[i].y)
  ctx.closePath()
  ctx.fillStyle = 'rgba(96, 165, 250, 0.2)'
  ctx.fill()
  ctx.strokeStyle = '#60a5fa'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.restore()
}

// ─── Overlay renderers ────────────────────────────────────────────────────────

type Cleanup = () => void

function renderDistance(record: Extract<MeasurementRecord, { type: 'distance' }>): Cleanup {
  const view = AcApDocManager.instance.curView
  const { p1, p2, dist } = record

  const dot1 = makeDot()
  const dot2 = makeDot()
  const badge = makeBadge(`~ ${dist.toFixed(3)} m`)
  document.body.append(dot1, dot2, badge)

  const reposition = () => {
    const rect = view.canvas.getBoundingClientRect()
    const s1 = view.worldToScreen(p1)
    const s2 = view.worldToScreen(p2)
    placeAt(dot1, s1.x, s1.y, rect)
    placeAt(dot2, s2.x, s2.y, rect)
    placeAt(badge, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2, rect)
  }

  reposition()
  view.events.viewChanged.addEventListener(reposition)

  return () => {
    dot1.remove()
    dot2.remove()
    badge.remove()
    view.events.viewChanged.removeEventListener(reposition)
  }
}

function renderArea(record: Extract<MeasurementRecord, { type: 'area' }>): Cleanup {
  const view = AcApDocManager.instance.curView
  const { points, area } = record

  const fillCanvas = document.createElement('canvas')
  fillCanvas.style.cssText = 'position:fixed;pointer-events:none;z-index:99997;'
  document.body.appendChild(fillCanvas)

  const badge = makeBadge(`~ ${area.toFixed(3)} m²`)
  document.body.appendChild(badge)

  const dots = points.map(() => {
    const d = makeDot()
    document.body.appendChild(d)
    return d
  })

  const mid = {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length
  }

  const reposition = () => {
    drawAreaOnCanvas(fillCanvas, points)
    const rect = view.canvas.getBoundingClientRect()
    const sc = view.worldToScreen(mid)
    placeAt(badge, sc.x, sc.y, rect)
    points.forEach((p, i) => {
      const sp = view.worldToScreen(p)
      placeAt(dots[i], sp.x, sp.y, rect)
    })
  }

  reposition()
  view.events.viewChanged.addEventListener(reposition)

  return () => {
    fillCanvas.remove()
    badge.remove()
    dots.forEach(d => d.remove())
    view.events.viewChanged.removeEventListener(reposition)
  }
}

function renderArc(record: Extract<MeasurementRecord, { type: 'arc' }>): Cleanup {
  const view = AcApDocManager.instance.curView
  const { geom, start, end, arcLen, mid } = record

  const arcCanvas = document.createElement('canvas')
  arcCanvas.style.cssText = 'position:fixed;pointer-events:none;z-index:99997;'
  document.body.appendChild(arcCanvas)

  const dot1 = makeDot()
  const dot2 = makeDot()
  const badge = makeBadge(`~ ${arcLen.toFixed(4)} m`)
  document.body.append(dot1, dot2, badge)

  const reposition = () => {
    drawArcOnCanvas(arcCanvas, geom, start, end)
    const rect = view.canvas.getBoundingClientRect()
    const sp1 = view.worldToScreen(start)
    const sp2 = view.worldToScreen(end)
    const sm = view.worldToScreen(mid)
    placeAt(dot1, sp1.x, sp1.y, rect)
    placeAt(dot2, sp2.x, sp2.y, rect)
    placeAt(badge, sm.x, sm.y, rect)
  }

  reposition()
  view.events.viewChanged.addEventListener(reposition)

  return () => {
    arcCanvas.remove()
    dot1.remove()
    dot2.remove()
    badge.remove()
    view.events.viewChanged.removeEventListener(reposition)
  }
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * Composable that manages persistent DOM overlays for measurement tools.
 *
 * Listens to `measurement-added` and `measurements-cleared` events emitted by
 * the measurement commands in `cad-simple-viewer`. All DOM creation lives here,
 * keeping `cad-simple-viewer` free of UI logic as required by the project architecture.
 *
 * Call once from `MlCadViewer.vue`.
 */
export function useMeasurements() {
  const cleanups: Cleanup[] = []

  const onAdded = (record: MeasurementRecord) => {
    let cleanup: Cleanup
    if (record.type === 'distance') {
      cleanup = renderDistance(record)
    } else if (record.type === 'area') {
      cleanup = renderArea(record)
    } else {
      cleanup = renderArc(record)
    }
    cleanups.push(cleanup)
  }

  const onCleared = () => {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
  }

  onMounted(() => {
    eventBus.on('measurement-added', onAdded)
    eventBus.on('measurements-cleared', onCleared)
  })

  onUnmounted(() => {
    eventBus.off('measurement-added', onAdded)
    eventBus.off('measurements-cleared', onCleared)
    onCleared()
  })
}
