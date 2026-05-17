import * as THREE from 'three'

import { AcExHtmlI18n, detectAcExHtmlLocale } from './AcExHtmlI18n'
import { acExHtmlIcons } from './AcExHtmlIcons'
import { computeLayerExtentsMap } from './AcExLayerExtents'
import { decodeSnapshot } from './AcExSnapshotCodec'
import type { AcExExtents, AcExSnapshotV1 } from './AcExSnapshotTypes'

/** Orthographic pan/zoom state for the offline viewer (WCS, XY plane). */
interface ViewState {
  /** World X coordinate at the center of the viewport. */
  centerX: number
  /** World Y coordinate at the center of the viewport. */
  centerY: number
  /** Pixels per drawing unit (larger = more zoomed in). */
  scale: number
}

function hideLoading(): void {
  const loading = document.getElementById('mlcad-loading')
  if (!loading) return
  loading.classList.add('mlcad-loading--done')
  loading.addEventListener('transitionend', () => loading.remove(), {
    once: true
  })
}

function bootstrap(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => startViewer())
  })
}

function startViewer(): void {
  const root = document.getElementById('mlcad-root')
  const statusEl = document.getElementById('mlcad-status-bar')
  const measureLabel = document.getElementById('mlcad-measure-label')
  const snapshotEl = document.getElementById('mlcad-snapshot')
  if (!root || !statusEl || !measureLabel || !snapshotEl) {
    hideLoading()
    return
  }

  const payload = snapshotEl.textContent?.trim() ?? ''
  let snapshot: AcExSnapshotV1
  try {
    snapshot = decodeSnapshot(payload)
  } catch (error) {
    const i18n = new AcExHtmlI18n(detectAcExHtmlLocale())
    i18n.applyToDocument()
    statusEl.textContent = i18n.t('status.loadFailed', { error: String(error) })
    hideLoading()
    return
  }

  const i18n = new AcExHtmlI18n(detectAcExHtmlLocale(snapshot.meta.locale))
  i18n.applyToDocument()

  const layout =
    snapshot.layouts.find(l => l.btrId === snapshot.activeLayoutBtrId) ??
    snapshot.layouts[0]
  if (!layout) {
    statusEl.textContent = i18n.t('status.noLayout')
    hideLoading()
    return
  }

  const layerVisible = new Map(
    snapshot.layers.map(layer => [layer.name, layer.visible])
  )

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  root.insertBefore(renderer.domElement, root.firstChild)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(snapshot.meta.background)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000)

  const layerGroups = new Map<string, THREE.Group>()

  const getLayerGroup = (layerName: string): THREE.Group => {
    let group = layerGroups.get(layerName)
    if (!group) {
      group = new THREE.Group()
      group.name = layerName
      group.visible = layerVisible.get(layerName) !== false
      layerGroups.set(layerName, group)
      scene.add(group)
    }
    return group
  }

  for (const batch of layout.lineBatches) {
    const object = createLineObject(batch)
    if (object) getLayerGroup(batch.layer).add(object)
  }
  for (const batch of layout.meshBatches) {
    const object = createMeshObject(batch)
    if (object) getLayerGroup(batch.layer).add(object)
  }

  const layerExtents = computeLayerExtentsMap(
    layout.lineBatches,
    layout.meshBatches
  )

  const view: ViewState = {
    centerX: (snapshot.meta.extents.minX + snapshot.meta.extents.maxX) / 2,
    centerY: (snapshot.meta.extents.minY + snapshot.meta.extents.maxY) / 2,
    scale: 1
  }

  const resize = () => {
    const width = root.clientWidth || window.innerWidth
    const height = root.clientHeight || window.innerHeight
    renderer.setSize(width, height)
    updateCamera(width, height)
  }

  const updateCamera = (width: number, height: number) => {
    const halfW = width / (2 * view.scale)
    const halfH = height / (2 * view.scale)
    camera.left = view.centerX - halfW
    camera.right = view.centerX + halfW
    camera.bottom = view.centerY - halfH
    camera.top = view.centerY + halfH
    camera.updateProjectionMatrix()
  }

  const zoomToExtents = (extents: AcExExtents) => {
    const width = root.clientWidth || window.innerWidth
    const height = root.clientHeight || window.innerHeight
    const spanX = Math.max(extents.maxX - extents.minX, 1e-9)
    const spanY = Math.max(extents.maxY - extents.minY, 1e-9)
    view.centerX = (extents.minX + extents.maxX) / 2
    view.centerY = (extents.minY + extents.maxY) / 2
    view.scale = Math.min(width / spanX, height / spanY) * 0.9
    updateCamera(width, height)
    render()
  }

  const fit = () => {
    zoomToExtents(snapshot.meta.extents)
  }

  const render = () => {
    renderer.render(scene, camera)
  }

  let readyStatus = snapshot.meta.title ?? i18n.t('status.ready')

  const layerPanel = setupLayerPanel({
    snapshot,
    layerVisible,
    layerGroups,
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents
  })

  i18n.setOnChange(() => {
    readyStatus = snapshot.meta.title ?? i18n.t('status.ready')
    if (!measureMode) {
      statusEl.textContent = readyStatus
    }
    layerPanel?.refreshLayerLabels()
  })

  document
    .getElementById('mlcad-lang-btn')
    ?.addEventListener('click', event => {
      event.stopPropagation()
      i18n.toggleLocale()
    })

  let isPanning = false
  let lastX = 0
  let lastY = 0
  let measureMode = false
  let measurePoints: THREE.Vector2[] = []

  const screenToWcs = (clientX: number, clientY: number): THREE.Vector2 => {
    const rect = renderer.domElement.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
    const wcsX = view.centerX + (ndcX * (camera.right - camera.left)) / 2
    const wcsY = view.centerY + (ndcY * (camera.top - camera.bottom)) / 2
    return new THREE.Vector2(wcsX, wcsY)
  }

  const formatLength = (value: number): string => {
    const prec = snapshot.meta.units.luprec
    return `${value.toFixed(prec)}`
  }

  const onPointerDown = (event: PointerEvent) => {
    if (measureMode) {
      const pt = screenToWcs(event.clientX, event.clientY)
      measurePoints.push(pt)
      if (measurePoints.length === 2) {
        const [a, b] = measurePoints
        const dist = a.distanceTo(b)
        statusEl.textContent = i18n.t('status.distance', {
          value: formatLength(dist)
        })
        measurePoints = []
        measureMode = false
        document
          .querySelector('#mlcad-toolbar [data-action="measure"]')
          ?.classList.remove('active')
      }
      render()
      return
    }
    isPanning = true
    lastX = event.clientX
    lastY = event.clientY
    renderer.domElement.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isPanning) return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    view.centerX -= dx / view.scale
    view.centerY += dy / view.scale
    updateCamera(root.clientWidth, root.clientHeight)
    render()
  }

  const onPointerUp = (event: PointerEvent) => {
    isPanning = false
    renderer.domElement.releasePointerCapture(event.pointerId)
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const factor = event.deltaY > 0 ? 0.9 : 1.1
    view.scale = Math.max(0.0001, view.scale * factor)
    updateCamera(root.clientWidth, root.clientHeight)
    render()
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

  document
    .querySelectorAll('#mlcad-toolbar button[data-action]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action')
        if (action === 'fit') {
          fit()
        } else if (action === 'measure') {
          measureMode = !measureMode
          measurePoints = []
          button.classList.toggle('active', measureMode)
          statusEl.textContent = measureMode
            ? i18n.t('status.measureHint')
            : readyStatus
        }
      })
    })

  window.addEventListener('resize', () => {
    resize()
    render()
  })

  resize()
  fit()
  statusEl.textContent = readyStatus
  hideLoading()
}

