// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado do documento (docs/OBJ-0104-architecture.md §5.3, §6.4): carregamento,
// sucesso e erro de `open`. Puro. Uma falha **preserva** o documento anterior
// (o viewer só fecha a sessão nova — §6.4).

import type { BridgeEvent, CommandRejectCode } from '../bridge/BridgeClient.ts'
import type { OpenedPayload, OpenFailedCode } from '../contracts/protocol.ts'

export type DocumentErrorCode =
  | OpenFailedCode
  | CommandRejectCode
  | 'viewer-error'
  | 'no-document'

export interface DocumentError {
  code: DocumentErrorCode
  message: string
  /** `viewer` = veio do viewer; `local` = validação/timeout/ponte da app. */
  origin: 'viewer' | 'local'
}

export interface DocumentState {
  current: OpenedPayload | null
  /** `id` da mensagem `open` em curso (loading). */
  opening: { id: string; name: string } | null
  error: DocumentError | null
}

export const initialDocumentState: DocumentState = {
  current: null,
  opening: null,
  error: null
}

export function documentReducer(
  state: DocumentState,
  event: BridgeEvent
): DocumentState {
  switch (event.kind) {
    case 'command-queued':
    case 'command-sent':
      if (event.message.type !== 'open') return state
      return {
        ...state,
        opening: { id: event.id, name: event.message.payload.name },
        error: null
      }
    case 'opened':
      // Resposta a um `open` que já não é o actual nunca chega aqui (o cliente
      // devolve `stale-reply`); a guarda é só defesa em profundidade.
      if (state.opening?.id !== event.replyTo) return state
      return { current: event.payload, opening: null, error: null }
    case 'open-failed':
      if (state.opening && event.replyTo !== state.opening.id) return state
      return {
        ...state,
        opening: null,
        error: {
          code: event.code,
          message: event.message,
          origin: event.origin
        }
      }
    case 'command-rejected':
      if (event.command !== 'open') return state
      return {
        ...state,
        error: {
          code: event.error.code,
          message: event.error.message,
          origin: 'local'
        }
      }
    case 'viewer-error':
      if (event.command !== 'open') return state
      return {
        ...state,
        opening: null,
        error: {
          code: 'viewer-error',
          message: event.payload.message,
          origin: 'viewer'
        }
      }
    case 'find-active':
      // §5.4: `no-document` → volta ao ecrã Abrir.
      if (event.payload.outcome !== 'no-document') return state
      return {
        current: null,
        opening: null,
        error: {
          code: 'no-document',
          message: 'o viewer já não tem o documento aberto',
          origin: 'viewer'
        }
      }
    case 'ready-timeout':
      // O `open` em fila antes de `ready` é descartado ao falhar e não é
      // reenviado num `ready` tardio: sem isto ficaria em loading para sempre.
      // O documento anterior (se houver) mantém-se.
      if (!state.opening) return state
      return {
        ...state,
        opening: null,
        error: {
          code: 'viewer-unavailable',
          message: 'o viewer não arrancou a tempo; a abertura foi cancelada',
          origin: 'local'
        }
      }
    case 'process-gone':
      // O viewer perdeu o documento. Um `open` em fila/em curso também se perde
      // (`open-dropped`) e um `ready` tardio não o reenvia: termina o loading
      // com erro explícito em vez de o apagar em silêncio.
      return {
        current: null,
        opening: null,
        error: state.opening
          ? {
              code: 'viewer-unavailable',
              message:
                'o viewer terminou inesperadamente; a abertura foi cancelada',
              origin: 'local'
            }
          : null
      }
    case 'open-dropped':
      // Já resolvido pelo `ready-timeout`/`process-gone` que o precede.
      return state
    default:
      return state
  }
}
