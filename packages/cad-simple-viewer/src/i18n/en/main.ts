export default {
  document: {
    untitled: 'Untitled'
  },
  commandLine: {
    noLast: '(no last command)',
    unknownCommand: 'Unknown command',
    executed: 'Executed command',
    showHistory: 'Show command history',
    placeholder: 'Type command',
    showMessages: 'Show message history',
    canceled: '*Canceled*',
    noHistory: '(no history)',
    invalidInput: 'Invalid input.',
    close: 'Close command line'
  },
  mobileCommand: {
    length: 'Length',
    angle: 'Angle',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Confirm',
    cancel: 'Cancel',
    help: 'Help',
    back: 'Back',
    collapse: 'Collapse',
    expand: 'Expand'
  },
  inputManager: {
    firstCorner: 'Specify the first corner or',
    secondCorner: 'Specify the second corner or'
  },
  message: {
    fetchingDrawingFile: 'Fetching file ...',
    exportingDxf: 'Exporting DXF ...',
    exportingEntityPreview: 'Exporting image ...',
    collectingMemoryProfile: 'Analyzing memory ...',
    fontCached: 'Font cached successfully',
    fontCacheFailed: 'Failed to cache font',
    fontsNotFound:
      'Fonts not found in the font repository: {fonts}.',
    fontsNotLoaded: 'Failed to load fonts: {fonts}.',
    fontMissedInDrawing:
      'Font "{font}" is required by {count} text object(s) but is not available. Displaying with "{replacementFont}".',
    fontMissedReplacement: '"{font}" (displaying with "{replacement}")',
    failedToGetAvaiableFonts: 'Failed to get available fonts from "{url}"!',
    failedToOpenFile: 'Failed to open file "{fileName}"!',
    failedToOpenFileWorkerOom:
      'Failed to open "{fileName}". The drawing is too large for available memory.',
    failedToOpenFileWorkerTimeout:
      'Failed to open "{fileName}". The operation timed out while parsing the drawing.',
    failedToOpenFileFontLoadFailed:
      'Failed to open "{fileName}". Required fonts could not be loaded.',
    failedToOpenFileLicenseExpired:
      'Failed to open "{fileName}". The DWG converter license has expired.',
    failedToOpenFileLicenseInvalid:
      'Failed to open "{fileName}". The DWG converter license is missing or invalid.',
    unknownEntities:
      'This drawing contains {count} unknown or unsupported entities! Those entities will not be shown.',
    tianzhengEntities:
      'This drawing contains TArch / Tianzheng (or similar third-party) custom entities (about {count}). They cannot be fully parsed in this environment, so some content may not display.',
    emptyProxyEntities:
      'This drawing contains {count} custom entities without proxy graphics! Those entities will not be shown.'
  },
  notification: {
    center: {
      title: 'Notifications',
      clearAll: 'Clear All',
      noNotifications: 'No notifications'
    },
    group: {
      fontMissed: 'Missing Fonts',
      fontMissedSummary:
        '{count} font-related messages. Click to expand details.',
      unsupportedEntities: 'Unsupported Entities',
      unsupportedEntitiesSummary:
        '{count} parsing-related messages. Click to expand details.',
      genericSummary: '{count} messages. Click to expand details.'
    },
    title: {
      failedToOpenFile: 'Failed to Open File',
      failedToOpenFileWorkerOom: 'Drawing Too Large',
      failedToOpenFileWorkerTimeout: 'Open Timed Out',
      failedToOpenFileFontLoadFailed: 'Font Load Failed',
      failedToOpenFileLicenseExpired: 'License Expired',
      failedToOpenFileLicenseInvalid: 'Invalid License',
      fontNotFound: 'Font Not Found',
      fontNotLoaded: 'Font Not Loaded',
      parsingWarning: 'Issues on Parsing Drawing',
      systemMessage: 'System Message',
      systemWarning: 'System Warning',
      systemError: 'System Error',
      systemInfo: 'System Info'
    }
  },
  progress: {
    start: 'Start parsing file ...',
    parse: 'Parsing file ...',
    font: 'Downloading fonts needed by this drawing ...',
    ltype: 'Parsing line types ...',
    style: 'Parsing text syltes ...',
    dimstyle: 'Parsing dimension styles ...',
    layer: 'Parsing layers ...',
    vport: 'Parsing viewports ...',
    blockrecord: 'Parsing block record ...',
    header: 'Parsing header ...',
    block: 'Parsing blocks ...',
    entity: 'Parsing entities ...',
    object: 'Parsing named dictionaries ...',
    rendering: 'Rendering drawing ...',
    end: 'Finished!'
  },
  about: {
    title: 'About',
    close: 'Close',
    product: 'CAD Viewer',
    tagline: 'High-performance web CAD viewer for DWG and DXF drawings.',
    website: 'Website',
    docs: 'Documentation',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. All rights reserved.',
    ok: 'OK'
  },
  drawStyle: {
    color: 'Color',
    fontSize: 'Text height'
  },
  shortCutToolbar: {
    more: 'More',
    undo: 'Undo',
    redo: 'Redo',
    erase: 'Delete'
  },
  textHeight: {
    title: 'Text Height',
    close: 'Close',
    ok: 'OK',
    cancel: 'Cancel',
    adaptive: 'Fit to screen',
    custom: 'Custom text height',
    customPlaceholder: 'World height',
    fromScreen: 'From screen size',
    fromScreenHint:
      'Enter how large the text should look on screen at the current zoom. It is converted to a fixed world-space height that stays constant when you zoom later.',
    screenPxPlaceholder: 'Font size',
    screenUnit: 'px',
    convert: 'Convert'
  },
  entityPick: {
    cancel: 'Cancel selection'
  },
  colorPicker: {
    title: 'Select Color',
    close: 'Close',
    ok: 'OK',
    cancel: 'Cancel',
    index: 'Color Index: ',
    rgb: 'RGB: ',
    input: 'Color',
    inputPlaceholder: '1-255 or #RRGGBB'
  },
  touchPointTutorial: {
    title: 'How to pick points precisely?',
    description:
      'Long-press on the screen for about 1 second. A cross appears above your finger and follows as you move, snapping to geometry for more accurate picks.',
    snoozeToday: 'Don\'t remind me today',
    hideForever: 'Don\'t remind me again',
    ok: 'Got it'
  }
}
