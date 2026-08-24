import { accmYieldForPaint, FLOAT_TOL } from '@mlightcad/data-model'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { setupAcExDrawStyleToolbar } from './AcExDrawStyleToolbar'
import {
  decryptAcExHtmlSnapshotPayload,
  isAcExHtmlAccessExpired,
  parseAcExHtmlAccessManifest
} from './AcExHtmlAccess'
import {
  ACEX_HTML_MAX_PASSWORD_ATTEMPTS,
  lockAcExHtmlAccessGate,
  promptAcExHtmlAccessPassword,
  showAcExHtmlAccessExpired
} from './AcExHtmlAccessGate'
import { setupAcExHtmlExpiryMonitor } from './AcExHtmlExpiryUi'
import { AcExHtmlI18n, detectAcExHtmlLocale } from './AcExHtmlI18n'
import { acExHtmlIcons } from './AcExHtmlIcons'
import { setupAcExHtmlLayoutMenu } from './AcExHtmlLayoutMenu'
import { setupAcExHtmlMeasureSettings } from './AcExHtmlMeasureSettings'
import { setupAcExHtmlNavTools } from './AcExHtmlNavTools'
import {
  setAcExHtmlParentChildIcon,
  setupAcExHtmlToolbarFlyouts
} from './AcExHtmlToolbarFlyout'
import {
  computeLayerExtentsMap,
  resolveLayoutViewExtents
} from './AcExLayerExtents'
import { AcExMarkupController, type AcExMarkupMode } from './AcExMarkup'
import { AcExMeasureController, type AcExMeasureMode } from './AcExMeasurement'
import { AcExOsnapIndex } from './AcExOsnap'
import { AcExOsnapMarker } from './AcExOsnapMarker'
import {
  computeViewportCamera,
  findDrillThroughViewport,
  modelPointToPaper,
  paperPointToModel,
  snapshotHasPaperViewports,
  viewportPaperToModelScale
} from './AcExPaperViewport'
import {
  acexCameraZoomUniform,
  createViewerLineMaterial,
  createViewerMeshMaterial,
  createViewerPointsMaterial
} from './AcExPatternSnapshot'
import { decodeSnapshot } from './AcExSnapshotCodec'
import type {
  AcExExtents,
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch,
  AcExSnapshot,
  AcExViewerMode
} from './AcExSnapshotTypes'
import {
  releaseLayerGroupsGeometryCpuArrays,
  releaseSnapshotBatchBuffers,
  releaseSnapshotOsnapCatalogs,
  removeSnapshotElement
} from './AcExViewerMemory'

/** Matches {@link AcTrBaseView} orthographic half-height in world units. */
const ACEX_CAMERA_FRUSTUM = 400
const ACEX_CAMERA_DISTANCE = 500

function hideLoading(): void {
  const loading = document.getElementById('mlcad-loading')
  if (!loading) return
  // Keep the node so the access/expiry gate can be shown again after open.
  loading.classList.add('mlcad-loading--done')
}

function showViewerError(message: string): void {
  const loading = document.getElementById('mlcad-loading')
  if (!loading) return
  loading.innerHTML = `<div style="padding:24px;color:#e8eaed;text-align:center;max-width:480px;line-height:1.5">${message}</div>`
}

/** Fallback when view mode omits the footer status bar. */
function createHiddenStatusSink(): HTMLElement {
  const el = document.createElement('div')
  el.hidden = true
  el.setAttribute('aria-hidden', 'true')
  return el
}

function bootstrap(): void {
  void accmYieldForPaint().then(() => startViewer())
}

async function resolveSnapshotPayload(
  snapshotEl: HTMLElement,
  i18n: AcExHtmlI18n
): Promise<{ payload: string; expiresAt: number | null } | null> {
  const accessEl = document.getElementById('mlcad-access')
  const manifest = parseAcExHtmlAccessManifest(accessEl?.textContent)
  const expiresAt = manifest?.expiresAt ?? null

  if (manifest && isAcExHtmlAccessExpired(manifest)) {
    showAcExHtmlAccessExpired(i18n, expiresAt)
    return null
  }

  const payload = snapshotEl.textContent?.trim() ?? ''

  if (!manifest?.encrypted) {
    return { payload, expiresAt }
  }

  if (!manifest.salt) {
    showViewerError(
      i18n.t('status.loadFailed', { error: 'Missing access metadata.' })
    )
    return null
  }

  let failedAttempts = 0
  let pendingError: 'access.wrongPassword' | undefined

  while (failedAttempts < ACEX_HTML_MAX_PASSWORD_ATTEMPTS) {
    try {
      const password = await promptAcExHtmlAccessPassword(i18n, {
        errorKey: pendingError,
        expiresAt
      })
      pendingError = undefined
      try {
        return {
          payload: await decryptAcExHtmlSnapshotPayload(
            password,
            payload,
            manifest.salt
          ),
          expiresAt
        }
      } catch {
        failedAttempts++
        if (failedAttempts >= ACEX_HTML_MAX_PASSWORD_ATTEMPTS) {
          lockAcExHtmlAccessGate(i18n)
          return null
        }
        pendingError = 'access.wrongPassword'
      }
    } catch {
      return null
    }
  }

  return null
}

