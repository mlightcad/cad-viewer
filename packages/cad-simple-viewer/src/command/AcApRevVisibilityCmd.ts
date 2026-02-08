import { AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'

/**
 * Command for switching the visibility of the current layer.
 */
export class AcApRevVisibilityCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  /**
   * Executes the command to switch the visibility of the current layer.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const db = context.doc.database
    const currentLayer = db.clayer
    if (currentLayer) {
      const layer = db.tables.layerTable.getAt(currentLayer)
      if (layer) layer.isOff = !layer.isOff
    }
  }
}
