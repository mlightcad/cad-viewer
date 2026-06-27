import {
  AcApDocManager,
  type AcApLayerInfo,
  AcApLayerService,
  AcApLayerStore,
  acapRunServiceEdit,
  AcDbDocumentEventArgs,
  LAYER_EDIT_LABEL
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcDbDatabase
} from '@mlightcad/data-model'
import { computed, onScopeDispose, reactive, ref } from 'vue'

/**
 * UI-ready layer row for layer palettes, toolbars, and similar Vue components.
 *
 * Extends {@link AcApLayerInfo} with additional fields read from the layer table
 * record (linetype, line weight, plottable flag, etc.).
 */
export interface LayerInfo {
  /** Layer table record name. */
  name: string
  /** Serialized {@link AcCmColor} string from {@link AcCmColor.toString}. */
  color: string
  /** CSS color derived from the layer color for swatch display. */
  cssColor: string
  /** Whether the layer is locked (entities cannot be edited). */
  isLocked: boolean
  /** Whether the layer is frozen (entities are hidden and not selectable). */
  isFrozen: boolean
  /** Whether the layer contains at least one entity in the drawing database. */
  isInUse: boolean
  /** Whether the layer is on (not off). */
  isOn: boolean
  /** Whether the layer is included when the drawing is plotted. */
  isPlottable: boolean
  /** Layer transparency as a string (AutoCAD-style value). */
  transparency: string
  /** Assigned linetype name (for example `Continuous`). */
  linetype: string
  /** Line weight in hundredths of a millimeter; `-1` means default/by-layer. */
  lineWeight: number
}

/**
 * Identifies which layer visibility flag a toggle operation should flip.
 */
export type LayerStateToggleKey = 'on' | 'frozen' | 'locked'

/**
 * Point-in-time capture of layer on/frozen/locked states and the current layer.
 *
 * Used by undo/redo and "layer previous" flows to restore a prior configuration.
 */
export interface LayerStateSnapshot {
  /** Current layer name (`CLAYER`) at the time of capture. */
  clayer: string
  /** Shallow copies of {@link LayerInfo} rows at the time of capture. */
  states: LayerInfo[]
}

/**
 * Merges cached store data with live layer-table fields for UI display.
 *
 * @param db - Active drawing database; when missing, defaults are used for extended fields.
 * @param base - Layer row from {@link AcApLayerStore.getLayers}.
 * @returns A fully populated {@link LayerInfo} row.
 */
function enrichLayerInfo(
  db: AcDbDatabase | undefined,
  base: AcApLayerInfo
): LayerInfo {
  const layer = db?.tables.layerTable.getAt(base.name)
  if (!layer) {
    return {
      name: base.name,
      color: base.color,
      cssColor: base.cssColor,
      isLocked: base.isLocked,
      isFrozen: base.isFrozen,
      isInUse: false,
      isOn: base.isOn,
      isPlottable: true,
      transparency: '0',
      linetype: 'Continuous',
      lineWeight: -1
    }
  }

  return {
    name: base.name,
    color: base.color,
    cssColor: base.cssColor,
    isLocked: base.isLocked,
    isFrozen: base.isFrozen,
    isInUse: layer.isInUse,
    isOn: base.isOn,
    isPlottable: layer.isPlottable,
    transparency: layer.transparency.toString(),
    linetype: layer.linetype,
    lineWeight: layer.lineWeight
  }
}

/**
 * Builds an immutable {@link LayerStateSnapshot} from the current layer list.
 *
 * @param clayer - Current layer name to store in the snapshot.
 * @param layers - Layer rows to copy into the snapshot.
 * @returns A new snapshot with shallow-cloned layer rows.
 */
function toLayerStateSnapshot(
  clayer: string,
  layers: LayerInfo[]
): LayerStateSnapshot {
  return { clayer, states: layers.map(layer => ({ ...layer })) }
}

