/**
 * Built-in CAD scripts shown in the script panel.
 *
 * Descriptions live in the locale tables so search follows the UI language.
 * The source stays in English identifiers that match the `cad` host.
 */

/** Stable ids. Locale tables must provide a title and description for each. */
export const SCRIPT_EXAMPLE_IDS = [
  'countByType',
  'circlesByLayer',
  'drawingOverview',
  'textContents',
  'selectCurrentLayer',
  'longestLines',
  'extentsBox',
  'blockSummary',
  'layerTable',
  'circleGrid',
  'stampTitle',
  'moveSelection'
] as const

/** Id of one built-in script. */
export type ScriptExampleId = (typeof SCRIPT_EXAMPLE_IDS)[number]

/** One learnable script. */
export interface ScriptExample {
  /** Locale-table key. */
  id: ScriptExampleId
  /** Function body passed to the script runner. */
  code: string
}

/** Title and description shown for one example in the current language. */
export interface ScriptExampleCopy {
  /** Short name used as the list label. */
  title: string
  /** What the script does, used by search. */
  description: string
}

/** Localized titles and descriptions keyed by {@link ScriptExampleId}. */
export type ScriptExampleCopyTable = Record<ScriptExampleId, ScriptExampleCopy>

/** Sample scripts, in the order the panel lists them. */
export const SCRIPT_EXAMPLES: readonly ScriptExample[] = [
  {
    id: 'countByType',
    code: `const counts = {}
for (const entity of cad.entities.where(() => true)) {
  counts[entity.type] = (counts[entity.type] || 0) + 1
}
cad.log('entity count by type', counts)
return {
  title: cad.drawing.title,
  layer: cad.drawing.currentLayer,
  counts
}`
  },
  {
    id: 'circlesByLayer',
    code: `const counts = {}
for (const entity of cad.entities.where(entity => entity.type === 'Circle')) {
  counts[entity.layer] = (counts[entity.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) {
    max = count
    top = layer
  }
}
const ids = cad.entities.where(entity => entity.layer === top).map(entity => entity.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }`
  },
  {
    id: 'drawingOverview',
    code: `const drawing = cad.drawing
return {
  title: drawing.title,
  currentLayer: drawing.currentLayer,
  units: drawing.units,
  extents: drawing.extents,
  layers: drawing.layers
}`
  },
  {
    id: 'textContents',
    code: `const texts = []
for (const entity of cad.entities.where(entity =>
  entity.type === 'Text' ||
  entity.type === 'MText' ||
  entity.type === 'Attribute'
)) {
  const geometry = entity.geometry
  texts.push({
    id: entity.id,
    type: entity.type,
    layer: entity.layer,
    text: geometry ? geometry.text : undefined
  })
}
return { count: texts.length, texts }`
  },
  {
    id: 'selectCurrentLayer',
    code: `const layer = cad.drawing.currentLayer
const ids = cad.entities
  .where(entity => entity.layer === layer)
  .map(entity => entity.id)
cad.selection.replace(ids)
return { layer, count: ids.length }`
  },
  {
    id: 'longestLines',
    code: `const lines = []
for (const entity of cad.entities.where(entity => entity.type === 'Line')) {
  const geometry = entity.geometry
  if (!geometry || !geometry.start || !geometry.end) continue
  const dx = geometry.end.x - geometry.start.x
  const dy = geometry.end.y - geometry.start.y
  lines.push({
    id: entity.id,
    layer: entity.layer,
    length: Math.hypot(dx, dy)
  })
}
lines.sort((a, b) => b.length - a.length)
const top = lines.slice(0, 10)
cad.selection.replace(top.map(line => line.id))
return { count: lines.length, longest: top }`
  },
  {
    id: 'extentsBox',
    code: `const extents = cad.drawing.extents
if (!extents || !extents.min || !extents.max) {
  return { count: 0 }
}
const min = extents.min
const max = extents.max
const mid = {
  x: (min.x + max.x) / 2,
  y: (min.y + max.y) / 2
}
const hits = cad.entities.inBox({ x: min.x, y: min.y }, mid)
cad.selection.replace(hits.map(entity => entity.id))
return {
  box: { min: { x: min.x, y: min.y }, max: mid },
  count: hits.length
}`
  },
  {
    id: 'blockSummary',
    code: `const blocks = cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  isXref: block.isXref,
  entityCount: block.entities.length
}))
return { count: blocks.length, blocks }`
  },
  {
    id: 'layerTable',
    code: `const table = cad.tables.layerTable
return {
  id: table.id,
  layers: table.records.map(record => ({
    id: record.id,
    name: record.name
  }))
}`
  },
  {
    id: 'circleGrid',
    code: `const layer = 'GRID'
const exists = cad.drawing.layers.some(entry => entry.name === layer)
const ids = []
cad.edit.transaction('circle grid', tx => {
  if (!exists) tx.createLayer(layer)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      ids.push(tx.drawCircle({
        center: { x: col * 20, y: row * 20 },
        radius: 5,
        layer
      }))
    }
  }
})
cad.selection.replace(ids)
cad.view.zoomExtents()
return { layer, created: ids.length }`
  },
  {
    id: 'stampTitle',
    code: `const layer = 'NOTES'
const exists = cad.drawing.layers.some(entry => entry.name === layer)
const title = cad.drawing.title || 'Untitled'
let id = ''
cad.edit.transaction('stamp title', tx => {
  if (!exists) tx.createLayer(layer)
  tx.setCurrentLayer(layer)
  id = tx.drawText({
    position: { x: 0, y: 0 },
    text: title,
    height: 2.5,
    layer
  })
})
cad.view.zoomExtents()
return { layer, id, title }`
  },
  {
    id: 'moveSelection',
    code: `const ids = cad.selection.ids
if (!ids.length) {
  return { moved: 0 }
}
const dx = 10
const dy = 0
cad.edit.transaction('move selection', tx => {
  tx.move(ids, dx, dy)
})
return { moved: ids.length, dx, dy }`
  }
]

/**
 * Keeps examples whose title, description, or source contains the query.
 *
 * @param examples - Catalog to filter.
 * @param copy - Localized title and description for each id.
 * @param query - Text from the search box. Blank returns every example.
 * @returns Examples that match, in catalog order.
 */
export function filterScriptExamples(
  examples: readonly ScriptExample[],
  copy: ScriptExampleCopyTable,
  query: string
): ScriptExample[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...examples]
  return examples.filter(example => {
    const text = copy[example.id]
    const haystack = `${text.title}\n${text.description}\n${example.code}`
    return haystack.toLowerCase().includes(needle)
  })
}
