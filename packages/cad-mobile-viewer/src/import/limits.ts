// SPDX-License-Identifier: GPL-3.0-or-later
//
// Limites [H] de tamanho (arquitectura §4/§5.3), recalibrados em S2. Iguais a
// `MAX_DOCUMENT_BYTES`/`MAX_BASE64_BYTES` do app (teste de deriva).

import type { ImportFormat } from './types'

export const MAX_DOCUMENT_BYTES: Record<ImportFormat, number> = {
  dxf: 20 * 1024 * 1024,
  dwg: 10 * 1024 * 1024
}

/** Acima disto a entrega `base64` é recusada; só `url` (§5.3). */
export const MAX_BASE64_BYTES = 8 * 1024 * 1024

/** Tempo máximo da conversão ([H] 120 s, §5.3 passo 4). */
export const DEFAULT_IMPORT_TIMEOUT_MS = 120_000

/** Maior atraso que `setTimeout` respeita (2^31-1 ms); acima, dispara quase já. */
export const MAX_IMPORT_TIMEOUT_MS = 2 ** 31 - 1
