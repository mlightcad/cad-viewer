import {
  AcGiMTextData,
  AcGiSubEntityTraits,
  AcGiTextStyle,
  log
} from '@mlightcad/data-model'
import {
  ColorSettings,
  MTextData,
  MTextObject
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrMTextRenderer } from '../renderer'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrMTextColorUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrMText extends AcTrEntity {
  private _mtext?: MTextObject
  private _text: AcGiMTextData
  private _style: AcGiTextStyle
  private _colorSettings: ColorSettings

  constructor(
    text: AcGiMTextData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    styleManager: AcTrStyleManager,
    delay: boolean = false
  ) {
    super(styleManager)
    this._text = text
    this._style = { ...style }
    this._colorSettings = {
      layer: traits.layer,
      color: AcTrMTextColorUtil.toMTextColor(traits.color),
      byLayerColor: 0xffffff, // TODO: Fix it
      byBlockColor: 0xffffff // TODO: Fix it
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
      const mtextData = this._text as MTextData

      this._mtext = mtextRenderer.syncRenderMText(
        mtextData,
        style,
        this._colorSettings
      )
      this.add(this._mtext)
      this.flatten()
      this.traverse(object => {
        // Add the flag to check intersection using bounding box of the mesh
        object.userData.bboxIntersectionCheck = true
      })
      this.box = this._mtext.box
    } catch (error) {
      log.info(
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
      const mtextData = this._text as MTextData

      const mtext = await mtextRenderer.asyncRenderMText(
        mtextData,
        style,
        this._colorSettings
      )
      this._mtext = mtext
      this.add(this._mtext)
      this.flatten()
      this.traverse(object => {
        // Add the flag to check intersection using bounding box of the mesh
        object.userData.bboxIntersectionCheck = true
      })
      this.box = this._mtext.box
    } catch (error) {
      log.info(
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
