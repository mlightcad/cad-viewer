// SPDX-License-Identifier: GPL-3.0-or-later
//
// Servidor loopback de produção (card M4-I6): `LocalAssetServer` + listener
// nativo (`react-native-tcp-socket`, só 127.0.0.1) + bundle REAL do viewer
// empacotado no binário + bytes dos assets em `expo-file-system` + token de
// `expo-crypto` (gerador seguro do SO: o Hermes não expõe
// `crypto.getRandomValues`, e sem ele o núcleo recusa arrancar). Só corre em
// dispositivo (evidência M4-I6); cada peça está testada em Node.

import { getRandomValues } from 'expo-crypto'

import type { ServerFactory } from '../screens/viewerSession.ts'
import { createExpoAssetBytes } from './expoAssetBytes.ts'
import { LocalAssetServer } from './localAssetServer.ts'
import { createNativeHttpListener } from './nativeListener.ts'
import { createExpoViewerBundle } from './viewerBundle.ts'

/**
 * `null` sem módulo nativo (Expo Go); lança se o bundle não vier no binário.
 * Em ambos os casos o app mostra o erro e não carrega nenhuma página.
 */
export const createNativeServer: ServerFactory = onEvent => {
  const listener = createNativeHttpListener()
  if (!listener) return null
  return new LocalAssetServer({
    listener,
    bundle: createExpoViewerBundle(),
    assets: createExpoAssetBytes(),
    randomBytes: length => getRandomValues(new Uint8Array(length)),
    onEvent
  })
}
