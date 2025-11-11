import {
  AcCmEventManager,
  acdbHostApplicationServices,
  AcDbOpenDatabaseOptions,
  AcGeBox2d
} from '@mlightcad/data-model'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

import {
  AcApConvertToSvgCmd,
  AcApOpenCmd,
  AcApPanCmd,
  AcApQNewCmd,
  AcApRegenCmd,
  AcApSelectCmd,
  AcApZoomCmd,
  AcApZoomToBoxCmd,
  AcEdCommandStack
} from '../command'
import { AcEdCalculateSizeCallback, eventBus } from '../editor'
import { AcTrView2d } from '../view'
import { AcApContext } from './AcApContext'
import { AcApDocument } from './AcApDocument'
import { AcApFontLoader } from './AcApFontLoader'

const DEFAULT_BASE_URL = 'https://mlightcad.gitlab.io/cad-data/'

/**
 * Event arguments for document-related events.
 */
export interface AcDbDocumentEventArgs {
  /** The document involved in the event */
  doc: AcApDocument
}

/**
 * Options for creating AcApDocManager instance
 */
export interface AcApDocManagerOptions {
  /**
   * Optional HTML canvas element for rendering. If not provided, a new canvas will be created
   */
  canvas?: HTMLCanvasElement
  /**
   * Base URL to load resources (such as fonts annd drawing templates) needed
   */
  baseUrl?: string
  /**
   * The flag whether to use main thread or webwork to render drawing.
   * - true: use main thread to render drawing. This approach take less memory and take longer time to show
   *         rendering results.
   * - false: use web worker to render drawing. This approach take more memory and take shorter time to show
   *         rendering results.
   */
  useMainThreadDraw?: boolean
}

/**
 * Document manager that handles CAD document lifecycle and provides the main entry point for the CAD viewer.
 *
 * This singleton class manages:
 * - Document creation and opening (from URLs or file content)
 * - View and context management
 * - Command registration and execution
 * - Font loading for text rendering
 * - Event handling for document lifecycle
 *
 * The manager follows a singleton pattern to ensure only one instance manages the application state.
 */
export class AcApDocManager {
  /** The current application context binding document and view */
  private _context: AcApContext
  /** Font loader for managing CAD text fonts */
  private _fontLoader: AcApFontLoader
  /** Base URL to get fonts, templates, and example files */
  private _baseUrl: string
  /** Singleton instance */
  private static _instance?: AcApDocManager

  /** Events fired during document lifecycle */
  public readonly events = {
    /** Fired when a new document is created */
    documentCreated: new AcCmEventManager<AcDbDocumentEventArgs>(),
    /** Fired when a document becomes active */
    documentActivated: new AcCmEventManager<AcDbDocumentEventArgs>()
  }

  /**
   * Private constructor for singleton pattern.
   *
   * Creates an empty document with a 2D view and sets up the application context.
   * Registers default commands and creates an example document.
   *
   * @param options -Options for creating AcApDocManager instance
   * @private
   */
  private constructor(options: AcApDocManagerOptions = {}) {
    this._baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    if (options.useMainThreadDraw) {
      AcTrMTextRenderer.getInstance().setRenderMode('main')
    } else {
      AcTrMTextRenderer.getInstance().setRenderMode('worker')
    }

    // Create one empty drawing
    const doc = new AcApDocument()
    doc.database.events.openProgress.addEventListener(args => {
      eventBus.emit('open-file-progress', {
        database: doc.database,
        percentage: args.percentage,
        stage: args.stage,
        subStage: args.subStage,
        subStageStatus: args.subStageStatus,
        data: args.data
      })
    })
    const callback: AcEdCalculateSizeCallback = () => {
      return {
        width: window.innerWidth,
        height: window.innerHeight - 30
      }
    }
    const view = new AcTrView2d({
      canvas: options.canvas,
      calculateSizeCallback: callback
    })
    this._context = new AcApContext(view, doc)

    this._fontLoader = new AcApFontLoader()
    this._fontLoader.baseUrl = this._baseUrl + 'fonts/'
    acdbHostApplicationServices().workingDatabase = doc.database
    this.registerCommands()
  }

  /**
   * Creates the singleton instance with an optional canvas element.
   *
   * This method should be called before accessing the `instance` property
   * if you want to provide a specific canvas element.
   *
   * @param options -Options for creating AcApDocManager instance
   * @returns The singleton instance
   */
  static createInstance(options: AcApDocManagerOptions = {}) {
    if (AcApDocManager._instance == null) {
      AcApDocManager._instance = new AcApDocManager(options)
    }
    return this._instance
  }

