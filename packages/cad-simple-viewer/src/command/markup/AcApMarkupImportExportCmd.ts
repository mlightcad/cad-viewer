import { AcApContext } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { runMarkupEdit } from './AcApMarkupHistory'
import { getMarkupPresenter } from './AcApMarkupPresenter'
import {
  markupSidecarFileName,
  parseMarkupSidecar,
  stringifyMarkupSidecar
} from './AcApMarkupSidecar'
import { getMarkupStore } from './AcApMarkupStore'

function downloadText(filename: string, text: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pickJsonFile(): Promise<string | undefined> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      resolve(undefined)
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    let settled = false
    const finish = (text?: string) => {
      if (settled) return
      settled = true
      resolve(text)
    }
    input.addEventListener('cancel', () => finish())
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        finish()
        return
      }
      finish(await file.text())
    }
    input.click()
  })
}

/**
 * Export current markups to a `{drawing}.markup.json` download.
 */
export class AcApMarkupExportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const store = getMarkupStore()
    if (!store.drawingName) {
      store.drawingName = context.doc.fileName || context.doc.docTitle
    }
    const text = stringifyMarkupSidecar(store.toSidecar())
    downloadText(markupSidecarFileName(store.drawingName), text)
    store.markClean()
  }
}

/**
 * Import markups from a sidecar JSON file and republish onto the view.
 */
export class AcApMarkupImportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    // Keep a prompt in i18n for hosts that show status text before the picker.
    void new AcEdPromptStringOptions(AcApI18n.t('jig.markup.import.chooseFile'))
    const text = await pickJsonFile()
    if (text == null) return
    let sidecar
    try {
      sidecar = parseMarkupSidecar(text)
    } catch (err) {
      console.error(err)
      return
    }
    const store = getMarkupStore()
    runMarkupEdit(context.view, 'Import Markups', () => {
      store.replaceAll(sidecar.markups, sidecar.drawingName)
      getMarkupPresenter().republishAll(context.view)
    })
  }
}
