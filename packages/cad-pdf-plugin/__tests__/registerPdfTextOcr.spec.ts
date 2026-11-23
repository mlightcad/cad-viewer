/**
 * @jest-environment jsdom
 */

type Listener = () => void

const recognitionListeners: Listener[] = []
let providers: Array<{ id: string; label: string }> = []
const touch = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  ICON_EXPORT_PDF: '',
  AcApDocManager: { instance: {} },
  AcApTextRecognitionService: {
    events: {
      changed: {
        addEventListener: (listener: Listener) =>
          recognitionListeners.push(listener)
      }
    },
    listAvailable: jest.fn(async () => providers.map(p => ({ ...p })))
  },
  AcApUiRegistry: {
    register: jest.fn(),
    touch: (plugin: string) => touch(plugin)
  }
}))

jest.mock('../src/i18n/chrome', () => ({ pdfUiMessages: () => ({}) }))
jest.mock('../src/ui/AcUiPdfExportDialog', () => ({
  registerPdfExportDialogCommand: jest.fn()
}))

import { registerLazyPdfPlugin } from '../src/register'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('PDF Recover Text OCR dropdown', () => {
  it('rebuilds the ribbon only when the OCR rows change', async () => {
    providers = [{ id: 'paddleocr', label: 'PaddleOCR' }]
    registerLazyPdfPlugin(
      { registerLazyPlugin: jest.fn() } as unknown as Parameters<
        typeof registerLazyPdfPlugin
      >[0],
      { dialog: false }
    )
    await flush()
    expect(touch).toHaveBeenCalledTimes(1)

    // `listAvailable()` can re-register recognizers and fire `changed` again.
    // An unchanged list must not rebuild the ribbon, or the two keep
    // triggering each other and pin a CPU core while the drawing is idle.
    recognitionListeners.forEach(listener => listener())
    await flush()
    expect(touch).toHaveBeenCalledTimes(1)

    providers = [...providers, { id: 'cad-llm:openai/gpt-4o', label: 'GPT' }]
    recognitionListeners.forEach(listener => listener())
    await flush()
    expect(touch).toHaveBeenCalledTimes(2)
  })
})
