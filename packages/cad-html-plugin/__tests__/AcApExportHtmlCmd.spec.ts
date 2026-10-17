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

  class AcEdPromptIntegerOptions {
    allowNone = false
    allowZero = true
    allowNegative = false
    useDefaultValue = false
    defaultValue = 0

    constructor(
      readonly message: string,
      readonly lowerLimit?: number,
      readonly upperLimit?: number
    ) {}
  }

  return {
    AcApContext: {},

    AcApDocManager: {
      instance: {
        editor: {
          getKeywords: jest.fn(),
          getInteger: jest.fn()
        }
      }
    },

    AcApI18n: {
      t: (key: string) => {
        const globals: Record<string, string> = {
          'jig.chtml.keywords.single.global': 'Single',
          'jig.chtml.keywords.multi.global': 'Multi',
          'jig.chtml.keywords.yes.global': 'Yes',
          'jig.chtml.keywords.no.global': 'No',
          'jig.chtml.keywords.extents.global': 'Extents',
          'jig.chtml.keywords.current.global': 'Current',
          'jig.chtml.keywords.view.global': 'View',
          'jig.chtml.keywords.measure.global': 'Measure'
        }

        return globals[key] ?? key
      }
    },

    AcEdCommand,

    AcEdPromptKeywordOptions,

    AcEdPromptIntegerOptions,

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

import { ACEX_DEFAULT_CHUNK_MAX_BYTES } from '@mlightcad/cad-html-core'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcEdPromptStatus } from '@mlightcad/cad-simple-viewer'

import { AcApExportHtmlCmd } from '../src/AcApExportHtmlCmd'
import { AcApHtmlConvertor } from '../src/AcApHtmlConvertor'
import {
  ACEX_DEFAULT_CHUNK_SIZE_MIB,
  acexChunkSizeMiBToBytes
} from '../src/AcApHtmlExportOptions'

const getKeywords = AcApDocManager.instance.editor.getKeywords as jest.Mock
const getInteger = AcApDocManager.instance.editor.getInteger as jest.Mock

const convert = () =>
  (AcApHtmlConvertor as jest.MockedClass<typeof AcApHtmlConvertor>).mock
    .results[0]?.value.convert as jest.Mock

function none() {
  return { status: AcEdPromptStatus.None }
}

const defaultExportOptions = {
  exportFormat: 'single',
  exportInvisibleLayers: true,
  exportLayouts: true,
  initialView: 'fit',
  viewerMode: 'measure',
  expiryDays: 'never',
  expiresAt: null,
  password: '',
  maxChunkBytes: ACEX_DEFAULT_CHUNK_MAX_BYTES,
  compressChunks: true
}

const defaultMultiExportOptions = {
  ...defaultExportOptions,
  exportFormat: 'multi' as const,
  maxChunkBytes: acexChunkSizeMiBToBytes(ACEX_DEFAULT_CHUNK_SIZE_MIB)
}

describe('AcApExportHtmlCmd prompt defaults', () => {
  const cmd = new AcApExportHtmlCmd()

  const context = {
    doc: { fileName: 'drawing.dwg', docTitle: 'Drawing' },
    view: {}
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('accepts empty Enter (None) for all prompts and exports with defaults', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(5)
    expect(getInteger).not.toHaveBeenCalled()
    expect(getKeywords.mock.calls[0][0].allowNone).toBe(true)
    expect(getKeywords.mock.calls[1][0].allowNone).toBe(true)
    expect(getKeywords.mock.calls[2][0].allowNone).toBe(true)
    expect(getKeywords.mock.calls[3][0].allowNone).toBe(true)
    expect(getKeywords.mock.calls[4][0].allowNone).toBe(true)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      defaultExportOptions,
      context.view
    )
  })

  test('accepts default keyword (OK) for all prompts and exports', async () => {
    getKeywords
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Single'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Yes'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Yes'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Extents'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Measure'
      })

    await cmd.execute(context)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      defaultExportOptions,
      context.view
    )
  })

  test('exports multi-file package when Multi keyword is selected', async () => {
    getKeywords
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Multi'
      })
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
    getInteger.mockResolvedValueOnce(none())

    await cmd.execute(context)

    expect(getInteger).toHaveBeenCalledTimes(1)
    expect(getKeywords).toHaveBeenCalledTimes(6)
    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      defaultMultiExportOptions,
      context.view
    )
  })

  test('exports multi-file package with custom chunk size and no compression', async () => {
    getKeywords
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Multi'
      })
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'No'
      })
    getInteger.mockResolvedValueOnce({
      status: AcEdPromptStatus.OK,
      value: 4
    })

    await cmd.execute(context)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      {
        ...defaultMultiExportOptions,
        maxChunkBytes: 4 * 1024 * 1024,
        compressChunks: false
      },
      context.view
    )
  })

  test('exports with view-only viewer mode when View keyword is selected', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'View'
      })

    await cmd.execute(context)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      { ...defaultExportOptions, viewerMode: 'view' },
      context.view
    )
  })

  test('exports without layouts when No is selected for the layouts prompt', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'No'
      })
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())

    await cmd.execute(context)

    expect(convert()).toHaveBeenCalledWith(
      'drawing.dwg',
      { ...defaultExportOptions, exportLayouts: false },
      context.view
    )
  })

  test('cancels export when the first prompt is cancelled', async () => {
    getKeywords.mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(1)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('cancels export when the layouts prompt is cancelled', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(3)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('cancels export when the viewer mode prompt is cancelled', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getKeywords).toHaveBeenCalledTimes(5)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('cancels multi export when the chunk size prompt is cancelled', async () => {
    getKeywords
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Multi'
      })
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
    getInteger.mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })

    await cmd.execute(context)

    expect(getInteger).toHaveBeenCalledTimes(1)
    expect(AcApHtmlConvertor).not.toHaveBeenCalled()
  })

  test('registers default keywords on prompt options', async () => {
    getKeywords
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())
      .mockResolvedValueOnce(none())

    await cmd.execute(context)

    const exportFormatPrompt = getKeywords.mock.calls[0][0]
    const invisibleLayersPrompt = getKeywords.mock.calls[1][0]
    const layoutsPrompt = getKeywords.mock.calls[2][0]
    const initialViewPrompt = getKeywords.mock.calls[3][0]
    const viewerModePrompt = getKeywords.mock.calls[4][0]

    expect(exportFormatPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Single' })
    )
    expect(invisibleLayersPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Yes' })
    )
    expect(layoutsPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Yes' })
    )
    expect(initialViewPrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Extents' })
    )
    expect(viewerModePrompt.keywords.default).toEqual(
      expect.objectContaining({ global: 'Measure' })
    )
  })
})
