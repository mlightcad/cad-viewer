import { stripMtextCodes } from '../src/pdf/AcPdfMarkedContent'
import { effectivePdfLayer } from '../src/pdf/AcPdfEffectiveLayer'

describe('PDF marked content helpers', () => {
  it('strips MTEXT formatting codes', () => {
    expect(stripMtextCodes('{\\fArial|b0;房间}\\Pnext')).toContain('房间')
    expect(stripMtextCodes('{\\fArial|b0;房间}\\Pnext')).toContain('next')
  })

  it('resolves layer 0 to the INSERT layer', () => {
    expect(effectivePdfLayer('0', 'WALL')).toBe('WALL')
    expect(effectivePdfLayer('DIM', 'WALL')).toBe('DIM')
  })
})
