import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApDxfConvertor } from './AcApDxfConvertor'

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
