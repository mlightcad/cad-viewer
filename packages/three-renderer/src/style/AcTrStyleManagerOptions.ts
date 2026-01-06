export interface AcTrStyleManagerOptions {
  // /** Uniform used by line and hatch shaders to support zoom-dependent effects. */
  // cameraZoomUniform: number

  /**
   *
   */
  ltScale: number

  /** Uniform that accounts for viewport scale in line-pattern rendering. */
  viewportScaleUniform: number

  /**
   * WebGL has a limited capability for FragmentUniforms. Thus, cannot have as many
   * clippingPlanes as expected.
   */
  maxFragmentUniforms: number
}
