import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import type {
  AcTrMaterialRuntimeUserData,
  AcTrRteObjectUserData
} from './AcTrObjectUserData'

const RTE_CAMERA_WORLD_POSITION = 'uAcTrCameraWorldPosition'
const RTE_RELATIVE_WORLD_POSITION = 'uAcTrRelativeWorldPosition'
const RTE_VIEW_ROTATION_MATRIX = 'uAcTrViewRotationMatrix'
const RTE_USE_SPLIT_TRANSLATION = 'uAcTrUseSplitTranslation'
const RTE_PROGRAM_KEY = 'acTrRte:v3'
export const RTE_REBASE_THRESHOLD = 1e5
const _rayOriginOffsets = new WeakMap<THREE.Raycaster, THREE.Vector3>()

function rteUserData(object: THREE.Object3D): AcTrRteObjectUserData {
  return object.userData as AcTrRteObjectUserData
}

function materialRuntimeUserData(
  material: THREE.Material
): AcTrMaterialRuntimeUserData {
  return material.userData as AcTrMaterialRuntimeUserData
}

export function shouldUseSplitTranslation(object: THREE.Object3D) {
  if (rteUserData(object).useSplitTranslation) {
    return true
  }

  object.getWorldPosition(_objectWorldPosition)
  return (
    Math.max(
      Math.abs(_objectWorldPosition.x),
      Math.abs(_objectWorldPosition.y),
      Math.abs(_objectWorldPosition.z)
    ) >= RTE_REBASE_THRESHOLD
  )
}

type RteShader = {
  uniforms: Record<string, { value: unknown }> & {
    [RTE_CAMERA_WORLD_POSITION]: { value: THREE.Vector3 }
    [RTE_RELATIVE_WORLD_POSITION]: { value: THREE.Vector3 }
    [RTE_VIEW_ROTATION_MATRIX]: { value: THREE.Matrix4 }
    [RTE_USE_SPLIT_TRANSLATION]: { value: number }
  }
  vertexShader: string
}

const _cameraWorldPosition = /*@__PURE__*/ new THREE.Vector3()
const _objectWorldPosition = /*@__PURE__*/ new THREE.Vector3()
const _relativeWorldPosition = /*@__PURE__*/ new THREE.Vector3()
const _viewRotationMatrix = /*@__PURE__*/ new THREE.Matrix4()
const _rebaseCenter = /*@__PURE__*/ new THREE.Vector3()
const _rebaseOffset = /*@__PURE__*/ new THREE.Vector3()
const _box = /*@__PURE__*/ new THREE.Box3()

/**
 * Adds a Relative-To-Eye shader patch to renderables that still need to draw in
 * large world-coordinate scenes.
 */
