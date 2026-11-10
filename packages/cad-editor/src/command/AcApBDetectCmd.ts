import {
  type AcApContext,
  acapConvertSmartBlockCluster,
  acapDetectSmartBlocksAsync,
  AcApDocManager,
  AcApEntityPreviewConvertor,
  AcApI18n,
  type AcApSmartBlockCluster,
  type AcApSmartBlockDetectOptions,
  AcApSmartBlockSearch,
  acapValidateNewBlockName,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import { type AcDbObjectId, AcDbText, AcGeBox2d } from '@mlightcad/data-model'
import { watch } from 'vue'

import { store } from '../app'
import {
  acuiBDetectGroups,
  acuiBeginBDetect,
  acuiEndBDetect,
  acuiNextBDetectAction,
  acuiRemoveBDetectGroups,
  acuiRequestBDetectClose,
  acuiSetBDetectError,
  acuiSetBDetectProgress,
  acuiSetBDetectReviewing,
  acuiSetBDetectSelected,
  acuiSetBDetectThumbnail,
  acuiShowBDetectGroups,
  type MlBDetectAction,
  type MlBDetectGroup
} from '../composable'
import { i18n } from '../locale'
import { AcApBSearchCmd } from './AcApBSearchCmd'

type DetectInput =
  | { kind: 'action'; action: MlBDetectAction }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'close' }

const THUMBNAIL_SIZE = 112

/**
 * `BDETECT` — Smart Blocks: Detect and Convert.
 *
 * Searches the whole drawing for groups of repeated objects, without a
 * selection, and lists them in the Detect and Convert tab of the tool
 * palette, which is shown while the command runs. Click a group (or
 * an object in the drawing) to highlight its instances, review a group with
 * the Search and Convert toolbar, or convert the checked groups into new
 * blocks at once; texts that differ between instances become attributes.
 *
 * AutoCAD's `BDETECT` sends the drawing to a cloud recognition model; this
 * one runs a local geometric search ({@link acapDetectSmartBlocksAsync}) and
 * finds any repeated group, not only trained object types. All conversions
 * of one run undo in one step.
 */
export class AcApBDetectCmd extends AcApBSearchCmd {
  /** Detection settings the command runs with. */
  protected detectOptions(): AcApSmartBlockDetectOptions {
    const search = this.initialOptions()
    return {
      allowRotation: search.allowRotation,
      allowMirror: search.allowMirror,
      allowScale: search.allowScale,
      matchLayer: search.matchLayer,
      textVariations: search.textVariations
    }
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const view = context.view
    const options = this.detectOptions()
    const signal = acuiBeginBDetect()
    let running = true
    const restorePalette = this.openPalette()
    try {
      let clusters: AcApSmartBlockCluster[]
      try {
        clusters = await acapDetectSmartBlocksAsync(db, options, {
          signal,
          onProgress: p => acuiSetBDetectProgress(p.fraction, p.groups)
        })
      } catch (error) {
        if (signal.aborted) return
        throw error
      }

      const byKey = new Map<number, AcApSmartBlockCluster>()
      const names = this.allocateNames(db, clusters.length)
      const groups = clusters.map((cluster, key): MlBDetectGroup => {
        byKey.set(key, cluster)
        return { key, ...this.describe(db, cluster), name: names[key] }
      })
      acuiShowBDetectGroups(groups)
      void this.captureThumbnails(byKey, () => running)

      const groupOf = (id: AcDbObjectId) => {
        for (const [key, cluster] of byKey) {
          if (clusterIds(cluster).includes(id)) return key
        }
        return -1
      }

      while (true) {
        const input = await this.waitForDetectInput()
        if (input.kind === 'close') return
        if (input.kind === 'point') {
          const key = view
            .pick({ x: input.x, y: input.y })
            .map(item => groupOf(item.id))
            .find(k => k >= 0)
          if (key !== undefined) this.selectGroup(context, byKey, key)
          continue
        }
        const action = input.action
        if (action.type === 'close') return
        if (action.type === 'select') {
          this.selectGroup(context, byKey, action.key)
        } else if (action.type === 'review') {
          await this.reviewGroup(context, byKey, action.key, options)
        } else if (action.type === 'convert') {
          this.convertChecked(context, byKey, options)
        }
      }
    } finally {
      running = false
      acuiEndBDetect()
      restorePalette()
      view.selectionSet.clear()
    }
  }

