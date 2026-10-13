// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado de FIND (docs/OBJ-0104-architecture.md §5.4) — first-class (D-4).
// Puro. Não há resultado "de enchimento": `idle` só existe antes da primeira
// pesquisa ou depois de fechar o painel; `empty`, `error` e `truncated` são
// estados explícitos e distintos.

import type { BridgeEvent, CommandRejectCode } from '../bridge/BridgeClient.ts'
import type { FindHit, FindOutcome, FindScope } from '../contracts/protocol.ts'

export type FindStatus = 'idle' | 'searching' | 'results' | 'empty' | 'error'
/** Estado da última navegação (`goto`/`findNext`/`findPrev`). */
export type FindNavigation = 'idle' | 'navigating' | 'ok' | 'unavailable'

export interface FindError {
  code: string | CommandRejectCode
  message: string
}

export interface FindState {
  status: FindStatus
  query: string
  matchCase: boolean
  scope: FindScope
  /** `id` da mensagem `find` em curso (correlação por `replyTo`). */
  pendingId: string | null
  /** `findId` do viewer; só existe depois do `findResult`. */
  findId: number | null
  total: number
  truncated: boolean
  layoutCount: number
  hits: FindHit[]
  /** -1 = nenhum hit activo. */
  activeIndex: number
  navigation: FindNavigation
  lastOutcome: FindOutcome | null
  error: FindError | null
}

export const initialFindState: FindState = {
  status: 'idle',
  query: '',
  matchCase: false,
  scope: 'drawing',
  pendingId: null,
  findId: null,
  total: 0,
  truncated: false,
  layoutCount: 0,
  hits: [],
  activeIndex: -1,
  navigation: 'idle',
  lastOutcome: null,
  error: null
}

/** Acções de UI (não vêm da ponte). */
export type FindUiAction = { kind: 'find-cleared' }

const NAV_COMMANDS = ['goto', 'findNext', 'findPrev'] as const
const isNav = (c: string | null): boolean =>
  c !== null && (NAV_COMMANDS as readonly string[]).includes(c)

export function findReducer(
  state: FindState,
  event: BridgeEvent | FindUiAction
): FindState {
  switch (event.kind) {
    case 'find-cleared':
    case 'process-gone':
    case 'opened':
      // Documento novo ou viewer perdido invalida qualquer pesquisa anterior.
      return initialFindState

    case 'command-sent': {
      const m = event.message
      if (m.type === 'find') {
        return {
          ...initialFindState,
          status: 'searching',
          query: m.payload.query,
          matchCase: m.payload.matchCase,
          scope: m.payload.scope,
          pendingId: event.id
        }
      }
      if (isNav(m.type) && state.status === 'results') {
        return { ...state, navigation: 'navigating', error: null }
      }
      return state
    }

    case 'find-result': {
      if (event.replyTo !== state.pendingId) return state
      const p = event.payload
      return {
        ...state,
        status: p.total === 0 ? 'empty' : 'results',
        pendingId: null,
        findId: p.findId,
        total: p.total,
        truncated: p.truncated,
        layoutCount: p.layoutCount,
        hits: p.hits,
        activeIndex: -1,
        navigation: 'idle',
        lastOutcome: null,
        error: null
      }
    }

    case 'find-active': {
      const p = event.payload
      if (state.status !== 'results' || p.findId !== state.findId) return state
      if (p.outcome === 'navigated') {
        // Um índice fora dos hits recebidos não é navegação válida: fail-closed,
        // a selecção anterior também cai (-1 = nenhum hit activo) para que
        // `describeFind` não mostre uma posição ao lado de "indisponível".
        if (p.index < 0 || p.index >= state.hits.length) {
          return {
            ...state,
            activeIndex: -1,
            navigation: 'unavailable',
            lastOutcome: null,
            error: {
              code: 'invalid-index',
              message: `o viewer indicou o resultado ${p.index}, fora dos ${state.hits.length} resultados`
            }
          }
        }
        return {
          ...state,
          activeIndex: p.index,
          navigation: 'ok',
          lastOutcome: p.outcome,
          error: null
        }
      }
      // `stale`: navegação descartada pelo viewer — a UI ignora-a (§5.4) e a
      // selecção anterior mantém-se. Os restantes resultados são "indisponível".
      return {
        ...state,
        navigation:
          p.outcome === 'stale'
            ? state.activeIndex >= 0
              ? 'ok'
              : 'idle'
            : 'unavailable',
        lastOutcome: p.outcome
      }
    }

    case 'find-navigation-failed':
      // `goto{index:0}` automático rejeitado: a lista mantém-se, sem hit activo.
      if (state.status !== 'results' || event.findId !== state.findId) {
        return state
      }
      return {
        ...state,
        navigation: 'unavailable',
        error: { code: event.error.code, message: event.error.message }
      }

    case 'viewer-error': {
      const err = { code: event.payload.code, message: event.payload.message }
      if (event.command === 'find' && event.replyTo === state.pendingId) {
        return { ...state, status: 'error', pendingId: null, error: err }
      }
      if (isNav(event.command)) {
        return { ...state, navigation: 'unavailable', error: err }
      }
      return state
    }

    case 'command-rejected': {
      const err = { code: event.error.code, message: event.error.message }
      if (event.command === 'find') {
        return { ...state, status: 'error', pendingId: null, error: err }
      }
      if (isNav(event.command)) {
        return { ...state, navigation: 'unavailable', error: err }
      }
      return state
    }

    default:
      return state
  }
}
