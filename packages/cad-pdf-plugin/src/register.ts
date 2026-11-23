import {
  AcApDocManager,
  type AcApPluginManager,
  AcApTextRecognitionService,
  AcApUiRegistry,
  type AcApUiRibbonItem,
  ICON_EXPORT_PDF
} from '@mlightcad/cad-simple-viewer'

import { pdfUiMessages } from './i18n/chrome.js'
import { registerPdfExportDialogCommand } from './ui/AcUiPdfExportDialog.js'
import {
  PDF_ICON_DIM,
  PDF_ICON_HATCH,
  PDF_ICON_IMPORT,
  PDF_ICON_SCALE,
  PDF_ICON_TEXT,
  PDF_ICON_TXT2MTXT
} from './ui/icons.js'

/** Lazy plugin name for PDF export/import. */
export const PDF_PLUGIN_NAME = 'PdfPlugin'

/**
 * Trigger commands handled by {@link PDF_PLUGIN_NAME}.
 *
 * - `-cpdf` — export drawing to PDF via command-line prompts
 * - `cpdf` — export dialog in the browser (registered here when a DOM exists);
 *   loads this plugin on confirm via `-cpdf`. Node hosts keep the prompt command
 * - `pdfimport` — import vector geometry from PDF through the Import PDF dialog
 * - `-pdfimport` — same import with command-line prompts
 * - `pdfscale` — calibrate imported PDF geometry from a known distance
 * - `pdftext` — convert exploded PDF text strokes back into text
 * - `pdfdim` — turn exploded PDF dimensions back into dimensions
 * - `pdfhatch` — turn the loose strokes of a PDF hatch back into a hatch
 */
export const PDF_PLUGIN_TRIGGERS = [
  '-cpdf',
  'cpdf',
  'pdfimport',
  '-pdfimport',
  'pdfscale',
  'pdftext',
  'pdfdim',
  'pdfhatch'
] as const

/** Triggers that remain when export is disabled. */
const PDF_IMPORT_TRIGGERS = [
  'pdfimport',
  '-pdfimport',
  'pdfscale',
  'pdftext',
  'pdfdim',
  'pdfhatch'
] as const

const PDFTEXT_AUTO_ITEM_ID = 'pdftext-auto'

/** OCR rows under Recover Text. Refreshed when recognizers change. */
let pdfTextOcrItems: AcApUiRibbonItem[] = []
let pdfTextOcrListening = false

/**
 * Loads the PDF plugin and runs Recover Text, optionally pinning one OCR provider.
 *
 * @param recognizerId - Recognizer to prefer. Omit to try every provider.
 */
async function runPdfText(recognizerId?: string) {
  const { AcApPdfTextCmd } = await import('@mlightcad/cad-pdf-plugin')
  AcApPdfTextCmd.preferRecognizer(recognizerId)
  await AcApDocManager.instance.pluginManager.loadByTrigger('pdftext')
  AcApDocManager.instance.sendStringToExecute('pdftext')
}

/** Rebuilds the Recover Text dropdown from the recognizers currently available. */
async function refreshPdfTextOcrItems() {
  let next: AcApUiRibbonItem[]
  try {
    const providers = await AcApTextRecognitionService.listAvailable()
    next = providers.map(provider => ({
      id: `pdftext-ocr:${encodeURIComponent(provider.id)}`,
      label: provider.label,
      invoke: () => runPdfText(provider.id)
    }))
  } catch {
    next = []
  }
  // `listAvailable()` may itself re-register recognizers and fire `changed`
  // again. Rebuilding the ribbon only when the rows differ keeps that from
  // turning into an endless refresh loop.
  if (sameOcrItems(pdfTextOcrItems, next)) return
  pdfTextOcrItems = next
  AcApUiRegistry.touch(PDF_PLUGIN_NAME)
}

function sameOcrItems(
  a: readonly AcApUiRibbonItem[],
  b: readonly AcApUiRibbonItem[]
): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => item.id === b[i].id && item.label === b[i].label)
  )
}

/** Keeps the Recover Text dropdown in sync with OCR registrations. */
function watchPdfTextOcr() {
  if (pdfTextOcrListening) return
  pdfTextOcrListening = true
  AcApTextRecognitionService.events.changed.addEventListener(() => {
    void refreshPdfTextOcrItems()
  })
}

