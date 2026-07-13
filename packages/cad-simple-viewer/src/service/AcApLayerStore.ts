import {
  AcCmColor,
  AcCmEventManager,
  AcDbDatabase,
  AcDbLayerEventArgs,
  AcDbLayerModifiedEventArgs,
  AcDbLayerTableRecord,
  AcDbSysVarEventArgs,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import type { AcApDocument } from '../app/AcApDocument'
import { AcApLayerService } from './AcApLayerService'

/** Snapshot of a layer row for UI layer managers and similar consumers. */
export interface AcApLayerInfo {
  /** Layer table record name. */
  name: string
  /** Serialized {@link AcCmColor} string. */
  color: string
  /** CSS color derived from the layer color for swatch display. */
  cssColor: string
  /** Whether the layer is on (not off). */
  isOn: boolean
  /** Whether the layer is frozen. */
  isFrozen: boolean
  /** Whether the layer is locked. */
  isLocked: boolean
}

/** Event payload for {@link AcApLayerStore.events.changed}. */
export interface AcApLayerStoreChangedEventArgs {
  /** Shallow copy of cached layer rows. */
  layers: AcApLayerInfo[]
  /** Current layer name (`CLAYER`). */
  currentLayerName: string
}

/**
 * Observes one document's layer table and exposes UI-friendly layer snapshots.
 *
 * Obtain via {@link AcApDocument.layerStore}. Layer mutations delegate to
 * {@link AcApLayerService} on the same document.
 */
export class AcApLayerStore {
  /** Events fired when cached layer data changes. */
  public readonly events = {
    /** Fired when the cached layer list or current layer name changes. */
    changed: new AcCmEventManager<AcApLayerStoreChangedEventArgs>()
  }

  private layers: AcApLayerInfo[] = []
  private currentLayerName = ''
  private readonly document: AcApDocument
  private readonly database: AcDbDatabase

  /**
   * @param document - Owning document whose layer table is observed.
   */
  constructor(document: AcApDocument) {
    this.document = document
    this.database = document.database
    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this.handleSysVarChanged
    )
    this.bindDatabase()
  }

  /** Removes upstream event listeners and clears the cached layer data. */
  destroy() {
    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this.handleSysVarChanged
    )
    this.unbindDatabase()
    this.layers = []
    this.currentLayerName = ''
  }

  /**
   * Returns a shallow copy of cached layer rows.
   *
   * @returns Copy of the cached layer snapshots.
   */
  getLayers(): AcApLayerInfo[] {
    return [...this.layers]
  }

  /**
   * Returns the current layer name (`CLAYER`) for this document.
   *
   * @returns Current layer name, or an empty string when none is set.
   */
  getCurrentLayerName(): string {
    return this.currentLayerName
  }

  /**
   * Turns a layer on or off, switching `CLAYER` when turning off the current layer.
   *
   * @param layerName - Target layer name.
   * @param isOn - Desired visibility (`true` = on).
   * @returns `true` when the layer exists and was updated.
   */
  setLayerOn(layerName: string, isOn: boolean): boolean {
    return this.getLayerService().setLayerOn(layerName, isOn, {
      switchCurrentLayer: true
    })
  }

  /**
   * Turns on every layer in this document.
   *
   * @returns `true` when at least one layer was turned on.
   */
  setAllLayersOn(): boolean {
    return this.getLayerService().setAllLayersOn() > 0
  }

  /**
   * Turns off every layer except the current layer.
   *
   * @returns `true` when at least one layer was turned off.
   */
  setAllLayersOffExceptCurrent(): boolean {
    return this.getLayerService().setAllLayersOffExceptCurrent() > 0
  }

  /**
   * Assigns color to a layer in this document.
   *
   * @param layerName - Target layer name.
   * @param color - Color to assign.
   * @returns `true` when the layer exists and color was set.
   */
  setLayerColor(layerName: string, color: AcCmColor): boolean {
    return this.getLayerService().setLayerColor(layerName, color)
  }

  /**
   * Makes a layer current (`CLAYER`), ensuring it is on and thawed.
   *
   * @param layerName - Layer name to activate.
   * @returns `true` when the layer exists and was set current.
   */
  setCurrentLayer(layerName: string): boolean {
    return this.getLayerService().setCurrentLayer(layerName)
  }

  /**
   * Freezes or thaws a layer, switching `CLAYER` when freezing the current layer.
   *
   * @param layerName - Target layer name.
   * @param frozen - Desired frozen state.
   * @returns `true` when the layer exists and was updated.
   */
  setLayerFrozen(layerName: string, frozen: boolean): boolean {
    return this.getLayerService().setLayerFrozen(layerName, frozen, {
      switchCurrentLayer: true
    })
  }

  /**
   * Locks or unlocks a layer in this document.
   *
   * @param layerName - Target layer name.
   * @param locked - Desired locked state.
   * @returns `true` when the layer exists and was updated.
   */
  setLayerLocked(layerName: string, locked: boolean): boolean {
    return this.getLayerService().setLayerLocked(layerName, locked)
  }

  /**
   * Assigns line weight to a layer in this document.
   *
   * @param layerName - Target layer name.
   * @param lineWeight - Line weight to assign.
   * @returns `true` when the layer exists and line weight was set.
   */
  setLayerLineWeight(layerName: string, lineWeight: number): boolean {
    return this.getLayerService().setLayerLineWeight(layerName, lineWeight)
  }

  /**
   * Keeps one layer visible and turns all others off (UI quick-isolate).
   *
   * @param layerName - Layer to keep visible.
   * @returns `true` when the layer exists and isolation was applied.
   */
  isolateSingleLayer(layerName: string): boolean {
    return this.getLayerService().isolateSingleLayer(layerName)
  }

  /**
   * Returns the layer service for this document.
   */
  getLayerService(): AcApLayerService {
    return this.document.layerService
  }

  /**
   * Maps a layer table record to a UI-friendly snapshot row.
   *
   * @param layer - Layer table record to convert.
   * @returns Snapshot suitable for layer manager UI.
   */
  private toLayerInfo(layer: AcDbLayerTableRecord): AcApLayerInfo {
    return {
      name: layer.name,
      color: layer.color.toString(),
      cssColor: layer.color.cssColor || '#FFFFFF',
      isOn: !layer.isOff,
      isFrozen: layer.isFrozen,
      isLocked: AcApLayerService.isLayerLocked(layer)
    }
  }

  /**
   * Rebuilds the cached layer list from the document database.
   */
  private rebuildLayerCache() {
    this.layers = []

    for (const layer of this.database.tables.layerTable.newIterator()) {
      this.layers.push(this.toLayerInfo(layer))
    }
  }

  /**
   * Finds a cached layer row by name.
   *
   * @param name - Layer name to look up.
   * @returns Matching snapshot, or `undefined` when not cached.
   */
  private findLayerInfo(name: string) {
    return this.layers.find(layer => layer.name === name)
  }

  /**
   * Removes a layer from the cache and notifies listeners.
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
   * Inserts or updates a cached layer row and notifies listeners.
   *
   * @param layer - Layer table record whose snapshot should be stored.
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
   * Refreshes the cached current layer name from `CLAYER`.
   *
   * @param notify - When `true`, dispatches {@link AcApLayerStore.events.changed}
   *   if the name changed.
   */
  private syncCurrentLayerName(notify = true) {
    const nextName = this.database.clayer || ''
    if (this.currentLayerName === nextName) return
    this.currentLayerName = nextName
    if (notify) this.notify()
  }

  /** Dispatches {@link AcApLayerStore.events.changed}. */
  private notify() {
    this.events.changed.dispatch({
      layers: this.getLayers(),
      currentLayerName: this.currentLayerName
    })
  }

  /**
   * Handles `layerAppended` events by upserting the new layer into the cache.
   *
   * @param args - Event payload containing the appended layer record.
   */
  private handleLayerAppended = (args: AcDbLayerEventArgs) => {
    this.upsertLayerInfo(args.layer)
  }

  /**
   * Handles `layerErased` events by removing the layer from the cache.
   *
   * @param args - Event payload containing the erased layer record.
   */
  private handleLayerErased = (args: AcDbLayerEventArgs) => {
    this.removeLayerInfo(args.layer.name)
  }

  /**
   * Handles `layerModified` events by refreshing the affected cached row.
   *
   * @param args - Event payload containing the modified layer record.
   */
  private handleLayerModified = (args: AcDbLayerModifiedEventArgs) => {
    const info = this.findLayerInfo(args.layer.name)
    if (!info) {
      this.upsertLayerInfo(args.layer)
      return
    }
    Object.assign(info, this.toLayerInfo(args.layer))
    this.notify()
  }

  /** Wires layer-table event listeners and rebuilds the cache. */
  private bindDatabase() {
    this.rebuildLayerCache()
    this.currentLayerName = this.database.clayer || ''
    this.notify()

    this.database.events.layerAppended.addEventListener(
      this.handleLayerAppended
    )
    this.database.events.layerErased.addEventListener(this.handleLayerErased)
    this.database.events.layerModified.addEventListener(
      this.handleLayerModified
    )
  }

  /** Detaches layer-table event listeners. */
  private unbindDatabase() {
    this.database.events.layerAppended.removeEventListener(
      this.handleLayerAppended
    )
    this.database.events.layerErased.removeEventListener(this.handleLayerErased)
    this.database.events.layerModified.removeEventListener(
      this.handleLayerModified
    )
  }

  /**
   * Handles system-variable changes and refreshes `CLAYER` when it changes.
   *
   * @param args - Event payload containing the changed system variable.
   */
  private handleSysVarChanged = (args: AcDbSysVarEventArgs) => {
    if (args.database !== this.database) return
    if (args.name.toUpperCase() !== 'CLAYER') return
    this.syncCurrentLayerName()
  }
}
