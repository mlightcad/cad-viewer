import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  type AcDbDatabase,
  AcDbMLeaderStyle,
  DEFAULT_MLEADER_STYLE
} from '@mlightcad/data-model'
import { computed, ref, shallowReactive, watch } from 'vue'

import {
  buildPreviewMLeaderStyle,
  collectUsedMLeaderStyleNames,
  copyMLeaderStyle,
  createDefaultMLeaderStyleForm,
  createStandardMLeaderStyle,
  getMLeaderStyleByName,
  listMLeaderStyleNames,
  type MLeaderStyleFormState,
  readMLeaderStyleForm,
  writeMLeaderStyleForm
} from '../component/dialog/mleaderStyleForm'

export {
  buildPreviewMLeaderStyle,
  collectUsedMLeaderStyleNames,
  copyMLeaderStyle,
  createDefaultMLeaderStyleForm,
  createStandardMLeaderStyle,
  getMLeaderStyleByName,
  listMLeaderStyleNames,
  MLEADER_ANGLE_OPTIONS_DEG,
  type MLeaderStyleFormState,
  readMLeaderStyleForm,
  writeMLeaderStyleForm
} from '../component/dialog/mleaderStyleForm'

/**
 * Vue composable backing the Multileader Style Manager dialog.
 */
export function useMLeaderStyle() {
  const styleNames = ref<string[]>([])
  const usedNames = ref<Set<string>>(new Set())
  const currentName = ref(DEFAULT_MLEADER_STYLE)
  const selected = ref('')
  const filter = ref<'all' | 'used'>('all')
  // shallowReactive keeps AcCmColor instances intact (deep reactive breaks them).
  const form = shallowReactive<MLeaderStyleFormState>(
    createDefaultMLeaderStyleForm()
  )
  const previewRevision = ref(0)

  const visibleNames = computed(() => {
    if (filter.value === 'used') {
      return styleNames.value.filter(name => usedNames.value.has(name))
    }
    return styleNames.value
  })

  function getDb(): AcDbDatabase | undefined {
    try {
      return AcApDocManager.instance.curDocument.database
    } catch {
      return undefined
    }
  }

  function reload() {
    const db = getDb()
    if (!db) {
      styleNames.value = []
      usedNames.value = new Set()
      currentName.value = DEFAULT_MLEADER_STYLE
      selected.value = ''
      return
    }

    // Ensure at least the current style exists so the manager is never empty.
    const preferred = db.cmleaderstyle || DEFAULT_MLEADER_STYLE
    if (!getMLeaderStyleByName(db, preferred)) {
      db.objects.mleaderStyle.setAt(preferred, createStandardMLeaderStyle(db))
    }

    styleNames.value = listMLeaderStyleNames(db)
    usedNames.value = collectUsedMLeaderStyleNames(db)
    currentName.value = preferred
    ensureSelectedVisible()
  }

  function ensureSelectedVisible() {
    const names =
      filter.value === 'used'
        ? styleNames.value.filter(name => usedNames.value.has(name))
        : styleNames.value
    if (selected.value && names.includes(selected.value)) return
    selected.value =
      names.find(
        name => name.toUpperCase() === currentName.value.toUpperCase()
      ) ||
      names[0] ||
      styleNames.value[0] ||
      ''
  }

  function loadSelectedIntoForm() {
    const db = getDb()
    if (!db || !selected.value) {
      replaceForm(createDefaultMLeaderStyleForm())
      previewRevision.value++
      return
    }
    const style = getMLeaderStyleByName(db, selected.value)
    if (!style) {
      replaceForm(createDefaultMLeaderStyleForm())
      previewRevision.value++
      return
    }
    replaceForm(readMLeaderStyleForm(db, style))
    previewRevision.value++
  }

  function replaceForm(next: MLeaderStyleFormState) {
    Object.assign(form, next)
  }

  function setCurrent() {
    const db = getDb()
    if (!db || !selected.value) return
    db.cmleaderstyle = selected.value
    currentName.value = selected.value
  }

  function canDelete(name: string): boolean {
    if (!name) return false
    if (name.toUpperCase() === DEFAULT_MLEADER_STYLE.toUpperCase()) return false
    if (usedNames.value.has(name)) return false
    if (name.toUpperCase() === currentName.value.toUpperCase()) return false
    return true
  }

  function deleteSelected(): boolean {
    const db = getDb()
    if (!db || !selected.value || !canDelete(selected.value)) return false
    db.objects.mleaderStyle.remove(selected.value)
    reload()
    return true
  }

  function createStyle(name: string, startWith: string): boolean {
    const db = getDb()
    const trimmed = name.trim()
    if (!db || !trimmed) return false
    if (getMLeaderStyleByName(db, trimmed)) return false

    const source =
      getMLeaderStyleByName(db, startWith) ||
      getMLeaderStyleByName(db, currentName.value) ||
      new AcDbMLeaderStyle()
    const created = new AcDbMLeaderStyle()
    copyMLeaderStyle(db, source, created)
    db.objects.mleaderStyle.setAt(trimmed, created)
    reload()
    selected.value = trimmed
    loadSelectedIntoForm()
    return true
  }

  function applyFormToSelected(): boolean {
    const db = getDb()
    if (!db || !selected.value) return false
    const style = getMLeaderStyleByName(db, selected.value)
    if (!style) return false
    writeMLeaderStyleForm(db, style, form)
    previewRevision.value++
    return true
  }

  function bumpPreview() {
    previewRevision.value++
  }

  watch(filter, () => {
    ensureSelectedVisible()
  })

  function previewStyle(): AcDbMLeaderStyle | undefined {
    const db = getDb()
    if (!db) return undefined
    return buildPreviewMLeaderStyle(db, form)
  }

  function canvasBackgroundRgb(): number | undefined {
    try {
      return AcApDocManager.instance.curView.backgroundColor
    } catch {
      return undefined
    }
  }

  function listTextStyleNames(): string[] {
    const db = getDb()
    if (!db) return ['Standard']
    const names: string[] = []
    const seen = new Set<string>()
    for (const record of db.tables.textStyleTable.newIterator()) {
      const name = record.name ?? record.textStyle?.name
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      names.push(trimmed)
    }
    return names.length > 0 ? names : ['Standard']
  }

  function listBlockNames(): string[] {
    const db = getDb()
    if (!db) return []
    const names: string[] = []
    for (const record of db.tables.blockTable.newIterator()) {
      const name = record.name?.trim()
      if (!name || name.startsWith('*')) continue
      names.push(name)
    }
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return names
  }

  return {
    styleNames,
    usedNames,
    currentName,
    selected,
    filter,
    form,
    previewRevision,
    visibleNames,
    reload,
    loadSelectedIntoForm,
    setCurrent,
    canDelete,
    deleteSelected,
    createStyle,
    applyFormToSelected,
    bumpPreview,
    previewStyle,
    canvasBackgroundRgb,
    listTextStyleNames,
    listBlockNames,
    getDb
  }
}
