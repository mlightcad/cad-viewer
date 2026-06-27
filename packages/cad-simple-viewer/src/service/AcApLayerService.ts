import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbEntity,
  AcDbLayerTableRecord,
  AcDbObjectId
} from '@mlightcad/data-model'

import type { AcApLayerPreviousSnapshot } from '../app/AcApLayerSessionState'
import {
  AcApLayerIsoLayerSnapshot,
  AcApLayerIsoSnapshot,
  getLayerIsoState,
  isSameLayerIsoState
} from './AcApLayerIsoState'
import { acapRunServiceEdit, LAYER_EDIT_LABEL } from './AcApServiceEdit'
import {
  AcApDeleteLayerResult,
  AcApLaydelEntitySnapshot,
  AcApLayerByEntityResult,
  AcApLayerIsolateResult,
  AcApLayerIsolationMode,
  AcApSetLayerOnOptions,
  AcApSetLayersVisibilityOptions,
  LAYER_FROZEN_FLAG,
  LAYER_LOCKED_FLAG
} from './types'

/** Summary row for layer listing commands and UI. */
export interface AcApLayerSummary {
  /** Layer name. */
  name: string
  /** `*` when this layer is the current layer (`CLAYER`). */
  current: string
  /** `Yes` or `No` visibility indicator. */
  on: string
  /** `Yes` or `No` frozen indicator. */
  frozen: string
  /** `Yes` or `No` locked indicator. */
  locked: string
  /** String representation of the layer color. */
  color: string
}

/** Result of creating layers via the LAYER command New branch. */
export interface AcApCreateLayersResult {
  /** Number of layers created. */
  created: number
  /** Names that already existed and were skipped. */
  existed: string[]
}

/** Result of resolving layer names to table records. */
export interface AcApResolveLayersResult {
  /** Resolved layer table records. */
  layers: AcDbLayerTableRecord[]
  /** Names that were not found in the layer table. */
  missing: string[]
}

/**
 * Result of isolating layers, including the snapshot for `LAYUNISO`.
 */
export interface AcApLayerIsolateLayersResult extends AcApLayerIsolateResult {
  /** Snapshot to store on the owning document for `LAYUNISO`. */
  isoSnapshot: AcApLayerIsoSnapshot
}

/**
 * Centralizes layer table mutations for commands and UI consumers.
 *
 * Wraps on/off, freeze/thaw, lock/unlock, color, isolation (`LAYISO`/`LAYUNISO`),
 * deletion (`LAYDEL`), and related operations with consistent undo handling.
 * Document-scoped session state (`LAYERP`, `LAYUNISO` snapshots) lives on
 * {@link AcApDocument}.
 */
export class AcApLayerService {
  private readonly db: AcDbDatabase

  /**
   * Creates a layer service bound to a database.
   *
   * @param db - Database whose layer table will be mutated.
   */
  constructor(db: AcDbDatabase) {
    this.db = db
  }

  /** Opens an existing layer table record for write.
   *
   * @param db - Database containing the layer table.
   * @param layerOrName - Layer record or name to open.
   * @returns Opened layer record, or `undefined` when not found.
   */
  static openLayerForWrite(
    db: AcDbDatabase,
    layerOrName: AcDbLayerTableRecord | string
  ): AcDbLayerTableRecord | undefined {
    const layer =
      typeof layerOrName === 'string'
        ? db.tables.layerTable.getAt(layerOrName)
        : layerOrName
    if (!layer) return undefined
    return db.openObjectForWrite<AcDbLayerTableRecord>(layer.objectId)
  }

  /** Sets or clears the frozen bit on a layer record.
   *
   * @param layer - Layer record to modify.
   * @param frozen - Desired frozen state.
   */
  static setLayerFrozenState(
    layer: AcDbLayerTableRecord,
    frozen: boolean
  ): void {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = frozen
      ? flags | LAYER_FROZEN_FLAG
      : flags & ~LAYER_FROZEN_FLAG
  }

  /** Sets or clears the locked bit on a layer record.
   *
   * @param layer - Layer record to modify.
   * @param locked - Desired locked state.
   */
  static setLayerLockedState(
    layer: AcDbLayerTableRecord,
    locked: boolean
  ): void {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = locked
      ? flags | LAYER_LOCKED_FLAG
      : flags & ~LAYER_LOCKED_FLAG
  }

