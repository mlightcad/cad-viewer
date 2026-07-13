import {
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint3dLike,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'
import {
  MTextInputBox,
  type MTextToolbarColorPickerFactory,
  type MTextToolbarTheme
} from '@mlightcad/mtext-input-box'
import { MTextAttachmentPoint, MTextColor } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcApDocManager } from '../../../app'
import { AcTrView2d } from '../../../view'
import { acgiIsLightBackground } from '../../global/AcEdUiColor'

function acGiAttachmentToMText(
  ap: AcGiMTextAttachmentPoint | undefined
): MTextAttachmentPoint | undefined {
  if (ap === undefined) return undefined
  const v = ap as number
  if (v >= 1 && v <= 12) return v as MTextAttachmentPoint
  return MTextAttachmentPoint.TopLeft
}

function mTextAttachmentToAcGi(
  ap: MTextAttachmentPoint
): AcGiMTextAttachmentPoint {
  return ap as unknown as AcGiMTextAttachmentPoint
}

export type AcEdMTextEditorCurrentFormatChangeListener = () => void
export interface AcEdMTextEditorCurrentFormatObservable {
  addCurrentFormatChangeListener: (
    listener: AcEdMTextEditorCurrentFormatChangeListener
  ) => void
  removeCurrentFormatChangeListener: (
    listener: AcEdMTextEditorCurrentFormatChangeListener
  ) => void
}
export type AcEdMTextEditorActiveInputBox = MTextInputBox &
  Partial<AcEdMTextEditorCurrentFormatObservable> & {
    /**
     * Returns keyboard focus to the hidden IME input used by the editor.
     *
     * Contextual ribbon controls use this after formatting commands so the
     * inline editor keeps behaving like its built-in toolbar.
     */
    focusEditor?: () => void
    /** Returns whether the current selection is a non-script stacked fraction. */
    isStackSelectionActive?: () => boolean
  }
export type AcEdMTextEditorActiveInputBoxChangeListener = (
  inputBox: AcEdMTextEditorActiveInputBox | null
) => void

type MTextInputBoxRuntimeMethod = (...args: unknown[]) => unknown
type MTextInputBoxRuntimeMethodName =
  | 'setCurrentFormat'
  | 'refreshCurrentFormatFromDocument'
  | 'toggleCase'
  | 'toggleStackSelection'
  | 'toggleScriptSelection'
  | 'setParagraphAlignment'
  | 'setAttachmentPoint'
  | 'setLineSpacingFactor'
  | 'clearLineSpacing'

const mtextFormatBridgeKey = '__mlightcadMTextFormatBridge'

interface MTextInputBoxFormatBridge extends AcEdMTextEditorCurrentFormatObservable {
  dispose: () => void
}

type MTextInputBoxRuntime = MTextInputBox &
  Partial<Record<MTextInputBoxRuntimeMethodName, MTextInputBoxRuntimeMethod>> &
  Partial<AcEdMTextEditorCurrentFormatObservable> & {
    focusEditor?: () => void
    isStackSelectionActive?: () => boolean
    [mtextFormatBridgeKey]?: MTextInputBoxFormatBridge
  }
interface MTextInputBoxRuntimeStackNode {
  type?: string
  divider?: string
  numerator?: string
  denominator?: string
}

/**
 * Result payload returned by the MTEXT editor when editing is finished.
 */
export interface AcEdMTextEditorResult {
  /** Final MTEXT contents (including inline formatting codes). */
  contents: string
  /** Final MTEXT insertion location in world coordinates. */
  location: AcGePoint3dLike
  /** Final text box width in world units. */
  width: number
  /** Final text box height in world units. */
  height: number
  /** Line spacing factor used by the MTEXT input box renderer. */
  lineSpacingFactor: number
  /** MTEXT attachment (DXF group 71) matching the editor justify control. */
  attachmentPoint: AcGiMTextAttachmentPoint
}

/**
 * Options used to open an interactive MTEXT editor.
 */
