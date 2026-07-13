import type { AcEdMessageType } from '../editor/input/ui/AcEdMessageType'

/**
 * Runtime services that commands need from the application layer.
 *
 * Kept in a tiny module (no DocManager / command imports) so {@link AcEdCommand}
 * can call into the app without creating an ES-module cycle:
 * `AcEdCommand` -> `AcApDocManager` -> commands -> `AcEdCommand`.
 */
export interface AcApCommandServices {
  showMessage(message: string, type?: AcEdMessageType, msgKey?: string): void
  showBusyIndicator(message?: string): void
  hideBusyIndicator(): void
  withBusyIndicator<T>(
    work: () => T | Promise<T>,
    message?: string
  ): Promise<T>
}

let services: AcApCommandServices | null = null

/**
 * Binds the live document-manager services used by {@link AcEdCommand} helpers.
 *
 * Called once during {@link AcApDocManager} construction after the busy
 * indicator and editor are available.
 */
export function acapBindCommandServices(next: AcApCommandServices): void {
  services = next
}

/**
 * Returns the bound command services.
 *
 * @throws If called before {@link AcApDocManager} has bound services
 */
export function acapCommandServices(): AcApCommandServices {
  if (!services) {
    throw new Error(
      '[AcApCommandServices] Not bound. Create AcApDocManager before running commands.'
    )
  }
  return services
}
