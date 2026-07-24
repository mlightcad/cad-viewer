import {
  checkWebworkerReadiness,
  resetWebworkerReadinessCache
} from '../src/app/AcApWebworkerReadiness'

function mockFetch(
  implementation: (...args: unknown[]) => unknown
): typeof fetch {
  return jest.fn(implementation) as unknown as typeof fetch
}

describe('checkWebworkerReadiness', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    resetWebworkerReadinessCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('uses HEAD requests and returns true when all workers respond ok', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )

    const ready = await checkWebworkerReadiness({
      dwgParser: '/workers/libredwg-parser-worker.js',
      mtextRender: '/workers/mtext-renderer-worker.js'
    })

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenCalledWith(
      '/workers/libredwg-parser-worker.js',
      { method: 'HEAD' }
    )
  })

  it('does not cache failures so a later retry can succeed', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('network error')
    )

    const urls = {
      dwgParser: '/workers/libredwg-parser-worker.js',
      mtextRender: '/workers/mtext-renderer-worker.js'
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
      dwgParser: '/workers/libredwg-parser-worker.js',
      mtextRender: '/workers/mtext-renderer-worker.js'
    }

    expect(await checkWebworkerReadiness(urls)).toBe(true)
    expect(await checkWebworkerReadiness(urls)).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to a ranged GET when HEAD returns 405', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 405 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 206 } as Response)

    const ready = await checkWebworkerReadiness({
      dwgParser: '/workers/libredwg-parser-worker.js'
    })

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/workers/libredwg-parser-worker.js',
      { method: 'HEAD' }
    )
    expect(global.fetch).toHaveBeenCalledWith(
      '/workers/libredwg-parser-worker.js',
      { headers: { Range: 'bytes=0-0' } }
    )
  })
})
