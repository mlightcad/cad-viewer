import { AcTrHtmlBadge } from '@mlightcad/three-renderer'

import { AcApContext } from '../../app'
import {
  AcEdCommand,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  configureMarkupDrawCommand,
  createMarkupMeta,
  promptMarkupCapsuleText,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import { MARKUP_LIVE_LAYER } from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import {
  defaultMarkupColor,
  getMarkupFontSize,
  subscribeMarkupDrawStyle
} from './AcApMarkupUtil'

/**
 * Place a text markup label at a picked world point.
 */
export class AcApMarkupTextCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupDrawCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.text.point')
      )
      const pointResult = await context.view.editor.getPoint(pointPrompt)
      if (pointResult.status !== AcEdPromptStatus.OK) return
      const position = pointResult.value!

      const view = context.view as AcTrView2d
      const badgeId = `live-markup-text-${Date.now()}`
      const badge = new AcTrHtmlBadge({
        id: badgeId,
        color: defaultMarkupColor(),
        text: '',
        fontSize: getMarkupFontSize(),
        worldPosition: position,
        layer: MARKUP_LIVE_LAYER,
        layoutId: view.activeLayoutBtrId
      })
      view.htmlTransientManager.add(badge)
      view.isHtmlDirty = true

      const unsubDrawStyle = subscribeMarkupDrawStyle(() => {
        badge.setColor(defaultMarkupColor())
        badge.setFontSize(getMarkupFontSize())
        view.isHtmlDirty = true
      })

      let text = 'Note'
      try {
        text =
          (await promptMarkupCapsuleText(
            { textElement: badge.element, element: badge.element },
            { multiline: false }
          )) || 'Note'
      } finally {
        unsubDrawStyle()
        view.htmlTransientManager.remove(badgeId)
        view.isHtmlDirty = true
      }

      const meta = createMarkupMeta('text', view, context, { text })
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'text',
        geometry: { type: 'text', position: { x: position.x, y: position.y } }
      }
      commitMarkup(context.view, record)
    })
  }
}
