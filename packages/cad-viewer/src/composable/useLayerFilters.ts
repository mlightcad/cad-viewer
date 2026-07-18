import {
  AcApDocManager,
  AcDbDocumentEventArgs
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbLayerTableRecord,
  AcLyLayerFilter,
  AcLyLayerGroup
} from '@mlightcad/data-model'
import { onScopeDispose, reactive, ref } from 'vue'

/** Built-in filter tree node that shows every layer. */
export const LAYER_FILTER_ALL = 'all'

/** Built-in filter tree node that shows layers with entities. */
export const LAYER_FILTER_ALL_USED = 'allUsed'

/**
 * One node in the Layer Manager filter tree (`AcLy*` / {@link AcDbDatabase.layerFilters}).
 */
export interface LayerFilterTreeNodeInfo {
  /** Stable UI id for the tree node. */
  id: string
  /** Display name. */
  name: string
  /** Whether this is a group (ID) filter. */
  isGroup: boolean
  /** Nested child filters. */
  children: LayerFilterTreeNodeInfo[]
}

/**
 * Builds a UI tree snapshot from an {@link AcLyLayerFilter} subtree.
 */
function collectFilterTree(
  filter: AcLyLayerFilter,
  id: string
): LayerFilterTreeNodeInfo {
  return {
    id,
    name: filter.name || id,
    isGroup: filter.isIdFilter(),
    children: filter
      .getNestedFilters()
      .map((child, index) => collectFilterTree(child, `${id}:${index}`))
  }
}

/**
 * Finds a filter instance in the tree by the UI node id produced by
 * {@link collectFilterTree}.
 */
function findFilterById(
  root: AcLyLayerFilter,
  id: string
): AcLyLayerFilter | undefined {
  if (id === LAYER_FILTER_ALL) {
    return root
  }

  const parts = id.split(':')
  // ids look like `all:0`, `all:0:1`, …
  if (parts[0] !== LAYER_FILTER_ALL) {
    return undefined
  }

  let current: AcLyLayerFilter = root
  for (let i = 1; i < parts.length; i++) {
    const index = Number(parts[i])
    if (!Number.isInteger(index) || index < 0) {
      return undefined
    }
    const next = current.getNestedFilters()[index]
    if (!next) {
      return undefined
    }
    current = next
  }
  return current
}

/**
 * Finds an unused default name under the given parent filter.
 */
function nextFilterName(parent: AcLyLayerFilter, prefix: string): string {
  const existing = new Set(
    parent.getNestedFilters().map(filter => filter.name.toLowerCase())
  )
  let index = 1
  while (existing.has(`${prefix}${index}`.toLowerCase())) {
    index++
  }
  return `${prefix}${index}`
}

/**
 * Builds a property-filter expression that matches the given layer names.
 */
function buildNameExpression(layerNames: readonly string[]): string {
  const parts = layerNames
    .map(name => name.trim())
    .filter(Boolean)
    .map(name => `NAME=="${name.replace(/"/g, '')}"`)
  if (parts.length === 0) {
    return ''
  }
  if (parts.length === 1) {
    return parts[0]
  }
  return parts.join(' OR ')
}

/**
 * Layer-filter composable for the Layer Manager palette.
 *
 * Reads the AutoCAD Layer Properties Manager tree from
 * {@link AcDbDatabase.layerFilters} (`AcLyLayerFilter` / `AcLyLayerGroup`),
 * not the flat {@link AcDbDatabase.objects.layerFilter} index dictionary.
 *
 * @param editor - Application document manager that owns the active drawing.
 */
