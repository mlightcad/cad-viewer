import * as THREE from 'three'

import {
  HIGHLIGHT_HOVER_COLOR,
  HIGHLIGHT_SELECT_COLOR
} from '../../util/AcTrMaterialUtil'
import { getMaterialRuntimeUserData } from '../../util/AcTrObjectUserData'
import { AcTrBatchHighlightState } from './AcTrBatchHighlightState'

/** Uniform bag injected into batch highlight shader programs. */
export type AcTrBatchHighlightUniforms = {
  /** RGBA mask texture: R = selected, G = hovered. */
  u_highlightMask: { value: THREE.Texture }
  /** Mask texture width and height in pixels. */
  u_highlightMaskSize: { value: THREE.Vector2 }
  /** Fragment color applied when the slot is selected. */
  u_highlightSelectColor: { value: THREE.Color }
  /** Fragment color applied when the slot is hovered. */
  u_highlightHoverColor: { value: THREE.Color }
}

const HIGHLIGHT_FRAGMENT_DECL = /* glsl */ `
uniform sampler2D u_highlightMask;
uniform vec2 u_highlightMaskSize;
uniform vec3 u_highlightSelectColor;
uniform vec3 u_highlightHoverColor;
varying float vBatchSlotId;

vec3 applyBatchHighlight(vec3 color) {
  if (u_highlightMaskSize.x <= 0.0 || u_highlightMaskSize.y <= 0.0) {
    return color;
  }
  vec2 maskUv = vec2(
    (mod(vBatchSlotId, u_highlightMaskSize.x) + 0.5) / u_highlightMaskSize.x,
    (floor(vBatchSlotId / u_highlightMaskSize.x) + 0.5) / u_highlightMaskSize.y
  );
  vec4 mask = texture2D(u_highlightMask, maskUv);
  if (mask.r > 0.5) {
    return u_highlightSelectColor;
  }
  if (mask.g > 0.5) {
    return u_highlightHoverColor;
  }
  return color;
}
`

const EMPTY_HIGHLIGHT_MASK = /*@__PURE__*/ (() => {
  const texture = new THREE.DataTexture(
    new Uint8Array(4),
    1,
    1,
    THREE.RGBAFormat
  )
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
})()

const warnedUnpatchedMaterials = new Set<string>()

/**
 * Creates default highlight uniform values backed by a 1×1 empty mask texture.
 *
 * @returns Fresh uniform bag for one material instance.
 */
function createHighlightUniforms(): AcTrBatchHighlightUniforms {
  return {
    u_highlightMask: { value: EMPTY_HIGHLIGHT_MASK },
    u_highlightMaskSize: { value: new THREE.Vector2(1, 1) },
    u_highlightSelectColor: { value: HIGHLIGHT_SELECT_COLOR.clone() },
    u_highlightHoverColor: { value: HIGHLIGHT_HOVER_COLOR.clone() }
  }
}

/**
 * Returns persistent highlight uniforms stored on material runtime userData.
 *
 * @param material - Material whose compiled program receives highlight uniforms.
 * @returns Shared uniform bag for the material.
 */
function getOrCreateHighlightUniforms(
  material: THREE.Material
): AcTrBatchHighlightUniforms {
  const runtime = getMaterialRuntimeUserData(material)
  if (!runtime.batchHighlightUniforms) {
    runtime.batchHighlightUniforms = createHighlightUniforms()
  }
  return runtime.batchHighlightUniforms as AcTrBatchHighlightUniforms
}

/**
 * Injects the `slotId` attribute and `vBatchSlotId` varying into a vertex shader.
 *
 * @param source - Original vertex shader source.
 * @returns Patched vertex shader that forwards the batch slot id to the fragment stage.
 */
