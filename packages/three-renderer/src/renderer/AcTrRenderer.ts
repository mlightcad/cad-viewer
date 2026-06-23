import {
  AcCmEventManager,
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
import { AcTrSubEntityTraitsUtil } from '../util'
import { AcTrCamera } from '../viewport'
import { AcTrMTextRenderer } from './AcTrMTextRenderer'
import { AcTrRenderContext } from './AcTrRenderContext'

/** Event payload when a mapped font cannot be resolved during rendering. */
export interface AcTrFontNotFoundEventArgs {
  /** Name of the font that could not be found. */
  fontName: string
  /** Number of characters using this font; set when the font is missing. */
  count?: number
}

export class AcTrRenderer implements AcGiRenderer<AcTrEntity> {
  private _context: AcTrRenderContext
  private _renderer: THREE.WebGLRenderer
  private _subEntityTraits: AcGiSubEntityTraits

  public readonly events: {
    fontNotFound: AcCmEventManager<AcTrFontNotFoundEventArgs>
  } = {
    fontNotFound: new AcCmEventManager<AcTrFontNotFoundEventArgs>()
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._context = new AcTrRenderContext()
    const size = renderer.getSize(new THREE.Vector2())
    this._context.styleManager.updateLineResolution(size.x, size.y)
    AcTrMTextRenderer.getInstance().overrideStyleManager(
      this._context.styleManager
    )
    FontManager.instance.events.fontNotFound.addEventListener(args => {
      this.events.fontNotFound.dispatch(args)
    })
    this._subEntityTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
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
    return new AcTrGroup(entities, this._context)
  }

  /**
   * @inheritdoc
   */
  point(point: AcGePoint3d, style: AcGiPointStyle) {
    const geometry = new AcTrPoint(
      point,
      this._subEntityTraits,
      style,
      this._context
    )
    return geometry
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d) {
    return this.linePoints(arc.getPoints(100))
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    return this.linePoints(ellipseArc.getPoints(100))
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
    return new AcTrPolygon(area, this._subEntityTraits, this._context)
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, delay?: boolean) {
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
    return new AcTrImage(blob, style, this._context)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose() {
    this._context.styleManager.dispose()
    FontManager.instance.missedFonts = {}
  }

  private linePoints(points: AcGePoint3dLike[]) {
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