  /**
   * Gets the singleton instance of the document manager.
   *
   * Creates a new instance if one doesn't exist yet.
   *
   * @returns The singleton document manager instance
   */
  static get instance() {
    if (!AcApDocManager._instance) {
      AcApDocManager._instance = new AcApDocManager()
    }
    return AcApDocManager._instance
  }

  /**
   * Gets the current application context.
   *
   * The context binds the current document with its associated view.
   *
   * @returns The current application context
   */
  get context() {
    return this._context
  }

  /**
   * Gets the currently open CAD document.
   *
   * @returns The current document instance
   */
  get curDocument() {
    return this._context.doc
  }

  /**
   * Gets the currently active document.
   *
   * For now, this is the same as `curDocument` since only one document
   * can be active at a time.
   *
   * @returns The current active document
   */
  get mdiActiveDocument() {
    return this._context.doc
  }

  /**
   * Gets the current 2D view used to display the drawing.
   *
   * @returns The current 2D view instance
   */
  get curView() {
    return this._context.view as AcTrView2d
  }

  /**
   * Gets the editor instance for handling user input.
   *
   * @returns The current editor instance
   */
  get editor() {
    return this._context.view.editor
  }

  /**
   * Base URL to load fonts
   */
  get baseUrl() {
    return this._baseUrl
  }

  /**
   * Gets the list of available fonts that can be loaded.
   *
   * Note: These fonts are available for loading but may not be loaded yet.
   *
   * @returns Array of available font names
   */
  get avaiableFonts() {
    return this._fontLoader.avaiableFonts
  }

  /**
   * Loads the specified fonts for text rendering.
   *
   * @param fonts - Array of font names to load
   * @returns Promise that resolves when fonts are loaded
   *
   * @example
   * ```typescript
   * await docManager.loadFonts(['Arial', 'Times New Roman']);
   * ```
   */
  async loadFonts(fonts: string[]) {
    await this._fontLoader.load(fonts)
  }

  /**
   * Loads default fonts for CAD text rendering.
   *
   * This method loads either the specified fonts or falls back to default Chinese fonts
   * (specifically 'simkai') if no fonts are provided. The loaded fonts are used for
   * rendering CAD text entities like MText and Text in the viewer.
   *
   * It is better to load default fonts when viewer is initialized so that the viewer can
   * render text correctly if fonts used in the document are not available.
   *
   * @param fonts - Optional array of font names to load. If not provided or null,
   *               defaults to ['simkai'] for Chinese text support
   * @returns Promise that resolves when all specified fonts are loaded
   *
   * @example
   * ```typescript
   * // Load default fonts (simkai)
   * await docManager.loadDefaultFonts();
   *
   * // Load specific fonts
   * await docManager.loadDefaultFonts(['Arial', 'SimSun']);
   *
   * // Load no fonts (empty array)
   * await docManager.loadDefaultFonts([]);
   * ```
   *
   * @see {@link AcApFontLoader.load} - The underlying font loading implementation
   * @see {@link createExampleDoc} - Method that uses this for example document creation
   */
  async loadDefaultFonts(fonts?: string[]) {
    if (fonts == null) {
      await this._fontLoader.load(['simkai'])
    } else {
      await this._fontLoader.load(fonts)
    }
  }

  /**
   * Opens a CAD document from a URL.
   *
   * This method loads a document from the specified URL and replaces the current document.
   * It handles the complete document lifecycle including before/after open events.
   *
   * @param url - The URL of the CAD file to open
   * @param options - Optional database opening options. If not provided, default options with font loader will be used
   * @returns Promise that resolves to true if the document was successfully opened, false otherwise
   *
   * @example
   * ```typescript
   * const success = await docManager.openUrl('https://example.com/drawing.dwg');
   * if (success) {
   *   console.log('Document opened successfully');
   * }
   * ```
   */
  async openUrl(url: string, options?: AcDbOpenDatabaseOptions) {
    this.onBeforeOpenDocument()
    options = this.setOptions(options)
    // TODO: The correct way is to create one new context instead of using old context and document
    const isSuccess = await this.context.doc.openUri(url, options)
    this.onAfterOpenDocument(isSuccess)
    return isSuccess
  }