export class AcTrRelativeToEyeUtil {
  /**
   * Prepares the scene for RTE rendering. Returns `true` when new shader
   * patches or geometry rebases were applied and another frame should render.
   */
  static prepareScene(scene: THREE.Object3D): boolean {
    let needsRedraw = false
    scene.traverse(object => {
      if (!('material' in object) || object.material == null) {
        return
      }

      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry
        material: THREE.Material | THREE.Material[]
      }

      if (this.rebaseGeometryIfNeeded(renderable)) {
        needsRedraw = true
      }
      if (this.enableForObject(renderable)) {
        needsRedraw = true
      }
    })
    return needsRedraw
  }

  /**
   * Rebases the pick ray into camera-relative space so float32 ray/object
   * intersection stays stable at large CAD world coordinates.
   */
  static prepareRaycaster(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera
  ): void {
    camera.getWorldPosition(_cameraWorldPosition)
    if (
      Math.max(
        Math.abs(_cameraWorldPosition.x),
        Math.abs(_cameraWorldPosition.y),
        Math.abs(_cameraWorldPosition.z)
      ) < RTE_REBASE_THRESHOLD
    ) {
      _rayOriginOffsets.delete(raycaster)
      return
    }

    let offset = _rayOriginOffsets.get(raycaster)
    if (!offset) {
      offset = new THREE.Vector3()
      _rayOriginOffsets.set(raycaster, offset)
    }
    offset.copy(_cameraWorldPosition)
    raycaster.ray.origin.sub(_cameraWorldPosition)
  }

  static getRayOriginOffset(
    raycaster?: THREE.Raycaster
  ): THREE.Vector3 | undefined {
    if (!raycaster) {
      return undefined
    }
    return _rayOriginOffsets.get(raycaster)
  }

  static applyPickBoundingBox(
    box: THREE.Box3,
    object: THREE.Object3D,
    raycaster: THREE.Raycaster
  ): void {
    box.applyMatrix4(object.matrixWorld)
    const offset = this.getRayOriginOffset(raycaster)
    if (offset) {
      box.min.sub(offset)
      box.max.sub(offset)
    }
  }

  static copyRelativePosition(
    worldPosition: THREE.Vector3,
    raycaster: THREE.Raycaster | undefined,
    target: THREE.Vector3
  ): THREE.Vector3 {
    const offset = raycaster ? this.getRayOriginOffset(raycaster) : undefined
    if (offset) {
      return target.copy(worldPosition).sub(offset)
    }
    return target.copy(worldPosition)
  }

  static enableForObject(
    object: THREE.Object3D & {
      material?: THREE.Material | THREE.Material[]
    }
  ): boolean {
    if (rteUserData(object).relativeToEyeEnabled) {
      return false
    }

    if (object.material) {
      this.ensureMaterialPatched(object.material)
    }

    const previousOnBeforeRender = object.onBeforeRender
    object.onBeforeRender = function (
      renderer,
      scene,
      camera,
      geometry,
      material,
      group
    ) {
      previousOnBeforeRender.call(
        this,
        renderer,
        scene,
        camera,
        geometry,
        material,
        group
      )

      AcTrRelativeToEyeUtil.ensureMaterialPatched(material)
      AcTrRelativeToEyeUtil.updateUniforms(
        this as THREE.Object3D,
        material,
        camera
      )
    }

    rteUserData(object).relativeToEyeEnabled = true
    return true
  }

  private static ensureMaterialPatched(
    material: THREE.Material | THREE.Material[]
  ): boolean {
    if (Array.isArray(material)) {
      let patched = false
      material.forEach(item => {
        if (this.ensureMaterialPatched(item)) {
          patched = true
        }
      })
      return patched
    }

    const materialData = materialRuntimeUserData(material)
    if (materialData.relativeToEyePatchVersion === RTE_PROGRAM_KEY) {
      return false
    }

    const previousOnBeforeCompile = material.onBeforeCompile.bind(material)
    const previousCustomProgramCacheKey =
      material.customProgramCacheKey?.bind(material)
    const isLineMaterial = material instanceof LineMaterial

    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile(shader, renderer)
      this.ensureShaderUniforms(shader)
      shader.vertexShader = isLineMaterial
        ? this.patchLineMaterialVertexShader(shader.vertexShader)
        : this.patchProjectVertexShader(shader.vertexShader)
      materialData.relativeToEyeCompiledShader = shader
    }

    material.customProgramCacheKey = () => {
      const previousKey = previousCustomProgramCacheKey?.() ?? ''
      const mode = isLineMaterial ? 'line' : 'project'
      return `${previousKey}|${RTE_PROGRAM_KEY}:${mode}`
    }

    materialData.relativeToEyePatchVersion = RTE_PROGRAM_KEY
    material.needsUpdate = true
    return true
  }

  private static updateUniforms(
    object: THREE.Object3D,
    material: THREE.Material | THREE.Material[],
    camera: THREE.Camera
  ) {
    if (Array.isArray(material)) {
      material.forEach(item => this.updateUniforms(object, item, camera))
      return
    }

    const shader = materialRuntimeUserData(material)
      .relativeToEyeCompiledShader as RteShader | undefined
    if (!shader) {
      return
    }

    this.ensureShaderUniforms(shader)

    camera.getWorldPosition(_cameraWorldPosition)
    _objectWorldPosition.setFromMatrixPosition(object.matrixWorld)
    _relativeWorldPosition.copy(_objectWorldPosition).sub(_cameraWorldPosition)
    _viewRotationMatrix.copy(camera.matrixWorldInverse)
    _viewRotationMatrix.setPosition(0, 0, 0)

    shader.uniforms[RTE_CAMERA_WORLD_POSITION].value.copy(_cameraWorldPosition)
    shader.uniforms[RTE_RELATIVE_WORLD_POSITION].value.copy(
      _relativeWorldPosition
    )
    shader.uniforms[RTE_VIEW_ROTATION_MATRIX].value.copy(_viewRotationMatrix)
    shader.uniforms[RTE_USE_SPLIT_TRANSLATION].value =
      shouldUseSplitTranslation(object) ? 1 : 0
  }

  private static ensureShaderUniforms(shader: {
    uniforms: Record<string, { value: unknown }>
  }) {
    const uniforms = shader.uniforms as RteShader['uniforms']
    uniforms[RTE_CAMERA_WORLD_POSITION] ??= { value: new THREE.Vector3() }
    uniforms[RTE_RELATIVE_WORLD_POSITION] ??= { value: new THREE.Vector3() }
    uniforms[RTE_VIEW_ROTATION_MATRIX] ??= { value: new THREE.Matrix4() }
    uniforms[RTE_USE_SPLIT_TRANSLATION] ??= { value: 0 }

    if (!(uniforms[RTE_CAMERA_WORLD_POSITION].value instanceof THREE.Vector3)) {
      uniforms[RTE_CAMERA_WORLD_POSITION].value = new THREE.Vector3()
    }
    if (
      !(uniforms[RTE_RELATIVE_WORLD_POSITION].value instanceof THREE.Vector3)
    ) {
      uniforms[RTE_RELATIVE_WORLD_POSITION].value = new THREE.Vector3()
    }
    if (!(uniforms[RTE_VIEW_ROTATION_MATRIX].value instanceof THREE.Matrix4)) {
      uniforms[RTE_VIEW_ROTATION_MATRIX].value = new THREE.Matrix4()
    }
    if (typeof uniforms[RTE_USE_SPLIT_TRANSLATION].value !== 'number') {
      uniforms[RTE_USE_SPLIT_TRANSLATION].value = 0
    }
  }

  private static patchProjectVertexShader(vertexShader: string) {
    const source = this.ensureUniformDeclarations(vertexShader)
    if (!source.includes('#include <project_vertex>')) {
      return source
    }

    return source.replace(
      '#include <project_vertex>',
      /* glsl */ `
        vec4 mvPosition = vec4( transformed, 1.0 );

        #ifdef USE_BATCHING
          mvPosition = batchingMatrix * mvPosition;
        #endif

        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif

        vec3 acTrRelativePositionDefault =
          ( modelMatrix * mvPosition ).xyz - ${RTE_CAMERA_WORLD_POSITION};
        mat4 acTrModelMatrixNoTranslation = modelMatrix;
        acTrModelMatrixNoTranslation[3].xyz = vec3( 0.0 );
        vec3 acTrRelativePositionSplit =
          ( acTrModelMatrixNoTranslation * mvPosition ).xyz +
          ${RTE_RELATIVE_WORLD_POSITION};
        vec3 acTrRelativePosition = mix(
          acTrRelativePositionDefault,
          acTrRelativePositionSplit,
          ${RTE_USE_SPLIT_TRANSLATION}
        );
        mvPosition =
          ${RTE_VIEW_ROTATION_MATRIX} * vec4( acTrRelativePosition, 1.0 );

        gl_Position = projectionMatrix * mvPosition;
      `
    )
  }

  private static patchLineMaterialVertexShader(vertexShader: string) {
    const source = this.ensureUniformDeclarations(vertexShader)
    return source
      .replace(
        'vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );',
        /* glsl */ `
          vec3 acTrRelativeStartDefault =
            ( modelMatrix * vec4( instanceStart, 1.0 ) ).xyz -
            ${RTE_CAMERA_WORLD_POSITION};
          mat4 acTrModelMatrixNoTranslationStart = modelMatrix;
          acTrModelMatrixNoTranslationStart[3].xyz = vec3( 0.0 );
          vec3 acTrRelativeStartSplit =
            ( acTrModelMatrixNoTranslationStart * vec4( instanceStart, 1.0 ) ).xyz +
            ${RTE_RELATIVE_WORLD_POSITION};
          vec4 start = ${RTE_VIEW_ROTATION_MATRIX} * vec4(
            mix(
              acTrRelativeStartDefault,
              acTrRelativeStartSplit,
              ${RTE_USE_SPLIT_TRANSLATION}
            ),
            1.0
          );
        `
      )
      .replace(
        'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
        /* glsl */ `
          vec3 acTrRelativeEndDefault =
            ( modelMatrix * vec4( instanceEnd, 1.0 ) ).xyz -
            ${RTE_CAMERA_WORLD_POSITION};
          mat4 acTrModelMatrixNoTranslationEnd = modelMatrix;
          acTrModelMatrixNoTranslationEnd[3].xyz = vec3( 0.0 );
          vec3 acTrRelativeEndSplit =
            ( acTrModelMatrixNoTranslationEnd * vec4( instanceEnd, 1.0 ) ).xyz +
            ${RTE_RELATIVE_WORLD_POSITION};
          vec4 end = ${RTE_VIEW_ROTATION_MATRIX} * vec4(
            mix(
              acTrRelativeEndDefault,
              acTrRelativeEndSplit,
              ${RTE_USE_SPLIT_TRANSLATION}
            ),
            1.0
          );
        `
      )
  }

  private static ensureUniformDeclarations(vertexShader: string) {
    if (
      vertexShader.includes(`uniform vec3 ${RTE_CAMERA_WORLD_POSITION};`) &&
      vertexShader.includes(`uniform vec3 ${RTE_RELATIVE_WORLD_POSITION};`) &&
      vertexShader.includes(`uniform mat4 ${RTE_VIEW_ROTATION_MATRIX};`) &&
      vertexShader.includes(`uniform float ${RTE_USE_SPLIT_TRANSLATION};`)
    ) {
      return vertexShader
    }

    return /* glsl */ `
uniform vec3 ${RTE_CAMERA_WORLD_POSITION};
uniform vec3 ${RTE_RELATIVE_WORLD_POSITION};
uniform mat4 ${RTE_VIEW_ROTATION_MATRIX};
uniform float ${RTE_USE_SPLIT_TRANSLATION};
${vertexShader}`
  }

  private static rebaseGeometryIfNeeded(
    object: THREE.Object3D & {
      geometry?: THREE.BufferGeometry
      material?: THREE.Material | THREE.Material[]
      userData: Record<string, unknown>
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      scale: THREE.Vector3
    }
  ): boolean {
    const userData = rteUserData(object)
    if (userData.geometryRebased) {
      return false
    }

    // Text-like objects that rely on split-translation keep their local geometry
    // untouched and let the shader handle the large world offset.
    if (userData.useSplitTranslation) {
      userData.geometryRebased = true
      return false
    }

    const geometry = object.geometry
    if (!geometry) {
      return false
    }

    const center = this.getGeometryCenter(geometry, _rebaseCenter)
    if (!center) {
      return false
    }

    const maxAbs = Math.max(
      Math.abs(center.x),
      Math.abs(center.y),
      Math.abs(center.z)
    )
    if (maxAbs < RTE_REBASE_THRESHOLD) {
      userData.geometryRebased = true
      return false
    }

    this.translateGeometry(geometry, center.clone().multiplyScalar(-1))
    this.translateObjectLocalOrigin(object, center)
    this.translateLocalLayoutData(object, center.clone().multiplyScalar(-1))
    userData.useSplitTranslation = true

    geometry.boundingBox = null
    geometry.boundingSphere = null
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    delete userData.layoutCache
    userData.geometryRebased = true
    return true
  }

  private static getGeometryCenter(
    geometry: THREE.BufferGeometry,
    target: THREE.Vector3
  ) {
    if (
      geometry.hasAttribute('instanceStart') &&
      geometry.hasAttribute('instanceEnd')
    ) {
      const start = geometry.getAttribute('instanceStart')
      const end = geometry.getAttribute('instanceEnd')
      _box.makeEmpty()
      for (let i = 0; i < start.count; i++) {
        _box.expandByPoint(target.fromBufferAttribute(start, i))
        _box.expandByPoint(target.fromBufferAttribute(end, i))
      }
      return _box.isEmpty() ? null : _box.getCenter(target)
    }

    if (!geometry.boundingBox) {
      geometry.computeBoundingBox()
    }
    return geometry.boundingBox ? geometry.boundingBox.getCenter(target) : null
  }

  private static translateGeometry(
    geometry: THREE.BufferGeometry,
    offset: THREE.Vector3
  ) {
    if (
      geometry.hasAttribute('instanceStart') &&
      geometry.hasAttribute('instanceEnd')
    ) {
      this.translateAttribute(geometry.getAttribute('instanceStart'), offset)
      this.translateAttribute(geometry.getAttribute('instanceEnd'), offset)
      return
    }

    geometry.translate(offset.x, offset.y, offset.z)
  }

  private static translateAttribute(
    attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    offset: THREE.Vector3
  ) {
    for (let i = 0; i < attribute.count; i++) {
      attribute.setXYZ(
        i,
        attribute.getX(i) + offset.x,
        attribute.getY(i) + offset.y,
        attribute.getZ(i) + offset.z
      )
    }
    attribute.needsUpdate = true
  }

  private static translateObjectLocalOrigin(
    object: THREE.Object3D & {
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      scale: THREE.Vector3
    },
    center: THREE.Vector3
  ) {
    _rebaseOffset
      .copy(center)
      .multiply(object.scale)
      .applyQuaternion(object.quaternion)
    object.position.add(_rebaseOffset)
    object.updateMatrix()
    object.updateMatrixWorld(true)
  }

  private static translateLocalLayoutData(
    object: THREE.Object3D & { userData: Record<string, unknown> },
    offset: THREE.Vector3
  ) {
    const layout = object.userData.layout as
      | { chars?: Array<{ box?: THREE.Box3; children?: unknown[] }> }
      | undefined
    layout?.chars?.forEach(char => this.translateCharBoxTree(char, offset))

    const lineLayouts = object.userData.lineLayouts as
      | Array<{ y: number }>
      | undefined
    if (lineLayouts) {
      lineLayouts.forEach(line => {
        line.y += offset.y
      })
    }
  }

  private static translateCharBoxTree(
    node: { box?: THREE.Box3; children?: unknown[] },
    offset: THREE.Vector3
  ) {
    if (node.box instanceof THREE.Box3) {
      node.box.translate(offset)
    }
    const children = node.children as
      | Array<{ box?: THREE.Box3; children?: unknown[] }>
      | undefined
    children?.forEach(child => this.translateCharBoxTree(child, offset))
  }
}
