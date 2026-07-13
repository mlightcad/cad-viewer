import {
  getDrawingExportBaseName,
  resetExportDownloadNamesForTests,
  resolveExportDownloadName
} from '../src/util/AcApExportFileNameUtil'

describe('AcApExportFileNameUtil', () => {
  beforeEach(() => {
    resetExportDownloadNamesForTests()
  })

  it('derives the base name from a drawing file path', () => {
    expect(getDrawingExportBaseName('C:/drawings/floor-plan.dwg')).toBe(
      'floor-plan'
    )
    expect(getDrawingExportBaseName('nested\\room.dxf')).toBe('room')
  })

  it('falls back when the source name is empty', () => {
    expect(getDrawingExportBaseName(undefined)).toBe('drawing')
    expect(getDrawingExportBaseName('   ')).toBe('drawing')
  })

  it('prefers the drawing name for the first export', () => {
    expect(resolveExportDownloadName('floor-plan.dwg', 'svg')).toBe(
      'floor-plan.svg'
    )
    expect(resolveExportDownloadName('floor-plan.dwg', '.html')).toBe(
      'floor-plan.html'
    )
  })

  it('adds numeric suffixes for repeated exports', () => {
    expect(resolveExportDownloadName('floor-plan.dwg', 'svg')).toBe(
      'floor-plan.svg'
    )
    expect(resolveExportDownloadName('floor-plan.dwg', 'svg')).toBe(
      'floor-plan-2.svg'
    )
    expect(resolveExportDownloadName('floor-plan.dwg', 'svg')).toBe(
      'floor-plan-3.svg'
    )
  })

  it('tracks duplicate names independently per extension', () => {
    expect(resolveExportDownloadName('room.dxf', 'svg')).toBe('room.svg')
    expect(resolveExportDownloadName('room.dxf', 'html')).toBe('room.html')
    expect(resolveExportDownloadName('room.dxf', 'svg')).toBe('room-2.svg')
  })
})
