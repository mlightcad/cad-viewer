// SPDX-License-Identifier: GPL-3.0-or-later
//
// Conteúdo e acessibilidade (por análise da fonte) do ecrã Acerca/Licenças.
// A renderização real é prova de superfície à parte; aqui valida-se o modelo.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  ABOUT_SECTIONS,
  NOT_LEGAL_ADVICE,
  SOURCE_URL_PENDING
} from './aboutContent.ts'

const allText = JSON.stringify(ABOUT_SECTIONS)
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('aboutContent (L1 → §8.2)', () => {
  it('tem as secções de §8.2 pela ordem', () => {
    assert.deepEqual(
      ABOUT_SECTIONS.map(s => s.id),
      ['about', 'license', 'source', 'third-party', 'marks', 'privacy']
    )
  })

  it('mostra as atribuições aprovadas', () => {
    assert.match(allText, /Copyright \(c\) 2026 mlightcad/)
    assert.match(allText, /LibreDWG/)
    assert.match(allText, /Free Software Foundation/)
    assert.match(allText, /GPL-3\.0-or-later/)
    assert.match(allText, /three\.js/)
    assert.match(allText, /react-native-webview/)
    assert.match(allText, /não é afiliada à Autodesk/)
  })

  it('não afirma como facto o que o L1 deixa por confirmar', () => {
    assert.match(allText, /por confirmar/)
    assert.ok(allText.includes(SOURCE_URL_PENDING))
  })

  it('não dá parecer jurídico nem bloqueia fluxos', () => {
    assert.match(NOT_LEGAL_ADVICE, /Não constitui aconselhamento jurídico/)
    assert.doesNotMatch(
      allText,
      /(conforme a lei|juridicamente|garantimos conformidade)/i
    )
  })

  it('não contém caminhos de máquina, e-mails nem infra interna', () => {
    assert.doesNotMatch(allText, /(\/home\/|\/mnt\/|C:\\|@aitra|kanban)/i)
  })
})

describe('AboutLicenses (fonte)', () => {
  const src = read('./AboutLicenses.tsx')
  it('alvos tácteis >= 44 e papéis de acessibilidade', () => {
    assert.match(src, /minWidth: 44/)
    assert.match(src, /minHeight: 44/)
    assert.match(src, /accessibilityRole="button"/)
    assert.match(src, /accessibilityRole="header"/)
    assert.match(src, /accessibilityLabel="Voltar ao visualizador"/)
  })
  it('não usa rede', () => {
    assert.doesNotMatch(src, /(fetch\(|XMLHttpRequest|https?:\/\/)/)
  })
})

describe('App (navegação)', () => {
  const app = read('../../App.tsx')
  it('mantém o viewer montado e tem entrada acessível ≥44', () => {
    assert.match(app, /<ViewerScreen \/>/)
    assert.match(app, /accessibilityLabel="Acerca e licenças"/)
    assert.match(app, /minHeight: 44/)
  })
})
