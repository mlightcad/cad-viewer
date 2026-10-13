/**
 * Text search over the entities of one layout (FIND).
 *
 * Shared by every UI (cad-simple-ui-plugin, the full Vue cad-viewer) so that
 * both behave identically. Pure TypeScript with no runtime imports, published
 * as the `@mlightcad/cad-simple-viewer/find` subpath.
 *
 * Searched fields:
 * - `TEXT` — `textString`
 * - `MTEXT` — `contents` with MTEXT formatting codes removed
 * - `ATTRIB` — attribute value (`textString`) of every `INSERT` in the layout
 *   (the tag is reported for display but is not searched)
 * - `TEXT` / `MTEXT` / `ATTRIB` inside the block definition of every `INSERT`
 *   (nested blocks included, anonymous/dynamic blocks too): title blocks,
 *   legends and labels are usually drawn this way
 * - constant `ATTDEF` values inside block definitions (the only ATTDEFs that
 *   are drawn inside a block; templates get their value from an `ATTRIB`)
 * - `DIMENSION` — the text of its dimension block when that block has a
 *   match, otherwise the override text (`dimensionText`)
 * - `MULTILEADER` — its MTEXT contents
 * - `ACAD_TABLE` — the cell text (from the table block when present,
 *   otherwise the cell strings)
 *
 * Every layout is visited in one synchronous pass per search. A hit inside a
 * block, dimension or table selects the top-level entity of the layout that
 * contains it, and carries the WCS extents of the matched text so the view
 * can zoom to the text itself instead of to the whole block. Xrefs are not
 * searched.
 *
 * The module is structural (no `instanceof`) so it can be unit tested with
 * plain objects.
 */

/** Maximum number of hits returned by one search. */
export const ACAP_FIND_MAX_RESULTS = 500

/** Kind of entity that produced a hit. */
export type AcApFindHitKind =
  | 'text'
  | 'mtext'
  | 'attribute'
  /** TEXT / MTEXT inside a block definition (via an `INSERT`). */
  | 'block'
  | 'dimension'
  | 'leader'
  | 'table'

/** Options for {@link acapFindTextInLayout}. */
export interface AcApFindOptions {
  /**
   * When true the query must match case and accents exactly. When false
   * (default) case, accents (diacritics) and runs of whitespace are ignored.
   */
  matchCase?: boolean
  /** Maximum hits to return; defaults to {@link ACAP_FIND_MAX_RESULTS}. */
  maxResults?: number
}

/** One match returned by {@link acapFindTextInLayout}. */
export interface AcApFindHit {
  /**
   * Top-level entity of the layout that is selected (the `INSERT` for
   * attributes and block text, the `DIMENSION` / `ACAD_TABLE` for their text).
   */
  entityId: string
  /**
   * Key of the text that matched, unique within the layout: the entity id
   * for top-level text, the attribute id for attributes, and
   * `<entityId>/<nested id>…` for text found inside a block, dimension or
   * table (the same block text appears once per `INSERT`).
   */
  textEntityId: string
  kind: AcApFindHitKind
  /** Plain text that matched (formatting codes removed, whitespace collapsed). */
  text: string
  /** Attribute tag, for `attribute` hits. */
  tag?: string
  /** Block name of the owning `INSERT`, for `attribute` hits. */
  blockName?: string
  layer: string
  /** Insertion point of the text in WCS. */
  position: { x: number; y: number }
  /**
   * WCS extents of the matched text, when known (text nested in a block,
   * dimension or table). Used to zoom to the text itself.
   */
  extents?: { min: { x: number; y: number }; max: { x: number; y: number } }
}

