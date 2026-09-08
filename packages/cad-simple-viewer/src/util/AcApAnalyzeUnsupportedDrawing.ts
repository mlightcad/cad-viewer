import type { AcDbClass, AcDbDatabase, AcDbEntity } from '@mlightcad/data-model'

/**
 * Heuristic markers for TArch / 天正 custom classes in the CLASSES section.
 *
 * Real drawings commonly use `TCH_*` and `TH_*` DXF / C++ class names
 * (see {@link AcDbClass} docs which use `TH_TOLERANCEENT` as an example).
 */
const TIANZHENG_NAME_PREFIXES = ['TCH_', 'TH_'] as const

/**
 * Result of scanning a drawing for unsupported / custom entities.
 */
export interface AcApUnsupportedDrawingAnalysis {
  /** Entities the parser could not construct at all. */
  unknownEntityCount: number
  /** Sum of `instanceCount` for 天正-like entity classes. */
  tianzhengEntityCount: number
  /** `ProxyEntity` instances with empty / missing proxy graphics. */
  emptyProxyEntityCount: number
  /** True when CLASSES (or proxy metadata) looks like a 天正 drawing. */
  isTianzhengDrawing: boolean
  /** Whether the viewer should surface a parsing warning. */
  shouldWarn: boolean
}

/**
 * Options for {@link acapAnalyzeUnsupportedDrawing}.
 */
export interface AcApAnalyzeUnsupportedDrawingOptions {
  /**
   * When `false`, skip walking block-table entities for empty proxies
   * (CLASSES-only pass). Default `true`.
   */
  scanProxies?: boolean
}

/**
 * Returns true when a CLASSES entry name looks like a 天正 / TArch class.
 *
 * @param name - DXF or C++ class name to test.
 * @returns `true` when the name starts with a known 天正 prefix.
 */
export function acapIsTianzhengClassName(
  name: string | undefined | null
): boolean {
  if (!name) return false
  const normalized = name.trim().toUpperCase()
  if (!normalized) return false
  return TIANZHENG_NAME_PREFIXES.some(prefix => normalized.startsWith(prefix))
}

/**
 * Returns true when a class definition appears to belong to 天正 / TArch.
 *
 * @param entry - CLASSES table entry from the drawing database.
 * @returns `true` when name / cpp name / app name matches 天正 heuristics.
 */
export function acapIsTianzhengClass(entry: AcDbClass): boolean {
  if (
    acapIsTianzhengClassName(entry.name) ||
    acapIsTianzhengClassName(entry.cppClassName)
  ) {
    return true
  }
  const app = entry.appName?.trim() ?? ''
  if (!app) return false
  return /天正|tarch|tianzheng/i.test(app)
}

/**
 * Narrows an entity to a proxy entity with optional graphics metadata.
 *
 * @param entity - Database entity to test.
 * @returns Type predicate for proxy entities.
 */
function isProxyEntity(
  entity: AcDbEntity
): entity is AcDbEntity & {
  proxyGraphic?: Uint8Array
  originalDxfName?: string
  originalClassName?: string
} {
  return entity.type === 'ProxyEntity'
}

/**
 * Counts undrawable proxy entities and whether any proxy metadata looks like 天正.
 *
 * @param database - Opened drawing database.
 * @returns Empty-proxy count and a 天正 hint from original class names.
 */
function scanProxyEntities(database: AcDbDatabase): {
  emptyProxyEntityCount: number
  tianzhengProxyHint: boolean
} {
  let emptyProxyEntityCount = 0
  let tianzhengProxyHint = false

  for (const btr of database.tables.blockTable.newIterator()) {
    for (const entity of btr.newIterator()) {
      if (!isProxyEntity(entity)) continue
      if (!entity.proxyGraphic?.length) {
        emptyProxyEntityCount += 1
      }
      if (
        !tianzhengProxyHint &&
        (acapIsTianzhengClassName(entity.originalDxfName) ||
          acapIsTianzhengClassName(entity.originalClassName))
      ) {
        tianzhengProxyHint = true
      }
    }
  }

  return { emptyProxyEntityCount, tianzhengProxyHint }
}

/**
 * Analyzes a drawing for unsupported / custom entities the viewer cannot show.
 *
 * Combines parser stats (`unknownEntityCount`), CLASSES-section heuristics
 * (especially 天正 `TCH_` / `TH_` classes), and a scan for empty proxy graphics.
 *
 * @param database - Opened drawing database.
 * @param unknownEntityCount - Count reported at PARSE END; defaults to `0`.
 * @param options - Analysis flags (see {@link AcApAnalyzeUnsupportedDrawingOptions}).
 * @returns Aggregated counts and whether a warning should be shown.
 */
export function acapAnalyzeUnsupportedDrawing(
  database: AcDbDatabase,
  unknownEntityCount = 0,
  options: AcApAnalyzeUnsupportedDrawingOptions = {}
): AcApUnsupportedDrawingAnalysis {
  const { scanProxies = true } = options

  let tianzhengEntityCount = 0
  let isTianzhengDrawing = false

  for (const entry of database.classes) {
    if (!acapIsTianzhengClass(entry)) continue
    isTianzhengDrawing = true
    if (entry.isEntity && entry.instanceCount > 0) {
      tianzhengEntityCount += entry.instanceCount
    }
  }

  let emptyProxyEntityCount = 0
  if (scanProxies) {
    const proxyScan = scanProxyEntities(database)
    emptyProxyEntityCount = proxyScan.emptyProxyEntityCount
    if (proxyScan.tianzhengProxyHint) {
      isTianzhengDrawing = true
    }
  }

  if (isTianzhengDrawing && tianzhengEntityCount === 0) {
    tianzhengEntityCount = emptyProxyEntityCount
  }

  const shouldWarn =
    unknownEntityCount > 0 ||
    tianzhengEntityCount > 0 ||
    emptyProxyEntityCount > 0

  return {
    unknownEntityCount,
    tianzhengEntityCount,
    emptyProxyEntityCount,
    isTianzhengDrawing,
    shouldWarn
  }
}
