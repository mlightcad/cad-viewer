import { AcDbMText, AcGePoint3dLike } from '@mlightcad/data-model'
import { MTextInputBox } from '@mlightcad/mtext-input-box'
import * as THREE from 'three'

import { AcApContext, AcApDocManager } from '../app'
import { AcEdCommand, AcEdOpenMode, AcEdPromptPointOptions } from '../editor'
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
    const pointPrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.mtext.point'))
    const location = await AcApDocManager.instance.editor.getPoint(pointPrompt)

    const view = context.view as AcTrView2d
    const result = await this.openMTextEditor(view, location)
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
    location: AcGePoint3dLike
  ): Promise<AcApMTextEditorResult | null> {
    const width = this.pixelsToWorldX(view, 360)
    const height = this.pixelsToWorldY(view, 24)
    const origin = new THREE.Vector3(location.x, location.y, location.z ?? 0)

    const mtextInputBox = new MTextInputBox({
      scene: view.internalScene,
      camera: view.internalCamera,
      width,
      position: origin.clone(),
      initialText: '',
      defaultFormat: {
        fontFamily: 'simkai',
        fontSize: height,
        bold: false,
        italic: false,
        underline: false,
        overline: false,
        strike: false,
        script: 'normal',
        aci: null,
        rgb: 0xffffff
      },
      imeTarget: view.canvas,
      toolbar: {
        enabled: true,
        theme: view.backgroundColor === 0xffffff ? 'light' : 'dark',
        container: view.container,
        offsetY: 10
      }
    })

    return new Promise(resolve => {
      let done = false
      let rafId = 0

      const toLocalPoint = (event: MouseEvent) => {
        const canvasPoint = view.viewportToCanvas({
          x: event.clientX,
          y: event.clientY
        })
        const worldPoint = view.screenToWorld(canvasPoint)
        return {
          x: worldPoint.x - origin.x,
          y: worldPoint.y - origin.y
        }
      }

      const cleanup = () => {
        cancelAnimationFrame(rafId)
        mtextInputBox.dispose()
        view.canvas.removeEventListener('mousedown', onMouseDown)
        view.canvas.removeEventListener('mousemove', onMouseMove)
        view.canvas.removeEventListener('dblclick', onDoubleClick)
        window.removeEventListener('mouseup', onMouseUp)
        window.removeEventListener('keydown', onKeyDown, true)
        view.isDirty = true
      }

      const finish = (result: AcApMTextEditorResult | null) => {
        if (done) return
        done = true
        cleanup()
        resolve(result)
      }

      const tick = () => {
        if (done) return
        mtextInputBox.update()
        view.isDirty = true
        rafId = requestAnimationFrame(tick)
      }

      const onMouseDown = (event: MouseEvent) => {
        if (event.button === 1 || event.altKey) return

        const point = toLocalPoint(event)
        mtextInputBox.handleMouseDown(point.x, point.y, event.shiftKey)
        event.preventDefault()
        event.stopPropagation()
      }

      const onMouseMove = (event: MouseEvent) => {
        if (event.buttons === 0) return

        const point = toLocalPoint(event)
        mtextInputBox.handleMouseMove(point.x, point.y)
        event.preventDefault()
        event.stopPropagation()
      }

      const onMouseUp = () => {
        mtextInputBox.handleMouseUp()
      }

      const onDoubleClick = (event: MouseEvent) => {
        const point = toLocalPoint(event)
        mtextInputBox.handleDoubleClick(point.x, point.y)
        event.preventDefault()
        event.stopPropagation()
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
            height
          })
        }
      }

      view.canvas.addEventListener('mousedown', onMouseDown)
      view.canvas.addEventListener('mousemove', onMouseMove)
      view.canvas.addEventListener('dblclick', onDoubleClick)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('keydown', onKeyDown, true)
      tick()
    })
  }

  private pixelsToWorldX(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: pixels, y: 0 })
    return Math.max(Math.abs(p1.x - p0.x), 1e-4)
  }

  private pixelsToWorldY(view: AcTrView2d, pixels: number) {
    const p0 = view.screenToWorld({ x: 0, y: 0 })
    const p1 = view.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }
}