export function useLayerFilters(editor: AcApDocManager) {
  const filterTree = reactive<LayerFilterTreeNodeInfo[]>([])
  const selectedFilterId = ref<string>(LAYER_FILTER_ALL)

  const getCurrentDatabase = () => editor.curDocument?.database

  const syncFromDatabase = () => {
    const db = getCurrentDatabase()
    const root = db?.layerFilters.root
    const nested = root
      ? root
          .getNestedFilters()
          .map((child, index) =>
            collectFilterTree(child, `${LAYER_FILTER_ALL}:${index}`)
          )
      : []

    filterTree.splice(0, filterTree.length, ...nested)

    const selected = selectedFilterId.value
    if (
      selected !== LAYER_FILTER_ALL &&
      selected !== LAYER_FILTER_ALL_USED &&
      !(root && findFilterById(root, selected))
    ) {
      selectedFilterId.value = LAYER_FILTER_ALL
    }
  }

  const bindToActiveDocument = (_doc = editor.curDocument) => {
    syncFromDatabase()
  }

  const handleDocumentActivated = (args: AcDbDocumentEventArgs) => {
    bindToActiveDocument(args.doc)
  }

  /**
   * Returns the {@link AcLyLayerFilter} for the current selection, if any.
   */
  function getSelectedFilter(): AcLyLayerFilter | undefined {
    const db = getCurrentDatabase()
    if (!db) return undefined
    if (
      selectedFilterId.value === LAYER_FILTER_ALL ||
      selectedFilterId.value === LAYER_FILTER_ALL_USED
    ) {
      return undefined
    }
    return findFilterById(db.layerFilters.root, selectedFilterId.value)
  }

  /**
   * Tests whether a layer table record matches the currently selected filter.
   *
   * Built-in nodes:
   * - {@link LAYER_FILTER_ALL}: always matches
   * - {@link LAYER_FILTER_ALL_USED}: matches when `layer.isInUse`
   */
  function matchesSelectedFilter(layer: AcDbLayerTableRecord): boolean {
    const id = selectedFilterId.value
    if (id === LAYER_FILTER_ALL) {
      return true
    }
    if (id === LAYER_FILTER_ALL_USED) {
      return layer.isInUse
    }
    const filter = getSelectedFilter()
    if (!filter) {
      return true
    }
    return filter.filter(layer)
  }

  /**
   * Creates a property filter under the tree root.
   *
   * @param layerNames - Layer names to include via a `NAME==` expression.
   * @param preferredName - Display name for the filter.
   * @returns The created filter name, or `null` on failure.
   */
  function createNamedFilter(
    layerNames: readonly string[] = [],
    preferredName?: string
  ): string | null {
    const db = getCurrentDatabase()
    if (!db) return null

    const root = db.layerFilters.root
    const name = preferredName?.trim() || nextFilterName(root, 'Filter')
    if (!name || name.toLowerCase() === 'all') {
      return null
    }
    if (
      root
        .getNestedFilters()
        .some(filter => filter.name.toLowerCase() === name.toLowerCase())
    ) {
      return null
    }

    const filter = new AcLyLayerFilter()
    filter.setName(name)
    filter.setFilterExpression(buildNameExpression(layerNames))
    if (!root.addNested(filter)) {
      return null
    }

    // Re-assign so callers that treat LayerFilters as by-value still see it.
    db.layerFilters = db.layerFilters.clone()
    syncFromDatabase()

    const index = root.getNestedFilters().indexOf(filter)
    if (index >= 0) {
      selectedFilterId.value = `${LAYER_FILTER_ALL}:${index}`
    }
    return name
  }

  /**
   * Creates a group filter under the tree root.
   *
   * @param preferredName - Optional explicit name; otherwise `Group FilterN`.
   * @param layerIds - Optional layer object IDs to include in the group.
   * @returns The created filter name, or `null` on failure.
   */
  function createGroupFilter(
    preferredName?: string,
    layerIds: readonly string[] = []
  ): string | null {
    const db = getCurrentDatabase()
    if (!db) return null

    const root = db.layerFilters.root
    const name = preferredName?.trim() || nextFilterName(root, 'Group Filter')
    if (!name || name.toLowerCase() === 'all') {
      return null
    }
    if (
      root
        .getNestedFilters()
        .some(filter => filter.name.toLowerCase() === name.toLowerCase())
    ) {
      return null
    }

    const group = new AcLyLayerGroup()
    group.setName(name)
    for (const layerId of layerIds) {
      group.addLayerId(layerId)
    }
    if (!root.addNested(group)) {
      return null
    }

    db.layerFilters = db.layerFilters.clone()
    syncFromDatabase()

    const index = root.getNestedFilters().indexOf(group)
    if (index >= 0) {
      selectedFilterId.value = `${LAYER_FILTER_ALL}:${index}`
    }
    return name
  }

  editor.events.documentActivated.addEventListener(handleDocumentActivated)
  bindToActiveDocument()

  onScopeDispose(() => {
    editor.events.documentActivated.removeEventListener(handleDocumentActivated)
  })

  return {
    /** Nested filter nodes under the synthetic `All` root (excluding built-ins). */
    filterTree,
    /** Currently selected filter tree node id. */
    selectedFilterId,
    /** Whether the selected filter accepts the given layer record. */
    matchesSelectedFilter,
    /** Creates a property filter. See {@link createNamedFilter}. */
    createNamedFilter,
    /** Creates a group filter. See {@link createGroupFilter}. */
    createGroupFilter,
    /** Re-reads filters from the active database. */
    syncFromDatabase
  }
}
