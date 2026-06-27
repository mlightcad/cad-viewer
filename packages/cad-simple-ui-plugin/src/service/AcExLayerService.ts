import {
  AcApDocManager,
  acapRunDatabaseEdit,
  AcDbDocumentEventArgs
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcDbDatabase,
  AcDbLayerEventArgs,
  AcDbLayerModifiedEventArgs,
  AcDbLayerTableRecord,
  AcDbSysVarEventArgs,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import type { AcExLayerInfo } from '../config/types'
import { openLayerForWrite, setLayerFrozenState } from './layerEdit'

/** Undo label passed to {@link acapRunDatabaseEdit} for layer mutations. */
const LAYER_EDIT_LABEL = 'Layer'

/**
 * Observes the active document's layer table and exposes UI-friendly layer snapshots.
 *
 * Subscribers receive notifications when layers are added, modified, or when
 * `CLAYER` changes. Layer on/off and color edits run inside database transactions.
 */
export class AcExLayerService {
  /** Cached layer rows for the layer manager table. */
  private layers: AcExLayerInfo[] = []
  /** Name of the current drawing layer (`CLAYER`). */
  private currentLayerName = ''
  /** Database currently bound to layer table events. */
  private observedDatabase: AcDbDatabase | undefined
  /** UI refresh callbacks registered via {@link subscribe}. */
  private listeners = new Set<() => void>()
  /** Document manager used to resolve the active database. */
  private readonly editor: AcApDocManager

  /**
   * @param editor - Document manager instance; defaults to {@link AcApDocManager.instance}.
   */
  constructor(editor: AcApDocManager = AcApDocManager.instance) {
    this.editor = editor
    this.editor.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this.handleSysVarChanged
    )
    this.bindDatabase(this.getCurrentDatabase())
  }

  /** Removes event listeners and clears subscribers. */
  destroy() {
    this.editor.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this.handleSysVarChanged
    )
    this.bindDatabase(undefined)
    this.listeners.clear()
  }

  /**
   * Registers a listener invoked whenever layer data changes.
   *
   * @param listener - Callback to invoke on layer or current-layer updates.
   * @returns Unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Returns a shallow copy of the cached layer list.
   */
  getLayers(): AcExLayerInfo[] {
    return [...this.layers]
  }

  /**
   * Returns the name of the current layer (`CLAYER`).
   */
  getCurrentLayerName(): string {
    return this.currentLayerName
  }

  /**
   * Turns a layer on or off.
   *
   * When turning off the current layer, switches `CLAYER` to another layer first.
   *
   * @param layerName - Target layer name.
   * @param isOn - Desired on state.
   * @returns `true` when the edit succeeded.
   */
  setLayerOn(layerName: string, isOn: boolean): boolean {
    const db = this.getCurrentDatabase()
    if (!db || !layerName) return false
    if (!db.tables.layerTable.getAt(layerName)) return false

    return this.runLayerEdit(db, () => {
      if (!isOn && !this.switchCurrentLayerIfNeeded(db, layerName)) {
        return false
      }

      const layer = openLayerForWrite(db, layerName)
      if (!layer) return false

      layer.isOff = !isOn
      return true
    })
  }

  /**
   * Turns on every layer in the active database.
   *
   * @returns `true` when at least one layer was changed.
   */
  setAllLayersOn(): boolean {
    const db = this.getCurrentDatabase()
    if (!db) return false

    return this.runLayerEdit(db, () => {
      let changed = false
      for (const layer of db.tables.layerTable.newIterator()) {
        if (!layer.isOff) continue
        const opened = openLayerForWrite(db, layer.name)
        if (!opened) continue
        opened.isOff = false
        changed = true
      }
      return changed
    })
  }

  /**
   * Turns off every layer except the current layer (`CLAYER`).
   *
   * CAD requires at least one layer to remain on; this is the maximal "all off"
   * state the layer manager master checkbox can apply.
   *
   * @returns `true` when at least one layer was changed.
   */
  setAllLayersOffExceptCurrent(): boolean {
    const db = this.getCurrentDatabase()
    if (!db) return false

    return this.runLayerEdit(db, () => {
      const currentLayer = db.clayer
      let changed = false
      for (const layer of db.tables.layerTable.newIterator()) {
        if (layer.name === currentLayer || layer.isOff) continue
        const opened = openLayerForWrite(db, layer.name)
        if (!opened) continue
        opened.isOff = true
        changed = true
      }
      return changed
    })
  }

  /**
   * Assigns a new color to a layer.
   *
   * @param layerName - Target layer name.
   * @param color - New layer color (cloned before assignment).
   * @returns `true` when the edit succeeded.
   */
  setLayerColor(layerName: string, color: AcCmColor): boolean {
    const db = this.getCurrentDatabase()
    if (!db) return false
    if (!db.tables.layerTable.getAt(layerName)) return false

    return this.runLayerEdit(db, () => {
      const layer = openLayerForWrite(db, layerName)
      if (!layer) return false
      layer.color = color.clone()
      return true
    })
  }

  /** Returns the database of the currently active document, if any. */
  private getCurrentDatabase(): AcDbDatabase | undefined {
    return this.editor.curDocument?.database
  }

  /**
   * Runs a layer mutation inside an undoable database edit.
   *
   * @param db - Database to edit.
   * @param fn - Mutation callback returning whether a change occurred.
   */
  private runLayerEdit(
    db: AcDbDatabase | undefined,
    fn: () => boolean
  ): boolean {
    if (!db) return false
    let result = false
    acapRunDatabaseEdit(db, LAYER_EDIT_LABEL, () => {
      result = fn()
    })
    return result
  }

  /**
   * Moves `CLAYER` away from `targetLayerName` before that layer can be turned off.
   *
   * @param db - Active database.
   * @param targetLayerName - Layer about to be turned off.
   * @returns `false` when no alternate current layer is available.
   */
  private switchCurrentLayerIfNeeded(
    db: AcDbDatabase,
    targetLayerName: string
  ): boolean {
    if (db.clayer !== targetLayerName) return true

    let fallbackLayerName: string | undefined
    let preferredLayerName: string | undefined

    for (const layer of db.tables.layerTable.newIterator()) {
      if (layer.name === targetLayerName) continue
      fallbackLayerName ??= layer.name
      if (!layer.isOff && !layer.isFrozen) {
        preferredLayerName = layer.name
        break
      }
    }

    const nextLayerName = preferredLayerName ?? fallbackLayerName
    if (!nextLayerName) return false

    const nextCurrentLayer = openLayerForWrite(db, nextLayerName)
    if (!nextCurrentLayer) return false

    nextCurrentLayer.isOff = false
    setLayerFrozenState(nextCurrentLayer, false)
    db.clayer = nextCurrentLayer.name
    this.syncCurrentLayerName(db)
    return true
  }

  /**
   * Converts a layer table record to a UI layer info snapshot.
   *
   * @param layer - Source layer record.
   */
  private toLayerInfo(layer: AcDbLayerTableRecord): AcExLayerInfo {
    return {
      name: layer.name,
      color: layer.color.toString(),
      cssColor: layer.color.cssColor || '#FFFFFF',
      isOn: !layer.isOff
    }
  }

  /**
   * Rebuilds the cached layer list from a database.
   *
   * @param db - Database to read, or omit to clear the cache.
   */
  private reset(db?: AcDbDatabase) {
    this.layers = []
    if (!db) return

    for (const layer of db.tables.layerTable.newIterator()) {
      this.layers.push(this.toLayerInfo(layer))
    }
    this.notify()
  }

  /**
   * Finds a cached layer row by name.
   *
   * @param name - Layer name.
   */
  private findLayerInfo(name: string) {
    return this.layers.find(layer => layer.name === name)
  }

  /**
   * Removes a layer row from the cache by name.
   *
   * @param name - Layer name to remove.
   */
  private removeLayerInfo(name: string) {
    const index = this.layers.findIndex(layer => layer.name === name)
    if (index === -1) return
    this.layers.splice(index, 1)
    this.notify()
  }

  /**
   * Inserts or updates a layer row in the cache from a table record.
   *
   * @param layer - Layer record to reflect in the cache.
   */
  private upsertLayerInfo(layer: AcDbLayerTableRecord) {
    const info = this.findLayerInfo(layer.name)
    const nextInfo = this.toLayerInfo(layer)
    if (!info) {
      this.layers.push(nextInfo)
    } else {
      Object.assign(info, nextInfo)
    }
    this.notify()
  }

  /**
   * Updates {@link currentLayerName} from `db.clayer` and notifies subscribers.
   *
   * @param db - Database to read; defaults to the current database.
   */
  private syncCurrentLayerName(db = this.getCurrentDatabase()) {
    this.currentLayerName = db?.clayer || ''
    this.notify()
  }

  /** Invokes all registered subscribers. */
  private notify() {
    this.listeners.forEach(listener => listener())
  }

  /** Handles `layerAppended` on the observed database. */
  private handleLayerAppended = (args: AcDbLayerEventArgs) => {
    this.upsertLayerInfo(args.layer)
  }

  /** Handles `layerErased` on the observed database. */
  private handleLayerErased = (args: AcDbLayerEventArgs) => {
    this.removeLayerInfo(args.layer.name)
  }

  /** Handles `layerModified` on the observed database. */
  private handleLayerModified = (args: AcDbLayerModifiedEventArgs) => {
    const info = this.findLayerInfo(args.layer.name)
    if (!info) {
      this.upsertLayerInfo(args.layer)
      return
    }
    Object.assign(info, this.toLayerInfo(args.layer))
    this.notify()
  }

  /**
   * Switches layer table event bindings to a new database.
   *
   * @param db - Database to observe, or `undefined` to detach.
   */
  private bindDatabase(db?: AcDbDatabase) {
    if (this.observedDatabase === db) return

    if (this.observedDatabase) {
      this.observedDatabase.events.layerAppended.removeEventListener(
        this.handleLayerAppended
      )
      this.observedDatabase.events.layerErased.removeEventListener(
        this.handleLayerErased
      )
      this.observedDatabase.events.layerModified.removeEventListener(
        this.handleLayerModified
      )
    }

    this.observedDatabase = db
    this.reset(this.observedDatabase)
    this.syncCurrentLayerName(this.observedDatabase)

    if (!this.observedDatabase) return
    this.observedDatabase.events.layerAppended.addEventListener(
      this.handleLayerAppended
    )
    this.observedDatabase.events.layerErased.addEventListener(
      this.handleLayerErased
    )
    this.observedDatabase.events.layerModified.addEventListener(
      this.handleLayerModified
    )
  }

  /** Rebinds to the database of a newly activated document. */
  private handleDocumentActivated = (args: AcDbDocumentEventArgs) => {
    this.bindDatabase(args.doc.database)
  }

  /** Syncs current layer name when `CLAYER` changes on the observed database. */
  private handleSysVarChanged = (args: AcDbSysVarEventArgs) => {
    if (args.database !== this.observedDatabase) return
    if (args.name.toUpperCase() !== 'CLAYER') return
    this.syncCurrentLayerName(args.database)
  }
}