/** DOM handles for one layer row in the drawer (used when locale changes). */
interface LayerRowRefs {
  /** Layer name shown in the row. */
  name: string
  /** Per-layer zoom button whose `title` / `aria-label` are retranslated. */
  zoomBtn: HTMLButtonElement
}

/** Dependencies passed into {@link setupLayerPanel}. */
interface LayerPanelContext {
  /** Full snapshot (layer table and metadata). */
  snapshot: AcExSnapshotV1
  /** Mutable visibility map shared with the THREE layer groups. */
  layerVisible: Map<string, boolean>
  /** THREE groups keyed by layer name. */
  layerGroups: Map<string, THREE.Group>
  /** Precomputed XY extents per layer for zoom-to-layer. */
  layerExtents: Map<string, AcExExtents | null>
  /** Footer status bar element. */
  statusEl: HTMLElement
  /** I18n instance for drawer strings. */
  i18n: AcExHtmlI18n
  /** Redraws the WebGL canvas after visibility changes. */
  render: () => void
  /** Fits the camera to the given extents and redraws. */
  zoomToExtents: (extents: AcExExtents) => void
}

/** Handles returned by {@link setupLayerPanel} for locale-driven UI updates. */
interface LayerPanelController {
  /** Reapplies `layers.zoomTo` labels on every per-layer zoom button. */
  refreshLayerLabels: () => void
}

