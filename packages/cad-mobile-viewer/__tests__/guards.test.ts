// SPDX-License-Identifier: GPL-3.0-or-later
//
// Guardas estáticas (D-2, D-5, §9, §10.2): sem parser proprietário, sem rede,
// sem upstream, sem artefactos CAD sem proveniência. Este ficheiro NÃO se varre
// a si próprio (contém os padrões proibidos como dados).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const PKG = join(__dirname, '..')
const SELF = join(__dirname, 'guards.test.ts')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'lib')
      continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(PKG)
const sources = files.filter(
  f => /\.(ts|tsx|js|mjs|json)$/.test(f) && f !== SELF
)
const text = (f: string) => readFileSync(f, 'utf8')
const rel = (f: string) => relative(PKG, f)

describe('D-2: sem parser proprietário', () => {
  test('dependências: só data-model e libredwg-converter', () => {
    const pkg = JSON.parse(text(join(PKG, 'package.json')))
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual([
      '@mlightcad/data-model',
      '@mlightcad/libredwg-converter'
    ])
    expect(pkg.devDependencies).toBeUndefined()
    expect(pkg.private).toBe(true)
    expect(pkg.publishConfig).toBeUndefined()
    expect(pkg.license).toBe('GPL-3.0-or-later')
  })

  test.each([
    ['@mlightcad/dwg-converter', /@mlightcad\/dwg-converter/],
    ['use-dwg-converter', /use-dwg-converter/],
    ['licença proprietária', /DwgConverterLicense|license_key|licenseKey/i]
  ])('nenhuma referência a %s no código do pacote', (_n, pattern) => {
    const hits = sources.filter(f => pattern.test(text(f))).map(rel)
    // `license_expired|license_invalid` em errors.ts é mapeamento defensivo,
    // não uma integração: o padrão acima não os apanha (nomes distintos).
    expect(hits).toEqual([])
  })
})

describe('offline e higiene (§4, §9)', () => {
  const code = sources.filter(f => f.startsWith(join(PKG, 'src')))

  test.each([
    ['fetch(', /\bfetch\s*\(/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /WebSocket/],
    ['sendBeacon', /sendBeacon/],
    ['importScripts', /importScripts\s*\(/],
    ['jsdelivr', /jsdelivr/i],
    ['URL https externo', /https:\/\//],
    ['caminho absoluto de máquina', /(\/home\/|\/mnt\/|[A-Z]:\\\\Users)/]
  ])('src/ não contém %s', (_n, pattern) => {
    const hits = code.filter(f => pattern.test(text(f))).map(rel)
    expect(hits).toEqual([])
  })

  test('http:// em src/ só é loopback (comentários e testes de URL excluídos)', () => {
    const offenders: string[] = []
    for (const f of code) {
      for (const m of text(f).matchAll(/http:\/\/([^\s'"`/:)]+)/g)) {
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(m[1])) {
          offenders.push(`${rel(f)}: ${m[0]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test('nenhuma referência a infra interna (Kanban, perfis de agentes)', () => {
    const hits = sources
      .filter(f => /kanban|hermes|engineer-glm|t_[0-9a-f]{8}/i.test(text(f)))
      .map(rel)
    expect(hits).toEqual([])
  })
})

describe('D-5: sem acção sobre o upstream', () => {
  test('o pacote não declara repositório nem scripts de publicação', () => {
    const pkg = JSON.parse(text(join(PKG, 'package.json')))
    expect(pkg.repository).toBeUndefined()
    for (const name of Object.keys(pkg.scripts ?? {})) {
      expect(name).not.toMatch(/publish|release|upstream/i)
    }
  })
})

describe('§10.2: artefactos CAD só com proveniência', () => {
  const cad = files.filter(f => /\.(dwg|dxf|dwf)$/i.test(f)).map(rel)

  test('proveniência da fixture sintética existe e declara «DWG não verificado»', () => {
    const prov = join(__dirname, 'PROVENANCE.md')
    expect(existsSync(prov)).toBe(true)
    const t = text(prov)
    for (const field of [
      'Origem',
      'Licença',
      'Ferramenta',
      'Dados pessoais',
      'EXT-3',
      'não verificado'
    ]) {
      expect(t).toContain(field)
    }
  })

  test('nenhum .dwg/.dxf/.dwf no pacote sem registo completo', () => {
    const t = text(join(__dirname, 'PROVENANCE.md'))
    const unregistered = cad.filter(
      f => !t.includes(f.split('/').pop() as string) || !/sha256/i.test(t)
    )
    expect(unregistered).toEqual([])
  })
})