  /**
   * Opens a CAD document from file content.
   *
   * This method loads a document from the provided file content (binary data)
   * and replaces the current document. It handles the complete document lifecycle
   * including before/after open events.
   *
   * @param fileName - The name of the file being opened (used for format detection)
   * @param content - The file content
   * @param options - Database opening options including font loader settings
   * @returns Promise that resolves to true if the document was successfully opened, false otherwise
   *
   * @example
   * ```typescript
   * const fileContent = await file.arrayBuffer();
   * const success = await docManager.openDocument('drawing.dwg', fileContent, options);
   * ```
   */
  async openDocument(
    fileName: string,
    content: ArrayBuffer,
    options: AcDbOpenDatabaseOptions
  ) {
    this.onBeforeOpenDocument()
    options = this.setOptions(options)
    // TODO: The correct way is to create one new context instead of using old context and document
    const isSuccess = await this.context.doc.openDocument(
      fileName,
      content,
      options
    )
    this.onAfterOpenDocument(isSuccess)
    return isSuccess
  }

  /**
   * Redraws the current view. Currently it is used once you modified font mapping
   * for missed fonts so that the drawing can apply new fonts.
   */
  regen() {
    this.curView.clear()
    this.context.doc.database.regen()
  }

  /**
   * Registers all default commands available in the CAD viewer.
   *
   * This method sets up the command system by registering built-in commands including:
   * - pan: Pan/move the view
   * - select: Select entities
   * - zoom: Zoom in/out
   * - zoomw: Zoom to window/box
   * - csvg: Convert to SVG
   * - qnew: Quick new document
   * - open: Open document
   *
   * All commands are registered under the system command group.
   */
  registerCommands() {
    const register = AcEdCommandStack.instance
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'pan',
      'pan',
      new AcApPanCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'regen',
      'regen',
      new AcApRegenCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'select',
      'select',
      new AcApSelectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'zoom',
      'zoom',
      new AcApZoomCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'zoomw',
      'zoomw',
      new AcApZoomToBoxCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'csvg',
      'csvg',
      new AcApConvertToSvgCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'qnew',
      'qnew',
      new AcApQNewCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'open',
      'open',
      new AcApOpenCmd()
    )
  }

  /**
   * Executes a command by its string name.
   *
   * This method looks up a registered command by name and executes it with the current context.
   * If the command is not found, no action is taken.
   *
   * @param cmdStr - The command string to execute (e.g., 'pan', 'zoom', 'select')
   *
   * @example
   * ```typescript
   * docManager.sendStringToExecute('zoom');
   * docManager.sendStringToExecute('pan');
   * ```
   */
  sendStringToExecute(cmdStr: string) {
    const register = AcEdCommandStack.instance
    const cmd = register.lookupGlobalCmd(cmdStr)
    cmd?.execute(this.context)
  }

  /**
   * Configures layout information for the current view.
   *
   * Sets up the active layout block table record ID and model space block table
   * record ID based on the current document's space configuration.
   */
  setActiveLayout() {
    const currentView = this.curView as AcTrView2d
    currentView.activeLayoutBtrId = this.curDocument.database.currentSpaceId
    currentView.modelSpaceBtrId = this.curDocument.database.currentSpaceId
  }

  /**
   * Performs cleanup operations before opening a new document.
   *
   * This protected method is called automatically before any document opening operation.
   * It clears the current view to prepare for the new document content.
   *
   * @protected
   */
  protected onBeforeOpenDocument() {
    this.curView.clear()
  }

  /**
   * Performs setup operations after a document opening attempt.
   *
   * This protected method is called automatically after any document opening operation.
   * If the document was successfully opened, it dispatches the documentActivated event,
   * sets up layout information, and zooms the view to fit the content.
   *
   * @param isSuccess - Whether the document was successfully opened
   * @protected
   */
  protected onAfterOpenDocument(isSuccess: boolean) {
    if (isSuccess) {
      const doc = this.context.doc
      this.events.documentActivated.dispatch({ doc })
      this.setActiveLayout()
      const db = doc.database

      // The extents of drawing database may be empty. Espically dxf files.
      if (db.extents.isEmpty()) {
        this.curView.zoomToFit()
      } else {
        this.curView.zoomTo(new AcGeBox2d(db.extmin, db.extmax))
      }
    }
  }

  /**
   * Sets up or validates database opening options.
   *
   * This private method ensures that the options object has a font loader configured.
   * If no options are provided, creates new options with the font loader.
   * If options are provided but missing a font loader, adds the font loader.
   *
   * @param options - Optional database opening options to validate/modify
   * @returns The validated options object with font loader configured
   * @private
   */
  private setOptions(options?: AcDbOpenDatabaseOptions) {
    if (options == null) {
      options = { fontLoader: this._fontLoader }
    } else if (options.fontLoader == null) {
      options.fontLoader = this._fontLoader
    }
    return options
  }
}
