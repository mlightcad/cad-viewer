import {
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { ShapeData } from '@mlightcad/mtext-renderer'

import { AcTrMTextRenderer } from '../renderer/AcTrMTextRenderer'
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
    _delay: boolean = false
  ) {
    super(context, traits, resolveShapeTextStyle(shape, style, context))
    this._shape = shape
    // Geometry is built by syncDraw/asyncDraw in AcTrView2d / AcTrGroup so
    // font-awaiting asyncDraw can run without blocking other entity converts.
  }

  /**
   * Builds renderer input with only the glyph key that should be resolved.
   *
   * Chooses either a non-numeric name or a shape code via
   * {@link resolveShapeGlyphKey}, then clears the unused field so mtext-renderer
   * does not incorrectly fall back between them.
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
   * Key for sharing mesh buffers across identical complex-linetype SHAPE symbols.
   * Placement is applied via this object's transform, not baked into the key.
   */
  get linetypeGlyphShareKey(): string {
    return [
      this._shape.name ?? '',
      this._shape.shapeNumber ?? '',
      this._shape.size,
      this._style.font ?? '',
      this._style.extendedFont ?? '',
      this._style.widthFactor ?? 1,
      this._shape.widthFactor ?? 1
    ].join('\0')
  }

  /** @inheritdoc */
  protected override contentShareKey(): string {
    return this.linetypeGlyphShareKey
  }

  /**
   * Moves baked SHAPE placement onto this object's transform and rebuilds the
   * glyph at the local origin so identical symbols can share one mesh.
   */
  hoistBakedPlacement(): void {
    const position = this._shape.position
    this.position.set(position?.x ?? 0, position?.y ?? 0, position?.z ?? 0)
    this.rotation.z = this._shape.rotation ?? 0
    this._shape = {
      ...this._shape,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0
    }
  }

  /**
   * @inheritdoc
   */
  protected override getDrawPosition() {
    const position = this._shape.position
    if (
      position &&
      position.x === 0 &&
      position.y === 0 &&
      position.z === 0 &&
      (this.position.x !== 0 || this.position.y !== 0 || this.position.z !== 0)
    ) {
      return {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      }
    }
    return position
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

  /**
   * Preserves SHAPE payload across INSERT template clones.
   *
   * {@link AcTrEntity.fastDeepClone} would otherwise create a plain
   * {@link AcTrEntity} shell that can no longer {@link asyncDraw} glyphs.
   */
  override fastDeepClone(shareGeometry: boolean = false) {
    const cloned = new AcTrShape(
      {
        ...this._shape,
        position: { ...this._shape.position }
      },
      this.traitsForClone(),
      { ...this._style },
      this.renderContext
    )
    cloned.copyGlyphIdentity(this)
    this.copyGeometry(this, cloned, shareGeometry)
    return cloned
  }
}
