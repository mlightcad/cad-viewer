import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'
import { AcApDxfConvertor } from './AcApDxfConvertor'

/**
 * Command for exporting the current CAD drawing to DXF format.
 */
export class AcApConvertToDxfCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    const converter = new AcApDxfConvertor()
    converter.convert()
  }
}
