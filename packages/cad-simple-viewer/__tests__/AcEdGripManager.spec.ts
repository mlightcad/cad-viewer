import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'
import { acedShouldShowGrips } from '../src/editor/grip/AcEdGripPolicy'

describe('acEdShouldShowGrips', () => {
  test('allows grips only in Write mode', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, false, 1, 100)).toBe(
      true
    )
    expect(acedShouldShowGrips(AcEdOpenMode.Read, false, false, 1, 100)).toBe(
      false
    )
    expect(acedShouldShowGrips(AcEdOpenMode.Review, false, false, 1, 100)).toBe(
      false
    )
  })

  test('blocks grips while command input is active', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, true, false, 1, 100)).toBe(
      false
    )
  })

  test('blocks grips while mtext editor is active', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, true, 1, 100)).toBe(
      false
    )
  })

  test('respects GRIPOBJLIMIT selection count', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, false, 2, 1)).toBe(
      false
    )
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, false, 1, 1)).toBe(
      true
    )
    expect(
      acedShouldShowGrips(AcEdOpenMode.Write, false, false, 101, 100)
    ).toBe(false)
    expect(
      acedShouldShowGrips(AcEdOpenMode.Write, false, false, 100, 100)
    ).toBe(true)
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, false, 1000, 0)).toBe(
      true
    )
  })
})
