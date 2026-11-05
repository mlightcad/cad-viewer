import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Walks relative imports from the file-open-panel entry and asserts the
 * subgraph never reaches AcApDocManager (keeps the landing entry light).
 */
describe('@mlightcad/cad-simple-viewer/file-open-panel', () => {
  it('does not import AcApDocManager in its module graph', () => {
    const entry = resolve(__dirname, '../src/file-open-panel.ts')
    const visited = new Set<string>()
    const queue = [entry]
    const importRe =
      /(?:from|import)\s+['"](\.[^'"]+)['"]|export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g

    while (queue.length > 0) {
      const file = queue.pop()!
      if (visited.has(file)) continue
      visited.add(file)

      const source = readFileSync(file, 'utf8')
      // Ignore docs/comments; only flag real imports / identifiers in code.
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      expect(code).not.toMatch(
        /import\s*{[^}]*AcApDocManager|from\s*['"][^'"]*AcApDocManager/
      )
      expect(code).not.toMatch(/\bAcApDocManager\b/)

      let match: RegExpExecArray | null
      importRe.lastIndex = 0
      while ((match = importRe.exec(source))) {
        const spec = match[1] ?? match[2]
        if (!spec) continue
        const resolved = resolve(dirname(file), spec)
        const candidates = [
          resolved,
          `${resolved}.ts`,
          resolve(resolved, 'index.ts')
        ]
        for (const candidate of candidates) {
          try {
            readFileSync(candidate)
            queue.push(candidate)
            break
          } catch {
            // try next candidate
          }
        }
      }
    }

    expect(visited.size).toBeGreaterThan(5)
    expect(
      [...visited].some(path => path.endsWith('AcUiFileOpenPanel.ts'))
    ).toBe(true)
  })
})
