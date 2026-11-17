import {
  acapPaddleOcrResolveModelAssets,
  buildUstar,
  PADDLE_OCR_FETCH_TIMEOUT_MS
} from '../src/AcApPaddleOcrModelAssets'

describe('buildUstar', () => {
  it('writes ustar headers and pads file contents to 512-byte blocks', () => {
    const bytes = new TextEncoder().encode('hello')
    const tar = buildUstar([{ name: 'inference.yml', bytes }])
    // Header (512) + content (5) + pad (507) + two end blocks (1024)
    expect(tar.length).toBe(512 + 512 + 1024)
    const name = new TextDecoder().decode(tar.subarray(0, 13))
    expect(name.startsWith('inference.yml')).toBe(true)
    expect(new TextDecoder().decode(tar.subarray(512, 517))).toBe('hello')
    // Magic "ustar"
    expect(new TextDecoder().decode(tar.subarray(257, 262))).toBe('ustar')
  })
})

describe('acapPaddleOcrResolveModelAssets', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    jest.useRealTimers()
    globalThis.fetch = originalFetch
  })

  it('aborts hung CDN downloads so recognition can fall through', async () => {
    globalThis.fetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(
              init.signal?.reason ?? new DOMException('Aborted', 'AbortError')
            )
          })
        })
    ) as typeof fetch

    jest.useFakeTimers()
    const pending = acapPaddleOcrResolveModelAssets()
    const expectation = expect(pending).rejects.toBeDefined()
    // Two Baidu BOS attempts, then Hugging Face onnx+yml in parallel.
    await jest.advanceTimersByTimeAsync(PADDLE_OCR_FETCH_TIMEOUT_MS * 3 + 1)
    await expectation
  })
})
