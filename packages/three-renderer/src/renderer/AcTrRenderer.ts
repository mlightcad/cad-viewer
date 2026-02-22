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
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { FontManager, FontManagerEventArgs } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import {
  AcTrEntity,
  AcTrGroup,
  AcTrImage,
  AcTrLine,
  AcTrLineSegments,
  AcTrMText,
  AcTrObject,
  AcTrPoint,
  AcTrPolygon
} from '../object'
import { AcTrMaterialManager } from '../style/AcTrMaterialManager'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../util'
import { AcTrCamera } from '../viewport'
import { AcTrMTextRenderer } from './AcTrMTextRenderer'

export class AcTrRenderer implements AcGiRenderer<AcTrEntity> {
  private _styleManager: AcTrStyleManager
  private _renderer: THREE.WebGLRenderer
  private _basePoint?: AcGePoint3d
  private _subEntityTraits: AcGiSubEntityTraits

  public readonly events = {
    fontNotFound: new AcCmEventManager<FontManagerEventArgs>()
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._styleManager = new AcTrStyleManager()
    const size = renderer.getSize(new THREE.Vector2())
    this._styleManager.updateLineResolution(size.x, size.y)
    AcTrMTextRenderer.getInstance().overrideStyleManager(this._styleManager)
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

  get autoClear() {
    return this._renderer.autoClear
  }
  set autoClear(value: boolean) {
    this._renderer.autoClear = value
  }

  get domElement() {
    return this._renderer.domElement
  }

  /**
   * JavaScript (and WebGL) use 64‑bit floating point numbers for CPU-side calculations,
   * but GPU shaders typically use 32‑bit floats. A 32-bit float has ~7.2 decimal digits
   * of precision. If passing 64-bit floating vertices data to GPU directly, it will
   * destroy number preciesion.
   *
   * So we adopt a simpler but effective version of the “origin-shift” idea. Recompute
   * geometry using re-centered coordinates and apply offset to its position. The base
   * point is extractly offset value.
   */
  get basePoint() {
    return this._basePoint
  }
  set basePoint(value: AcGePoint3d | undefined) {
    if (value == null) {
      this._basePoint = value
    } else {
      this._basePoint = this._basePoint
        ? this._basePoint.copy(value)
        : new AcGePoint3d(value)
    }
  }

  setSize(width: number, height: number) {
    this._renderer.setSize(width, height)
    this._styleManager.updateLineResolution(width, height)
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

  render(scene: THREE.Object3D, camera: AcTrCamera) {
    this.updateCameraZoomUniform(camera.zoom)
    this._renderer.render(scene, camera.internalCamera)
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
  setClearAlpha(alpha: number) {
    this._renderer.setClearAlpha(alpha)
  }

  /**
   * Gets the current clear alpha value.
   */
  getClearAlpha() {
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
    AcTrStyleManager.options.ltscale = scale
  }

  /**
   * Sets global celtscale
   */
  set celtscale(scale: number) {
    AcTrStyleManager.options.celtscale = scale
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
    return this._styleManager.showLineWeight
  }

  /**
   * Sets whether entity lineweights are displayed.
   *
   * When disabled, line entities are rendered with basic 1px materials.
   */
  set showLineWeight(value: boolean) {
    this._styleManager.showLineWeight = value
  }

  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<AcGiSubEntityTraits>
  ): Record<number, THREE.Material> {
    return this._styleManager.updateLayerMaterial(layerName, newTraits)
  }

  /**
   * Create one empty drawable object
   */
  createObject() {
    return new AcTrObject(this._styleManager)
  }

  /**
   * Create one empty entity
   */
  createEntity() {
    return new AcTrEntity(this._styleManager)
  }

  /**
   * @inheritdoc
   */
  group(entities: AcTrEntity[]) {
    return new AcTrGroup(entities, this._styleManager)
  }

  /**
   * @inheritdoc
   */
  point(point: AcGePoint3d, style: AcGiPointStyle) {
    const geometry = new AcTrPoint(
      point,
      this._subEntityTraits,
      style,
      this._styleManager
    )
    return geometry
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d) {
    // TODO: Compute division based on current viewport size
    return this.linePoints(arc.getPoints(100))
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    // TODO: Compute division based on current viewport size
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
      this._styleManager
    )
  }

  /**
   * @inheritdoc
   */
  area(area: AcGeArea2d) {
    return new AcTrPolygon(area, this._subEntityTraits, this._styleManager)
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, delay?: boolean) {
    return new AcTrMText(
      mtext,
      this._subEntityTraits,
      style,
      this._styleManager,
      delay
    )
  }

  /**
   * @inheritdoc
   */
  image(blob: Blob, style: AcGiImageStyle) {
    return new AcTrImage(blob, style, this._styleManager)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose() {
    this._styleManager.dispose()
    FontManager.instance.missedFonts = {}
  }

  private linePoints(points: AcGePoint3dLike[]) {
    return new AcTrLine(points, this._subEntityTraits, this._styleManager)
  }

  /**
   * Updates camera zoom value for shader materials
   */
  private updateCameraZoomUniform(zoom: number) {
    // DxfLoader.CameraZoomUniform.value = (zoom * this.container.height) / 50;
    AcTrMaterialManager.CameraZoomUniform.value = zoom
  }
}
