import { AcApContext } from '../../app/index.js'
import { AcEdCommand } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { AcApDxfConvertor } from './AcApDxfConvertor.js'

/**
 * Command for exporting the current CAD drawing to DXF format.
 */
export class AcApConvertToDxfCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    await this.withBusyIndicator(() => {
      const converter = new AcApDxfConvertor()
      converter.convert()
    }, AcApI18n.t('main.message.exportingDxf'))
  }
}
