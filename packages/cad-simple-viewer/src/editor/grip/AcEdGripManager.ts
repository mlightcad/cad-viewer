import {
  AcDbObjectId,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApDocManager } from '../../app'
import { AcEdMTextEditor } from '../input/ui/AcEdMTextEditor'
import { AcEdBaseView } from '../view/AcEdBaseView'
import {
  isGripAppearanceSysVar,
  readGripAppearance
} from './AcEdGripAppearance'
import { AcEdGripEditSession, AcEdGripEditTarget } from './AcEdGripEditSession'
import { AcEdGripHandle } from './AcEdGripHandle'
import { acedShouldShowGrips } from './AcEdGripPolicy'

/**
 * Internal record that binds a database grip point to its on-screen handle.
 *
 * Each entry represents one grip square for a single entity grip index. The
 * manager keeps these in sync with the current selection set and view transform.
 */
interface AcEdGripEntry {
  /** Object id of the entity that owns this grip. */
  entityId: AcDbObjectId
  /** Zero-based index into the entity's grip point array. */
  gripIndex: number
  /** Grip location in world (WCS) coordinates at creation time. */
  wcsPoint: AcGePoint3dLike
  /** DOM handle rendered in the view container for this grip. */
  handle: AcEdGripHandle
}

/**
 * Manages grip point display and drag editing for the active view.
 *
 * Grip handles are shown for entities in the view's selection set when the
 * editor is idle, the document is writable, and selection count is within the
 * `GRIPOBJLIMIT` system variable. Grip size and colours follow `GRIPSIZE`,
 * `GRIPCOLOR`, and `GRIPHOT`. The manager listens for selection, view,
 * command, and system-variable changes to refresh or reposition handles.
 *
 * Clicking a grip starts an {@link AcEdGripEditSession} that previews and
 * commits entity geometry changes; while dragging, all grip handles are hidden.
 *
 * ## Key Responsibilities
 * - **Display**: Create and position grip handles from entity grip points
 * - **Interaction**: Route hover, hot, and mousedown events to edit sessions
 * - **Lifecycle**: Subscribe/unsubscribe view events and dispose DOM on teardown
 *
 * @example
 * ```typescript
 * const gripManager = new AcEdGripManager(view);
 * // Handles appear automatically when entities are selected.
 * // On view dispose:
 * gripManager.dispose();
 * ```
 */
export class AcEdGripManager {
  /** View that owns selection, coordinate conversion, and the handle container. */
  private readonly _view: AcEdBaseView
  /** Active grip entries, one per grip point on each selected entity. */
  private readonly _entries: AcEdGripEntry[] = []
  /** In-progress grip drag session, or `null` when not editing. */
  private _editSession: AcEdGripEditSession | null = null
  /** Entry currently under the pointer during mousedown (hot grip), if any. */
  private _hotEntry: AcEdGripEntry | null = null

  /** Stable listener reference for selection/command refresh. */
  private readonly _boundRefresh = () => this.refresh()
  /** Stable listener reference for view pan/zoom/resize repositioning. */
  private readonly _boundReposition = () => this.repositionAll()
  /** Stable listener reference for grip-related system variable changes. */
  private readonly _boundSysVarChanged = (args: { name: string }) =>
    this.onGripSysVarChanged(args.name)

  /**
   * Creates a grip manager bound to the given view.
   *
   * Registers event listeners on the view's selection set, editor, view
   * events, and `GRIPOBJLIMIT` system variable so grips stay in sync with
   * application state.
   *
   * @param view - The CAD view whose selection and container host grip handles
   */
  constructor(view: AcEdBaseView) {
    this._view = view
    this.bindEvents()
  }

  /**
   * Whether a grip drag edit is currently in progress.
   *
   * While `true`, hover styling on other handles is suppressed and grip
   * handles are hidden until the session ends.
   */
  get isDragging(): boolean {
    return this._editSession != null
  }

  /**
   * Tears down the manager and releases all resources.
   *
   * Unsubscribes from view events, cancels any active edit session, and
   * destroys all grip handle DOM elements.
   */
  dispose() {
    this.unbindEvents()
    this.clear()
  }

