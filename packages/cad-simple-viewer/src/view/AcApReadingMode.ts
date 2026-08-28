/** Canvas background used by transient reading mode (white). */
export const ACAP_READING_MODE_BACKGROUND = 0xffffff

/** Linework color forced in reading mode (black). */
export const ACAP_READING_MODE_COLOR = 0x000000

/** Host callbacks used by {@link AcApReadingModeState} to update the view. */
export interface AcApReadingModeHost {
  /** Style-manager layout background currently stored on the renderer. */
  getCurrentBackgroundColor: () => number
  /** Updates WebGL clear colour and cursor chrome only. */
  applyViewClearColor: (value: number) => void
  /** Applies or clears compare-display monochrome colouring. */
  setCompareDisplay: (options: {
    enabled: boolean
    baseColor?: number
    overrides?: []
  }) => void
  /** Marks the view dirty when reading mode is disabled. */
  markDirty: () => void
}

/**
 * Transient reading-mode state: black linework on a white canvas.
 *
 * Does not mutate the drawing database or style-manager materials; the host
 * applies visual-only clear-colour and compare-display overrides.
 */
export class AcApReadingModeState {
  private enabled = false
  private savedBackground: number | null = null

  constructor(private readonly host: AcApReadingModeHost) {}

  /** Whether reading mode is currently active. */
  get isEnabled() {
    return this.enabled
  }

  /**
   * Remembers the layout background while reading mode is on so restore after
   * disable stays accurate across sysvar / layout switches.
   */
  noteLayoutBackground(value: number) {
    this.savedBackground = value
  }

  /** Toggles reading mode on or off. */
  toggle() {
    this.setEnabled(!this.enabled)
  }

  /**
   * Enables or disables reading mode.
   *
   * @param next - When true, snapshots the layout background and forces
   *   monochrome display; when false, restores the snapshot and clears compare
   *   colouring.
   */
  setEnabled(next: boolean) {
    if (next === this.enabled) {
      return
    }
    if (next) {
      this.applyDisplay(true)
      this.enabled = true
      return
    }

    const savedBackground = this.savedBackground
    this.enabled = false
    this.savedBackground = null

    this.host.setCompareDisplay({ enabled: false, overrides: [] })
    if (savedBackground != null) {
      this.host.applyViewClearColor(savedBackground)
    }
    this.host.markDirty()
  }

  /** Re-applies reading-mode display after background sysvar sync. */
  reapplyIfEnabled() {
    if (!this.enabled) {
      return
    }
    this.applyDisplay(true)
  }

  private applyDisplay(snapshotBackground: boolean) {
    if (snapshotBackground) {
      this.savedBackground = this.host.getCurrentBackgroundColor()
    }
    this.host.applyViewClearColor(ACAP_READING_MODE_BACKGROUND)
    this.host.setCompareDisplay({
      enabled: true,
      baseColor: ACAP_READING_MODE_COLOR
    })
  }
}