/** Result of one search. */
export interface AcApFindResult {
  hits: AcApFindHit[]
  /** True when more than `maxResults` entities matched. */
  truncated: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type EntityLike = any
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Minimal database shape used by the search. */
export interface AcApFindDatabaseLike {
  tables: {
    blockTable: {
      /** Block definition by name; used to search text inside blocks. */
      getAt?(name: string): { newIterator(): Iterable<EntityLike> } | undefined
      getIdAt(id: string):
        | {
            newIterator(): Iterable<EntityLike>
            /** Used to resolve the matched entity for zoom extents. */
            getIdAt?(id: string): EntityLike
          }
        | undefined
    }
    layerTable?: {
      getAt(name: string): { isOff?: boolean; isFrozen?: boolean } | undefined
    }
  }
}

const DIACRITICS = /[̀-ͯ]/g
const WHITESPACE = /\s+/g

/**
 * Normalizes text or a query for comparison.
 *
 * - always: NFKC, whitespace runs → one space, trimmed
 * - unless `matchCase`: accents removed, lower-cased
 */
export function acapNormalizeFindText(
  value: string,
  matchCase = false
): string {
  let result = value.normalize('NFKC').replace(WHITESPACE, ' ').trim()
  if (!matchCase) {
    result = result.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
  }
  return result
}

/**
 * Converts MTEXT contents to plain text: removes formatting codes
 * (`\f…;`, `\H…;`, `\C…;`, `\L \l \O \o \K \k`, braces), turns `\P` into a
 * space, decodes `\~`, `\U+XXXX`, stacked fractions and `%%c %%d %%p`.
 */
export function acapMTextToPlainText(contents: string): string {
  const text = contents.replace(
    /\\(U\+[0-9a-fA-F]{4}|[PX~]|S[^;]*;|[fFHWTQCcAaRrp][^;]*;|[LlOoKk]|[\\{}])|[{}]/g,
    (_match, code: string | undefined) => {
      if (!code) return '' // bare group brace
      if (code.startsWith('U+'))
        return String.fromCharCode(parseInt(code.slice(2), 16))
      if (code === 'P' || code === 'X' || code === '~') return ' '
      if (code === '\\' || code === '{' || code === '}') return code
      if (code[0] === 'S') {
        const stack = /^S([^;^#/]*)[\^#/]?([^;]*);$/.exec(code)
        return stack ? (stack[2] ? `${stack[1]}/${stack[2]}` : stack[1]) : ''
      }
      return '' // font, height, colour, underline… codes
    }
  )
  return decodeControlCodes(text).replace(WHITESPACE, ' ').trim()
}

/** Decodes `%%c`, `%%d`, `%%p` special-character codes. */
function decodeControlCodes(value: string): string {
  return value
    .replace(/%%[cC]/g, 'Ø')
    .replace(/%%[dD]/g, '°')
    .replace(/%%[pP]/g, '±')
}

function plainText(value: unknown): string {
  return typeof value === 'string'
    ? decodeControlCodes(value)
        .normalize('NFKC')
        .replace(WHITESPACE, ' ')
        .trim()
    : ''
}

function isLayerSearchable(
  db: AcApFindDatabaseLike,
  layerName: string,
  cache: Map<string, boolean>
): boolean {
  const cached = cache.get(layerName)
  if (cached !== undefined) return cached
  const layer = db.tables.layerTable?.getAt(layerName)
  const searchable = !(layer?.isOff || layer?.isFrozen)
  cache.set(layerName, searchable)
  return searchable
}

function pointOf(entity: EntityLike): { x: number; y: number } {
  const p = entity.position ??
    entity.location ??
    entity.textLocation ??
    entity.textPosition ?? { x: 0, y: 0 }
  return { x: Number(p.x) || 0, y: Number(p.y) || 0 }
}

/** 4x4 affine matrix, column-major (`AcGeMatrix3d.elements` layout). */
type Matrix = number[]

/** `a × b` for column-major 4x4 matrices. */
function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Array<number>(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k]
      out[col * 4 + row] = sum
    }
  }
  return out
}

function transformPoint(
  m: Matrix | undefined,
  p: { x: number; y: number; z?: number }
): { x: number; y: number } {
  if (!m) return { x: p.x, y: p.y }
  const z = Number(p.z) || 0
  return {
    x: m[0] * p.x + m[4] * p.y + m[8] * z + m[12],
    y: m[1] * p.x + m[5] * p.y + m[9] * z + m[13]
  }
}

function matrixOf(entity: EntityLike): Matrix | undefined {
  try {
    const elements = entity.blockTransform?.elements
    return Array.isArray(elements) && elements.length === 16
      ? (elements as number[])
      : undefined
  } catch {
    return undefined
  }
}

/** WCS box of a (possibly nested) entity, or undefined when unknown. */
function extentsOf(
  entity: EntityLike,
  m: Matrix | undefined
): AcApFindHit['extents'] {
  let box: { min: { x: number; y: number }; max: { x: number; y: number } }
  try {
    box = entity.geometricExtents
  } catch {
    return undefined
  }
  if (!box || !isFinite(box.min?.x) || !isFinite(box.max?.x)) return undefined
  if (!m) return { min: { ...box.min }, max: { ...box.max } }
  const corners = [
    { x: box.min.x, y: box.min.y },
    { x: box.max.x, y: box.min.y },
    { x: box.min.x, y: box.max.y },
    { x: box.max.x, y: box.max.y }
  ].map(p => transformPoint(m, p))
  return {
    min: {
      x: Math.min(...corners.map(p => p.x)),
      y: Math.min(...corners.map(p => p.y))
    },
    max: {
      x: Math.max(...corners.map(p => p.x)),
      y: Math.max(...corners.map(p => p.y))
    }
  }
}

/** Maximum nesting of blocks inside blocks that is searched. */
const MAX_BLOCK_DEPTH = 8

