import { AcEdOpenMode } from '../editor'
import { AcApRectCmd } from './AcApRectCmd'

/**
 * Command to create one revision rectangle.
 */
export class AcApRevRectCmd extends AcApRectCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }
}
