import { AcApMarkupHistory, AcApSessionUndo } from './AcApMarkupHistory'
import { AcApMarkupPresenter } from './AcApMarkupPresenter'
import { acapSetMarkupBagFactory } from './AcApMarkupSession'
import { AcApMarkupStore } from './AcApMarkupStore'

let installed = false

/**
 * Installs the default per-session markup bag factory (store + presenter +
 * history). Safe to call more than once.
 *
 * Must stay a real export that production entry points import: a side-effect
 * `export *` from a module with no bindings is dropped when `package.json`
 * `sideEffects` is narrowed (e.g. to simple-ui styles only).
 */
export function acapInstallMarkupSessionBootstrap(): void {
  if (installed) return
  installed = true
  acapSetMarkupBagFactory(() => ({
    store: new AcApMarkupStore(),
    presenter: new AcApMarkupPresenter(),
    history: new AcApMarkupHistory(),
    sessionUndo: new AcApSessionUndo()
  }))
}

acapInstallMarkupSessionBootstrap()
