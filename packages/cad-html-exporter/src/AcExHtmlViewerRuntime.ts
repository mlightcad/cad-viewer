import { FLOAT_TOL } from '@mlightcad/data-model'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { AcExHtmlI18n, detectAcExHtmlLocale } from './AcExHtmlI18n'
import { acExHtmlIcons } from './AcExHtmlIcons'
import { computeLayerExtentsMap } from './AcExLayerExtents'
import { AcExMeasureController, type AcExMeasureMode } from './AcExMeasurement'
import { AcExOsnapIndex } from './AcExOsnap'
import { AcExOsnapMarker } from './AcExOsnapMarker'
import { decodeSnapshot } from './AcExSnapshotCodec'
import type { AcExExtents, AcExSnapshotV1 } from './AcExSnapshotTypes'

/** Matches {@link AcTrBaseView} orthographic half-height in world units. */
const ACEX_CAMERA_FRUSTUM = 400
const ACEX_CAMERA_DISTANCE = 500

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
  const snapshotEl = document.getElementById('mlcad-snapshot')
  if (!root || !statusEl || !snapshotEl) {
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

  const getCanvasSize = () => ({
    width: root.clientWidth || window.innerWidth,
    height: root.clientHeight || window.innerHeight
  })

  const { width: initialWidth, height: initialHeight } = getCanvasSize()
  const camera = new THREE.OrthographicCamera(
    -initialWidth / 2,
    initialWidth / 2,
    initialHeight / 2,
    -initialHeight / 2,
    0.1,
    1000
  )
  camera.position.set(0, 0, ACEX_CAMERA_DISTANCE)
  camera.up.set(0, 1, 0)
  camera.updateProjectionMatrix()

  const controls = createOrbitControls(camera, renderer.domElement)

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

  const osnapIndex = new AcExOsnapIndex()
  const osnapMarker = new AcExOsnapMarker(root)
  const isLayerVisible = (name: string) => layerVisible.get(name) !== false
  const rebuildOsnapIndex = () => {
    osnapIndex.rebuild(layout, isLayerVisible)
  }
  rebuildOsnapIndex()

  const updateCameraFrustum = (width?: number, height?: number) => {
    const size = getCanvasSize()
    const w = width ?? size.width
    const h = height ?? size.height
    const aspect = w / h
    camera.left = -aspect * ACEX_CAMERA_FRUSTUM
    camera.right = aspect * ACEX_CAMERA_FRUSTUM
    camera.top = ACEX_CAMERA_FRUSTUM
    camera.bottom = -ACEX_CAMERA_FRUSTUM
    camera.updateProjectionMatrix()
    controls.update()
  }

  const flyTo = (centerX: number, centerY: number, zoom?: number) => {
    const target = new THREE.Vector3(centerX, centerY, 0)
    camera.position.set(centerX, centerY, ACEX_CAMERA_DISTANCE)
    camera.lookAt(target)
    camera.setRotationFromEuler(new THREE.Euler(0, 0, 0))
    controls.target.copy(target)
    if (zoom != null) camera.zoom = zoom
    camera.updateProjectionMatrix()
    controls.update()
  }

  const resize = () => {
    const { width, height } = getCanvasSize()
    renderer.setSize(width, height)
    updateCameraFrustum(width, height)
  }

  const zoomToExtents = (extents: AcExExtents) => {
    const { width, height } = getCanvasSize()
    const spanX = Math.max(extents.maxX - extents.minX, FLOAT_TOL)
    const spanY = Math.max(extents.maxY - extents.minY, FLOAT_TOL)
    const centerX = (extents.minX + extents.maxX) / 2
    const centerY = (extents.minY + extents.maxY) / 2
    const zoom = Math.min(width / spanX, height / spanY) * 0.9
    flyTo(centerX, centerY, zoom)
    render()
  }

  const fit = () => {
    zoomToExtents(snapshot.meta.extents)
  }

  let readyStatus = snapshot.meta.title ?? i18n.t('status.ready')

  const screenToWcs = (clientX: number, clientY: number): THREE.Vector2 => {
    const rect = renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
      0
    )
    const wcs = ndc.unproject(camera)
    return new THREE.Vector2(wcs.x, wcs.y)
  }

  const wcsToScreen = (wcs: THREE.Vector2): { x: number; y: number } => {
    const rect = renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector3(wcs.x, wcs.y, 0).project(camera)
    return {
      x: rect.left + ((ndc.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - ndc.y) / 2) * rect.height
    }
  }

  const formatLength = (value: number): string => {
    const prec = snapshot.meta.units.luprec
    return `${value.toFixed(prec)}`
  }

  const formatAngle = (valueDeg: number): string => {
    const prec = snapshot.meta.units.auprec
    return `${valueDeg.toFixed(prec)}°`
  }

  const osnapHitRadiusPx = 20
  const osnapThresholdWcs = () => {
    const a = screenToWcs(0, 0)
    const b = screenToWcs(osnapHitRadiusPx, 0)
    return Math.abs(b.x - a.x)
  }

  const resolveMeasurePoint = (clientX: number, clientY: number) => {
    const raw = screenToWcs(clientX, clientY)
    const snap = osnapIndex.findSnap(raw.x, raw.y, osnapThresholdWcs())
    const point = snap ? new THREE.Vector2(snap.x, snap.y) : raw
    return { point, snap: snap ?? null }
  }

  const render = () => {
    measure.syncOverlays()
    renderer.render(scene, camera)
  }

  const measure = new AcExMeasureController({
    root,
    scene,
    i18n,
    statusEl,
    getReadyStatus: () => readyStatus,
    onOsnapMarker: (snap, screen) => {
      if (snap && screen) {
        osnapMarker.show(screen.x, screen.y, snap.mode)
      } else {
        osnapMarker.hide()
      }
    },
    view: {
      screenToWcs,
      wcsToScreen,
      render,
      resolvePoint: resolveMeasurePoint,
      formatLength,
      formatAngle
    }
  })

  const layerPanel = setupLayerPanel({
    snapshot,
    layerVisible,
    layerGroups,
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents,
    rebuildOsnapIndex
  })

  i18n.setOnChange(() => {
    readyStatus = snapshot.meta.title ?? i18n.t('status.ready')
    if (!measure.isActive) {
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

  controls.addEventListener('change', () => render())

  setupMeasurePointerInput(renderer.domElement, () => measure, render)

  renderer.domElement.addEventListener('mousedown', event => {
    if (event.button === 1) renderer.domElement.style.cursor = 'grabbing'
  })
  renderer.domElement.addEventListener('mouseup', event => {
    if (event.button === 1) renderer.domElement.style.cursor = ''
  })
  renderer.domElement.addEventListener('contextmenu', event => {
    event.preventDefault()
  })

  document
    .querySelectorAll('#mlcad-toolbar button[data-action]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action')
        if (action === 'fit') {
          fit()
        } else if (action === 'clear-measurements') {
          measure.clearAll()
          statusEl.textContent = readyStatus
        } else if (action === 'measure') {
          const mode = button.getAttribute(
            'data-measure-mode'
          ) as AcExMeasureMode | null
          if (mode) {
            measure.setMode(mode)
          }
        }
      })
    })

  window.addEventListener('keydown', event => {
    if (measure.handleKeyDown(event.key)) {
      event.preventDefault()
      return
    }
    if (measure.handleSelectionKeyDown(event.key, event)) {
      event.preventDefault()
    }
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
interface AcExLayerRowRefs {
  /** Layer name shown in the row. */
  name: string
  /** Per-layer zoom button whose `title` / `aria-label` are retranslated. */
  zoomBtn: HTMLButtonElement
}

/** Dependencies passed into {@link setupLayerPanel}. */
interface AcExLayerPanelContext {
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
  /** Rebuilds the object-snap index after layer visibility changes. */
  rebuildOsnapIndex: () => void
}

/** Handles returned by {@link setupLayerPanel} for locale-driven UI updates. */
interface AcExLayerPanelController {
  /** Reapplies `layers.zoomTo` labels on every per-layer zoom button. */
  refreshLayerLabels: () => void
}

function setupLayerPanel(
  ctx: AcExLayerPanelContext
): AcExLayerPanelController | null {
  const {
    snapshot,
    layerVisible,
    layerGroups,
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents,
    rebuildOsnapIndex
  } = ctx

  const layersBtn = document.getElementById('mlcad-layers-btn')
  const layerDrawer = document.getElementById('mlcad-layer-drawer')
  const layerList = document.getElementById('mlcad-layer-list')
  const layerClose = document.getElementById('mlcad-layer-close')
  const showAllBtn = document.getElementById('mlcad-layer-show-all')
  const hideAllBtn = document.getElementById('mlcad-layer-hide-all')
  if (!layersBtn || !layerDrawer || !layerList) return null

  const layerRows: AcExLayerRowRefs[] = []

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
    rebuildOsnapIndex()
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

/** Same defaults as {@link AcTrBaseView#createCameraControls}. */
function createOrbitControls(
  camera: THREE.OrthographicCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = false
  controls.autoRotate = false
  controls.enableRotate = false
  controls.zoomSpeed = 5
  controls.zoomToCursor = true
  controls.mouseButtons = {
    MIDDLE: THREE.MOUSE.PAN
  }
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_PAN
  }
  controls.update()
  return controls
}

/**
 * Left-button picking while a measure tool is active; pan/zoom stay on OrbitControls.
 */
function setupMeasurePointerInput(
  domElement: HTMLElement,
  getMeasure: () => AcExMeasureController,
  render: () => void
): void {
  domElement.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    const measure = getMeasure()
    if (measure.isActive) {
      measure.handlePointerDown(event.clientX, event.clientY)
      render()
      return
    }
    if (measure.handleSelectionPointerDown(event.clientX, event.clientY)) {
      render()
    }
  })
  domElement.addEventListener('pointermove', event => {
    const measure = getMeasure()
    if (!measure.isActive) return
    measure.handlePointerMove(event.clientX, event.clientY)
    render()
  })
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
