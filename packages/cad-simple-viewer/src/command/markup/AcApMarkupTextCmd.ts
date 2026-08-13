import { AcApContext } from '../../app'
import {
  AcEdCommand,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import {
  configureMarkupCommand,
  createMarkupMeta,
  promptMarkupText,
  withMarkupInput
} from './AcApMarkupCmdUtil'
import { commitMarkup } from './AcApMarkupPresenter'
import type { AcApMarkupRecord } from './AcApMarkupTypes'

/**
 * Place a text markup label at a picked world point.
 */
export class AcApMarkupTextCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    await withMarkupInput(context, async () => {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.markup.text.point')
      )
      const pointResult = await context.view.editor.getPoint(pointPrompt)
      if (pointResult.status !== AcEdPromptStatus.OK) return
      const position = pointResult.value!

      const text =
        (await promptMarkupText(context, 'jig.markup.text.content', 'Note')) ??
        'Note'

      const meta = createMarkupMeta('text', context.view as AcTrView2d, context, {
        text
      })
      const record: AcApMarkupRecord = {
        ...meta,
        type: 'text',
        geometry: { type: 'text', position: { x: position.x, y: position.y } }
      }
      commitMarkup(context.view, record)
    })
  }
}