/**
 * Dropdown rows for Recover Text: Auto, then whatever OCR providers are installed.
 */
function pdfTextChildren(): AcApUiRibbonItem[] {
  return [
    {
      id: PDFTEXT_AUTO_ITEM_ID,
      labelKey: 'main.ribbon.pdfText.auto',
      tooltipKey: 'main.ribbon.tooltip.pdfTextAuto',
      invoke: () => runPdfText()
    },
    ...pdfTextOcrItems
  ]
}

/**
 * Registers the PDF plugin for lazy loading.
 *
 * Import from `@mlightcad/cad-pdf-plugin/register` so the main plugin bundle
 * is not pulled into the application entry chunk. The ribbon group and the
 * File → Export row are declared here, so a host that never calls this
 * function does not show them.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration
 * @param options.disableExport - Omit export menu, triggers, and the dialog
 * @param options.dialog - Register the `cpdf` dialog when a DOM exists.
 *   Defaults to true. Headless hosts pass `false` so `cpdf` stays a prompt.
 */
export function registerLazyPdfPlugin(
  pluginManager: AcApPluginManager,
  options: { disableExport?: boolean; dialog?: boolean } = {}
): void {
  const disableExport = options.disableExport === true
  const triggers = disableExport
    ? [...PDF_IMPORT_TRIGGERS]
    : [...PDF_PLUGIN_TRIGGERS]

  watchPdfTextOcr()
  AcApUiRegistry.register({
    plugin: PDF_PLUGIN_NAME,
    messages: pdfUiMessages(),
    ribbonGroups: [
      {
        id: 'ai-pdf',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.pdf',
        items: [
          {
            id: 'cmd-pdfimport',
            command: 'pdfimport',
            labelKey: 'main.ribbon.command.importPdf',
            tooltipKey: 'main.ribbon.tooltip.importPdf',
            iconSvg: PDF_ICON_IMPORT,
            size: 'large'
          },
          {
            id: 'cmd-pdfscale',
            command: 'pdfscale',
            labelKey: 'main.ribbon.command.pdfScale',
            tooltipKey: 'main.ribbon.tooltip.pdfScale',
            iconSvg: PDF_ICON_SCALE,
            size: 'large'
          },
          {
            id: 'cmd-pdftext',
            labelKey: 'main.ribbon.command.pdfText',
            tooltipKey: 'main.ribbon.tooltip.pdfText',
            iconSvg: PDF_ICON_TEXT,
            size: 'large',
            invoke: () => runPdfText(),
            childrenProvider: pdfTextChildren
          },
          {
            id: 'cmd-txt2mtxt',
            command: 'txt2mtxt',
            labelKey: 'main.ribbon.command.txt2mtxt',
            tooltipKey: 'main.ribbon.tooltip.txt2mtxt',
            iconSvg: PDF_ICON_TXT2MTXT,
            size: 'large'
          },
          {
            id: 'cmd-pdfdim',
            command: 'pdfdim',
            labelKey: 'main.ribbon.command.pdfDim',
            tooltipKey: 'main.ribbon.tooltip.pdfDim',
            iconSvg: PDF_ICON_DIM,
            size: 'large'
          },
          {
            id: 'cmd-pdfhatch',
            command: 'pdfhatch',
            labelKey: 'main.ribbon.command.pdfHatch',
            tooltipKey: 'main.ribbon.tooltip.pdfHatch',
            iconSvg: PDF_ICON_HATCH,
            size: 'large'
          }
        ]
      }
    ],
    menuItems: disableExport
      ? []
      : [
          {
            id: 'ExportPdf',
            parentId: 'file.export',
            labelKey: 'main.mainMenu.exportPdf',
            command: 'cpdf',
            iconSvg: ICON_EXPORT_PDF,
            order: 20
          }
        ]
  })
  void refreshPdfTextOcrItems()
  if (!disableExport && options.dialog !== false) {
    registerPdfExportDialogCommand()
  }

  pluginManager.registerLazyPlugin({
    name: PDF_PLUGIN_NAME,
    triggers: [...triggers],
    loader: async () => {
      const { createPdfPlugin } = await import('@mlightcad/cad-pdf-plugin')
      return createPdfPlugin({ disableExport })
    }
  })
}
