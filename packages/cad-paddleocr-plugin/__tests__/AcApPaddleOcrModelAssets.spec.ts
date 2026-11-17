import { buildUstar } from '../src/AcApPaddleOcrModelAssets'

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
