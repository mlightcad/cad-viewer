/**
 * Parses AutoCAD-style command scripts (`.scr`) into Enter-separated lines.
 *
 * - Normalizes `\r\n` / `\r` and `\n`-escaped single-line scripts
 * - Drops full-line `;` comments
 * - Keeps blank lines (empty strings) so prompts can treat them as Enter / None
 */
export function parseScriptLines(script: string): string[] {
  if (!script) {
    return []
  }

  const source =
    script.includes('\n') || script.includes('\r')
      ? script
      : script.replace(/\\n/g, '\n')

  const rawLines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines: string[] = []

  for (const line of rawLines) {
    const trimmedStart = line.trimStart()
    if (trimmedStart.startsWith(';')) {
      continue
    }
    lines.push(line)
  }

  return lines
}

/**
 * Returns true when the token is a script terminator (`QUIT` / `EXIT`).
 */
export function isScriptQuitCommand(commandName: string): boolean {
  const upper = commandName.trim().toUpperCase()
  return upper === 'QUIT' || upper === 'EXIT'
}
