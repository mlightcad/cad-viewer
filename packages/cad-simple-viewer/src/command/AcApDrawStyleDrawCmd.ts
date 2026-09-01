import { AcEdCommand } from '../editor/command/AcEdCommand'
import { acuiBindDrawStyleSessionAccessory } from '../ui/AcUiDrawStyle'

/**
 * Shared base for measure/markup draw commands that expose color / font-size
 * session accessories while prompting.
 */
export abstract class AcApDrawStyleDrawCmd extends AcEdCommand {
  constructor() {
    super()
    acuiBindDrawStyleSessionAccessory(this)
  }
}