async function startViewer(): Promise<void> {
  const root = document.getElementById('mlcad-root')
  const snapshotEl = document.getElementById('mlcad-snapshot')
  if (!root || !snapshotEl) {
    hideLoading()
    return
  }

  const i18n = new AcExHtmlI18n(detectAcExHtmlLocale())
  i18n.applyToDocument()

  const resolved = await resolveSnapshotPayload(snapshotEl, i18n)
  if (!resolved) {
    return
  }
  const { payload, expiresAt } = resolved

  const statusEl =
    document.getElementById('mlcad-status-bar') ?? createHiddenStatusSink()

  let snapshot: AcExSnapshot
  try {
    snapshot = decodeSnapshot(payload)
  } catch (error) {
    showViewerError(i18n.t('status.loadFailed', { error: String(error) }))
    return
  }

  const viewerMode: AcExViewerMode = snapshot.meta.viewerMode ?? 'measure'
  const measureEnabled = viewerMode === 'measure'

  const initialLayout =
    snapshot.layouts.find(l => l.btrId === snapshot.activeLayoutBtrId) ??
    snapshot.layouts[0]
  if (!initialLayout) {
    showViewerError(i18n.t('status.noLayout'))
    return
  }
  let layout = initialLayout

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

  const modelLayout = snapshot.layouts.find(item => item.isModelSpace)
  const hasPaperViewports = snapshotHasPaperViewports(snapshot.layouts)
  const canSwitchLayouts =
    snapshot.meta.exportLayouts !== false &&
    (snapshot.layouts.length > 1 || hasPaperViewports)

  const paperLayerGroups = new Map<string, THREE.Group>()
  const modelLayerGroups = new Map<string, THREE.Group>()
  const paperWideLineMaterials: LineMaterial[] = []
  const modelWideLineMaterials: LineMaterial[] = []
  const wideLineResolution = new THREE.Vector2(initialWidth, initialHeight)

  const paperRoot = new THREE.Group()
  paperRoot.name = 'paper-space'
  const modelRoot = new THREE.Group()
  modelRoot.name = 'model-space'
  const modelScene = new THREE.Scene()
  const viewportCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
  viewportCamera.up.set(0, 1, 0)
  const savedViewportBox = new THREE.Vector4()

  const getOrCreateLayerGroup = (
    groups: Map<string, THREE.Group>,
    parent: THREE.Object3D,
    layerName: string
  ): THREE.Group => {
    let group = groups.get(layerName)
    if (!group) {
      group = new THREE.Group()
      group.name = layerName
      group.visible = layerVisible.get(layerName) !== false
      groups.set(layerName, group)
      parent.add(group)
    }
    return group
  }

  const populateLayoutGeometry = (
    next: AcExLayoutSnapshot,
    groups: Map<string, THREE.Group>,
    parent: THREE.Object3D,
    materials: LineMaterial[]
  ) => {
    for (const batch of next.lineBatches) {
      const object = createLineObject(batch, materials, wideLineResolution)
      if (object) getOrCreateLayerGroup(groups, parent, batch.layer).add(object)
    }
    for (const batch of next.meshBatches) {
      const object = batch.points
        ? createPointObject(batch)
        : createMeshObject(batch)
      if (object) getOrCreateLayerGroup(groups, parent, batch.layer).add(object)
    }
  }

  if (modelLayout) {
    populateLayoutGeometry(
      modelLayout,
      modelLayerGroups,
      modelRoot,
      modelWideLineMaterials
    )
  }
  if (layout.isModelSpace) {
    scene.add(modelRoot)
  } else {
    scene.add(paperRoot)
    populateLayoutGeometry(
      layout,
      paperLayerGroups,
      paperRoot,
      paperWideLineMaterials
    )
    if (hasPaperViewports) {
      modelScene.add(modelRoot)
    }
  }

  const layerExtents = computeLayerExtentsMap(
    layout.lineBatches,
    layout.meshBatches
  )
  let layoutExtents = resolveLayoutViewExtents(
    layout,
    snapshot.meta.viewExtents ?? snapshot.meta.extents
  )

  let osnapIndex: AcExOsnapIndex | null = null
  let modelOsnapIndex: AcExOsnapIndex | null = null
  let osnapMarker: AcExOsnapMarker | null = null
  let osnapThresholdWcs = 0
  let snapCacheKey = 0
  const recomputeOsnapThresholdWcs = () => {
    if (!measureEnabled) return
    const a = screenToWcs(0, 0)
    const b = screenToWcs(osnapHitRadiusPx, 0)
    osnapThresholdWcs = Math.abs(b.x - a.x)
  }
  const bumpSnapCacheKey = () => {
    snapCacheKey++
  }

  const applyOsnapLayerVisibility = (index: AcExOsnapIndex | null) => {
    if (!index) return
    for (const layer of snapshot.layers) {
      if (!layer.visible) {
        index.setLayerHidden(layer.name, true)
      }
    }
  }

  if (measureEnabled) {
    osnapIndex = new AcExOsnapIndex()
    osnapMarker = new AcExOsnapMarker(root)
    osnapIndex.rebuild(layout)
    applyOsnapLayerVisibility(osnapIndex)
    if (hasPaperViewports && modelLayout) {
      modelOsnapIndex = new AcExOsnapIndex()
      modelOsnapIndex.rebuild(modelLayout)
      applyOsnapLayerVisibility(modelOsnapIndex)
    }
    // Keep inactive-layout catalogs so the user can switch back.
    if (!canSwitchLayouts) {
      releaseSnapshotOsnapCatalogs(snapshot)
    }
  }

  removeSnapshotElement(snapshotEl)

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
    acexCameraZoomUniform.value = camera.zoom
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
    acexCameraZoomUniform.value = camera.zoom
    controls.update()
    recomputeOsnapThresholdWcs()
    bumpSnapCacheKey()
  }

  const resize = () => {
    const { width, height } = getCanvasSize()
    renderer.setSize(width, height)
    wideLineResolution.set(width, height)
    for (const material of paperWideLineMaterials) {
      material.resolution.copy(wideLineResolution)
    }
    for (const material of modelWideLineMaterials) {
      material.resolution.copy(wideLineResolution)
    }
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
    // Initial open and toolbar "Zoom extents" both use batch-derived layout bounds.
    zoomToExtents(layoutExtents)
  }

  const captureViewState = () => ({
    centerX: controls.target.x,
    centerY: controls.target.y,
    zoom: camera.zoom
  })
  const originalByLayout = new Map<
    string,
    { centerX: number; centerY: number; zoom: number }
  >()
  const lastViewByLayout = new Map<
    string,
    { centerX: number; centerY: number; zoom: number }
  >()
  const restoreOriginalView = () => {
    const saved = originalByLayout.get(layout.btrId)
    if (saved) {
      flyTo(saved.centerX, saved.centerY, saved.zoom)
    } else {
      fit()
    }
    render()
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
  if (measureEnabled) {
    recomputeOsnapThresholdWcs()
  }

  const resolveMeasurePoint = (clientX: number, clientY: number) => {
    const raw = screenToWcs(clientX, clientY)
    if (!osnapIndex) {
      return { point: raw, snap: null }
    }
    if (!layout.isModelSpace && modelOsnapIndex) {
      const viewport = findDrillThroughViewport(
        layout.viewports,
        raw.x,
        raw.y,
        osnapThresholdWcs
      )
      if (viewport) {
        const modelPt = paperPointToModel(viewport, raw.x, raw.y)
        const modelThresh =
          osnapThresholdWcs * viewportPaperToModelScale(viewport)
        const modelSnap = modelOsnapIndex.findSnap(
          modelPt.x,
          modelPt.y,
          modelThresh
        )
        if (modelSnap) {
          const paper = modelPointToPaper(viewport, modelSnap.x, modelSnap.y)
          return {
            point: new THREE.Vector2(paper.x, paper.y),
            snap: { ...modelSnap, x: paper.x, y: paper.y }
          }
        }
      }
    }
    const snap = osnapIndex.findSnap(raw.x, raw.y, osnapThresholdWcs)
    const point = snap ? new THREE.Vector2(snap.x, snap.y) : raw
    return { point, snap: snap ?? null }
  }

  let measure: AcExMeasureController | null = null
  let markup: AcExMarkupController | null = null
  const measureSettingsRef: {
    current: ReturnType<typeof setupAcExHtmlMeasureSettings> | null
  } = { current: null }
  const toolbarFlyoutsRef: {
    current: ReturnType<typeof setupAcExHtmlToolbarFlyouts> | null
  } = { current: null }
  const layoutMenuRef: {
    current: ReturnType<typeof setupAcExHtmlLayoutMenu> | null
  } = { current: null }
  const drawStyleToolbarRef: {
    current: ReturnType<typeof setupAcExDrawStyleToolbar> | null
  } = { current: null }
  const navToolsRef: {
    current: ReturnType<typeof setupAcExHtmlNavTools> | null
  } = { current: null }
  let expiryMonitor: ReturnType<typeof setupAcExHtmlExpiryMonitor> | null = null

  const isToolActive = () =>
    measure?.isActive === true || markup?.isActive === true

  const setLeftPanForTools = () => {
    if (isToolActive()) {
      navToolsRef.current?.cancelZoomWindow()
    }
    setOrbitLeftButtonPan(
      controls,
      navToolsRef.current?.isPanEnabled() ?? !isToolActive()
    )
    drawStyleToolbarRef.current?.refresh()
    navToolsRef.current?.syncButtons()
  }

  const paperWorldToScreen = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const ndc = new THREE.Vector3(x, y, 0).project(camera)
    return {
      x: ((ndc.x + 1) / 2) * width,
      y: ((-ndc.y + 1) / 2) * height
    }
  }

  const renderPaperViewports = () => {
    const viewports = layout.viewports
    if (
      layout.isModelSpace ||
      !viewports?.length ||
      modelRoot.children.length === 0
    ) {
      return
    }
    const { width, height } = getCanvasSize()
    if (width <= 0 || height <= 0) return

    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.getViewport(savedViewportBox)
    renderer.clearDepth()

    for (const viewport of viewports) {
      const pMin = paperWorldToScreen(
        viewport.paper.minX,
        viewport.paper.minY,
        width,
        height
      )
      const pMax = paperWorldToScreen(
        viewport.paper.maxX,
        viewport.paper.maxY,
        width,
        height
      )
      const minX = Math.min(pMin.x, pMax.x)
      const maxX = Math.max(pMin.x, pMax.x)
      const minY = Math.min(pMin.y, pMax.y)
      const maxY = Math.max(pMin.y, pMax.y)
      const vpW = maxX - minX
      const vpH = maxY - minY
      if (vpW < 1 || vpH < 1) continue

      const scissorX = minX
      const scissorY = height - maxY
      renderer.setViewport(scissorX, scissorY, vpW, vpH)
      renderer.setScissor(scissorX, scissorY, vpW, vpH)
      renderer.setScissorTest(true)

      const fitted = computeViewportCamera(viewport.model, vpW, vpH)
      viewportCamera.left = -fitted.aspect * fitted.frustum
      viewportCamera.right = fitted.aspect * fitted.frustum
      viewportCamera.top = fitted.frustum
      viewportCamera.bottom = -fitted.frustum
      viewportCamera.position.set(
        fitted.centerX,
        fitted.centerY,
        ACEX_CAMERA_DISTANCE
      )
      viewportCamera.lookAt(fitted.centerX, fitted.centerY, 0)
      const twist = viewport.twist ?? 0
      viewportCamera.up.set(-Math.sin(twist), Math.cos(twist), 0)
      viewportCamera.setRotationFromEuler(new THREE.Euler(0, 0, twist))
      viewportCamera.zoom = fitted.zoom
      viewportCamera.updateProjectionMatrix()
      acexCameraZoomUniform.value = fitted.zoom
      renderer.render(modelScene, viewportCamera)
      renderer.setScissorTest(false)
    }

    renderer.setViewport(
      savedViewportBox.x,
      savedViewportBox.y,
      savedViewportBox.z,
      savedViewportBox.w
    )
    renderer.autoClear = autoClear
    acexCameraZoomUniform.value = camera.zoom
  }

  const render = () => {
    measure?.syncOverlays()
    markup?.syncOverlays()
    renderer.render(scene, camera)
    renderPaperViewports()
  }

  if (measureEnabled) {
    measure = new AcExMeasureController({
      root,
      i18n,
      statusEl,
      getReadyStatus: () => readyStatus,
      drawingName: snapshot.meta.title,
      onOsnapMarker: (snap, screen) => {
        if (snap && screen) {
          osnapMarker?.show(screen.x, screen.y, snap.mode)
        } else {
          osnapMarker?.hide()
        }
      },
      getTrackingOptions: () =>
        measureSettingsRef.current?.getTrackingOptions() ?? null,
      onActiveChange: () => {
        setLeftPanForTools()
        // Measure overlays are pointer-events:none; markup grips are not — suspend
        // them so endpoint/badge DOM cannot steal OSNAP clicks while measuring.
        markup?.setPeerToolActive(measure?.isActive === true)
      },
      onStyleChange: () => {
        drawStyleToolbarRef.current?.refresh()
      },
      getActiveLayoutId: () => layout.btrId,
      view: {
        screenToWcs,
        wcsToScreen,
        render,
        getSnapCacheKey: () => snapCacheKey,
        resolvePoint: resolveMeasurePoint,
        findCircleOrArcNear: (x, y) => {
          if (!layout.isModelSpace && modelOsnapIndex) {
            const viewport = findDrillThroughViewport(
              layout.viewports,
              x,
              y,
              osnapThresholdWcs
            )
            if (viewport) {
              const modelPt = paperPointToModel(viewport, x, y)
              const modelScale = viewportPaperToModelScale(viewport)
              const hit = modelOsnapIndex.findCircleOrArcNear(
                modelPt.x,
                modelPt.y,
                osnapThresholdWcs * modelScale
              )
              if (hit) {
                const onCurve = modelPointToPaper(viewport, hit.x, hit.y)
                const center = modelPointToPaper(viewport, hit.cx, hit.cy)
                return {
                  cx: center.x,
                  cy: center.y,
                  r: modelScale === 0 ? hit.r : hit.r / modelScale,
                  x: onCurve.x,
                  y: onCurve.y
                }
              }
            }
          }
          if (!osnapIndex) return null
          return osnapIndex.findCircleOrArcNear(x, y, osnapThresholdWcs) ?? null
        },
        formatLength,
        formatAngle
      }
    })

    markup = new AcExMarkupController({
      root,
      i18n,
      statusEl,
      getReadyStatus: () => readyStatus,
      drawingName: snapshot.meta.title,
      onOsnapMarker: (snap, screen) => {
        if (snap && screen) {
          osnapMarker?.show(screen.x, screen.y, snap.mode)
        } else {
          osnapMarker?.hide()
        }
      },
      onBeforeActivate: () => {
        measure?.cancelMode()
      },
      onActiveChange: () => {
        setLeftPanForTools()
        // Measure overlays are pointer-events:none; markup grips are not — suspend
        // them so endpoint/badge DOM cannot steal OSNAP clicks while measuring.
        markup?.setPeerToolActive(measure?.isActive === true)
      },
      onStyleChange: () => {
        drawStyleToolbarRef.current?.refresh()
      },
      getTrackingOptions: () =>
        measureSettingsRef.current?.getTrackingOptions() ?? null,
      getActiveLayoutId: () => layout.btrId,
      view: {
        screenToWcs,
        wcsToScreen,
        render,
        getSnapCacheKey: () => snapCacheKey,
        resolvePoint: resolveMeasurePoint
      }
    })

    measureSettingsRef.current = setupAcExHtmlMeasureSettings({
      i18n,
      measure,
      angbase: snapshot.meta.units.angbase,
      angdir: snapshot.meta.units.angdir
    })

    drawStyleToolbarRef.current = setupAcExDrawStyleToolbar({
      root,
      i18n,
      getKind: () => {
        if (measure?.isActive) return 'measure'
        if (markup?.isActive) return 'markup'
        if (markup?.hasSelection && measure?.hasSelection) return undefined
        if (markup?.hasSelection) return 'markup'
        if (measure?.hasSelection) return 'measure'
        return undefined
      },
      getStyle: kind =>
        kind === 'measure' ? measure!.getDrawStyle() : markup!.getDrawStyle(),
      applyStyle: (kind, patch) => {
        if (kind === 'measure') {
          measure!.setDrawStyle(patch)
        } else {
          markup!.setDrawStyle(patch)
        }
      }
    })
  }

  const toolbarCollapse = setupToolbarCollapse(i18n, () => {
    toolbarFlyoutsRef.current?.close()
    layoutMenuRef.current?.close()
    measureSettingsRef.current?.close()
  })

  const layerPanel = setupLayerPanel({
    snapshot,
    layerVisible,
    layerGroupMaps: [paperLayerGroups, modelLayerGroups],
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents,
    cancelZoomWindow: () => navToolsRef.current?.cancelZoomWindow(),
    osnapIndexes: [osnapIndex, modelOsnapIndex].filter(
      (index): index is AcExOsnapIndex => index != null
    ),
    sortedLayerNames: [
      ...new Set([
        ...snapshot.layers.map(layer => layer.name),
        ...paperLayerGroups.keys(),
        ...modelLayerGroups.keys()
      ])
    ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  })

  const disposeObject3D = (object: THREE.Object3D) => {
    object.traverse(child => {
      const mesh = child as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const material = mesh.material
      if (Array.isArray(material)) {
        material.forEach(item => item.dispose())
      } else if (material) {
        material.dispose()
      }
    })
  }

  const disposePaperGeometry = () => {
    for (const group of paperLayerGroups.values()) {
      paperRoot.remove(group)
      disposeObject3D(group)
    }
    paperLayerGroups.clear()
    paperWideLineMaterials.length = 0
  }

  const switchLayout = (btrId: string) => {
    if (btrId === layout.btrId) return
    const next = snapshot.layouts.find(item => item.btrId === btrId)
    if (!next) return

    lastViewByLayout.set(layout.btrId, captureViewState())
    navToolsRef.current?.cancelZoomWindow()
    measure?.cancelMode()
    markup?.cancelMode()
    osnapMarker?.hide()

    if (!layout.isModelSpace) {
      disposePaperGeometry()
    }
    paperRoot.removeFromParent()
    modelRoot.removeFromParent()

    layout = next
    if (layout.isModelSpace) {
      scene.add(modelRoot)
    } else {
      scene.add(paperRoot)
      populateLayoutGeometry(
        layout,
        paperLayerGroups,
        paperRoot,
        paperWideLineMaterials
      )
      if (hasPaperViewports) {
        modelScene.add(modelRoot)
      }
    }

    const nextLayerExtents = computeLayerExtentsMap(
      layout.lineBatches,
      layout.meshBatches
    )
    layerExtents.clear()
    for (const [name, extents] of nextLayerExtents) {
      layerExtents.set(name, extents)
    }
    layoutExtents = resolveLayoutViewExtents(layout)
    layerPanel?.syncLayerZoomButtons()

    if (osnapIndex) {
      osnapIndex.rebuild(layout)
      for (const [name, visible] of layerVisible) {
        osnapIndex.setLayerHidden(name, visible === false)
      }
    }

    const saved = lastViewByLayout.get(btrId)
    if (saved) {
      flyTo(saved.centerX, saved.centerY, saved.zoom)
    } else {
      fit()
      const framed = captureViewState()
      originalByLayout.set(btrId, framed)
    }

    measure?.syncLayoutVisibility()
    markup?.syncLayoutVisibility()
    layoutMenuRef.current?.refresh()
    recomputeOsnapThresholdWcs()
    bumpSnapCacheKey()
    render()
  }

  controls.addEventListener('change', () => {
    acexCameraZoomUniform.value = camera.zoom
    recomputeOsnapThresholdWcs()
    bumpSnapCacheKey()
    render()
  })

  const navTools = setupAcExHtmlNavTools({
    root,
    i18n,
    screenToWcs,
    zoomToExtents,
    exitDrawingTools: () => {
      measure?.cancelMode()
      markup?.cancelMode()
    },
    isDrawingActive: isToolActive,
    onModeChange: () => setLeftPanForTools(),
    getReadyStatus: () => readyStatus,
    statusEl
  })
  navToolsRef.current = navTools
  setLeftPanForTools()

  setupToolPointerInput({
    domElement: renderer.domElement,
    getMeasure: () => measure,
    getMarkup: () => markup,
    getNavTools: () => navToolsRef.current,
    render
  })

  setupPanCursorFeedback(
    renderer.domElement,
    () => navToolsRef.current?.isPanEnabled() ?? !isToolActive()
  )

  renderer.domElement.addEventListener('contextmenu', event => {
    event.preventDefault()
  })

  const handleToolbarAction = (button: HTMLElement) => {
    const action = button.getAttribute('data-action')
    if (action === 'select' || action === 'pan' || action === 'zoom-window') {
      navToolsRef.current?.setMode(action)
      if (action === 'zoom-window') {
        setAcExHtmlParentChildIcon('mlcad-zoom-menu-btn', button)
      }
      return
    }
    if (action === 'fit') {
      navToolsRef.current?.cancelZoomWindow()
      measure?.cancelMode()
      markup?.cancelMode()
      setAcExHtmlParentChildIcon('mlcad-zoom-menu-btn', button)
      fit()
    } else if (action === 'zoom-original') {
      navToolsRef.current?.cancelZoomWindow()
      measure?.cancelMode()
      markup?.cancelMode()
      setAcExHtmlParentChildIcon('mlcad-zoom-menu-btn', button)
      restoreOriginalView()
    } else if (action === 'clear-measurements') {
      measure?.clearAll()
    } else if (action === 'measure-visibility') {
      measure?.toggleVisible()
    } else if (action === 'measure-import') {
      measure?.importSidecar()
    } else if (action === 'measure-export') {
      measure?.exportSidecar()
    } else if (action === 'clear-markups') {
      markup?.clearAll()
    } else if (action === 'markup-visibility') {
      markup?.toggleVisible()
    } else if (action === 'markup-import') {
      markup?.importSidecar()
    } else if (action === 'markup-export') {
      markup?.exportSidecar()
    } else if (action === 'measure') {
      markup?.cancelMode()
      const mode = button.getAttribute(
        'data-measure-mode'
      ) as AcExMeasureMode | null
      if (mode) {
        measure?.setMode(mode)
      }
    } else if (action === 'markup') {
      measure?.cancelMode()
      const mode = button.getAttribute(
        'data-markup-mode'
      ) as AcExMarkupMode | null
      if (mode) {
        markup?.setMode(mode)
      }
    }
  }

  document
    .querySelectorAll('#mlcad-toolbar button[data-action]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action')
        // Parent menu buttons are handled by the flyout controller.
        if (
          action === 'measure-menu' ||
          action === 'markup-menu' ||
          action === 'snap-menu' ||
          action === 'zoom-menu' ||
          action === 'layout-menu'
        ) {
          return
        }
        handleToolbarAction(button as HTMLElement)
      })
    })

  const toolbarFlyouts = setupAcExHtmlToolbarFlyouts({
    onItemClick: handleToolbarAction,
    onLocaleSelect: locale => i18n.setLocale(locale),
    getLocale: () => i18n.locale,
    onClose: menuId => {
      if (menuId === 'snap') {
        measureSettingsRef.current?.close()
      }
    },
    onOpen: (menuId, menuRoot) => {
      layoutMenuRef.current?.close()
      if (menuId === 'measure' && measure) {
        measure.setVisible(measure.visible)
        menuRoot.querySelectorAll('[data-measure-mode]').forEach(btn => {
          const mode = btn.getAttribute('data-measure-mode')
          btn.classList.toggle('active', mode === measure.mode)
        })
      } else if (menuId === 'review' && markup) {
        markup.setVisible(markup.visible)
        menuRoot.querySelectorAll('[data-markup-mode]').forEach(btn => {
          const mode = btn.getAttribute('data-markup-mode')
          btn.classList.toggle('active', mode === markup.mode)
        })
      } else if (menuId === 'zoom') {
        const zoomWindow = navToolsRef.current?.getMode() === 'zoom-window'
        menuRoot.querySelectorAll('[data-action]').forEach(btn => {
          btn.classList.toggle(
            'active',
            btn.getAttribute('data-action') === 'zoom-window' && zoomWindow
          )
        })
      }
    }
  })
  toolbarFlyoutsRef.current = toolbarFlyouts

  layoutMenuRef.current = setupAcExHtmlLayoutMenu({
    layouts: snapshot.layouts,
    getActiveLayoutBtrId: () => layout.btrId,
    onSelect: switchLayout,
    closeOtherFlyouts: () => toolbarFlyouts.close()
  })

  i18n.setOnChange(() => {
    readyStatus = snapshot.meta.title ?? i18n.t('status.ready')
    if (!measure?.isActive && !markup?.isActive) {
      measure?.refreshIdleStatus()
      markup?.refreshIdleStatus()
    }
    layerPanel?.refreshLayerLabels()
    measureSettingsRef.current?.refreshLabels()
    drawStyleToolbarRef.current?.refreshLabels()
    toolbarCollapse.refreshLabels()
    toolbarFlyouts?.refreshLabels()
    navToolsRef.current?.refreshLabels()
    expiryMonitor?.refreshLabels()
    // Re-apply visibility button label after i18n DOM refresh.
    if (markup) {
      markup.setVisible(markup.visible)
    }
    if (measure) {
      measure.setVisible(measure.visible)
    }
    drawStyleToolbarRef.current?.refresh()
  })

  window.addEventListener('keydown', event => {
    // Don't steal keys from real text fields; markup inline edit uses
    // stopPropagation on its own keydown handler.
    const target = event.target as HTMLElement | null
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target?.isContentEditable &&
        target.closest('.mlcad-markup-text-editing'))
    ) {
      return
    }
    if (
      event.key === 'Escape' &&
      !isToolActive() &&
      navToolsRef.current?.getMode() === 'zoom-window'
    ) {
      event.preventDefault()
      navToolsRef.current.cancelZoomWindow()
      return
    }
    if (!measure || !markup) return
    if (
      measure.handleKeyDown(event.key, event) ||
      markup.handleKeyDown(event.key)
    ) {
      event.preventDefault()
      return
    }
    if (
      measure.handleSelectionKeyDown(event.key, event) ||
      markup.handleSelectionKeyDown(event.key, event)
    ) {
      event.preventDefault()
    }
  })

  window.addEventListener('resize', () => {
    resize()
    recomputeOsnapThresholdWcs()
    bumpSnapCacheKey()
    render()
  })

  resize()
  if (snapshot.meta.initialView === 'current' && snapshot.meta.viewState) {
    const { centerX, centerY, zoom } = snapshot.meta.viewState
    flyTo(centerX, centerY, zoom)
    render()
  } else {
    fit()
  }
  const initialView = captureViewState()
  originalByLayout.set(layout.btrId, initialView)
  lastViewByLayout.set(layout.btrId, initialView)
  // Shared typed arrays back the snapshot and THREE attributes. Releasing
  // them would prevent switching to other layouts later in this session.
  if (!canSwitchLayouts) {
    releaseLayerGroupsGeometryCpuArrays(paperLayerGroups)
    releaseLayerGroupsGeometryCpuArrays(modelLayerGroups)
    releaseSnapshotBatchBuffers(snapshot)
  }
  measure?.refreshIdleStatus()
  if (expiresAt != null) {
    expiryMonitor = setupAcExHtmlExpiryMonitor({
      expiresAt,
      i18n,
      onExpire: () => {
        // Keep the canvas mounted under the expired gate; interaction is blocked
        // by the loading overlay.
      }
    })
  }
  hideLoading()
}

