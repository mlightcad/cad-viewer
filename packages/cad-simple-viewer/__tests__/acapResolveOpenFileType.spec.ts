import { AcDbFileType } from '@mlightcad/data-model'

import { acapResolveOpenFileType } from '../src/util/acapResolveOpenFileType'

describe('acapResolveOpenFileType', () => {
  it('maps dwg, dxf, and svg extensions', () => {
    expect(acapResolveOpenFileType('a.dwg')).toBe(AcDbFileType.DWG)
    expect(acapResolveOpenFileType('a.DXF')).toBe(AcDbFileType.DXF)
    expect(acapResolveOpenFileType('drawing.SVG')).toBe('svg')
  })

  it('falls back to DXF for unknown extensions', () => {
    expect(acapResolveOpenFileType('notes.txt')).toBe(AcDbFileType.DXF)
  })
})
