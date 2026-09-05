/** Square loupe size in CSS pixels. */
export const ACED_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACED_SNAP_LOUPE_ZOOM = 3
/** Offset of the loupe from the canvas top-left when no prompt is present. */
export const ACED_SNAP_LOUPE_INSET_PX = 8
/**
 * Gap between the bottom of the mobile prompt bar and the top of the loupe,
 * in CSS pixels.
 */
export const ACED_SNAP_LOUPE_GAP_BELOW_PROMPT_PX = 8

/**
 * Resolves the loupe top-left in host-local CSS pixels.
 *
 * When a mobile prompt bar is visible, the loupe sits below it with
 * {@link ACED_SNAP_LOUPE_GAP_BELOW_PROMPT_PX} clearance so multi-line prompts
 * push the loupe down.
 *
 * @param host - View / canvas container that owns the prompt and loupe.
 * @param options.usesSessionChrome - Whether mobile session chrome is active.
 * @param options.promptSelector - CSS selector for the prompt bar inside `host`.
 * @returns Loupe `x` / `y` / `size` in host-local CSS pixels.
 */
export function acedResolveLoupePlacement(
  host: HTMLElement,
  options: {
    usesSessionChrome: boolean
    promptSelector?: string
  }
): { x: number; y: number; size: number } {
  const x = ACED_SNAP_LOUPE_INSET_PX
  const size = ACED_SNAP_LOUPE_SIZE_PX
  if (!options.usesSessionChrome) {
    return { x, y: ACED_SNAP_LOUPE_INSET_PX, size }
  }
  const selector = options.promptSelector ?? '.ml-mobile-cmd-prompt'
  const prompt = host.querySelector(selector) as HTMLElement | null
  if (!prompt || prompt.hidden) {
    // Fall back to CSS var when the prompt node is not measurable yet.
    const fromVar =
      parseFloat(
        getComputedStyle(host).getPropertyValue('--ml-mobile-cmd-prompt-height')
      ) || 28
    return {
      x,
      y:
        ACED_SNAP_LOUPE_INSET_PX +
        (Number.isFinite(fromVar) ? fromVar : 28) +
        ACED_SNAP_LOUPE_GAP_BELOW_PROMPT_PX,
      size
    }
  }
  const hostRect = host.getBoundingClientRect()
  const promptRect = prompt.getBoundingClientRect()
  const promptBottom = promptRect.bottom - hostRect.top
  return {
    x,
    y: Math.max(
      ACED_SNAP_LOUPE_INSET_PX,
      promptBottom + ACED_SNAP_LOUPE_GAP_BELOW_PROMPT_PX
    ),
    size
  }
}

/**
 * Maps a canvas-space delta (snap − finger) into loupe-local pixels.
 *
 * The loupe center corresponds to the finger sample; the snap glyph is
 * offset from that center by `delta * zoom`.
 *
 * @param dx - Canvas-space X from finger to snap (CSS pixels).
 * @param dy - Canvas-space Y from finger to snap (CSS pixels).
 * @param size - Loupe width/height in CSS pixels; defaults to
 *   {@link ACED_SNAP_LOUPE_SIZE_PX}.
 * @param zoom - Magnification relative to the main view; defaults to
 *   {@link ACED_SNAP_LOUPE_ZOOM}.
 * @returns Loupe-local coordinates with origin at the loupe top-left.
 */
export function acedLoupeLocalFromCanvasDelta(
  dx: number,
  dy: number,
  size: number = ACED_SNAP_LOUPE_SIZE_PX,
  zoom: number = ACED_SNAP_LOUPE_ZOOM
): { x: number; y: number } {
  return {
    x: size / 2 + dx * zoom,
    y: size / 2 + dy * zoom
  }
}
