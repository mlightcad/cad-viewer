import { DefaultFontLoader } from '@mlightcad/mtext-renderer'

import { AcTrMTextRenderer } from './AcTrMTextRenderer'

export class AcTrFontLoader extends DefaultFontLoader {
  onFontUrlChanged(url: string): void {
    AcTrMTextRenderer.getInstance().setFontUrl(url)
  }
}