interface AcExLayerRowRefs {
  /** Layer name shown in the row. */
  name: string
  /** Per-layer zoom button whose `title` / `aria-label` are retranslated. */
  zoomBtn: HTMLButtonElement
}

/** Handles returned by {@link setupToolbarCollapse} for locale-driven UI updates. */
interface AcExToolbarCollapseController {
  refreshLabels: () => void
}

function setupToolbarCollapse(
  i18n: AcExHtmlI18n,
  closeStrips?: () => void
): AcExToolbarCollapseController {
  const sidebar = document.getElementById('mlcad-sidebar')
  const toggleBtn = document.getElementById('mlcad-toolbar-toggle')
  if (!sidebar || !toggleBtn) {
    return { refreshLabels: () => {} }
  }

  let collapsed = false

  const closeSidePanels = () => {
    const layerDrawer = document.getElementById('mlcad-layer-drawer')
    const layersBtn = document.getElementById('mlcad-layers-btn')

    if (layerDrawer) layerDrawer.hidden = true
    layersBtn?.classList.remove('active')
    layersBtn?.setAttribute('aria-expanded', 'false')

    closeStrips?.()
  }

  const syncToggle = () => {
    sidebar.classList.toggle('mlcad-sidebar--collapsed', collapsed)
    toggleBtn.innerHTML = collapsed
      ? acExHtmlIcons.chevronDown
      : acExHtmlIcons.chevronUp
    toggleBtn.setAttribute('aria-expanded', String(!collapsed))
    toggleBtn.dataset.i18nKey = collapsed
      ? 'toolbar.expand'
      : 'toolbar.collapse'
    const label = i18n.t(collapsed ? 'toolbar.expand' : 'toolbar.collapse')
    toggleBtn.setAttribute('title', label)
    toggleBtn.setAttribute('aria-label', label)
  }

  toggleBtn.addEventListener('click', event => {
    event.stopPropagation()
    collapsed = !collapsed
    if (collapsed) closeSidePanels()
    syncToggle()
  })

  syncToggle()

  return {
    refreshLabels: () => syncToggle()
  }
}

