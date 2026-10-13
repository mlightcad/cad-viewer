// SPDX-License-Identifier: GPL-3.0-or-later
//
// Portas do fluxo de ficheiros (docs/OBJ-0104-m2-i1-file-flow-spec.md §4).
// O núcleo (`fileFlow.ts`) é puro e só fala com estas interfaces; a plataforma
// (picker, sistema de ficheiros, servidor loopback de I5) vive atrás delas.

import type { SendOutcome } from '../bridge/BridgeClient.ts'
import type { DocumentFormat, OpenPayload } from '../contracts/protocol.ts'

/** Ficheiro devolvido pelo picker do SO. `uri` é interno: nunca sai do fluxo. */
export interface PickedFile {
  /** Nome apresentado pelo SO (não confiável: pode trazer separadores/controlos). */
  name: string
  uri: string
  /** `null` = o picker não sabe; o fluxo pergunta ao `AssetStorePort`. */
  size: number | null
  /**
   * `true` = `uri` é uma cópia temporária da app (cache do picker): o fluxo
   * consome-a ao copiar e apaga-a se rejeitar. `false` = ficheiro do utilizador:
   * nunca é apagado.
   */
  owned: boolean
}

export type PickOutcome =
  | { status: 'picked'; file: PickedFile }
  | { status: 'cancelled' }

export interface DocumentPickerPort {
  /** Pode lançar (permissões, SO): o fluxo converte em `read-failed`. */
  pick(): Promise<PickOutcome>
}

export interface AssetStorePort {
  /** Tamanho em bytes de `uri`; lança se ilegível. */
  sizeOf(uri: string): Promise<number>
  /**
   * Copia (ou move, se `consume`) `source.uri` para a pasta controlada da app
   * sob o nome opaco `assetId` e devolve o tamanho **real** copiado.
   */
  stage(
    source: { uri: string; consume: boolean },
    assetId: string,
    format: DocumentFormat
  ): Promise<{ size: number }>
  /** Conteúdo do asset em base64 (entrega de fallback). */
  readBase64(assetId: string): Promise<string>
  /** Apaga o asset; idempotente (já inexistente = sucesso). */
  remove(assetId: string): Promise<void>
  /** Apaga uma cópia temporária do picker (`owned`) que nunca foi copiada. */
  discardSource(uri: string): Promise<void>
  /** Apaga tudo o que a pasta controlada contiver; devolve quantos. */
  sweep(): Promise<number>
}

/** Servidor loopback (I5). Sem ele, `available()` é `false` e usa-se base64. */
export interface AssetUrlPort {
  available(): boolean
  /** URL `http://127.0.0.1:<porta>/…` do asset, ou `null` se não existir. */
  urlFor(assetId: string, format: DocumentFormat): string | null
  /**
   * Revoga o URL do asset. O `FileFlow` chama-o em **toda** a libertação, antes
   * de apagar o ficheiro (M3-I5, spec §4.3): um URL antigo deixa de servir
   * assim que o asset é libertado. Opcional (`NO_LOCAL_SERVER` não tem estado).
   */
  release?(assetId: string): void
}

/** O ponto de entrada do viewer: o que o `BridgeClient` expõe. */
export interface BridgeOpenPort {
  readonly phase: 'booting' | 'ready' | 'failed'
  open(payload: OpenPayload): SendOutcome
}

/** Sem servidor loopback (antes de I5): a entrega cai no fallback base64. */
export const NO_LOCAL_SERVER: AssetUrlPort = {
  available: () => false,
  urlFor: () => null
}
