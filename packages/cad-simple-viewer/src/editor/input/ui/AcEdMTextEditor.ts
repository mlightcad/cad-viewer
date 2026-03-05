import { AcGePoint3dLike } from '@mlightcad/data-model'
import { MTextInputBox } from '@mlightcad/mtext-input-box'
import * as THREE from 'three'

import { AcTrView2d } from '../../../view'

export interface AcEdMTextEditorResult {
  contents: string
  width: number
  height: number
}

export interface AcEdMTextEditorOptions {
  view: AcTrView2d
  location: AcGePoint3dLike
  width: number
  textHeight: number
  initialText?: string
}

export class AcEdMTextEditor {
  open(options: AcEdMTextEditorOptions): Promise<AcEdMTextEditorResult | null> {
    const { view, location, width, textHeight, initialText = '' } = options
    const origin = new THREE.Vector3(location.x, location.y, location.z ?? 0)
    const isLightBackground = view.backgroundColor === 0xffffff
    const cursorColor = isLightBackground ? '#000000' : '#ffffff'

    const mtextInputBox = new MTextInputBox({
      scene: view.internalScene,
      camera: view.internalCamera,
      width,
      position: origin.clone(),
      initialText,
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
        mtextInputBox.off('close', onClose)
        view.isDirty = true
      }

      const finish = (result: AcEdMTextEditorResult | null) => {
        if (done) return
        done = true
        cleanup()
        resolve(result)
      }

      const onClose = () => {
        finish({
          contents: mtextInputBox.getText(),
          width,
          height: textHeight
        })
      }

      mtextInputBox.on('close', onClose)
      view.events.renderFrame.addEventListener(onRenderFrame)
    })
  }
}