export interface AcEdMTextEditorOptions {
  /** Active 2D view where the editor overlay and text box are rendered. */
  view: AcTrView2d
  /** Insertion location (top-left anchor) in world coordinates. */
  location: AcGePoint3dLike
  /**
   * Initial MTEXT attachment (DXF 71). When omitted, the editor uses top-left
   * until the user changes justify in the ribbon.
   */
  initialAttachmentPoint?: AcGiMTextAttachmentPoint
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
  /**
   * Controls the built-in MTEXT input box toolbar for this editor instance.
   * Defaults to {@link AcEdMTextEditor.defaultToolbarEnabled}.
   */
  toolbarEnabled?: boolean
}

/**
 * Lightweight wrapper around `MTextInputBox` for CAD editor integration.
 *
 * This class binds the MTEXT input component to the current `AcTrView2d`
 * render loop and handles lifecycle cleanup when the editor is closed.
 */
export class AcEdMTextEditor {
  static readonly defaultLineSpacingFactor = 0.3

  private static activeInputBox: MTextInputBox | null = null
  private static readonly activeInputBoxChangeListeners =
    new Set<AcEdMTextEditorActiveInputBoxChangeListener>()

  /**
   * Default toolbar color picker factory used when opening the editor if
   * per-call options do not provide {@link AcEdMTextEditorOptions.toolbarColorPicker}.
   * Set via {@link AcEdMTextEditor.setDefaultColorPicker}.
   */
  static defaultColorPicker: MTextToolbarColorPickerFactory | null = null

  /**
   * Default visibility for the built-in MTEXT input box toolbar. Applications
   * with their own contextual ribbon can disable this while keeping the input
   * box editor active.
   */
  static defaultToolbarEnabled = true

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
   * Registers the default built-in toolbar visibility for subsequent
   * {@link open} calls.
   *
   * @param enabled - `true` to show the MTEXT input box toolbar by default.
   */
  static setDefaultToolbarEnabled(enabled: boolean): void {
    AcEdMTextEditor.defaultToolbarEnabled = enabled
  }

  /**
   * Returns the MTEXT input box currently being edited, if any.
   */
  static getActiveInputBox(): AcEdMTextEditorActiveInputBox | null {
    return AcEdMTextEditor.activeInputBox
  }

  /**
   * Subscribes to active MTEXT input box changes.
   */
  static addActiveInputBoxChangeListener(
    listener: AcEdMTextEditorActiveInputBoxChangeListener
  ): void {
    AcEdMTextEditor.activeInputBoxChangeListeners.add(listener)
  }

  /**
   * Removes an active MTEXT input box listener.
   */
  static removeActiveInputBoxChangeListener(
    listener: AcEdMTextEditorActiveInputBoxChangeListener
  ): void {
    AcEdMTextEditor.activeInputBoxChangeListeners.delete(listener)
  }

  private static setActiveInputBox(inputBox: MTextInputBox | null): void {
    if (AcEdMTextEditor.activeInputBox === inputBox) return
    AcEdMTextEditor.activeInputBox = inputBox
    AcEdMTextEditor.activeInputBoxChangeListeners.forEach(listener => {
      listener(inputBox)
    })
  }

  private static createHiddenToolbarContainer(
    parent: HTMLElement
  ): HTMLElement {
    const container = parent.ownerDocument.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    Object.assign(container.style, {
      display: 'none',
      pointerEvents: 'none'
    })
    parent.appendChild(container)
    return container
  }