/** Dependencies passed into {@link setupLayerPanel}. */
interface AcExLayerPanelContext {
  /** Full snapshot (layer table and metadata). */
  snapshot: AcExSnapshot
  /** Mutable visibility map shared with the THREE layer groups. */
  layerVisible: Map<string, boolean>
  /** THREE groups keyed by layer name (paper and/or model space). */
  layerGroupMaps: Map<string, THREE.Group>[]
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
  /** Clears an in-progress zoom-window rubber band / mode before layer zoom. */
  cancelZoomWindow: () => void
  /** Object-snap indexes updated when layer visibility changes. */
  osnapIndexes: AcExOsnapIndex[]
  /** Sorted layer names for bulk show/hide actions. */
  sortedLayerNames: string[]
}

/** Handles returned by {@link setupLayerPanel} for locale-driven UI updates. */
interface AcExLayerPanelController {
  /** Reapplies `layers.zoomTo` labels on every per-layer zoom button. */
  refreshLayerLabels: () => void
  /** Enables/disables per-layer zoom after the active layout changes. */
  syncLayerZoomButtons: () => void
}

function setupLayerPanel(
  ctx: AcExLayerPanelContext
): AcExLayerPanelController | null {
  const {
    snapshot,
    layerVisible,
    layerGroupMaps,
    layerExtents,
    statusEl,
    i18n,
    render,
    zoomToExtents,
    cancelZoomWindow,
    osnapIndexes,
    sortedLayerNames
  } = ctx

  const layersBtn = document.getElementById('mlcad-layers-btn')
  const layerDrawer = document.getElementById('mlcad-layer-drawer')
  const layerList = document.getElementById('mlcad-layer-list')
  const layerClose = document.getElementById('mlcad-layer-close')
  const showAllBtn = document.getElementById('mlcad-layer-show-all')
  const hideAllBtn = document.getElementById('mlcad-layer-hide-all')
  if (!layersBtn || !layerDrawer || !layerList) return null

  const layerRows: AcExLayerRowRefs[] = []

  const sortedLayers = sortedLayerNames

  const layerMeta = new Map(snapshot.layers.map(layer => [layer.name, layer]))

  const checkboxes: HTMLInputElement[] = []

  const setGroupsVisible = (name: string, visible: boolean) => {
    for (const groups of layerGroupMaps) {
      const group = groups.get(name)
      if (group) group.visible = visible
    }
  }

  const setLayerVisible = (name: string, visible: boolean) => {
    layerVisible.set(name, visible)
    setGroupsVisible(name, visible)
    for (const index of osnapIndexes) {
      index.setLayerHidden(name, !visible)
    }
  }

  const setAllLayersVisible = (visible: boolean) => {
    for (const name of sortedLayers) {
      layerVisible.set(name, visible)
      setGroupsVisible(name, visible)
    }
    if (visible) {
      for (const index of osnapIndexes) {
        index.showAllLayers()
      }
    } else {
      for (const index of osnapIndexes) {
        index.hideAllLayers(sortedLayers)
      }
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
    zoomBtn.disabled = !extents
    zoomBtn.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      const liveExtents = layerExtents.get(name)
      if (!liveExtents) return
      cancelZoomWindow()
      zoomToExtents(liveExtents)
      statusEl.textContent = i18n.t('status.zoomLayer', { name })
    })
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
    },
    syncLayerZoomButtons: () => {
      for (const row of layerRows) {
        row.zoomBtn.disabled = !layerExtents.get(row.name)
      }
    }
  }
}

