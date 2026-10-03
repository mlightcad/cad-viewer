import {
  dedupeFontNames,
  normalizeFontNameKey,
  planTextStyleFontPreload
} from '../src/util/AcApTextStyleFontPreload'

describe('AcApTextStyleFontPreload', () => {
  it('dedupes font names case-insensitively and strips extensions', () => {
    expect(
      dedupeFontNames(['SimSun', 'simsun.ttf', 'HZTXT', 'hztxt.shx'])
    ).toEqual(['SimSun', 'HZTXT'])
    expect(normalizeFontNameKey('仿宋.ttf')).toBe('仿宋')
  })

  it('awaits style faces on main and warms only style∩preset into workers', () => {
    const plan = planTextStyleFontPreload(
      ['仿宋', 'simsun', 'arial', 'microsoft yahei'],
      ['simsun', 'hztxt', 'simplex', 'amgdt']
    )
    expect(plan.critical).toEqual([
      '仿宋',
      'simsun',
      'arial',
      'microsoft yahei'
    ])
    expect(plan.workerWarm).toEqual(['simsun'])
    expect(plan.background).toEqual(['hztxt', 'simplex', 'amgdt'])
  })

  it('promotes first default when the style table is empty', () => {
    const plan = planTextStyleFontPreload([], ['simsun', 'hztxt', 'amgdt'], {
      firstDefaultFont: 'simsun'
    })
    expect(plan.critical).toEqual(['simsun'])
    expect(plan.workerWarm).toEqual(['simsun'])
    expect(plan.background).toEqual(['hztxt', 'amgdt'])
  })

  it('caps workerWarm so a large preset intersection cannot block convert', () => {
    const plan = planTextStyleFontPreload(
      ['simsun', 'hztxt', 'simplex', 'amgdt', 'txt'],
      ['simsun', 'hztxt', 'simplex', 'amgdt', 'txt', 'romans']
    )
    expect(plan.workerWarm).toEqual(['simsun', 'hztxt', 'simplex'])
    expect(plan.background).toEqual(['romans'])
  })
})