  /**
   * Shows the Detect and Convert tab in the tool palette. Closing the
   * palette ends the run.
   *
   * @returns Function that hides the tab again and restores the palette:
   * closed if it was closed, otherwise on its previous tab.
   */
  private openPalette(): () => void {
    const dialogs = store.dialogs
    const wasOpen = dialogs.layerManager
    const previousTab = dialogs.activePaletteTab
    dialogs.bdetectTabVisible = true
    dialogs.activePaletteTab = 'bdetect'
    dialogs.layerManager = true
    const stopWatching = watch(
      () => dialogs.layerManager,
      open => {
        if (!open) acuiRequestBDetectClose()
      }
    )
    return () => {
      stopWatching()
      dialogs.bdetectTabVisible = false
      if (!wasOpen) dialogs.layerManager = false
      else if (dialogs.activePaletteTab === 'bdetect') {
        dialogs.activePaletteTab = previousTab
      }
    }
  }

  /** Row data of a group. */
  private describe(
    db: AcApContext['doc']['database'],
    cluster: AcApSmartBlockCluster
  ) {
    const blockTable = db.tables.blockTable
    const layers = new Set<string>()
    for (const id of cluster.ids) {
      const layer = blockTable.getEntityById(id)?.layer
      if (layer) layers.add(layer)
    }
    // Texts that read differently in some instance become attributes.
    const hasVariableText = cluster.ids.some((id, i) => {
      const entity = blockTable.getEntityById(id)
      if (!(entity instanceof AcDbText)) return false
      return cluster.matches.some(
        m => m.texts[i] !== undefined && m.texts[i] !== entity.textString
      )
    })
    return {
      instanceCount: cluster.instanceCount,
      entityCount: cluster.entityCount,
      savings: cluster.savings,
      layers: [...layers].sort(),
      hasVariableText,
      checked: true
    }
  }

  /** `Block1`, `Block2`, ... names that are free and distinct. */
  private allocateNames(
    db: AcApContext['doc']['database'],
    count: number
  ): string[] {
    const names: string[] = []
    let index = 1
    while (names.length < count) {
      const name = `${this.blockNamePrefix}${index++}`
      if (!acapValidateNewBlockName(db, name)) names.push(name)
    }
    return names
  }

  /** Captures thumbnails one by one, yielding between them. */
  private async captureThumbnails(
    byKey: Map<number, AcApSmartBlockCluster>,
    running: () => boolean
  ) {
    const convertor = new AcApEntityPreviewConvertor()
    for (const [key, cluster] of byKey) {
      await new Promise(resolve => setTimeout(resolve, 0))
      if (!running() || !byKey.has(key)) continue
      try {
        const capture = convertor.capture(cluster.ids, THUMBNAIL_SIZE)
        if (capture.ok) acuiSetBDetectThumbnail(key, capture.dataUrl)
      } catch {
        // A missing thumbnail only leaves the placeholder.
      }
    }
  }

  /**
   * Waits for a palette action, a canvas click (selects the clicked object's
   * group) or Esc / Exit, whichever comes first.
   */
  private async waitForDetectInput(): Promise<DetectInput> {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptPointOptions(
      i18n.global.t('main.bdetect.pickPrompt')
    )
    prompt.allowNone = true
    const base = 'jig.bsearch.keywords.exit'
    prompt.keywords.add(
      AcApI18n.t(`${base}.display`),
      AcApI18n.t(`${base}.global`),
      AcApI18n.t(`${base}.local`)
    )

    const actionPromise = acuiNextBDetectAction()
    const pointPromise = editor.getPoint(prompt)
    const first = await Promise.race([
      actionPromise.then(action => ({ action })),
      pointPromise.then(result => ({ result }))
    ])
    if ('action' in first) {
      // The palette won: abort the canvas prompt before acting.
      editor.cancelActiveInput()
      await pointPromise.catch(() => undefined)
      return { kind: 'action', action: first.action }
    }
    const result = first.result
    if (result.status === AcEdPromptStatus.OK && result.value) {
      return { kind: 'point', x: result.value.x, y: result.value.y }
    }
    // Enter without a point keeps the palette open; Esc and Exit close it.
    if (result.status === AcEdPromptStatus.None)
      return this.waitForDetectInput()
    return { kind: 'close' }
  }

  /** Highlights every instance of a group and zooms to its representative. */
  private selectGroup(
    context: AcApContext,
    byKey: Map<number, AcApSmartBlockCluster>,
    key: number
  ) {
    const cluster = byKey.get(key)
    if (!cluster) return
    acuiSetBDetectSelected(key)
    const view = context.view
    view.selectionSet.clear()
    view.selectionSet.add(clusterIds(cluster))
    const box = new AcGeBox2d()
    const blockTable = context.doc.database.tables.blockTable
    for (const id of cluster.ids) {
      const ext = blockTable.getEntityById(id)?.geometricExtents
      if (!ext || ext.isEmpty()) continue
      box.expandByPoint(ext.min)
      box.expandByPoint(ext.max)
    }
    if (!box.isEmpty()) view.zoomTo(box, 4)
  }

