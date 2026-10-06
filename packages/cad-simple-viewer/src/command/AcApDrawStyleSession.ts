import type { AcEdCommand } from '../editor/command/AcEdCommand'
import type { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import type { AcTrView2d } from '../view'

/**
 * Registers a built-in system command with resolved aliases.
 *
 * @param cmdGlobalName - Global (English) command name.
 * @param cmdLocalName - Localized command name.
 * @param cmd - Command instance to register.
 */
export type AcApSystemCommandRegistrar = (
  cmdGlobalName: string,
  cmdLocalName: string,
  cmd: AcEdCommand
) => void

/** Context for one-time draw-style session accessory installation per view. */
export interface AcApDrawStyleSessionInstallContext {
  /** View that receives the draw-style controls host. */
  view: AcTrView2d
  /** Command stack used to resolve the active draw command kind. */
  commandManager: AcEdCommandStack
}

export {
  acapGetDrawStyleSessionAccessory,
  acapInstallDrawStyleSessionAccessory
} from './AcApInstallDrawStyleSessionAccessory'
