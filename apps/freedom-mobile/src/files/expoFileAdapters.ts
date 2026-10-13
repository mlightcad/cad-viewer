// SPDX-License-Identifier: GPL-3.0-or-later
//
// Adaptadores das portas do fluxo de ficheiros sobre `expo-file-system` (SDK 57:
// picker, cópia, leitura e remoção; sem dependência nova). Finos de propósito:
// toda a lógica (validação, ciclo de vida, higiene) está em `fileFlow.ts`, que é
// testado em node. Este ficheiro só é exercitado em dispositivo (S2/T2) — aqui
// só typecheck e `expo export`.

import { Directory, File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'

import { isAssetId } from './names.ts'
import type { AssetStorePort, DocumentPickerPort } from './ports.ts'

/** Pasta controlada da app (dentro da cache; o SO pode limpá-la). */
export const ASSET_DIR_NAME = 'freedom-assets'

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Picker do SO. Android devolve o ficheiro do utilizador; iOS uma cópia temporária. */
export function createExpoPicker(): DocumentPickerPort {
  return {
    async pick() {
      // O MIME de DWG é inconsistente entre plataformas (scoping §7): sem filtro,
      // a extensão é validada pelo fluxo.
      const res = await File.pickFileAsync({ mimeTypes: '*/*' })
      if (res.canceled) return { status: 'cancelled' }
      const file = res.result
      return {
        status: 'picked',
        file: {
          // URIs `content://` trazem o nome percent-encoded.
          name: safeDecode(file.name),
          uri: file.uri,
          // 0 = inexistente/ilegível (o fluxo trata como `read-failed`).
          size: file.size,
          owned: Platform.OS === 'ios'
        }
      }
    }
  }
}

export function createExpoAssetStore(
  root: Directory = new Directory(Paths.cache, ASSET_DIR_NAME)
): AssetStorePort {
  const ensureRoot = (): void => {
    if (!root.exists) root.create({ intermediates: true, idempotent: true })
  }
  /** O ficheiro copiado chama-se só `<assetId>`: nenhum nome do utilizador. */
  const fileFor = (assetId: string): File => {
    if (!isAssetId(assetId)) throw new Error('id de asset inválido')
    return new File(root, assetId)
  }

  return {
    async sizeOf(uri) {
      const f = new File(uri)
      if (!f.exists) throw new Error('ficheiro inexistente')
      return f.size
    },
    async stage(source, assetId) {
      ensureRoot()
      const dest = fileFor(assetId)
      const src = new File(source.uri)
      if (!src.exists) throw new Error('ficheiro de origem inexistente')
      if (source.consume) await src.move(dest)
      else await src.copy(dest)
      return { size: dest.size }
    },
    readBase64: assetId => fileFor(assetId).base64(),
    async remove(assetId) {
      const f = fileFor(assetId)
      if (f.exists) f.delete()
    },
    async discardSource(uri) {
      const f = new File(uri)
      if (f.exists) f.delete()
    },
    async sweep() {
      if (!root.exists) return 0
      let removed = 0
      for (const entry of root.list()) {
        entry.delete()
        removed++
      }
      return removed
    }
  }
}
