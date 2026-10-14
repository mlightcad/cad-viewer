// SPDX-License-Identifier: GPL-3.0-or-later
//
// Bootstrap do bundle do viewer (arquitectura §6.2; card M4-I6). Corre dentro
// da WebView do app, servido pelo `LocalAssetServer` em
// `http://127.0.0.1:<porta>/s/<token>/`. Tudo é relativo à própria origem:
// nenhum `baseUrl` externo (o `DEFAULT_BASE_URL` da CDN nunca é usado) e o
// ficheiro chega por `open{source:url}` → `createLoopbackFetch`.

import {
  AcApDocManager,
  acapNavigateToFindHit,
  AcApSettingManager,
  LIBREDWG_PARSER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'

import { createLoopbackFetch } from '../import/loopbackFetch'
import { registerDwg } from '../import/registerDwg'
import { createViewerDispatcher } from '../viewer/dispatcher'
import { ViewerSession } from '../viewer/session'
import { createDocManagerViewPort } from '../viewer/viewPort'
import { createDocManagerLoader } from './docManagerLoader'
import { type BridgeWindow, installBridge } from './transport'

function boot(): void {
  const container = document.getElementById('viewer')
  if (!container) throw new Error('contentor do viewer em falta')

  // A UI é nativa (arquitectura §6.2 passo 4): nada de linha de comandos,
  // barras ou estatísticas web por cima do desenho.
  AcApSettingManager.configure({ storageKey: 'freedom.mobile.viewer' })
  const settings = AcApSettingManager.instance
  settings.isShowCommandLine = false
  settings.isShowToolbar = false
  settings.isShowShortCutToolbar = false
  settings.isShowCoordinate = false
  settings.isShowEntityInfo = false
  settings.isShowStats = false

  const dwg = registerDwg(`./assets/${LIBREDWG_PARSER_WORKER_FILE}`)
  const manager = AcApDocManager.createInstance({
    container,
    autoResize: true,
    baseUrl: './assets/cad-data/',
    preloadDefaultFonts: false,
    // sem worker de MTEXT no bundle v1: desenho no thread principal
    useMainThreadDraw: true,
    checkWorkersOnInit: false
  })
  const session = new ViewerSession({
    view: createDocManagerViewPort(manager, {
      navigateToHit: acapNavigateToFindHit
    }),
    dwg: dwg.status,
    load: createDocManagerLoader(manager),
    fetchBytes: createLoopbackFetch()
  })
  installBridge(
    window as unknown as BridgeWindow,
    createViewerDispatcher(session),
    dwg.status
  )
}

boot()