function applyBatchPose(
  object: THREE.Object3D,
  batch: { offset: [number, number, number]; renderOrder?: number }
): void {
  object.position.set(batch.offset[0], batch.offset[1], batch.offset[2])
  if (batch.renderOrder != null) {
    object.renderOrder = batch.renderOrder
  }
}

/**
 * Hatch-tier fills sit below linework on the shared Z plane.
 * Prefer the exported `renderOrder` (from `drawOrder`); patterned/gradient
 * batches without that field still fall back to `-1`.
 */
function resolveMeshRenderOrder(batch: AcExMeshBatch): number | undefined {
  if (batch.renderOrder != null) {
    return batch.renderOrder
  }
  if (batch.hatchPattern || batch.gradientFill) {
    return -1
  }
  return undefined
}

function createLineObject(
  batch: AcExLineBatch,
  wideLineMaterials: LineMaterial[],
  wideLineResolution: THREE.Vector2
): THREE.Object3D | null {
  if (batch.positions.length < 6) return null

  if (batch.lineWidth != null && batch.lineWidth > 0) {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(batch.positions)
    const material = createViewerLineMaterial(
      batch,
      wideLineResolution
    ) as LineMaterial
    wideLineMaterials.push(material)
    const object = new LineSegments2(geometry, material)
    applyBatchPose(object, batch)
    return object
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(batch.positions, 3)
  )
  if (batch.indices && batch.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(batch.indices, 1))
  }
  if (
    batch.linePattern &&
    batch.lineDistances &&
    batch.lineDistances.length > 0
  ) {
    geometry.setAttribute(
      'lineDistance',
      new THREE.BufferAttribute(batch.lineDistances, 1)
    )
  }
  const material = createViewerLineMaterial(batch)
  const object = new THREE.LineSegments(geometry, material)
  applyBatchPose(object, batch)
  return object
}

