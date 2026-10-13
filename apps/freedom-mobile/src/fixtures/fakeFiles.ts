// SPDX-License-Identifier: GPL-3.0-or-later
//
// Portas falsas do fluxo de ficheiros (M2-I1): picker, pasta controlada e
// servidor loopback em memória, com injecção de falhas e rasto de chamadas.
// Determinísticas: sem relógio, sem rede, sem sistema de ficheiros real.

import type { DocumentFormat } from '../contracts/protocol.ts'
import type {
  AssetStorePort,
  AssetUrlPort,
  DocumentPickerPort,
  PickedFile,
  PickOutcome
} from '../files/ports.ts'

/** Caminhos "internos" sentinela: nunca podem aparecer em eventos/mensagens. */
export const SECRET_CACHE_DIR =
  '/data/user/0/pt.aitra.freedom/cache/DocumentPicker'
export const SECRET_USER_DIR =
  'file:///storage/emulated/0/Download/Obra Cliente X'

export function pickedFile(
  name: string,
  size: number | null,
  opts: { uri?: string; owned?: boolean } = {}
): PickedFile {
  return {
    name,
    size,
    uri:
      opts.uri ?? `file://${SECRET_CACHE_DIR}/${Math.abs(hash(name))}/${name}`,
    owned: opts.owned ?? true
  }
}

function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return h
}

export class FakePicker implements DocumentPickerPort {
  readonly queue: (PickOutcome | Error | (() => Promise<PickOutcome>))[] = []
  calls = 0

  async pick(): Promise<PickOutcome> {
    this.calls++
    const next = this.queue.shift()
    if (next === undefined) throw new Error('FakePicker sem resposta')
    if (next instanceof Error) throw next
    return typeof next === 'function' ? next() : next
  }

  willPick(file: PickedFile): this {
    this.queue.push({ status: 'picked', file })
    return this
  }
}

export interface FakeStoreOptions {
  /** `stage` devolve este tamanho em vez do real (TOCTOU). */
  stageSizeOverride?: number
}

export class FakeAssetStore implements AssetStorePort {
  /** Fonte "no disco": uri → bytes. */
  readonly sources = new Map<string, number>()
  /** Pasta controlada: assetId → bytes. */
  readonly staged = new Map<string, number>()
  readonly calls: string[] = []
  failStage = false
  failRead = false
  failSizeOf = false
  failSweep = false
  /** ids cuja remoção falha (e continuam no disco). */
  readonly failRemove = new Set<string>()
  /** O próximo `stage` fica à espera deste promise (concorrência); uso único. */
  stageGate: Promise<void> | null = null
  /** Substitui o conteúdo devolvido por `readBase64` (leitura incoerente). */
  base64Override: string | null = null
  sweepOnStart = 0
  options: FakeStoreOptions

  constructor(options: FakeStoreOptions = {}) {
    this.options = options
  }

  /** Regista um ficheiro "no disco" e devolve o `PickedFile` correspondente. */
  addSource(file: PickedFile, bytes: number): PickedFile {
    this.sources.set(file.uri, bytes)
    return file
  }

  async sizeOf(uri: string): Promise<number> {
    this.calls.push('sizeOf')
    if (this.failSizeOf) throw new Error(`EACCES: ${uri}`)
    const n = this.sources.get(uri)
    if (n === undefined) throw new Error(`ENOENT: ${uri}`)
    return n
  }

  async stage(
    source: { uri: string; consume: boolean },
    assetId: string,
    _format: DocumentFormat
  ): Promise<{ size: number }> {
    this.calls.push(`stage:${assetId}`)
    const gate = this.stageGate
    this.stageGate = null
    if (gate) await gate
    if (this.failStage) {
      // A falha real deixa o rasto do caminho na mensagem: tem de ser redigido.
      throw new Error(
        `ENOSPC: cannot copy ${source.uri} to ${SECRET_CACHE_DIR}/x`
      )
    }
    const n = this.sources.get(source.uri)
    if (n === undefined) throw new Error(`ENOENT: ${source.uri}`)
    this.staged.set(assetId, n)
    if (source.consume) this.sources.delete(source.uri)
    return { size: this.options.stageSizeOverride ?? n }
  }

  async readBase64(assetId: string): Promise<string> {
    this.calls.push(`read:${assetId}`)
    if (this.failRead) throw new Error(`EIO: ${SECRET_CACHE_DIR}/${assetId}`)
    const n = this.staged.get(assetId)
    if (n === undefined) throw new Error(`ENOENT: ${assetId}`)
    if (this.base64Override !== null) return this.base64Override
    return Buffer.alloc(n).toString('base64')
  }

  async remove(assetId: string): Promise<void> {
    this.calls.push(`remove:${assetId}`)
    if (this.failRemove.has(assetId)) {
      throw new Error(`EBUSY: ${SECRET_CACHE_DIR}/${assetId}`)
    }
    this.staged.delete(assetId)
  }

  async discardSource(uri: string): Promise<void> {
    this.calls.push('discardSource')
    this.sources.delete(uri)
  }

  async sweep(): Promise<number> {
    this.calls.push('sweep')
    if (this.failSweep) throw new Error(`EACCES: ${SECRET_CACHE_DIR}`)
    const n = this.staged.size
    this.staged.clear()
    return n
  }
}

export class FakeUrls implements AssetUrlPort {
  enabled = false
  /** Substitui o URL devolvido (p.ex. um URL externo malicioso). */
  override: ((assetId: string) => string | null) | null = null

  available(): boolean {
    return this.enabled
  }

  urlFor(assetId: string, format: DocumentFormat): string | null {
    if (this.override) return this.override(assetId)
    return `http://127.0.0.1:43123/f/${assetId}.${format}`
  }

  /** Revogações pedidas pelo `FileFlow` (M3-I5), por ordem. */
  readonly released: string[] = []
  /** `release` lança (a limpeza do ficheiro tem de continuar na mesma). */
  failRelease = false

  release(assetId: string): void {
    this.released.push(assetId)
    if (this.failRelease) throw new Error('release falhou')
  }
}
