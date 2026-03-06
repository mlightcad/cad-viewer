import { AcDbMText } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdPromptBoxOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import { AcTrView2d } from '../view'

/**
 * Command to create one mtext entity.
 */
export class AcApMTextCmd extends AcEdCommand {
  private readonly mtextEditor = new AcEdMTextEditor()

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const boxPrompt = new AcEdPromptBoxOptions(
      AcApI18n.t('main.inputManager.firstCorner'),
      AcApI18n.t('main.inputManager.secondCorner')
    )
    boxPrompt.useBasePoint = false
    boxPrompt.useDashedLine = false
    const box = await AcApDocManager.instance.editor.getBox(boxPrompt)

    const width = Math.max(Math.abs(box.max.x - box.min.x), 1e-4)
    const view = context.view as AcTrView2d
    const textHeight = this.pixelsToWorldY(view, 24)
    const location = { x: box.min.x, y: box.max.y, z: 0 }
    const toolbarFontFamilies = Array.from(
      new Set(
        AcApDocManager.instance.avaiableFonts
          .flatMap(fontInfo => fontInfo.name)
          .map(fontName => fontName.trim())
          .filter(fontName => fontName.length > 0)
      )
    )
    const result = await this.mtextEditor.open({
      view,
      location,
      width,
      textHeight,
      toolbarFontFamilies
    })
    if (!result) return

    const contents = result.contents.trim()
    if (!contents) return

    const mtext = new AcDbMText()
    mtext.location = location
    mtext.contents = result.contents
    mtext.width = result.width
    mtext.height = result.height

    context.doc.database.tables.blockTable.modelSpace.appendEntity(mtext)
  }

  private pixelsToWorldY(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }
}