  /** Returns whether a layer is locked according to its standard flags.
   *
   * @param layer - Layer record to inspect.
   * @returns `true` when the locked bit is set.
   */
  static isLayerLocked(layer: AcDbLayerTableRecord): boolean {
    return ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
  }

  /**
   * Applies a captured `LAYERP` snapshot to a database.
   *
   * @param db - Database whose layer table should be updated.
   * @param snapshot - Snapshot previously captured on the owning document.
   * @returns `true` when the snapshot's current layer still exists.
   */
  static applyLayerPreviousSnapshot(
    db: AcDbDatabase,
    snapshot: AcApLayerPreviousSnapshot
  ): boolean {
    snapshot.states.forEach(state => {
      const layer = AcApLayerService.openLayerForWrite(db, state.name)
      if (!layer) return

      layer.isOff = !state.isOn
      AcApLayerService.setLayerFrozenState(layer, state.isFrozen)
      AcApLayerService.setLayerLockedState(layer, state.isLocked)
    })

    const currentLayer = AcApLayerService.openLayerForWrite(db, snapshot.clayer)
    if (!currentLayer) return false

    currentLayer.isOff = false
    AcApLayerService.setLayerFrozenState(currentLayer, false)
    db.clayer = currentLayer.name
    return true
  }

  /**
   * Parses layer name input supporting `*` and comma-separated names.
   *
   * @param input - Raw user input (e.g. `A,B` or `*`).
   * @returns Deduplicated list of layer names.
   */
  parseLayerNameInput(input: string): string[] {
    const allNames = [...this.db.tables.layerTable.newIterator()].map(
      layer => layer.name
    )
    const raw = input.trim()
    if (!raw) return []
    if (raw === '*') return [...allNames]
    const names = raw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
    return [...new Set(names)]
  }

  /**
   * Resolves layer records by name.
   *
   * @param names - Layer names to look up.
   * @returns Resolved records and names that were not found.
   */
  resolveLayers(names: string[]): AcApResolveLayersResult {
    const table = this.db.tables.layerTable
    const layers: AcDbLayerTableRecord[] = []
    const missing: string[] = []
    names.forEach(name => {
      const layer = table.getAt(name)
      if (layer) layers.push(layer)
      else missing.push(name)
    })
    return { layers, missing }
  }

  /**
   * Returns summary rows for all layers.
   *
   * @returns Display-oriented summary for each layer in the table.
   */
  getLayerSummaries(): AcApLayerSummary[] {
    return [...this.db.tables.layerTable.newIterator()].map(layer => ({
      name: layer.name,
      current: this.db.clayer === layer.name ? '*' : '',
      on: layer.isOff ? 'No' : 'Yes',
      frozen: layer.isFrozen ? 'Yes' : 'No',
      locked: AcApLayerService.isLayerLocked(layer) ? 'Yes' : 'No',
      color: layer.color.toString()
    }))
  }

