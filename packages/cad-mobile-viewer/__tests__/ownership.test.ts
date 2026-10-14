// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ownership de `@mlightcad/cad-simple-viewer/find` (follow-up M2-I3, finding 1):
// o pacote é `private` e NÃO é publicado nem empacotado de forma isolada; o
// sub-caminho `/find` resolve para o código-fonte do workspace através de
// mapeamentos do repositório (tsconfig `paths` + `moduleNameMapper` do jest).
// Deliberadamente NÃO é uma dependência declarada: declará-la mudaria
// `pnpm-lock.yaml` (fora das fronteiras do card) e a guarda D-2 de
// `guards.test.ts` (só `data-model` + `libredwg-converter`). O wiring do bundle
// do app (Metro/Vite) é I4. Estes testes provam que o mapeamento existe e aponta
// para um módulo que exporta o que `findIndex.ts` importa.

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../../..')
const SIMPLE = resolve(ROOT, 'packages/cad-simple-viewer')
const FIND_IMPORT = '@mlightcad/cad-simple-viewer/find'

describe('ownership de @mlightcad/cad-simple-viewer/find', () => {
  it('findIndex.ts importa o sub-caminho e o manifest não o declara (transitivo deliberado)', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/model/findIndex.ts'),
      'utf8'
    )
    expect(src).toContain(`from '${FIND_IMPORT}'`)
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../package.json'), 'utf8')
    )
    expect(pkg.dependencies?.['@mlightcad/cad-simple-viewer']).toBeUndefined()
  })

  it('o workspace exporta ./find e o ficheiro existe', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(SIMPLE, 'package.json'), 'utf8')
    )
    expect(pkg.name).toBe('@mlightcad/cad-simple-viewer')
    expect(pkg.exports['./find'].types).toBe('./src/find/index.ts')
    expect(existsSync(resolve(SIMPLE, 'src/find/index.ts'))).toBe(true)
  })

  it('tsconfig (paths) e jest (moduleNameMapper) mapeiam o sub-caminho para o mesmo ficheiro', () => {
    const tsconfig = readFileSync(
      resolve(__dirname, '../tsconfig.json'),
      'utf8'
    )
    expect(tsconfig).toContain(`"${FIND_IMPORT}"`)
    expect(tsconfig).toContain('packages/cad-simple-viewer/src/find/index.ts')
    const jest = readFileSync(resolve(ROOT, 'jest.config.ts'), 'utf8')
    expect(jest).toContain('^@mlightcad/cad-simple-viewer/find$')
    expect(jest).toContain(
      '<rootDir>/packages/cad-simple-viewer/src/find/index.ts'
    )
  })

  it('o módulo resolvido exporta os símbolos usados por findIndex.ts', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(FIND_IMPORT)
    expect(typeof mod.acapFindExcerpt).toBe('function')
    expect(typeof mod.acapFindHitBox).toBe('function')
  })

  // Follow-up M2-I3 (finding 2): quem possui, hoje, a resolução efectiva
  // do sub-caminho no bundle/instalação — provado, sem wiring duplicado.
  describe('instalação/bundle efectivos (sem wiring duplicado)', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'dist' || name === '.expo')
          continue
        const full = resolve(dir, name)
        if (statSync(full).isDirectory()) walk(full, out)
        else out.push(full)
      }
      return out
    }

    it('o lockfile do workspace não regista o pacote como dependência do cad-mobile-viewer (resolução só por mapeamento)', () => {
      const lock = readFileSync(resolve(ROOT, 'pnpm-lock.yaml'), 'utf8')
      const start = lock.indexOf('\n  packages/cad-mobile-viewer:')
      expect(start).toBeGreaterThan(-1)
      const rest = lock.slice(start + 1)
      const end = rest.search(/\n {2}packages\/(?!cad-mobile-viewer:)/)
      const block = end === -1 ? rest : rest.slice(0, end)
      expect(block).toContain('@mlightcad/data-model')
      expect(block).not.toContain('cad-simple-viewer')
    })

    it('apps/freedom-mobile está fora do workspace pnpm e não declara nem importa cad-simple-viewer (o bundle real do viewer ainda não existe: I4/T2)', () => {
      const ws = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf8')
      expect(ws).toContain("'packages/*'")
      expect(ws).not.toMatch(/apps/)
      const app = resolve(ROOT, 'apps/freedom-mobile')
      const manifest = readFileSync(resolve(app, 'package.json'), 'utf8')
      expect(manifest).not.toMatch(/cad-simple-viewer|cad-mobile-viewer/)
      const sources = walk(resolve(app, 'src'))
        .concat(['App.tsx', 'index.ts'].map(f => resolve(app, f)))
        .filter(f => /\.(tsx?|[cm]?js)$/.test(f))
      const importing = (re: RegExp) =>
        sources
          .filter(f => re.test(readFileSync(f, 'utf8')))
          .map(f => f.slice(app.length + 1))
      // nenhum ficheiro da app importa o viewer/FIND (wiring do bundle = I4/T2)
      expect(importing(/from\s+['"][^'"]*cad-simple-viewer/)).toEqual([])
      // única ligação existente: um teste node que importa por caminho relativo
      // `loopbackFetch.ts`, que não depende de cad-simple-viewer
      expect(importing(/from\s+['"][^'"]*cad-mobile-viewer/)).toEqual([
        'src/server/serverViewerFetch.node-test.ts'
      ])
      expect(
        readFileSync(
          resolve(__dirname, '../src/import/loopbackFetch.ts'),
          'utf8'
        )
      ).not.toContain('cad-simple-viewer')
    })

    it('o alias /find só é mapeado em três ficheiros (tsconfig do pacote + jest.config.ts + tsconfig.jest.json do jest): nenhuma outra config o duplica', () => {
      const CONFIG =
        /(^|\/)(tsconfig[^/]*\.json|jest\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|metro\.config\.[cm]?js|babel\.config\.[cm]?js)$/
      const hits = [
        ...walk(resolve(ROOT, 'packages')),
        ...walk(resolve(ROOT, 'apps')),
        ...readdirSync(ROOT).map(f => resolve(ROOT, f))
      ]
        .filter(f => statSync(f).isFile() && CONFIG.test(f))
        .filter(f => readFileSync(f, 'utf8').includes('cad-simple-viewer/find'))
        .map(f => f.slice(ROOT.length + 1))
        .sort()
      expect(hits).toEqual([
        'jest.config.ts',
        'packages/cad-mobile-viewer/tsconfig.json',
        'tsconfig.jest.json'
      ])
    })
  })
})
