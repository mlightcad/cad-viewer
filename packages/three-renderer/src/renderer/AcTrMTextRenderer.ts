import { AcCmColor } from '@mlightcad/data-model'
import {
  ColorSettings,
  createDefaultColorSettings,
  DefaultFontsPreset,
  FontManager,
  type MemoryUsageReport,
  MESH_GLYPH_PLACEMENTS_USERDATA,
  type MeshFontRenderMode,
  type MeshGlyphPlacement,
  MTextData,
  MTextObject,
  RenderMode,
  ShapeData,
  StyleManager,
  type TextRenderProfileSnapshot,
  TextStyle,
  UnifiedRenderer
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrMeshGlyphWorldBatch } from '../batch/AcTrMeshGlyphWorldBatch'
import type { AcTrBatchHighlightKind } from '../batch/highlight'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../util'

class AcTrMTextStyleManager implements StyleManager {
  public unsupportedTextStyles: Record<string, number> = {}
  private _styleManager: AcTrStyleManager

  constructor(styeManager: AcTrStyleManager) {
    this._styleManager = styeManager
  }

  getMeshBasicMaterial(traits: ColorSettings): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(
      traits,
      this._styleManager.currentBackgroundColor
    )
    const { layerColor, layerColorRgb } = this.resolveLayerSwatch(traits)
    // Route MText glyph fills through the dedicated helper so their
    // linework-tier `drawOrder` semantics stay explicit even though
    // they are rasterized as meshes.
    return this._styleManager.getMTextFillMaterial(
      entityTraits,
      undefined,
      layerColor,
      layerColorRgb
    )
  }

  getLineBasicMaterial(traits: ColorSettings): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(
      traits,
      this._styleManager.currentBackgroundColor
    )
    const { layerColor, layerColorRgb } = this.resolveLayerSwatch(traits)
    return this._styleManager.getLineMaterial(
      entityTraits,
      true,
      undefined,
      layerColor,
      layerColorRgb
    )
  }

  /**
   * Inline `\C256` / entity ByLayer carry the resolved layer swatch on
   * {@link ColorSettings.byLayerColor}. Pass it into material *creation*
   * so ByLayer glyphs are not born white — never mutate a shared cached
   * material after the fact (that recolours unrelated glyphs).
   */
  private resolveLayerSwatch(traits: ColorSettings): {
    layerColor?: AcCmColor
    layerColorRgb?: number
  } {
    if (traits.color.aci !== 256) {
      return {}
    }
    const rgb = traits.byLayerColor
    if (typeof rgb !== 'number') {
      return {}
    }
    return {
      layerColor: new AcCmColor().setRGBValue(rgb),
      layerColorRgb: rgb
    }
  }
}

