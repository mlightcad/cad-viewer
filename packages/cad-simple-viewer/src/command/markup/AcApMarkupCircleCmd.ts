import {
  AcCmColor,
  AcDbCircle,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptDistanceOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  configureMarkupCommand,
  createMarkupMeta,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import {
  promptAttachedCallout,
  promptShapeFirstCorner
} from './AcApMarkupShapeCallout'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupFontSize,
  getMarkupLineWeight,
  markupColorToCss
} from './AcApMarkupUtil'

class AcApMarkupCircleJig extends AcEdPreviewJig<number> {
  private readonly _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike, color: AcCmColor) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
    this._circle.color = color
    this._circle.lineWeight = getMarkupLineWeight()
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = Math.max(radius, 0)
  }
}

/**
 * Create a circle markup, optionally with an attached callout (no arrow).
 */
export class AcApMarkupCircleCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const center = await promptShapeFirstCorner(
        context,
        'jig.markup.circle.center'
      )
      if (!center) return

      const radiusPrompt = new AcEdPromptDistanceOptions(
        AcApI18n.t('jig.markup.circle.radius')
      )
      radiusPrompt.allowZero = false
      radiusPrompt.useBasePoint = true
      radiusPrompt.useDashedLine = true
      radiusPrompt.basePoint = new AcGePoint3d(center.x, center.y, center.z ?? 0)
      radiusPrompt.jig = new AcApMarkupCircleJig(context.view, center, color)
      const radiusResult = await context.view.editor.getDistance(radiusPrompt)
      if (radiusResult.status !== AcEdPromptStatus.OK) return
      const radius = radiusResult.value!

      const callout = await promptAttachedCallout(context, {
        kind: 'circle',
        center: { x: center.x, y: center.y },
        radius
      })
      const meta = createMarkupMeta(
        'circle',
        context.view as AcTrView2d,
        context,
        { text: callout?.text }
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'circle',
        style: {
          color: markupColorToCss(color),
          lineWeight: getMarkupLineWeight(),
          fontSize: getMarkupFontSize()
        },
        geometry: {
          type: 'circle',
          center: { x: center.x, y: center.y },
          radius,
          callout
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
