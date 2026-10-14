// SPDX-License-Identifier: GPL-3.0-or-later
//
// Guarda das fixtures e da fronteira offline (M2-T1, spec §2 G3/G4): as
// fixtures são sintéticas, com proveniência documentada; nenhum DWG/DXF entra
// sem `PROVENANCE.md` completo (arquitectura §10.2); o código do app não toca
// em rede, CDN, parser proprietário nem upstream (D-2…D-5).
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { createHarness } from '../fixtures/harness.ts'
import {
  SYNTHETIC_DOCUMENTS,
  syntheticManyDoc
} from '../fixtures/syntheticDocuments.ts'

const APP_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', '.git'])
const DRAWING_EXT = /\.(dwg|dxf|dwf|dwt)$/i

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    if (SKIP_DIRS.has(entry)) return []
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

// -- verificador de proveniência (§10.2), puro e testado abaixo --------------

const REQUIRED_FIELDS: readonly [string, RegExp][] = [
  ['origem', /^\s*[-*|]?\s*\**origem\**\s*[:|]/im],
  ['autorização de redistribuição', /redistribui/i],
  ['data', /^\s*[-*|]?\s*\**data\**\s*[:|]/im],
  ['ferramenta e versão', /ferramenta/i],
  ['tamanho em bytes', /tamanho[^\n]*\d+\s*bytes/i],
  ['conteúdo esperado para FIND', /find/i],
  ['ausência de dados pessoais', /dados pessoais/i]
]

/**
 * `files` = ficheiros de desenho (caminho → bytes); `readProvenance` devolve o
 * texto do `PROVENANCE.md` da pasta do ficheiro (ou `null`). Devolve os
 * problemas; vazio = autorizado.
 */
