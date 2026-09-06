import { accmYieldForPaint, FLOAT_TOL } from '@mlightcad/data-model'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { decodeChunkGzip } from './AcExChunkBinaryCodec'
import {
  AcExCommandSessionPanel,
  type AcExCommandSessionUiState
} from './AcExCommandSessionPanel'
import {
  acexCssRectToWcsBox,
  acexCssTopLeftRectToGl,
  acexIntersectCssRects,
  acexWcsBoxToCssRect
} from './AcExCssRect'
import { acexSetDocsBaseUrl } from './AcExDocsUrl'
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
import {
  acexHtmlIsPhoneLayout,
  setupAcExHtmlDrawerSheets
} from './AcExHtmlDrawerSheet'
import { setupAcExHtmlExpiryMonitor } from './AcExHtmlExpiryUi'
import { AcExHtmlI18n, detectAcExHtmlLocale } from './AcExHtmlI18n'
import { AcExHtmlIcons } from './AcExHtmlIcons'
import { setupAcExHtmlLayoutMenu } from './AcExHtmlLayoutMenu'
import { setupAcExHtmlMeasurePanel } from './AcExHtmlMeasurePanel'
import { setupAcExHtmlMeasureSettings } from './AcExHtmlMeasureSettings'
import { setupAcExHtmlNavTools } from './AcExHtmlNavTools'
import { setupAcExHtmlReviewPanel } from './AcExHtmlReviewPanel'
import { acexSyncHtmlShortCutSelection } from './AcExHtmlShortCutSelection'
import { setupAcExHtmlShortCutToolbar } from './AcExHtmlShortCutToolbar'
import {
  setAcExHtmlParentChildIcon,
  setupAcExHtmlToolbarFlyouts
} from './AcExHtmlToolbarFlyout'
import {
  type AcExIdlePointerHost,
  acexIdlePointerStrategy
} from './AcExIdlePointerStrategy'
import {
  computeLayerExtentsMap,
  resolveLayoutViewExtents
} from './AcExLayerExtents'
import { AcExMarkupController, type AcExMarkupMode } from './AcExMarkup'
import { AcExMeasureController, type AcExMeasureMode } from './AcExMeasurement'
import {
  acexBindMobileSnapLoupe,
  acexHideMobileSnapLoupe,
  acexRefreshMobileSnapLoupe,
  acexSetMobileSnapLoupePreciseCapture
} from './AcExMobileSnapLoupe'
import { AcExOsnapIndex, estimateOsnapRebuildWork } from './AcExOsnap'
import { AcExOsnapMarker } from './AcExOsnapMarker'
import {
  loadAcExPackageLayoutOsnap,
  parseAcExPackageManifest,
  resolveChunkUrl,
  resolvePackageManifestUrl,
  snapshotSkeletonFromManifest
} from './AcExPackageLoader'
import type { AcExPackageManifest } from './AcExPackageTypes'
import {
  computeViewportCamera,
  findDrillThroughViewport,
  modelPointToPaper,
  paperPointToModel,
  snapshotHasPaperViewports,
  viewportPaperToModelScale
} from './AcExPaperViewport'
import {
  AcExCameraZoomUniform,
  createViewerLineMaterial,
  createViewerMeshMaterial,
  createViewerPointsMaterial
} from './AcExPatternSnapshot'
import { acexSelectionModeFromDrag } from './AcExSelectionBox'
import { setupAcExSessionDrawStyle } from './AcExSessionDrawStyle'
import { createAcExSessionHistory } from './AcExSessionHistory'
import {
  acexHideSimulatedMouseCursor,
  acexRefreshSimulatedMouseCursor
} from './AcExSimulatedMouseCursor'
import {
  ACEX_SNAP_LOUPE_INSET_PX,
  ACEX_SNAP_LOUPE_SIZE_PX,
  ACEX_SNAP_LOUPE_ZOOM,
  AcExSnapLoupe
} from './AcExSnapLoupe'
import { decodeSnapshot } from './AcExSnapshotCodec'
import { ACEX_MAX_COMPRESSED_BYTES } from './AcExSnapshotCompression'
import type {
  AcExExtents,
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch,
  AcExSnapshot,
  AcExViewerMode
} from './AcExSnapshotTypes'
import {
  acexIsSimulatedMouseEnabled,
  acexToggleSimulatedMouse,
  type AcExTouchPickHudHost,
  acexTouchPickStrategy
} from './AcExTouchPickStrategy'
import {
  acexShouldIgnoreCompatMouse,
  acexSinkFollowingClick,
  AcExTouchPointSession
} from './AcExTouchPointSession'
import { acexMaybeShowTouchPointTutorial } from './AcExTouchPointTutorial'
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
  loading.replaceChildren()
  const box = document.createElement('div')
  box.style.cssText =
    'padding:24px;color:#e8eaed;text-align:center;max-width:480px;line-height:1.5'
  box.textContent = message
  loading.appendChild(box)
  loading.classList.remove('mlcad-loading--done')
}

/**
 * Set by {@link bootstrap} once `render` exists so async IMAGE/OLE textures can
 * force a frame after decode (mesh materials start at opacity 0).
 */
let requestViewerTextureRepaint: (() => void) | null = null

/** Fallback when view mode omits the footer status bar. */
function createHiddenStatusSink(): HTMLElement {
  const el = document.createElement('div')
  el.hidden = true
  el.setAttribute('aria-hidden', 'true')
  return el
}

/** Keeps `#mlcad-status-bar` hidden when empty so it does not reserve chrome. */
function wireStatusBarVisibility(el: HTMLElement): void {
  const sync = () => {
    el.hidden = !el.textContent?.trim()
  }
  sync()
  const observer = new MutationObserver(sync)
  observer.observe(el, {
    characterData: true,
    childList: true,
    subtree: true
  })
}

const ACEX_HTML_THEME_STORAGE_KEY = 'mlcad-html-theme'

type AcExHtmlTheme = 'dark' | 'light'

