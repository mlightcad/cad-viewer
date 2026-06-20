import { AcDbObjectId, AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrMatrixUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'
export interface AcTrEntityBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: AcDbObjectId
}

/**
 * One collection of graphic interface entities. Now it is used to render block reference,
 * table and viewport.
 */
export class AcTrGroup extends AcTrEntity {
  private _isOnTheSameLayer: boolean
  private _wcsChildBoxes: AcTrEntityBox[] = []

  /**
   * Leaf {@link AcTrEntity} instances that contributed geometry to this group
   * before {@link flatten} hoisted render meshes and removed intermediate
   * containers from the scene graph.
   *
   * {@link AcTrGroup} construction follows this order:
   *
   * 1. Add each block-definition entity and call {@link registerSourceEntities}
   * 2. Snapshot initial bounds via {@link storeBoxes}
   * 3. Call {@link flatten}, which reparents drawable leaves directly under
   *    this group and detaches the original {@link AcTrEntity} wrappers
   *
   * After step 3, `group.children` no longer contains the source entities,
   * yet their `wcsBbox` values remain the authoritative block-local extents
   * once deferred drawing (MText/Shape `syncDraw`) completes.
   *
   * This list is also extended by {@link addChild} when
   * {@link AcDbRenderingCache.draw} appends block-reference attributes after
   * the INSERT transform is applied. Those attributes stay attached to the
   * group and are tracked here for both deferred drawing and spatial-index
   * refresh.
   *
   * Consumers such as {@link getSourceEntities},
   * {@link refreshWcsChildBoxesFromChildren}, and
   * `AcTrView2d.ensureGroupDrawableGeometry` rely on this list because a
   * post-flatten {@link THREE.Object3D.traverse} walk cannot recover the
   * detached entity containers.
   *
   * Entries are deep-cloned in {@link copy} so rendering-cache block instances
   * keep independent geometry state.
   */
  private _sourceEntities: AcTrEntity[] = []

  constructor(entities: AcTrEntity[], context: AcTrRenderContext) {
    super(context)
    entities.forEach(entity => {
      // FIXME: It looks like that code within 'Array.isArray(entity)' condition is useless.
      if (Array.isArray(entity)) {
        const subGroup = new AcTrEntity(context)
        this.add(subGroup)
        this.wcsBbox.union(subGroup.wcsBbox)
      } else {
        this.add(entity)
        this.registerSourceEntities(entity)
        this.wcsBbox.union(entity.wcsBbox)
      }
      this.storeBoxes(entity)
    })
    this.flatten()

    // It is a little tricky that how AutoCAD handles block references (inserts), their
    // own layer, and the layers of entities inside the block.
    //
    // Assuming block B contains:
    // - E1 on layer 0
    // - E2 on layer L2
    // - E3 on layer L3
    //
    // You insert block B onto layer L2 (the block reference layer).
    //
    // Case 1: Turn off layer L2
    // - The block reference itself is on L2.
    // - When you turn off L2, the entire block reference disappears, regardless of what
    // layers its contents are on. Result is block reference will NOT be visible.
    //
    // Case 2: Turn off layer L3
    // - The block reference is still on L2, which remains on.
    // - Inside the block:
    //   - E1 (on 0) → inherits from the block’s layer (L2), so it is still visible.
    //   - E2 (on L2) → visible (since L2 is still on).
    //   - E3 (on L3) → hidden (since L3 is turned off).
    // - Result is that the block reference will still be visible, but E3 inside it will not.
    //
    // If all of entities are on layer '0', we can merge them together so that it looks
    // like one non-composite entity. This approach can improve rendering performance and
    // make it easier to process entities in group. Actually most of blocks follow this pattern.
    //
    // So 'isMerged' flag is used to handle the above situation.
    //
    let hasEntityInNonZeroLayer = false
    const children = this.children
    for (let index = 0; index < children.length; ++index) {
      const entity = children[index]
      if (
        entity.userData.layerName != null &&
        entity.userData.layerName !== '0'
      ) {
        hasEntityInNonZeroLayer = true
        break
      }
    }
    this._isOnTheSameLayer = !hasEntityInNonZeroLayer

    // Note: Don't merge children because the structure of is group is needed when
    // hovering over one entity. For example, when hovering on one character in one
    // block reference, its bounding box is used to check intersection instead of its
    // real shape. After merging, there is no way to do this kind of check.

    // wcsChildBoxes is the source of truth for spatial indexing. The aggregate
    // wcsBbox union taken during construction (or Box3.applyMatrix4 after INSERT)
    // can be slightly larger than the union of per-child boxes when transforms
    // include rotation or when nested groups carry mismatched metadata.
    this.syncWcsBboxFromChildBoxes()
  }

