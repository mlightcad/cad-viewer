import {
  isScriptQuitCommand,
  parseScriptLines
} from '../src/util/AcApScriptParser'

describe('AcApScriptParser', () => {
  it('parses multiline scripts and keeps blank lines for Enter', () => {
    const lines = parseScriptLines('zoom\ne\npngout\n\n2048\nquit\n')
    expect(lines).toEqual(['zoom', 'e', 'pngout', '', '2048', 'quit', ''])
  })

  it('strips full-line semicolon comments', () => {
    const lines = parseScriptLines(
      '; export extents as PNG\nzoom\n; extents keyword\ne\n'
    )
    expect(lines).toEqual(['zoom', 'e', ''])
  })

  it('supports escaped newlines in a single-line string', () => {
    expect(parseScriptLines('zoom\\ne\\nquit')).toEqual(['zoom', 'e', 'quit'])
  })

  it('normalizes CRLF', () => {
    expect(parseScriptLines('zoom\r\ne\r\nquit\r\n')).toEqual([
      'zoom',
      'e',
      'quit',
      ''
    ])
  })

  it('returns an empty array for empty or comment-only input', () => {
    expect(parseScriptLines('')).toEqual([])
    expect(parseScriptLines('; only comment')).toEqual([])
    // Trailing newline after a comment-only line leaves one blank Enter token.
    expect(parseScriptLines('; only comment\n')).toEqual([''])
  })

  it('detects quit / exit terminators case-insensitively', () => {
    expect(isScriptQuitCommand('quit')).toBe(true)
    expect(isScriptQuitCommand('EXIT')).toBe(true)
    expect(isScriptQuitCommand(' pngout ')).toBe(false)
  })
})