function loadStoredTheme(): AcExHtmlTheme {
  try {
    const raw = localStorage.getItem(ACEX_HTML_THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    /* private mode */
  }
  return 'dark'
}

function applyHtmlTheme(theme: AcExHtmlTheme): void {
  document.documentElement.setAttribute('data-mlcad-theme', theme)
  try {
    localStorage.setItem(ACEX_HTML_THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode */
  }
  const btn = document.getElementById('mlcad-theme-btn')
  if (!btn) return
  const icon = btn.querySelector('.mlcad-tool-btn-icon')
  const label = btn.querySelector('.mlcad-tool-btn-label')
  // Match cad-simple-ui-plugin: show the current theme icon; the label is the
  // action (switch to the other theme).
  const nextKey = theme === 'light' ? 'toolbar.themeLight' : 'toolbar.themeDark'
  const nextIcon =
    theme === 'light' ? AcExHtmlIcons.themeLight : AcExHtmlIcons.themeDark
  const nextTitle = theme === 'light' ? 'Light' : 'Dark'
  if (icon) icon.innerHTML = nextIcon
  btn.setAttribute('data-i18n-key', nextKey)
  btn.setAttribute('data-i18n-attr', 'title aria-label')
  btn.setAttribute('title', nextTitle)
  btn.setAttribute('aria-label', nextTitle)
  if (label) {
    label.setAttribute('data-i18n-key', nextKey)
    label.setAttribute('data-i18n-text', '')
  }
}

/**
 * Syncs the simulated-mouse settings button label / active class with the
 * persisted preference.
 *
 * @param enabled - Current preference value.
 * @param i18n - Active i18n instance used to refresh visible labels.
 */
function syncSimulatedMouseButton(
  enabled: boolean,
  i18n: AcExHtmlI18n
): void {
  const btn = document.getElementById('mlcad-simulated-mouse-btn')
  if (!btn) return
  const key = enabled
    ? 'toolbar.simulatedMouseOn'
    : 'toolbar.simulatedMouseOff'
  btn.classList.toggle('active', enabled)
  btn.setAttribute('data-i18n-key', key)
  btn.setAttribute('data-i18n-attr', 'title aria-label')
  const title = i18n.t(key)
  btn.setAttribute('title', title)
  btn.setAttribute('aria-label', title)
  const label = btn.querySelector('.mlcad-tool-btn-label')
  if (label) {
    label.setAttribute('data-i18n-key', key)
    label.setAttribute('data-i18n-text', '')
    label.textContent = title
  }
}

/** Luminance heuristic matching live-viewer black/white background toggles. */
function isLightRgb(hex: number): boolean {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128
}

function invertNearBlackWhite(hex: number): number | null {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  // Near grayscale extremes only (ACI 7 / black ink).
  if (max - min > 16) return null
  if (max <= 40) return 0xffffff
  if (min >= 215) return 0x000000
  return null
}

function flipMaterialColor(material: THREE.Material): void {
  const colorMats = material as THREE.MeshBasicMaterial & {
    color?: THREE.Color
    uniforms?: { u_color?: { value: THREE.Color } }
  }
  if (colorMats.color?.getHex) {
    const next = invertNearBlackWhite(colorMats.color.getHex())
    if (next != null) colorMats.color.setHex(next)
  }
  const uniformColor = colorMats.uniforms?.u_color?.value
  if (uniformColor?.getHex) {
    const next = invertNearBlackWhite(uniformColor.getHex())
    if (next != null) uniformColor.setHex(next)
  }
}

function flipNearBlackWhiteMaterials(root: THREE.Object3D): void {
  root.traverse(obj => {
    const mat = (obj as THREE.Mesh).material
    if (!mat) return
    if (Array.isArray(mat)) {
      for (const m of mat) flipMaterialColor(m)
    } else {
      flipMaterialColor(mat)
    }
  })
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
  const packageEl = document.getElementById('mlcad-package')
  if (!root || (!snapshotEl && !packageEl)) {
    hideLoading()
    return
  }

  const i18n = new AcExHtmlI18n(detectAcExHtmlLocale())
  i18n.applyToDocument()

  const statusEl =
    document.getElementById('mlcad-status-bar') ?? createHiddenStatusSink()
  wireStatusBarVisibility(statusEl)

  let snapshot: AcExSnapshot
  let expiresAt: number | null = null
  let packageSession: {
    manifest: AcExPackageManifest
    manifestUrl: string
    loadedLayouts: Set<string>
    loadedOsnapLayouts: Set<string>
  } | null = null

  try {
    if (packageEl) {
      const config = JSON.parse(packageEl.textContent?.trim() || '{}') as {
        manifestUrl?: string
      }
      const manifestUrl = config.manifestUrl?.trim()
      if (!manifestUrl) {
        throw new Error('Missing manifestUrl in package config')
      }
      const absoluteManifestUrl = resolvePackageManifestUrl(
        manifestUrl,
        window.location.href
      )
      const manifestResponse = await fetch(absoluteManifestUrl)
      if (!manifestResponse.ok) {
        throw new Error(
          `Failed to load package manifest (${manifestResponse.status})`
        )
      }
      const manifest = parseAcExPackageManifest(await manifestResponse.json())
      snapshot = snapshotSkeletonFromManifest(manifest)
      packageSession = {
        manifest,
        manifestUrl: absoluteManifestUrl,
        loadedLayouts: new Set(),
        loadedOsnapLayouts: new Set()
      }
      removeSnapshotElement(packageEl)
    } else if (snapshotEl) {
      const resolved = await resolveSnapshotPayload(snapshotEl, i18n)
      if (!resolved) {
        return
      }
      expiresAt = resolved.expiresAt
      snapshot = decodeSnapshot(resolved.payload)
      removeSnapshotElement(snapshotEl)
    } else {
      hideLoading()
      return
    }
  } catch (error) {
    showViewerError(i18n.t('status.loadFailed', { error: String(error) }))
    return
  }

  const viewerMode: AcExViewerMode = snapshot.meta.viewerMode ?? 'measure'
  const measureEnabled = viewerMode === 'measure'

  if (snapshot.meta.docsBaseUrl) {
    acexSetDocsBaseUrl(snapshot.meta.docsBaseUrl)
  }

  const grip = snapshot.meta.grip
  root.style.setProperty('--ml-ui-grip-size', `${grip?.size ?? 8}px`)
  root.style.setProperty('--ml-ui-grip-normal', grip?.colorCss ?? '#0080ff')
  root.style.setProperty('--ml-ui-grip-hot', grip?.hotColorCss ?? '#ff0000')

  applyHtmlTheme(loadStoredTheme())
  syncSimulatedMouseButton(acexIsSimulatedMouseEnabled(), i18n)
  i18n.applyToDocument()

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

  const canvasHost = document.getElementById('mlcad-canvas-host') ?? root
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  canvasHost.insertBefore(renderer.domElement, canvasHost.firstChild)

  const scene = new THREE.Scene()
  const originalBackground = snapshot.meta.background >>> 0
  let backgroundSwapped = false
  scene.background = new THREE.Color(originalBackground)

  const getCanvasSize = () => ({
    width: canvasHost.clientWidth || window.innerWidth,
    height: canvasHost.clientHeight || window.innerHeight
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
  /** Orthographic camera used only for the snap-loupe scissor pass. */
  const loupeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
  loupeCamera.up.set(0, 1, 0)
  const savedViewportBox = new THREE.Vector4()
  /** DOM chrome (border and OSNAP glyph) for the snap loupe. */
  const snapLoupe = new AcExSnapLoupe(canvasHost)
  /** Last client sample while the loupe is visible; `null` when hidden. */
  let loupeSample: { clientX: number; clientY: number } | null = null

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

  const appendBatchesToScene = (
    lineBatches: AcExLineBatch[],
    meshBatches: AcExMeshBatch[],
    groups: Map<string, THREE.Group>,
    parent: THREE.Object3D,
    materials: LineMaterial[]
  ) => {
    for (const batch of lineBatches) {
      const object = createLineObject(batch, materials, wideLineResolution)
      if (object) getOrCreateLayerGroup(groups, parent, batch.layer).add(object)
    }
    for (const batch of meshBatches) {
      const object = batch.points
        ? createPointObject(batch)
        : createMeshObject(batch)
      if (object) getOrCreateLayerGroup(groups, parent, batch.layer).add(object)
    }
  }

  const populateLayoutGeometry = (
    next: AcExLayoutSnapshot,
    groups: Map<string, THREE.Group>,
    parent: THREE.Object3D,
    materials: LineMaterial[]
  ) => {
    appendBatchesToScene(
      next.lineBatches,
      next.meshBatches,
      groups,
      parent,
      materials
    )
  }

  /** Set after {@link render} exists; paints each package chunk as it arrives. */
  let paintPackageChunk: (() => void) | null = null

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

  const clearLayoutSceneGeometry = (target: AcExLayoutSnapshot) => {
    if (target.isModelSpace) {
      for (const group of modelLayerGroups.values()) {
        modelRoot.remove(group)
        disposeObject3D(group)
      }
      modelLayerGroups.clear()
      modelWideLineMaterials.length = 0
    } else {
      disposePaperGeometry()
    }
  }

  const loadPackageLayoutGeometry = async (
    target: AcExLayoutSnapshot
  ): Promise<void> => {
    if (!packageSession || packageSession.loadedLayouts.has(target.btrId)) {
      return
    }
    const layoutRef = packageSession.manifest.layouts.find(
      item => item.btrId === target.btrId
    )
    if (!layoutRef) {
      packageSession.loadedLayouts.add(target.btrId)
      return
    }
    const chunkById = new Map(
      packageSession.manifest.chunks.map(chunk => [chunk.id, chunk])
    )
    const chunks = layoutRef.chunkIds
      .map(id => chunkById.get(id))
      .filter((chunk): chunk is NonNullable<typeof chunk> => chunk != null)

    let loadedChunks = 0
    try {
      for (const chunkRef of chunks) {
        statusEl.textContent = i18n.t('status.loadingChunks', {
          loaded: String(loadedChunks),
          total: String(chunks.length)
        })
        const url = resolveChunkUrl(packageSession.manifestUrl, chunkRef.href)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(
            `Failed to load geometry chunk (${response.status})`
          )
        }
        const contentLength = response.headers.get('content-length')
        if (contentLength != null) {
          const declared = Number(contentLength)
          if (
            Number.isFinite(declared) &&
            declared > ACEX_MAX_COMPRESSED_BYTES
          ) {
            throw new Error('Geometry chunk exceeds size limit')
          }
        }
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength > ACEX_MAX_COMPRESSED_BYTES) {
          throw new Error('Geometry chunk exceeds size limit')
        }
        const compressed = new Uint8Array(buffer)
        const decoded = decodeChunkGzip(compressed)
        const lineStart = target.lineBatches.length
        const meshStart = target.meshBatches.length
        target.lineBatches.push(...decoded.lineBatches)
        target.meshBatches.push(...decoded.meshBatches)

        const isModel = target.isModelSpace
        appendBatchesToScene(
          target.lineBatches.slice(lineStart),
          target.meshBatches.slice(meshStart),
          isModel ? modelLayerGroups : paperLayerGroups,
          isModel ? modelRoot : paperRoot,
          isModel ? modelWideLineMaterials : paperWideLineMaterials
        )
        loadedChunks += 1
        statusEl.textContent = i18n.t('status.loadingChunks', {
          loaded: String(loadedChunks),
          total: String(chunks.length)
        })
        // Show this chunk immediately — do not wait for remaining downloads.
        paintPackageChunk?.()
        await accmYieldForPaint()
      }

      packageSession.loadedLayouts.add(target.btrId)
    } catch (error) {
      // Drop partial batches and scene objects so a retry cannot duplicate geometry.
      target.lineBatches.length = 0
      target.meshBatches.length = 0
      clearLayoutSceneGeometry(target)
      throw error
    }
  }

  /**
   * Downloads OSNAP after geometry is already visible. Multiple ACEO chunks are
   * fetched in parallel; viewing does not depend on this data.
   */
  const loadPackageLayoutOsnap = async (
    target: AcExLayoutSnapshot
  ): Promise<void> => {
    if (
      !packageSession ||
      !measureEnabled ||
      packageSession.loadedOsnapLayouts.has(target.btrId)
    ) {
      return
    }
    await loadAcExPackageLayoutOsnap(
      packageSession.manifest,
      packageSession.manifestUrl,
      target.btrId,
      target,
      {
        yieldFn: async () => {
          paintPackageChunk?.()
          await accmYieldForPaint()
        },
        onChunk: progress => {
          statusEl.textContent = i18n.t('status.loadingOsnap', {
            loaded: String(progress.loadedChunks),
            total: String(progress.totalChunks)
          })
        }
      }
    )
    packageSession.loadedOsnapLayouts.add(target.btrId)
  }

  // Attach roots before any progressive fetch so appended batches are visible.
  if (layout.isModelSpace) {
    scene.add(modelRoot)
  } else {
    scene.add(paperRoot)
    if (hasPaperViewports) {
      modelScene.add(modelRoot)
    }
  }

  if (!packageSession) {
    if (modelLayout) {
      populateLayoutGeometry(
        modelLayout,
        modelLayerGroups,
        modelRoot,
        modelWideLineMaterials
      )
    }
    if (!layout.isModelSpace) {
      populateLayoutGeometry(
        layout,
        paperLayerGroups,
        paperRoot,
        paperWideLineMaterials
      )
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

  const clearStatusBar = () => {
    statusEl.textContent = ''
    statusEl.hidden = true
  }

  const osnapIndexYield = (): Promise<void> =>
    // Prefer a macrotask over `accmYieldForPaint` / rAF: waiting a full frame
    // per slice turned million-edge hybrid indexes into multi-minute jobs.
    new Promise(resolve => {
      setTimeout(resolve, 0)
    })

  const rebuildOsnapForLoadedGeometry = async () => {
    if (!measureEnabled) return
    if (!osnapIndex) {
      osnapIndex = new AcExOsnapIndex()
      osnapMarker = new AcExOsnapMarker(root)
    }
    const workEstimate =
      estimateOsnapRebuildWork(layout) +
      (hasPaperViewports && modelLayout
        ? estimateOsnapRebuildWork(modelLayout)
        : 0)
    if (workEstimate > 8000) {
      statusEl.hidden = false
      statusEl.textContent = i18n.t('status.buildingOsnap')
      await accmYieldForPaint()
    }
    try {
      await osnapIndex.rebuildAsync(layout, osnapIndexYield)
      applyOsnapLayerVisibility(osnapIndex)
      if (hasPaperViewports && modelLayout) {
        if (!modelOsnapIndex) {
          modelOsnapIndex = new AcExOsnapIndex()
        }
        await modelOsnapIndex.rebuildAsync(modelLayout, osnapIndexYield)
        applyOsnapLayerVisibility(modelOsnapIndex)
      }
      if (!canSwitchLayouts) {
        releaseSnapshotOsnapCatalogs(snapshot)
      }
    } finally {
      clearStatusBar()
    }
  }

  // Create empty indexes now; hybrid rebuild runs after first paint so the
  // canvas is interactive while tessellated line snap is prepared.
  if (measureEnabled) {
    osnapIndex = new AcExOsnapIndex()
    osnapMarker = new AcExOsnapMarker(root)
  }

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
    AcExCameraZoomUniform.value = camera.zoom
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
    AcExCameraZoomUniform.value = camera.zoom
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
    // Keep OSNAP threshold and committed measure/markup overlays in sync when
    // the WebGL viewport / camera frustum change (window resize, tool strip, …).
    recomputeOsnapThresholdWcs()
    bumpSnapCacheKey()
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

  let readyStatus = ''

  const switchDrawingBackground = () => {
    backgroundSwapped = !backgroundSwapped
    const next = backgroundSwapped
      ? isLightRgb(originalBackground)
        ? 0x000000
        : 0xffffff
      : originalBackground
    scene.background = new THREE.Color(next)
    flipNearBlackWhiteMaterials(scene)
    flipNearBlackWhiteMaterials(modelScene)
    render()
  }

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

  /**
   * Hides the snap-loupe HUD and drops the last sample so the overlay pass
   * is skipped on the next frame.
   */
  const hideSnapLoupe = () => {
    loupeSample = null
    snapLoupe.hide()
  }

  /**
   * Positions the loupe HUD (and optional OSNAP glyph) around a client sample.
   * The sample is stored so the magnified overlay pass can draw on the next
   * frame.
   *
   * @param clientX - Sample X in client CSS pixels.
   * @param clientY - Sample Y in client CSS pixels.
   */
  const refreshSnapLoupeHud = (clientX: number, clientY: number) => {
    loupeSample = { clientX, clientY }
    const canvasRect = renderer.domElement.getBoundingClientRect()
    const canvasX = clientX - canvasRect.left
    const canvasY = clientY - canvasRect.top
    const { point, snap } = resolveMeasurePoint(clientX, clientY)
    if (snap) {
      const screen = wcsToScreen(point)
      snapLoupe.show(
        canvasX,
        canvasY,
        { x: screen.x - canvasRect.left, y: screen.y - canvasRect.top },
        snap.mode
      )
    } else {
      snapLoupe.show(canvasX, canvasY)
    }
  }

  let measure: AcExMeasureController | null = null
  let markup: AcExMarkupController | null = null
  const sessionHistory = createAcExSessionHistory()
  let measureSession: AcExCommandSessionUiState | null = null
  let markupSession: AcExCommandSessionUiState | null = null
  let sessionPanelVisible = false
  const sessionHost =
    document.getElementById('mlcad-canvas-host') ??
    document.getElementById('mlcad-root')
  const sessionPanel = sessionHost
    ? new AcExCommandSessionPanel(sessionHost, i18n)
    : null
  const drawerSheetsRef: {
    current: ReturnType<typeof setupAcExHtmlDrawerSheets> | null
  } = { current: null }
  const sessionDrawStyleRef: {
    current: ReturnType<typeof setupAcExSessionDrawStyle> | null
  } = { current: null }
  const shortCutToolbarRef: {
    current: ReturnType<typeof setupAcExHtmlShortCutToolbar> | null
  } = { current: null }

  const runSessionUndo = () => {
    if (measure?.canUndoLastVertex()) {
      measure.undoLastVertex()
      shortCutToolbarRef.current?.syncActionState()
      return
    }
    sessionHistory.undo()
    shortCutToolbarRef.current?.syncActionState()
  }
  const runSessionRedo = () => {
    sessionHistory.redo()
    shortCutToolbarRef.current?.syncActionState()
  }
  sessionHistory.subscribe(() => {
    shortCutToolbarRef.current?.syncActionState()
  })

  const syncHtmlShortCutSelection = () => {
    const toolbar = shortCutToolbarRef.current
    if (!toolbar) return
    acexSyncHtmlShortCutSelection({
      i18n,
      getKind: () => {
        if (measure?.isActive) return 'measure'
        if (markup?.isActive) return 'markup'
        if (measure?.hasSelection) return 'measure'
        if (markup?.hasSelection) return 'markup'
        return undefined
      },
      hasSelection: kind =>
        kind === 'measure'
          ? measure?.hasSelection === true
          : markup?.hasSelection === true,
      getStyle: kind => {
        const style =
          kind === 'measure' ? measure!.getDrawStyle() : markup!.getDrawStyle()
        return {
          color: style.color,
          fontSize: style.fontSize,
          textHeightMode: style.textHeightMode,
          textHeightWcs: style.textHeightWcs
        }
      },
      applyStyle: (kind, patch) => {
        if (kind === 'measure') measure!.setDrawStyle(patch)
        else markup!.setDrawStyle(patch)
      },
      wcsToScreen: p => wcsToScreen(new THREE.Vector2(p.x, p.y)),
      setExtensionItems: items => toolbar.setExtensionItems(items)
    })
    toolbar.syncActionState()
  }

  /** Saved side panels closed for canvas space during a draw session. */
  let chromeBeforeSession: {
    layerOpen: boolean
    reviewOpen: boolean
    measureOpen: boolean
  } | null = null
  const sessionChromeRef: {
    current: {
      hide: () => void
      restore: () => void
    }
  } = {
    current: {
      hide: () => undefined,
      restore: () => undefined
    }
  }
  const applySessionUi = () => {
    const state = measureSession ?? markupSession
    const nowVisible = state != null
    sessionPanel?.setState(state)
    sessionPanel?.setAccessory(
      state
        ? (sessionDrawStyleRef.current?.createSessionAccessory() ?? null)
        : null
    )
    drawerSheetsRef.current?.syncInset()
    if (nowVisible && !sessionPanelVisible) {
      sessionChromeRef.current.hide()
      void acexMaybeShowTouchPointTutorial(i18n)
    } else if (!nowVisible && sessionPanelVisible) {
      sessionChromeRef.current.restore()
    }
    sessionPanelVisible = nowVisible
    shortCutToolbarRef.current?.syncActionState()
  }
  sessionPanel?.setHandlers({
    onConfirm: () => {
      measure?.confirmSession()
    },
    onCancel: () => {
      if (measure?.isActive) measure.cancelSession()
      else markup?.cancelSession()
    },
    onChip: id => {
      if (id === 'undo') runSessionUndo()
    }
  })
  const measureSettingsRef: {
    current: ReturnType<typeof setupAcExHtmlMeasureSettings> | null
  } = { current: null }
  const toolbarFlyoutsRef: {
    current: ReturnType<typeof setupAcExHtmlToolbarFlyouts> | null
  } = { current: null }
  const layoutMenuRef: {
    current: ReturnType<typeof setupAcExHtmlLayoutMenu> | null
  } = { current: null }
  const navToolsRef: {
    current: ReturnType<typeof setupAcExHtmlNavTools> | null
  } = { current: null }
  let expiryMonitor: ReturnType<typeof setupAcExHtmlExpiryMonitor> | null = null

  const isToolActive = () =>
    measure?.isActive === true || markup?.isActive === true

  /** True while the snap loupe is open; one-finger pan stays off until it closes. */
  let preciseCaptureActive = false

  /**
   * Wires OrbitControls pan for idle nav vs drawing tools.
   *
   * Drawing tools keep mouse left-click free for picks, but one-finger touch
   * pan stays on until precise capture (loupe) so the canvas can still be
   * dragged before a long-press — matches cad-simple-viewer.
   */
  const setLeftPanForTools = () => {
    if (isToolActive()) {
      navToolsRef.current?.cancelZoomWindow()
    }
    const idlePan = navToolsRef.current?.isPanEnabled() ?? !isToolActive()
    const drawing = isToolActive()
    const navMode = navToolsRef.current?.getMode()
    const idleTouchPan =
      navMode != null && acexIdlePointerStrategy().enablesIdleTouchPan(navMode)
    setOrbitPanButtons(controls, {
      leftMousePan: idlePan,
      oneFingerPan:
        (idlePan || drawing || idleTouchPan) && !preciseCaptureActive
    })
    controls.enabled = !preciseCaptureActive
    sessionDrawStyleRef.current?.refresh()
    navToolsRef.current?.syncButtons()
  }

  /**
   * Disables navigation while the snap loupe tracks a long-press, then
   * restores idle / drawing pan rules.
   *
   * @param active - True when precise capture (loupe) is visible.
   */
  const setPreciseCaptureActive = (active: boolean) => {
    preciseCaptureActive = active
    setLeftPanForTools()
  }

  acexBindMobileSnapLoupe({
    refresh: refreshSnapLoupeHud,
    hide: hideSnapLoupe,
    setPreciseCaptureActive
  })

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
      AcExCameraZoomUniform.value = fitted.zoom
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
    AcExCameraZoomUniform.value = camera.zoom
  }

  /**
   * Fits an orthographic camera so `extents` fills a CSS rectangle of
   * `vpW` × `vpH`, matching {@link computeViewportCamera}.
   *
   * @param target - Camera to update.
   * @param extents - World box to show.
   * @param vpW - Target CSS width in pixels.
   * @param vpH - Target CSS height in pixels.
   * @param twist - Optional DVIEW twist in radians.
   */
  const applyOrthoFit = (
    target: THREE.OrthographicCamera,
    extents: AcExExtents,
    vpW: number,
    vpH: number,
    twist = 0
  ) => {
    const fitted = computeViewportCamera(extents, vpW, vpH)
    target.left = -fitted.aspect * fitted.frustum
    target.right = fitted.aspect * fitted.frustum
    target.top = fitted.frustum
    target.bottom = -fitted.frustum
    target.position.set(fitted.centerX, fitted.centerY, ACEX_CAMERA_DISTANCE)
    target.lookAt(fitted.centerX, fitted.centerY, 0)
    target.up.set(-Math.sin(twist), Math.cos(twist), 0)
    target.setRotationFromEuler(new THREE.Euler(0, 0, twist))
    target.zoom = fitted.zoom
    target.updateProjectionMatrix()
    AcExCameraZoomUniform.value = fitted.zoom
  }

  /**
   * Draws the magnified snap loupe into a screen-fixed scissor after the main
   * layout and paper viewports. Nested paper-space viewports that intersect
   * the loupe are scissor-clipped so model content stays visible inside it.
   */
  const renderSnapLoupe = () => {
    if (!loupeSample || !snapLoupe.isVisible) return
    const { width, height } = getCanvasSize()
    if (width <= 0 || height <= 0) return
    const half = ACEX_SNAP_LOUPE_SIZE_PX / ACEX_SNAP_LOUPE_ZOOM / 2
    const p1 = screenToWcs(
      loupeSample.clientX - half,
      loupeSample.clientY - half
    )
    const p2 = screenToWcs(
      loupeSample.clientX + half,
      loupeSample.clientY + half
    )
    const viewBox: AcExExtents = {
      minX: Math.min(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y),
      maxX: Math.max(p1.x, p2.x),
      maxY: Math.max(p1.y, p2.y)
    }
    const loupeRect = {
      x: ACEX_SNAP_LOUPE_INSET_PX,
      y: snapLoupe.topInsetPx,
      width: ACEX_SNAP_LOUPE_SIZE_PX,
      height: ACEX_SNAP_LOUPE_SIZE_PX
    }
    const gl = acexCssTopLeftRectToGl(loupeRect, height)
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.getViewport(savedViewportBox)
    renderer.setScissor(gl.x, gl.y, gl.width, gl.height)
    renderer.setScissorTest(true)
    renderer.setViewport(gl.x, gl.y, gl.width, gl.height)
    renderer.clear()
    applyOrthoFit(loupeCamera, viewBox, loupeRect.width, loupeRect.height)
    renderer.render(scene, loupeCamera)

    if (
      !layout.isModelSpace &&
      layout.viewports?.length &&
      modelRoot.children.length > 0
    ) {
      for (const viewport of layout.viewports) {
        const magRect = acexWcsBoxToCssRect(viewport.paper, viewBox, loupeRect)
        const hit = acexIntersectCssRects(magRect, loupeRect)
        if (!hit) continue
        const paperHit = acexCssRectToWcsBox(hit, viewBox, loupeRect)
        const corners = [
          paperPointToModel(viewport, paperHit.minX, paperHit.minY),
          paperPointToModel(viewport, paperHit.maxX, paperHit.minY),
          paperPointToModel(viewport, paperHit.maxX, paperHit.maxY),
          paperPointToModel(viewport, paperHit.minX, paperHit.maxY)
        ]
        const modelBox: AcExExtents = {
          minX: Math.min(...corners.map(c => c.x)),
          minY: Math.min(...corners.map(c => c.y)),
          maxX: Math.max(...corners.map(c => c.x)),
          maxY: Math.max(...corners.map(c => c.y))
        }
        const nestedGl = acexCssTopLeftRectToGl(hit, height)
        renderer.setScissor(
          nestedGl.x,
          nestedGl.y,
          nestedGl.width,
          nestedGl.height
        )
        renderer.setViewport(
          nestedGl.x,
          nestedGl.y,
          nestedGl.width,
          nestedGl.height
        )
        renderer.clearDepth()
        applyOrthoFit(
          loupeCamera,
          modelBox,
          hit.width,
          hit.height,
          viewport.twist ?? 0
        )
        renderer.render(modelScene, loupeCamera)
      }
    }

    renderer.setScissorTest(false)
    renderer.setViewport(
      savedViewportBox.x,
      savedViewportBox.y,
      savedViewportBox.z,
      savedViewportBox.w
    )
    renderer.autoClear = autoClear
    AcExCameraZoomUniform.value = camera.zoom
  }

  const render = () => {
    measure?.syncOverlays()
    markup?.syncOverlays()
    renderer.render(scene, camera)
    renderPaperViewports()
    renderSnapLoupe()
  }

  paintPackageChunk = () => {
    const next = computeLayerExtentsMap(
      layout.lineBatches,
      layout.meshBatches
    )
    layerExtents.clear()
    for (const [name, extents] of next) {
      layerExtents.set(name, extents)
    }
    render()
  }
  requestViewerTextureRepaint = () => {
    render()
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
        markup?.setPeerToolActive(measure?.isActive === true)
      },
      onSessionUi: state => {
        measureSession = state
        applySessionUi()
      },
      onStyleChange: () => {
        sessionDrawStyleRef.current?.refresh()
        syncHtmlShortCutSelection()
      },
      getActiveLayoutId: () => layout.btrId,
      sessionHistory,
      view: {
        screenToWcs,
        wcsToScreen,
        render,
        getSnapCacheKey: () => snapCacheKey,
        getCameraZoom: () => camera.zoom,
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
        formatAngle,
        zoomToExtents
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
        measure?.setPeerToolActive(markup?.isActive === true)
      },
      onSessionUi: state => {
        markupSession = state
        applySessionUi()
      },
      onStyleChange: () => {
        sessionDrawStyleRef.current?.refresh()
        syncHtmlShortCutSelection()
      },
      getTrackingOptions: () =>
        measureSettingsRef.current?.getTrackingOptions() ?? null,
      getActiveLayoutId: () => layout.btrId,
      sessionHistory,
      view: {
        screenToWcs,
        wcsToScreen,
        render,
        getSnapCacheKey: () => snapCacheKey,
        getCameraZoom: () => camera.zoom,
        resolvePoint: resolveMeasurePoint,
        zoomToExtents
      }
    })

    measureSettingsRef.current = setupAcExHtmlMeasureSettings({
      i18n,
      measure,
      angbase: snapshot.meta.units.angbase,
      angdir: snapshot.meta.units.angdir
    })

    sessionDrawStyleRef.current = setupAcExSessionDrawStyle({
      i18n,
      getKind: () => {
        if (measure?.isActive) return 'measure'
        if (markup?.isActive) return 'markup'
        if (measure && measure.hasSelection) return 'measure'
        if (markup?.hasSelection) return 'markup'
        return undefined
      },
      getStyle: kind => {
        const style =
          kind === 'measure' ? measure!.getDrawStyle() : markup!.getDrawStyle()
        return {
          color: style.color,
          fontSize: style.fontSize,
          textHeightMode: style.textHeightMode,
          textHeightWcs: style.textHeightWcs
        }
      },
      applyStyle: (kind, patch) => {
        if (kind === 'measure') {
          measure!.setDrawStyle(patch)
        } else {
          markup!.setDrawStyle(patch)
        }
      },
      wcsToScreen: p => wcsToScreen(new THREE.Vector2(p.x, p.y))
    })
    applySessionUi()
    syncHtmlShortCutSelection()
  }

  if (!shortCutToolbarRef.current) {
    shortCutToolbarRef.current = setupAcExHtmlShortCutToolbar({
      i18n,
      container: root,
      statusEl,
      actions: {
        undo: () => runSessionUndo(),
        redo: () => runSessionRedo(),
        erase: () => {
          if (markup?.hasSelection) {
            markup.deleteSelected()
            return
          }
          if (measure?.hasSelection) {
            measure.handleSelectionKeyDown('Delete')
          }
        }
      },
      getActionState: () => ({
        undo:
          measure?.canUndoLastVertex() === true || sessionHistory.canUndo(),
        redo: sessionHistory.canRedo(),
        erase:
          markup?.hasSelection === true || measure?.hasSelection === true
      })
    })
    syncHtmlShortCutSelection()
    shortCutToolbarRef.current.syncActionState()
  }

  const toolbarCollapse = setupToolbarCollapse(i18n, () => {
    toolbarFlyoutsRef.current?.close()
    layoutMenuRef.current?.close()
    measureSettingsRef.current?.close()
  })

  const closeLayerDrawer = () => {
    const layerDrawer = document.getElementById('mlcad-layer-drawer')
    const layersBtn = document.getElementById('mlcad-layers-btn')
    if (layerDrawer) layerDrawer.hidden = true
    layersBtn?.classList.remove('active')
    layersBtn?.setAttribute('aria-expanded', 'false')
  }

  let reviewPanel: ReturnType<typeof setupAcExHtmlReviewPanel> = null
  let measurePanel: ReturnType<typeof setupAcExHtmlMeasurePanel> = null

  const drawerSheets = setupAcExHtmlDrawerSheets({
    closeStrips: () => {
      toolbarFlyoutsRef.current?.close()
      layoutMenuRef.current?.close()
    }
  })
  drawerSheetsRef.current = drawerSheets

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
    ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    closeOtherDrawers: () => {
      reviewPanel?.close()
      measurePanel?.close()
    },
    onPhoneOpen: drawer => drawerSheets.preparePhoneOpen(drawer)
  })

  reviewPanel = setupAcExHtmlReviewPanel({
    i18n,
    getMarkup: () => markup,
    closeOtherDrawers: () => {
      closeLayerDrawer()
      measurePanel?.close()
    },
    onPhoneOpen: drawer => drawerSheets.preparePhoneOpen(drawer)
  })

  measurePanel = setupAcExHtmlMeasurePanel({
    i18n,
    getMeasure: () => measure,
    closeOtherDrawers: () => {
      closeLayerDrawer()
      reviewPanel?.close()
    },
    onPhoneOpen: drawer => drawerSheets.preparePhoneOpen(drawer)
  })

  // While measure/markup is active, hide the toolbar sidebar and any open
  // results / layer drawers so they do not compete with session chrome.
  // Do not resize the canvas — session UI floats over the existing viewport.
  sessionChromeRef.current = {
    hide: () => {
      if (chromeBeforeSession) return
      const reviewDrawer = document.getElementById('mlcad-review-drawer')
      const measureDrawer = document.getElementById('mlcad-measure-drawer')
      chromeBeforeSession = {
        layerOpen: layerPanel?.isOpen() === true,
        reviewOpen: reviewDrawer != null && !reviewDrawer.hidden,
        measureOpen: measureDrawer != null && !measureDrawer.hidden
      }
      toolbarFlyoutsRef.current?.close()
      layoutMenuRef.current?.close()
      measureSettingsRef.current?.close()
      if (chromeBeforeSession.layerOpen) layerPanel?.close()
      if (chromeBeforeSession.reviewOpen) reviewPanel?.close()
      if (chromeBeforeSession.measureOpen) measurePanel?.close()
      render()
    },
    restore: () => {
      const saved = chromeBeforeSession
      chromeBeforeSession = null
      if (saved?.layerOpen) layerPanel?.setOpen(true)
      if (saved?.reviewOpen) reviewPanel?.setOpen(true)
      if (saved?.measureOpen) measurePanel?.setOpen(true)
      render()
    }
  }

  const switchLayout = (btrId: string) => {
    void switchLayoutAsync(btrId)
  }

  const remountLayoutRoots = (
    target: AcExLayoutSnapshot,
    rebuildPaper: boolean
  ) => {
    layout = target
    if (target.isModelSpace) {
      scene.add(modelRoot)
    } else {
      scene.add(paperRoot)
      if (rebuildPaper) {
        populateLayoutGeometry(
          target,
          paperLayerGroups,
          paperRoot,
          paperWideLineMaterials
        )
        if (backgroundSwapped) {
          flipNearBlackWhiteMaterials(paperRoot)
        }
      }
      if (hasPaperViewports) {
        modelScene.add(modelRoot)
      }
    }
  }

  const switchLayoutAsync = async (btrId: string) => {
    if (btrId === layout.btrId) return
    const next = snapshot.layouts.find(item => item.btrId === btrId)
    if (!next) return

    const previousLayout = layout
    const previousWasPaper = !previousLayout.isModelSpace

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

    const needsPackageLoad =
      packageSession != null &&
      !packageSession.loadedLayouts.has(layout.btrId)

    if (needsPackageLoad && packageSession) {
      try {
        await loadPackageLayoutGeometry(layout)
        if (
          !layout.isModelSpace &&
          hasPaperViewports &&
          modelLayout &&
          !packageSession.loadedLayouts.has(modelLayout.btrId)
        ) {
          await loadPackageLayoutGeometry(modelLayout)
        }
      } catch (error) {
        statusEl.textContent = i18n.t('status.loadFailed', {
          error: String(error)
        })
        // Partial next geometry was cleared by loadPackageLayoutGeometry; restore prior layout.
        if (!next.isModelSpace) {
          disposePaperGeometry()
        }
        remountLayoutRoots(previousLayout, previousWasPaper)
        const restored = lastViewByLayout.get(previousLayout.btrId)
        if (restored) {
          flyTo(restored.centerX, restored.centerY, restored.zoom)
        } else {
          fit()
        }
        const restoredExtents = computeLayerExtentsMap(
          previousLayout.lineBatches,
          previousLayout.meshBatches
        )
        layerExtents.clear()
        for (const [name, extents] of restoredExtents) {
          layerExtents.set(name, extents)
        }
        layoutExtents = resolveLayoutViewExtents(previousLayout)
        layerPanel?.syncLayerZoomButtons()
        measure?.syncLayoutVisibility()
        markup?.syncLayoutVisibility()
        layoutMenuRef.current?.refresh()
        recomputeOsnapThresholdWcs()
        bumpSnapCacheKey()
        render()
        return
      }
    }

    if (layout.isModelSpace) {
      scene.add(modelRoot)
    } else {
      scene.add(paperRoot)
      // Fresh package load already uploaded batches; otherwise rebuild after dispose.
      if (!needsPackageLoad) {
        populateLayoutGeometry(
          layout,
          paperLayerGroups,
          paperRoot,
          paperWideLineMaterials
        )
      }
      if (backgroundSwapped) {
        flipNearBlackWhiteMaterials(paperRoot)
      }
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
      // Defer rebuild when ACEO sidecars are still pending — tessellating all
      // line/mesh batches first would freeze the UI and delay Network fetches.
      const layoutRef = packageSession?.manifest.layouts.find(
        item => item.btrId === layout.btrId
      )
      const pendingOsnap =
        packageSession != null &&
        measureEnabled &&
        !packageSession.loadedOsnapLayouts.has(layout.btrId) &&
        (layoutRef?.osnapChunkIds?.length ?? 0) > 0
      if (!pendingOsnap) {
        // Hybrid rebuild needs resident lineBatches when ACEO has no lines.
        const workEstimate = estimateOsnapRebuildWork(layout)
        if (workEstimate > 8000) {
          statusEl.textContent = i18n.t('status.buildingOsnap')
          await accmYieldForPaint()
        }
        try {
          await osnapIndex.rebuildAsync(layout, osnapIndexYield)
          for (const [name, visible] of layerVisible) {
            osnapIndex.setLayerHidden(name, visible === false)
          }
        } finally {
          clearStatusBar()
        }
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

    // OSNAP last: geometry is already on screen.
    if (packageSession && measureEnabled) {
      try {
        await loadPackageLayoutOsnap(layout)
        if (
          !layout.isModelSpace &&
          hasPaperViewports &&
          modelLayout
        ) {
          await loadPackageLayoutOsnap(modelLayout)
        }
        await rebuildOsnapForLoadedGeometry()
        bumpSnapCacheKey()
        render()
        measure?.refreshIdleStatus()
      } catch (error) {
        statusEl.textContent = i18n.t('status.loadFailed', {
          error: String(error)
        })
      }
    }
  }

  controls.addEventListener('change', () => {
    AcExCameraZoomUniform.value = camera.zoom
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
    root,
    screenToWcs,
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
    } else if (action === 'markup-panel') {
      measure?.cancelMode()
      markup?.cancelMode()
      const drawer = document.getElementById('mlcad-review-drawer')
      reviewPanel?.setOpen(Boolean(drawer?.hidden))
    } else if (action === 'measure-panel') {
      measure?.cancelMode()
      markup?.cancelMode()
      const drawer = document.getElementById('mlcad-measure-drawer')
      measurePanel?.setOpen(Boolean(drawer?.hidden))
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
    } else if (action === 'toggle-theme') {
      const current =
        (document.documentElement.getAttribute(
          'data-mlcad-theme'
        ) as AcExHtmlTheme | null) ?? 'dark'
      const next: AcExHtmlTheme = current === 'dark' ? 'light' : 'dark'
      applyHtmlTheme(next)
      i18n.applyToDocument()
    } else if (action === 'toggle-simulated-mouse') {
      const enabled = acexToggleSimulatedMouse()
      syncSimulatedMouseButton(enabled, i18n)
    } else if (action === 'switch-bg') {
      switchDrawingBackground()
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
          action === 'layout-menu' ||
          action === 'settings-menu' ||
          action === 'locale-menu'
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
    onStripChange: () => {
      drawerSheets.syncInset()
      resize()
      recomputeOsnapThresholdWcs()
      bumpSnapCacheKey()
      render()
    },
    onClose: menuId => {
      if (menuId === 'snap') {
        measureSettingsRef.current?.close()
      }
      // Measure / review results drawers are reparented onto the sidebar when
      // opened. Closing the tool strip must not dismiss an open results panel
      // (phone, pad, and desktop all dismiss the strip on child click).
    },
    onOpen: (menuId, menuRoot) => {
      layoutMenuRef.current?.close()
      if (acexHtmlIsPhoneLayout()) {
        closeLayerDrawer()
        reviewPanel?.close()
        measurePanel?.close()
      }
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
    closeOtherFlyouts: () => {
      toolbarFlyouts.close()
      if (acexHtmlIsPhoneLayout()) {
        closeLayerDrawer()
        reviewPanel?.close()
        measurePanel?.close()
      }
    }
  })

  i18n.setOnChange(() => {
    readyStatus = ''
    if (!measure?.isActive && !markup?.isActive) {
      measure?.refreshIdleStatus()
      markup?.refreshIdleStatus()
    }
    layerPanel?.refreshLayerLabels()
    reviewPanel?.refreshLabels()
    measurePanel?.refreshLabels()
    sessionPanel?.refreshLabels()
    measureSettingsRef.current?.refreshLabels()
    sessionDrawStyleRef.current?.refreshLabels()
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
    // Theme button keys may have been overwritten by applyToDocument; re-sync.
    applyHtmlTheme(
      (document.documentElement.getAttribute(
        'data-mlcad-theme'
      ) as AcExHtmlTheme | null) ?? 'dark'
    )
    i18n.applyToDocument()
    sessionDrawStyleRef.current?.refresh()
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
    toolbarFlyouts.syncLayout()
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
  // Defer CPU buffer release until after hybrid OSNAP when measure is on —
  // line snap is rebuilt from resident lineBatches.
  if (!canSwitchLayouts && !packageSession && !measureEnabled) {
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
  // Reveal the canvas before package chunks / OSNAP indexing finish so the
  // drawing paints while background work continues.
  hideLoading()

  if (!packageSession && measureEnabled) {
    try {
      await rebuildOsnapForLoadedGeometry()
      recomputeOsnapThresholdWcs()
      bumpSnapCacheKey()
      measure?.refreshIdleStatus()
      render()
    } catch (error) {
      showViewerError(i18n.t('status.loadFailed', { error: String(error) }))
    }
    if (!canSwitchLayouts) {
      releaseLayerGroupsGeometryCpuArrays(paperLayerGroups)
      releaseLayerGroupsGeometryCpuArrays(modelLayerGroups)
      releaseSnapshotBatchBuffers(snapshot)
    }
  }

  if (packageSession) {
    try {
      const firstPaintLayouts: AcExLayoutSnapshot[] = [layout]
      if (!layout.isModelSpace && hasPaperViewports && modelLayout) {
        firstPaintLayouts.push(modelLayout)
      }
      for (const target of firstPaintLayouts) {
        await loadPackageLayoutGeometry(target)
      }
      layoutExtents = resolveLayoutViewExtents(
        layout,
        snapshot.meta.viewExtents ?? snapshot.meta.extents
      )
      layerPanel?.syncLayerZoomButtons()
      recomputeOsnapThresholdWcs()
      bumpSnapCacheKey()
      measure?.refreshIdleStatus()
      render()

      // ACEO now holds curves/points only (lines come from geometry batches).
      // Load the small catalog first, then build a hybrid index while CPU
      // lineBatches are still resident — before releaseSnapshotBatchBuffers.
      if (measureEnabled) {
        for (const target of firstPaintLayouts) {
          await loadPackageLayoutOsnap(target)
        }
        await rebuildOsnapForLoadedGeometry()
        recomputeOsnapThresholdWcs()
        bumpSnapCacheKey()
        measure?.refreshIdleStatus()
        render()
      }

      if (!canSwitchLayouts) {
        releaseLayerGroupsGeometryCpuArrays(paperLayerGroups)
        releaseLayerGroupsGeometryCpuArrays(modelLayerGroups)
        releaseSnapshotBatchBuffers(snapshot)
      }
    } catch (error) {
      showViewerError(i18n.t('status.loadFailed', { error: String(error) }))
    }
  }
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

    const reviewDrawer = document.getElementById('mlcad-review-drawer')
    if (reviewDrawer) reviewDrawer.hidden = true
    document.querySelectorAll('[data-action="markup-panel"]').forEach(btn => {
      btn.classList.remove('active')
      btn.setAttribute('aria-pressed', 'false')
    })

    const measureDrawer = document.getElementById('mlcad-measure-drawer')
    if (measureDrawer) measureDrawer.hidden = true
    document.querySelectorAll('[data-action="measure-panel"]').forEach(btn => {
      btn.classList.remove('active')
      btn.setAttribute('aria-pressed', 'false')
    })

    closeStrips?.()
  }

  const syncToggle = () => {
    sidebar.classList.toggle('mlcad-sidebar--collapsed', collapsed)
    toggleBtn.innerHTML = collapsed
      ? AcExHtmlIcons.chevronDown
      : AcExHtmlIcons.chevronUp
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
  /** Close the review drawer when the layer drawer opens. */
  closeOtherDrawers?: () => void
  /** Phone: park the drawer and dismiss open strips. */
  onPhoneOpen?: (drawer: HTMLElement) => void
}

/** Handles returned by {@link setupLayerPanel} for locale-driven UI updates. */
interface AcExLayerPanelController {
  /** Reapplies `layers.zoomTo` labels on every per-layer zoom button. */
  refreshLayerLabels: () => void
  /** Enables/disables per-layer zoom after the active layout changes. */
  syncLayerZoomButtons: () => void
  /** Opens or closes the layer drawer. */
  setOpen: (open: boolean) => void
  /** Closes the layer drawer. */
  close: () => void
  /** Whether the layer drawer is currently open. */
  isOpen: () => boolean
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
    sortedLayerNames,
    closeOtherDrawers,
    onPhoneOpen
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
    zoomBtn.innerHTML = AcExHtmlIcons.zoomBox
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
    if (open) {
      closeOtherDrawers?.()
      onPhoneOpen?.(layerDrawer)
    }
    layerDrawer.hidden = !open
    layersBtn.classList.toggle('active', open)
    layersBtn.setAttribute('aria-expanded', String(open))
  }

  layersBtn.addEventListener('click', event => {
    event.stopPropagation()
    setDrawerOpen(layerDrawer.hidden)
  })

  layerClose?.addEventListener('click', () => setDrawerOpen(false))
  layerDrawer
    .querySelector('.mlcad-drawer-sheet-close')
    ?.addEventListener('click', () => setDrawerOpen(false))

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
    },
    setOpen: setDrawerOpen,
    close: () => setDrawerOpen(false),
    isOpen: () => !layerDrawer.hidden
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
  setOrbitPanButtons(controls, { leftMousePan: true, oneFingerPan: true })
  controls.update()
  return controls
}

/**
 * Configures OrbitControls mouse and touch pan independently.
 *
 * Idle pan: left mouse + one-finger touch. Drawing tools: one-finger touch
 * pan until precise capture, but no left-mouse pan so clicks still pick.
 * Select / loupe: middle mouse and two-finger gestures only.
 */
function setOrbitPanButtons(
  controls: OrbitControls,
  options: { leftMousePan: boolean; oneFingerPan: boolean }
): void {
  controls.mouseButtons = options.leftMousePan
    ? {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.PAN
      }
    : {
        MIDDLE: THREE.MOUSE.PAN
      }
  controls.touches = options.oneFingerPan
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

/**
 * Pointer wiring for {@link setupToolPointerInput}.
 */
interface AcExToolPointerInputOptions {
  /** Canvas (or host) that receives pointer events. */
  domElement: HTMLElement
  /** Overlay host for the selection rubber band. */
  root: HTMLElement
  /** Converts a client point to world XY. */
  screenToWcs: (clientX: number, clientY: number) => { x: number; y: number }
  /** Active measure controller, or `null` when measure is disabled. */
  getMeasure: () => AcExMeasureController | null
  /** Active markup controller, or `null` when markup is disabled. */
  getMarkup: () => AcExMarkupController | null
  /** Navigation tools (zoom-window, etc.), or `null` before they are created. */
  getNavTools: () => ReturnType<typeof setupAcExHtmlNavTools> | null
  /** Redraws the scene, overlays, paper viewports, and snap loupe. */
  render: () => void
}

/**
 * Left-button tool picking / selection on capture so selection can block
 * OrbitControls pan. While a drawing tool is active, mouse left-pan is off
 * (clicks pick) but one-finger touch pan stays on until the snap loupe opens.
 * Touch drawing tools defer commit until pointerup so a long-press can open
 * the loupe; jig preview also waits until that precise-capture phase.
 *
 * The snap loupe is driven through {@link acexRefreshMobileSnapLoupe} so
 * drawing picks and overlay grip drags share one implementation.
 *
 * @param options - Canvas, tool accessors, and render callback.
 */
function setupToolPointerInput(options: AcExToolPointerInputOptions): void {
  const {
    domElement,
    root,
    screenToWcs,
    getMeasure,
    getMarkup,
    getNavTools,
    render
  } = options
  let pendingMove: { clientX: number; clientY: number } | null = null
  let moveRaf = 0
  const touchSession = new AcExTouchPointSession()
  const touchPickHudHost: AcExTouchPickHudHost = {
    refreshSnapLoupe: (clientX, clientY) => {
      acexRefreshMobileSnapLoupe(clientX, clientY)
    },
    hideSnapLoupe: () => {
      acexHideMobileSnapLoupe()
    },
    refreshSimulatedCursor: (clientX, clientY) => {
      acexRefreshSimulatedMouseCursor(root, clientX, clientY)
    },
    hideSimulatedCursor: () => {
      acexHideSimulatedMouseCursor()
    }
  }
  const hideTouchPreciseHud = () => {
    acexHideMobileSnapLoupe()
    acexHideSimulatedMouseCursor()
  }
  const applyTouchPreciseSample = (fingerX: number, fingerY: number) => {
    const sample = acexTouchPickStrategy().mapFingerToSample(fingerX, fingerY)
    previewDrawingPoint(sample.x, sample.y)
    acexTouchPickStrategy().showPreciseHud(
      touchPickHudHost,
      sample.x,
      sample.y
    )
  }
  /** Idle box-select / zoom-window rubber band after a long-press or mouse down. */
  let boxGesture: {
    kind: 'select' | 'zoom-window'
    pointerId: number
    pointerType: string
    startX: number
    startY: number
    activated: boolean
  } | null = null
  const releaseBoxPointerCapture = (pointerId: number) => {
    try {
      if (domElement.hasPointerCapture(pointerId)) {
        domElement.releasePointerCapture(pointerId)
      }
    } catch {
      // Pointer may already be released.
    }
  }

  const selectionRect = document.createElement('div')
  selectionRect.id = 'mlcad-selection-rect'
  selectionRect.hidden = true
  root.appendChild(selectionRect)

  const hideSelectionRect = () => {
    selectionRect.hidden = true
  }

  const updateSelectionRect = (
    startX: number,
    startY: number,
    clientX: number,
    clientY: number,
    kind: 'select' | 'zoom-window'
  ) => {
    const left = Math.min(startX, clientX)
    const top = Math.min(startY, clientY)
    selectionRect.style.left = `${left}px`
    selectionRect.style.top = `${top}px`
    selectionRect.style.width = `${Math.abs(clientX - startX)}px`
    selectionRect.style.height = `${Math.abs(clientY - startY)}px`
    if (kind === 'select') {
      selectionRect.dataset.mode = acexSelectionModeFromDrag(startX, clientX)
    } else {
      delete selectionRect.dataset.mode
    }
    selectionRect.hidden = false
  }

  /**
   * Drops a coalesced pointer-move frame so it cannot revive OSNAP / jig
   * after a successful pick (or aborted touch gesture).
   */
  const cancelPendingPointerMove = () => {
    if (moveRaf !== 0) {
      cancelAnimationFrame(moveRaf)
      moveRaf = 0
    }
    pendingMove = null
  }

  /**
   * Whether measure or markup is currently drawing.
   *
   * @returns True when a drawing tool should receive the next pick.
   */
  const isDrawingToolActive = () =>
    getMeasure()?.isActive === true || getMarkup()?.isActive === true

  /**
   * Commits a measure or markup point at the given client sample.
   *
   * @param clientX - Sample X in client CSS pixels.
   * @param clientY - Sample Y in client CSS pixels.
   */
  const commitDrawingPoint = (clientX: number, clientY: number) => {
    // A move sample queued before this pick must not re-show the OSNAP glyph
    // after handlePointerDown clears it.
    cancelPendingPointerMove()
    const measure = getMeasure()
    const markup = getMarkup()
    if (measure?.isActive) {
      if (measure.handlePointerDown(clientX, clientY)) {
        if (measure.hasSelection) markup?.clearSelection()
        render()
      }
      return
    }
    if (markup?.isActive) {
      if (markup.handlePointerDown(clientX, clientY)) {
        if (markup.hasSelection) measure?.clearSelection()
        render()
      }
    }
  }

  /**
   * Updates the in-progress measure or markup preview without committing.
   *
   * @param clientX - Sample X in client CSS pixels.
   * @param clientY - Sample Y in client CSS pixels.
   */
  const previewDrawingPoint = (clientX: number, clientY: number) => {
    const measure = getMeasure()
    const markup = getMarkup()
    if (measure?.isActive) {
      measure.handlePointerMove(clientX, clientY)
      render()
      return
    }
    if (markup?.isActive) {
      markup.handlePointerMove(clientX, clientY)
      render()
    }
  }

  /**
   * Applies the latest coalesced pointer-move sample: tool preview, precise HUD
   * while long-pressing, or zoom-window rubber band.
   */
  const flushPointerMove = () => {
    moveRaf = 0
    const sample = pendingMove
    pendingMove = null
    if (!sample) return
    const measure = getMeasure()
    const markup = getMarkup()
    if (measure?.isActive) {
      if (touchSession.isLoupe) {
        applyTouchPreciseSample(sample.clientX, sample.clientY)
        render()
        return
      }
      measure.handlePointerMove(sample.clientX, sample.clientY)
      render()
      return
    }
    if (markup?.isActive) {
      if (touchSession.isLoupe) {
        applyTouchPreciseSample(sample.clientX, sample.clientY)
        render()
        return
      }
      markup.handlePointerMove(sample.clientX, sample.clientY)
      render()
      return
    }
    if (boxGesture?.activated) {
      if (boxGesture.kind === 'zoom-window') {
        getNavTools()?.handlePointerMove(sample.clientX, sample.clientY)
      } else {
        updateSelectionRect(
          boxGesture.startX,
          boxGesture.startY,
          sample.clientX,
          sample.clientY,
          boxGesture.kind
        )
      }
      return
    }
    getNavTools()?.handlePointerMove(sample.clientX, sample.clientY)
  }

  const idleNavMode = (): 'select' | 'pan' | 'zoom-window' | null => {
    if (isDrawingToolActive()) return null
    return getNavTools()?.getMode() ?? null
  }

  const applyClickSelect = (clientX: number, clientY: number): boolean => {
    const markup = getMarkup()
    const measure = getMeasure()
    if (markup?.handleSelectionPointerDown(clientX, clientY)) {
      if (markup.hasSelection) measure?.clearSelection()
      render()
      return true
    }
    if (measure?.handleSelectionPointerDown(clientX, clientY)) {
      if (measure.hasSelection) markup?.clearSelection()
      render()
      return true
    }
    return false
  }

  const applyBoxSelect = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    const a = screenToWcs(startX, startY)
    const b = screenToWcs(endX, endY)
    const box: AcExExtents = {
      minX: Math.min(a.x, b.x),
      minY: Math.min(a.y, b.y),
      maxX: Math.max(a.x, b.x),
      maxY: Math.max(a.y, b.y)
    }
    const mode = acexSelectionModeFromDrag(startX, endX)
    getMarkup()?.handleSelectionBox(box, mode)
    getMeasure()?.handleSelectionBox(box, mode)
    render()
  }

  const finishBoxGesture = (
    clientX: number,
    clientY: number,
    commit: boolean
  ) => {
    const gesture = boxGesture
    boxGesture = null
    hideSelectionRect()
    acexSetMobileSnapLoupePreciseCapture(false)
    if (gesture) releaseBoxPointerCapture(gesture.pointerId)
    // Compat mouse after touch, not a real mouse box-select.
    if (gesture?.pointerType === 'touch') acexSinkFollowingClick()
    if (!gesture) return
    if (!commit || !gesture.activated) {
      if (gesture.kind === 'zoom-window') {
        getNavTools()?.cancelZoomWindow()
      }
      return
    }
    const moved =
      Math.hypot(clientX - gesture.startX, clientY - gesture.startY) >= 8
    if (gesture.kind === 'zoom-window') {
      if (moved) {
        getNavTools()?.handlePointerDown(clientX, clientY)
      } else {
        getNavTools()?.cancelZoomWindow()
      }
      return
    }
    if (moved) {
      applyBoxSelect(gesture.startX, gesture.startY, clientX, clientY)
    } else {
      applyClickSelect(clientX, clientY)
    }
  }

  /**
   * Ends a touch pick. When `commit` is true, a short tap or loupe release
   * places the drawing point; otherwise the gesture is aborted.
   *
   * @param event - Pointer event that ended or cancelled the gesture.
   * @param commit - When false, abort without placing a point.
   */
  const endTouchPick = (event: PointerEvent, commit: boolean) => {
    if (event.pointerType !== 'touch') return
    if (touchSession.phase === 'idle') return
    if (event.pointerId !== touchSession.pointerId) return
    if (boxGesture) {
      const gesture = boxGesture
      const wasActivated = gesture.activated
      cancelPendingPointerMove()
      if (!commit) {
        if (!wasActivated && touchSession.isPicking) {
          return
        }
        touchSession.cancel()
        finishBoxGesture(event.clientX, event.clientY, false)
        render()
        return
      }
      const action = touchSession.end()
      if (action === 'ignore') {
        finishBoxGesture(event.clientX, event.clientY, false)
        render()
        return
      }
      if (!wasActivated) {
        boxGesture = null
        hideSelectionRect()
        acexSetMobileSnapLoupePreciseCapture(false)
        releaseBoxPointerCapture(gesture.pointerId)
        acexSinkFollowingClick()
        if (gesture.kind === 'select') {
          applyClickSelect(event.clientX, event.clientY)
        }
        return
      }
      finishBoxGesture(event.clientX, event.clientY, true)
      return
    }
    acexSetMobileSnapLoupePreciseCapture(false)
    // Loupe moves coalesce into RAF; cancel before commit/abort so a late
    // flush cannot set live pointer and bring the OSNAP glyph back.
    cancelPendingPointerMove()
    // Chrome synthesizes mouse pointerdown+click after touchup near the finger.
    // Without this, a two-point tool would commit the second point immediately
    // and clear the confirmed-point plus mark.
    acexSinkFollowingClick()
    if (!commit) {
      touchSession.cancel()
      hideTouchPreciseHud()
      render()
      return
    }
    const wasPrecise = touchSession.isLoupe
    const action = touchSession.end()
    hideTouchPreciseHud()
    if (action === 'commit') {
      if (wasPrecise) {
        const sample = acexTouchPickStrategy().mapFingerToSample(
          event.clientX,
          event.clientY
        )
        commitDrawingPoint(sample.x, sample.y)
      } else {
        commitDrawingPoint(event.clientX, event.clientY)
      }
    } else {
      render()
    }
  }

  const idlePointerHost: AcExIdlePointerHost = {
    navMode: () => idleNavMode(),
    shouldIgnoreCompatMouse: () => acexShouldIgnoreCompatMouse(),
    startTouchBox: (kind, event) => {
      // preventDefault only: do not stopImmediatePropagation so OrbitControls
      // still receives pointerdown and can pan if the finger moves first.
      event.preventDefault()
      boxGesture = {
        kind,
        pointerId: event.pointerId,
        pointerType: 'touch',
        startX: event.clientX,
        startY: event.clientY,
        activated: false
      }
      touchSession.start(event.pointerId, event.clientX, event.clientY, () => {
        if (!boxGesture || boxGesture.pointerId !== event.pointerId) return
        boxGesture.activated = true
        boxGesture.startX = touchSession.x
        boxGesture.startY = touchSession.y
        acexSetMobileSnapLoupePreciseCapture(true)
        if (kind === 'zoom-window') {
          getNavTools()?.handlePointerDown(touchSession.x, touchSession.y)
        } else {
          updateSelectionRect(
            touchSession.x,
            touchSession.y,
            touchSession.x,
            touchSession.y,
            kind
          )
        }
      })
      domElement.setPointerCapture(event.pointerId)
    },
    startMouseBox: event => {
      event.stopImmediatePropagation()
      boxGesture = {
        kind: 'select',
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        activated: true
      }
      try {
        domElement.setPointerCapture(event.pointerId)
      } catch {
        // Capture is best-effort so the rubber band tracks off-canvas.
      }
      updateSelectionRect(
        event.clientX,
        event.clientY,
        event.clientX,
        event.clientY,
        'select'
      )
    },
    finishMouseBox: (event, commit) => {
      if (!boxGesture || event.pointerId !== boxGesture.pointerId) {
        return false
      }
      if (boxGesture.pointerType === 'touch') return false
      finishBoxGesture(event.clientX, event.clientY, commit)
      return true
    },
    handleNavPointerDown: event => {
      if (getNavTools()?.handlePointerDown(event.clientX, event.clientY)) {
        event.stopImmediatePropagation()
        return true
      }
      return false
    },
    applyClickSelect: event => {
      if (!applyClickSelect(event.clientX, event.clientY)) return false
      event.stopImmediatePropagation()
      return true
    }
  }

  domElement.addEventListener(
    'pointerdown',
    event => {
      if (event.button !== 0) return
      if (event.pointerType !== 'touch' && acexShouldIgnoreCompatMouse()) {
        event.stopImmediatePropagation()
        return
      }
      const measure = getMeasure()
      const markup = getMarkup()
      if (event.pointerType === 'touch' && isDrawingToolActive()) {
        // Match cad-simple-viewer: keep the OS from turning a still finger into
        // scroll / context-menu `pointercancel` before the precise timer fires.
        event.preventDefault()
        touchSession.start(
          event.pointerId,
          event.clientX,
          event.clientY,
          () => {
            // Precise capture only: lock pan and start jig / HUD preview.
            acexSetMobileSnapLoupePreciseCapture(true)
            applyTouchPreciseSample(touchSession.x, touchSession.y)
            render()
          }
        )
        domElement.setPointerCapture(event.pointerId)
        return
      }
      if (measure?.isActive) {
        cancelPendingPointerMove()
        if (measure.handlePointerDown(event.clientX, event.clientY)) {
          if (measure.hasSelection) markup?.clearSelection()
          render()
        }
        return
      }
      if (markup?.isActive) {
        cancelPendingPointerMove()
        if (markup.handlePointerDown(event.clientX, event.clientY)) {
          if (markup.hasSelection) measure?.clearSelection()
          render()
        }
        return
      }
      acexIdlePointerStrategy().onPointerDown(event, idlePointerHost)
    },
    true
  )
  domElement.addEventListener('pointermove', event => {
    const measure = getMeasure()
    const markup = getMarkup()
    const zoomWindow = getNavTools()?.getMode() === 'zoom-window'
    if (event.pointerType === 'touch' && touchSession.phase !== 'idle') {
      if (event.pointerId !== touchSession.pointerId) return
      // Movement before the loupe aborts the pick so OrbitControls can pan.
      const moved = touchSession.move(event.clientX, event.clientY, true)
      if (moved === 'panning') {
        if (boxGesture) {
          boxGesture = null
          hideSelectionRect()
        }
        return
      }
      if (!touchSession.isLoupe) return
    }
    if (boxGesture && event.pointerId === boxGesture.pointerId) {
      if (boxGesture.activated) {
        pendingMove = { clientX: event.clientX, clientY: event.clientY }
        if (moveRaf === 0) {
          moveRaf = requestAnimationFrame(flushPointerMove)
        }
      }
      return
    }
    if (!measure?.isActive && !markup?.isActive && !zoomWindow) return
    pendingMove = { clientX: event.clientX, clientY: event.clientY }
    if (moveRaf === 0) {
      moveRaf = requestAnimationFrame(flushPointerMove)
    }
  })
  window.addEventListener('pointerup', event => {
    if (acexIdlePointerStrategy().onPointerUp(event, idlePointerHost)) return
    endTouchPick(event, true)
  })
  window.addEventListener('pointercancel', event => {
    if (acexIdlePointerStrategy().onPointerCancel(event, idlePointerHost)) {
      return
    }
    endTouchPick(event, false)
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
  if (batch.uvs && batch.uvs.length >= 2) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(batch.uvs, 2))
  }
  const material = createViewerMeshMaterial(batch, {
    onTextureLoad: () => {
      requestViewerTextureRepaint?.()
    }
  })
  const object = new THREE.Mesh(geometry, material)
  applyBatchPose(object, {
    offset: batch.offset,
    renderOrder: resolveMeshRenderOrder(batch)
  })
  return object
}

bootstrap()
