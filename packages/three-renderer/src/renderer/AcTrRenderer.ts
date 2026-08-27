import {
  AcCmEventManager,
  acdbDrawTessellateOptions,
  AcGeArea2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGiFontMapping,
  AcGiImageStyle,
  AcGiMTextData,
  AcGiPointStyle,
  AcGiRenderer,
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { FontManager } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import type { AcTrBatchDrawPolicy } from '../draw/AcTrBatchDrawPolicy'
import {
  AcTrEntity,
  AcTrGroup,
  AcTrImage,
  AcTrLine,
  AcTrLineSegments,
  AcTrMText,
  AcTrObject,
  AcTrPoint,
  AcTrPolygon,
  AcTrShape
} from '../object'
import { AcTrMaterialManager } from '../style/AcTrMaterialManager'
import { AcTrLinePatternShaderProbe } from '../style/AcTrLinePatternShaderProbe'
import { AcTrSubEntityTraitsUtil } from '../util'
import { AcTrCamera } from '../viewport/AcTrCamera'
import {
  AcTrEntityPreview,
  type AcTrEntityPreviewOptions,
  type AcTrEntityPreviewResult
} from './AcTrEntityPreview'
import { AcTrMTextRenderer } from './AcTrMTextRenderer'
import { AcTrRenderContext } from './AcTrRenderContext'

/** Event payload when a mapped font cannot be resolved during rendering. */
export interface AcTrFontNotFoundEventArgs {
  /** Name of the font that could not be found. */
  fontName: string
  /** Number of characters using this font; set when the font is missing. */
  count?: number
}

/**
 * Lifecycle state for the direct-batch draw-call capture session.
 *
 * - `'off'`: capture is inactive; draw methods build full entity geometry.
 * - `'capturing'`: waiting for the first matching primitive draw call.
 * - `'captured'`: exactly one compatible draw call was recorded.
 * - `'missed'`: a second call, an incompatible call, or an empty primitive
 *   aborted the session (caller should fall back to the legacy path).
 *
 * @see {@link AcTrRenderer.beginDirectCapture}
 * @see {@link AcTrRenderer.takeDirectCapture}
 */
export type AcTrDirectCaptureState = 'off' | 'capturing' | 'captured' | 'missed'

/**
 * Primitive payload captured from a single `worldDraw` draw call for the
 * direct-batch fast path (skip temporary drawable allocate → clone → dispose).
 *
 * Discriminated by `kind`:
 * - `'lineStrip'`: connected polyline vertices from {@link AcTrRenderer.lines}
 *   (and other paths that funnel through private `linePoints`).
 * - `'point'`: a single point plus its display style.
 * - `'area'`: a filled/hatched 2-D area.
 * - `'lineSegments'`: raw interleaved segment buffer (positions + indices).
 */
export type AcTrDirectCapturePayload =
  | {
      /** Connected polyline captured from a line-strip draw. */
      kind: 'lineStrip'
      /** World-space vertices along the strip (at least two when captured). */
      points: AcGePoint3dLike[]
    }
  | {
      /** Single point primitive captured from {@link AcTrRenderer.point}. */
      kind: 'point'
      /** World-space point location. */
      point: AcGePoint3d
      /** Point display style (size, shape, etc.). */
      style: AcGiPointStyle
    }
  | {
      /** Filled/hatched area captured from {@link AcTrRenderer.area}. */
      kind: 'area'
      /** Area geometry in drawing coordinates. */
      area: AcGeArea2d
    }
  | {
      /** Indexed line segments captured from {@link AcTrRenderer.lineSegments}. */
      kind: 'lineSegments'
      /** Interleaved position (or other) attribute data. */
      array: Float32Array
      /** Components per vertex in `array`. */
      itemSize: number
      /** Index buffer pairing vertices into segments. */
      indices: Uint16Array
    }

export class AcTrRenderer implements AcGiRenderer<AcTrEntity> {
  private _context: AcTrRenderContext
  private _renderer: THREE.WebGLRenderer
  private _subEntityTraits: AcGiSubEntityTraits
  /**
   * Current direct-batch capture session state.
   *
   * When not `'off'`, the first matching draw call stores a payload instead of
   * building full entity geometry. A second draw call or incompatible call
   * marks the capture `'missed'`.
   */
  private _directCapture: AcTrDirectCaptureState = 'off'
  /**
   * Payload stored while `_directCapture` is `'captured'`; cleared on miss,
   * cancel, or {@link takeDirectCapture}.
   */
  private _capturedDirectPayload: AcTrDirectCapturePayload | null = null

  public readonly events: {
    fontNotFound: AcCmEventManager<AcTrFontNotFoundEventArgs>
    fontLoaded: AcCmEventManager<AcTrFontNotFoundEventArgs>
  } = {
    fontNotFound: new AcCmEventManager<AcTrFontNotFoundEventArgs>(),
    fontLoaded: new AcCmEventManager<AcTrFontNotFoundEventArgs>()
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._context = new AcTrRenderContext()
    const size = renderer.getSize(new THREE.Vector2())
    this._context.styleManager.updateLineResolution(size.x, size.y)
    this._context.styleManager.options.linePatternShaderBroken =
      !AcTrLinePatternShaderProbe.test(renderer)
    AcTrMTextRenderer.getInstance().overrideStyleManager(
      this._context.styleManager
    )
    FontManager.instance.events.fontNotFound.addEventListener(args => {
      this.events.fontNotFound.dispatch(args)
    })
    FontManager.instance.events.fontLoaded.addEventListener(args => {
      this.events.fontLoaded.dispatch(args)
    })
    this._subEntityTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  }

  /**
   * Starts capturing the next direct-batch draw call from
   * `AcDbEntity.worldDraw` without building full entity geometry.
   *
   * Resets any previous payload and sets the session to `'capturing'`.
   * Call {@link takeDirectCapture} or {@link cancelDirectCapture} to end it.
   */
  beginDirectCapture() {
    this._directCapture = 'capturing'
    this._capturedDirectPayload = null
  }

  /**
   * Ends the capture session and returns the stored payload when the draw path
   * was a single matching call (`'captured'`).
   *
   * Always clears the session back to `'off'`, including on miss.
   *
   * @returns The captured primitive payload, or `null` when capture missed or
   *   was never started successfully.
   */
  takeDirectCapture(): AcTrDirectCapturePayload | null {
    const payload =
      this._directCapture === 'captured' ? this._capturedDirectPayload : null
    this._directCapture = 'off'
    this._capturedDirectPayload = null
    return payload
  }

  /**
   * Aborts an in-flight direct capture without returning a payload.
   *
   * Clears both the session state and any stored payload. Prefer this when the
   * caller abandons the fast path before `worldDraw` finishes.
   */
  cancelDirectCapture() {
    this._directCapture = 'off'
    this._capturedDirectPayload = null
  }

  /**
   * Marks the current capture session as `'missed'` and drops any stored
   * payload.
   *
   * No-op when capture is already `'off'`. Used when a second draw call,
   * unsupported primitive, or empty geometry makes the entity ineligible for
   * direct batching.
   */
  private missDirectCapture() {
    if (this._directCapture !== 'off') {
      this._directCapture = 'missed'
      this._capturedDirectPayload = null
    }
  }

  /**
   * Attempts to store `payload` as the sole captured primitive for this
   * session.
   *
   * Succeeds only while the session is `'capturing'` and no payload has been
   * stored yet. Otherwise marks the session as missed via
   * {@link missDirectCapture}.
   *
   * @param payload - Primitive data from the matching draw method.
   * @returns `true` when the payload was stored and the state became
   *   `'captured'`; `false` when the capture was marked missed.
   */
  private tryCaptureDirectPayload(payload: AcTrDirectCapturePayload) {
    if (
      this._directCapture !== 'capturing' ||
      this._capturedDirectPayload != null
    ) {
      this.missDirectCapture()
      return false
    }
    this._capturedDirectPayload = payload
    this._directCapture = 'captured'
    return true
  }

  /**
   * @inheritdoc
   */
  get subEntityTraits() {
    return this._subEntityTraits
  }

  /**
   * Draw-time context for resolving semantic trait colours (for example ACI 7
   * foreground) into pixel RGB values.
   *
   * Derived from {@link currentBackgroundColor} on each read — no separate
   * sync is required when the canvas background changes.
   */
  get context(): AcTrRenderContext {
    this._context.syncBackgroundColor(
      this._context.styleManager.currentBackgroundColor
    )
    return this._context
  }

  /**
   * Strategy that decides whether converted entities should batch or stay unbatched.
   */
  get batchDrawPolicy(): AcTrBatchDrawPolicy {
    return this._context.batchDrawPolicy
  }
  set batchDrawPolicy(policy: AcTrBatchDrawPolicy) {
    this._context.batchDrawPolicy = policy
  }

  get autoClear() {
    return this._renderer.autoClear
  }
  set autoClear(value: boolean) {
    this._renderer.autoClear = value
  }

  get domElement() {
    return this._renderer.domElement
  }

  setSize(width: number, height: number) {
    this._renderer.setSize(width, height)
    this._context.styleManager.updateLineResolution(width, height)
  }

  /**
   * Updates wide-line shader resolution without resizing the canvas.
   */
  updateLineResolution(width: number, height: number) {
    this._context.styleManager.updateLineResolution(width, height)
  }

  /**
   * Syncs shader uniforms that depend on the active camera zoom.
   */
  syncCameraZoom(zoom: number) {
    this.updateCameraZoomUniform(zoom)
  }

  getViewport(target: THREE.Vector4) {
    return this._renderer.getViewport(target)
  }
  setViewport(x: number, y: number, width: number, height: number) {
    this._renderer.setViewport(x, y, width, height)
  }

  clear() {
    this._renderer.clear()
  }

  clearDepth() {
    this._renderer.clearDepth()
  }

  render(scene: THREE.Object3D, camera: AcTrCamera): boolean {
    this.updateCameraZoomUniform(camera.zoom)
    this._renderer.render(scene, camera.internalCamera)
    // RTE frame scheduling is added in the large-coordinate feature branch.
    return false
  }

  /**
   * Repaints materials explicitly registered as background-follow fills.
   *
   * The current fill manager keeps solid hatches on the foreground path, so
   * this is mostly an extension point for future fill styles.
   *
   * @param color - New background color (typically the canvas bg).
   */
  changeBackground(color: number) {
    this._context.styleManager.changeBackground(color)
  }

  /**
   * The canvas background colour tracked by the style manager.
   *
   * Reading returns the value last written here (or the default
   * `0x000000`).  Writing both stores the colour on the style manager
   * options (so material managers know the current theme) and repaints
   * every background-follow material already in the cache.
   */
  get currentBackgroundColor(): number {
    return this._context.styleManager.currentBackgroundColor
  }
  set currentBackgroundColor(value: number) {
    this._context.styleManager.currentBackgroundColor = value
  }

  /** Shared style/material cache used by entity conversion and layer updates. */
  get styleManager() {
    return this._context.styleManager
  }

  /**
   * Sets the clear color used when clearing the canvas.
   *
   * @param color - Background color as 24-bit hexadecimal RGB number
   * @param alpha - Optional alpha value (0.0 - 1.0)
   */
  setClearColor(color: number, alpha?: number) {
    this._renderer.setClearColor(color, alpha)
  }

  /**
   * Gets the current clear color as a 24-bit hexadecimal RGB number.
   */
  getClearColor() {
    const color = new THREE.Color()
    this._renderer.getClearColor(color)
    return color.getHex()
  }

  /**
   * Sets the clear alpha used when clearing the canvas.
   *
   * @param alpha - Alpha value (0.0 - 1.0)
   */
  set clearAlpha(alpha: number) {
    this._renderer.setClearAlpha(alpha)
  }

  /**
   * Gets the current clear alpha value.
   */
  get clearAlpha() {
    return this._renderer.getClearAlpha()
  }

  /**
   * The internal THREE.js webgl renderer
   */
  get internalRenderer() {
    return this._renderer
  }

  /**
   * @inheritdoc
   */
  setFontMapping(mapping: AcGiFontMapping) {
    FontManager.instance.setFontMapping(mapping)
  }

  /**
   * Sets global ltscale
   */
  set ltscale(scale: number) {
    this._context.styleManager.options.ltscale = scale
  }

  /**
   * Sets global celtscale
   */
  set celtscale(scale: number) {
    this._context.styleManager.options.celtscale = scale
  }

  /**
   * Fonts list which can't be found
   */
  get missedFonts() {
    return FontManager.instance.missedFonts
  }

  /**
   * Gets whether entity lineweights are displayed.
   */
  get showLineWeight() {
    return this._context.styleManager.showLineWeight
  }

  /**
   * Sets whether entity lineweights are displayed.
   *
   * When disabled, line entities are rendered with basic 1px materials.
   */
  set showLineWeight(value: boolean) {
    this._context.styleManager.showLineWeight = value
  }

  /**
   * Whether the next line conversion should honor entity lineweights even
   * when {@link showLineWeight} (LWDISPLAY) is off.
   */
  get forceShowLineWeight() {
    return this._context.styleManager.forceShowLineWeight
  }

  set forceShowLineWeight(value: boolean) {
    this._context.styleManager.forceShowLineWeight = value
  }

  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<AcGiSubEntityTraits>
  ): Record<number, THREE.Material> {
    return this._context.styleManager.updateLayerMaterial(layerName, newTraits)
  }

  /**
   * Returns one cached material bound to an effective layer while preserving symbolic traits.
   *
   * This is used for block contents that inherit the layer of the INSERT they belong to.
   */
  getLayerBoundMaterial(
    material: THREE.Material,
    layerName: string,
    layerTraits?: Partial<AcGiSubEntityTraits>
  ) {
    return this._context.styleManager.getLayerBoundMaterial(
      material,
      layerName,
      layerTraits
    )
  }

  /**
   * Create one empty drawable object
   */
  createObject() {
    return new AcTrObject(this._context)
  }

  /**
   * Create one empty entity
   */
  createEntity() {
    return new AcTrEntity(this._context)
  }

  /**
   * @inheritdoc
   */
  group(entities: AcTrEntity[]) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createEntity() as AcTrGroup
    }
    return new AcTrGroup(entities, this._context)
  }

  /**
   * @inheritdoc
   */
  point(point: AcGePoint3d, style: AcGiPointStyle) {
    if (this._directCapture !== 'off') {
      if (this.tryCaptureDirectPayload({ kind: 'point', point, style })) {
        return this.createEntity() as AcTrPoint
      }
      return this.createEntity() as AcTrPoint
    }
    return new AcTrPoint(point, this._subEntityTraits, style, this._context)
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d) {
    return this.linePoints(arc.tessellate(acdbDrawTessellateOptions(this)))
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    return this.linePoints(
      ellipseArc.tessellate(acdbDrawTessellateOptions(this))
    )
  }

  /**
   * @inheritdoc
   */
  lines(points: AcGePoint3dLike[]) {
    return this.linePoints(points)
  }

  /**
   * @inheritdoc
   */
  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array) {
    if (this._directCapture !== 'off') {
      if (
        this.tryCaptureDirectPayload({
          kind: 'lineSegments',
          array,
          itemSize,
          indices
        })
      ) {
        return this.createEntity() as AcTrLineSegments
      }
      return this.createEntity() as AcTrLineSegments
    }
    return new AcTrLineSegments(
      array,
      itemSize,
      indices,
      this._subEntityTraits,
      this._context
    )
  }

  /**
   * @inheritdoc
   */
  area(area: AcGeArea2d) {
    if (this._directCapture !== 'off') {
      if (this.tryCaptureDirectPayload({ kind: 'area', area })) {
        return this.createEntity() as AcTrPolygon
      }
      return this.createEntity() as AcTrPolygon
    }
    return new AcTrPolygon(area, this._subEntityTraits, this._context)
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, delay?: boolean) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createEntity() as AcTrMText
    }
    return new AcTrMText(
      mtext,
      this._subEntityTraits,
      style,
      this._context,
      delay
    )
  }

  /**
   * @inheritdoc
   */
  shape(shape: AcGiShapeData, style?: AcGiTextStyle, delay?: boolean) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createEntity() as AcTrShape
    }
    return new AcTrShape(
      shape,
      this._subEntityTraits,
      style,
      this._context,
      delay
    )
  }

  /**
   * @inheritdoc
   */
  image(blob: Blob, style: AcGiImageStyle) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createEntity() as AcTrImage
    }
    return new AcTrImage(blob, style, this._context)
  }

  /**
   * Renders one or more entities (or a block preview root) to an offscreen canvas.
   *
   * Pass a detached preview root such as the group returned by
   * {@link AcTrBatchedGroup.createPreviewSubset} or an {@link AcTrGroup} built
   * for a block definition. When the object is already attached to a scene, a
   * deep clone is rendered internally.
   *
   * @param object - Drawable root to preview
   * @param options - Output size and optional framing overrides
   * @returns Preview canvas and framing bounds, or `null` when bounds cannot be resolved
   *
   * @example
   * ```ts
   * const subset = batchGroup.createPreviewSubset(['line-1', 'arc-2'])
   * if (subset) {
   *   const preview = renderer.renderEntityPreview(subset, { width: 128, height: 128 })
   *   disposePreviewSubset(subset)
   * }
   * ```
   */
  renderEntityPreview(
    object: THREE.Object3D,
    options: AcTrEntityPreviewOptions
  ): AcTrEntityPreviewResult | null {
    return new AcTrEntityPreview(this).capture(object, options)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose() {
    this._context.styleManager.dispose()
    FontManager.instance.missedFonts = {}
  }

  private linePoints(points: AcGePoint3dLike[]) {
    if (this._directCapture !== 'off') {
      if (points.length < 2) {
        this.missDirectCapture()
        return this.createEntity()
      }
      if (this.tryCaptureDirectPayload({ kind: 'lineStrip', points })) {
        // Placeholder so worldDraw can attach objectId / layer metadata.
        return this.createEntity()
      }
      return this.createEntity()
    }

    if (points.length < 2) {
      return this.createEntity()
    }
    return new AcTrLine(points, this._subEntityTraits, this._context, false)
  }

  /**
   * Updates camera zoom value for shader materials
   */
  private updateCameraZoomUniform(zoom: number) {
    // DxfLoader.CameraZoomUniform.value = (zoom * this.container.height) / 50;
    AcTrMaterialManager.CameraZoomUniform.value = zoom
  }
}
