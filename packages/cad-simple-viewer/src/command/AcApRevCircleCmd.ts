import { AcApContext } from '../app'
import { AcEdOpenMode } from '../editor'
import { AcApBaseRevCmd } from './AcApBaseRevCmd'
import { AcApCircleCmd } from './AcApCircleCmd'

/**
 * Command to create one revision circle.
 */
export class AcApRevCircleCmd extends AcApBaseRevCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const cmd = new AcApCircleCmd()
    await cmd.execute(context)
  }
}
