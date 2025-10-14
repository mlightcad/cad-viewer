import {
  AcCmEventManager,
  AcGeArea2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGiFontMapping,
  AcGiHatchStyle,
  AcGiImageStyle,
  AcGiLineStyle,
  AcGiMTextData,
  AcGiPointStyle,
  AcGiRenderer,
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
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrCamera } from '../viewport'

export class AcTrRenderer implements AcGiRenderer<AcTrEntity> {
  private _styleManager: AcTrStyleManager
  private _renderer: THREE.WebGLRenderer

  public readonly events = {
    fontNotFound: new AcCmEventManager<FontManagerEventArgs>()
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._styleManager = new AcTrStyleManager()
    FontManager.instance.events.fontNotFound.addEventListener(args => {
      this.events.fontNotFound.dispatch(args)
    })
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
   * Fonts list which can't be found
   */
  get missedFonts() {
    return FontManager.instance.missedFonts
  }

  /**
   * Clear fonts which can't be found
   */
  clearMissedFonts() {
    FontManager.instance.missedFonts = {}
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
    const geometry = new AcTrPoint(point, style, this._styleManager)
    return geometry
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d, style: AcGiLineStyle) {
    // TODO: Compute division based on current viewport size
    return this.linePoints(arc.getPoints(100), style)
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d, style: AcGiLineStyle) {
    // TODO: Compute division based on current viewport size
    return this.linePoints(ellipseArc.getPoints(100), style)
  }

  /**
   * @inheritdoc
   */
  lines(points: AcGePoint3dLike[], style: AcGiLineStyle) {
    return this.linePoints(points, style)
  }

  /**
   * @inheritdoc
   */
  lineSegments(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    style: AcGiLineStyle
  ) {
    return new AcTrLineSegments(
      array,
      itemSize,
      indices,
      style,
      this._styleManager
    )
  }

  /**
   * @inheritdoc
   */
  area(area: AcGeArea2d, style: AcGiHatchStyle) {
    return new AcTrPolygon(area, style, this._styleManager)
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, delay?: boolean) {
    return new AcTrMText(mtext, style, this._styleManager, delay)
  }

  /**
   * @inheritdoc
   */
  image(blob: Blob, style: AcGiImageStyle) {
    return new AcTrImage(blob, style, this._styleManager)
  }

  private linePoints(
    points: AcGePoint3dLike[],
    style: AcGiLineStyle | undefined = undefined
  ) {
    return new AcTrLine(points, style, this._styleManager)
  }
}
