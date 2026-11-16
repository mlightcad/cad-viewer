import { AcApContext } from '../../app/index.js'
import { AcEdCommand } from '../../editor/index.js'
import type { AcTrView2d } from '../../view/index.js'
import { configureMarkupCommand } from './AcApMarkupCmdUtil.js'
import { getMarkupPresenter } from './AcApMarkupPresenter.js'

/**
 * Clear Design Review markups on the active layout (Model / paper space).
 */
export class AcApClearMarkupsCmd extends AcEdCommand {
  constructor() {
    super()
    configureMarkupCommand(this)
  }

  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    getMarkupPresenter().clearLayout(view, view.activeLayoutBtrId, {
      clearStore: true
    })
  }
}
