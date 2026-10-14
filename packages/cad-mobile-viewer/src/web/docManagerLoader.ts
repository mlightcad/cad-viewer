// SPDX-License-Identifier: GPL-3.0-or-later
//
// Loader do bundle real (card M4-I6): abre os bytes no `AcApDocManager` — o
// que põe o desenho no canvas WebGL — e devolve a base de dados do documento
// aberto à sessão (mapa, FIND, zoom). Estrutural: não importa
// `cad-simple-viewer`.
//
// Falha sempre explícita: `openDocument` que devolve `false`, que lança ou um
// documento sem base de dados dão erro (o importador mapeia-o para
// `openFailed`). O `AcApDocManager` já fecha a sessão nova falhada e mantém a
// anterior (arquitectura §6.4).

import type { AcDbDatabase } from '@mlightcad/data-model'

import type { DocumentLoader } from '../import/importer'

export interface OpeningDocManager {
  openDocument(
    fileName: string,
    content: ArrayBuffer,
    options: { readOnly?: boolean; timeout?: number }
  ): Promise<boolean>
  readonly curDocument?: { readonly database?: AcDbDatabase } | null
}

export function createDocManagerLoader(
  manager: OpeningDocManager
): DocumentLoader {
  return async ({ name, bytes, signal, timeoutMs }) => {
    if (signal?.aborted) throw new Error('importação cancelada')
    const ok = await manager.openDocument(name, bytes, {
      readOnly: true,
      ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {})
    })
    if (!ok) throw new Error('o viewer recusou o desenho')
    const database = manager.curDocument?.database
    if (!database) throw new Error('documento aberto sem base de dados')
    return database
  }
}