  get isOnTheSameLayer() {
    return this._isOnTheSameLayer
  }

  /** Per-child WCS bounding boxes used by the spatial index. */
  get wcsChildBoxes() {
    return this._wcsChildBoxes
  }

  /**
   * Returns the entities captured in {@link _sourceEntities}.
   *
   * The returned array is the live backing store (not a defensive copy).
   * Treat it as read-only unless you are extending {@link AcTrGroup} itself.
   *
   * @returns Block-definition entities and post-construction attributes that
   *   remain addressable after {@link flatten}, in registration order.
   */
  getSourceEntities(): readonly AcTrEntity[] {
    return this._sourceEntities
  }

  /**
   * Rebuilds {@link wcsChildBoxes} and the aggregate {@link wcsBbox} from
   * current entity geometry.
   *
   * Block-reference conversion through {@link AcDbRenderingCache.draw} may
   * call {@link applyMatrix} while MText/Shape bounds are still empty. An empty
   * {@link THREE.Box3} contains `±Infinity` corners; transforming those values
   * yields `NaN` and breaks spatial-index consistency checks in
   * `AcTrView2d.handleGroup`.
   *
   * This method is intended to run **after** deferred geometry is finished
   * (see `AcTrView2d.ensureGroupDrawableGeometry`). It:
   *
   * 1. Clears {@link _wcsChildBoxes}
   * 2. Recomputes one WCS axis-aligned box per tracked source entity via
   *    {@link appendSourceEntityWcsChildBox}
   * 3. Adds boxes for any {@link AcTrEntity} children still present in the
   *    flattened tree (for example attributes not represented in
   *    {@link _sourceEntities}) via {@link appendTreeEntityWcsChildBox}
   * 4. Re-synchronizes the aggregate {@link wcsBbox} through
   *    {@link syncWcsBboxFromChildBoxes}
   *
   * Coordinate rules:
   *
   * - **Insert not baked** (`matrixWorld` is not identity): source-entity
   *   `wcsBbox` values are in block-local space; they are transformed by this
   *   group's `matrixWorld`.
   * - **Insert baked** (`bakeTransformToChildren` reset the group to
   *   identity): each source entity's local `matrix` carries the baked INSERT
   *   transform and is applied instead.
   * - **Tree-resident entities** (attributes): already expressed relative to
   *   the current scene graph; their full `matrixWorld` is used.
   */
  refreshWcsChildBoxesFromChildren() {
    this._wcsChildBoxes.length = 0
    this.updateMatrixWorld(true)
    const scratch = new THREE.Box3()
    for (const entity of this._sourceEntities) {
      this.appendSourceEntityWcsChildBox(entity, scratch)
    }
    this.children.forEach(child => {
      if (
        child instanceof AcTrEntity &&
        !this._sourceEntities.includes(child)
      ) {
        this.appendTreeEntityWcsChildBox(child, scratch)
      }
    })
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * Block-reference attributes are appended after the group is constructed
   * (see AcDbRenderingCache.draw). Register their bounds for spatial indexing.
   */
  addChild(entity: AcTrEntity) {
    super.addChild(entity)
    if (
      entity.userData.layerName != null &&
      entity.userData.layerName !== '0'
    ) {
      // Block-reference attributes are appended after the group is constructed
      // (see AcDbRenderingCache.draw). Without this update, isOnTheSameLayer
      // stays true and INSERT layer-0 inheritance is applied to every child,
      // including attributes on their own layers such as title-block CARTOUCHE.
      this._isOnTheSameLayer = false
    }
    this.registerSourceEntities(entity)
    this.storeBoxes(entity)
    if (!entity.wcsBbox.isEmpty()) {
      this.wcsBbox.union(entity.wcsBbox)
    }
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * @inheritdoc
   */
  applyMatrix(matrix: AcGeMatrix3d) {
    const threeMatrix = AcTrMatrixUtil.createMatrix4(matrix)
    this._wcsChildBoxes.forEach(box => {
      if (AcTrGroup.isFiniteEntityBox(box)) {
        this.applyMatrixToEntityBox(box, threeMatrix)
      }
    })
    super.applyMatrix(matrix)
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * @inheritdoc
   */
  copy(object: AcTrGroup, recursive?: boolean) {
    this._isOnTheSameLayer = object._isOnTheSameLayer
    this._wcsChildBoxes = []
    object.wcsChildBoxes.forEach(box => this._wcsChildBoxes.push({ ...box }))
    this._sourceEntities = object._sourceEntities.map(
      entity => entity.fastDeepClone() as AcTrEntity
    )
    return super.copy(object, recursive)
  }

  /**
   * @inheritdoc
   */
  fastDeepClone() {
    const cloned = new AcTrGroup([], this.renderContext)
    cloned.copy(this, false)
    this.copyGeometry(this, cloned)
    return cloned
  }

  /**
   * Releases render resources owned by this group and its tracked source entities.
   *
   * {@link flatten} reparents drawable leaves onto {@link children} and detaches
   * the original {@link AcTrEntity} wrappers listed in {@link _sourceEntities}.
   * The base {@link AcTrEntity.dispose} walk only reaches `children`, so this
   * override first disposes detached source shells (without removing live
   * children) and then delegates to `super.dispose()` for the flattened mesh
   * tree.
   *
   * Entities still present in `children` (for example block-reference
   * attributes appended via {@link addChild}) are intentionally skipped here so
   * they are not released twice.
   */
  dispose() {
    const liveChildren = new Set(this.children)
    for (const entity of this._sourceEntities) {
      if (!liveChildren.has(entity)) {
        AcTrEntity.disposeObject(entity, false)
      }
    }
    this._sourceEntities.length = 0
    super.dispose()
  }

  /**
   * Recomputes the aggregate {@link wcsBbox} as the union of {@link _wcsChildBoxes}.
   *
   * {@link _wcsChildBoxes} is the source of truth for per-child spatial-index
   * bounds. The union taken during construction or via
   * {@link AcTrEntity.wcsBbox.union} can diverge slightly after rotated INSERT
   * transforms or when nested groups contribute mismatched metadata; this
   * method keeps the aggregate box aligned with the child-box list.
   *
   * No-op when {@link _wcsChildBoxes} is empty so an absent child list does
   * not overwrite an existing {@link wcsBbox}.
   *
   * Called from the constructor, {@link addChild}, {@link applyMatrix},
   * {@link refreshWcsChildBoxesFromChildren}, and whenever
   * {@link storeBoxes} ingests new entries.
   */
  private syncWcsBboxFromChildBoxes() {
    if (this._wcsChildBoxes.length === 0) {
      return
    }

    const union = new THREE.Box3()
    for (const box of this._wcsChildBoxes) {
      union.union(
        new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY, 0),
          new THREE.Vector3(box.maxX, box.maxY, 0)
        )
      )
    }
    this.wcsBbox = union
  }

  /**
   * Snapshots one block child's axis-aligned bounds into {@link _wcsChildBoxes}.
   *
   * Invoked while assembling a group from block-definition entities (before
   * {@link flatten}) and again when {@link addChild} registers block-reference
   * attributes. Each stored entry pairs an {@link AcDbObjectId} with a 2D WCS
   * or block-local rectangle derived from the child's {@link wcsBbox}.
   *
   * Ingestion rules:
   *
   * - **Nested {@link AcTrGroup}**: copies the inner group's existing
   *   {@link _wcsChildBoxes} entries instead of re-walking geometry, because
   *   the inner list is already normalized to leaf entities.
   * - **Leaf {@link AcTrEntity}**: reads `wcsBbox` min/max corners directly.
   * - **Empty or non-finite boxes**: skipped via {@link isFiniteEntityBox} so
   *   deferred MText/Shape geometry cannot seed `±Infinity` values that later
   *   become `NaN` during {@link applyMatrix}.
   *
   * @param object - Block-definition entity or nested group whose bounds
   *   should be recorded for spatial indexing.
   */
  private storeBoxes(object: THREE.Object3D) {
    if (object instanceof AcTrGroup) {
      object._wcsChildBoxes.forEach(box => {
        if (AcTrGroup.isFiniteEntityBox(box)) {
          this._wcsChildBoxes.push(box)
        }
      })
    } else if (object instanceof AcTrEntity) {
      if (object.wcsBbox.isEmpty()) {
        return
      }
      const box = {
        minX: object.wcsBbox.min.x,
        minY: object.wcsBbox.min.y,
        maxX: object.wcsBbox.max.x,
        maxY: object.wcsBbox.max.y,
        id: object.objectId
      }
      if (!AcTrGroup.isFiniteEntityBox(box)) {
        return
      }
      // only leaf entities should contribute to _wcsChildBoxes
      this._wcsChildBoxes.push(box)
    }
  }

  /**
   * Records leaf entities from a newly added block child into
   * {@link _sourceEntities}.
   *
   * Called from the constructor (before {@link flatten}) and from
   * {@link addChild} when {@link AcDbRenderingCache.draw} attaches attributes.
   *
   * Nested {@link AcTrGroup} instances are flattened into their own
   * {@link _sourceEntities} at construction time; this method copies that
   * inner list rather than storing the nested group wrapper, so outer groups
   * always track drawable leaves only.
   *
   * @param object - Block-definition entity or nested group being registered.
   */
  private registerSourceEntities(object: THREE.Object3D) {
    if (object instanceof AcTrGroup) {
      object.getSourceEntities().forEach(entity => {
        this._sourceEntities.push(entity)
      })
      return
    }
    if (object instanceof AcTrEntity) {
      this._sourceEntities.push(object)
    }
  }

  /**
   * Appends one WCS child box derived from a {@link _sourceEntities} entry.
   *
   * Used for entities detached from the scene graph by {@link flatten}. Their
   * {@link wcsBbox} remains in block-local coordinates until an INSERT
   * transform is applied.
   *
   * Transform selection mirrors the block-reference pipeline:
   *
   * - When this group's `matrixWorld` is identity (INSERT transform baked into
   *   children), the source entity's local {@link THREE.Object3D.matrix} is
   *   applied.
   * - Otherwise the group's `matrixWorld` (the active INSERT transform) is
   *   applied to the block-local box.
   *
   * Entries with an empty or non-finite resulting box are skipped so
   * {@link _wcsChildBoxes} never receives `NaN` extents.
   *
   * @param entity - Tracked source entity whose `wcsBbox` should be converted
   *   to WCS.
   * @param scratch - Reusable {@link THREE.Box3} used to avoid per-entity
   *   allocations during refresh.
   */
  private appendSourceEntityWcsChildBox(entity: AcTrEntity, scratch: THREE.Box3) {
    if (entity.wcsBbox.isEmpty()) {
      return
    }

    scratch.copy(entity.wcsBbox)
    entity.updateMatrixWorld(true)
    const transform = AcTrGroup.isWorldMatrixIdentity(this.matrixWorld)
      ? entity.matrix
      : this.matrixWorld
    scratch.applyMatrix4(transform)
    if (!Number.isFinite(scratch.min.x) || !Number.isFinite(scratch.max.x)) {
      return
    }

    this._wcsChildBoxes.push({
      minX: scratch.min.x,
      minY: scratch.min.y,
      maxX: scratch.max.x,
      maxY: scratch.max.y,
      id: entity.objectId
    })
  }

  /**
   * Appends one WCS child box for an {@link AcTrEntity} still present in this
   * group's flattened `children` list.
   *
   * Block-reference **attributes** added through {@link addChild} after
   * {@link AcDbRenderingCache.draw} are not removed by {@link flatten} and are
   * typically already authored in WCS. For those entities the full
   * `matrixWorld` transform is applied to `wcsBbox`.
   *
   * This path is only used when the child is **not** already listed in
   * {@link _sourceEntities}, preventing duplicate spatial-index entries.
   *
   * @param entity - Entity still attached under this group.
   * @param scratch - Reusable {@link THREE.Box3} used to avoid per-entity
   *   allocations during refresh.
   */
  private appendTreeEntityWcsChildBox(entity: AcTrEntity, scratch: THREE.Box3) {
    if (entity.wcsBbox.isEmpty()) {
      return
    }

    entity.updateMatrixWorld(true)
    scratch.copy(entity.wcsBbox)
    scratch.applyMatrix4(entity.matrixWorld)
    if (!Number.isFinite(scratch.min.x) || !Number.isFinite(scratch.max.x)) {
      return
    }

    this._wcsChildBoxes.push({
      minX: scratch.min.x,
      minY: scratch.min.y,
      maxX: scratch.max.x,
      maxY: scratch.max.y,
      id: entity.objectId
    })
  }

  /**
   * Tests whether a world matrix is effectively identity.
   *
   * {@link AcDbRenderingCache.draw} calls {@link bakeTransformToChildren}
   * when a block reference carries attributes. That path resets the group's
   * transform to identity while baking the INSERT matrix into each child.
   * {@link refreshWcsChildBoxesFromChildren} uses this helper to decide
   * whether to apply the group `matrixWorld` or each source entity's local
   * `matrix` when rebuilding {@link _wcsChildBoxes}.
   *
   * Comparison uses a fixed epsilon (`1e-6`) on all 16 matrix elements.
   *
   * @param matrix - World matrix to test, typically `this.matrixWorld`.
   * @returns `true` when the matrix matches identity within tolerance.
   */
  private static isWorldMatrixIdentity(matrix: THREE.Matrix4) {
    const identity = new THREE.Matrix4()
    for (let i = 0; i < 16; ++i) {
      if (Math.abs(matrix.elements[i] - identity.elements[i]) > 1e-6) {
        return false
      }
    }
    return true
  }

  /**
   * Tests whether a spatial-index child box contains only finite coordinates.
   *
   * Empty or deferred geometry snapshots produce `±Infinity` corners in
   * {@link THREE.Box3}. {@link applyMatrix} and
   * {@link applyMatrixToEntityBox} must ignore those entries; otherwise
   * INSERT transforms propagate `NaN` into {@link _wcsChildBoxes} and the
   * aggregate {@link wcsBbox}.
   *
   * Also used by {@link storeBoxes} and {@link applyMatrix} to filter invalid
   * boxes at ingestion time.
   *
   * @param box - Axis-aligned 2D bounds candidate in WCS or block-local space.
   * @returns `true` when all four corners are finite numbers.
   */
  private static isFiniteEntityBox(box: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }) {
    return (
      Number.isFinite(box.minX) &&
      Number.isFinite(box.minY) &&
      Number.isFinite(box.maxX) &&
      Number.isFinite(box.maxY)
    )
  }

