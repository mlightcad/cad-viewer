import * as THREE from 'three'

export interface AcTrStyleManagerOptions {
  // /** Uniform used by line and hatch shaders to support zoom-dependent effects. */
  // cameraZoomUniform: number

  /**
   * Global ltscale
   */
  ltscale: number
  /**
   * Global celtscale
   */
  celtscale: number

  /** Uniform that accounts for viewport scale in line-pattern rendering. */
  viewportScaleUniform: number

  /**
   * WebGL has a limited capability for FragmentUniforms. Thus, cannot have as many
   * clippingPlanes as expected.
   */
  maxFragmentUniforms: number

  /**
   * Viewport size used by fat-line materials.
   */
  resolution: THREE.Vector2

  /**
   * Whether to render entity lineweights using fat-line materials.
   *
   * - `true`: render lineweights (AutoCAD-like lineweight display on)
   * - `false`: force basic line materials with 1px width
   */
  showLineWeight: boolean

  /**
   * Whether the active GPU/driver cannot render the custom line-pattern
   * shader on native `gl.LINES`.
   *
   * Set automatically by `AcTrLinePatternShaderProbe` during renderer
   * initialization. When `true`, patterned (dashed/dot-dash) lines are
   * rendered via `LineMaterial` on `LineSegments2` (triangle-quad meshes)
   * instead of the custom shader on native lines, because some drivers
   * (e.g. integrated AMD Radeon via ANGLE/Direct3D 11) produce zero
   * fragments for that combination. On healthy GPUs this stays `false`
   * and the original high-fidelity linetype shader is used.
   */
  linePatternShaderBroken: boolean

  /**
   * Current canvas background colour, as a 24-bit RGB number.
   *
   * Used by material managers to initialize theme-sensitive colours, such
   * as ACI 7 foreground inversion.
   *
   * Kept in sync with `AcTrView2d.backgroundColor` via
   * `AcTrStyleManager.currentBackgroundColor`.
   *
   * Default is model-space dark background (`ACGI_MODEL_SPACE_BACKGROUND`).
   */
  currentBackgroundColor: number
}
