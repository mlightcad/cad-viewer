// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado de seleção (docs/OBJ-0104-m1-s1-selection-zoom-find-spec.md §3.1): o
// hit que a app acredita estar realçado no viewer. Puro. É derivado só de
// eventos da ponte e do estado de FIND **já reduzido** — nunca de um valor por
// omissão: uma navegação falhada fica `unavailable` com a causa, não "selected".

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type { FindHit } from '../contracts/protocol.ts'
import type { FindState, FindUiAction } from './find.ts'

export type SelectionStatus = 'none' | 'pending' | 'selected' | 'unavailable'

export interface SelectionError {
  code: string
  message: string
}

export interface SelectionState {
  status: SelectionStatus
  /** Hit realçado no viewer; `null` = nenhum (ou estado desconhecido). */
  hit: FindHit | null
  /** `findId` a que o hit pertence. */
  findId: number | null
  error: SelectionError | null
}

export const initialSelectionState: SelectionState = {
  status: 'none',
  hit: null,
  findId: null,
  error: null
}

const NAV_COMMANDS: readonly string[] = ['goto', 'findNext', 'findPrev']
const isNav = (c: string | null): boolean =>
  c !== null && NAV_COMMANDS.includes(c)

/** O que a seleção anterior era, quando uma navegação é descartada. */
const settled = (s: SelectionState): SelectionState => ({
  ...s,
  status: s.hit ? 'selected' : 'none',
  error: null
})

const unavailable = (
  s: SelectionState,
  error: SelectionError
): SelectionState => ({ ...s, status: 'unavailable', error })

/**
 * `find` = estado de FIND **depois** de reduzir o mesmo evento (a seleção lê os
 * hits e o `findId` daí; não os duplica).
 */
export function selectionReducer(
  state: SelectionState,
  event: BridgeEvent | FindUiAction,
  find: FindState
): SelectionState {
  switch (event.kind) {
    case 'find-cleared':
    case 'process-gone':
    case 'opened':
      return initialSelectionState

    case 'command-sent': {
      const m = event.message
      // `find` novo: a seleção do findId anterior já não pertence à lista.
      if (m.type === 'find') return initialSelectionState
      // `clearHighlight` só conta como limpo se foi enviado (rejeitado → mantém).
      if (m.type === 'clearHighlight') return initialSelectionState
      if (isNav(m.type) && find.status === 'results') {
        return { ...state, status: 'pending', error: null }
      }
      return state
    }

    case 'find-active': {
      const p = event.payload
      if (find.status !== 'results' || p.findId !== find.findId) return state
      if (p.outcome === 'no-document') return initialSelectionState
      if (p.outcome === 'stale') return settled(state)
      if (p.outcome === 'navigated') {
        // Índice inválido: o estado de FIND já falhou fechado (activeIndex -1,
        // erro `invalid-index`); o estado do viewer é desconhecido → sem hit.
        if (find.navigation === 'ok' && find.activeIndex >= 0) {
          return {
            status: 'selected',
            hit: find.hits[find.activeIndex] ?? null,
            findId: p.findId,
            error: null
          }
        }
        return {
          status: 'unavailable',
          hit: null,
          findId: p.findId,
          error: find.error ?? {
            code: 'invalid-index',
            message: 'navegação sem resultado válido'
          }
        }
      }
      return unavailable(state, {
        code: p.outcome,
        message: `layout indisponível (${p.outcome})`
      })
    }

    case 'find-navigation-failed':
      if (find.status !== 'results' || event.findId !== find.findId)
        return state
      return unavailable(state, {
        code: event.error.code,
        message: event.error.message
      })

    case 'viewer-error':
      return isNav(event.command) && find.status === 'results'
        ? unavailable(state, {
            code: event.payload.code,
            message: event.payload.message
          })
        : state

    case 'command-rejected':
      return isNav(event.command) && find.status === 'results'
        ? unavailable(state, {
            code: event.error.code,
            message: event.error.message
          })
        : state

    default:
      return state
  }
}
