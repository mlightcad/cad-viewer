/**
 * Per-view registry of long-lived session UI providers.
 *
 * A provider is not a mounted {@link AcEdSessionAccessory}; it is the object
 * that owns controls and can mint accessories (for example draw-style color /
 * font-size UI). Multiple features register under stable string ids.
 */

/**
 * Map of session provider id → provider instance for one view.
 */
export class AcEdSessionProviderRegistry {
  /** Installed providers keyed by stable id. */
  private readonly providers = new Map<string, unknown>()

  /**
   * Registers or replaces a provider.
   *
   * @param id - Stable provider id (e.g. {@link ACED_DRAW_STYLE_SESSION_PROVIDER_ID}).
   * @param provider - Provider instance.
   */
  set(id: string, provider: unknown): void {
    this.providers.set(id, provider)
  }

  /**
   * Returns the provider for {@link id}, if registered.
   *
   * @param id - Stable provider id.
   * @returns The provider cast to {@link T}, or `undefined`.
   */
  get<T>(id: string): T | undefined {
    return this.providers.get(id) as T | undefined
  }

  /**
   * Whether a provider is registered under {@link id}.
   *
   * @param id - Stable provider id.
   */
  has(id: string): boolean {
    return this.providers.has(id)
  }

  /**
   * Removes the provider registered under {@link id}.
   *
   * @param id - Stable provider id.
   * @returns `true` when an entry was removed.
   */
  delete(id: string): boolean {
    return this.providers.delete(id)
  }
}