  /**
   * Reviews one group with the Search and Convert toolbar and dialog.
   * Copies that belong to other groups start excluded, so converting this
   * group leaves the others intact.
   */
  private async reviewGroup(
    context: AcApContext,
    byKey: Map<number, AcApSmartBlockCluster>,
    key: number,
    options: AcApSmartBlockDetectOptions
  ) {
    const cluster = byKey.get(key)
    if (!cluster) return
    const db = context.doc.database
    const others = new Set<AcDbObjectId>()
    for (const [k, c] of byKey) {
      if (k !== key) clusterIds(c).forEach(id => others.add(id))
    }
    const search = new AcApSmartBlockSearch(db, cluster.ids, {
      ...this.initialOptions(),
      ...options
    })
    search.matches.forEach((match, i) => {
      if (match.ids.some(id => others.has(id))) search.setIncluded(i, false)
    })
    acuiSetBDetectReviewing(true)
    try {
      const convert = await this.review(context, search)
      if (!convert) return
      const result = this.convert(context, search, convert)
      this.notify(
        i18n.global.t('main.bdetect.summary', {
          groups: 1,
          count: result.references.length
        })
      )
      byKey.delete(key)
      acuiRemoveBDetectGroups([key])
      this.pruneGroups(context, byKey)
    } finally {
      search.dispose()
      context.view.selectionSet.clear()
      acuiSetBDetectReviewing(false)
    }
  }

  /** Converts every checked group into its own new block. */
  private convertChecked(
    context: AcApContext,
    byKey: Map<number, AcApSmartBlockCluster>,
    options: AcApSmartBlockDetectOptions
  ) {
    const db = context.doc.database
    const groups = acuiBDetectGroups().filter(g => g.checked)
    if (groups.length === 0) return
    const t = i18n.global.t
    let valid = true
    const used = new Set<string>()
    for (const group of groups) {
      const name = group.name.trim()
      const reason = acapValidateNewBlockName(db, name)
      let message: string | undefined
      if (reason === 'empty') message = t('dialog.bconvertDlg.error.nameEmpty')
      else if (reason === 'invalid') {
        message = t('dialog.bconvertDlg.error.nameInvalid', { name })
      } else if (reason === 'exists') {
        message = t('dialog.bconvertDlg.error.nameExists', { name })
      } else if (used.has(name.toUpperCase())) {
        message = t('main.bdetect.nameDuplicate', { name })
      }
      used.add(name.toUpperCase())
      acuiSetBDetectError(group.key, message)
      if (message) valid = false
    }
    if (!valid) return

    let references = 0
    const converted: number[] = []
    for (const group of groups) {
      const cluster = byKey.get(group.key)
      if (!cluster) continue
      const result = acapConvertSmartBlockCluster(db, cluster, {
        name: group.name.trim(),
        matchLayer: options.matchLayer
      })
      references += result.references.length
      converted.push(group.key)
      byKey.delete(group.key)
    }
    context.view.selectionSet.clear()
    acuiRemoveBDetectGroups(converted)
    this.notify(
      t('main.bdetect.summary', { groups: converted.length, count: references })
    )
  }

  /**
   * Drops instances whose objects are gone (a review may have converted
   * copies another group also listed) and groups left too small.
   */
  private pruneGroups(
    context: AcApContext,
    byKey: Map<number, AcApSmartBlockCluster>
  ) {
    const blockTable = context.doc.database.tables.blockTable
    const alive = (ids: AcDbObjectId[]) =>
      ids.every(id => blockTable.getEntityById(id) !== undefined)
    const removed: number[] = []
    for (const [key, cluster] of byKey) {
      const matches = cluster.matches.filter(m => alive(m.ids))
      if (!alive(cluster.ids) || matches.length === 0) {
        byKey.delete(key)
        removed.push(key)
        continue
      }
      if (matches.length === cluster.matches.length) continue
      cluster.matches = matches
      cluster.instanceCount = matches.length + 1
      cluster.savings = cluster.instanceCount * (cluster.entityCount - 1)
      const group = acuiBDetectGroups().find(g => g.key === key)
      if (group) {
        group.instanceCount = cluster.instanceCount
        group.savings = cluster.savings
      }
    }
    acuiRemoveBDetectGroups(removed)
  }
}

function clusterIds(cluster: AcApSmartBlockCluster): AcDbObjectId[] {
  return [...cluster.ids, ...cluster.matches.flatMap(m => m.ids)]
}
