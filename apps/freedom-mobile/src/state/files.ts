// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado do fluxo de ficheiros antes da ponte (escolher/copiar) e falhas locais
// (docs/OBJ-0104-m2-i1-file-flow-spec.md §3.3). O que acontece depois do `open`
// (loading, `opened`, `openFailed`) continua em `state/document.ts`.

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import type {
  FileFlowErrorCode,
  FileFlowEvent,
  FileFlowStage
} from '../files/fileFlow.ts'

export interface FilesError {
  code: FileFlowErrorCode
  message: string
  stage: FileFlowStage
}

export interface FilesState {
  phase: 'idle' | 'picking' | 'staging' | 'handed-off'
  /** Nome seguro do ficheiro em curso. */
  name: string | null
  error: FilesError | null
  /** Remoções de cópias temporárias que falharam (ficam por apagar). */
  cleanupFailures: number
}

export const initialFilesState: FilesState = {
  phase: 'idle',
  name: null,
  error: null,
  cleanupFailures: 0
}

export type FilesAction = FileFlowEvent | BridgeEvent

/** `true` para os eventos de `FileFlow` (prefixo `file-`; os da ponte não o têm). */
export function isFileFlowEvent(action: {
  kind: string
}): action is FileFlowEvent {
  return action.kind.startsWith('file-')
}

export function filesReducer(
  state: FilesState,
  event: FilesAction
): FilesState {
  switch (event.kind) {
    case 'file-picking':
      return { ...state, phase: 'picking', name: null, error: null }
    case 'file-cancelled':
      return { ...state, phase: 'idle', name: null }
    case 'file-staging':
      return { ...state, phase: 'staging', name: event.name, error: null }
    case 'file-handed-off':
      return { ...state, phase: 'handed-off', name: event.name, error: null }
    case 'file-rejected':
      return {
        ...state,
        phase: 'idle',
        name: event.name,
        error: { code: event.code, message: event.message, stage: event.stage }
      }
    case 'file-superseded':
      // Um pedido mais recente já assumiu o estado: nada a fazer.
      return state
    case 'file-cleanup-failed':
      return { ...state, cleanupFailures: state.cleanupFailures + 1 }
    case 'file-asset-released':
    case 'file-sweep':
      return state
    // -- fim da entrega: a partir daqui o estado é do documento ----------------
    case 'opened':
    case 'open-failed':
    case 'open-superseded':
    case 'ready-timeout':
    case 'process-gone':
      return state.phase === 'handed-off'
        ? { ...state, phase: 'idle', name: null }
        : state
    default:
      return state
  }
}
