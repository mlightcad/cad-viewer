// SPDX-License-Identifier: GPL-3.0-or-later
//
// D-4 (docs/OBJ-0104-architecture.md §1): «FIND é prioridade». Traduzido em
// propriedades testáveis P1–P5 (docs/OBJ-0104-m1-s1-selection-zoom-find-spec.md
// §4). «Sem fallback silencioso»: quando o FIND não pode correr, o estado é
// `error`/`unavailable` com a causa — nunca `empty`, nunca a lista antiga como
// se fosse actual, nunca um reenvio automático.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { MAX_TRACKED } from '../bridge/BridgeClient.ts'
import { createHarness, type Harness } from '../fixtures/harness.ts'
import { describeFind } from './describe.ts'

const PAREDE = { query: 'parede', matchCase: false, scope: 'drawing' } as const

function opened(options: Parameters<typeof createHarness>[0] = {}): Harness {
  const h = createHarness(options)
  h.boot()
  h.open('synthetic-layouts.dxf')
  return h
}

function searched(h: Harness): void {
  h.client.find(PAREDE)
  h.flush()
}

const staleReplies = (h: Harness) =>
  h.events.filter(e => e.kind === 'stale-reply').length

describe('FIND priority (D-4)', () => {
  it('FIND priority (D-4) P1: a flood of zoom/setInsets traffic never displaces the in-flight find or navigation reply', () => {
    const h = opened()
    // find em curso (resposta ainda não entregue) + enxurrada acima de MAX_TRACKED
    h.client.find(PAREDE)
    for (let i = 0; i < MAX_TRACKED + 50; i++) {
      h.client.zoom({ op: i % 2 ? 'in' : 'out' })
      h.client.setInsets({ left: 0, right: 0, top: 0, bottom: i % 7 })
    }
    h.flush()
    assert.equal(staleReplies(h), 0)
    assert.equal(h.state.find.status, 'results')
    assert.equal(h.state.selection.status, 'selected')

    // navegação em curso + nova enxurrada
    h.client.goto({ findId: h.state.find.findId as number, index: 2 })
    for (let i = 0; i < MAX_TRACKED + 50; i++) h.client.zoom({ op: 'in' })
    h.flush()
    assert.equal(staleReplies(h), 0)
    assert.equal(h.state.find.activeIndex, 2)
    assert.equal(h.state.selection.hit?.text, 'PAREDE (caixa alta)')
  })

  it('FIND priority (D-4) P2: zoom failures (viewer error or local rejection) never alter FIND or the selection', () => {
    const h = opened({ failInject: t => t === 'zoom' })
    searched(h)
    const find = h.state.find
    const selection = h.state.selection
    const issue = h.state.issue

    const rejected = h.client.zoom({ op: 'in' })
    assert.equal(rejected.ok, false)
    assert.equal(h.state.zoom.error?.code, 'send-failed')
    assert.deepEqual(h.state.find, find)
    assert.deepEqual(h.state.selection, selection)
    assert.deepEqual(h.state.issue, issue)

    const viewerFails = opened()
    searched(viewerFails)
    const f2 = viewerFails.state.find
    const s2 = viewerFails.state.selection
    viewerFails.viewer.failNext('zoom', { code: 'zoom-failed', message: 'x' })
    viewerFails.client.zoom({ op: 'in' })
    viewerFails.flush()
    assert.equal(viewerFails.state.zoom.error?.code, 'zoom-failed')
    assert.deepEqual(viewerFails.state.find, f2)
    assert.deepEqual(viewerFails.state.selection, s2)
    assert.equal(viewerFails.viewer.highlighted, true)
  })

  it('FIND priority (D-4) P3: when FIND cannot run the state is an explicit error — never empty, never queued, never replayed', () => {
    // sem `ready`: rejeitado (só `open` é enfileirado, §5.1)
    const early = createHarness()
    const r = early.client.find(PAREDE)
    assert.equal(r.ok, false)
    assert.equal(early.state.find.status, 'error')
    assert.equal(early.state.find.error?.code, 'not-ready')
    assert.match(describeFind(early.state.find) ?? '', /^Erro na pesquisa:/)
    early.boot()
    early.flush()
    assert.equal(
      early.viewer.received.filter(m => m.type === 'find').length,
      0,
      'o find rejeitado não pode ser reenviado em silêncio no ready'
    )
    assert.equal(early.state.find.status, 'error')

    // viewer falhado (ready nunca chegou)
    const dead = createHarness()
    dead.timers.advance(15_000)
    dead.client.find(PAREDE)
    assert.equal(dead.state.find.status, 'error')
    assert.equal(dead.state.find.error?.code, 'viewer-unavailable')

    // sem documento: erro do viewer, não "0 resultados"
    const bare = createHarness()
    bare.boot()
    bare.client.find(PAREDE)
    bare.flush()
    assert.equal(bare.state.find.status, 'error')
    assert.equal(bare.state.find.error?.code, 'no-document')
    assert.equal(bare.state.selection.status, 'none')

    // `inject` a falhar
    const broken = opened({ failInject: t => t === 'find' })
    searched(broken)
    assert.equal(broken.state.find.status, 'error')
    assert.equal(broken.state.find.error?.code, 'send-failed')
  })

  it('FIND priority (D-4) P3b: a failed find never falls back to the previous result list or selection', () => {
    const h = opened()
    searched(h)
    assert.equal(h.state.find.hits.length, 4)
    assert.equal(h.state.selection.status, 'selected')
    h.viewer.failNext('find', { code: 'boom', message: 'falha injectada' })
    h.client.find({ ...PAREDE, query: 'cobertura' })
    h.flush()
    assert.equal(h.state.find.status, 'error')
    assert.deepEqual(h.state.find.hits, [])
    assert.equal(h.state.find.total, 0)
    assert.equal(h.state.selection.status, 'none')
    assert.equal(h.state.find.query, 'cobertura')
  })

  it('FIND priority (D-4) P4: a newer find supersedes the older one — its late reply is a visible stale-reply and never replaces the results', () => {
    const h = opened()
    searched(h)
    assert.equal(h.state.selection.hit?.text, 'Parede exterior')
    h.client.find(PAREDE) // antigo, resposta em voo
    h.client.find({ ...PAREDE, query: 'cobertura' }) // novo
    assert.equal(h.state.selection.status, 'none')
    h.flush()
    assert.equal(staleReplies(h), 1)
    assert.equal(h.state.find.query, 'cobertura')
    assert.equal(h.state.find.total, 1)
    assert.equal(h.state.selection.hit?.text, 'Cobertura')
  })

  it('FIND priority (D-4) P5: empty, error and results are distinct states with distinct messages; empty never navigates', () => {
    const results = opened()
    searched(results)
    const empty = opened()
    empty.client.find({ ...PAREDE, query: 'inexistente' })
    empty.flush()
    const error = opened()
    error.viewer.failNext('find', { code: 'boom', message: 'falha' })
    error.client.find(PAREDE)
    error.flush()

    assert.deepEqual(
      [results, empty, error].map(h => h.state.find.status),
      ['results', 'empty', 'error']
    )
    const texts = [results, empty, error].map(h => describeFind(h.state.find))
    assert.equal(new Set(texts).size, 3)
    assert.equal(empty.viewer.received.filter(m => m.type === 'goto').length, 0)
    assert.equal(empty.state.selection.status, 'none')
    assert.equal(error.state.selection.status, 'none')
  })
})
