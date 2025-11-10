export default {
  mainMenu: {
    new: 'New Drawing',
    open: 'Open Drawing',
    export: 'Export to SVG'
  },
  commandLine: {
    prompt: 'Type a command...'
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
    end: 'Finished!'
  },
  verticalToolbar: {
    select: {
      text: 'Select',
      description: 'Selects entities'
    },
    pan: {
      text: 'Pan',
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    zoomToExtent: {
      text: 'Zoom Extents',
      description: 'Zooms to display the maximum extents of all entities'
    },
    zoomToBox: {
      text: 'Zoom Window',
      description: 'Zooms to display an area specified by a rectangular window'
    },
    layer: {
      text: 'Layer',
      description: 'Manages layers'
    }
  },
  statusBar: {
    setting: {
      tooltip: 'Display Settings',
      commandLine: 'Command Line',
      coordinate: 'Coordinate',
      entityInfo: 'Entity Info',
      languageSelector: 'Language Selector',
      mainMenu: 'Main Menu',
      toolbar: 'Toolbar',
      stats: 'Statistics'
    },
    pointStyle: {
      tooltip: 'Modify point style'
    },
    fullScreen: {
      on: 'Turn on full screen mode',
      off: 'Turn off full screen mode'
    },
    theme: {
      dark: 'Switch to dark theme',
      light: 'Switch to light light'
    },
    warning: {
      font: 'The following fonts are not found!'
    },
    notification: {
      tooltip: 'Show notifications'
    }
  },
  toolPalette: {
    entityProperties: {
      tab: 'Properties',
      title: 'Entity Properties',
      propertyPanel: {
        noEntitySelected: 'No entity selected!',
        multipleEntitySelected: '{count} entities selected'
      }
    },
    layerManager: {
      tab: 'Layers',
      title: 'Layer Manager',
      layerList: {
        name: 'Name',
        on: 'On',
        color: 'Color'
      }
    }
  },
  entityInfo: {
    color: 'Color',
    layer: 'Layer',
    lineType: 'Linetype'
  },
  message: {
    loadingFonts: 'Loading fonts ...',
    loadingDwgConverter: 'Loading DWG converter...',
    fontsNotFound: 'Fonts "{fonts}" can not be found in font repository!',
    fontsNotLoaded: 'Fonts "{fonts}" can not be loaded!',
    failedToGetAvaiableFonts: 'Failed to get avaiable fonts from "{url}"!',
    failedToOpenFile: 'Failed to open file "{fileName}"!',
    fetchingDrawingFile: 'Fetching file ...',
    unknownEntities:
      'This drawing contains {count} unknown or unsupported entities! Those entities will not be shown.'
  },
  notification: {
    center: {
      title: 'Notifications',
      clearAll: 'Clear All',
      noNotifications: 'No notifications'
    },
    time: {
      justNow: 'Just now',
      minutesAgo: '{count} minute ago | {count} minutes ago',
      hoursAgo: '{count} hour ago | {count} hours ago',
      daysAgo: '{count} day ago | {count} days ago'
    },
    title: {
      failedToOpenFile: 'Failed to Open File',
      fontNotFound: 'Font Not Found',
      fontNotLoaded: 'Font Not Loaded',
      parsingWarning: 'Issues on Parsing Drawing'
    }
  }
}
