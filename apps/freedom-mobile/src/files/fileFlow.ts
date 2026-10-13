// SPDX-License-Identifier: GPL-3.0-or-later
//
// Fluxo offline de ficheiros app → viewer (docs/OBJ-0104-m2-i1-file-flow-spec.md):
// escolher → validar → copiar para a pasta controlada → entregar (url loopback
// | base64) → `BridgeClient.open`, e gerir o ciclo de vida dos assets copiados
// a partir dos eventos da ponte. Puro: a plataforma entra só pelas portas.
//
// Invariantes: nada é enviado ao viewer se a validação local falhar; o `uri` do
// picker e a pasta controlada nunca aparecem em eventos; o fluxo nunca faz
// pedidos de rede; uma falha preserva o documento activo (§6.4 da arquitectura).

import type { BridgeEvent } from '../bridge/BridgeClient.ts'
import {
  detectDocumentFormat,
  type DocumentFormat,
  MAX_BASE64_BYTES,
  MAX_DOCUMENT_BYTES,
  type OpenPayload
} from '../contracts/protocol.ts'
import {
  createAssetIdGenerator,
  isAssetId,
  isLocalAssetUrl,
  redactPaths,
  sanitizeDocumentName
} from './names.ts'
import type {
  AssetStorePort,
  AssetUrlPort,
  BridgeOpenPort,
  DocumentPickerPort,
  PickedFile
} from './ports.ts'

export type FileFlowStage = 'pick' | 'validate' | 'stage' | 'deliver' | 'open'

export type FileFlowErrorCode =
  | 'unsupported-ext'
  | 'too-large'
  | 'read-failed'
  | 'invalid-url'
  | 'invalid-payload'
  | 'viewer-unavailable'
  | 'not-ready'
  | 'send-failed'

/** Texto PT-PT por código (sem excepções cruas: nunca traz caminhos). */
export const FILE_ERROR_MESSAGES: Record<FileFlowErrorCode, string> = {
  'unsupported-ext': 'Só são aceites ficheiros .dwg e .dxf.',
  'too-large':
    'O ficheiro é demasiado grande para este dispositivo (sem servidor local o limite é 8 MB).',
  'read-failed': 'Não foi possível ler o ficheiro.',
  'invalid-url':
    'O endereço local do ficheiro é inválido; a abertura foi cancelada.',
  'invalid-payload': 'O pedido de abertura é inválido.',
  'viewer-unavailable': 'O viewer não está disponível; recarregue.',
  'not-ready': 'O viewer ainda não está pronto.',
  'send-failed': 'Falha a comunicar com o viewer.'
}

export type ReleaseReason =
  | 'superseded'
  | 'open-rejected'
  | 'replaced'
  | 'open-failed'
  | 'ready-timeout'
  | 'process-gone'
  | 'document-closed'
  | 'disposed'
  | 'stage-aborted'
  | 'validation'

export type FileFlowEvent =
  | { kind: 'file-picking' }
  | { kind: 'file-cancelled' }
  | { kind: 'file-staging'; name: string }
  | {
      kind: 'file-handed-off'
      id: string
      assetId: string
      name: string
      size: number
      queued: boolean
      delivery: 'url' | 'base64'
    }
  | {
      kind: 'file-rejected'
      code: FileFlowErrorCode
      message: string
      stage: FileFlowStage
      /** Nome seguro, quando já conhecido. */
      name: string | null
      /** Causa técnica já sem caminhos/URIs. */
      detail?: string
    }
  /** Cópia ainda em curso quando chegou um pedido mais recente. */
  | { kind: 'file-superseded'; name: string }
  | { kind: 'file-asset-released'; assetId: string; reason: ReleaseReason }
  | { kind: 'file-cleanup-failed'; assetId: string | null; message: string }
  | { kind: 'file-sweep'; removed: number }

export type FileFlowResult =
  | { status: 'handed-off'; id: string; assetId: string }
  | { status: 'cancelled' }
  | { status: 'superseded' }
  | { status: 'rejected'; code: FileFlowErrorCode }

export interface FileFlowDeps {
  picker: DocumentPickerPort
  store: AssetStorePort
  urls: AssetUrlPort
  bridge: BridgeOpenPort
  onEvent: (event: FileFlowEvent) => void
  newAssetId?: () => string
  /** Cadeias sensíveis adicionais a redigir das causas técnicas. */
  sensitive?: readonly string[]
}

