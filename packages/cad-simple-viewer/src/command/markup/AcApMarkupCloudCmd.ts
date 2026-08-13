import {
  AcCmColor,
  AcDbPolyline,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  configureMarkupCommand,
  createMarkupMeta,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import {
  buildMarkupCloud,
  commitMarkup
} from './AcApMarkupPresenter'
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

class AcApMarkupCloudJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private readonly _cloud: AcDbPolyline
  private readonly _first: AcGePoint2dLike
  private readonly _view: AcEdBaseView

  constructor(view: AcEdBaseView, start: AcGePoint2dLike, color: AcCmColor) {
    super(view)
    this._view = view
    this._first = start
    this._cloud = new AcDbPolyline()
    this._cloud.color = color
    this._cloud.lineWeight = getMarkupLineWeight()
  }

  get entity(): AcDbPolyline {
    return this._cloud
  }

  update(second: AcGePoint2dLike) {
    buildMarkupCloud(this._cloud, this._first, second, this._view)
  }
}

/**
 * Create a rectangular revision-cloud markup, optionally with an attached
 * callout (leader + text, no arrow).
 */
export class AcApMarkupCloudCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const color = defaultMarkupColor()
      const p1 = await promptShapeFirstCorner(
        context,
        'jig.markup.cloud.firstCorner'
      )
      if (!p1) return

      const p2Prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.cloud.secondCorner')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.jig = new AcApMarkupCloudJig(context.view, p1, color)
      const p2Result = await context.view.editor.getPoint(p2Prompt)
      if (p2Result.status !== AcEdPromptStatus.OK) return
      const p2 = p2Result.value!

      const callout = await promptAttachedCallout(context, {
        kind: 'cloud',
        corner1: { x: p1.x, y: p1.y },
        corner2: { x: p2.x, y: p2.y }
      })
      const meta = createMarkupMeta(
        'cloud',
        context.view as AcTrView2d,
        context,
        { text: callout?.text }
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'cloud',
        style: {
          color: markupColorToCss(color),
          lineWeight: getMarkupLineWeight(),
          fontSize: getMarkupFontSize()
        },
        geometry: {
          type: 'cloud',
          corner1: { x: p1.x, y: p1.y },
          corner2: { x: p2.x, y: p2.y },
          callout
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
