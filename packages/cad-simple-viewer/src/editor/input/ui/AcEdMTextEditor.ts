import { AcDbSysVarManager, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcDbSystemVariables } from '@mlightcad/data-model/src/database/AcDbSystemVariables'
import {
  MTextInputBox,
  type MTextToolbarTheme,
  type MTextToolbarColorPickerFactory
} from '@mlightcad/mtext-input-box'
import * as THREE from 'three'

import { AcApDocManager } from '../../../app'
import { AcTrView2d } from '../../../view'

/**
 * Result payload returned by the MTEXT editor when editing is finished.
 */
export interface AcEdMTextEditorResult {
  /** Final MTEXT contents (including inline formatting codes). */
  contents: string
  /** Final text box width in world units. */
  width: number
  /** Final text box height in world units. */
  height: number
}

/**
 * Options used to open an interactive MTEXT editor.
 */
export interface AcEdMTextEditorOptions {
  /** Active 2D view where the editor overlay and text box are rendered. */
  view: AcTrView2d
  /** Insertion location (top-left anchor) in world coordinates. */
  location: AcGePoint3dLike
  /** Initial MTEXT box width in world units. */
  width: number
  /** Default text height in world units. */
  textHeight: number
  /** Optional initial MTEXT source string. Defaults to empty string. */
  initialText?: string
  /**
   * Optional font family list displayed in toolbar font dropdown.
   *
   * Empty values are ignored and duplicates are removed before being passed
   * to `MTextInputBox`.
   */
  toolbarFontFamilies?: string[]
  /**
   * Optional custom toolbar color picker factory. When provided (or when set via
   * {@link AcEdMTextEditor.setDefaultColorPicker}), replaces the default native
   * color input in the MTEXT toolbar.
   */
  toolbarColorPicker?: MTextToolbarColorPickerFactory
}

/**
 * Lightweight wrapper around `MTextInputBox` for CAD editor integration.
 *
 * This class binds the MTEXT input component to the current `AcTrView2d`
 * render loop and handles lifecycle cleanup when the editor is closed.
 */
export class AcEdMTextEditor {
  /**
   * Default toolbar color picker factory used when opening the editor if
   * per-call options do not provide {@link AcEdMTextEditorOptions.toolbarColorPicker}.
   * Set via {@link AcEdMTextEditor.setDefaultColorPicker}.
   */
  static defaultColorPicker: MTextToolbarColorPickerFactory | null = null

  /**
   * Registers a default toolbar color picker factory. The factory is used for
   * every subsequent {@link open} call unless overridden by
   * {@link AcEdMTextEditorOptions.toolbarColorPicker}.
   *
   * @param factory - Factory to use, or `null` to clear and use the built-in picker.
   */
  static setDefaultColorPicker(
    factory: MTextToolbarColorPickerFactory | null
  ): void {
    AcEdMTextEditor.defaultColorPicker = factory
  }

  /**
   * Opens the MTEXT editor and resolves when user closes the editor UI.
   *
   * The method:
   * - creates a `MTextInputBox` at the requested world location
   * - configures default text style and toolbar options
   * - updates editor state on each view render frame
   * - disposes resources and event listeners on close
   *
   * @param options - Runtime options used to initialize the editor instance.
   * @returns A promise resolving to final MTEXT result; resolves to `null` only
   * when future cancel flows are introduced.
   */
  open(options: AcEdMTextEditorOptions): Promise<AcEdMTextEditorResult | null> {
    const {
      view,
      location,
      width,
      textHeight,
      initialText = '',
      toolbarFontFamilies = [],
      toolbarColorPicker
    } = options
    const origin = new THREE.Vector3(location.x, location.y, location.z ?? 0)
    const isLightBackground = view.backgroundColor === 0xffffff
    const cursorColor = isLightBackground ? '#000000' : '#ffffff'
    const getToolbarTheme = (): MTextToolbarTheme => {
      const database = AcApDocManager.instance.curDocument.database
      const rawTheme = AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.COLORTHEME,
        database
      )
      if (
        rawTheme === 0 ||
        rawTheme === '0' ||
        rawTheme === false ||
        rawTheme === 'dark'
      ) {
        return 'dark'
      }
      return 'light'
    }
    const fontFamilies = Array.from(
      new Set(
        toolbarFontFamilies
          .map(fontName => fontName.trim())
          .filter(fontName => fontName.length > 0)
      )
    )

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
        theme: getToolbarTheme(),
        fontFamilies,
        container: view.container,
        offsetY: 10,
        colorPicker:
          toolbarColorPicker ?? AcEdMTextEditor.defaultColorPicker ?? undefined
      }
    })

    return new Promise(resolve => {
      let done = false

      const onRenderFrame = () => {
        if (done) return
        mtextInputBox.update()
        view.isDirty = true
      }

      const onSysVarChanged = (args: {
        name: string
        database: unknown
      }) => {
        if (
          args.name.toLowerCase() !== AcDbSystemVariables.COLORTHEME.toLowerCase()
        ) {
          return
        }
        mtextInputBox.setToolbarTheme(getToolbarTheme())
        view.isDirty = true
      }

      const cleanup = () => {
        mtextInputBox.dispose()
        view.events.renderFrame.removeEventListener(onRenderFrame)
        mtextInputBox.off('close', onClose)
        AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
          onSysVarChanged
        )
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
      AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
        onSysVarChanged
      )
    })
  }
}