  private static attachFormatBridge(inputBox: MTextInputBox): void {
    const runtime = inputBox as MTextInputBoxRuntime
    if (runtime[mtextFormatBridgeKey]) return

    const listeners = new Set<AcEdMTextEditorCurrentFormatChangeListener>()
    const restoreMethods: Array<() => void> = []
    const notifyFormatChanged = () => {
      listeners.forEach(listener => {
        listener()
      })
    }
    const wrapMethod = (methodName: MTextInputBoxRuntimeMethodName) => {
      const original = runtime[methodName]
      if (typeof original !== 'function') return

      runtime[methodName] = (...args: unknown[]) => {
        const result = original.apply(runtime, args)
        notifyFormatChanged()
        return result
      }
      restoreMethods.push(() => {
        runtime[methodName] = original
      })
    }

    ;(
      [
        'setCurrentFormat',
        'refreshCurrentFormatFromDocument',
        'toggleCase',
        'toggleStackSelection',
        'toggleScriptSelection',
        'setParagraphAlignment',
        'setAttachmentPoint',
        'setLineSpacingFactor',
        'clearLineSpacing'
      ] as const
    ).forEach(wrapMethod)

    runtime.addCurrentFormatChangeListener = listener => {
      listeners.add(listener)
    }
    runtime.removeCurrentFormatChangeListener = listener => {
      listeners.delete(listener)
    }
    runtime.focusEditor = () => {
      const runtimeMethods = runtime as unknown as Record<
        string,
        MTextInputBoxRuntimeMethod | undefined
      >
      const focus = runtimeMethods.focusImeInput
      if (typeof focus === 'function') {
        focus.call(runtime)
        return
      }

      const refocusSoon = runtimeMethods.refocusImeInputSoon
      if (typeof refocusSoon === 'function') {
        refocusSoon.call(runtime)
      }
    }
    runtime.isStackSelectionActive = () => {
      const runtimeMethods = runtime as unknown as Record<string, unknown>
      const getSelectionRange = runtimeMethods.getSelectionRange
      const toDocumentIndexFromLogicalIndex =
        runtimeMethods.toDocumentIndexFromLogicalIndex
      const isScriptOnlyStack = runtimeMethods.isScriptOnlyStack
      const document = runtimeMethods.document as
        | { ast?: { nodes?: MTextInputBoxRuntimeStackNode[] } }
        | undefined

      if (
        typeof getSelectionRange !== 'function' ||
        typeof toDocumentIndexFromLogicalIndex !== 'function'
      ) {
        return false
      }

      const selection = getSelectionRange.call(runtime) as
        | { start: number; end: number; isCollapsed: boolean }
        | undefined
      if (!selection || selection.isCollapsed) return false

      const start = toDocumentIndexFromLogicalIndex.call(
        runtime,
        selection.start,
        true
      ) as number
      const end = toDocumentIndexFromLogicalIndex.call(
        runtime,
        selection.end,
        false
      ) as number
      const selectedNodes = document?.ast?.nodes?.slice(start, end) ?? []
      const stackNode = selectedNodes[0]
      if (selectedNodes.length !== 1 || stackNode?.type !== 'stack') {
        return false
      }

      if (typeof isScriptOnlyStack === 'function') {
        return !isScriptOnlyStack.call(runtime, stackNode)
      }

      if (stackNode.divider !== '^') return true
      const hasNumerator = (stackNode.numerator ?? '').trim().length > 0
      const hasDenominator = (stackNode.denominator ?? '').trim().length > 0
      return hasNumerator === hasDenominator
    }
    runtime[mtextFormatBridgeKey] = {
      addCurrentFormatChangeListener: runtime.addCurrentFormatChangeListener,
      removeCurrentFormatChangeListener:
        runtime.removeCurrentFormatChangeListener,
      dispose: () => {
        restoreMethods.forEach(restore => {
          restore()
        })
        listeners.clear()
        delete runtime.addCurrentFormatChangeListener
        delete runtime.removeCurrentFormatChangeListener
        delete runtime.focusEditor
        delete runtime.isStackSelectionActive
        delete runtime[mtextFormatBridgeKey]
      }
    }
  }