function injectVertexSlotId(source: string) {
  if (source.includes('vBatchSlotId')) {
    return source
  }

  let vertexShader = source
  if (vertexShader.includes('#include <common>')) {
    vertexShader = vertexShader.replace(
      '#include <common>',
      `#include <common>
attribute float slotId;
varying float vBatchSlotId;`
    )
  } else {
    vertexShader = `attribute float slotId;
varying float vBatchSlotId;
${vertexShader}`
  }

  if (vertexShader.includes('#include <begin_vertex>')) {
    return vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vBatchSlotId = slotId;`
    )
  }

  if (vertexShader.includes('void main() {')) {
    return vertexShader.replace(
      'void main() {',
      `void main() {
vBatchSlotId = slotId;`
    )
  }

  return vertexShader
}

/**
 * Injects highlight sampling helpers and applies tinting before final color output.
 *
 * @param source - Original fragment shader source.
 * @returns Patched fragment shader and whether highlight application was wired in.
 */
function injectFragmentHighlight(source: string): {
  source: string
  injected: boolean
} {
  if (
    source.includes('applyBatchHighlight(gl_FragColor.rgb)') ||
    source.includes('applyBatchHighlight(diffuseColor.rgb)')
  ) {
    return { source, injected: true }
  }

  const fragmentShader = source.includes('applyBatchHighlight')
    ? source
    : HIGHLIGHT_FRAGMENT_DECL + source

  const applySnippet =
    'gl_FragColor.rgb = applyBatchHighlight(gl_FragColor.rgb);'

  if (fragmentShader.includes('#include <dithering_fragment>')) {
    return {
      source: fragmentShader.replace(
        '#include <dithering_fragment>',
        `${applySnippet}
#include <dithering_fragment>`
      ),
      injected: true
    }
  }

  if (fragmentShader.includes('#include <colorspace_fragment>')) {
    return {
      source: fragmentShader.split('#include <colorspace_fragment>').join(
        `${applySnippet}
#include <colorspace_fragment>`
      ),
      injected: true
    }
  }

  if (fragmentShader.includes('#include <tonemapping_fragment>')) {
    return {
      source: fragmentShader.replace(
        '#include <tonemapping_fragment>',
        `${applySnippet}
#include <tonemapping_fragment>`
      ),
      injected: true
    }
  }

  if (
    fragmentShader.includes('gl_FragColor = vec4( diffuseColor.rgb, alpha );')
  ) {
    return {
      source: fragmentShader.replace(
        'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
        'gl_FragColor = vec4( applyBatchHighlight(diffuseColor.rgb), alpha );'
      ),
      injected: true
    }
  }

  if (
    fragmentShader.includes('gl_FragColor = vec4( diffuseColor.rgb, opacity );')
  ) {
    return {
      source: fragmentShader.replace(
        'gl_FragColor = vec4( diffuseColor.rgb, opacity );',
        'gl_FragColor = vec4( applyBatchHighlight(diffuseColor.rgb), opacity );'
      ),
      injected: true
    }
  }

  return { source, injected: false }
}

/**
 * Logs a one-time development warning when highlight injection fails.
 *
 * @param material - Material whose fragment shader could not be patched.
 */
function warnUnpatchedHighlightMaterial(material: THREE.Material) {
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'production'
  ) {
    return
  }

  const key = material.type
  if (warnedUnpatchedMaterials.has(key)) {
    return
  }
  warnedUnpatchedMaterials.add(key)
  console.warn(
    `[AcTrBatchHighlight] Could not inject highlight shader for material type "${key}". Highlight tinting may be skipped.`
  )
}

/**
 * Merges persistent highlight uniforms into one compiled shader parameter bag.
 *
 * @param shader - Shader parameters produced by Three.js compilation.
 * @param uniforms - Highlight uniform bag owned by the source material.
 */
function mergeShaderUniforms(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: AcTrBatchHighlightUniforms
) {
  shader.uniforms.u_highlightMask = uniforms.u_highlightMask
  shader.uniforms.u_highlightMaskSize = uniforms.u_highlightMaskSize
  shader.uniforms.u_highlightSelectColor = uniforms.u_highlightSelectColor
  shader.uniforms.u_highlightHoverColor = uniforms.u_highlightHoverColor
}

/**
 * Copies highlight uniforms onto a {@link THREE.ShaderMaterial} instance.
 *
 * @param material - Shader material receiving direct uniform references.
 * @param uniforms - Highlight uniform bag to bind.
 */
function attachHighlightUniforms(
  material: THREE.Material,
  uniforms: AcTrBatchHighlightUniforms
) {
  if (material instanceof THREE.ShaderMaterial) {
    material.uniforms.u_highlightMask = uniforms.u_highlightMask
    material.uniforms.u_highlightMaskSize = uniforms.u_highlightMaskSize
    material.uniforms.u_highlightSelectColor = uniforms.u_highlightSelectColor
    material.uniforms.u_highlightHoverColor = uniforms.u_highlightHoverColor
  }
}

