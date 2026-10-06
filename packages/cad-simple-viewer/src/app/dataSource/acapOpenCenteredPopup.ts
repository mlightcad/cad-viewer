/**
 * Opens a named popup centered on the current screen (desktop).
 *
 * Cloud data sources that need a File Picker popup should use this helper so
 * hosts never hard-code vendor-specific window placement.
 *
 * @param name - `window.open` target name (reuses an existing window with that name)
 * @param width - Outer width in CSS pixels
 * @param height - Outer height in CSS pixels
 * @returns The opened window, or `null` when blocked
 */
export function acapOpenCenteredPopup(
  name: string,
  width = 1080,
  height = 680
): Window | null {
  const dualScreenLeft =
    window.screenLeft !== undefined ? window.screenLeft : window.screenX
  const dualScreenTop =
    window.screenTop !== undefined ? window.screenTop : window.screenY
  const viewportWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    screen.width
  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    screen.height
  const left = Math.max(
    0,
    Math.round(dualScreenLeft + (viewportWidth - width) / 2)
  )
  const top = Math.max(
    0,
    Math.round(dualScreenTop + (viewportHeight - height) / 2)
  )
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',')
  return window.open('', name, features)
}