  /**
   * Rebuilds the grip handle set from the current selection.
   *
   * Clears existing entries first. If grips are not allowed (read-only mode,
   * active command, MText editor, or selection over limit), no new handles are
   * created. Otherwise, iterates selected entities, queries grip points via
   * `subGetGripPoints()`, creates handles, wires pointer events, and positions
   * each entry in container coordinates.
   */
  refresh() {
    this.clearEntries()
    if (!this.canShowGrips()) {
      return
    }

    const doc = AcApDocManager.instance.curDocument
    const blockTable = doc.database.tables.blockTable
    const appearance = readGripAppearance(doc.database)

    for (const entityId of this._view.selectionSet.ids) {
      const entity = blockTable.getEntityById(entityId)
      if (!entity) continue

      const gripPoints = entity.subGetGripPoints()
      for (let gripIndex = 0; gripIndex < gripPoints.length; ++gripIndex) {
        const wcsPoint = gripPoints[gripIndex]
        const handle = new AcEdGripHandle(this._view.container, appearance)
        const entry: AcEdGripEntry = {
          entityId,
          gripIndex,
          wcsPoint,
          handle
        }
        this.wireHandleEvents(entry)
        this._entries.push(entry)
        this.positionEntry(entry)
      }
    }
  }

  /**
   * Determines whether grip handles may be shown for the current view state.
   *
   * Delegates to {@link acedShouldShowGrips} using document open mode, editor
   * activity, MText input focus, selection count, and `GRIPOBJLIMIT`.
   *
   * @returns `true` if grips should be displayed; otherwise `false`
   */
  private canShowGrips(): boolean {
    const doc = AcApDocManager.instance.curDocument
    const gripObjLimit = AcDbSysVarManager.instance().getVar(
      AcDbSystemVariables.GRIPOBJLIMIT,
      doc.database
    ) as number

    return acedShouldShowGrips(
      doc.openMode,
      this._view.editor.isActive,
      !!AcEdMTextEditor.getActiveInputBox(),
      this._view.selectionSet.count,
      gripObjLimit
    )
  }

