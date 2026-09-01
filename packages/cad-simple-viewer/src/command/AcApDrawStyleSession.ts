import type { AcEdCommand } from '../editor/command/AcEdCommand'
import type { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import type { AcEdSessionAccessoryCoordinator } from '../editor/input/ui/AcEdSessionAccessoryCoordinator'
import type { AcTrView2d } from '../view'

/** Registers a built-in system command with resolved aliases. */
export type AcApSystemCommandRegistrar = (
  cmdGlobalName: string,
  cmdLocalName: string,
  cmd: AcEdCommand
) => void

/** Context for one-time draw-style session accessory installation per view. */
export interface AcApDrawStyleSessionInstallContext {
  view: AcTrView2d
  coordinator: AcEdSessionAccessoryCoordinator
  commandManager: AcEdCommandStack
}

export {
  acapGetDrawStyleSessionAccessory,
  acapInstallDrawStyleSessionAccessory
} from './AcApInstallDrawStyleSessionAccessory'
