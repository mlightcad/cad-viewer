import {
  checkWebworkerReadiness,
  resetWebworkerReadinessCache
} from '../src/app/AcApWebworkerReadiness'
import {
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '../src/app/AcApWorkerAssets'

function mockFetch(
  implementation: (...args: unknown[]) => unknown
): typeof fetch {
  return jest.fn(implementation) as unknown as typeof fetch
}

describe('checkWebworkerReadiness', () => {
  const originalFetch = global.fetch
  const dwgParserUrl = `/workers/${LIBREDWG_PARSER_WORKER_FILE}`
  const mtextRenderUrl = `/workers/${MTEXT_RENDERER_WORKER_FILE}`

  beforeEach(() => {
    resetWebworkerReadinessCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('probes only the MTEXT worker by default', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )

    const ready = await checkWebworkerReadiness()

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      `./assets/${MTEXT_RENDERER_WORKER_FILE}`,
      { method: 'HEAD' }
    )
  })

  it('uses HEAD requests and returns true when all workers respond ok', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )

    const ready = await checkWebworkerReadiness({
      dwgParser: dwgParserUrl,
      mtextRender: mtextRenderUrl
    })

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenCalledWith(dwgParserUrl, { method: 'HEAD' })
  })

  it('does not cache failures so a later retry can succeed', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('network error')
    )

    const urls = {
      dwgParser: dwgParserUrl,
      mtextRender: mtextRenderUrl
    }

    expect(await checkWebworkerReadiness(urls)).toBe(false)
    expect(await checkWebworkerReadiness(urls)).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })

  it('caches a successful result for the current page lifecycle', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )

    const urls = {
      dwgParser: dwgParserUrl,
      mtextRender: mtextRenderUrl
    }

    expect(await checkWebworkerReadiness(urls)).toBe(true)
    expect(await checkWebworkerReadiness(urls)).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to a ranged GET when HEAD returns 405', async () => {
    global.fetch = mockFetch((...args: unknown[]) => {
      const init = args[1] as RequestInit | undefined
      if (init?.method === 'HEAD') {
        return Promise.resolve({ ok: false, status: 405 } as Response)
      }
      return Promise.resolve({ ok: true, status: 206 } as Response)
    })

    const ready = await checkWebworkerReadiness({
      dwgParser: dwgParserUrl,
      mtextRender: mtextRenderUrl
    })

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(mtextRenderUrl, {
      method: 'HEAD'
    })
    expect(global.fetch).toHaveBeenCalledWith(mtextRenderUrl, {
      headers: { Range: 'bytes=0-0' }
    })
    expect(global.fetch).toHaveBeenCalledWith(dwgParserUrl, { method: 'HEAD' })
    expect(global.fetch).toHaveBeenCalledWith(dwgParserUrl, {
      headers: { Range: 'bytes=0-0' }
    })
  })
})