/**
 * Applies a previously captured layer snapshot through the layer edit service.
 *
 * @param db - Drawing database to mutate.
 * @param snapshot - Snapshot whose on/frozen/locked flags and `CLAYER` are restored.
 * @returns `true` when the edit transaction succeeds.
 */
function applyLayerStateSnapshot(
  db: AcDbDatabase,
  snapshot: LayerStateSnapshot
): boolean {
  return acapRunServiceEdit(db, LAYER_EDIT_LABEL, () =>
    AcApLayerService.applyLayerPreviousSnapshot(db, {
      clayer: snapshot.clayer,
      states: snapshot.states.map(state => ({
        name: state.name,
        isOn: state.isOn,
        isFrozen: state.isFrozen,
        isLocked: state.isLocked
      }))
    })
  )
}

/**
 * Layer management composable for Vue UI components.
 *
 * Subscribes to the active document's {@link AcApLayerStore} and exposes reactive
 * layer rows plus mutation helpers. State resynchronizes when the user switches
 * documents or when the layer table changes.
 *
 * @param editor - Application document manager that owns the active drawing.
 * @returns Reactive layer state and mutation functions for the active document.
 *
 * @example
 * ```typescript
 * import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
 * import { useLayers } from '@mlightcad/cad-viewer'
 *
 * const { layers, currentLayerName, setLayerOn, toggleLayerFrozen } =
 *   useLayers(AcApDocManager.instance)
 *
 * setLayerOn('Walls', true)
 * toggleLayerFrozen('Dimensions')
 * ```
 */