type AssetState = 'staged' | 'pending' | 'active'

interface Asset {
  state: AssetState
  openId: string | null
}

const base64Length = (bytes: number): number => 4 * Math.ceil(bytes / 3)

export class FileFlow {
  private readonly deps: FileFlowDeps
  private readonly newAssetId: () => string
  private readonly assets = new Map<string, Asset>()
  private readonly byOpenId = new Map<string, string>()
  private readonly leaked = new Set<string>()
  private readonly cleanups = new Set<Promise<void>>()
  private generation = 0
  private disposed = false

  constructor(deps: FileFlowDeps) {
    this.deps = deps
    this.newAssetId = deps.newAssetId ?? createAssetIdGenerator()
  }

  // -- entradas ---------------------------------------------------------------

  /** Arranque: apaga sobras de sessões anteriores (nada está activo ainda). */
  async startup(): Promise<void> {
    try {
      const removed = await this.deps.store.sweep()
      this.emit({ kind: 'file-sweep', removed })
    } catch {
      this.emit({
        kind: 'file-cleanup-failed',
        assetId: null,
        message: 'não foi possível limpar cópias temporárias antigas'
      })
    }
  }

  /** Botão «Abrir»: picker → resto do fluxo. */
  async pickAndOpen(): Promise<FileFlowResult> {
    if (this.disposed) return this.reject('viewer-unavailable', 'pick', null)
    const gen = ++this.generation
    this.emit({ kind: 'file-picking' })
    let outcome
    try {
      outcome = await this.deps.picker.pick()
    } catch (e) {
      return this.reject('read-failed', 'pick', null, e)
    }
    if (outcome.status === 'cancelled') {
      this.emit({ kind: 'file-cancelled' })
      return { status: 'cancelled' }
    }
    if (gen !== this.generation || this.disposed) {
      await this.discard(outcome.file)
      return { status: 'superseded' }
    }
    return this.run(outcome.file, gen)
  }

  /** Ficheiro já escolhido por outra via (partilha/«Abrir com…» futuros). */
  openPicked(file: PickedFile): Promise<FileFlowResult> {
    if (this.disposed) {
      return this.discard(file).then(() =>
        this.reject('viewer-unavailable', 'pick', null)
      )
    }
    return this.run(file, ++this.generation)
  }

  /** Eventos da ponte → ciclo de vida dos assets (spec §3.1). */
  handle(event: BridgeEvent): void {
    switch (event.kind) {
      case 'opened': {
        const id = this.byOpenId.get(event.replyTo)
        if (id === undefined) return
        for (const [other, a] of [...this.assets]) {
          if (a.state === 'active' && other !== id) {
            this.release(other, 'replaced')
          }
        }
        const asset = this.assets.get(id)
        if (asset) {
          asset.state = 'active'
        }
        return
      }
      case 'open-failed':
        return this.releaseByOpenId(event.replyTo, 'open-failed')
      case 'viewer-error':
        if (event.command === 'open') {
          this.releaseByOpenId(event.replyTo, 'open-failed')
        }
        return
      case 'open-superseded':
        return this.releaseByOpenId(event.id, 'superseded')
      case 'ready-timeout':
        return this.releaseWhere(a => a.state === 'pending', 'ready-timeout')
      case 'process-gone':
        return this.releaseWhere(a => a.state !== 'staged', 'process-gone')
      case 'find-active':
        if (event.payload.outcome === 'no-document') {
          this.releaseWhere(a => a.state === 'active', 'document-closed')
        }
        return
      default:
        return
    }
  }

  /** Volta a tentar apagar o que falhou antes. */
  async retryCleanup(): Promise<void> {
    for (const id of [...this.leaked]) await this.removeAsset(id)
  }

  /** Espera as remoções em curso (determinismo para testes/fecho). */
  async settled(): Promise<void> {
    while (this.cleanups.size > 0) await Promise.all([...this.cleanups])
  }

  /** Fim de vida (reload/unmount): liberta tudo, activo incluído. */
  async dispose(): Promise<void> {
    if (!this.disposed) {
      this.releaseWhere(() => true, 'disposed')
      this.disposed = true
    }
    await this.settled()
  }

  // -- diagnóstico (só leitura; usado nos testes) ------------------------------