/**
 * Singleton class for managing MText rendering using WebWorkerRenderer
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _workerUrl?: string | URL
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string
  private _renderMode?: RenderMode
  private _styleManager?: AcTrStyleManager
  private _defaultFonts?: DefaultFontsPreset | string | readonly string[]
  private _lazyFontLoading?: boolean
  private _awaitFontsBeforeDraw?: boolean
  /** Optional override for TrueType fill vs contour stroke (OPENPROF A/B). */
  private _meshFontRenderMode?: MeshFontRenderMode
  /**
   * When true, MTEXT mesh glyphs emit placements for
   * {@link AcTrMeshGlyphWorldBatch} instead of per-entity merged meshes.
   * Effective only on main-thread render mode (worker falls back to merge).
   */
  private _meshGlyphInstancing = true
  private _meshGlyphBatch = new AcTrMeshGlyphWorldBatch()
  /**
   * Fonts successfully pushed into the active worker pool (or main renderer)
   * via {@link loadFonts}. Cleared when the unified renderer is destroyed.
   */
  private _rendererLoadedFonts = new Set<string>()
  /** Complex-linetype shared glyph group draws (OPENPROF). */
  private _sharedGlyphDrawCount = 0

  private constructor() {
    // Do nothing for now
  }

  /** Increments when a complex-linetype shared glyph group is drawn. */
  noteSharedGlyphDraw(): void {
    this._sharedGlyphDrawCount++
  }

  /** Returns and clears the shared-glyph draw counter. */
  takeSharedGlyphDrawCount(): number {
    const count = this._sharedGlyphDrawCount
    this._sharedGlyphDrawCount = 0
    return count
  }

  /**
   * Get the singleton instance of AcTrMTextRenderer
   */
  public static getInstance(): AcTrMTextRenderer {
    if (!AcTrMTextRenderer._instance) {
      AcTrMTextRenderer._instance = new AcTrMTextRenderer()
    }
    return AcTrMTextRenderer._instance
  }

  /**
   * Override text renderer's default style manager with cad-viewer's style manager so
   * that cad-viewer's style manager can manage materials used by texts too.
   * @param value - New style manager
   */
  overrideStyleManager(value: AcTrStyleManager) {
    this._styleManager = value
    // Apply immediately when the unified renderer already exists (e.g. re-init
    // or late override). Otherwise reconstruct would keep DefaultStyleManager
    // materials without `isForeground` tracking.
    if (this._renderer) {
      const styleManager = new AcTrMTextStyleManager(value)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /**
   * Set URL to load fonts
   * @param value - URL to load fonts
   */
  setFontUrl(value: string) {
    this._fontUrl = value
    void this.applyFontUrl()
  }

  /**
   * Set render mode to use by mtext renderer
   * @param mode - Render mode
   */
  setRenderMode(mode: RenderMode) {
    this._renderMode = mode
    if (mode === 'worker') {
      // Placement / InstancedMesh path is main-thread only; drop any live batch.
      this._meshGlyphBatch.dispose()
      this._meshGlyphBatch = new AcTrMeshGlyphWorldBatch()
    }
    if (this._renderer) {
      this._renderer.setDefaultMode(mode)
      this.applyFontUrl()
    }
  }

  /**
   * Current MText render mode (`worker` by default until {@link setRenderMode}).
   */
  getRenderMode(): RenderMode {
    return this._renderMode ?? 'worker'
  }

  /**
   * Sets the default text and symbol font fallback chains on the active renderer
   * and syncs them to Web Workers.
   *
   * @param fonts - A preset name, a single font name, or an ordered list of font names
   */
  async setDefaultFonts(
    fonts: DefaultFontsPreset | string | readonly string[]
  ): Promise<void> {
    this._defaultFonts = fonts
    await this.applyDefaultFonts()
  }

  /**
   * Mirrors {@link FontManager.lazyFontLoading} onto the main thread and worker pool.
   */
  async setLazyFontLoading(enabled: boolean): Promise<void> {
    this._lazyFontLoading = enabled
    FontManager.instance.lazyFontLoading = enabled
    await this.applyLazyFontLoading()
  }

  /**
   * When true with lazy loading, {@link asyncRenderMText} / {@link asyncRenderShape}
   * wait for referenced fonts before building glyph geometry.
   */
  async setAwaitFontsBeforeDraw(enabled: boolean): Promise<void> {
    this._awaitFontsBeforeDraw = enabled
    FontManager.instance.awaitFontsBeforeDraw = enabled
    await this.applyAwaitFontsBeforeDraw()
  }

  /**
   * Loads fonts into the active renderer (main thread and/or worker pool).
   *
   * Skips faces already synced into this renderer session so open-time
   * preload (and later background fallback loads) do not re-parse large mesh
   * fonts into every worker.
   *
   * Use for style faces and for fallback faces that
   * {@link FontManager.awaitFontsBeforeDraw} only requests in the background —
   * e.g. {@link FontManager.getFontsToLoad} — so glyph draw does not bake
   * permanent '?' placeholders.
   *
   * @returns Names that were actually sent to the renderer this call.
   */
  async loadFonts(
    fonts: readonly string[],
    options?: { scope?: 'one' | 'all' }
  ): Promise<string[]> {
    this.ensureRendererCreated()
    if (!this._renderer || fonts.length === 0) {
      return []
    }
    const pending = fonts.filter(name => {
      const key = normalizeRendererFontKey(name)
      return !!key && !this._rendererLoadedFonts.has(key)
    })
    if (pending.length === 0) {
      return []
    }
    await this._renderer.loadFonts(pending, options)
    for (const name of pending) {
      const key = normalizeRendererFontKey(name)
      if (key) {
        this._rendererLoadedFonts.add(key)
      }
    }
    return pending
  }

  /**
   * Fonts already synced into the active renderer via {@link loadFonts}.
   * Useful for OPENPERF / diagnostics.
   */
  getRendererLoadedFontCount(): number {
    return this._rendererLoadedFonts.size
  }

  /**
   * Replaces session-scoped missed-font bookkeeping on the main thread and workers.
   */
  async replaceMissedFonts(fonts: Record<string, number>): Promise<void> {
    if (this._renderer) {
      await this._renderer.replaceMissedFonts(fonts)
      return
    }
    FontManager.instance.replaceMissedFonts(fonts)
  }

  /** Clears session-scoped missed-font bookkeeping on the main thread and workers. */
  async clearMissedFonts(): Promise<void> {
    await this.replaceMissedFonts({})
  }

  /**
   * Overrides how TrueType/OTF glyphs are drawn (`mesh` fill vs `line` stroke).
   * Pass `undefined` to leave each {@link MTextData.meshFontRenderMode} unchanged.
   */
  setMeshFontRenderMode(mode: MeshFontRenderMode | undefined): void {
    this._meshFontRenderMode = mode
  }

  getMeshFontRenderMode(): MeshFontRenderMode | undefined {
    return this._meshFontRenderMode
  }

  /**
   * Enables scene-level mesh-glyph InstancedMesh batching (skips per-entity
   * mergeMesh). Default on. Effective only when render mode is `main`
   * (worker mode keeps merge).
   */
  setMeshGlyphInstancing(enabled: boolean): void {
    this._meshGlyphInstancing = enabled
    if (!enabled) {
      this.resetMeshGlyphBatch()
    }
  }

  /**
   * True when mesh-glyph InstancedMesh batching is preferred **and** the
   * active render mode is main-thread (worker cannot carry BufferGeometry
   * placements across postMessage).
   */
  getMeshGlyphInstancing(): boolean {
    return this._meshGlyphInstancing && this.getRenderMode() !== 'worker'
  }

  /**
   * Disposes live InstancedMeshes / slot maps and installs an empty batch.
   * Call when the active scene is cleared (not when parking a multi-doc session).
   */
  resetMeshGlyphBatch(): void {
    this._meshGlyphBatch.dispose()
    this._meshGlyphBatch = new AcTrMeshGlyphWorldBatch()
  }

  /**
   * Detaches the active mesh-glyph batch so a document session can park it
   * with its scene. Installs an empty batch for the next document.
   */
  detachMeshGlyphBatch(): AcTrMeshGlyphWorldBatch {
    const previous = this._meshGlyphBatch
    this._meshGlyphBatch = new AcTrMeshGlyphWorldBatch()
    return previous
  }

  /**
   * Restores a parked mesh-glyph batch when switching back to a document.
   * Disposes any batch currently attached to this renderer.
   */
  attachMeshGlyphBatch(batch: AcTrMeshGlyphWorldBatch): void {
    if (this._meshGlyphBatch === batch) {
      return
    }
    this._meshGlyphBatch.dispose()
    this._meshGlyphBatch = batch
  }

  /**
   * Queues placements from one drawn MText object (reads
   * {@link MESH_GLYPH_PLACEMENTS_USERDATA}).
   *
   * Bakes each placement into **world space** using `object`'s hierarchy
   * (call after the MText root is parented under the entity and
   * `updateMatrixWorld` has run).
   */
  enqueueMeshGlyphPlacementsFromObject(
    object: THREE.Object3D,
    meta: {
      objectId: string
      layerName: string
      ownerId?: string
      visible?: boolean
    }
  ): number {
    if (!this.getMeshGlyphInstancing() || !meta.objectId) {
      return 0
    }
    let queued = 0
    object.updateMatrixWorld(true)
    object.traverse(node => {
      const placements = node.userData?.[MESH_GLYPH_PLACEMENTS_USERDATA] as
        | MeshGlyphPlacement[]
        | undefined
      const material = node.userData?.meshGlyphMaterial as
        | THREE.Material
        | undefined
      if (!placements?.length || !material) {
        return
      }
      const baked = AcTrMeshGlyphWorldBatch.bakeWorldMatrices(node, placements)
      const byGeom = new Map<
        string,
        { geometry: THREE.BufferGeometry; matrices: Float32Array[] }
      >()
      for (const item of baked) {
        let group = byGeom.get(item.geometry.uuid)
        if (!group) {
          group = { geometry: item.geometry, matrices: [] }
          byGeom.set(item.geometry.uuid, group)
        }
        group.matrices.push(item.matrixElements)
      }
      for (const group of byGeom.values()) {
        this._meshGlyphBatch.enqueue(
          group.matrices,
          group.geometry,
          material,
          meta
        )
        queued += group.matrices.length
      }
      delete node.userData[MESH_GLYPH_PLACEMENTS_USERDATA]
      delete node.userData.meshGlyphMaterial
    })
    return queued
  }

  /**
   * Builds InstancedMeshes. Prefer layer-group parents so layer on/off works.
   * Call after deferred glyph `asyncDraw` drains.
   */
  flushMeshGlyphInstances(
    fallbackParent: THREE.Object3D,
    resolveLayerParent?: (
      layerName: string,
      ownerId: string
    ) => THREE.Object3D | undefined | null
  ): {
    placements: number
    buckets: number
  } {
    const placements = this._meshGlyphBatch.placementCount
    const bucketsBefore = this._meshGlyphBatch.bucketCount
    this._meshGlyphBatch.flush(fallbackParent, resolveLayerParent)
    return { placements, buckets: bucketsBefore }
  }

  /** Syncs InstancedMesh slots when an entity is shown/hidden. */
  setMeshGlyphVisible(objectId: string, visible: boolean): boolean {
    if (!this._meshGlyphInstancing || !objectId) {
      return false
    }
    return this._meshGlyphBatch.setVisibleByObjectId(objectId, visible)
  }

  /** Drops InstancedMesh slots when an entity is removed from the scene. */
  removeMeshGlyphInstances(objectId: string): boolean {
    if (!this._meshGlyphInstancing || !objectId) {
      return false
    }
    return this._meshGlyphBatch.removeByObjectId(objectId)
  }

  /**
   * Selection/hover tint for scene-level mesh-glyph instances.
   * No-op when instancing is off or the entity has no glyph slots.
   */
  setMeshGlyphHighlight(
    objectId: string,
    kind: AcTrBatchHighlightKind,
    enabled: boolean
  ): boolean {
    if (!this._meshGlyphInstancing || !objectId) {
      return false
    }
    return this._meshGlyphBatch.setHighlightByObjectId(objectId, kind, enabled)
  }

  /**
   * Ray-tests scene-level mesh-glyph instances for one selectable object id.
   * Complements {@link AcTrBatchedGroup.isIntersectWith} after placements are
   * stolen into InstancedMeshes.
   */
  intersectMeshGlyphObjectId(
    objectId: string,
    raycaster: THREE.Raycaster
  ): boolean {
    if (!this.getMeshGlyphInstancing() || !objectId) {
      return false
    }
    return this._meshGlyphBatch.intersectsObjectId(objectId, raycaster)
  }

  /**
   * Selectable object ids whose mesh-glyph world AABB intersects `box`.
   * Covers INSERT text missing from spatial-index child boxes.
   */
  queryMeshGlyphObjectIdsIntersectingBox(box: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }): string[] {
    if (!this.getMeshGlyphInstancing()) {
      return []
    }
    return this._meshGlyphBatch.queryObjectIdsIntersectingBox(box)
  }

  /** World pick boxes from the latest mesh-glyph flush. */
  getMeshGlyphWorldPickBoxes(): ReadonlyMap<string, THREE.Box3> {
    return this._meshGlyphBatch.getWorldPickBoxes()
  }

  /**
   * Enables {@link TextRenderProfiler} on the unified renderer (main + workers).
   */
  async setTextRenderProfilerEnabled(enabled: boolean): Promise<void> {
    this.ensureRendererCreated()
    await this._renderer?.setTextRenderProfilerEnabled(enabled)
  }

  /** Merged main/worker text-render timing snapshot. */
  getTextRenderProfile(): TextRenderProfileSnapshot | null {
    return this._renderer?.getTextRenderProfile() ?? null
  }

  resetTextRenderProfiler(): void {
    this._renderer?.resetTextRenderProfiler()
  }

  private applyMeshFontRenderMode(mtextContent: MTextData): MTextData {
    let next = mtextContent
    if (
      this._meshFontRenderMode &&
      mtextContent.meshFontRenderMode !== this._meshFontRenderMode
    ) {
      next = {
        ...next,
        meshFontRenderMode: this._meshFontRenderMode
      }
    }
    // Callers may force `'merge'` (PDF glyph extract, tests). Only default to
    // placement when the mode is left unspecified.
    if (this.getMeshGlyphInstancing() && next.meshGlyphOutputMode == null) {
      next = {
        ...next,
        meshGlyphOutputMode: 'placement'
      }
    }
    return next
  }

  /**
   * Render MText using the current mode asynchronously
   */
  async asyncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    const mtext = await this._renderer!.asyncRenderMText(
      this.applyMeshFontRenderMode(mtextContent),
      textStyle,
      colorSettings
    )
    return mtext
  }

  /**
   * Render MText using the current mode synchronously
   */
  syncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    this.ensureRendererCreated()
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    const mtext = this._renderer.syncRenderMText(
      this.applyMeshFontRenderMode(mtextContent),
      textStyle,
      colorSettings
    )
    return mtext
  }

  async asyncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    return this._renderer.asyncRenderShape(
      shapeContent,
      textStyle,
      colorSettings
    )
  }

  syncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    this.ensureRendererCreated()
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    return this._renderer.syncRenderShape(
      shapeContent,
      textStyle,
      colorSettings
    )
  }

  /**
   * Initialize the renderer.
   *
   * When render mode is `main`, the unified renderer is created without
   * eagerly spawning web workers. The worker URL is still stored so worker
   * mode can be enabled later if needed.
   *
   * @param workerUrl - URL to the worker script used when render mode is `worker`
   */
  initialize(workerUrl?: string | URL): void {
    if (workerUrl !== undefined) {
      this._workerUrl = workerUrl
    }

    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this._rendererLoadedFonts.clear()

    const mode = this._renderMode ?? 'worker'
    const workerConfig = this._workerUrl ? { workerUrl: this._workerUrl } : {}

    if (mode === 'worker') {
      if (!this._workerUrl) {
        throw new Error(
          'AcTrMTextRenderer worker URL is required for worker render mode'
        )
      }
      this._renderer = new UnifiedRenderer('worker', workerConfig)
    } else {
      this._renderer = new UnifiedRenderer('main', workerConfig)
    }

    if (this._renderMode) {
      this._renderer.setDefaultMode(this._renderMode)
    }

    void this.applyFontUrl()
    void this.applyDefaultFonts()
    void this.applyLazyFontLoading()
    void this.applyAwaitFontsBeforeDraw()
    if (this._styleManager) {
      const styleManager = new AcTrMTextStyleManager(this._styleManager)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /**
   * Estimates memory used by mtext-renderer (loaded fonts, caches, workers).
   *
   * Prefers {@link UnifiedRenderer.estimateMemoryUsage} when the renderer is
   * initialized; otherwise falls back to the main-thread {@link FontManager}.
   */
  async estimateMemoryUsage(): Promise<MemoryUsageReport> {
    if (this._renderer) {
      return this._renderer.estimateMemoryUsage()
    }

    const mainThread = FontManager.instance.estimateMemoryUsage({ id: 'main' })
    return {
      collectedAt: Date.now(),
      totalEstimatedBytes: mainThread.totalEstimatedBytes,
      mainThread,
      workers: [],
      indexedDbFontCache: {
        fontCount: 0,
        totalBytes: 0,
        fonts: []
      }
    }
  }

  /**
   * Dispose of the renderer and reset cached configuration.
   */
  dispose(): void {
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this._rendererLoadedFonts.clear()
    this._workerUrl = undefined
    this._renderMode = undefined
    this._defaultFonts = undefined
    this._lazyFontLoading = undefined
    this._awaitFontsBeforeDraw = undefined
  }

  /**
   * Dispose and discard the singleton instance.
   */
  public static resetInstance(): void {
    AcTrMTextRenderer.getInstance().dispose()
    AcTrMTextRenderer._instance = null
  }

  private ensureRendererCreated() {
    if (!this._renderer && this._workerUrl) {
      this.initialize(this._workerUrl)
    }
  }

  private async applyFontUrl() {
    if (this._renderer && this._fontUrl) {
      await this._renderer.setFontUrl(this._fontUrl)
    }
  }

  private async applyDefaultFonts() {
    if (this._renderer && this._defaultFonts !== undefined) {
      await this._renderer.setDefaultFonts(this._defaultFonts)
    }
  }

  private async applyLazyFontLoading() {
    if (this._renderer && this._lazyFontLoading !== undefined) {
      await this._renderer.setLazyFontLoading(this._lazyFontLoading)
    }
  }

  private async applyAwaitFontsBeforeDraw() {
    if (this._renderer && this._awaitFontsBeforeDraw !== undefined) {
      await this._renderer.setAwaitFontsBeforeDraw(this._awaitFontsBeforeDraw)
    }
  }
}

function normalizeRendererFontKey(fontName: string): string {
  if (fontName == null) return ''
  let name = String(fontName).trim()
  if (!name) return ''
  const dotIndex = name.lastIndexOf('.')
  if (
    dotIndex > 0 &&
    (dotIndex === name.length - 4 || dotIndex === name.length - 5)
  ) {
    name = name.substring(0, dotIndex)
  }
  return name.toLowerCase()
}
