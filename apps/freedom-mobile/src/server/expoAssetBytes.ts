// SPDX-License-Identifier: GPL-3.0-or-later
//
// Bytes dos assets para o LocalAssetServer sobre `expo-file-system` (SDK 57; sem
// dependência nova): a MESMA pasta controlada do `createExpoAssetStore`
// (`ASSET_DIR_NAME`), só por id opaco (`isAssetId`) — um pedido nunca vira um
// caminho. Fino de propósito: toda a lógica está em `localAssetServer.ts`
// (testado em Node). Este ficheiro só é exercitado em dispositivo (S2): aqui só
// typecheck. Não está em `index.ts` (importa `expo-file-system`, nativo).

import { Directory, File, Paths } from 'expo-file-system'

import { ASSET_DIR_NAME } from '../files/expoFileAdapters.ts'
import { isAssetId } from '../files/names.ts'
import type { AssetBytesPort } from './types.ts'

export function createExpoAssetBytes(
  root: Directory = new Directory(Paths.cache, ASSET_DIR_NAME)
): AssetBytesPort {
  const fileFor = (assetId: string): File => {
    if (!isAssetId(assetId)) throw new Error('id de asset inválido')
    return new File(root, assetId)
  }

  return {
    async sizeOf(assetId) {
      const f = fileFor(assetId)
      return f.exists ? f.size : null
    },
    async read(assetId) {
      const f = fileFor(assetId)
      if (!f.exists) throw new Error('asset inexistente')
      return new Uint8Array(await f.arrayBuffer())
    }
  }
}
