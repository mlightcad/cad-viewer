import { AcEdOpenMode } from '../editor'
import { AcApCircleCmd } from './AcApCircleCmd'

/**
 * Command to create one revision circle.
 */
export class AcApRevCircleCmd extends AcApCircleCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }
}
