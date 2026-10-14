// SPDX-License-Identifier: GPL-3.0-or-later
//
// Lista permitida dos ficheiros do viewer servidos em `/s/<token>/…` (spec §4.1,
// ameaça A3). Os nomes são validados **à construção**; em pedido só se faz uma
// consulta exacta (`Map`), nunca uma resolução de caminho.

import { LocalServerError } from './errors.ts'
import { isBundlePath } from './paths.ts'
import type { BundleEntry, BundleSourcePort } from './types.ts'

export const MAX_BUNDLE_FILES = 2000
/** Pasta dos recursos nativos com o bundle (plugin `withLoopbackViewer`). */
export const VIEWER_BUNDLE_DIR = 'viewer-bundle'
/** Manifesto gerado no prebuild; nunca é servido (não se lista a si próprio). */
export const MANIFEST_FILE = 'MANIFEST.json'
/** Tecto por ficheiro (o wasm do LibreDWG é o maior). */
export const MAX_BUNDLE_FILE_BYTES = 32 * 1024 * 1024

function register(
  entries: Map<string, BundleEntry>,
  path: string,
  entry: BundleEntry
): void {
  if (!isBundlePath(path)) {
    throw new LocalServerError('invalid-config', 'caminho de bundle inválido')
  }
  if (entries.has(path)) {
    throw new LocalServerError('invalid-config', 'caminho de bundle repetido')
  }
  if (
    !Number.isInteger(entry.size) ||
    entry.size < 0 ||
    entry.size > MAX_BUNDLE_FILE_BYTES
  ) {
    throw new LocalServerError('invalid-config', 'tamanho de bundle inválido')
  }
  if (entries.size >= MAX_BUNDLE_FILES) {
    throw new LocalServerError('invalid-config', 'bundle com ficheiros a mais')
  }
  entries.set(path, entry)
}

function portFrom(entries: Map<string, BundleEntry>): BundleSourcePort {
  return { lookup: path => entries.get(path) ?? null }
}

/** Bundle em memória (testes, harness de secretária). */
export function createMemoryBundle(
  files: Readonly<Record<string, Uint8Array | string>>
): BundleSourcePort {
  const entries = new Map<string, BundleEntry>()
  for (const path of Object.keys(files)) {
    const content = files[path]
    const bytes =
      typeof content === 'string' ? new TextEncoder().encode(content) : content
    register(entries, path, { size: bytes.byteLength, read: async () => bytes })
  }
  return portFrom(entries)
}

export interface BundleManifest {
  files: readonly { path: string; bytes: number }[]
}

/**
 * `MANIFEST.json` do bundle empacotado no app (texto não confiável: pode estar
 * truncado ou trocado). Só `{ files: [{ path, bytes }] }`; caminhos e
 * tamanhos são validados depois por `createManifestBundle`. Lança
 * `invalid-config` sem ecoar o conteúdo.
 */
export function parseBundleManifest(text: string): BundleManifest {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new LocalServerError('invalid-config', 'manifesto ilegível')
  }
  const files = (data as { files?: unknown } | null)?.files
  if (!Array.isArray(files) || files.length === 0) {
    throw new LocalServerError('invalid-config', 'manifesto sem ficheiros')
  }
  return {
    files: files.map(f => {
      const { path, bytes } = (f ?? {}) as { path?: unknown; bytes?: unknown }
      if (typeof path !== 'string' || typeof bytes !== 'number') {
        throw new LocalServerError(
          'invalid-config',
          'entrada de manifesto inválida'
        )
      }
      return { path, bytes }
    })
  }
}

/**
 * Bundle descrito por um manifesto (`MANIFEST.json` de B2: caminho + bytes).
 * Só os ficheiros listados existem; a leitura é confirmada contra o tamanho do
 * manifesto (um ficheiro trocado/truncado em disco nunca é servido).
 */
export function createManifestBundle(
  manifest: BundleManifest,
  read: (path: string) => Promise<Uint8Array>
): BundleSourcePort {
  const entries = new Map<string, BundleEntry>()
  for (const file of manifest.files) {
    register(entries, file.path, {
      size: file.bytes,
      read: async () => {
        const bytes = await read(file.path)
        if (bytes.byteLength !== file.bytes) {
          throw new Error(
            'ficheiro do bundle com tamanho diferente do manifesto'
          )
        }
        return bytes
      }
    })
  }
  return portFrom(entries)
}
