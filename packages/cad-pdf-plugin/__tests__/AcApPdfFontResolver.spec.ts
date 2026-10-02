const mockFindFontInfoByName = jest.fn()
const mockGetReplacementFontName = jest.fn()
const mockGetLoadedMeshFontProgram = jest.fn()
const mockRememberMeshFontProgram = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApFontUtil: {
    findFontInfoByName: (...args: unknown[]) => mockFindFontInfoByName(...args),
    getReplacementFontName: (...args: unknown[]) =>
      mockGetReplacementFontName(...args),
    getLoadedMeshFontProgram: (...args: unknown[]) =>
      mockGetLoadedMeshFontProgram(...args),
    rememberMeshFontProgram: (...args: unknown[]) =>
      mockRememberMeshFontProgram(...args)
  }
}))

import { resolveViewerTextFont } from '../src/AcApPdfFontResolver'

describe('resolveViewerTextFont', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mockFindFontInfoByName.mockReset()
    mockGetReplacementFontName.mockReset()
    mockGetLoadedMeshFontProgram.mockReset()
    mockRememberMeshFontProgram.mockReset()
    globalThis.fetch = jest.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns cached program bytes without fetching', async () => {
    const cached = new Uint8Array([10, 20, 30])
    mockFindFontInfoByName.mockReturnValue({
      name: ['simsun'],
      file: 'simsun.woff',
      type: 'mesh',
      url: 'https://cdn.example.com/fonts/simsun.woff'
    })
    mockGetLoadedMeshFontProgram.mockReturnValue(cached)

    const result = await resolveViewerTextFont('simsun')

    expect(result).toBe(cached)
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(mockRememberMeshFontProgram).not.toHaveBeenCalled()
  })

  it('fetches and remembers when the session cache misses', async () => {
    const url = 'https://cdn.example.com/fonts/arial.ttf'
    mockFindFontInfoByName.mockReturnValue({
      name: ['arial'],
      file: 'arial.ttf',
      type: 'mesh',
      url
    })
    mockGetLoadedMeshFontProgram.mockReturnValue(undefined)
    const body = new Uint8Array([1, 2, 3, 4]).buffer
    ;(globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => body
    })

    const result = await resolveViewerTextFont('arial')

    expect(globalThis.fetch).toHaveBeenCalledWith(url)
    expect(mockRememberMeshFontProgram).toHaveBeenCalledWith(
      body,
      expect.arrayContaining(['arial', 'arial.ttf']),
      url
    )
    expect(result).toEqual(new Uint8Array(body))
  })

  it('returns undefined for SHX catalog hits without fetching', async () => {
    mockFindFontInfoByName.mockReturnValue({
      name: ['romans'],
      file: 'romans.shx',
      type: 'shx',
      url: 'https://cdn.example.com/fonts/romans.shx'
    })

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await resolveViewerTextFont('romans')
    warn.mockRestore()

    expect(result).toBeUndefined()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(mockGetLoadedMeshFontProgram).not.toHaveBeenCalled()
  })
})
