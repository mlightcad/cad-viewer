import { AcEdCommand } from '../editor/command/AcEdCommand.js'
import { acuiBindDrawStyleSessionAccessory } from '../ui/AcUiDrawStyle.js'

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