/**
 * Forces Three.js to recompile or refresh uniforms for a patched material.
 *
 * @param material - Material whose GPU program must be rebuilt or updated.
 */
function markMaterialProgramDirty(material: THREE.Material) {
  material.needsUpdate = true
  if (material instanceof THREE.ShaderMaterial) {
    material.uniformsNeedUpdate = true
  }
}

/**
 * Patches one material so batched draw calls can tint highlighted slots via
 * a per-batch mask texture bound in {@link bindBatchHighlightUniforms}.
 *
 * @param material - Drawable material compiled for batched geometry rendering.
 */
export function patchMaterialForBatchHighlight(material: THREE.Material) {
  const runtime = getMaterialRuntimeUserData(material)
  const uniforms = getOrCreateHighlightUniforms(material)

  if (!runtime.batchHighlightPatched) {
    runtime.batchHighlightPatched = true

    if (material instanceof THREE.ShaderMaterial) {
      material.vertexShader = injectVertexSlotId(material.vertexShader)
      const fragmentPatch = injectFragmentHighlight(material.fragmentShader)
      material.fragmentShader = fragmentPatch.source
      if (!fragmentPatch.injected) {
        warnUnpatchedHighlightMaterial(material)
      }
    } else {
      const previousOnBeforeCompile = material.onBeforeCompile
      material.onBeforeCompile = (shader, renderer) => {
        previousOnBeforeCompile?.call(material, shader, renderer)
        mergeShaderUniforms(shader, uniforms)
        shader.vertexShader = injectVertexSlotId(shader.vertexShader)
        const fragmentPatch = injectFragmentHighlight(shader.fragmentShader)
        shader.fragmentShader = fragmentPatch.source
        if (!fragmentPatch.injected) {
          warnUnpatchedHighlightMaterial(material)
        }
      }

      const previousCacheKey = material.customProgramCacheKey
      material.customProgramCacheKey = () =>
        `${previousCacheKey.call(material)}|batchHighlight`
    }

    attachHighlightUniforms(material, uniforms)
    markMaterialProgramDirty(material)
    return
  }

  attachHighlightUniforms(material, uniforms)
}

/**
 * Binds one batch highlight mask to the compiled material uniforms.
 *
 * @param material - One material or material array used by the batch drawable.
 * @param state - CPU/GPU highlight mask owned by the batch container.
 */
export function bindBatchHighlightUniforms(
  material: THREE.Material | THREE.Material[],
  state: AcTrBatchHighlightState
) {
  const materials = Array.isArray(material) ? material : [material]
  const texture = state.uploadMaskTexture()

  for (const entry of materials) {
    patchMaterialForBatchHighlight(entry)
    const uniforms = getOrCreateHighlightUniforms(entry)
    uniforms.u_highlightMask.value = texture
    const dimensions = state.getMaskTextureDimensions()
    uniforms.u_highlightMaskSize.value.set(dimensions.width, dimensions.height)
    uniforms.u_highlightSelectColor.value.copy(HIGHLIGHT_SELECT_COLOR)
    uniforms.u_highlightHoverColor.value.copy(HIGHLIGHT_HOVER_COLOR)
    if (entry instanceof THREE.ShaderMaterial) {
      entry.uniformsNeedUpdate = true
    }
  }
}

/**
 * Installs an `onBeforeRender` hook that uploads the batch highlight mask
 * before each draw call sharing the batch material.
 *
 * @param object - Batch drawable whose draw calls should refresh highlight uniforms.
 * @param state - CPU/GPU highlight mask owned by the batch container.
 */
export function installBatchHighlightRenderer(
  object: THREE.Object3D,
  state: AcTrBatchHighlightState
) {
  const runtime = object.userData as {
    batchHighlightRendererInstalled?: boolean
  }
  if (runtime.batchHighlightRendererInstalled) {
    return
  }
  runtime.batchHighlightRendererInstalled = true

  const previousOnBeforeRender = object.onBeforeRender
  object.onBeforeRender = (
    renderer,
    scene,
    camera,
    geometry,
    material,
    group
  ) => {
    previousOnBeforeRender?.(renderer, scene, camera, geometry, material, group)
    if (!state.hasAnyHighlight() || !material) {
      return
    }
    bindBatchHighlightUniforms(material, state)
  }
}
