const usedDownloadNames = new Set<string>()

/**
 * Strips path and extension from a drawing file name for use as an export base name.
 *
 * @param fileName - Source drawing name (may include path or `.dwg` / `.dxf`).
 * @param fallback - Value when `fileName` is empty after normalization.
 */
export function getDrawingExportBaseName(
  fileName: string | undefined,
  fallback = 'drawing'
): string {
  const normalized = fileName?.trim()
  if (!normalized) {
    return fallback
  }

  const leafName = normalized.split(/[\\/]/).pop() ?? normalized
  const base = leafName.replace(/\.[^.]+$/, '').trim()
  return base || fallback
}

/**
 * Builds a browser download file name from a drawing name.
 *
 * The first export keeps the drawing base name (for example `floor-plan.svg`).
 * Subsequent exports with the same base name and extension receive numeric
 * suffixes (`floor-plan-2.svg`, `floor-plan-3.svg`, …) within the session.
 *
 * @param sourceName - Drawing file name or title.
 * @param extension - Target extension, with or without a leading dot.
 * @param fallbackBaseName - Base name when `sourceName` is empty.
 */
export function resolveExportDownloadName(
  sourceName: string | undefined,
  extension: string,
  fallbackBaseName = 'drawing'
): string {
  const baseName = getDrawingExportBaseName(sourceName, fallbackBaseName)
  const normalizedExtension = extension.startsWith('.')
    ? extension
    : `.${extension}`

  let suffix = 0
  let candidate = `${baseName}${normalizedExtension}`

  while (usedDownloadNames.has(candidate)) {
    suffix += 1
    candidate = `${baseName}-${suffix + 1}${normalizedExtension}`
  }

  usedDownloadNames.add(candidate)
  return candidate
}

/** Clears session-scoped export name tracking. Intended for tests. */
export function resetExportDownloadNamesForTests() {
  usedDownloadNames.clear()
}
