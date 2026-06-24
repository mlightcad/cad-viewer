import * as THREE from 'three'

import { disposePreviewSubset } from '../batch/AcTrBatchedGroup'
import { getEntityPreviewRootUserData } from '../util/AcTrObjectUserData'

let previewHandleCounter = 0

/**
 * Stable handle for one registered preview overlay.
 */
export interface AcTrBatchedPreviewHandle {
  /** Unique id used with {@link AcTrPreviewOverlayManager.update} and {@link AcTrPreviewOverlayManager.remove}. */
  id: string
  /** Three.js root group containing extracted preview drawables. */
  root: THREE.Group
}

/**
 * Manages batched preview overlay roots in the Three.js scene.
 *
 * Preview overlays reuse GPU-resident geometry extracted from
 * {@link AcTrBatchedGroup} instead of rebuilding transient entities each frame.
 */
export class AcTrPreviewOverlayManager {
  /** Scene container that holds all active preview overlay roots. */
  private readonly previewGroup: THREE.Group

  /** Mapping from preview handle id to registered overlay metadata. */
  private readonly handles: Map<string, AcTrBatchedPreviewHandle>

  /**
   * Creates the preview overlay group and attaches it to the scene.
   *
   * @param scene - Scene that owns the preview overlay container
   */
  constructor(scene: THREE.Scene) {
    this.previewGroup = new THREE.Group()
    this.previewGroup.name = 'Entity_Preview_Group'
    scene.add(this.previewGroup)
    this.handles = new Map()
  }

  /**
   * Registers one preview overlay and attaches it to the scene.
   *
   * @param root - Preview root group built from batched layer subsets
   * @returns Handle that identifies the overlay for later updates and removal
   */
  add(root: THREE.Group): AcTrBatchedPreviewHandle {
    getEntityPreviewRootUserData(root).entityPreviewRoot = true
    const handle: AcTrBatchedPreviewHandle = {
      id: `entity-preview-${++previewHandleCounter}`,
      root
    }
    this.handles.set(handle.id, handle)
    this.previewGroup.add(root)
    return handle
  }

  /**
   * Applies a world-space transform to one preview overlay root.
   *
   * @param handleId - Preview handle returned by {@link add}
   * @param matrix - World transform copied onto the overlay root
   * @returns `true` when the handle exists and the transform was applied
   */
  update(handleId: string, matrix: THREE.Matrix4): boolean {
    const handle = this.handles.get(handleId)
    if (!handle) {
      return false
    }

    if (handle.root.matrix.equals(matrix)) {
      return false
    }

    handle.root.matrix.copy(matrix)
    handle.root.matrixAutoUpdate = false
    handle.root.updateMatrixWorld(true)
    return true
  }

  /**
   * Removes and disposes one preview overlay.
   *
   * @param handleId - Preview handle returned by {@link add}
   * @returns `true` when the handle existed and was removed
   */
  remove(handleId: string): boolean {
    const handle = this.handles.get(handleId)
    if (!handle) {
      return false
    }

    this.previewGroup.remove(handle.root)
    disposePreviewSubset(handle.root)
    this.handles.delete(handleId)
    return true
  }

  /**
   * Removes every preview overlay.
   */
  clear(): void {
    for (const handleId of [...this.handles.keys()]) {
      this.remove(handleId)
    }
  }

  /**
   * Destroys the manager and releases preview resources.
   */
  dispose(): void {
    this.clear()
    this.previewGroup.removeFromParent()
  }
}