export function useLayers(editor: AcApDocManager) {
  const reactiveLayers = reactive<LayerInfo[]>([])
  const currentLayerNameState = ref('')
  let subscribedLayerStore: AcApLayerStore | undefined

  /** Returns the database of the currently active document, if any. */
  const getCurrentDatabase = () => editor.curDocument?.database

  /** Returns the layer store of the currently active document, if any. */
  const getLayerStore = () => editor.curDocument?.layerStore

  /** Rebuilds reactive layer rows and current layer name from the active store. */
  const syncFromStore = () => {
    const db = getCurrentDatabase()
    const layerStore = getLayerStore()
    if (!layerStore) {
      reactiveLayers.splice(0, reactiveLayers.length)
      currentLayerNameState.value = ''
      return
    }

    const storeLayers = layerStore.getLayers()
    const nextLayers = storeLayers.map(layer => enrichLayerInfo(db, layer))

    reactiveLayers.splice(0, reactiveLayers.length, ...nextLayers)
    currentLayerNameState.value = layerStore.getCurrentLayerName()
  }

  /** Event handler that refreshes local state when the layer store changes. */
  const handleLayersChanged = () => {
    syncFromStore()
  }

  /**
   * Subscribes to layer-store change events for the given document and syncs state.
   *
   * @param doc - Document to bind; defaults to the editor's current document.
   */
  const bindToActiveDocument = (doc = editor.curDocument) => {
    if (subscribedLayerStore) {
      subscribedLayerStore.events.changed.removeEventListener(handleLayersChanged)
    }

    subscribedLayerStore = doc?.layerStore
    if (subscribedLayerStore) {
      subscribedLayerStore.events.changed.addEventListener(handleLayersChanged)
    }
    syncFromStore()
  }

  /**
   * Switches layer-store subscription when the user activates another document.
   *
   * @param args - Document activation event payload.
   */
  const handleDocumentActivated = (args: AcDbDocumentEventArgs) => {
    bindToActiveDocument(args.doc)
  }

  /**
   * Writable computed ref for the current layer name (`CLAYER`).
   *
   * Reading reflects the active document's current layer; writing delegates to
   * {@link setCurrentLayer}.
   */
  const currentLayerName = computed<string>({
    get: () => currentLayerNameState.value,
    set: name => {
      setCurrentLayer(name)
    }
  })

  /** Computed {@link LayerInfo} row matching {@link currentLayerName}, or `undefined`. */
  const currentLayerInfo = computed<LayerInfo | undefined>(() =>
    reactiveLayers.find(l => l.name === currentLayerName.value)
  )

  /**
   * Sets the current layer (`CLAYER`) on the active document.
   *
   * @param layerName - Target layer table record name.
   * @returns `true` when the layer store accepts the change.
   */
  function setCurrentLayer(layerName: string) {
    return getLayerStore()?.setCurrentLayer(layerName) ?? false
  }

  /**
   * Turns a layer on or off.
   *
   * @param layerName - Layer table record name.
   * @param isOn - `true` to turn the layer on; `false` to turn it off.
   * @returns `true` when the layer store accepts the change.
   */
  function setLayerOn(layerName: string, isOn: boolean) {
    return getLayerStore()?.setLayerOn(layerName, isOn) ?? false
  }

  /**
   * Toggles a layer between on and off based on its current database state.
   *
   * @param layerName - Layer table record name.
   * @returns `true` when the toggle succeeds; `false` if the layer is missing.
   */
  function toggleLayerOn(layerName: string) {
    const db = getCurrentDatabase()
    if (!db || !layerName) return false
    const layer = db.tables.layerTable.getAt(layerName)
    if (!layer) return false
    return setLayerOn(layer.name, layer.isOff)
  }

  /**
   * Freezes or thaws a layer.
   *
   * @param layerName - Layer table record name.
   * @param isFrozen - `true` to freeze; `false` to thaw.
   * @returns `true` when the layer store accepts the change.
   */
  function setLayerFrozen(layerName: string, isFrozen: boolean) {
    return getLayerStore()?.setLayerFrozen(layerName, isFrozen) ?? false
  }

  /**
   * Toggles a layer between frozen and thawed based on its current database state.
   *
   * @param layerName - Layer table record name.
   * @returns `true` when the toggle succeeds; `false` if the layer is missing.
   */
  function toggleLayerFrozen(layerName: string) {
    const db = getCurrentDatabase()
    if (!db || !layerName) return false
    const layer = db.tables.layerTable.getAt(layerName)
    if (!layer) return false
    return setLayerFrozen(layer.name, !layer.isFrozen)
  }

  /**
   * Locks or unlocks a layer.
   *
   * @param layerName - Layer table record name.
   * @param isLocked - `true` to lock; `false` to unlock.
   * @returns `true` when the layer store accepts the change.
   */
  function setLayerLocked(layerName: string, isLocked: boolean) {
    return getLayerStore()?.setLayerLocked(layerName, isLocked) ?? false
  }

  /**
   * Toggles a layer between locked and unlocked based on its current database state.
   *
   * @param layerName - Layer table record name.
   * @returns `true` when the toggle succeeds; `false` if the layer is missing.
   */
  function toggleLayerLocked(layerName: string) {
    const db = getCurrentDatabase()
    if (!db || !layerName) return false
    const layer = db.tables.layerTable.getAt(layerName)
    if (!layer) return false
    return setLayerLocked(layer.name, !layer.isLocked)
  }

  /**
   * Toggles one layer visibility flag identified by {@link LayerStateToggleKey}.
   *
   * @param layerName - Layer table record name.
   * @param state - Which flag to flip: on, frozen, or locked.
   * @returns `true` when the toggle succeeds.
   */
  function toggleLayerState(layerName: string, state: LayerStateToggleKey) {
    switch (state) {
      case 'on':
        return toggleLayerOn(layerName)
      case 'frozen':
        return toggleLayerFrozen(layerName)
      case 'locked':
        return toggleLayerLocked(layerName)
      default:
        return false
    }
  }

  /**
   * Isolates a single layer, turning all others off or frozen as configured by the store.
   *
   * @param layerName - Layer to keep visible.
   * @returns `true` when isolation succeeds.
   */
  function isolateLayer(layerName: string) {
    return getLayerStore()?.isolateSingleLayer(layerName) ?? false
  }

  /**
   * Turns every layer in the drawing on.
   *
   * @returns `true` when the operation succeeds.
   */
  function setAllLayersOn() {
    return getLayerStore()?.setAllLayersOn() ?? false
  }

  /**
   * Assigns a new color to a layer.
   *
   * @param layerName - Layer table record name.
   * @param color - New layer color.
   * @returns `true` when the layer store accepts the change.
   */
  function setLayerColor(layerName: string, color: AcCmColor) {
    return getLayerStore()?.setLayerColor(layerName, color) ?? false
  }

  /**
   * Assigns a new line weight to a layer.
   *
   * @param layerName - Layer table record name.
   * @param lineWeight - Line weight in hundredths of a millimeter; `-1` for default.
   * @returns `true` when the layer store accepts the change.
   */
  function setLayerLineWeight(layerName: string, lineWeight: number) {
    return getLayerStore()?.setLayerLineWeight(layerName, lineWeight) ?? false
  }

  /**
   * Captures the current layer list and `CLAYER` as a {@link LayerStateSnapshot}.
   *
   * @param db - Database to read `CLAYER` from; defaults to the active document.
   * @returns A snapshot, or `null` when no database is active.
   */
  function captureLayerSnapshot(
    db = getCurrentDatabase()
  ): LayerStateSnapshot | null {
    if (!db) return null
    return toLayerStateSnapshot(db.clayer, [...reactiveLayers])
  }

  /**
   * Restores layer on/frozen/locked states and `CLAYER` from a snapshot.
   *
   * @param snapshot - Previously captured layer state.
   * @param db - Database to apply the snapshot to; defaults to the active document.
   * @returns `true` when the restore succeeds; `false` if no database is active.
   */
  function applyLayerSnapshot(
    snapshot: LayerStateSnapshot,
    db = getCurrentDatabase()
  ) {
    if (!db) return false
    return applyLayerStateSnapshot(db, snapshot)
  }

  editor.events.documentActivated.addEventListener(handleDocumentActivated)
  bindToActiveDocument()

  onScopeDispose(() => {
    editor.events.documentActivated.removeEventListener(handleDocumentActivated)
    if (subscribedLayerStore) {
      subscribedLayerStore.events.changed.removeEventListener(handleLayersChanged)
    }
  })

  return {
    /** Reactive list of layer rows for the active document. */
    layers: reactiveLayers,
    /** Writable computed current layer name (`CLAYER`). */
    currentLayerName,
    /** Computed {@link LayerInfo} for {@link currentLayerName}. */
    currentLayerInfo,
    /** Sets the current layer. See {@link setCurrentLayer}. */
    setCurrentLayer,
    /** Turns a layer on or off. See {@link setLayerOn}. */
    setLayerOn,
    /** Freezes or thaws a layer. See {@link setLayerFrozen}. */
    setLayerFrozen,
    /** Locks or unlocks a layer. See {@link setLayerLocked}. */
    setLayerLocked,
    /** Toggles layer on/off. See {@link toggleLayerOn}. */
    toggleLayerOn,
    /** Toggles layer frozen/thawed. See {@link toggleLayerFrozen}. */
    toggleLayerFrozen,
    /** Toggles layer locked/unlocked. See {@link toggleLayerLocked}. */
    toggleLayerLocked,
    /** Toggles one of on, frozen, or locked. See {@link toggleLayerState}. */
    toggleLayerState,
    /** Isolates a single visible layer. See {@link isolateLayer}. */
    isolateLayer,
    /** Turns all layers on. See {@link setAllLayersOn}. */
    setAllLayersOn,
    /** Captures current layer states for undo/previous. See {@link captureLayerSnapshot}. */
    captureLayerSnapshot,
    /** Restores a captured layer snapshot. See {@link applyLayerSnapshot}. */
    applyLayerSnapshot,
    /** Sets layer color. See {@link setLayerColor}. */
    setLayerColor,
    /** Sets layer line weight. See {@link setLayerLineWeight}. */
    setLayerLineWeight
  }
}
