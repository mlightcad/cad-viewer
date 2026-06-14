jest.mock('@mlightcad/cad-simple-viewer', () => {
  class AcEdCommand {}

  class MockKeywordCollection {
    default: unknown
    add(display: string, global: string, local: string) {
      return { display, global, local, enabled: true, visible: true }
    }
  }

  class AcEdPromptKeywordOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
  }

  return {
    AcApContext: {},
    AcApDocManager: {
      instance: {
        editor: {
          getKeywords: jest.fn()
        }
      }
    },
    AcApI18n: {
      t: (key: string) => {
        const globals: Record<string, string> = {
          'jig.chtml.keywords.yes.global': 'Yes',
          'jig.chtml.keywords.no.global': 'No',
          'jig.chtml.keywords.extents.global': 'Extents',
          'jig.chtml.keywords.current.global': 'Current'
        }
        return globals[key] ?? key
      }
    },
    AcEdCommand,
    AcEdPromptKeywordOptions,
    AcEdPromptStatus: {
      Cancel: -5002,
      None: 0x1388,
      OK: 0x13ec,
      Keyword: -5005
    }
  }
})

jest.mock('../src/AcApHtmlConvertor', () => ({
  AcApHtmlConvertor: jest.fn().mockImplementation(() => ({
    convert: jest.fn(() => Promise.resolve())
  }))
}))

import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcEdPromptStatus } from '@mlightcad/cad-simple-viewer'

import { AcApExportHtmlCmd } from '../src/AcApExportHtmlCmd'
import { AcApHtmlConvertor } from '../src/AcApHtmlConvertor'

const getKeywords = AcApDocManager.instance.editor.getKeywords as jest.Mock
const convert = () =>
  (AcApHtmlConvertor as jest.MockedClass<typeof AcApHtmlConvertor>).mock
    .results[0]?.value.convert as jest.Mock

describe('AcApExportHtmlCmd prompt defaults', () => {
  const cmd = new AcApExportHtmlCmd()
  const context = {
    doc: { fileName: 'drawing.dwg', docTitle: 'Drawing' },
    view: {}
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('accepts empty Enter (None) for both prompts and exports with defaults', async () => {
    getKeywords
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(2)
    expect(getKeywords.mock.calls[0][0].allowNone).toBe(true)
    expect(getKeywords.mock.calls[1][0].allowNone).toBe(true)
    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      {
        exportInvisibleLayers: true,
        initialView: 'fit'
      },
      context.view
    )
  })

  test('accepts default keyword (OK) for both prompts and exports', async () => {
    getKeywords
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Yes'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Extents'
      })

    await cmd.execute(context)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      {
        exportInvisibleLayers: true,
        initialView: 'fit'
      },
      context.view
    )
  })

  test('cancels export when the first prompt is cancelled', async () => {
    getKeywords.mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(1)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('cancels export when the second prompt is cancelled', async () => {
    getKeywords
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(2)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('registers default keywords on prompt options', async () => {
    getKeywords
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    await cmd.execute(context)

    const invisibleLayersPrompt = getKeywords.mock.calls[0][0]
    const initialViewPrompt = getKeywords.mock.calls[1][0]

    expect(invisibleLayersPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Yes' })
    )
    expect(initialViewPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Extents' })
    )
  })
})
