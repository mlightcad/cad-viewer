/**
 * @jest-environment jsdom
 */

const predict = jest.fn()
const dispose = jest.fn()
const create = jest.fn(
  async (_options: Record<string, unknown>) => ({ predict, dispose })
)

jest.mock('@paddleocr/paddleocr-js', () => ({
  PaddleOCR: {
    create: (options: Record<string, unknown>) => create(options)
  }
}))

jest.mock('../src/AcApPaddleOcrModelAssets', () => ({
  PADDLE_OCR_DET_MODEL: 'PP-OCRv5_mobile_det',
  PADDLE_OCR_REC_MODEL: 'PP-OCRv5_mobile_rec',
  acapPaddleOcrResolveModelAssets: async () => ({
    detection: { url: 'blob:det' },
    recognition: { url: 'blob:rec' }
  })
}))

import { acapPaddleOcrConfigure } from '../src/AcApPaddleOcrConfig'
import {
  acapPaddleOcrRecognizeText,
  acapPaddleOcrRecognizeTextBatch,
  acapPaddleOcrResetEngineForTests,
  dataUrlToBlob,
  joinOcrItems,
  localeToPaddleLang
} from '../src/AcApPaddleOcrTextRecognizer'

describe('localeToPaddleLang', () => {
  it('maps to PP-OCRv5-supported lang presets only', () => {
    expect(localeToPaddleLang('zh')).toBe('ch')
    expect(localeToPaddleLang('zh-CN')).toBe('ch')
    expect(localeToPaddleLang('zh-TW')).toBe('chinese_cht')
    expect(localeToPaddleLang('zh-Hant')).toBe('chinese_cht')
    expect(localeToPaddleLang('ja')).toBe('japan')
    expect(localeToPaddleLang('en')).toBe('en')
    expect(localeToPaddleLang(undefined)).toBe('ch')
    // No dedicated PP-OCRv5 preset — must not return unsupported values.
    expect(localeToPaddleLang('ko-KR')).toBe('en')
    expect(localeToPaddleLang('tr')).toBe('en')
    expect(localeToPaddleLang('cs')).toBe('en')
    expect(localeToPaddleLang('ar')).toBe('en')
  })
})

describe('joinOcrItems', () => {
  it('joins boxes and drops empties', () => {
    expect(joinOcrItems([{ text: 'A' }, { text: ' B ' }])).toBe('A B')
    expect(joinOcrItems([{ text: '  ' }])).toBeUndefined()
    expect(joinOcrItems([])).toBeUndefined()
    expect(joinOcrItems(undefined)).toBeUndefined()
  })
})

describe('dataUrlToBlob', () => {
  it('decodes a PNG data URL', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,AQID')
    expect(blob.type).toBe('image/png')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(Array.from(bytes)).toEqual([1, 2, 3])
  })
})

describe('acapPaddleOcrRecognizeTextBatch', () => {
  beforeEach(async () => {
    predict.mockReset()
    dispose.mockReset()
    create.mockClear()
    await acapPaddleOcrResetEngineForTests()
    acapPaddleOcrConfigure({ wasmPaths: './vendor/onnxruntime/' })
  })

  afterEach(async () => {
    await acapPaddleOcrResetEngineForTests()
  })

  it('returns undefined for empty detection boxes', async () => {
    predict.mockResolvedValue([{ items: [] }, { items: [{ text: 'OK' }] }])
    await expect(
      acapPaddleOcrRecognizeTextBatch({
        images: [
          'data:image/png;base64,AA==',
          'data:image/png;base64,AQ=='
        ],
        locale: 'en'
      })
    ).resolves.toEqual([undefined, 'OK'])
    expect(create).toHaveBeenCalled()
    const options = create.mock.calls[0][0] as {
      ortOptions?: { wasmPaths?: string }
    }
    expect(options.ortOptions?.wasmPaths).toMatch(/\/vendor\/onnxruntime\/$/)
  })

  it('reads a single image through the batch path', async () => {
    predict.mockResolvedValue([{ items: [{ text: 'LINE' }] }])
    await expect(
      acapPaddleOcrRecognizeText({
        image: 'data:image/png;base64,AA==',
        locale: 'zh'
      })
    ).resolves.toBe('LINE')
  })

  it('aborts before calling predict', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      acapPaddleOcrRecognizeTextBatch({
        images: ['data:image/png;base64,AA=='],
        signal: controller.signal
      })
    ).rejects.toThrow()
    expect(predict).not.toHaveBeenCalled()
  })
})
