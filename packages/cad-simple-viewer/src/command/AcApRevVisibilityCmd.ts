import { AcApAnnotation, AcApContext } from '../app'
import { AcEdOpenMode } from '../editor'
import { AcApBaseRevCmd } from './AcApBaseRevCmd'

/**
 * Command for switching the visibility of the current layer.
 */
export class AcApRevVisibilityCmd extends AcApBaseRevCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
    this.isShowEntityDrawStyleToolbar = false
  }

  /**
   * Executes the command to switch the visibility of the current layer.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const db = context.doc.database
    const annotation = new AcApAnnotation(db)
    const annotationLayer = annotation.getAnnotationLayer()
    if (annotationLayer) {
      const layer = db.tables.layerTable.getAt(annotationLayer)
      if (layer) layer.isOff = !layer.isOff
    }
  }
}
