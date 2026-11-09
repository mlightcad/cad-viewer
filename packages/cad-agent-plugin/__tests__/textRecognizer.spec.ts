import { cleanRecognizedText } from '../src/agent/textRecognizer'

describe('cleanRecognizedText', () => {
  it('keeps plain text', () => {
    expect(cleanRecognizedText(' Ø25 H7 ')).toBe('Ø25 H7')
  })

  it('strips wrapping quotes and code fences', () => {
    expect(cleanRecognizedText('"LEVEL 1"')).toBe('LEVEL 1')
    expect(cleanRecognizedText('“平面图”')).toBe('平面图')
    expect(cleanRecognizedText('```\nA-A\n```')).toBe('A-A')
  })

  it('returns undefined for empty answers', () => {
    expect(cleanRecognizedText('   ')).toBeUndefined()
  })
})
