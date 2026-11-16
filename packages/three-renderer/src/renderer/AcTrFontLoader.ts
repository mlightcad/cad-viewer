import { DefaultFontLoader } from '@mlightcad/mtext-renderer'

import { AcTrMTextRenderer } from './AcTrMTextRenderer.js'

export class AcTrFontLoader extends DefaultFontLoader {
  onFontUrlChanged(url: string): void {
    AcTrMTextRenderer.getInstance().setFontUrl(url)
  }
}