/** Same defaults as {@link AcTrBaseView#createCameraControls}, plus left-button pan
 * for mouse and macOS trackpad three-finger drag. */
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
  setOrbitLeftButtonPan(controls, true)
  controls.update()
  return controls
}

/**
 * Idle pan mode: left + middle mouse pan and one-finger touch pan.
 * Select / zoom-window / drawing tools: middle mouse only; one-finger touch is
 * cleared so it cannot pan — matches {@link AcTrLayoutView} mouse switch and
 * keeps two-finger pinch/pan available.
 */
function setOrbitLeftButtonPan(
  controls: OrbitControls,
  enableLeftPan: boolean
): void {
  controls.mouseButtons = enableLeftPan
    ? {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.PAN
      }
    : {
        MIDDLE: THREE.MOUSE.PAN
      }
  controls.touches = enableLeftPan
    ? {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN
      }
    : {
        TWO: THREE.TOUCH.DOLLY_PAN
      }
}

/** Grabbing cursor while middle-button or idle left-button pan is held. */
function setupPanCursorFeedback(
  domElement: HTMLElement,
  isLeftPanEnabled: () => boolean
): void {
  let panPointerId: number | null = null

  const clearPanCursor = (event: PointerEvent) => {
    if (panPointerId === null || event.pointerId !== panPointerId) return
    panPointerId = null
    domElement.style.cursor = ''
  }

  domElement.addEventListener('pointerdown', event => {
    const isMiddlePan = event.button === 1
    const isLeftPan = event.button === 0 && isLeftPanEnabled()
    if (!isMiddlePan && !isLeftPan) return
    panPointerId = event.pointerId
    domElement.style.cursor = 'grabbing'
  })
  // Capture release even when the pointer leaves the canvas.
  window.addEventListener('pointerup', clearPanCursor)
  window.addEventListener('pointercancel', clearPanCursor)
}

