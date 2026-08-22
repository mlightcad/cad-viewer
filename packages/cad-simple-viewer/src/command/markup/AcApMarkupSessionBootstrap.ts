import { AcApMarkupHistory, AcApSessionUndo } from './AcApMarkupHistory'
import { AcApMarkupPresenter } from './AcApMarkupPresenter'
import { acapSetMarkupBagFactory } from './AcApMarkupSession'
import { AcApMarkupStore } from './AcApMarkupStore'

/** Installs default bag factory (store + presenter + history per session). */
acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: new AcApMarkupPresenter(),
  history: new AcApMarkupHistory(),
  sessionUndo: new AcApSessionUndo()
}))
