// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { describeDocument, describeFind, describeIssue } from './describe.ts'
import { initialDocumentState } from './document.ts'
import { initialFindState } from './find.ts'

describe('describeDocument', () => {
  it('is null with no document, loading, opened and error are distinct', () => {
    assert.equal(describeDocument(initialDocumentState), null)
    assert.match(
      describeDocument({
        ...initialDocumentState,
        opening: { id: 'a-1', name: 'A.dxf' }
      }) ?? '',
      /A abrir A\.dxf/
    )
    assert.match(
      describeDocument({
        ...initialDocumentState,
        current: {
          name: 'A.dxf',
          format: 'dxf',
          layouts: [
            { name: 'M', btrId: '1', tabOrder: 0 },
            { name: 'P', btrId: '2', tabOrder: 1 }
          ],
          activeLayoutId: '1'
        }
      }) ?? '',
      /A\.dxf \(DXF, 2 layouts\)/
    )
  })

  it('has a PT-PT text for every open failure and a generic one for unknown codes', () => {
    for (const code of [
      'unsupported-ext',
      'too-large',
      'read-failed',
      'parse',
      'dwg-unavailable',
      'oom',
      'timeout'
    ] as const) {
      const t = describeDocument({
        ...initialDocumentState,
        error: { code, message: 'm', origin: 'viewer' }
      })
      assert.ok(t && !t.includes('Erro ao abrir'), code)
    }
    assert.match(
      describeDocument({
        ...initialDocumentState,
        error: { code: 'viewer-error', message: 'boom', origin: 'viewer' }
      }) ?? '',
      /boom/
    )
  })
})

describe('describeFind', () => {
  it('never reports an error as "sem resultados"', () => {
    assert.equal(describeFind(initialFindState), null)
    const err = describeFind({
      ...initialFindState,
      status: 'error',
      error: { code: 'not-ready', message: 'ainda não está pronto' }
    })
    assert.match(err ?? '', /Erro na pesquisa/)
    assert.doesNotMatch(err ?? '', /Sem resultados/)
    assert.match(
      describeFind({ ...initialFindState, status: 'empty', query: 'x' }) ?? '',
      /Sem resultados para “x”/
    )
  })

  it('shows position, truncation and unavailable layout', () => {
    const t = describeFind({
      ...initialFindState,
      status: 'results',
      total: 500,
      truncated: true,
      activeIndex: 2,
      navigation: 'unavailable'
    })
    assert.match(t ?? '', /3 \/ 500 resultados/)
    assert.match(t ?? '', /limitados a 500/)
    assert.match(t ?? '', /layout indisponível/)
  })

  it('a navigation failure with an error shows that error, not "layout indisponível"', () => {
    const t = describeFind({
      ...initialFindState,
      status: 'results',
      total: 2,
      navigation: 'unavailable',
      error: { code: 'send-failed', message: 'ref em falta' }
    })
    assert.match(t ?? '', /navegação indisponível: ref em falta/)
    assert.doesNotMatch(t ?? '', /layout indisponível/)
  })
})

describe('describeIssue', () => {
  it('distinguishes protocol from viewer issues', () => {
    assert.equal(describeIssue(null), null)
    assert.match(
      describeIssue({
        source: 'protocol',
        code: 'invalid-json',
        message: 'x'
      }) ?? '',
      /inválida.*invalid-json/
    )
    assert.match(
      describeIssue({ source: 'viewer', code: 'c', message: 'inesperado' }) ??
        '',
      /inesperado/
    )
  })
})
