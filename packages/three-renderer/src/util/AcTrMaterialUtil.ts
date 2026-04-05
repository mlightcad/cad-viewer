import * as THREE from 'three'

const RTE_MATERIAL_FLAG = '__acTrRteMaterialEnabled'
const RTE_SHADER_REF = '__acTrRteShader'

/**
 * Highlight color.
 */
export const HIGHLIGHT_COLOR = new THREE.Color(0x08e8de)

/**
 * Type for materials that have color property
 */
type MaterialWithColor =
  | THREE.PointsMaterial
  | THREE.MeshBasicMaterial
  | THREE.LineBasicMaterial
  | THREE.MeshLambertMaterial
  | THREE.MeshPhongMaterial
  | THREE.MeshStandardMaterial
  | THREE.MeshToonMaterial

/**
 * Type for materials that have uniforms property (shader materials)
 */
type MaterialWithUniforms = THREE.ShaderMaterial

/**
 * @internal
 */
export class AcTrMaterialUtil {
  /**
   * Clone given material(s)
   */
  public static cloneMaterial(
    material: THREE.Material | THREE.Material[]
  ): THREE.Material | THREE.Material[] {
    if (!material) {
      return material
    }
    if (Array.isArray(material)) {
      const materials: THREE.Material[] = []
      material.forEach(mat => {
        materials.push(this.cloneSingleMaterial(mat))
      })
      return materials
    }
    return this.cloneSingleMaterial(material as THREE.Material)
  }

  public static setMaterialColor(
    material: THREE.Material | THREE.Material[],
    color: THREE.Color = HIGHLIGHT_COLOR
  ) {
    if (Array.isArray(material)) {
      material.forEach(mat => this.setMaterialColor(mat, color))
      return
    }

    // Handle materials with color property
    if (this.hasColorProperty(material)) {
      material.color.set(color)
      if (this.hasEmissiveProperty(material)) {
        material.emissive.set(color)
      }
    }

    // Handle shader materials with uniforms
    if (this.hasUniformsProperty(material)) {
      if (material.uniforms.u_color) {
        material.uniforms.u_color.value.set(color)
      }
    }
  }

  private static hasColorProperty(
    material: THREE.Material
  ): material is MaterialWithColor {
    return 'color' in material && material.color instanceof THREE.Color
  }

  private static hasEmissiveProperty(
    material: THREE.Material
  ): material is
    | THREE.MeshLambertMaterial
    | THREE.MeshPhongMaterial
    | THREE.MeshStandardMaterial
    | THREE.MeshToonMaterial {
    return 'emissive' in material && material.emissive instanceof THREE.Color
  }

  private static hasUniformsProperty(
    material: THREE.Material
  ): material is MaterialWithUniforms {
    return 'uniforms' in material && material.uniforms !== undefined
  }

  private static cloneSingleMaterial(material: THREE.Material) {
    const clonedMaterial = material.clone()
    this.resetRuntimeShaderState(clonedMaterial)
    return clonedMaterial
  }

  /**
   * Cloned highlight materials must not inherit runtime-only shader state from
   * the source instance, otherwise the clone can keep using stale RTE shader
   * uniforms/program keys bound to another render object.
   */
  private static resetRuntimeShaderState(material: THREE.Material) {
    delete material.userData[RTE_MATERIAL_FLAG]
    delete material.userData[RTE_SHADER_REF]
    material.onBeforeCompile = THREE.Material.prototype.onBeforeCompile
    material.customProgramCacheKey =
      THREE.Material.prototype.customProgramCacheKey
    material.needsUpdate = true
  }
}