function checkDrawingArtifacts(
  files: ReadonlyMap<string, Buffer>,
  readProvenance: (path: string) => string | null
): string[] {
  const problems: string[] = []
  for (const [path, bytes] of files) {
    const text = readProvenance(path)
    if (text === null) {
      problems.push(`${path}: sem PROVENANCE.md`)
      continue
    }
    const base = path.split('/').pop() ?? path
    if (!text.includes(base)) problems.push(`${path}: não referido`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    if (!text.toLowerCase().includes(sha)) problems.push(`${path}: sha256`)
    for (const [label, re] of REQUIRED_FIELDS) {
      if (!re.test(text)) problems.push(`${path}: falta «${label}»`)
    }
    if (/\.dwg$/i.test(path) && !/AC10\d\d/.test(text)) {
      problems.push(`${path}: falta a versão DWG (AC10xx)`)
    }
  }
  return problems
}

describe('fixtures: proveniência e artefactos de desenho (arquitectura §10.2)', () => {
  const root = APP_ROOT.replace(/\/$/, '')
  const all = walk(root)

  it('não há DWG/DXF/DWF/DWT em apps/freedom-mobile sem PROVENANCE.md completo', () => {
    const drawings = new Map(
      all
        .filter(f => DRAWING_EXT.test(f))
        .map(f => [relative(root, f), readFileSync(f)] as const)
    )
    const problems = checkDrawingArtifacts(drawings, rel => {
      const dir = rel.split('/').slice(0, -1).join('/')
      try {
        return readFileSync(join(root, dir, 'PROVENANCE.md'), 'utf8')
      } catch {
        return null
      }
    })
    assert.deepEqual(problems, [])
  })

  it('DWG: não verificado (EXT-3) — nenhum DWG existe e o registo di-lo', () => {
    assert.deepEqual(
      all.filter(f => /\.dwg$/i.test(f)),
      []
    )
    const prov = readFileSync(
      new URL('../fixtures/PROVENANCE.md', import.meta.url),
      'utf8'
    )
    assert.match(prov, /DWG: não verificado \(EXT-3/)
    assert.match(prov, /Sintética/)
    assert.match(prov, /Criada pela equipa/)
    assert.match(prov, /GPL-3\.0-or-later/)
  })

  it('o registo lista todos os documentos sintéticos e nenhum é um DWG', () => {
    const prov = readFileSync(
      new URL('../fixtures/PROVENANCE.md', import.meta.url),
      'utf8'
    )
    const names = [
      ...SYNTHETIC_DOCUMENTS.map(d => d.name),
      syntheticManyDoc(1).name
    ]
    for (const n of names) {
      assert.ok(prov.includes(`\`${n}\``), `${n} não está em PROVENANCE.md`)
      assert.doesNotMatch(n, /\.dwg$/i)
    }
  })

  it('um .dwg nunca abre com a fixture sintética: sem DWG não há «verificado»', () => {
    const h = createHarness({ dwg: 'ok' })
    h.boot()
    const out = h.client.open({
      name: 'synthetic-layouts.dwg',
      size: 10,
      source: { kind: 'url', url: 'http://127.0.0.1/synthetic-layouts.dwg' }
    })
    assert.equal(out.ok, true)
    h.flush()
    assert.equal(h.state.document.current, null)
    assert.equal(h.state.document.error?.code, 'read-failed')
    assert.equal(
      h.events.some(e => e.kind === 'opened'),
      false
    )
  })

  describe('verificador de proveniência (a guarda funciona)', () => {
    const bytes = Buffer.from('AC1027 fake bytes')
    const sha = createHash('sha256').update(bytes).digest('hex')
    const files = new Map([['test-fixtures/obra.dwg', bytes]])
    const complete = [
      '# Proveniência',
      '| Ficheiro | `obra.dwg` |',
      `| sha256 | ${sha} |`,
      '| Origem | criada pela equipa |',
      '| Autorização de redistribuição | sim, explícita |',
      '| Data | 2026-10-13 |',
      '| Ferramenta e versão | ferramenta X 1.0 |',
      '| Versão DWG | AC1027 |',
      '| Tamanho | 17 bytes |',
      '| Conteúdo esperado para FIND | «Parede» em Model |',
      '| Dados pessoais | nenhuns |'
    ].join('\n')

    it('aceita um registo completo', () => {
      assert.deepEqual(
        checkDrawingArtifacts(files, () => complete),
        []
      )
    })

    it('rejeita sem PROVENANCE.md', () => {
      assert.deepEqual(
        checkDrawingArtifacts(files, () => null),
        ['test-fixtures/obra.dwg: sem PROVENANCE.md']
      )
    })

    it('rejeita sha256 errado, ficheiro não referido e campos em falta', () => {
      const bad = complete
        .replace(sha, 'deadbeef')
        .replace('obra.dwg', 'outra')
        .replace('| Versão DWG | AC1027 |', '')
        .replace('| Dados pessoais | nenhuns |', '')
      const problems = checkDrawingArtifacts(files, () => bad)
      assert.ok(problems.some(p => p.includes('não referido')))
      assert.ok(problems.some(p => p.includes('sha256')))
      assert.ok(problems.some(p => p.includes('AC10xx')))
      assert.ok(problems.some(p => p.includes('dados pessoais')))
    })
  })
})

describe('fronteira offline do app (D-2…D-5, arquitectura §4 «Rede»)', () => {
  const root = APP_ROOT.replace(/\/$/, '')
  const sources = walk(root).filter(
    f =>
      /\.(ts|tsx)$/.test(f) &&
      !f.endsWith('.node-test.ts') &&
      !relative(root, f).startsWith('node_modules')
  )

  it('há código de produto e de fixtures a varrer', () => {
    assert.ok(sources.length >= 20, `só ${sources.length} ficheiros`)
  })

  it('nenhum código do app usa APIs de rede, CDN ou sockets', () => {
    for (const f of sources) {
      const text = readFileSync(f, 'utf8')
      assert.ok(
        !/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|node:(http|https|net|dns|tls|dgram)|navigator\.sendBeacon/.test(
          text
        ),
        `${relative(root, f)} usa rede`
      )
      assert.ok(
        !/jsdelivr|unpkg|cdnjs|googleapis|cloudfront/i.test(text),
        `${relative(root, f)} refere um CDN`
      )
    }
  })

  it('todo o URL literal é loopback ou about:blank', () => {
    for (const f of sources) {
      const text = readFileSync(f, 'utf8')
      for (const m of text.matchAll(/\bhttps?:\/\/[^\s'"`)>]+/gi)) {
        assert.match(
          m[0],
          /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])([:/|]|$)/,
          `${relative(root, f)}: URL não loopback ${m[0]}`
        )
      }
    }
  })

  it('sem parser proprietário nem conversor DWG no app (D-2)', () => {
    const pkg = readFileSync(join(root, 'package.json'), 'utf8')
    assert.doesNotMatch(pkg, /dwg-converter|use-dwg-converter|libredwg/i)
    for (const f of sources) {
      assert.doesNotMatch(
        readFileSync(f, 'utf8'),
        /use-dwg-converter|@mlightcad\/dwg-converter/,
        relative(root, f)
      )
    }
  })

  it('a superfície WebView só aceita loopback 127.0.0.1/about: com bloqueio de navegação, e o manifesto não pede permissões', () => {
    const surface = readFileSync(
      join(root, 'src/viewer/ViewerSurface.tsx'),
      'utf8'
    )
    assert.match(
      surface,
      /originWhitelist=\{\[\.\.\.SURFACE_ORIGIN_WHITELIST\]\}/
    )
    assert.match(surface, /onShouldStartLoadWithRequest=\{/)
    assert.match(surface, /source=\{\{ uri: surfaceUri\(viewerUrl\) \}\}/)
    assert.match(surface, /allowFileAccess=\{false\}/)
    assert.doesNotMatch(
      surface,
      /allowUniversalAccess|allowFileAccessFromFileURLs/
    )
    // o URL com token nunca é registado
    assert.doesNotMatch(surface, /console\./)
    const manifest = JSON.parse(
      readFileSync(join(root, 'app.json'), 'utf8')
    ) as { expo: { android?: object; ios?: object } }
    assert.doesNotMatch(JSON.stringify(manifest), /permissions/i)
  })
})
