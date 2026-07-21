/**
 * Resolves AutoCAD layer-0 inheritance inside block references.
 *
 * Entities authored on layer `"0"` inherit the owning INSERT's layer for
 * display, style, and visibility. Non-zero layers keep their authored name.
 *
 * Nesting chains: call once per INSERT level (same rule as OSNAP export).
 *
 * @param entityLayer - Layer stored on the entity in the block definition.
 * @param insertLayer - Layer of the owning INSERT (or already-resolved parent).
 * @returns Effective layer name used for rendering and visibility.
 */
export function effectiveLayer(
  entityLayer: string,
  insertLayer: string
): string {
  return entityLayer === '0' ? insertLayer : entityLayer
}
