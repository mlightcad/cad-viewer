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

import { existsSync, readFileSync } from 'fs'
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
})
