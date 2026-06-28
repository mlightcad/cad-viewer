import {
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { ShapeData } from '@mlightcad/mtext-renderer'

import { AcTrMTextRenderer } from '../renderer'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { resolveShapeGlyphKey, resolveShapeTextStyle } from '../util'
import { AcTrGlyphEntity } from './AcTrGlyphEntity'

/**
 * Display object for a CAD SHAPE entity rendered through the mtext-renderer.
 */
export class AcTrShape extends AcTrGlyphEntity {
  /** Source SHAPE data from the CAD database. */
  private _shape: AcGiShapeData

  /**
   * Creates a SHAPE display object.
   *
   * @param shape SHAPE definition and placement from the CAD database.
   * @param traits CAD sub-entity traits used to resolve color and layer behavior.
   * @param style Optional text style override; resolved against shape and context when omitted.
   * @param context Active renderer context that owns style and batching policy.
   * @param delay When `true`, skips the initial draw so callers can finish setup first.
   */
  constructor(
    shape: AcGiShapeData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle | null | undefined,
    context: AcTrRenderContext,
    delay: boolean = false
  ) {
    super(context, traits, resolveShapeTextStyle(shape, style, context))
    this._shape = shape
    if (!delay) {
      this.syncDraw()
    }
  }

  /**
   * Builds renderer input with only the glyph key that should be resolved.
   *
   * mtext-renderer falls back from shape name to shape number when both are
   * present; SHAPE entities should use the name exclusively when it is set.
   *
   * @returns SHAPE payload suitable for the mtext-renderer.
   */
  private toRenderableShapeData(): ShapeData {
    const source = this._shape as ShapeData
    const { byName, byCode } = resolveShapeGlyphKey(this._shape)
    return {
      ...source,
      name: byName,
      shapeNumber: byCode
    }
  }

  /**
   * @inheritdoc
   */
  protected override getDrawPosition() {
    return this._shape.position
  }

  /**
   * @inheritdoc
   */
  protected override renderSync(renderer: AcTrMTextRenderer) {
    return renderer.syncRenderShape(
      this.toRenderableShapeData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override async renderAsync(renderer: AcTrMTextRenderer) {
    return renderer.asyncRenderShape(
      this.toRenderableShapeData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override describeRenderFailure() {
    const label =
      this._shape.name?.trim() || String(this._shape.shapeNumber ?? '')
    return `shape '${label}'`
  }
}
