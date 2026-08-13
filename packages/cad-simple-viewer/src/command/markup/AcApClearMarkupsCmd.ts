import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'
import type { AcTrView2d } from '../../view'
import { configureMarkupCommand } from './AcApMarkupCmdUtil'
import { getMarkupPresenter } from './AcApMarkupPresenter'

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
