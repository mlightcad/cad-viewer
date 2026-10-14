// SPDX-License-Identifier: GPL-3.0-or-later
//
// Listener nativo do app (spec M3-I5 §8 item 1; card M4-I6): o
// `createTcpHttpListener` sobre `react-native-tcp-socket` (MIT, Android/iOS,
// callback por ligação em JS, binário seguro). A biblioteca escuta por omissão
// em 0.0.0.0: o adaptador pede SEMPRE 127.0.0.1 e o núcleo recusa qualquer
// outro endereço devolvido. Exercitado em dispositivo (evidência M4-I6); o
// código HTTP é o mesmo testado em Node (`tcpHttpListener.node-test.ts`).

import { NativeModules } from 'react-native'

import {
  createTcpHttpListener,
  type TcpHttpListener,
  type TcpModuleLike
} from './tcpHttpListener.ts'

/**
 * `null` = este binário não tem o módulo nativo (Expo Go, build antigo): o app
 * mostra o erro e não arranca o viewer (sem queda para outra origem). O módulo
 * só é carregado depois desta verificação: no iOS o `NativeEventEmitter` da
 * biblioteca lança à importação se o módulo nativo faltar.
 */
export function createNativeHttpListener(): TcpHttpListener | null {
  if (!NativeModules.TcpSockets) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-tcp-socket') as {
    default?: TcpModuleLike
  } & TcpModuleLike
  return createTcpHttpListener(mod.default ?? mod)
}
