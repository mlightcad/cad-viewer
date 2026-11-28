import type { AcApContext } from '../app/AcApContext.js'
import { AcEdCommand } from '../editor/command/AcEdCommand.js'
import type { AcEditor } from '../editor/input/AcEditor.js'
import { AcEdPromptKeywordOptions } from '../editor/input/prompt/AcEdPromptKeywordOptions.js'
import { AcEdPromptStatus } from '../editor/input/prompt/AcEdPromptStatus.js'
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../i18n/AcApI18n.js'
import {
  type AcApUcsIconSettings,
  AcApUcsService
} from '../service/AcApUcsService.js'

type UcsIconKeyword =
  | 'ON'
  | 'OFF'
  | 'All'
  | 'Noorigin'
  | 'ORigin'
  | 'Selectable'
  | 'Properties'

const MAIN_KEYS: UcsIconKeyword[] = [
  'ON',
  'OFF',
  'All',
  'Noorigin',
  'ORigin',
  'Selectable',
  'Properties'
]

/**
 * UCSICON — controls UCS icon visibility, placement, selectability, and
 * appearance (AutoCAD-compatible).
 *
 * @see https://help.autodesk.com/view/CIV3D/2023/ENU/?guid=GUID-EA2D8ACA-336A-4656-BFD3-43BC371C6171
 */
export class AcApUcsiconCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const editor = context.view.editor
    let applyAll = AcApUcsService.getIconSettings(db).applyToAllActiveViewports

    while (true) {
      const choice = await this.askMain(editor, applyAll)
      if (choice === undefined) return

      if (choice === 'All') {
        applyAll = true
        continue
      }

      if (choice === 'Properties') {
        const host = context.view?.container ?? document.body
        // Dynamic import keeps the dialog out of the DocManager command graph.
        const { AcUiUcsIconDialog } = await import('../ui/AcUiUcsIconDialog.js')
        await AcUiUcsIconDialog.open(host)
        return
      }

      if (choice === 'Selectable') {
        const selectable = await this.askOnOff(
          editor,
          'selectable',
          AcApUcsService.getIconSettings(db).allowSelectingIcon
        )
        if (selectable === undefined) return
        this.patchSettings(db, { allowSelectingIcon: selectable }, applyAll)
        return
      }

      if (choice === 'ON') {
        this.patchSettings(db, { on: true }, applyAll)
        return
      }
      if (choice === 'OFF') {
        this.patchSettings(db, { on: false }, applyAll)
        return
      }
      if (choice === 'ORigin') {
        this.patchSettings(db, { atOrigin: true }, applyAll)
        return
      }
      if (choice === 'Noorigin') {
        this.patchSettings(db, { atOrigin: false }, applyAll)
        return
      }
    }
  }

  private patchSettings(
    db: Parameters<typeof AcApUcsService.setIconSettings>[1],
    patch: Partial<AcApUcsIconSettings>,
    applyToAllActiveViewports: boolean
  ) {
    const current = AcApUcsService.getIconSettings(db)
    AcApUcsService.setIconSettings(
      {
        ...current,
        ...patch,
        applyToAllActiveViewports
      },
      db
    )
  }

  private async askMain(
    editor: AcEditor,
    _applyAll: boolean
  ): Promise<UcsIconKeyword | undefined> {
    const settings = AcApUcsService.getIconSettings()
    const defaultKey: UcsIconKeyword = !settings.on
      ? 'OFF'
      : settings.atOrigin
        ? 'ORigin'
        : 'ON'
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.ucsicon.enterOption')
    )
    prompt.allowNone = true
    const byGlobal = new Map<string, UcsIconKeyword>()
    for (const key of MAIN_KEYS) {
      const base = `jig.ucsicon.keywords.${this.keywordI18nKey(key)}`
      const global = AcApI18n.t(`${base}.global`)
      const keyword = prompt.keywords.add(
        AcApI18n.t(`${base}.display`),
        global,
        AcApI18n.t(`${base}.local`)
      )
      byGlobal.set(global, key)
      if (key === defaultKey) prompt.keywords.default = keyword
    }

    const result = await editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.None) return undefined
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return undefined
    }
    return byGlobal.get(result.stringResult ?? '')
  }

  private async askOnOff(
    editor: AcEditor,
    kind: 'selectable',
    currentOn: boolean
  ): Promise<boolean | undefined> {
    const message = AcApI18n.t(`jig.ucsicon.${kind}Option`)
    const prompt = new AcEdPromptKeywordOptions(message)
    prompt.allowNone = true
    const onKw = prompt.keywords.add(
      AcApI18n.t('jig.ucsicon.keywords.on.display'),
      AcApI18n.t('jig.ucsicon.keywords.on.global'),
      AcApI18n.t('jig.ucsicon.keywords.on.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.ucsicon.keywords.off.display'),
      AcApI18n.t('jig.ucsicon.keywords.off.global'),
      AcApI18n.t('jig.ucsicon.keywords.off.local')
    )
    prompt.keywords.default = currentOn
      ? onKw
      : prompt.keywords.findByGlobalName(
          AcApI18n.t('jig.ucsicon.keywords.off.global')
        )

    const result = await editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.None) return currentOn
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return undefined
    }
    const global = result.stringResult ?? ''
    if (global === AcApI18n.t('jig.ucsicon.keywords.on.global')) return true
    if (global === AcApI18n.t('jig.ucsicon.keywords.off.global')) return false
    return currentOn
  }

  private keywordI18nKey(key: UcsIconKeyword): string {
    switch (key) {
      case 'ON':
        return 'on'
      case 'OFF':
        return 'off'
      case 'All':
        return 'all'
      case 'Noorigin':
        return 'noorigin'
      case 'ORigin':
        return 'origin'
      case 'Selectable':
        return 'selectable'
      case 'Properties':
        return 'properties'
    }
  }
}
