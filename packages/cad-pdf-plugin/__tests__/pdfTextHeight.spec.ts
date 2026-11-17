import {
  acapPdfEmHeightToTextHeight,
  acapPdfMeshInkHeightToTextHeight
} from '../src/pdfTextHeight'

describe('pdfTextHeight', () => {
  test('converts PDF em height to capital-A text height', () => {
    expect(acapPdfEmHeightToTextHeight(14, 1.4)).toBeCloseTo(10)
    expect(acapPdfEmHeightToTextHeight(10, 1)).toBeCloseTo(10)
    expect(acapPdfEmHeightToTextHeight(0, 1.4)).toBe(0)
  })

  test('scales only mesh CJK ink heights', () => {
    expect(acapPdfMeshInkHeightToTextHeight(14, '受控文件', 1.4)).toBeCloseTo(
      10
    )
    expect(acapPdfMeshInkHeightToTextHeight(14, 'AB', 1.4)).toBeCloseTo(14)
    expect(acapPdfMeshInkHeightToTextHeight(14, '受控', 1)).toBeCloseTo(14)
  })
})