/** Top-level entity of the layout that owns nested text. */
interface Owner {
  entity: EntityLike
  kind: Extract<AcApFindHitKind, 'block' | 'dimension' | 'table'>
  /** Effective layer of the owner (layer `0` entities inherit it). */
  layer: string
}

/**
 * Finds text in the entities of one block table record (a layout).
 *
 * Entities that are invisible or sit on an off/frozen layer are skipped so
 * that results always correspond to something the user can see.
 *
 * @param db - Database owning the layout.
 * @param layoutBtrId - Block table record id of the layout (model/paper space).
 * @param query - User query; blank queries return no hits.
 */
export function acapFindTextInLayout(
  db: AcApFindDatabaseLike,
  layoutBtrId: string,
  query: string,
  options: AcApFindOptions = {}
): AcApFindResult {
  const matchCase = options.matchCase === true
  const max = options.maxResults ?? ACAP_FIND_MAX_RESULTS
  const needle = acapNormalizeFindText(query, matchCase)
  const result: AcApFindResult = { hits: [], truncated: false }
  if (!needle) return result

  const btr = db.tables.blockTable.getIdAt(layoutBtrId)
  if (!btr) return result

  const layers = new Map<string, boolean>()
  const matches = (text: string) =>
    text !== '' && acapNormalizeFindText(text, matchCase).includes(needle)
  /** Set once the result cap is exceeded; stops every loop. */
  let full = false

  const push = (hit: AcApFindHit) => {
    if (result.hits.length >= max) {
      result.truncated = true
      full = true
      return
    }
    result.hits.push(hit)
  }

  /**
   * Hit for text nested in `owner` (block, dimension or table). `path` keeps
   * the key unique when the same block is inserted several times.
   */
  const pushNested = (
    owner: Owner,
    path: string,
    entity: EntityLike,
    kind: AcApFindHitKind,
    text: string,
    m: Matrix | undefined,
    extra: Partial<AcApFindHit> = {}
  ) => {
    const extents = extentsOf(entity, m)
    push({
      entityId: owner.entity.objectId,
      textEntityId: `${path}/${entity.objectId}`,
      kind,
      text,
      layer: owner.layer,
      position: transformPoint(m, pointOf(entity)),
      ...(extents ? { extents } : {}),
      ...extra
    })
  }

  /** Searches the entities of a block definition drawn by `owner`. */
  const visitBlock = (
    entities: Iterable<EntityLike>,
    owner: Owner,
    m: Matrix | undefined,
    path: string,
    depth: number,
    stack: Set<string>
  ) => {
    for (const entity of entities) {
      if (full) return
      const type: string | undefined = entity.dxfTypeName
      if (
        type !== 'TEXT' &&
        type !== 'MTEXT' &&
        type !== 'INSERT' &&
        type !== 'ATTRIB' &&
        type !== 'ATTDEF'
      ) {
        continue
      }
      if (entity.visibility === false) continue
      // Only constant ATTDEFs are drawn inside a block (their default value
      // is geometry); the others get their value from an ATTRIB of the INSERT.
      if (
        type === 'ATTDEF' &&
        (entity.isInvisible ||
          !(entity.isConst || entity.isConstMTextAttribute))
      ) {
        continue
      }
      // Layer 0 inside a block inherits the owner's layer (already checked).
      if (
        entity.layer &&
        entity.layer !== '0' &&
        !isLayerSearchable(db, entity.layer, layers)
      ) {
        continue
      }
      if (type === 'INSERT') {
        if (depth >= MAX_BLOCK_DEPTH) continue
        const inner = matrixOf(entity)
        const nested = m && inner ? multiply(m, inner) : (inner ?? m)
        const nestedPath = `${path}/${entity.objectId}`
        for (const attribute of entity.attributeIterator?.() ?? []) {
          if (full) return
          if (attribute.visibility === false || attribute.isInvisible) continue
          const text = plainText(attribute.textString)
          if (!matches(text)) continue
          // Attributes are stored in the coordinates of the block that holds
          // the nested INSERT, like the INSERT itself.
          pushNested(owner, nestedPath, attribute, 'block', text, m, {
            tag: attribute.tag,
            blockName: entity.blockName
          })
        }
        const name: string | undefined = entity.blockName
        if (!name || stack.has(name)) continue
        const def = db.tables.blockTable.getAt?.(name)
        if (!def) continue
        stack.add(name)
        visitBlock(
          def.newIterator(),
          owner,
          nested,
          nestedPath,
          depth + 1,
          stack
        )
        stack.delete(name)
        continue
      }
      const isMText =
        type === 'MTEXT' ||
        (type === 'ATTDEF' && entity.isConstMTextAttribute && entity.mtext)
      const text = isMText
        ? acapMTextToPlainText(
            String((type === 'MTEXT' ? entity : entity.mtext).contents ?? '')
          )
        : plainText(entity.textString)
      if (!matches(text)) continue
      pushNested(
        owner,
        path,
        entity,
        owner.kind,
        text,
        m,
        type === 'ATTDEF' ? { tag: entity.tag } : {}
      )
    }
  }

  /** Block definition drawn by a DIMENSION / ACAD_TABLE, when present. */
  const ownBlock = (entity: EntityLike) => {
    try {
      // ACAD_TABLE resolves its anonymous block itself.
      const table = entity.blockTableRecord
      if (table?.newIterator)
        return table as { newIterator(): Iterable<EntityLike> }
      const id = entity.dimBlockId
      const byId = id ? db.tables.blockTable.getIdAt(id) : undefined
      if (byId) return byId
      const name = entity.blockName
      return name ? db.tables.blockTable.getAt?.(name) : undefined
    } catch {
      return undefined
    }
  }

  for (const entity of btr.newIterator()) {
    if (full) break
    const type: string | undefined = entity.dxfTypeName
    if (
      type !== 'TEXT' &&
      type !== 'MTEXT' &&
      type !== 'INSERT' &&
      type !== 'DIMENSION' &&
      type !== 'MULTILEADER' &&
      type !== 'ACAD_TABLE'
    ) {
      continue
    }
    if (entity.visibility === false) continue
    if (!isLayerSearchable(db, entity.layer, layers)) continue

    if (type === 'INSERT') {
      for (const attribute of entity.attributeIterator?.() ?? []) {
        if (full) break
        if (attribute.visibility === false || attribute.isInvisible) continue
        const text = plainText(attribute.textString)
        if (!matches(text)) continue
        push({
          entityId: entity.objectId,
          textEntityId: attribute.objectId,
          kind: 'attribute',
          text,
          tag: attribute.tag,
          blockName: entity.blockName,
          layer: entity.layer,
          position: pointOf(attribute)
        })
      }
      const name: string | undefined = entity.blockName
      const def = name ? db.tables.blockTable.getAt?.(name) : undefined
      if (def && !full) {
        visitBlock(
          def.newIterator(),
          { entity, kind: 'block', layer: entity.layer },
          matrixOf(entity),
          String(entity.objectId),
          1,
          new Set([name as string])
        )
      }
      continue
    }

    if (type === 'DIMENSION' || type === 'ACAD_TABLE') {
      const kind = type === 'DIMENSION' ? 'dimension' : 'table'
      const owner: Owner = { entity, kind, layer: entity.layer }
      const block = ownBlock(entity)
      const before = result.hits.length
      if (block) {
        // Dimension / table blocks are already in WCS.
        visitBlock(
          block.newIterator(),
          owner,
          undefined,
          String(entity.objectId),
          1,
          new Set()
        )
      }
      if (block && result.hits.length > before) continue
      // No block, or a block without a matching text: use the stored strings
      // (a dimension override can differ from what the block text shows).
      const texts: string[] = []
      if (type === 'DIMENSION') {
        const override = String(entity.dimensionText ?? '')
        if (override && override !== '<>' && override !== ' ') {
          texts.push(acapMTextToPlainText(override.replace('<>', '')))
        }
      } else {
        const rows = Number(entity.numRows) || 0
        const cols = Number(entity.numColumns) || 0
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            try {
              texts.push(
                acapMTextToPlainText(String(entity.textString?.(r, c) ?? ''))
              )
            } catch {
              // Cell without text content.
            }
          }
        }
      }
      for (const text of texts) {
        if (full) break
        if (!matches(text)) continue
        push({
          entityId: entity.objectId,
          textEntityId: `${entity.objectId}/${result.hits.length}`,
          kind,
          text,
          layer: entity.layer,
          position: pointOf(entity)
        })
      }
      continue
    }

    const text =
      type === 'MTEXT' || type === 'MULTILEADER'
        ? acapMTextToPlainText(String(entity.contents ?? ''))
        : plainText(entity.textString)
    if (!matches(text)) continue
    push({
      entityId: entity.objectId,
      textEntityId: entity.objectId,
      kind:
        type === 'MTEXT' ? 'mtext' : type === 'MULTILEADER' ? 'leader' : 'text',
      text,
      layer: entity.layer,
      position: pointOf(entity)
    })
  }
  return result
}

/** Returns a short excerpt of `text` centred on the first match of `query`. */
export function acapFindExcerpt(
  text: string,
  query: string,
  matchCase = false,
  width = 60
): string {
  if (text.length <= width) return text
  const needle = acapNormalizeFindText(query, matchCase)
  // Normalization may change length (accents, NFKC); fall back to the head.
  const index = acapNormalizeFindText(text, matchCase).indexOf(needle)
  const start = Math.max(0, Math.min(index - 15, text.length - width))
  const slice = text.slice(start, start + width)
  return `${start > 0 ? '…' : ''}${slice}${start + width < text.length ? '…' : ''}`
}
