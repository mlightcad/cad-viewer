import * as THREE from 'three'

/**
 * Annotation-scale metadata written by `@mlightcad/data-model` onto annotative
 * drawables (see `AcDbAnnotationScaleDrawInfo`).
 */
export interface AcTrAnnotationScaleUserData {
  drawnScaleFactor: number
  drawnScaleName?: string
  supportedScaleFactors: number[]
  supportedScaleNames: string[]
}

export interface AcTrAnnotationScalePassOptions {
  /** Viewport annotation scale factor (`drawing/paper`). */
  annotationScaleFactor: number
  /** When false, hide annotative objects that do not support the scale. */
  annoAllVisible?: boolean
}

type AnnotationRestore = {
  object: THREE.Object3D
  visible: boolean
  scale: THREE.Vector3
  matrix: THREE.Matrix4
  matrixWorld: THREE.Matrix4
  matrixAutoUpdate: boolean
  matrixWorldNeedsUpdate: boolean
  /** Child world matrices that must be restored with the root. */
  childWorld: Array<{ object: THREE.Object3D; matrixWorld: THREE.Matrix4 }>
}

const _scaleMat = /*@__PURE__*/ new THREE.Matrix4()

function readAnnotationScale(
  object: THREE.Object3D
): AcTrAnnotationScaleUserData | undefined {
  const raw = (object.userData as { annotationScale?: unknown }).annotationScale
  if (!raw || typeof raw !== 'object') return undefined
  const info = raw as AcTrAnnotationScaleUserData
  if (!(info.drawnScaleFactor > 0)) return undefined
  if (!Array.isArray(info.supportedScaleFactors)) return undefined
  return info
}

function supportsScale(
  info: AcTrAnnotationScaleUserData,
  scaleFactor: number
): boolean {
  return info.supportedScaleFactors.some(
    factor => Math.abs(factor - scaleFactor) < 1e-9
  )
}

function captureRestoreState(object: THREE.Object3D): AnnotationRestore {
  const childWorld: AnnotationRestore['childWorld'] = []
  object.traverse(child => {
    if (child === object) return
    childWorld.push({
      object: child,
      matrixWorld: child.matrixWorld.clone()
    })
  })
  return {
    object,
    visible: object.visible,
    scale: object.scale.clone(),
    matrix: object.matrix.clone(),
    matrixWorld: object.matrixWorld.clone(),
    matrixAutoUpdate: object.matrixAutoUpdate,
    matrixWorldNeedsUpdate: object.matrixWorldNeedsUpdate,
    childWorld
  }
}

/**
 * Uniformly scales `object` about its local origin by `ratio`.
 *
 * Unbatched paper-space clones bake the world matrix into
 * {@link THREE.Object3D.matrix} with `matrixAutoUpdate = false`, so mutating
 * `.scale` alone has no effect — the baked matrix (and descendant
 * `matrixWorld` values) must be updated instead.
 */
function applyUniformScaleAboutOrigin(
  object: THREE.Object3D,
  ratio: number
): void {
  if (object.matrixAutoUpdate) {
    object.scale.multiplyScalar(ratio)
    object.updateMatrix()
    object.updateMatrixWorld(true)
    return
  }

  _scaleMat.makeScale(ratio, ratio, 1)
  object.matrix.multiply(_scaleMat)
  object.matrixWorld.multiply(_scaleMat)
  // Children keep local matrices; refresh world matrices from the scaled root
  // without calling updateMatrixWorld (which would re-parent a baked world
  // matrix through a non-identity parent and double-apply transforms).
  object.traverse(child => {
    if (child === object || !child.parent) return
    child.matrixWorld.multiplyMatrices(child.parent.matrixWorld, child.matrix)
  })
}

function restoreAnnotationState(entry: AnnotationRestore): void {
  const { object } = entry
  object.visible = entry.visible
  object.scale.copy(entry.scale)
  object.matrixAutoUpdate = entry.matrixAutoUpdate
  object.matrix.copy(entry.matrix)
  object.matrixWorld.copy(entry.matrixWorld)
  object.matrixWorldNeedsUpdate = entry.matrixWorldNeedsUpdate
  for (const child of entry.childWorld) {
    child.object.matrixWorld.copy(child.matrixWorld)
  }
}

/**
 * Temporarily adjusts annotative drawables in `scene` for one viewport pass.
 *
 * Matching scales are uniformly resized around their local origin so the
 * paper height stays constant across viewports. Unsupported objects are hidden
 * when `annoAllVisible` is false.
 *
 * @returns Restore callback that must run after the render pass.
 */
export function applyAnnotationScalePass(
  scene: THREE.Object3D,
  options: AcTrAnnotationScalePassOptions
): () => void {
  const scaleFactor = options.annotationScaleFactor
  if (!(scaleFactor > 0)) return () => {}

  // AutoCAD ANNOALLVISIBLE defaults to on (show unsupported annotations).
  const annoAllVisible = options.annoAllVisible !== false
  const restored: AnnotationRestore[] = []

  scene.traverse(object => {
    const info = readAnnotationScale(object)
    if (!info) return

    restored.push(captureRestoreState(object))

    if (!supportsScale(info, scaleFactor)) {
      if (!annoAllVisible) {
        object.visible = false
      }
      return
    }

    const ratio = scaleFactor / info.drawnScaleFactor
    if (Math.abs(ratio - 1) < 1e-9) return

    applyUniformScaleAboutOrigin(object, ratio)
  })

  return () => {
    for (const entry of restored) {
      restoreAnnotationState(entry)
    }
  }
}

/**
 * Returns true when `object` (or any descendant) carries annotation-scale
 * metadata. Used by tests and diagnostics.
 */
export function hasAnnotationScaleUserData(object: THREE.Object3D): boolean {
  let found = false
  object.traverse(child => {
    if (!found && readAnnotationScale(child)) found = true
  })
  return found
}
