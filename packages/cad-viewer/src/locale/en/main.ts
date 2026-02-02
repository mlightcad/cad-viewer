export default {
  mainMenu: {
    new: 'New Drawing',
    open: 'Open Drawing',
    export: 'Export to SVG'
  },
  verticalToolbar: {
    comment: {
      text: 'Comment',
      description:
        'Create text or graphic annotations to explain and mark up drawing content'
    },
    revCircle: {
      text: 'Circle',
      description: 'Use circles to highlight and annotate areas in the drawing'
    },
    revLine: {
      text: 'Line',
      description:
        'Use straight lines to annotate and explain objects or areas in the drawing'
    },
    revFreehand: {
      text: 'Freehand',
      description:
        'Use freehand strokes to freely annotate and emphasize drawing content'
    },
    revRect: {
      text: 'Rectangle',
      description:
        'Use rectangles to highlight and annotate objects or areas in the drawing'
    },
    revCloud: {
      text: 'Rev Cloud',
      description:
        'Used to highlight areas in a drawing with a cloud-shaped outline'
    },
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
      fileName: 'File Name',
      languageSelector: 'Language Selector',
      mainMenu: 'Main Menu',
      toolbar: 'Toolbar',
      stats: 'Statistics'
    },
    osnap: {
      tooltip: 'Object Snap',
      endpoint: 'Endpoint',
      midpoint: 'Midpoint',
      center: 'Center',
      node: 'Node',
      quadrant: 'Quadrant',
      insertion: 'Insertion'
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
        multipleEntitySelected: '{count} entities selected',
        propValCopied: 'Property value copied',
        failedToCopyPropVal: 'Failed to copy property value!'
      }
    },
    layerManager: {
      tab: 'Layers',
      title: 'Layer Manager',
      layerList: {
        name: 'Name',
        on: 'On',
        color: 'Color',
        zoomToLayer: 'Zoomed to the clicked layer "{layer}"'
      }
    }
  },
  colorDropdown: {
    custom: 'Custom'
  },
  colorIndexPicker: {
    color: 'Color: ',
    colorIndex: 'Color Index: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
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
