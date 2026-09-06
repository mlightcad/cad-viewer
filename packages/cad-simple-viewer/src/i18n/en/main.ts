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
      'Failed to open "{fileName}". The DWG converter license is missing or invalid.'
  },
  notification: {
    title: {
      failedToOpenFile: 'Failed to Open File',
      failedToOpenFileWorkerOom: 'Drawing Too Large',
      failedToOpenFileWorkerTimeout: 'Open Timed Out',
      failedToOpenFileFontLoadFailed: 'Font Load Failed',
      failedToOpenFileLicenseExpired: 'License Expired',
      failedToOpenFileLicenseInvalid: 'Invalid License'
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