/** Pointer wiring for {@link setupToolPointerInput}. */
interface AcExToolPointerInputOptions {
  domElement: HTMLElement
  getMeasure: () => AcExMeasureController | null
  getMarkup: () => AcExMarkupController | null
  getNavTools: () => ReturnType<typeof setupAcExHtmlNavTools> | null
  render: () => void
}

/**
 * Left-button tool picking / selection on capture so selection can block
 * OrbitControls pan; while a tool is active left pan is already toggled off.
 * Also drives zoom-window picks in both view and measure modes.
 */
function setupToolPointerInput(options: AcExToolPointerInputOptions): void {
  const { domElement, getMeasure, getMarkup, getNavTools, render } = options
  let pendingMove: { clientX: number; clientY: number } | null = null
  let moveRaf = 0

  const flushPointerMove = () => {
    moveRaf = 0
    const sample = pendingMove
    pendingMove = null
    if (!sample) return
    const measure = getMeasure()
    const markup = getMarkup()
    if (measure?.isActive) {
      measure.handlePointerMove(sample.clientX, sample.clientY)
      render()
      return
    }
    if (markup?.isActive) {
      markup.handlePointerMove(sample.clientX, sample.clientY)
      render()
      return
    }
    getNavTools()?.handlePointerMove(sample.clientX, sample.clientY)
  }

  domElement.addEventListener(
    'pointerdown',
    event => {
      if (event.button !== 0) return
      const measure = getMeasure()
      const markup = getMarkup()
      if (measure?.isActive) {
        if (measure.handlePointerDown(event.clientX, event.clientY)) {
          if (measure.hasSelection) markup?.clearSelection()
          render()
        }
        return
      }
      if (markup?.isActive) {
        if (markup.handlePointerDown(event.clientX, event.clientY)) {
          if (markup.hasSelection) measure?.clearSelection()
          render()
        }
        return
      }
      const nav = getNavTools()
      if (nav?.handlePointerDown(event.clientX, event.clientY)) {
        event.stopImmediatePropagation()
        return
      }
      // Capture phase: stop before OrbitControls starts left-button pan.
      if (markup?.handleSelectionPointerDown(event.clientX, event.clientY)) {
        event.stopImmediatePropagation()
        if (markup.hasSelection) measure?.clearSelection()
        render()
        return
      }
      if (measure?.handleSelectionPointerDown(event.clientX, event.clientY)) {
        event.stopImmediatePropagation()
        if (measure.hasSelection) markup?.clearSelection()
        render()
      }
    },
    true
  )
  domElement.addEventListener('pointermove', event => {
    const measure = getMeasure()
    const markup = getMarkup()
    const zoomWindow = getNavTools()?.getMode() === 'zoom-window'
    if (!measure?.isActive && !markup?.isActive && !zoomWindow) return
    pendingMove = { clientX: event.clientX, clientY: event.clientY }
    if (moveRaf === 0) {
      moveRaf = requestAnimationFrame(flushPointerMove)
    }
  })
}

function createPointObject(batch: AcExMeshBatch): THREE.Points | null {
  if (batch.positions.length < 3) return null
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(batch.positions, 3)
  )
  const material = createViewerPointsMaterial(batch)
  const object = new THREE.Points(geometry, material)
  applyBatchPose(object, {
    offset: batch.offset,
    renderOrder: batch.renderOrder
  })
  return object
}

function createMeshObject(batch: AcExMeshBatch): THREE.Mesh | null {
  if (!batch.indices || batch.indices.length < 3) {
    return null
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(batch.positions, 3)
  )
  geometry.setIndex(new THREE.BufferAttribute(batch.indices, 1))
  if (
    batch.gradientFill &&
    batch.gradientPositions &&
    batch.gradientPositions.length >= 2
  ) {
    geometry.setAttribute(
      'gradientPosition',
      new THREE.BufferAttribute(batch.gradientPositions, 2)
    )
  }
  const material = createViewerMeshMaterial(batch)
  const object = new THREE.Mesh(geometry, material)
  applyBatchPose(object, {
    offset: batch.offset,
    renderOrder: resolveMeshRenderOrder(batch)
  })
  return object
}

bootstrap()