function setupLayerPanel(ctx: LayerPanelContext): LayerPanelController | null {
  const {
    snapshot,
    layerVisible,
    layerGroups,
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents
  } = ctx

  const layersBtn = document.getElementById('mlcad-layers-btn')
  const layerDrawer = document.getElementById('mlcad-layer-drawer')
  const layerList = document.getElementById('mlcad-layer-list')
  const layerClose = document.getElementById('mlcad-layer-close')
  const showAllBtn = document.getElementById('mlcad-layer-show-all')
  const hideAllBtn = document.getElementById('mlcad-layer-hide-all')
  if (!layersBtn || !layerDrawer || !layerList) return null

  const layerRows: LayerRowRefs[] = []

  const layerNames = new Set(snapshot.layers.map(layer => layer.name))
  for (const name of layerGroups.keys()) {
    layerNames.add(name)
  }

  const sortedLayers = [...layerNames].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  const layerMeta = new Map(snapshot.layers.map(layer => [layer.name, layer]))

  const checkboxes: HTMLInputElement[] = []

  const setLayerVisible = (name: string, visible: boolean) => {
    layerVisible.set(name, visible)
    const group = layerGroups.get(name)
    if (group) group.visible = visible
  }

  const setAllLayersVisible = (visible: boolean) => {
    for (const name of sortedLayers) {
      setLayerVisible(name, visible)
    }
    for (const checkbox of checkboxes) {
      checkbox.checked = visible
    }
    render()
  }

  for (const name of sortedLayers) {
    const meta = layerMeta.get(name)
    const row = document.createElement('label')
    row.className = 'mlcad-layer-item'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = layerVisible.get(name) !== false
    checkbox.addEventListener('change', () => {
      setLayerVisible(name, checkbox.checked)
      render()
    })
    checkboxes.push(checkbox)

    const swatch = document.createElement('span')
    swatch.className = 'mlcad-layer-swatch'
    const color = meta?.color ?? 0xffffff
    swatch.style.background = `#${color.toString(16).padStart(6, '0')}`

    const nameEl = document.createElement('span')
    nameEl.className = 'mlcad-layer-name'
    nameEl.textContent = name
    nameEl.title = name

    const zoomBtn = document.createElement('button')
    zoomBtn.type = 'button'
    zoomBtn.className = 'mlcad-layer-zoom'
    const updateZoomLabels = () => {
      const label = i18n.t('layers.zoomTo', { name })
      zoomBtn.title = label
      zoomBtn.setAttribute('aria-label', label)
    }
    updateZoomLabels()
    zoomBtn.innerHTML = acExHtmlIcons.zoomBox
    const extents = layerExtents.get(name)
    if (!extents) {
      zoomBtn.disabled = true
    } else {
      zoomBtn.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        zoomToExtents(extents)
        statusEl.textContent = i18n.t('status.zoomLayer', { name })
      })
    }
    layerRows.push({ name, zoomBtn })

    row.append(checkbox, swatch, nameEl, zoomBtn)
    layerList.appendChild(row)
  }

  const setDrawerOpen = (open: boolean) => {
    layerDrawer.hidden = !open
    layersBtn.classList.toggle('active', open)
    layersBtn.setAttribute('aria-expanded', String(open))
  }

  layersBtn.addEventListener('click', event => {
    event.stopPropagation()
    setDrawerOpen(layerDrawer.hidden)
  })

  layerClose?.addEventListener('click', () => setDrawerOpen(false))

  showAllBtn?.addEventListener('click', () => setAllLayersVisible(true))
  hideAllBtn?.addEventListener('click', () => setAllLayersVisible(false))

  document.addEventListener('click', event => {
    if (layerDrawer.hidden) return
    const target = event.target
    if (!(target instanceof Node)) return
    const sidebar = document.getElementById('mlcad-sidebar')
    if (sidebar?.contains(target)) return
    setDrawerOpen(false)
  })

  return {
    refreshLayerLabels: () => {
      for (const row of layerRows) {
        const label = i18n.t('layers.zoomTo', { name: row.name })
        row.zoomBtn.title = label
        row.zoomBtn.setAttribute('aria-label', label)
      }
    }
  }
}

function createLineObject(batch: {
  color: number
  offset: [number, number, number]
  positions: number[]
  indices?: number[]
}): THREE.LineSegments | null {
  if (batch.positions.length < 6) return null
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(batch.positions.length)
  const [ox, oy, oz] = batch.offset
  for (let i = 0; i < batch.positions.length; i += 3) {
    positions[i] = batch.positions[i]! + ox
    positions[i + 1] = batch.positions[i + 1]! + oy
    positions[i + 2] = (batch.positions[i + 2] ?? 0) + oz
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (batch.indices && batch.indices.length > 0) {
    geometry.setIndex(batch.indices)
  }
  const material = new THREE.LineBasicMaterial({ color: batch.color })
  return new THREE.LineSegments(geometry, material)
}

function createMeshObject(batch: {
  color: number
  offset: [number, number, number]
  positions: number[]
  indices?: number[]
}): THREE.Mesh | null {
  if (
    batch.positions.length < 9 &&
    (!batch.indices || batch.indices.length < 3)
  ) {
    return null
  }
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(batch.positions.length)
  const [ox, oy, oz] = batch.offset
  for (let i = 0; i < batch.positions.length; i += 3) {
    positions[i] = batch.positions[i]! + ox
    positions[i + 1] = batch.positions[i + 1]! + oy
    positions[i + 2] = (batch.positions[i + 2] ?? 0) + oz
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (batch.indices && batch.indices.length > 0) {
    geometry.setIndex(batch.indices)
  } else if (positions.length >= 9) {
    geometry.setIndex([0, 1, 2])
  }
  const material = new THREE.MeshBasicMaterial({
    color: batch.color,
    side: THREE.DoubleSide
  })
  return new THREE.Mesh(geometry, material)
}

bootstrap()
