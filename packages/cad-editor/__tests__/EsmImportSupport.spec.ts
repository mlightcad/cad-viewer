import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

describe('cad-editor ESM import support', () => {
  const repoRoot = path.resolve(__dirname, '../../..')
  const cadEditorRoot = path.join(repoRoot, 'packages', 'cad-editor')

  it('uses explicit dot subpath in exports map', () => {
    const pkgJsonPath = path.join(cadEditorRoot, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))

    expect(pkgJson.exports).toBeDefined()
    expect(pkgJson.exports['.']).toEqual({
      types: './dist/cad-editor.d.ts',
      import: './dist/cad-editor.js'
    })
  })

  it('resolves from an ESM consumer through package exports', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-editor-esm-'))

    try {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'esm-consumer-fixture',
          private: true,
          type: 'module'
        })
      )

      const scopeDir = path.join(tempDir, 'node_modules', '@mlightcad')
      fs.mkdirSync(scopeDir, { recursive: true })

      const linkPath = path.join(scopeDir, 'cad-editor')
      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir'
      fs.symlinkSync(cadEditorRoot, linkPath, symlinkType)

      const output = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "console.log(import.meta.resolve('@mlightcad/cad-editor'))"
        ],
        {
          cwd: tempDir,
          encoding: 'utf8'
        }
      ).trim()

      const resolvedPath = fileURLToPath(output)
      const expectedPath = path.join(cadEditorRoot, 'dist', 'cad-editor.js')

      expect(path.normalize(resolvedPath)).toBe(path.normalize(expectedPath))
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
