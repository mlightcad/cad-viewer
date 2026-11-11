// The recognizer only needs i18n from the viewer; the full package pulls in
// the renderer and text editor stacks.
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApI18n: {
    t: (key: string, options?: { fallback?: string }) =>
      options?.fallback ?? key,
    mergeLocaleMessage: () => undefined
  }
}))

// A provider that never answers until the request is aborted.
const generateText = jest.fn(
  ({ abortSignal }: { abortSignal?: AbortSignal }) =>
    new Promise((_, reject) => {
      abortSignal?.addEventListener('abort', () =>
        reject(abortSignal.reason ?? new Error('aborted'))
      )
    })
)
jest.mock('ai', () => ({ generateText }))
jest.mock('../src/model/skipDataUrlDownload', () => ({
  acapLlmSkipDataUrlDownload: undefined
}))
jest.mock('../src/model/AcApLlmModelFactory', () => ({
  acapLlmCreateModel: () => ({})
}))
jest.mock('../src/storage/AcApLlmConfigStore', () => ({
  acapLlmLoadConfig: async () => ({}),
  acapLlmResolveVisionSettings: () => ({ model: 'vision-model' })
}))

import {
  acapLlmRecognizeText,
  acapLlmRecognizeTextBatch,
  ACAP_LLM_RECOGNITION_TIMEOUT_MS
} from '../src/AcApLlmTextRecognizer'

describe('LLM text recognition timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    generateText.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('gives up on a batch whose provider never answers', async () => {
    const result = acapLlmRecognizeTextBatch({ images: ['a', 'b'] })
    const settled = expect(result).rejects.toThrow('recognitionTimeout')
    // Let the config load and the request start before the clock runs out.
    await jest.advanceTimersByTimeAsync(ACAP_LLM_RECOGNITION_TIMEOUT_MS + 1)
    await settled
    expect(generateText).toHaveBeenCalledTimes(1)
    // The hung request is cancelled, not left running.
    const { abortSignal } = generateText.mock.calls[0][0]
    expect(abortSignal?.aborted).toBe(true)
  })

  it('gives up on a single image whose provider never answers', async () => {
    const result = acapLlmRecognizeText({ image: 'a' })
    const settled = expect(result).rejects.toThrow('recognitionTimeout')
    await jest.advanceTimersByTimeAsync(ACAP_LLM_RECOGNITION_TIMEOUT_MS + 1)
    await settled
  })
})
