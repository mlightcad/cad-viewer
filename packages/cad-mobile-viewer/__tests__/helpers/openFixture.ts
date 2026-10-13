// SPDX-License-Identifier: GPL-3.0-or-later
//
// Importa DXF (sintético ou fixture de e2e lida IN-PLACE, sem cópia) pela
// camada de importação REAL e devolve o documento (spec M2-I3 §2).

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { importDocument } from '../../src/import/importer'
import type { ImportedDocument } from '../../src/import/types'
import { toBuffer } from './syntheticDxf'

export const E2E_FIXTURES = resolve(
  __dirname,
  '../../../cad-viewer-example/e2e/fixtures'
)

export function e2eBytes(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(E2E_FIXTURES, name))
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

export async function openBytes(
  name: string,
  bytes: ArrayBuffer
): Promise<ImportedDocument> {
  const out = await importDocument({ name, bytes }, { dwg: 'unavailable' })
  if (!out.ok) throw new Error(`import falhou: ${out.failure.code}`)
  return out.document
}

export const openE2e = (name: string) => openBytes(name, e2eBytes(name))
export const openText = (name: string, text: string) =>
  openBytes(name, toBuffer(text))
