/**
 * Required thawed layers for a native drawable, resolved at one parent level.
 *
 * Layer 0 in an unbound block template inherits the nearest effective parent
 * layer. Named ancestors remain independent gates. Canonical sets let native
 * compaction merge only geometry with the same visibility ownership.
 * Layer OFF is deliberately absent: it affects the effective drawable layer,
 * whereas freezing an ancestor hides all its descendants.
 */
export function acTrResolveAncestorLayerNames(
  childNames: readonly string[] | undefined,
  parentLayerName?: string,
  parentNames?: readonly string[]
): readonly string[] | undefined {
  if (!childNames?.length && !parentNames?.length && !parentLayerName) {
    return undefined
  }
  const names = new Set<string>()
  const add = (name: string) => {
    if (name)
      names.add(name === '0' && parentLayerName ? parentLayerName : name)
  }
  if (parentLayerName) add(parentLayerName)
  // A parent's unresolved zero belongs to an outer INSERT. A named descendant
  // must not capture that binding while its own deferred geometry is flattened.
  parentNames?.forEach(name => {
    if (name) names.add(name)
  })
  childNames?.forEach(add)
  const resolved = [...names].sort()
  if (resolved.length === 0) return undefined
  // Do not churn immutable snapshots when traversal adds no new ancestry.
  if (
    childNames?.length === resolved.length &&
    resolved.every((name, index) => name === childNames[index])
  ) {
    return childNames
  }
  return resolved
}