  get tracked(): { assetId: string; state: AssetState }[] {
    return [...this.assets].map(([assetId, a]) => ({
      assetId,
      state: a.state
    }))
  }

  get leakedIds(): string[] {
    return [...this.leaked]
  }

  // -- núcleo -----------------------------------------------------------------

  private async run(file: PickedFile, gen: number): Promise<FileFlowResult> {
    const { store, urls, bridge } = this.deps
    const stale = (): boolean => gen !== this.generation || this.disposed

    // 1. Nome e formato (nada é copiado nem enviado se falhar).
    const name = sanitizeDocumentName(file.name)
    const format = name ? detectDocumentFormat(name) : null
    if (name === null || format === null) {
      await this.discard(file)
      return this.reject('unsupported-ext', 'validate', null)
    }
    if (bridge.phase === 'failed') {
      await this.discard(file)
      return this.reject('viewer-unavailable', 'validate', name)
    }

    // 2. Tamanho declarado (ou lido) contra os limites; sem servidor, só base64.
    let declared: number
    try {
      declared = file.size ?? (await store.sizeOf(file.uri))
    } catch (e) {
      await this.discard(file)
      return this.reject('read-failed', 'validate', name, e, file)
    }
    const early = this.checkSize(declared, format, urls.available())
    if (early) {
      await this.discard(file)
      return this.reject(early.code, 'validate', name, early.detail)
    }
    if (stale()) {
      await this.discard(file)
      return this.superseded(name)
    }

    // 3. Copia para a pasta controlada, sob um id opaco.
    this.emit({ kind: 'file-staging', name })
    const assetId = this.newAssetId()
    if (!isAssetId(assetId)) {
      await this.discard(file)
      return this.reject(
        'invalid-payload',
        'stage',
        name,
        'id de asset inválido'
      )
    }
    this.assets.set(assetId, { state: 'staged', openId: null })
    let size: number
    try {
      ;({ size } = await store.stage(
        { uri: file.uri, consume: file.owned },
        assetId,
        format
      ))
    } catch (e) {
      this.dropStaged(assetId, 'stage-aborted')
      await this.discard(file)
      return this.reject('read-failed', 'stage', name, e, file)
    }
    if (stale()) {
      this.dropStaged(assetId, 'superseded')
      return this.superseded(name)
    }
    // TOCTOU: o tamanho real da cópia manda, não o declarado.
    const real = this.checkSize(size, format, urls.available())
    if (real) {
      this.release(assetId, 'validation')
      return this.reject(real.code, 'stage', name, real.detail)
    }

    // 4. Entrega: url loopback (preferido) ou base64 (fallback ≤ 8 MB).
    let source: OpenPayload['source']
    let delivery: 'url' | 'base64'
    if (urls.available()) {
      const url = urls.urlFor(assetId, format)
      if (!isLocalAssetUrl(url)) {
        this.release(assetId, 'validation')
        return this.reject('invalid-url', 'deliver', name)
      }
      source = { kind: 'url', url }
      delivery = 'url'
    } else {
      let data: string
      try {
        data = await store.readBase64(assetId)
      } catch (e) {
        this.dropStaged(assetId, 'stage-aborted')
        return this.reject('read-failed', 'deliver', name, e, file)
      }
      if (stale()) {
        this.dropStaged(assetId, 'superseded')
        return this.superseded(name)
      }
      if (data.length !== base64Length(size)) {
        this.release(assetId, 'validation')
        return this.reject(
          'read-failed',
          'deliver',
          name,
          'conteúdo lido incoerente com o tamanho'
        )
      }
      source = { kind: 'base64', data }
      delivery = 'base64'
    }

    // 5. Ponto de entrada do viewer.
    const outcome = bridge.open({ name, size, source })
    if (!outcome.ok) {
      this.release(assetId, 'open-rejected')
      return this.reject(
        outcome.error.code in FILE_ERROR_MESSAGES
          ? (outcome.error.code as FileFlowErrorCode)
          : 'send-failed',
        'open',
        name,
        outcome.error.message
      )
    }
    const asset = this.assets.get(assetId)
    if (asset) {
      asset.state = 'pending'
      asset.openId = outcome.id
      this.byOpenId.set(outcome.id, assetId)
    }
    // Um `open` novo torna obsoleta a resposta de qualquer anterior pendente.
    this.releaseWhere(
      (a, id) => a.state === 'pending' && id !== assetId,
      'superseded'
    )
    this.emit({
      kind: 'file-handed-off',
      id: outcome.id,
      assetId,
      name,
      size,
      queued: outcome.queued,
      delivery
    })
    return { status: 'handed-off', id: outcome.id, assetId }
  }

