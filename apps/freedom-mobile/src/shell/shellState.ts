// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado puro do shell (sem React Native). A app só sabe se a superfície do
// viewer arrancou (`ready`) e se o DWG está disponível; nada sobre desenhos.

import {
  type DwgStatus,
  isReadyPayload,
  parseViewerMessage
} from '../contracts/protocol.ts'

/** Tempo máximo à espera de `ready` ([H] §5.1; recalibrado em S1). */
export const READY_TIMEOUT_MS = 15_000

/** Ecrãs do shell. B1 expõe só a superfície do viewer (Acerca/Licenças = L2). */
export type ShellScreen = 'viewer'

export type ViewerPhase = 'booting' | 'ready' | 'failed'
export type ShellError = 'ready-timeout' | 'process-gone'

export interface ShellState {
  screen: ShellScreen
  viewer: ViewerPhase
  dwg: DwgStatus | 'unknown'
  viewerVersion: string | null
  error: ShellError | null
  /** Muda em cada `reload`; usado como `key` para recriar a WebView. */
  generation: number
}

export type ShellAction =
  | { type: 'viewer-message'; raw: unknown }
  | { type: 'ready-timeout' }
  | { type: 'process-gone' }
  | { type: 'reload' }

export const initialShellState: ShellState = {
  screen: 'viewer',
  viewer: 'booting',
  dwg: 'unknown',
  viewerVersion: null,
  error: null,
  generation: 0
}

export function shellReducer(
  state: ShellState,
  action: ShellAction
): ShellState {
  switch (action.type) {
    case 'viewer-message': {
      const parsed = parseViewerMessage(action.raw)
      // B1: só o ciclo de vida (`ready`). Mensagens inválidas ou reservadas
      // (FIND, abertura, …) são ignoradas, nunca lançam.
      if (!parsed.ok || parsed.message.type !== 'ready') return state
      const payload = parsed.message.payload
      if (!isReadyPayload(payload)) return state
      return {
        ...state,
        viewer: 'ready',
        dwg: payload.dwg,
        viewerVersion: payload.viewerVersion,
        error: null
      }
    }
    case 'ready-timeout':
      if (state.viewer !== 'booting') return state
      return { ...state, viewer: 'failed', error: 'ready-timeout' }
    case 'process-gone':
      return {
        ...state,
        viewer: 'failed',
        dwg: 'unknown',
        viewerVersion: null,
        error: 'process-gone'
      }
    case 'reload':
      return {
        ...initialShellState,
        screen: state.screen,
        generation: state.generation + 1
      }
  }
}

/** Texto PT-PT do estado do viewer. */
export function describeViewerStatus(state: ShellState): string {
  if (state.viewer === 'booting') return 'A iniciar o viewer…'
  if (state.viewer === 'ready') {
    return state.dwg === 'unavailable'
      ? 'Viewer pronto. DWG indisponível neste dispositivo; DXF continua a funcionar.'
      : 'Viewer pronto.'
  }
  return state.error === 'process-gone'
    ? 'O viewer encerrou (ficheiro demasiado grande para este dispositivo?). Recarregue.'
    : 'O viewer não arrancou. Recarregue.'
}
