// SPDX-License-Identifier: GPL-3.0-or-later
//
// Documentos SINTÉTICOS para exercitar o contrato (M1-S1). Não são DXF/DWG nem
// reproduzem o conteúdo de `e2e/fixtures`: são só layouts + textos pesquisáveis.
// Nenhum parser entra aqui (docs/OBJ-0104-m1-s1-selection-zoom-find-spec.md).

import type { FindHitKind, LayoutInfo } from '../contracts/protocol.ts'

export interface SyntheticText {
  text: string
  layoutName: string
  layer: string
  kind: FindHitKind
  tag?: string
  blockName?: string
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SyntheticDocument {
  name: string
  layouts: LayoutInfo[]
  activeLayoutId: string
  /** Caixa de extensão do desenho (alvo de `zoom extents`). */
  extents: Box
  /** Ordem do documento; o viewer ordena por `tabOrder` ao pesquisar. */
  texts: SyntheticText[]
}

const LAYOUTS: LayoutInfo[] = [
  { name: 'Model', btrId: 'B1', tabOrder: 0 },
  { name: 'Planta', btrId: 'B2', tabOrder: 1 },
  { name: 'Alçados', btrId: 'B3', tabOrder: 2 }
]

/** 3 layouts; «Parede» repete-se em todos; «Cobertura» só em «Alçados». */
export const SYNTHETIC_LAYOUTS_DOC: SyntheticDocument = {
  name: 'synthetic-layouts.dxf',
  layouts: LAYOUTS,
  activeLayoutId: 'B1',
  extents: { minX: 0, minY: 0, maxX: 400, maxY: 200 },
  texts: [
    {
      text: 'Parede norte',
      layoutName: 'Alçados',
      layer: 'A-WALL',
      kind: 'text'
    },
    {
      text: 'Parede exterior',
      layoutName: 'Model',
      layer: 'A-WALL',
      kind: 'text'
    },
    {
      text: 'Cobertura',
      layoutName: 'Alçados',
      layer: 'A-ROOF',
      kind: 'mtext'
    },
    {
      text: 'Parede divisória',
      layoutName: 'Planta',
      layer: 'A-WALL',
      kind: 'text'
    },
    {
      text: 'PAREDE (caixa alta)',
      layoutName: 'Planta',
      layer: 'A-ANNO',
      kind: 'text'
    }
  ]
}

/** Texto dentro de bloco/atributo (`blockName`/`tag`). */
export const SYNTHETIC_BLOCKS_DOC: SyntheticDocument = {
  name: 'synthetic-blocks.dxf',
  layouts: LAYOUTS.slice(0, 1),
  activeLayoutId: 'B1',
  extents: { minX: -50, minY: -50, maxX: 150, maxY: 50 },
  texts: [
    {
      text: 'Obra 42',
      layoutName: 'Model',
      layer: '0',
      kind: 'attribute',
      tag: 'OBRA',
      blockName: 'CARIMBO'
    },
    {
      text: 'Escala 1:50',
      layoutName: 'Model',
      layer: '0',
      kind: 'attribute',
      tag: 'ESCALA',
      blockName: 'CARIMBO'
    }
  ]
}

/** Sem nenhum texto: pesquisa vazia ≠ erro. */
export const SYNTHETIC_EMPTY_DOC: SyntheticDocument = {
  name: 'synthetic-empty.dxf',
  layouts: LAYOUTS.slice(0, 1),
  activeLayoutId: 'B1',
  extents: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
  texts: []
}

/** Muitos hits (`n`) para exercitar `truncated`/`maxResults`. */
export function syntheticManyDoc(n: number): SyntheticDocument {
  return {
    name: 'synthetic-many.dxf',
    layouts: LAYOUTS.slice(0, 1),
    activeLayoutId: 'B1',
    extents: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    texts: Array.from({ length: n }, (_, i) => ({
      text: `Cota ${i}`,
      layoutName: 'Model',
      layer: 'A-DIMS',
      kind: 'text' as const
    }))
  }
}

export const SYNTHETIC_DOCUMENTS: readonly SyntheticDocument[] = [
  SYNTHETIC_LAYOUTS_DOC,
  SYNTHETIC_BLOCKS_DOC,
  SYNTHETIC_EMPTY_DOC
]