  private checkSize(
    size: number,
    format: DocumentFormat,
    serverAvailable: boolean
  ): { code: FileFlowErrorCode; detail: string } | null {
    if (!Number.isInteger(size) || size <= 0) {
      return {
        code: 'read-failed',
        detail: 'ficheiro vazio ou tamanho inválido'
      }
    }
    if (size > MAX_DOCUMENT_BYTES[format]) {
      return { code: 'too-large', detail: `${format} acima do limite` }
    }
    if (!serverAvailable && size > MAX_BASE64_BYTES) {
      return { code: 'too-large', detail: 'acima do limite da entrega base64' }
    }
    return null
  }

  // -- ciclo de vida ------------------------------------------------------------

  private releaseByOpenId(openId: string | null, reason: ReleaseReason): void {
    if (openId === null) return
    const id = this.byOpenId.get(openId)
    if (id !== undefined) this.release(id, reason)
  }

  private releaseWhere(
    pred: (a: Asset, id: string) => boolean,
    reason: ReleaseReason
  ): void {
    for (const [id, a] of [...this.assets]) {
      if (pred(a, id)) this.release(id, reason)
    }
  }

  /**
   * Descarta um asset já copiado. Se entretanto foi libertado (`dispose`,
   * `process-gone`) enquanto a cópia ainda decorria, a remoção feita nessa altura
   * correu antes de o ficheiro existir: repete-se (idempotente) para não deixar
   * o ficheiro em disco.
   */
  private dropStaged(assetId: string, reason: ReleaseReason): void {
    if (this.assets.has(assetId)) this.release(assetId, reason)
    else void this.removeAsset(assetId)
  }

  private release(assetId: string, reason: ReleaseReason): void {
    const asset = this.assets.get(assetId)
    if (!asset) return
    this.assets.delete(assetId)
    if (asset.openId !== null) this.byOpenId.delete(asset.openId)
    this.emit({ kind: 'file-asset-released', assetId, reason })
    void this.removeAsset(assetId)
  }

  private removeAsset(assetId: string): Promise<void> {
    const p: Promise<void> = (async () => {
      try {
        await this.deps.store.remove(assetId)
        this.leaked.delete(assetId)
      } catch {
        this.leaked.add(assetId)
        this.emit({
          kind: 'file-cleanup-failed',
          assetId,
          message: 'não foi possível apagar a cópia temporária do ficheiro'
        })
      }
    })().finally(() => this.cleanups.delete(p))
    this.cleanups.add(p)
    return p
  }

  /** Apaga a cópia temporária do picker de um ficheiro que não seguiu. */
  private async discard(file: PickedFile): Promise<void> {
    if (!file.owned) return
    try {
      await this.deps.store.discardSource(file.uri)
    } catch {
      this.emit({
        kind: 'file-cleanup-failed',
        assetId: null,
        message: 'não foi possível apagar a cópia temporária do ficheiro'
      })
    }
  }

  // -- saídas -------------------------------------------------------------------

  private superseded(name: string): FileFlowResult {
    this.emit({ kind: 'file-superseded', name })
    return { status: 'superseded' }
  }

  private reject(
    code: FileFlowErrorCode,
    stage: FileFlowStage,
    name: string | null,
    cause?: unknown,
    file?: PickedFile
  ): FileFlowResult {
    const raw =
      cause === undefined
        ? undefined
        : cause instanceof Error
          ? cause.message
          : String(cause)
    const detail =
      raw === undefined
        ? undefined
        : redactPaths(raw, [...(this.deps.sensitive ?? []), file?.uri ?? ''])
    this.emit({
      kind: 'file-rejected',
      code,
      message: FILE_ERROR_MESSAGES[code],
      stage,
      name,
      ...(detail !== undefined ? { detail } : {})
    })
    return { status: 'rejected', code }
  }

  private emit(event: FileFlowEvent): void {
    if (!this.disposed) this.deps.onEvent(event)
  }
}
