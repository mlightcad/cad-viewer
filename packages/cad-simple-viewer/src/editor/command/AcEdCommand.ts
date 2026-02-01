import { AcCmEventManager } from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import { AcEdOpenMode } from '../view'

/**
 * Event arguments for command lifecycle events.
 *
 * Contains the command instance that triggered the event.
 */
export interface AcEdCommandEventArgs {
  /** The command instance involved in the event */
  command: AcEdCommand
}

/**
 * Abstract base class for all CAD commands.
 *
 * This class provides the foundation for implementing CAD commands with:
 * - Command name management (global and localized names)
 * - Lifecycle event handling (command start/end)
 * - Execution framework with context access
 * - Event notification system
 *
 * Commands are the primary way users interact with the CAD system. Each command
 * represents a specific operation like drawing lines, selecting objects, zooming, etc.
 *
 * ## Command Lifecycle
 * 1. Command is triggered via `trigger()` method
 * 2. `commandWillStart` event is fired
 * 3. `execute()` method is called with current context
 * 4. `commandEnded` event is fired
 *
 * @example
 * ```typescript
 * class MyDrawCommand extends AcEdCommand {
 *   constructor() {
 *     super();
 *     this.globalName = 'DRAW';
 *     this.localName = 'Draw Line';
 *   }
 *
 *   execute(context: AcApContext) {
 *     // Implement command logic here
 *     const view = context.view;
 *     const document = context.doc;
 *     // ... drawing logic
 *   }
 * }
 *
 * // Usage
 * const command = new MyDrawCommand();
 * command.events.commandWillStart.addEventListener(args => {
 *   console.log('Command starting:', args.command.globalName);
 * });
 * command.trigger(context);
 * ```
 */
export abstract class AcEdCommand {
  /** The global (untranslated) name of the command */
  private _globalName: string
  /** The local (translated) name of the command */
  private _localName: string
  /** The minimum access mode required to execute this command */
  private _mode: AcEdOpenMode = AcEdOpenMode.Read

  /**
   * Creates a new command instance.
   *
   * Initializes the command with empty names. Subclasses should set
   * appropriate global and local names in their constructors.
   */
  constructor() {
    this._globalName = ''
    this._localName = ''
  }

  /** Events fired during command execution lifecycle */
  public readonly events = {
    /** Fired just before the command starts executing */
    commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
    /** Fired after the command finishes executing */
    commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
  }

  /**
   * Gets the global (untranslated) name of the command.
   *
   * The global name is typically used for programmatic access and
   * should remain consistent across different language localizations.
   *
   * @returns The global command name
   */
  get globalName() {
    return this._globalName
  }

  /**
   * Sets the global (untranslated) name of the command.
   *
   * @param value - The global command name (e.g., 'LINE', 'CIRCLE', 'ZOOM')
   */
  set globalName(value: string) {
    this._globalName = value
  }

  /**
   * Gets the local (translated) name of the command.
   *
   * The local name is displayed to users and should be localized
   * to the current language/region.
   *
   * @returns The localized command name
   */
  get localName() {
    return this._localName
  }

  /**
   * Sets the local (translated) name of the command.
   *
   * @param value - The localized command name (e.g., 'Draw Line', 'Zoom In')
   */
  set localName(value: string) {
    this._localName = value
  }

  /**
   * Gets the minimum access mode required to execute this command.
   *
   * Commands with higher mode requirements can only be executed when the document
   * is opened in a compatible mode. Higher value modes are compatible with lower value modes.
   *
   * @returns The minimum access mode required
   */
  get mode() {
    return this._mode
  }

  /**
   * Sets the minimum access mode required to execute this command.
   *
   * @param value - The minimum access mode (Read, Review, or Write)
   */
  set mode(value: AcEdOpenMode) {
    this._mode = value
  }

  /**
   * Triggers the command execution with proper event handling.
   *
   * This method should not be overridden by subclasses as it handles
   * the event notification workflow. Subclasses should implement the
   * `execute()` method instead.
   *
   * The execution flow:
   * 1. Fires `commandWillStart` event
   * 2. Calls the `execute()` method
   * 3. Fires `commandEnded` event
   *
   * @param context - The current application context containing view and document
   *
   * @example
   * ```typescript
   * const command = new MyCommand();
   * command.trigger(docManager.context);
   * ```
   */
  tirgger(context: AcApContext) {
    this.events.commandWillStart.dispatch({ command: this })
    this.execute(context)
    this.events.commandEnded.dispatch({ command: this })
  }

  /**
   * Executes the command logic.
   *
   * This abstract method must be implemented by subclasses to define
   * the specific behavior of the command. The method receives the current
   * application context providing access to the view and document.
   *
   * @param _context - The current application context
   *
   * @example
   * ```typescript
   * execute(context: AcApContext) {
   *   const view = context.view;
   *   const doc = context.doc;
   *
   *   // Get user input
   *   const point = await view.editor.getPoint();
   *
   *   // Create entity in document
   *   const entity = new SomeEntity(point);
   *   doc.database.addEntity(entity);
   * }
   * ```
   */
  execute(_context: AcApContext) {
    // Do nothing - subclasses should override this method
  }
}