  /**
   * Transforms one {@link _wcsChildBoxes} entry by a 3×3 INSERT matrix and
   * writes back a new axis-aligned rectangle.
   *
   * Unlike {@link THREE.Box3.applyMatrix4}, which can expand an AABB after
   * rotation, this helper transforms all four XY corners explicitly and
   * recomputes the tight axis-aligned bounds — matching how block-reference
   * child boxes are expected to behave in the spatial index.
   *
   * The input box is mutated in place. Callers must guard with
   * {@link isFiniteEntityBox} before invoking so invalid snapshots are not
   * propagated.
   *
   * @param box - Child spatial-index rectangle to transform; updated in place.
   * @param matrix - INSERT transform as a {@link THREE.Matrix4}, typically
   *   derived from {@link AcGeMatrix3d} via {@link AcTrMatrixUtil.createMatrix4}.
   */
  private applyMatrixToEntityBox(box: AcTrEntityBox, matrix: THREE.Matrix4) {
    const points = [
      new THREE.Vector3(box.minX, box.minY, 0),
      new THREE.Vector3(box.maxX, box.minY, 0),
      new THREE.Vector3(box.maxX, box.maxY, 0),
      new THREE.Vector3(box.minX, box.maxY, 0)
    ]

    // Apply matrix to all corners
    for (const p of points) {
      p.applyMatrix4(matrix)
    }

    // Recompute AABB
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    box.minX = minX
    box.minY = minY
    box.maxX = maxX
    box.maxY = maxY
  }
}
