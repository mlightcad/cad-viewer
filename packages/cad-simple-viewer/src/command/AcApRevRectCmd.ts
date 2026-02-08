import { AcApContext } from '../app'
import { AcEdOpenMode } from '../editor'
import { AcApBaseRevCmd } from './AcApBaseRevCmd'
import { AcApRectCmd } from './AcApRectCmd'

/**
 * Command to create one revision rectangle.
 */
export class AcApRevRectCmd extends AcApBaseRevCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const cmd = new AcApRectCmd()
    await cmd.execute(context)
  }
}
