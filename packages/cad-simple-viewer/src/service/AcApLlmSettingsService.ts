/**
 * What the configured AI models can do, as reported by an
 * {@link AcApLlmSettingsProvider}.
 */
export interface AcApLlmStatus {
  /** True when at least one provider has an API key. */
  configured: boolean
  /**
   * True when a configured model accepts image input, which features such as
   * text recognition (OCR) need.
   */
  vision: boolean
}

/**
 * Options for {@link AcApLlmSettingsService.open}.
 */
export interface AcApLlmSettingsOpenOptions {
  /**
   * Element that receives the dialog backdrop. Defaults to the provider's
   * choice, typically the canvas container.
   */
  host?: HTMLElement
}

/**
 * Owner of the AI model settings, typically `@mlightcad/cad-llm-plugin`.
 */
export interface AcApLlmSettingsProvider {
  /** Unique id, e.g. `'cad-llm'`. */
  id: string
  /**
   * Opens the settings UI.
   *
   * @returns A promise that resolves when the UI is closed.
   */
  open(options?: AcApLlmSettingsOpenOptions): Promise<void>
  /** Reports whether a model is configured and whether one accepts images. */
  getStatus(): Promise<AcApLlmStatus>
}

/**
 * Registry for the AI model settings UI.
 *
 * Lets any feature that relies on an LLM (the CAD agent, PDF text
 * recognition, ...) send the user to the one shared settings dialog, or check
 * whether a model is configured, without depending on the package that
 * implements it. Only the last registered provider is used.
 */
export class AcApLlmSettingsService {
  private static provider?: AcApLlmSettingsProvider

  /**
   * Registers (or replaces) the settings provider.
   *
   * @returns A function that unregisters it.
   */
  static register(provider: AcApLlmSettingsProvider): () => void {
    this.provider = provider
    return () => {
      if (this.provider === provider) this.provider = undefined
    }
  }

  /** Removes the provider with `id`. */
  static unregister(id: string): void {
    if (this.provider?.id === id) this.provider = undefined
  }

  /** True when a settings provider is registered. */
  static get isAvailable(): boolean {
    return this.provider !== undefined
  }

  /**
   * Opens the settings UI.
   *
   * @returns `true` once the UI was shown and closed again, `false` when no
   *   provider is registered.
   */
  static async open(options?: AcApLlmSettingsOpenOptions): Promise<boolean> {
    if (!this.provider) return false
    await this.provider.open(options)
    return true
  }

  /**
   * Reports the configured models' capabilities.
   *
   * @returns The status, or `undefined` when no provider is registered or it
   *   failed to answer.
   */
  static async getStatus(): Promise<AcApLlmStatus | undefined> {
    if (!this.provider) return undefined
    try {
      return await this.provider.getStatus()
    } catch {
      return undefined
    }
  }
}
