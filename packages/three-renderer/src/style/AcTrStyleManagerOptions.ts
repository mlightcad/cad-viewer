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
   * Current canvas background colour, as a 24-bit RGB number.
   *
   * Used by `AcTrFillMaterialManager` when a solid hatch is opted into
   * background-follow behaviour (`shouldTrackBackground === true`): the
   * material is *born* with this colour instead of its resolved trait
   * colour, so it fuses with the paper on the very first frame — even
   * when the DWG is loaded AFTER the theme has already been set.
   *
   * Kept in sync with `AcTrView2d.backgroundColor` via
   * `AcTrStyleManager.currentBackgroundColor` (whose setter also fires
   * `changeBackground(value)` on every manager so materials created
   * before the flip are repainted).
   *
   * Default is `0x000000` (matches the default view bg in
   * `DEFAULT_VIEW_2D_OPTIONS`).
   */
  currentBackgroundColor: number
}
