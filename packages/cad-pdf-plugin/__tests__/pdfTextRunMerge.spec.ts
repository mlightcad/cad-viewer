import type { PdfImportedText } from '../src/pdfVectorImport'
import { mergePdfTextRuns } from '../src/recognition/pdfTextRunMerge'

function run(
  text: string,
  x: number,
  width: number,
  extra: Partial<PdfImportedText> = {}
): PdfImportedText {
  return {
    text,
    position: { x, y: 10 },
    width,
    height: 2.5,
    rotation: 0,
    widthFactor: 1,
    ...extra
  }
}

describe('mergePdfTextRuns', () => {
  it('joins kerned fragments of one line without adding a space', () => {
    const merged = mergePdfTextRuns([run('LEV', 0, 6), run('EL', 6.1, 4)])
    expect(merged).toHaveLength(1)
    expect(merged[0].text).toBe('LEVEL')
    expect(merged[0].width).toBeCloseTo(10.1, 6)
  })

  it('inserts a space for a word gap', () => {
    const merged = mergePdfTextRuns([run('LEVEL', 0, 10), run('1', 11, 1.5)])
    expect(merged.map(r => r.text)).toEqual(['LEVEL 1'])
  })

  it('keeps runs apart across a large gap, another line or another style', () => {
    expect(mergePdfTextRuns([run('A', 0, 2), run('B', 10, 2)])).toHaveLength(2)
    expect(
      mergePdfTextRuns([
        run('A', 0, 2),
        { ...run('B', 2, 2), position: { x: 2, y: 5 } }
      ])
    ).toHaveLength(2)
    expect(
      mergePdfTextRuns([run('A', 0, 2), run('B', 2, 2, { color: '#ff0000' })])
    ).toHaveLength(2)
  })

  it('does not join runs across a font switch', () => {
    expect(
      mergePdfTextRuns([
        run('BOLD', 0, 8, { fontId: 'f1' }),
        run('text', 8.1, 6, { fontId: 'f2' })
      ])
    ).toHaveLength(2)
  })

  it('follows rotated baselines', () => {
    const r = Math.PI / 2
    const merged = mergePdfTextRuns([
      run('AB', 0, 4, { rotation: r, position: { x: 5, y: 0 } }),
      run('CD', 0, 4, { rotation: r, position: { x: 5, y: 4 } })
    ])
    expect(merged.map(m => m.text)).toEqual(['ABCD'])
  })
})
