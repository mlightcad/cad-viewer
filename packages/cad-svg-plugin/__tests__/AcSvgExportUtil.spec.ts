import { AcSvgExportUtil } from '../src/AcSvgExportUtil'

describe('AcSvgExportUtil', () => {
  it('allows data URLs and in-document fragments', () => {
    expect(AcSvgExportUtil.isSafeEmbeddedUrl('data:image/png;base64,abc')).toBe(
      true
    )
    expect(AcSvgExportUtil.isSafeEmbeddedUrl('#glyph-1')).toBe(true)
    expect(AcSvgExportUtil.isSafeEmbeddedUrl('file:///C:/x.svg')).toBe(false)
    expect(AcSvgExportUtil.isSafeEmbeddedUrl('icons.svg#menu')).toBe(false)
    expect(AcSvgExportUtil.isSafeEmbeddedUrl('blob:http://localhost/x')).toBe(
      false
    )
  })

  it('removes image and use elements with external href values', () => {
    const input = [
      '<image href="data:image/png;base64,abc" width="1" height="1"/>',
      '<image href="file:///C:/Users/test/example.svg" width="1" height="1"/>',
      '<use xlink:href="icons.svg#menu"/>',
      '<use xlink:href="#local-id"/>'
    ].join('\n')

    const output = AcSvgExportUtil.sanitizeExternalReferences(input)
    expect(output).toContain('data:image/png')
    expect(output).not.toContain('file:///')
    expect(output).not.toContain('icons.svg')
    expect(output).toContain('#local-id')
  })
})
