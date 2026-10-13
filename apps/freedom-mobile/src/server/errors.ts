// SPDX-License-Identifier: GPL-3.0-or-later
//
// Erros determinísticos do servidor loopback (spec §4.2): código fixo, mensagem
// fixa (PT-PT) e, no máximo, uma causa técnica já redigida (sem caminhos/URIs).

import { redactPaths } from '../files/names.ts'

export type LocalServerErrorCode =
  | 'listen-failed'
  | 'not-loopback'
  | 'no-secure-random'
  | 'stopped-during-start'
  | 'disposed'
  | 'invalid-config'

export const LOCAL_SERVER_MESSAGES: Record<LocalServerErrorCode, string> = {
  'listen-failed': 'Não foi possível iniciar o servidor local.',
  'not-loopback':
    'O servidor local não escuta apenas em loopback; foi fechado.',
  'no-secure-random':
    'Sem fonte de aleatoriedade segura; o servidor local não arranca.',
  'stopped-during-start': 'O servidor local foi parado durante o arranque.',
  disposed: 'O servidor local já foi libertado.',
  'invalid-config': 'Configuração inválida do servidor local.'
}

const MAX_DETAIL = 160

export class LocalServerError extends Error {
  readonly code: LocalServerErrorCode
  /** Causa técnica sem caminhos/URIs, truncada. */
  readonly detail?: string

  constructor(code: LocalServerErrorCode, cause?: unknown) {
    super(LOCAL_SERVER_MESSAGES[code])
    this.name = 'LocalServerError'
    this.code = code
    if (cause !== undefined) {
      const raw = cause instanceof Error ? cause.message : String(cause)
      this.detail = redactPaths(raw).slice(0, MAX_DETAIL)
    }
  }
}
