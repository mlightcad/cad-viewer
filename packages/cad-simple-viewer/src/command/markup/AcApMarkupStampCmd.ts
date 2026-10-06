import { AcApContext } from '../../app'
import {
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import { createMarkupMeta, promptMarkupText } from './AcApMarkupCmdUtil'
import { AcApMarkupDrawCmd } from './AcApMarkupDrawCmd'
import { commitMarkup } from './AcApMarkupPresenter'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import { defaultMarkupStyle } from './AcApMarkupUtil'

const BUILTIN_STAMPS = new Set([
  'approved',
  'rejected',
  'revised',
  'for-review',
  'custom'
])

/**
 * Place a review stamp (or custom symbol) at a picked point.
 */
export class AcApMarkupStampCmd extends AcApMarkupDrawCmd {
  async execute(context: AcApContext) {
    await this.withMarkupInput(context, async () => {
      const stampPrompt = new AcEdPromptStringOptions(
        AcApI18n.t('jig.markup.stamp.kind')
      )
      stampPrompt.allowEmpty = false
      stampPrompt.allowSpaces = false
      stampPrompt.defaultValue = 'approved'
      stampPrompt.useDefaultValue = true
      const stampResult = await context.view.editor.getString(stampPrompt)
      if (stampResult.status !== AcEdPromptStatus.OK) return
      const stampId = (stampResult.stringResult ?? 'approved')
        .trim()
        .toLowerCase()

      let imageUrl: string | undefined
      if (stampId === 'custom' || !BUILTIN_STAMPS.has(stampId)) {
        imageUrl = await promptMarkupText(
          context,
          'jig.markup.stamp.imageUrl',
          ''
        )
      }

      const caption = await promptMarkupText(
        context,
        'jig.markup.stamp.caption',
        ''
      )

      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.stamp.point')
      )
      const pointResult = await context.view.editor.getPoint(pointPrompt)
      if (pointResult.status !== AcEdPromptStatus.OK) return
      const position = pointResult.value!

      const isSymbol = stampId !== 'custom' && !BUILTIN_STAMPS.has(stampId)
      if (isSymbol) {
        const meta = createMarkupMeta(
          'symbol',
          context.view as AcTrView2d,
          context,
          { text: caption || undefined }
        )
        const record: AcApMarkupRecord = {
          ...meta,
          type: 'symbol',
          style: defaultMarkupStyle(),
          geometry: {
            type: 'symbol',
            position: { x: position.x, y: position.y },
            symbolId: stampId,
            imageUrl: imageUrl || undefined
          }
        }
        commitMarkup(context.view, record)
        return
      }

      const meta = createMarkupMeta(
        'stamp',
        context.view as AcTrView2d,
        context,
        { text: caption || undefined }
      )
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'stamp',
        style: defaultMarkupStyle(),
        geometry: {
          type: 'stamp',
          position: { x: position.x, y: position.y },
          stampId,
          imageUrl: imageUrl || undefined
        }
      }
      commitMarkup(context.view, record)
    })
  }
}