  /**
   * Subscribes to events that require a full grip refresh or reposition.
   *
   * Refresh triggers: selection added/removed, command start/end,
   * `GRIPOBJLIMIT` sysvar change. Reposition triggers: view changed, view resize.
   * Appearance updates: `GRIPSIZE`, `GRIPCOLOR`, `GRIPHOT` sysvar changes.
   */
  private bindEvents() {
    const { selectionSet, editor, events } = this._view

    selectionSet.events.selectionAdded.addEventListener(this._boundRefresh)
    selectionSet.events.selectionRemoved.addEventListener(this._boundRefresh)
    events.viewChanged.addEventListener(this._boundReposition)
    events.viewResize.addEventListener(this._boundReposition)
    editor.events.commandWillStart.addEventListener(this._boundRefresh)
    editor.events.commandEnded.addEventListener(this._boundRefresh)

    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this._boundSysVarChanged
    )
  }

  /**
   * Removes all event listeners registered by {@link bindEvents}.
   */
  private unbindEvents() {
    const { selectionSet, editor, events } = this._view

    selectionSet.events.selectionAdded.removeEventListener(this._boundRefresh)
    selectionSet.events.selectionRemoved.removeEventListener(this._boundRefresh)
    events.viewChanged.removeEventListener(this._boundReposition)
    events.viewResize.removeEventListener(this._boundReposition)
    editor.events.commandWillStart.removeEventListener(this._boundRefresh)
    editor.events.commandEnded.removeEventListener(this._boundRefresh)

    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this._boundSysVarChanged
    )
  }

  /**
   * Reacts to grip-related system variable changes.
   */
  private onGripSysVarChanged(name: string) {
    const normalized = name.toLowerCase()
    if (normalized === AcDbSystemVariables.GRIPOBJLIMIT.toLowerCase()) {
      this.refresh()
      return
    }
    if (isGripAppearanceSysVar(normalized)) {
      this.applyAppearance()
    }
  }

  /**
   * Updates size and colours on existing grip handles from current sysvars.
   */
  private applyAppearance() {
    if (this._entries.length === 0) {
      return
    }

    const appearance = readGripAppearance(
      AcApDocManager.instance.curDocument.database
    )
    for (const entry of this._entries) {
      entry.handle.applyAppearance(appearance)
    }
  }

  /**
   * Attaches pointer event handlers to a grip handle element.
   *
   * - **mouseenter**: Sets hover state unless a drag is active
   * - **mouseleave**: Reverts to normal unless this entry is the hot grip
   * - **mousedown** (left button): Marks hot, prevents default propagation,
   *   and starts a grip edit session when grips are allowed
   *
   * @param entry - The grip entry whose handle receives the listeners
   */
  private wireHandleEvents(entry: AcEdGripEntry) {
    const { element } = entry.handle

    element.addEventListener('mouseenter', () => {
      if (this.isDragging) return
      entry.handle.setState('hover')
    })

    element.addEventListener('mouseleave', () => {
      if (this._hotEntry === entry) return
      entry.handle.setState('normal')
    })

    element.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      if (!this.canShowGrips()) return

      e.preventDefault()
      e.stopPropagation()

      this._hotEntry = entry
      entry.handle.setState('hot')
      this.startEdit(entry)
    })
  }

  /**
   * Begins a grip drag edit for the given entry.
   *
   * Resolves the entity from the document, hides all grip handles for the
   * duration of the drag, and constructs an {@link AcEdGripEditSession} that
   * calls {@link endEdit} when the session completes.
   *
   * If the entity no longer exists, {@link endEdit} is invoked immediately.
   *
   * @param entry - The grip entry that was activated by the user
   */
  private startEdit(entry: AcEdGripEntry) {
    const entity =
      AcApDocManager.instance.curDocument.database.tables.blockTable.getEntityById(
        entry.entityId
      )
    if (!entity) {
      this.endEdit()
      return
    }

    this.hideEntriesForDrag()

    const target: AcEdGripEditTarget = {
      entityId: entry.entityId,
      gripIndex: entry.gripIndex,
      gripBaseWcs: entry.wcsPoint
    }

    this._editSession = new AcEdGripEditSession(
      this._view,
      entity,
      target,
      () => this.endEdit()
    )
  }

  /**
   * Completes or aborts the current grip edit and restores grip display.
   *
   * Clears the edit session and hot entry, then rebuilds handles via
   * {@link refresh} so geometry and selection state are reflected on screen.
   */
  private endEdit() {
    this._editSession = null
    this._hotEntry = null
    this.refresh()
  }

  /**
   * Removes all visible grip handles while a drag edit is in progress.
   *
   * Called when starting an edit so only the preview jig is shown, not the
   * static grip squares.
   */
  private hideEntriesForDrag() {
    this.clearEntries()
  }

  /**
   * Updates a single grip handle's screen position from its WCS point.
   *
   * Converts world coordinates to canvas, then to container-local pixels,
   * and applies the result to the handle's DOM element.
   *
   * @param entry - The grip entry to reposition
   */
  private positionEntry(entry: AcEdGripEntry) {
    const canvasPos = this._view.worldToScreen(entry.wcsPoint)
    const containerPos = this._view.canvasToContainer(canvasPos)
    entry.handle.setPosition(containerPos)
  }

  /**
   * Repositions every active grip handle after a view transform or resize.
   *
   * Does not recreate entries; only updates DOM positions from stored WCS points.
   */
  private repositionAll() {
    for (const entry of this._entries) {
      this.positionEntry(entry)
    }
  }

  /**
   * Destroys all grip handle DOM elements and clears the entry list.
   *
   * Also resets {@link _hotEntry}. Does not cancel an active edit session;
   * use {@link clear} for full teardown including session cancellation.
   */
  private clearEntries() {
    for (const entry of this._entries) {
      entry.handle.destroy()
    }
    this._entries.length = 0
    this._hotEntry = null
  }

  /**
   * Cancels any in-progress edit and removes all grip handles.
   *
   * Used by {@link dispose} and internally when a full reset is required.
   */
  private clear() {
    this._editSession?.cancel()
    this._editSession = null
    this.clearEntries()
  }
}
