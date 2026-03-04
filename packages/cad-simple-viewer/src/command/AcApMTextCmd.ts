import { AcDbMText, AcGePoint3dLike } from '@mlightcad/data-model'
import { MTextInputBox } from '@mlightcad/mtext-input-box'
import * as THREE from 'three'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptBoxOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import { AcTrView2d } from '../view'

interface AcApMTextEditorResult {
  contents: string
  width: number
  height: number
}

/**
 * Command to create one mtext entity.
 */
export class AcApMTextCmd extends AcEdCommand {
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
    const result = await this.openMTextEditor(
      view,
      location,
      width,
      textHeight
    )
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

  private openMTextEditor(
    view: AcTrView2d,
    location: AcGePoint3dLike,
    width: number,
    textHeight: number
  ): Promise<AcApMTextEditorResult | null> {
    const origin = new THREE.Vector3(location.x, location.y, location.z ?? 0)
    const isLightBackground = view.backgroundColor === 0xffffff
    const cursorColor = isLightBackground ? '#000000' : '#ffffff'

    const mtextInputBox = new MTextInputBox({
      scene: view.internalScene,
      camera: view.internalCamera,
      width,
      position: origin.clone(),
      initialText: '',
      defaultFormat: {
        fontFamily: 'simkai',
        fontSize: textHeight,
        bold: false,
        italic: false,
        underline: false,
        overline: false,
        strike: false,
        script: 'normal',
        aci: null,
        rgb: isLightBackground ? 0x000000 : 0xffffff
      },
      cursorStyle: {
        color: cursorColor,
        glowColor: cursorColor
      },
      imeTarget: view.canvas,
      toolbar: {
        enabled: true,
        theme: isLightBackground ? 'light' : 'dark',
        container: view.container,
        offsetY: 10
      }
    })

    return new Promise(resolve => {
      let done = false

      const onRenderFrame = () => {
        if (done) return
        mtextInputBox.update()
        view.isDirty = true
      }

      const cleanup = () => {
        mtextInputBox.dispose()
        view.events.renderFrame.removeEventListener(onRenderFrame)
        window.removeEventListener('keydown', onKeyDown, true)
        view.isDirty = true
      }

      const finish = (result: AcApMTextEditorResult | null) => {
        if (done) return
        done = true
        cleanup()
        resolve(result)
      }

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(null)
          return
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          finish({
            contents: mtextInputBox.getText(),
            width,
            height: textHeight
          })
        }
      }

      window.addEventListener('keydown', onKeyDown, true)
      view.events.renderFrame.addEventListener(onRenderFrame)
    })
  }

  private pixelsToWorldY(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }
}
