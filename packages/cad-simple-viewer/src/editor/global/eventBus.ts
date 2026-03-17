import { AcDbProgressdEventArgs } from '@mlightcad/data-model'
import mitt, { type Emitter } from 'mitt'

/**
 * Message severity type for user notifications.
 *
 * Used to categorize messages shown to users with appropriate visual styling.
 */
export type AcEdMessageType = 'success' | 'warning' | 'info' | 'error'

export interface AcEdFontNotLoadedInfo {
  /** Font name */
  fontName: string
  /** URL where the font was attempted to be loaded from */
  url: string
}

/**
 * Type definition for all events that can be emitted through the global event bus.
 *
 * This type maps event names to their corresponding payload types, providing
 * type safety for event emission and listening throughout the application.
 *
 * ## Event Categories
 * - **File Operations**: `open-file`, `open-file-progress`, `failed-to-open-file`
 * - **Font Management**: `fonts-not-loaded`, `failed-to-get-avaiable-fonts`, `font-not-found`
 * - **User Messages**: `message`
 */
export type AcEdEvents = {
  /** Emitted to request opening a file dialog */
  'open-file': {}
  /** Emitted during file opening to report progress */
  'open-file-progress': AcDbProgressdEventArgs
  /** Emitted to display a message to the user */
  message: {
    /** The message text to display */
    message: string
    /** The severity/type of the message */
    type: AcEdMessageType
  }
  /** Emitted when some fonts can not be found in font repository */
  'fonts-not-found': {
    fonts: string[]
  }
  /** Emitted when some fonts fails to load */
  'fonts-not-loaded': {
    fonts: AcEdFontNotLoadedInfo[]
  }
  /** Emitted when the available fonts list cannot be retrieved */
  'failed-to-get-avaiable-fonts': {
    /** URL where the fonts list was attempted to be retrieved from */
    url: string
  }
  /** Emitted when a file fails to open */
  'failed-to-open-file': {
    /** Name/path of the file that failed to open */
    fileName: string
  }
  /** Emitted when a required font is not found */
  'font-not-found': {
    /** Name of the missing font */
    fontName: string
    /** Number of entities that require this font */
    count: number
  }
}

/**
 * Global event bus for application-wide communication.
 *
 * This event bus enables decoupled communication between different parts of the
 * CAD viewer application. Components can emit events to notify about state changes
 * or request actions, while other components can listen for these events to respond
 * appropriately.
 *
 * The event bus is particularly useful for:
 * - File operation status updates
 * - Error and warning notifications
 * - Font loading status
 * - Cross-component communication
 *
 * @example
 * ```typescript
 * import { eventBus } from './eventBus';
 *
 * // Listen for file opening events
 * eventBus.on('open-file', () => {
 *   console.log('File open requested');
 * });
 *
 * // Emit a progress update
 * eventBus.emit('open-file-progress', {
 *   percentage: 50,
 *   stage: 'CONVERSION'
 *   subStage: AcDbConversionStage.Parsing,
 *   stageStatus: AcDbConversionStageStatus.InProgress
 * });
 *
 * // Display a message to the user
 * eventBus.emit('message', {
 *   message: 'File opened successfully',
 *   type: 'success'
 * });
 * ```
 */
export const eventBus: Emitter<AcEdEvents> = mitt<AcEdEvents>()
