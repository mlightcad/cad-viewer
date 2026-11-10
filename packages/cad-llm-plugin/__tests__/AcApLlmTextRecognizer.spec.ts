// Only i18n is needed from the viewer; the full package pulls in the
// renderer and text editor stacks.
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApI18n: {
    t: (key: string, options?: { fallback?: string }) =>
      options?.fallback ?? key,
    mergeLocaleMessage: () => undefined
  }
}))

import {
  acapLlmCleanRecognizedText,
  acapLlmParseBatchText
} from '../src/AcApLlmTextRecognizer'

describe('acapLlmCleanRecognizedText', () => {
  it('keeps plain text', () => {
    expect(acapLlmCleanRecognizedText(' Ø25 H7 ')).toBe('Ø25 H7')
  })

  it('strips wrapping quotes and code fences', () => {
    expect(acapLlmCleanRecognizedText('"LEVEL 1"')).toBe('LEVEL 1')
    expect(acapLlmCleanRecognizedText('“平面图”')).toBe('平面图')
    expect(acapLlmCleanRecognizedText('```\nA-A\n```')).toBe('A-A')
  })

  it('returns undefined for empty answers', () => {
    expect(acapLlmCleanRecognizedText('   ')).toBeUndefined()
  })
})

describe('acapLlmParseBatchText', () => {
  it('reads a JSON array, aligned with the images', () => {
    expect(acapLlmParseBatchText('["平面图", "", "Ø25"]', 3)).toEqual([
      '平面图',
      undefined,
      'Ø25'
    ])
  })

  it('accepts code fences and surrounding words', () => {
    expect(
      acapLlmParseBatchText('Here:\n```json\n["A-A", "B"]\n```', 2)
    ).toEqual(['A-A', 'B'])
  })

  it('pads short answers and drops extra entries', () => {
    expect(acapLlmParseBatchText('["A"]', 3)).toEqual([
      'A',
      undefined,
      undefined
    ])
    expect(acapLlmParseBatchText('["A", "B", "C"]', 2)).toEqual(['A', 'B'])
  })

  it('throws when the answer is not a JSON array', () => {
    expect(() => acapLlmParseBatchText('I cannot read it', 2)).toThrow()
  })
})
