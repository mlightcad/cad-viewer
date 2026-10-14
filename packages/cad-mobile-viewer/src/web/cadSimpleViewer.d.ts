// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tipos mínimos da entrada raiz de `@mlightcad/cad-simple-viewer` usados só
// pelo bootstrap (`main.ts`). O pacote não é compilado aqui (o `tsc` do viewer
// móvel não arrasta o Three.js); o vite resolve-o pela fonte (`vite.config.ts`).
declare module '@mlightcad/cad-simple-viewer' {
  import type { NavigateToHit } from '../viewer/viewPort'
  import type { OpeningDocManager } from './docManagerLoader'

  export const LIBREDWG_PARSER_WORKER_FILE: string
  export const acapNavigateToFindHit: NavigateToHit<AcApDocManager>

  export class AcApSettingManager {
    static configure(options: { storageKey: string }): void
    static get instance(): AcApSettingManager
    isShowCommandLine: boolean
    isShowToolbar: boolean
    isShowShortCutToolbar: boolean
    isShowCoordinate: boolean
    isShowEntityInfo: boolean
    isShowStats: boolean
  }

  export class AcApDocManager implements OpeningDocManager {
    static createInstance(options: {
      container?: HTMLElement
      autoResize?: boolean
      baseUrl?: string
      preloadDefaultFonts?: boolean
      useMainThreadDraw?: boolean
      checkWorkersOnInit?: boolean
    }): AcApDocManager
    openDocument: OpeningDocManager['openDocument']
    readonly curDocument: OpeningDocManager['curDocument']
    readonly curView: import('../viewer/viewPort').ViewLike | null
  }
}
