import {
  AcCmEventManager,
  AcDbDatabaseConverterManager,
  AcDbDxfConverter,
  AcDbFileType,
  acdbHostApplicationServices,
  AcDbProgressdEventArgs,
  AcDbSysVarManager,
  AcGeBox2d
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

import {
  AcApCircleCmd,
  AcApConvertToSvgCmd,
  AcApDimLinearCmd,
  AcApEraseCmd,
  AcApLineCmd,
  AcApLogCmd,
  AcApOpenCmd,
  AcApPanCmd,
  AcApQNewCmd,
  AcApRectCmd,
  AcApRegenCmd,
  AcApRevCircleCmd,
  AcApRevCloudCmd,
  AcApRevRectCmd,
  AcApRevVisibilityCmd,
  AcApSelectCmd,
  AcApSketchCmd,
  AcApSwitchBgCmd,
  AcApSysVarCmd,
  AcApZoomCmd,
  AcApZoomToBoxCmd,
  AcEdCommandStack
} from '../command'
import { AcEdCalculateSizeCallback, AcEdOpenMode, eventBus } from '../editor'
import { AcApI18n } from '../i18n'
import { AcApPluginManager } from '../plugin/AcApPluginManager'
import { AcTrView2d } from '../view'
import { AcApContext } from './AcApContext'
import { AcApDocument } from './AcApDocument'
import { AcApFontLoader } from './AcApFontLoader'
import { AcApProgress } from './AcApProgress'
import { AcApOpenDatabaseOptions } from './AcDbOpenDatabaseOptions'

const DEFAULT_BASE_URL = 'https://mlightcad.gitlab.io/cad-data/'

/**
 * Event arguments for document-related events.
 */
export interface AcDbDocumentEventArgs {
  /** The document involved in the event */
  doc: AcApDocument
}

/**
 * Defines URLs for Web Worker JavaScript bundles used by the CAD viewer.
 *
 * Each entry points to a standalone worker script responsible for
 * off-main-thread processing such as file parsing or text rendering.
 */
export interface AcApWebworkerFiles {
  /**
   * URL of the Web Worker bundle responsible for parsing DXF files.
   *
   * This worker performs DXF decoding and entity extraction in a
   * background thread to avoid blocking the UI.
   */
  dxfParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for parsing DWG files.
   *
   * DWG parsing is computationally expensive and must be executed
   * in a Web Worker to maintain UI responsiveness.
   */
  dwgParser?: string | URL

  /**
   * URL of the Web Worker bundle responsible for rendering MTEXT entities.
   *
   * This worker handles MTEXT layout, formatting, and glyph processing
   * independently from the main rendering thread.
   */
  mtextRender?: string | URL
}

/**
 * Options for creating AcApDocManager instance
 */
export interface AcApDocManagerOptions {
  /**
   * Optional HTML container element for rendering. If not provided, a new container will be created
   */
  container?: HTMLElement
  /**
   * Width of the canvas element. If not provided, use container's width
   */
  width?: number
  /**
   * Height of the canvas element. If not provided, use container's height
   */
  height?: number
  /**
   * The flag whether to auto resize canvas when container size changed. Default is false.
   */
  autoResize?: boolean
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

  /**
   * The flag whether to load default fonts when initializing viewer. If no default font loaded,
   * texts with fonts which can't be found in font repository will not be shown correctly.
   */
  notLoadDefaultFonts?: boolean
  /**
   * URLs for Web Worker JavaScript bundles used by the CAD viewer.
   */
  webworkerFileUrls?: AcApWebworkerFiles

  /**
   * Configuration for automatic plugin loading.
   *
   * Plugins can be loaded automatically during initialization from:
   * - A configuration array of plugin instances or factory functions
   * - A folder path with a list of plugin files to load
   *
   * @example
   * ```typescript
   * // Load plugins from configuration
   * AcApDocManager.createInstance({
   *   plugins: {
   *     fromConfig: [
   *       new MyPlugin1(),
   *       () => new MyPlugin2()
   *     ]
   *   }
   * });
   *
   * // Load plugins from folder
   * AcApDocManager.createInstance({
   *   plugins: {
   *     fromFolder: {
   *       folderPath: './plugins',
   *       pluginList: ['Plugin1.js', 'Plugin2.js'],
   *       continueOnError: true
   *     }
   *   }
   * });
   * ```
   */
  plugins?: {
    /**
     * Load plugins from a configuration array.
     * Each item can be a plugin instance or a factory function that returns a plugin.
     */
    fromConfig?: Array<
      | import('../plugin/AcApPlugin').AcApPlugin
      | (() => import('../plugin/AcApPlugin').AcApPlugin)
    >
    /**
     * Load plugins from a folder using dynamic imports.
     */
    fromFolder?: {
      /** Path to the folder containing plugin files */
      folderPath: string
      /** List of plugin file names to load */
      pluginList: string[]
      /** Continue loading other plugins if one fails (default: false) */
      continueOnError?: boolean
    }
  }
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
  /** Progress animation */
  private _progress: AcApProgress
  /** Command manager */
  private _commandManager: AcEdCommandStack
  /** Plugin manager */
  private _pluginManager: AcApPluginManager
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
      const progress = {
        database: doc.database,
        percentage: args.percentage,
        stage: args.stage,
        subStage: args.subStage,
        subStageStatus: args.subStageStatus,
        data: args.data
      }
      eventBus.emit('open-file-progress', progress)
      this.updateProgress(progress)

      // After doc header is loaded, need to set global ltscale and celtscale
      // It's too late when subStage is 'END'
      if (args.subStage === 'HEADER') {
        this.curView.ltscale = doc.database.ltscale
        this.curView.celtscale = doc.database.celtscale
      }
    })

    const initialSize = options.container?.getBoundingClientRect() ?? {
      width: 300,
      height: 150
    }
    const callback: AcEdCalculateSizeCallback = () => {
      if (options.autoResize) {
        const box = options.container?.getBoundingClientRect()
        return {
          width: box?.width ?? initialSize.width,
          height: box?.height ?? initialSize.height
        }
      } else {
        return {
          width: options.width ?? initialSize.width,
          height: options.height ?? initialSize.height
        }
      }
    }
    const view = new AcTrView2d({
      container: options.container,
      calculateSizeCallback: callback
    })
    this._context = new AcApContext(view, doc)

    this._fontLoader = new AcApFontLoader()
    this._fontLoader.baseUrl = this._baseUrl + 'fonts/'
    acdbHostApplicationServices().workingDatabase = doc.database

    this._commandManager = new AcEdCommandStack()
    this.registerCommands()
    this._pluginManager = new AcApPluginManager(
      this._context,
      this._commandManager
    )
    this._progress = new AcApProgress()
    this._progress.hide()
    if (!options.notLoadDefaultFonts) {
      this.loadDefaultFonts()
    }
    this.registerWorkers(options.webworkerFileUrls)
    // Load plugins asynchronously (don't await to avoid blocking initialization)
    this.loadPlugins(options.plugins).catch(error => {
      console.error('[AcApDocManager] Error loading plugins:', error)
    })
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
   * Destroy the view and unload all plugins
   */
  async destroy() {
    await this._pluginManager.unloadAllPlugins()
    AcApDocManager._instance = undefined
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
   * Gets command manager to look up and register commands
   *
   * @returns The command manager
   */
  get commandManager() {
    return this._commandManager
  }

  /**
   * Gets plugin manager to load and unload plugins
   *
   * @returns The plugin manager
   */
  get pluginManager() {
    return this._pluginManager
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
  async openUrl(url: string, options?: AcApOpenDatabaseOptions) {
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
    options: AcApOpenDatabaseOptions
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
   * Search through all of the local and translated names in all of the command groups in the command stack
   * starting at the top of the stack trying to find a match with cmdName. If a match is found, the matched
   * AcEdCommand object is returned. Otherwise undefined is returned to indicate that the command could not
   * be found. If more than one command of the same name is present in the command stack (that is, in
   * separate command groups), then the first one found is used.
   *
   * The command which is compatible with the open mode of the current document is only returned
   *
   * @param cmdName - Input the command name to search for
   * @returns Return the matched AcEdCommand object if a match is found and compatible with the open mode of
   * the current document. Otherwise, return undefined.
   */
  lookupLocalCmd(cmdName: string) {
    return this._commandManager.lookupLocalCmd(
      cmdName,
      this.curDocument.openMode
    )
  }

  /**
   * Search through all of the global and untranslated names in all of the command groups in the command
   * stack starting at the top of the stack trying to find a match with cmdName. If a match is found, the
   * matched AcEdCommand object is returned. Otherwise undefined is returned to indicate that the command
   * could not be found. If more than one command of the same name is present in the command stack (that
   * is, in separate command groups), then the first one found is used.
   *
   * The command is only returned if it is compatible with that open mode of the current document.
   * Higher value modes are compatible with lower value modes.
   *
   * @param cmdName - Input the command name to search for
   * @returns Return the matched AcEdCommand object if a match is found and compatible with the open mode
   * of the current document. Otherwise, return undefined.
   */
  lookupGlobalCmd(cmdName: string) {
    return this._commandManager.lookupGlobalCmd(
      cmdName,
      this.curDocument.openMode
    )
  }

  /**
   * Fuzzy search for commands by prefix using the command iterator.
   *
   * This method iterates through all commands in all command groups and returns those
   * whose global or local names start with the provided prefix. The search is case-insensitive.
   * Only commands which are compatible with that open mode of the current document are returned.
   * Higher value modes are compatible with lower value modes.
   *
   * @param prefix - The prefix string to search for. Case-insensitive.
   * @returns An array of objects containing matched commands and their corresponding group names.
   */
  searchCommandsByPrefix(prefix: string) {
    return this._commandManager.searchCommandsByPrefix(
      prefix,
      this.curDocument.openMode
    )
  }

  /**
   * Registers all default commands available in the CAD viewer.
   *
   * This method sets up the command system by registering built-in commands including:
   * - csvg: Convert to SVG
   * - log: Output debug information in console
   * - open: Open document
   * - qnew: Quick new document
   * - pan: Pan/move the view
   * - select: Select entities
   * - zoom: Zoom in/out
   * - zoomw: Zoom to window/box
   *
   * All commands are registered under the system command group.
   */
  private registerCommands() {
    const register = this._commandManager
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'circle',
      'circle',
      new AcApCircleCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'csvg',
      'csvg',
      new AcApConvertToSvgCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'erase',
      'erase',
      new AcApEraseCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'dimlinear',
      'dimlinear',
      new AcApDimLinearCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'line',
      'line',
      new AcApLineCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'log',
      'log',
      new AcApLogCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'open',
      'open',
      new AcApOpenCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'pan',
      'pan',
      new AcApPanCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'qnew',
      'qnew',
      new AcApQNewCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'rectangle',
      'rectangle',
      new AcApRectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'regen',
      'regen',
      new AcApRegenCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'revcircle',
      'revcircle',
      new AcApRevCircleCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'revcloud',
      'revcloud',
      new AcApRevCloudCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'revrect',
      'revrect',
      new AcApRevRectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'revvis',
      'revvis',
      new AcApRevVisibilityCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'select',
      'select',
      new AcApSelectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'sketch',
      'sketch',
      new AcApSketchCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'switchbg',
      'switchbg',
      new AcApSwitchBgCmd()
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

    // Register system variables as commands
    const sysVars = AcDbSysVarManager.instance().getAllDescriptors()
    sysVars.forEach(sysVar => {
      register.addCommand(
        AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
        sysVar.name,
        sysVar.name,
        new AcApSysVarCmd()
      )
    })
  }

  /**
   * Executes a command by its string name.
   *
   * This method looks up a registered command by name and executes it with the current context.
   * It checks if the command's required mode is compatible with the document's current mode.
   * If the command is not found or not compatible, an error is thrown.
   *
   * @param cmdStr - The command string to execute (e.g., 'pan', 'zoom', 'select')
   * @throws {Error} If the command is not found or if the command's mode is not compatible with the document's mode
   *
   * @example
   * ```typescript
   * docManager.sendStringToExecute('zoom');
   * docManager.sendStringToExecute('pan');
   * ```
   */
  sendStringToExecute(cmdStr: string) {
    const documentMode = this.context.doc.openMode
    const cmd = this._commandManager.lookupGlobalCmd(cmdStr)

    if (!cmd) {
      throw new Error(`Command '${cmdStr}' not found`)
    }

    // Check mode compatibility: document mode must be >= command mode
    if (documentMode < cmd.mode) {
      throw new Error(
        `Command '${cmdStr}' requires mode '${AcEdOpenMode[cmd.mode]}' but document is in mode '${AcEdOpenMode[documentMode]}'!`
      )
    }

    cmd.trigger(this.context)
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
        this.curView.zoomToFitDrawing()
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
  private setOptions(options?: AcApOpenDatabaseOptions) {
    if (options == null) {
      options = { fontLoader: this._fontLoader }
    } else if (options.fontLoader == null) {
      options.fontLoader = this._fontLoader
    }
    return options
  }

  /**
   * Shows progress animation and progress message
   * @param data - Progress data
   */
  private updateProgress(data: AcDbProgressdEventArgs) {
    if (data.stage === 'CONVERSION') {
      if (data.subStage) {
        const key =
          'main.progress.' + data.subStage.replace(/_/g, '').toLowerCase()
        this._progress.setMessage(AcApI18n.t(key))
      }
    } else if (data.stage === 'FETCH_FILE') {
      this._progress.setMessage(AcApI18n.t('main.message.fetchingDrawingFile'))
    }

    const percentage = data.percentage
    if (percentage >= 100) {
      this._progress.hide()
    } else {
      this._progress.show()
    }
  }

  /**
   * Registers file format converters for CAD file processing.
   *
   * This function initializes and registers both DXF and DWG converters with the
   * global database converter manager. Each converter is configured to use web workers
   * for improved performance during file parsing operations.
   *
   * The function handles registration errors gracefully by logging them to the console
   * without throwing exceptions, ensuring that the application can continue to function
   * even if one or more converters fail to register.
   */
  private registerConverters(webworkerFileUrls?: AcApWebworkerFiles) {
    // Register DXF converter
    try {
      const converter = new AcDbDxfConverter({
        convertByEntityType: false,
        useWorker: true,
        parserWorkerUrl:
          webworkerFileUrls && webworkerFileUrls.dxfParser
            ? webworkerFileUrls.dxfParser
            : './assets/dxf-parser-worker.js'
      })
      AcDbDatabaseConverterManager.instance.register(
        AcDbFileType.DXF,
        converter
      )
    } catch (error) {
      console.error('Failed to register dxf converter: ', error)
    }

    // Register DWG converter
    try {
      const converter = new AcDbLibreDwgConverter({
        convertByEntityType: false,
        useWorker: true,
        parserWorkerUrl:
          webworkerFileUrls && webworkerFileUrls.dwgParser
            ? webworkerFileUrls.dwgParser
            : './assets/libredwg-parser-worker.js'
      })
      AcDbDatabaseConverterManager.instance.register(
        AcDbFileType.DWG,
        converter
      )
    } catch (error) {
      console.error('Failed to register dwg converter: ', error)
    }
  }

  /**
   * Initializes background workers used by the viewer runtime.
   *
   * This function performs two tasks:
   * - Ensures DXF/DWG converters are registered with worker-based parsers for
   *   off-main-thread file processing.
   * - Initializes the MText renderer by pointing it to its dedicated Web Worker
   *   script for text layout and shaping.
   *
   * The function is safe to call during application startup. Errors during
   * initialization are handled inside the respective registration routines.
   */
  private registerWorkers(webworkerFileUrls?: AcApWebworkerFiles) {
    this.registerConverters(webworkerFileUrls)
    AcTrMTextRenderer.getInstance().initialize(
      webworkerFileUrls && webworkerFileUrls.mtextRender
        ? webworkerFileUrls.mtextRender
        : './assets/mtext-renderer-worker.js'
    )
  }

  /**
   * Loads plugins automatically based on the provided configuration.
   *
   * This method is called during initialization if plugins are configured.
   * It supports loading from both configuration arrays and folder paths.
   *
   * @param pluginsConfig - Plugin loading configuration
   * @private
   */
  private async loadPlugins(pluginsConfig?: AcApDocManagerOptions['plugins']) {
    if (!pluginsConfig) {
      return
    }

    // Load plugins from configuration array
    if (pluginsConfig.fromConfig && pluginsConfig.fromConfig.length > 0) {
      try {
        const result = await this._pluginManager.loadPluginsFromConfig(
          pluginsConfig.fromConfig,
          { continueOnError: true }
        )
        if (result.loaded.length > 0) {
          console.log(
            `[AcApDocManager] Loaded ${result.loaded.length} plugin(s) from config:`,
            result.loaded
          )
        }
        if (result.failed.length > 0) {
          console.warn(
            `[AcApDocManager] Failed to load ${result.failed.length} plugin(s):`,
            result.failed.map(f => `${f.name}: ${f.error.message}`)
          )
        }
      } catch (error) {
        console.error(
          '[AcApDocManager] Error loading plugins from config:',
          error
        )
      }
    }

    // Load plugins from folder
    if (pluginsConfig.fromFolder) {
      try {
        const result = await this._pluginManager.loadPluginsFromFolder(
          pluginsConfig.fromFolder.folderPath,
          {
            pluginList: pluginsConfig.fromFolder.pluginList,
            continueOnError: pluginsConfig.fromFolder.continueOnError ?? true
          }
        )
        if (result.loaded.length > 0) {
          console.log(
            `[AcApDocManager] Loaded ${result.loaded.length} plugin(s) from folder:`,
            result.loaded
          )
        }
        if (result.failed.length > 0) {
          console.warn(
            `[AcApDocManager] Failed to load ${result.failed.length} plugin(s) from folder:`,
            result.failed.map(f => `${f.name}: ${f.error.message}`)
          )
        }
      } catch (error) {
        console.error(
          '[AcApDocManager] Error loading plugins from folder:',
          error
        )
      }
    }
  }
}
