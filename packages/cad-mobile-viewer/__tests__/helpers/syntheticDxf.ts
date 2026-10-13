// SPDX-License-Identifier: GPL-3.0-or-later
//
// DXF SINTÉTICO gerado em memória (texto escrito pela equipa; ver
// __tests__/PROVENANCE.md). Nenhum ficheiro DXF/DWG é lido ou criado em disco.

export interface SyntheticDxfOptions {
  /** `$ACADVER` (por omissão AC1015). */
  version?: string
  texts?: { text: string; layer?: string }[]
  /** `\r\n` em vez de `\n`. */
  crlf?: boolean
  /** Comentários `999` antes da secção, como fazem algumas ferramentas. */
  comment?: string
  bom?: boolean
  /** Entidades em bruto (cada item = linhas código/valor de UMA entidade) na secção ENTITIES. */
  rawEntities?: string[][]
  /** Blocos: nome + entidades em bruto; geram a secção BLOCKS. */
  blocks?: { name: string; entities: string[][] }[]
}

/** Linhas de uma entidade a partir de pares `[código, valor]`. */
export function rawEntity(type: string, ...pairs: [number, string | number][]) {
  return ['0', type, ...pairs.flatMap(([c, v]) => [String(c), String(v)])]
}

export function buildDxf(opts: SyntheticDxfOptions = {}): string {
  const lines: string[] = []
  if (opts.comment) lines.push('999', opts.comment)
  lines.push('0', 'SECTION', '2', 'HEADER')
  lines.push('9', '$ACADVER', '1', opts.version ?? 'AC1015')
  lines.push('0', 'ENDSEC')
  if (opts.blocks?.length) {
    lines.push('0', 'SECTION', '2', 'BLOCKS')
    for (const b of opts.blocks) {
      lines.push('0', 'BLOCK', '8', '0', '2', b.name, '70', '0')
      lines.push('10', '0.0', '20', '0.0', '30', '0.0', '3', b.name)
      for (const e of b.entities) lines.push(...e)
      lines.push('0', 'ENDBLK', '8', '0')
    }
    lines.push('0', 'ENDSEC')
  }
  lines.push('0', 'SECTION', '2', 'ENTITIES')
  ;(opts.texts ?? []).forEach((t, i) => {
    lines.push('0', 'TEXT', '8', t.layer ?? '0')
    lines.push('10', String(i), '20', String(i * 2), '30', '0.0')
    lines.push('40', '2.5', '1', t.text)
  })
  for (const e of opts.rawEntities ?? []) lines.push(...e)
  lines.push('0', 'ENDSEC', '0', 'EOF')
  const body =
    lines.join(opts.crlf ? '\r\n' : '\n') + (opts.crlf ? '\r\n' : '\n')
  return (opts.bom ? '\u00ef\u00bb\u00bf' : '') + body
}

/** Texto → `ArrayBuffer` isolado (UTF-8; um BOM em latin1 vira bytes EF BB BF). */
export function toBuffer(text: string): ArrayBuffer {
  const bytes = new Uint8Array(text.length)
  let ascii = true
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c > 255) ascii = false
    bytes[i] = c & 0xff
  }
  if (ascii) return bytes.buffer as ArrayBuffer
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

/**
 * Bytes que SÓ imitam o cabeçalho de um DWG (`AC10xx` + lixo). Não é um DWG
 * válido: serve para os caminhos de erro (sniff, conversor indisponível,
 * conversor real sem Worker). Parse positivo de DWG = «não verificado (EXT-3)».
 */
export function fakeDwgHeader(version = 'AC1027', extra = 64): ArrayBuffer {
  const bytes = new Uint8Array(6 + extra)
  for (let i = 0; i < 6; i++) bytes[i] = version.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}
