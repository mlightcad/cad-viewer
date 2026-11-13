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
   * Legacy fragment-uniform budget. Hatch patterns no longer consume this
   * (pattern lines are sampled from a DataTexture; see #743). Retained so
   * existing callers that set the option keep compiling.
   */
  maxFragmentUniforms: number

  /**
   * Viewport size used by fat-line materials.
   */
  resolution: THREE.Vector2

  /**
   * Whether to display authored entity lineweights (AutoCAD LWDISPLAY).
   *
   * - `false` at convert time: solid strokes use cheap `GL_LINES`
   * - `true` at convert time: weighted strokes use fat-line geometry
   * - Toggling off later only forces fat `linewidth` to hairline `1`
   *   (geometry is kept so re-enabling stays cheap)
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
