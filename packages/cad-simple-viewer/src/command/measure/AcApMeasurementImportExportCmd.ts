import { AcApContext } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcTrView2d } from '../../view'
import { runMeasurementEdit } from './AcApMeasurementHistory'
import { placeMeasurementRecord } from './AcApMeasurementPlace'
import {
  measurementSidecarFileName,
  parseMeasurementSidecar,
  stringifyMeasurementSidecar
} from './AcApMeasurementSidecar'
import { collectMeasurementRecords } from './AcApMeasurementStore'

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
 * Export current measurements to a `{drawing}.measurement.json` download.
 */
export class AcApMeasurementExportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    const drawingName = context.doc.fileName || context.doc.docTitle
    const text = stringifyMeasurementSidecar({
      version: 1,
      drawingName,
      measurements: collectMeasurementRecords(view)
    })
    downloadText(measurementSidecarFileName(drawingName), text)
  }
}

/**
 * Import measurements from a sidecar JSON file and place them on the view.
 */
export class AcApMeasurementImportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    // Keep a prompt in i18n for hosts that show status text before the picker.
    void new AcEdPromptStringOptions(
      AcApI18n.t('jig.measurement.import.chooseFile')
    )
    const text = await pickJsonFile()
    if (text == null) return
    let sidecar
    try {
      sidecar = parseMeasurementSidecar(text)
    } catch (err) {
      console.error(err)
      return
    }
    const view = context.view as AcTrView2d
    const db = context.doc.database
    runMeasurementEdit(view, 'Import Measurements', () => {
      for (const record of sidecar.measurements) {
        placeMeasurementRecord(view, db, record)
      }
    })
  }
}
