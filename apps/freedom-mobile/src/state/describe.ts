// SPDX-License-Identifier: GPL-3.0-or-later
//
// Textos PT-PT do estado de sessão (puros, testáveis sem RN). Cada falha tem
// texto próprio: nunca se mostra "sem resultados" quando na verdade houve erro.

import type { DocumentState } from './document.ts'
import type { FilesState } from './files.ts'
import type { FindState } from './find.ts'
import type { SelectionState } from './selection.ts'
import type { SessionIssue, ZoomState } from './session.ts'

const DOC_ERRORS: Record<string, string> = {
  'unsupported-ext': 'Só são aceites ficheiros .dwg e .dxf.',
  'too-large': 'O ficheiro é demasiado grande para este dispositivo.',
  'read-failed': 'Não foi possível ler o ficheiro.',
  parse:
    'Não foi possível abrir o desenho (ficheiro inválido ou não suportado).',
  'dwg-unavailable':
    'DWG indisponível neste dispositivo; DXF continua a funcionar.',
  oom: 'O ficheiro é demasiado grande para este dispositivo.',
  timeout: 'O viewer demorou demasiado a abrir o ficheiro.',
  'not-ready': 'O viewer ainda não está pronto.',
  'viewer-unavailable': 'O viewer não está disponível; recarregue.',
  'send-failed': 'Falha a comunicar com o viewer.',
  'no-document': 'O viewer já não tem o documento aberto.'
}

export function describeDocument(doc: DocumentState): string | null {
  if (doc.opening) return `A abrir ${doc.opening.name}…`
  if (doc.error) {
    return (
      DOC_ERRORS[doc.error.code] ??
      `Erro ao abrir o ficheiro: ${doc.error.message}`
    )
  }
  if (doc.current) {
    const n = doc.current.layouts.length
    return `${doc.current.name} (${doc.current.format.toUpperCase()}, ${n} ${
      n === 1 ? 'layout' : 'layouts'
    })`
  }
  return null
}

/**
 * Escolha/cópia do ficheiro e falhas locais. A abertura em si (`A abrir…`,
 * `opened`, `openFailed`) é de `describeDocument`.
 */
export function describeFiles(files: FilesState): string | null {
  if (files.phase === 'picking') return 'A escolher o ficheiro…'
  if (files.phase === 'staging') {
    return files.name ? `A preparar ${files.name}…` : 'A preparar o ficheiro…'
  }
  if (files.error) return files.error.message
  return null
}

export function describeFind(find: FindState): string | null {
  switch (find.status) {
    case 'idle':
      return null
    case 'searching':
      return `A pesquisar “${find.query}”…`
    case 'empty':
      return `Sem resultados para “${find.query}”.`
    case 'error':
      return `Erro na pesquisa: ${find.error?.message ?? 'desconhecido'}`
    case 'results': {
      const pos = find.activeIndex >= 0 ? `${find.activeIndex + 1} / ` : ''
      const limited = find.truncated
        ? ` (resultados limitados a ${find.total})`
        : ''
      // Só um `findActive` de layout é "layout indisponível"; falhas da ponte
      // ou do viewer mostram a sua própria mensagem.
      const nav =
        find.navigation !== 'unavailable'
          ? ''
          : find.error
            ? ` — navegação indisponível: ${find.error.message}`
            : ' — layout indisponível'
      return `${pos}${find.total} resultados${limited}${nav}`
    }
  }
}

export function describeIssue(issue: SessionIssue | null): string | null {
  if (!issue) return null
  return issue.source === 'protocol'
    ? `Mensagem inválida do viewer (${issue.code}).`
    : `Erro do viewer: ${issue.message}`
}

export function describeSelection(sel: SelectionState): string | null {
  switch (sel.status) {
    case 'none':
      return null
    case 'pending':
      return 'A ir para o resultado…'
    case 'selected':
      return sel.hit
        ? `Selecionado: “${sel.hit.text}” (${sel.hit.layoutName})`
        : null
    case 'unavailable':
      return `Seleção indisponível: ${sel.error?.message ?? 'desconhecido'}`
  }
}

export function describeZoom(zoom: ZoomState): string | null {
  return zoom.error ? `Erro no zoom: ${zoom.error.message}` : null
}
