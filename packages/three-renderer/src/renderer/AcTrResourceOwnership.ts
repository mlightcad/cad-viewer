/** Ownership identity stays outside draw/context imports to avoid renderer cycles. */
const contextOwnedResources = new WeakMap<object, object>()

/** Cloned scene leaves borrow these resources until their source scope ends. */
export function isContextOwnedResource(resource: object): boolean {
  return contextOwnedResources.has(resource)
}

/** Claims a resource once, rejecting accidental sharing between source owners. */
export function claimContextResource(owner: object, resource: object): boolean {
  const existing = contextOwnedResources.get(resource)
  if (existing) {
    if (existing !== owner) {
      throw new Error('Resource already belongs to another context')
    }
    return false
  }
  contextOwnedResources.set(resource, owner)
  return true
}