  private static detachFormatBridge(inputBox: MTextInputBox): void {
    const runtime = inputBox as MTextInputBoxRuntime
    runtime[mtextFormatBridgeKey]?.dispose()
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
      toolbarColorPicker,
      toolbarEnabled = AcEdMTextEditor.defaultToolbarEnabled,
      initialAttachmentPoint
    } = options
    const origin = new THREE.Vector3(location.x, location.y, location.z ?? 0)
    const isLightBg = acgiIsLightBackground(view.backgroundColor)
    const cursorColor = isLightBg ? '#000000' : '#ffffff'
    const docManager = AcApDocManager.instance
    const database = docManager.curDocument.database
    const { layerColor } = docManager.resolveColors()
    const getToolbarTheme = (): MTextToolbarTheme => {
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
    const resolveLayerTextStyle = () => {
      const record = database.tables.textStyleTable.getAt(database.textstyle)
      return record?.textStyle
    }
    const normalizedTextHeight = Math.max(1, textHeight)
    const layerTextStyle = resolveLayerTextStyle()
    const defaultTextStyle = layerTextStyle
      ? {
          ...layerTextStyle,
          fixedTextHeight: normalizedTextHeight,
          lastHeight: normalizedTextHeight
        }
      : undefined
    // MTextInputBox still uses its shared toolbar object for internal format
    // sync while editing. Keep that object alive when the app hides the built-in
    // toolbar, but mount it into a hidden host so only the contextual ribbon is
    // visible.
    const hiddenToolbarContainer = toolbarEnabled
      ? null
      : AcEdMTextEditor.createHiddenToolbarContainer(view.container)

    const mtextAttachment = acGiAttachmentToMText(initialAttachmentPoint)

    const mtextInputBox = new MTextInputBox({
      scene: view.internalScene,
      camera: view.internalCamera,
      width,
      position: origin.clone(),
      initialText,
      ...(mtextAttachment !== undefined
        ? { initialAttachmentPoint: mtextAttachment }
        : {}),
      textStyle: defaultTextStyle,
      cursorStyle: {
        color: cursorColor,
        glowColor: cursorColor
      },
      boundingBoxStyle: {
        padding: 0
      },
      imeTarget: view.canvas,
      colorSettings: {
        layer: database.clayer,
        color: new MTextColor(),
        byLayerColor: layerColor,
        byBlockColor: layerColor
      },
      toolbar: {
        enabled: true,
        theme: getToolbarTheme(),
        fontFamilies,
        container: hiddenToolbarContainer ?? view.container,
        offsetY: 10,
        colorPicker:
          toolbarColorPicker ?? AcEdMTextEditor.defaultColorPicker ?? undefined
      }
    })
    AcEdMTextEditor.attachFormatBridge(mtextInputBox)
    AcEdMTextEditor.setActiveInputBox(mtextInputBox)

    return new Promise(resolve => {
      let done = false

      const onRenderFrame = () => {
        if (done) return
        mtextInputBox.update()
        view.isDirty = true
      }

      const onSysVarChanged = (args: { name: string; database: unknown }) => {
        if (
          args.name.toLowerCase() !==
          AcDbSystemVariables.COLORTHEME.toLowerCase()
        ) {
          return
        }
        mtextInputBox.setToolbarTheme(getToolbarTheme())
        view.isDirty = true
      }

      const cleanup = () => {
        if (AcEdMTextEditor.activeInputBox === mtextInputBox) {
          AcEdMTextEditor.setActiveInputBox(null)
        }
        AcEdMTextEditor.detachFormatBridge(mtextInputBox)
        mtextInputBox.dispose()
        hiddenToolbarContainer?.remove()
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
        const insertionPoint = mtextInputBox.getMTextInsertionPoint()
        finish({
          contents: mtextInputBox.getText(),
          location: {
            x: insertionPoint.x,
            y: insertionPoint.y,
            z: insertionPoint.z
          },
          width,
          height: normalizedTextHeight,
          lineSpacingFactor:
            mtextInputBox.getLineSpacingFactor?.() ??
            AcEdMTextEditor.defaultLineSpacingFactor,
          attachmentPoint: mTextAttachmentToAcGi(
            mtextInputBox.getMTextAttachmentPoint()
          )
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
