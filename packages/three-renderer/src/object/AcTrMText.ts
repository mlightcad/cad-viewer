import {
  AcGiMTextData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrMTextRenderer } from '../renderer'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrEntity } from './AcTrEntity'
import { AcTrPointRebaser } from './rebaser'

export class AcTrMText extends AcTrEntity {
  private _mtext?: MTextObject
  private _text: AcGiMTextData
  private _style: AcGiTextStyle & {
    color: number
    isByLayer: boolean
    layer: string
    byLayerColor?: number
    byBlockColor?: number
  }

  constructor(
    text: AcGiMTextData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    styleManager: AcTrStyleManager,
    delay: boolean = false
  ) {
    super(styleManager)
    this._text = text
    this._style = {
      ...style,
      color: traits.rgbColor,
      isByLayer: traits.color.isByLayer,
      layer: traits.layer
    }
    if (!delay) {
      this.syncDraw()
    }
  }

  async syncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      const style = this._style
      const offset = this.rebase(new AcTrPointRebaser(this._text.position))

      // @ts-expect-error AcGiTextData and MTextData are compatible
      this._mtext = mtextRenderer.syncRenderMText(this._text, style, {
        byLayerColor: style.byLayerColor,
        byBlockColor: style.byBlockColor
      })
      this.add(this._mtext)
      this.flatten()
      this.traverse(object => {
        // Add the flag to check intersection using bounding box of the mesh
        object.userData.bboxIntersectionCheck = true
      })
      this.box = this._mtext.box
      this.updateBoundingBox(offset)
    } catch (error) {
      console.log(
        `Failed to render mtext '${this._text.text}' with the following error:\n`,
        error
      )
    }
  }

  async draw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      const style = this._style
      const offset = this.rebase(new AcTrPointRebaser(this._text.position))

      // @ts-expect-error AcGiTextData and MTextData are compatible
      this._mtext = await mtextRenderer.asyncRenderMText(this._text, style, {
          byLayerColor: style.byLayerColor,
          byBlockColor: style.byBlockColor
        })
        .then(mtext => {
          this._mtext = mtext
          this.add(this._mtext)
          this.flatten()
          this.traverse(object => {
            // Add the flag to check intersection using bounding box of the mesh
            object.userData.bboxIntersectionCheck = true
          })
          this.box = this._mtext.box
          this.updateBoundingBox(offset)
        })
    } catch (error) {
      console.log(
        `Failed to render mtext '${this._text.text}' with the following error:\n`,
        error
      )
    }
  }

  /**
   * Get intersections between a casted ray and this object. Override this method
   * to calculate intersection using the bounding box of texts.
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    this._mtext?.raycast(raycaster, intersects)
  }
}