  /**
   * Creates missing layers.
   *
   * @param names - Layer names to create.
   * @returns Count of created layers and names that already existed.
   */
  createLayers(names: string[]): AcApCreateLayersResult {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const table = this.db.tables.layerTable
      let created = 0
      const existed: string[] = []

      names.forEach(name => {
        if (table.has(name)) {
          existed.push(name)
          return
        }
        table.add(
          new AcDbLayerTableRecord({
            name,
            isOff: false,
            isPlottable: true,
            color: new AcCmColor(AcCmColorMethod.ByACI, 7),
            linetype: 'Continuous'
          })
        )
        created++
      })

      return { created, existed }
    })
  }

  /**
   * Sets current layer (`CLAYER`), ensuring it is on and thawed.
   *
   * @param name - Layer name to make current.
   * @returns `true` when the layer exists and was set current.
   */
  setCurrentLayer(name: string): boolean {
    const layer = this.db.tables.layerTable.getAt(name)
    if (!layer) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return false

      opened.isOff = false
      AcApLayerService.setLayerFrozenState(opened, false)
      this.db.clayer = opened.name
      return true
    })
  }

  /**
   * Creates a layer if missing, then makes it current.
   *
   * @param name - Layer name to create or activate.
   * @returns `true` when the layer is current after the operation.
   */
  makeLayer(name: string): boolean {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const table = this.db.tables.layerTable
      let layer = table.getAt(name)
      if (!layer) {
        layer = new AcDbLayerTableRecord({
          name,
          isOff: false,
          isPlottable: true,
          color: new AcCmColor(AcCmColorMethod.ByACI, 7),
          linetype: 'Continuous'
        })
        table.add(layer)
      }

      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return false

      opened.isOff = false
      AcApLayerService.setLayerFrozenState(opened, false)
      this.db.clayer = opened.name
      return true
    })
  }

  /**
   * Turns a single layer on or off.
   *
   * When turning off the current layer, pass `{ switchCurrentLayer: true }`
   * (as {@link AcApLayerStore} does) to move `CLAYER` first. CLI commands leave
   * the default `false` and rely on batch helpers to skip the current layer.
   *
   * @param layerName - Target layer name.
   * @param isOn - Desired visibility (`true` = on).
   * @param options - Optional behavior when turning off the current layer.
   * @returns `true` when the layer exists and was updated.
   */
  setLayerOn(
    layerName: string,
    isOn: boolean,
    options: AcApSetLayerOnOptions = {}
  ): boolean {
    if (!layerName || !this.db.tables.layerTable.getAt(layerName)) {
      return false
    }

    const switchCurrentLayer = options.switchCurrentLayer ?? false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      if (
        !isOn &&
        switchCurrentLayer &&
        !this.switchCurrentLayerIfNeeded(layerName)
      ) {
        return false
      }

      const layer = AcApLayerService.openLayerForWrite(this.db, layerName)
      if (!layer) return false

      layer.isOff = !isOn
      return true
    })
  }

  /**
   * Freezes or thaws a single layer.
   *
   * UI callers should pass `{ switchCurrentLayer: true }` when freezing the
   * current layer so drawing continues on a visible, thawed layer.
   *
   * @param layerName - Target layer name.
   * @param frozen - Desired frozen state.
   * @param options - Optional behavior when freezing the current layer.
   * @returns `true` when the layer exists and was updated.
   */
  setLayerFrozen(
    layerName: string,
    frozen: boolean,
    options: AcApSetLayerOnOptions = {}
  ): boolean {
    if (!layerName || !this.db.tables.layerTable.getAt(layerName)) {
      return false
    }

    const switchCurrentLayer = options.switchCurrentLayer ?? false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      if (
        frozen &&
        switchCurrentLayer &&
        !this.switchCurrentLayerIfNeeded(layerName)
      ) {
        return false
      }

      const layer = AcApLayerService.openLayerForWrite(this.db, layerName)
      if (!layer) return false

      AcApLayerService.setLayerFrozenState(layer, frozen)
      return true
    })
  }

  /**
   * Locks or unlocks a single layer.
   *
   * @param layerName - Target layer name.
   * @param locked - Desired locked state.
   * @returns `true` when the layer exists and was updated.
   */
  setLayerLocked(layerName: string, locked: boolean): boolean {
    if (!layerName || !this.db.tables.layerTable.getAt(layerName)) {
      return false
    }

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const layer = AcApLayerService.openLayerForWrite(this.db, layerName)
      if (!layer) return false

      AcApLayerService.setLayerLockedState(layer, locked)
      return true
    })
  }

  /**
   * Assigns line weight to a single layer.
   *
   * @param layerName - Target layer name.
   * @param lineWeight - Line weight value to assign.
   * @returns `true` when the layer exists and line weight was set.
   */
  setLayerLineWeight(layerName: string, lineWeight: number): boolean {
    if (!this.db.tables.layerTable.getAt(layerName)) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const layer = AcApLayerService.openLayerForWrite(this.db, layerName)
      if (!layer) return false

      layer.lineWeight = lineWeight
      return true
    })
  }

  /**
   * Keeps one layer visible and turns all others off (UI quick-isolate).
   *
   * Does not capture a `LAYUNISO` snapshot; use {@link isolateLayers} for
   * command semantics.
   *
   * @param layerName - Layer to keep visible.
   * @returns `true` when the layer exists and isolation was applied.
   */
  isolateSingleLayer(layerName: string): boolean {
    if (!this.db.tables.layerTable.getAt(layerName)) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      for (const layer of this.db.tables.layerTable.newIterator()) {
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) continue

        const keepVisible = opened.name === layerName
        opened.isOff = !keepVisible
        if (keepVisible) {
          AcApLayerService.setLayerFrozenState(opened, false)
        }
      }

      this.db.clayer = layerName
      return true
    })
  }

  /**
   * Batch toggles layer visibility.
   *
   * @param names - Layer names to update.
   * @param off - `true` to turn layers off, `false` to turn them on.
   * @param options - Optional skip rules for the current layer.
   * @returns Names of current layers skipped when turning off.
   */
  setLayersVisibility(
    names: string[],
    off: boolean,
    options: AcApSetLayersVisibilityOptions = {}
  ): { skippedCurrent: string[] } {
    const skipCurrentLayer = options.skipCurrentLayer ?? true
    const { layers } = this.resolveLayers(names)
    const skippedCurrent: string[] = []

    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      layers.forEach(layer => {
        if (off && skipCurrentLayer && layer.name === this.db.clayer) {
          skippedCurrent.push(layer.name)
          return
        }
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) return
        opened.isOff = off
      })
    })

    return { skippedCurrent }
  }

  /**
   * Turns on every layer in the table.
   *
   * @returns Number of layers changed from off to on.
   */
  setAllLayersOn(): number {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      let turnedOn = 0
      for (const layer of this.db.tables.layerTable.newIterator()) {
        if (!layer.isOff) continue
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) continue
        opened.isOff = false
        turnedOn++
      }
      return turnedOn
    })
  }

  /**
   * Turns off every layer except the current layer.
   *
   * @returns Number of layers turned off.
   */
  setAllLayersOffExceptCurrent(): number {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const currentLayer = this.db.clayer
      let changed = 0
      for (const layer of this.db.tables.layerTable.newIterator()) {
        if (layer.name === currentLayer || layer.isOff) continue
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) continue
        opened.isOff = true
        changed++
      }
      return changed
    })
  }

  /**
   * Batch toggles frozen state.
   *
   * @param names - Layer names to update.
   * @param freeze - `true` to freeze, `false` to thaw.
   * @param options - Optional skip rules for the current layer.
   * @returns Names of current layers skipped when freezing.
   */
  setLayersFrozen(
    names: string[],
    freeze: boolean,
    options: AcApSetLayersVisibilityOptions = {}
  ): { skippedCurrent: string[] } {
    const skipCurrentLayer = options.skipCurrentLayer ?? true
    const { layers } = this.resolveLayers(names)
    const skippedCurrent: string[] = []

    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      layers.forEach(layer => {
        if (freeze && skipCurrentLayer && layer.name === this.db.clayer) {
          skippedCurrent.push(layer.name)
          return
        }
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) return
        AcApLayerService.setLayerFrozenState(opened, freeze)
      })
    })

    return { skippedCurrent }
  }

  /**
   * Thaws all frozen layers in the table.
   *
   * @returns Number of layers thawed.
   */
  thawAllLayers(): number {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      let thawed = 0
      for (const layer of this.db.tables.layerTable.newIterator()) {
        if (!layer.isFrozen) continue
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) continue
        AcApLayerService.setLayerFrozenState(opened, false)
        thawed++
      }
      return thawed
    })
  }

  /**
   * Batch toggles lock state.
   *
   * @param names - Layer names to update.
   * @param lock - `true` to lock, `false` to unlock.
   */
  setLayersLocked(names: string[], lock: boolean): void {
    const { layers } = this.resolveLayers(names)
    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      layers.forEach(layer => {
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) return
        AcApLayerService.setLayerLockedState(opened, lock)
      })
    })
  }

  /**
   * Parses color input for layer color assignment.
   *
   * Accepts ACI index (1–255) or color strings understood by {@link AcCmColor.fromString}.
   *
   * @param input - Raw color string from the user or UI.
   * @returns Parsed color, or `undefined` when invalid.
   */
  parseColorInput(input: string): AcCmColor | undefined {
    const value = input.trim()
    if (!value) return undefined
    if (/^\d+$/.test(value)) {
      const index = Number(value)
      if (index >= 1 && index <= 255) {
        return new AcCmColor(AcCmColorMethod.ByACI, index)
      }
      return undefined
    }

    const color = AcCmColor.fromString(value)
    if (!color) return undefined
    if (color.isByACI) {
      const index = color.colorIndex
      if (index == null || index < 1 || index > 255) {
        return undefined
      }
    }
    if (color.isByLayer || color.isByBlock) return undefined
    return color
  }

  /**
   * Assigns color to a single layer.
   *
   * @param layerName - Target layer name.
   * @param color - Color to assign.
   * @returns `true` when the layer exists and color was set.
   */
  setLayerColor(layerName: string, color: AcCmColor): boolean {
    if (!this.db.tables.layerTable.getAt(layerName)) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const layer = AcApLayerService.openLayerForWrite(this.db, layerName)
      if (!layer) return false
      layer.color = color.clone()
      return true
    })
  }

  /**
   * Assigns the same color to multiple layers.
   *
   * @param names - Layer names to update.
   * @param color - Color to assign to each resolved layer.
   */
  setLayersColor(names: string[], color: AcCmColor): void {
    const { layers } = this.resolveLayers(names)
    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      layers.forEach(layer => {
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) return
        opened.color = color.clone()
      })
    })
  }

  /**
   * Updates a layer description.
   *
   * @param name - Target layer name.
   * @param description - New description text.
   * @returns `true` when the layer exists and description was set.
   */
  setLayerDescription(name: string, description: string): boolean {
    const layer = this.db.tables.layerTable.getAt(name)
    if (!layer) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return false
      opened.description = description
      return true
    })
  }

  /**
   * Moves `CLAYER` away from a layer before turning it off or freezing it.
   *
   * @param targetLayerName - Layer that will be turned off or frozen.
   * @returns `true` when `CLAYER` is no longer the target layer, or target was not current.
   */
  switchCurrentLayerIfNeeded(targetLayerName: string): boolean {
    if (this.db.clayer !== targetLayerName) return true

    let fallbackLayerName: string | undefined
    let preferredLayerName: string | undefined

    for (const layer of this.db.tables.layerTable.newIterator()) {
      if (layer.name === targetLayerName) continue
      fallbackLayerName ??= layer.name
      if (!layer.isOff && !layer.isFrozen) {
        preferredLayerName = layer.name
        break
      }
    }

    const nextLayerName = preferredLayerName ?? fallbackLayerName
    if (!nextLayerName) return false

    const nextCurrentLayer = AcApLayerService.openLayerForWrite(
      this.db,
      nextLayerName
    )
    if (!nextCurrentLayer) return false

    nextCurrentLayer.isOff = false
    AcApLayerService.setLayerFrozenState(nextCurrentLayer, false)
    this.db.clayer = nextCurrentLayer.name
    return true
  }

  /**
   * Resolves the layer name of an entity.
   *
   * @param objectId - Entity object id.
   * @returns Trimmed layer name, or `undefined` when the entity is missing.
   */
  getLayerNameFromEntity(objectId: AcDbObjectId): string | undefined {
    const entity = this.db.tables.blockTable.getEntityById(objectId)
    return entity?.layer?.trim() || undefined
  }

  /**
   * Collects distinct layer names from a set of entity ids.
   *
   * @param objectIds - Entity ids to inspect.
   * @returns Resolved layer names and names missing from the layer table.
   */
  collectLayerNamesFromEntities(objectIds: AcDbObjectId[]): {
    layerNames: string[]
    missingLayerNames: string[]
  } {
    const names = new Set<string>()
    const missing = new Set<string>()

    objectIds.forEach(objectId => {
      const layerName = this.getLayerNameFromEntity(objectId)
      if (!layerName) return

      const layer = this.db.tables.layerTable.getAt(layerName)
      if (layer) {
        names.add(layer.name)
      } else {
        missing.add(layerName)
      }
    })

    return { layerNames: [...names], missingLayerNames: [...missing] }
  }

  /**
   * Freezes the layer of a picked entity (`LAYFRZ`).
   *
   * @param objectId - Selected entity id.
   * @returns Outcome with previous frozen state for session undo, or a failure reason.
   */
  freezeLayerByEntity(objectId: AcDbObjectId): AcApLayerByEntityResult {
    const layerName = this.getLayerNameFromEntity(objectId)
    if (!layerName) {
      return { ok: false, reason: 'invalid_selection' }
    }

    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) {
      return { ok: false, reason: 'layer_not_found', layerName }
    }

    if (layer.name === this.db.clayer) {
      return { ok: false, reason: 'cannot_change_current', layerName }
    }

    if (layer.isFrozen) {
      return { ok: false, reason: 'already_frozen', layerName }
    }

    const wasFrozen = layer.isFrozen
    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return
      AcApLayerService.setLayerFrozenState(opened, true)
    })

    return { ok: true, layerName, previousFrozen: wasFrozen }
  }

  /**
   * Restores frozen state by layer name for `LAYFRZ` session undo.
   *
   * @param layerName - Target layer name.
   * @param frozen - Frozen state to restore.
   * @returns `true` when the layer exists and state was applied.
   */
  setLayerFrozenByName(layerName: string, frozen: boolean): boolean {
    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return false
      AcApLayerService.setLayerFrozenState(opened, frozen)
      return true
    })
  }

  /**
   * Turns off the layer of a picked entity (`LAYOFF`).
   *
   * @param objectId - Selected entity id.
   * @returns Outcome with previous off state for session undo, or a failure reason.
   */
  turnOffLayerByEntity(objectId: AcDbObjectId): AcApLayerByEntityResult {
    const layerName = this.getLayerNameFromEntity(objectId)
    if (!layerName) {
      return { ok: false, reason: 'invalid_selection' }
    }

    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) {
      return { ok: false, reason: 'layer_not_found', layerName }
    }

    if (layer.name === this.db.clayer) {
      return { ok: false, reason: 'cannot_change_current', layerName }
    }

    if (layer.isOff) {
      return { ok: false, reason: 'already_off', layerName }
    }

    const wasOff = layer.isOff
    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return
      opened.isOff = true
    })

    return { ok: true, layerName, previousOff: wasOff }
  }

  /**
   * Restores off state by layer name for `LAYOFF` session undo.
   *
   * @param layerName - Target layer name.
   * @param off - Off state to restore.
   * @returns `true` when the layer exists and state was applied.
   */
  setLayerOffByName(layerName: string, off: boolean): boolean {
    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) return false

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return false
      opened.isOff = off
      return true
    })
  }

  /**
   * Locks the layer of a picked entity (`LAYLCK`).
   *
   * @param objectId - Selected entity id.
   * @returns Success or failure outcome.
   */
  lockLayerByEntity(objectId: AcDbObjectId): AcApLayerByEntityResult {
    const layerName = this.getLayerNameFromEntity(objectId)
    if (!layerName) {
      return { ok: false, reason: 'invalid_selection' }
    }

    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) {
      return { ok: false, reason: 'layer_not_found', layerName }
    }

    if (AcApLayerService.isLayerLocked(layer)) {
      return { ok: false, reason: 'already_locked', layerName }
    }

    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return
      AcApLayerService.setLayerLockedState(opened, true)
    })

    return { ok: true, layerName }
  }

  /**
   * Unlocks the layer of a picked entity (`LAYULK`).
   *
   * @param objectId - Selected entity id.
   * @returns Success or failure outcome.
   */
  unlockLayerByEntity(objectId: AcDbObjectId): AcApLayerByEntityResult {
    const layerName = this.getLayerNameFromEntity(objectId)
    if (!layerName) {
      return { ok: false, reason: 'invalid_selection' }
    }

    const layer = this.db.tables.layerTable.getAt(layerName)
    if (!layer) {
      return { ok: false, reason: 'layer_not_found', layerName }
    }

    if (!AcApLayerService.isLayerLocked(layer)) {
      return { ok: false, reason: 'already_unlocked', layerName }
    }

    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const opened = AcApLayerService.openLayerForWrite(this.db, layer)
      if (!opened) return
      AcApLayerService.setLayerLockedState(opened, false)
    })

    return { ok: true, layerName }
  }

  /**
   * Isolates layers by name using `LAYISO` semantics.
   *
   * Target layers are turned on, thawed, and unlocked. Other layers are turned off
   * or locked depending on `isolationMode`. `LockAndFade` locks only; the viewer
   * does not render a fade effect.
   *
   * @param layerNames - Names of layers to keep visible.
   * @param isolationMode - How non-isolated layers are hidden.
   * @returns Isolation result with undo snapshot, or `undefined` when `layerNames` is empty.
   */
  isolateLayers(
    layerNames: string[],
    isolationMode: AcApLayerIsolationMode
  ): AcApLayerIsolateLayersResult | undefined {
    if (layerNames.length === 0) return undefined

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const table = this.db.tables.layerTable
      const targetNames = new Set(layerNames)
      const targetLayer = table.getAt(layerNames[0])
      const currentLayerBefore = this.db.clayer
      const beforeStates = new Map<string, ReturnType<typeof getLayerIsoState>>()

      for (const layer of table.newIterator()) {
        beforeStates.set(layer.name, getLayerIsoState(layer))
      }

      if (targetLayer) {
        this.db.clayer = targetLayer.name
      }

      const affectedLayerNames = new Set<string>()

      for (const layer of table.newIterator()) {
        const opened = AcApLayerService.openLayerForWrite(this.db, layer)
        if (!opened) continue

        if (targetNames.has(opened.name)) {
          if (opened.isOff) {
            opened.isOff = false
            affectedLayerNames.add(opened.name)
          }
          if (opened.isFrozen) {
            AcApLayerService.setLayerFrozenState(opened, false)
            affectedLayerNames.add(opened.name)
          }
          if (AcApLayerService.isLayerLocked(opened)) {
            AcApLayerService.setLayerLockedState(opened, false)
            affectedLayerNames.add(opened.name)
          }
          continue
        }

        if (isolationMode === 'Off') {
          if (!opened.isOff) {
            opened.isOff = true
            affectedLayerNames.add(opened.name)
          }
          continue
        }

        if (!AcApLayerService.isLayerLocked(opened)) {
          AcApLayerService.setLayerLockedState(opened, true)
          affectedLayerNames.add(opened.name)
        }
      }

      const snapshots: AcApLayerIsoLayerSnapshot[] = []
      for (const layer of table.newIterator()) {
        const before = beforeStates.get(layer.name)
        if (!before) continue

        const isolated = getLayerIsoState(layer)
        if (!isSameLayerIsoState(before, isolated)) {
          snapshots.push({
            name: layer.name,
            before,
            isolated
          })
        }
      }

      const isoSnapshot: AcApLayerIsoSnapshot = {
        currentLayerBefore,
        currentLayerAfter: this.db.clayer,
        layers: snapshots
      }

      return {
        layerNames,
        affectedLayerCount: affectedLayerNames.size,
        isoSnapshot
      }
    })
  }

  /**
   * Restores a `LAYISO` snapshot.
   *
   * @param snapshot - Snapshot previously produced by {@link isolateLayers}.
   * @returns Number of layers whose state was restored.
   */
  unisolateFromSnapshot(snapshot: AcApLayerIsoSnapshot): number {
    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const table = this.db.tables.layerTable
      let restoredLayers = 0

      for (const entry of snapshot.layers) {
        if (!table.getAt(entry.name)) continue
        if (this.restoreLayerIfUnchanged(entry)) {
          restoredLayers++
        }
      }

      if (
        this.db.clayer === snapshot.currentLayerAfter &&
        snapshot.currentLayerBefore !== snapshot.currentLayerAfter &&
        table.getAt(snapshot.currentLayerBefore)
      ) {
        this.db.clayer = snapshot.currentLayerBefore
      }

      return restoredLayers
    })
  }

  /**
   * Collects entity snapshots on a layer for `LAYDEL` undo.
   *
   * @param layerName - Layer whose entities should be snapshotted.
   * @returns Cloned entities with owner and object ids.
   */
  collectLayerEntities(layerName: string): AcApLaydelEntitySnapshot[] {
    const snapshots: AcApLaydelEntitySnapshot[] = []

    for (const blockRecord of this.db.tables.blockTable.newIterator()) {
      for (const entity of blockRecord.newIterator()) {
        if (entity.layer !== layerName) continue
        snapshots.push({
          ownerId: blockRecord.objectId,
          objectId: entity.objectId,
          entity: entity.clone()
        })
      }
    }

    return snapshots
  }

  /**
   * Removes entities previously captured for `LAYDEL`.
   *
   * @param deletedEntities - Entity snapshots to erase from their owners.
   */
  removeLayerEntities(deletedEntities: AcApLaydelEntitySnapshot[]): void {
    const idsByOwner = new Map<AcDbObjectId, AcDbObjectId[]>()

    deletedEntities.forEach(({ ownerId, objectId }) => {
      const ids = idsByOwner.get(ownerId) ?? []
      ids.push(objectId)
      idsByOwner.set(ownerId, ids)
    })

    idsByOwner.forEach((ids, ownerId) => {
      this.db.tables.blockTable.getIdAt(ownerId)?.removeEntity(ids)
    })
  }

  /**
   * Deletes a layer and all entities on it (`LAYDEL`).
   *
   * Layer `0` and the current layer cannot be deleted.
   *
   * @param layerName - Name of the layer to delete.
   * @returns Success with undo snapshots, or a failure reason.
   */
  deleteLayer(layerName: string): AcApDeleteLayerResult {
    const layer = this.db.tables.layerTable.getAt(layerName)

    if (!layer) {
      return { ok: false, reason: 'not_found', layerName }
    }

    if (layer.name === '0') {
      return { ok: false, reason: 'layer_0', layerName }
    }

    if (layer.name === this.db.clayer) {
      return { ok: false, reason: 'current_layer', layerName }
    }

    return acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      const deletedEntities = this.collectLayerEntities(layer.name)
      this.removeLayerEntities(deletedEntities)

      const deletedLayer = layer.clone()
      this.db.tables.layerTable.remove(layer.name)
      this.db.events.layerErased.dispatch({ database: this.db, layer })

      return {
        ok: true,
        layerName: layer.name,
        layer: deletedLayer,
        entities: deletedEntities
      }
    })
  }

  /**
   * Restores a deleted layer and its entities for `LAYDEL` session undo.
   *
   * @param layer - Cloned layer table record to re-add.
   * @param entities - Entity snapshots to append back to their owners.
   */
  restoreDeletedLayer(
    layer: AcDbLayerTableRecord,
    entities: AcApLaydelEntitySnapshot[]
  ): void {
    acapRunServiceEdit(this.db, LAYER_EDIT_LABEL, () => {
      if (!this.db.tables.layerTable.has(layer.name)) {
        this.db.tables.layerTable.add(layer.clone())
      }

      const entitiesByOwner = new Map<AcDbObjectId, AcDbEntity[]>()
      entities.forEach(({ ownerId, entity }) => {
        const list = entitiesByOwner.get(ownerId) ?? []
        list.push(entity.clone())
        entitiesByOwner.set(ownerId, list)
      })

      entitiesByOwner.forEach((list, ownerId) => {
        const owner =
          this.db.tables.blockTable.getIdAt(ownerId) ??
          this.db.tables.blockTable.modelSpace
        owner.appendEntity(list)
      })
    })
  }

  /**
   * Restores one layer from an isolation snapshot when its post-isolation state still matches.
   *
   * @param snapshot - Per-layer before/after isolation snapshot.
   * @returns `true` when at least one flag was restored.
   */
  private restoreLayerIfUnchanged(
    snapshot: AcApLayerIsoLayerSnapshot
  ): boolean {
    const layer = this.db.tables.layerTable.getAt(snapshot.name)
    if (!layer) return false

    const opened = AcApLayerService.openLayerForWrite(this.db, layer)
    if (!opened) return false

    let restored = false

    if (
      opened.isOff === snapshot.isolated.isOff &&
      opened.isOff !== snapshot.before.isOff
    ) {
      opened.isOff = snapshot.before.isOff
      restored = true
    }

    if (
      opened.isFrozen === snapshot.isolated.isFrozen &&
      opened.isFrozen !== snapshot.before.isFrozen
    ) {
      AcApLayerService.setLayerFrozenState(opened, snapshot.before.isFrozen)
      restored = true
    }

    if (
      AcApLayerService.isLayerLocked(opened) ===
        snapshot.isolated.isLocked &&
      AcApLayerService.isLayerLocked(opened) !== snapshot.before.isLocked
    ) {
      AcApLayerService.setLayerLockedState(opened, snapshot.before.isLocked)
      restored = true
    }

    return restored
  }
}
