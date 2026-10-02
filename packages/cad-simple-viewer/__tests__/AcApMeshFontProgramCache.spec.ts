import {
  clearMeshFontProgramCache,
  getMeshFontProgramByName,
  getMeshFontProgramByUrl,
  meshFontProgramCacheSize,
  rememberMeshFontProgramByName,
  rememberMeshFontProgramByUrl
} from '../src/util/AcApMeshFontProgramCache'

describe('AcApMeshFontProgramCache', () => {
  beforeEach(() => {
    clearMeshFontProgramCache()
  })

  it('remembers and returns programs by name (case-insensitive, strips extension)', () => {
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer
    rememberMeshFontProgramByName('SimSun.ttf', buffer)

    expect(getMeshFontProgramByName('simsun')).toBe(buffer)
    expect(getMeshFontProgramByName('SIMSUN.TTF')).toBe(buffer)
    expect(meshFontProgramCacheSize()).toEqual({ names: 1, urls: 0 })
  })

  it('remembers programs by URL independently of name', () => {
    const buffer = new Uint8Array([9, 8, 7]).buffer
    const url = 'https://cdn.example.com/fonts/arial.woff'
    rememberMeshFontProgramByUrl(url, buffer)

    expect(getMeshFontProgramByUrl(url)).toBe(buffer)
    expect(getMeshFontProgramByName('arial')).toBeUndefined()
  })
})
