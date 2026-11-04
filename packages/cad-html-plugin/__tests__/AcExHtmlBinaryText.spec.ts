import {
  acexHtmlBase85ToBytes,
  acexHtmlBytesToBase85,
  acexHtmlBytesToText,
  acexHtmlTextToBytes,
  acexHtmlParseBinaryEncoding
} from '@mlightcad/cad-html-core'

describe('AcExHtmlBinaryText', () => {
  it('round-trips base85 for empty, short, and longer payloads', () => {
    const samples = [
      new Uint8Array(),
      new Uint8Array([0]),
      new Uint8Array([1, 2]),
      new Uint8Array([1, 2, 3]),
      new Uint8Array([1, 2, 3, 4]),
      new Uint8Array([1, 2, 3, 4, 5]),
      Uint8Array.from({ length: 257 }, (_, i) => i & 0xff)
    ]
    for (const bytes of samples) {
      const text = acexHtmlBytesToBase85(bytes)
      expect(acexHtmlBase85ToBytes(text)).toEqual(bytes)
    }
  })

  it('parses MIME encoding tokens', () => {
    expect(
      acexHtmlParseBinaryEncoding(
        'application/vnd.mlightcad.acex-chunk;base85'
      )
    ).toBe('base85')
    expect(
      acexHtmlParseBinaryEncoding(
        'application/vnd.mlightcad.acex-chunk;base64'
      )
    ).toBe('base64')
    expect(acexHtmlParseBinaryEncoding(undefined)).toBe('base64')
  })

  it('selects encoding through the text helpers', () => {
    const bytes = new Uint8Array([9, 8, 7, 6, 5])
    const b85 = acexHtmlBytesToText(bytes, 'base85')
    const b64 = acexHtmlBytesToText(bytes, 'base64')
    expect(acexHtmlTextToBytes(b85, 'base85')).toEqual(bytes)
    expect(acexHtmlTextToBytes(b64, 'base64')).toEqual(bytes)
    expect(b85.length).toBeLessThan(b64.length)
  })
})
