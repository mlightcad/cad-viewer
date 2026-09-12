/**
 * Resolves AutoCAD layer-0 inheritance inside block references.
 *
 * Entities authored on layer `"0"` inherit the owning INSERT's layer.
 */
export function effectivePdfLayer(
  entityLayer: string | undefined,
  insertLayer?: string
): string {
  const layer = entityLayer || '0'
  if (layer === '0' && insertLayer) {
    return insertLayer
  }
  return layer
}
