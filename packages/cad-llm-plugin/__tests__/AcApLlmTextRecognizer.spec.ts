import { acapLlmCleanRecognizedText } from '../src/AcApLlmTextRecognizer'

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
