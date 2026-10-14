// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { proofOutDir } from './outDir.ts'

const EV = '/repo/docs/evidence'
const scratch = () => '/tmp/scratch'

describe('proofOutDir (G7 não suja o repo por omissão)', () => {
  it('sem variáveis: scratch', () => {
    assert.equal(proofOutDir({}, EV, scratch), '/tmp/scratch')
    assert.equal(
      proofOutDir({ FREEDOM_SURFACE_PROOF: '1' }, EV, scratch),
      '/tmp/scratch'
    )
  })
  it('FREEDOM_SURFACE_PROOF_EVIDENCE=1: evidência versionada; qualquer outro valor não', () => {
    assert.equal(
      proofOutDir({ FREEDOM_SURFACE_PROOF_EVIDENCE: '1' }, EV, scratch),
      EV
    )
    assert.equal(
      proofOutDir({ FREEDOM_SURFACE_PROOF_EVIDENCE: 'true' }, EV, scratch),
      '/tmp/scratch'
    )
  })
  it('FREEDOM_SURFACE_PROOF_OUT tem prioridade', () => {
    assert.equal(
      proofOutDir(
        {
          FREEDOM_SURFACE_PROOF_OUT: '/x',
          FREEDOM_SURFACE_PROOF_EVIDENCE: '1'
        },
        EV,
        scratch
      ),
      '/x'
    )
  })
})
