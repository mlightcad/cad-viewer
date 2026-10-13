// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado de sessão da app: shell + documento + FIND + seleção + zoom + último problema.
// Alimentado só por eventos do `BridgeClient` e por acções de UI; puro.

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type { ZoomOp } from '../contracts/protocol.ts'
import {
  initialShellState,
  shellReducer,
  type ShellState
} from '../shell/shellState.ts'
import {
  documentReducer,
  type DocumentState,
  initialDocumentState
} from './document.ts'
import {
  findReducer,
  type FindState,
  type FindUiAction,
  initialFindState
} from './find.ts'
import {
  initialSelectionState,
  selectionReducer,
  type SelectionState
} from './selection.ts'

export interface ZoomState {
  lastOp: ZoomOp | null
  error: { code: string; message: string } | null
}

export const initialZoomState: ZoomState = { lastOp: null, error: null }

/** Problema visível ao utilizador que não pertence a documento/FIND/zoom. */
export interface SessionIssue {
  source: 'protocol' | 'viewer' | 'command'
  code: string
  message: string
}

export interface SessionState {
  shell: ShellState
  document: DocumentState
  find: FindState
  selection: SelectionState
  zoom: ZoomState
  issue: SessionIssue | null
}

export const initialSessionState: SessionState = {
  shell: initialShellState,
  document: initialDocumentState,
  find: initialFindState,
  selection: initialSelectionState,
  zoom: initialZoomState,
  issue: null
}

export type SessionAction =
  | BridgeEvent
  | FindUiAction
  | { kind: 'issue-dismissed' }
  | { kind: 'reload' }

function zoomReducer(state: ZoomState, event: BridgeEvent): ZoomState {
  switch (event.kind) {
    case 'command-sent':
      return event.message.type === 'zoom'
        ? { lastOp: event.message.payload.op, error: null }
        : state
    case 'command-rejected':
      return event.command === 'zoom'
        ? {
            ...state,
            error: { code: event.error.code, message: event.error.message }
          }
        : state
    case 'viewer-error':
      return event.command === 'zoom'
        ? {
            ...state,
            error: {
              code: event.payload.code,
              message: event.payload.message
            }
          }
        : state
    case 'opened':
    case 'process-gone':
      // Documento novo = vista de extensão: o `lastOp`/erro do anterior já não valem.
      return initialZoomState
    default:
      return state
  }
}

/** Comandos sem estado próprio: o seu erro tem de aparecer em `issue`. */
const ISSUE_COMMANDS = ['clearHighlight', 'setInsets']

function issueReducer(
  state: SessionIssue | null,
  event: BridgeEvent
): SessionIssue | null {
  switch (event.kind) {
    case 'protocol-error':
      return { source: 'protocol', code: event.code, message: event.message }
    case 'viewer-error':
      // Atribuído a um comando conhecido → o estado desse comando já o mostra.
      if (event.command !== null && !ISSUE_COMMANDS.includes(event.command)) {
        return state
      }
      return {
        source: 'viewer',
        code: event.payload.code,
        message: event.payload.message
      }
    case 'command-rejected':
      return ISSUE_COMMANDS.includes(event.command)
        ? {
            source: 'command',
            code: event.error.code,
            message: event.error.message
          }
        : state
    default:
      return state
  }
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  if (action.kind === 'reload') {
    return {
      ...initialSessionState,
      shell: shellReducer(state.shell, { type: 'reload' })
    }
  }
  if (action.kind === 'issue-dismissed') return { ...state, issue: null }
  if (action.kind === 'find-cleared') {
    const find = findReducer(state.find, action)
    return {
      ...state,
      find,
      selection: selectionReducer(state.selection, action, find)
    }
  }

  const event = action
  let shell = state.shell
  switch (event.kind) {
    case 'ready':
      shell = shellReducer(shell, {
        type: 'viewer-ready',
        payload: event.payload
      })
      break
    case 'ready-timeout':
      shell = shellReducer(shell, { type: 'ready-timeout' })
      break
    case 'process-gone':
      shell = shellReducer(shell, { type: 'process-gone' })
      break
  }
  const find = findReducer(state.find, event)
  return {
    shell,
    document: documentReducer(state.document, event),
    find,
    selection: selectionReducer(state.selection, event, find),
    zoom: zoomReducer(state.zoom, event),
    issue: issueReducer(state.issue, event)
  }
}
