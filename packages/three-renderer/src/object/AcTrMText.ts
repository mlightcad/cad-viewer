import {
  AcGiMTextData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { MTextData } from '@mlightcad/mtext-renderer'

import { AcTrMTextRenderer } from '../renderer'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrGlyphEntity } from './AcTrGlyphEntity'

/**
 * Display object for a CAD MTEXT entity rendered through the mtext-renderer.
 */
export class AcTrMText extends AcTrGlyphEntity {
  /** Source MTEXT data from the CAD database. */
  private _text: AcGiMTextData

  /**
   * Creates an MTEXT display object.
   *
   * @param text MTEXT content and placement from the CAD database.
   * @param traits CAD sub-entity traits used to resolve color and layer behavior.
   * @param style Text style applied by the mtext-renderer.
   * @param context Active renderer context that owns style and batching policy.
   * @param delay When `true`, skips the initial draw so callers can finish setup first.
   */
  constructor(
    text: AcGiMTextData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    context: AcTrRenderContext,
    delay: boolean = false
  ) {
    super(context, traits, { ...style }, delay)
    this._text = text
  }

  /**
   * Builds renderer input with Z flattened for the 2D plan-view camera.
   *
   * Orthographic views use a narrow near/far band around the camera. MTEXT
   * often carries large DWG elevations while linework/symbols on the same
   * layer may sit at Z=0, so preserving insertion Z would depth-clip glyphs
   * even though the label's XY is inside the viewport.
   *
   * @returns MTEXT payload suitable for the mtext-renderer.
   */
  private toPlanViewMTextData(): MTextData {
    const source = this._text as MTextData
    const position = source.position
    return {
      ...source,
      position: {
        x: position.x,
        y: position.y,
        z: 0
      }
    }
  }

  /**
   * @inheritdoc
   */
  protected override getDrawPosition() {
    return this._text.position
  }

  /**
   * @inheritdoc
   */
  protected override renderSync(renderer: AcTrMTextRenderer) {
    return renderer.syncRenderMText(
      this.toPlanViewMTextData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override async renderAsync(renderer: AcTrMTextRenderer) {
    return renderer.asyncRenderMText(
      this.toPlanViewMTextData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override describeRenderFailure() {
    return `mtext '${this._text.text}'`
  }
}
