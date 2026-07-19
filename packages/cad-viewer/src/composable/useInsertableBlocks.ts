import {
  AcApBlockPreviewConvertor,
  AcApDocManager,
  isInsertableBlockName,
  yieldToMain
} from '@mlightcad/cad-simple-viewer'
import { ref } from 'vue'

export interface InsertableBlockItem {
  name: string
  previewUrl?: string
}

export { isInsertableBlockName }

const RECENT_KEY = 'ml-cad-block-insert-recent'
const FAVORITES_KEY = 'ml-cad-block-insert-favorites'
const MAX_RECENT = 40

/**
 * Active document identity used to detect drawing switches mid-refresh.
 */
export function currentBlockTableDocId(): string | undefined {
  return AcApDocManager.instance.curDocument?.database.tables.blockTable
    .modelSpace.objectId
}

function readNameList(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .map(v => v.trim())
      .filter(isInsertableBlockName)
  } catch {
    return []
  }
}

function writeNameList(storageKey: string, names: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(names))
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Records a block as recently inserted (most-recent first).
 */
export function rememberRecentBlock(blockName: string) {
  if (!isInsertableBlockName(blockName)) return
  const next = [
    blockName,
    ...readNameList(RECENT_KEY).filter(n => n !== blockName)
  ].slice(0, MAX_RECENT)
  writeNameList(RECENT_KEY, next)
}

/**
 * Returns recently inserted block names (most-recent first).
 */
export function listRecentBlockNames(): string[] {
  return readNameList(RECENT_KEY)
}

/**
 * Returns favorite block names.
 */
export function listFavoriteBlockNames(): string[] {
  return readNameList(FAVORITES_KEY)
}

/**
 * Toggles a block in the favorites list. Returns the new favorite state.
 */
export function toggleFavoriteBlock(blockName: string): boolean {
  if (!isInsertableBlockName(blockName)) return false
  const current = readNameList(FAVORITES_KEY)
  const exists = current.includes(blockName)
  const next = exists
    ? current.filter(n => n !== blockName)
    : [...current, blockName]
  writeNameList(FAVORITES_KEY, next)
  return !exists
}

export function isFavoriteBlock(blockName: string): boolean {
  return listFavoriteBlockNames().includes(blockName)
}

/**
 * Loads insertable block definitions from the current drawing and fills
 * thumbnails progressively.
 */
export function useInsertableBlocks() {
  const blocks = ref<InsertableBlockItem[]>([])
  const previewConvertor = new AcApBlockPreviewConvertor()
  let refreshToken = 0

  function cancelRefresh() {
    refreshToken++
  }

  /**
   * Rebuilds the list from the current document block table.
   *
   * @param filterNames - When set, only include these names (that still exist)
   * @param isActive - Optional gate; refresh aborts when this returns false
   */
  async function refreshBlocks(
    filterNames?: string[] | null,
    isActive?: () => boolean
  ) {
    const token = ++refreshToken
    const docId = currentBlockTableDocId()
    AcApBlockPreviewConvertor.clearCache()
    const items: InsertableBlockItem[] = []
    try {
      const db = AcApDocManager.instance.curDocument?.database
      if (!db || !docId) {
        blocks.value = []
        return
      }

      const allow =
        filterNames == null
          ? null
          : new Set(filterNames.map(n => n.trim()).filter(Boolean))

      if (allow) {
        for (const name of filterNames ?? []) {
          if (!isInsertableBlockName(name)) continue
          if (!db.tables.blockTable.has(name)) continue
          const btr = db.tables.blockTable.getAt(name)
          if (!btr || btr.isXref) continue
          items.push({ name })
        }
      } else {
        for (const btr of db.tables.blockTable.newIterator()) {
          const name = typeof btr.name === 'string' ? btr.name : ''
          if (!isInsertableBlockName(name)) continue
          if (btr.isXref) continue
          items.push({ name })
        }
        items.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        )
      }
    } catch {
      blocks.value = []
      return
    }

    if (token !== refreshToken || currentBlockTableDocId() !== docId) return
    if (isActive && !isActive()) return
    blocks.value = items

    for (let i = 0; i < items.length; i++) {
      if (token !== refreshToken || currentBlockTableDocId() !== docId) return
      if (isActive && !isActive()) return
      const item = items[i]
      const previewUrl = previewConvertor.capture(item.name, 64)
      if (previewUrl) {
        item.previewUrl = previewUrl
        blocks.value = items.slice()
      }
      if (i % 4 === 3) {
        await yieldToMain()
      }
    }
  }

  return {
    blocks,
    cancelRefresh,
    refreshBlocks
  }
}
