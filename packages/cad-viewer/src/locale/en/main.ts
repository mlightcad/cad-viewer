export default {
  mainMenu: {
    new: 'New Drawing',
    open: 'Open Drawing',
    export: 'Export to DXF',
    exportImage: 'Export to Image'
  },
  ribbon: {
    tab: {
      home: 'Home',
      tools: 'Tools',
      hatchContext: 'Hatch'
    },
    hatch: {
      contextTitle: 'Hatch Creation',
      group: {
        boundary: 'Boundaries',
        pattern: 'Pattern',
        properties: 'Properties',
        close: 'Close'
      },
      command: {
        pickPoints: 'Pick Points',
        selectObjects: 'Select Objects',
        close: 'Close'
      },
      field: {
        pattern: 'Pattern',
        scale: 'Scale',
        angle: 'Angle',
        style: 'Style',
        associative: 'Associative'
      },
      style: {
        normal: 'Normal',
        outer: 'Outer',
        ignore: 'Ignore'
      },
      associative: {
        on: 'On',
        off: 'Off'
      },
      tooltip: {
        pickPoints: 'Pick internal points to create hatch regions.',
        selectObjects: 'Select closed boundary objects to hatch.',
        pattern: 'Choose the hatch pattern name.',
        scale: 'Set the hatch pattern scale.',
        angle: 'Set the hatch pattern angle in degrees.',
        style: 'Control island detection style for hatch creation.',
        associative: 'Toggle associative hatch mode.',
        close: 'Exit Hatch creation and close this contextual tab.'
      }
    },
    group: {
      draw: 'Draw',
      modify: 'Modify',
      layer: 'Layer',
      properties: 'Properties',
      utilities: 'Utilities',
      annotation: 'Annotation',
      measurement: 'Measurement'
    },
    property: {
      color: 'Color',
      lineType: 'Linetype',
      lineWeight: 'Lineweight'
    },
    layerTools: {
      select: 'Layer',
      off: 'Turn Off Layer',
      isolate: 'Isolate',
      freeze: 'Freeze Layer',
      lock: 'Lock Layer',
      current: 'Set Current',
      allOn: 'Layer On',
      unisolate: 'Unisolate',
      thaw: 'Thaw Layer',
      unlock: 'Unlock Layer',
      restore: 'Layer Restore'
    },
    arc: {
      threePoint: '3-Point',
      startCenterEnd: 'Start, Center, End',
      startCenterAngle: 'Start, Center, Angle',
      startCenterLength: 'Start, Center, Length',
      startEndAngle: 'Start, End, Angle',
      startEndDirection: 'Start, End, Direction',
      startEndRadius: 'Start, End, Radius',
      centerStartEnd: 'Center, Start, End',
      centerStartAngle: 'Center, Start, Angle',
      centerStartLength: 'Center, Start, Length'
    },
    circle: {
      centerRadius: 'Center, Radius',
      centerDiameter: 'Center, Diameter',
      twoPoint: '2-Point',
      threePoint: '3-Point',
      tanTanRadius: 'Tan, Tan, Radius',
      tanTanTan: 'Tan, Tan, Tan'
    },
    ellipse: {
      ellipse: 'Ellipse',
      arc: 'Elliptical Arc'
    },
    tooltip: {
      line: 'Draw a single straight line segment.',
      polyline:
        'Draw a connected series of line or arc segments as one object.',
      spline: 'Draw a smooth spline curve through fit or control points.',
      circle: 'Draw a circle with multiple construction methods.',
      arc: 'Draw an arc with multiple construction methods.',
      mline: 'Draw multiple parallel lines as a single multiline object.',
      ray: 'Draw a semi-infinite construction ray from a start point.',
      xline: 'Draw an infinite construction line.',
      ellipse: 'Draw an ellipse or elliptical arc.',
      rect: 'Draw a rectangle or regular polygon.',
      point: 'Place a point object in the drawing.',
      hatch: 'Fill a closed area with a hatch pattern.',
      text: 'Create multiline text annotations in the drawing.',
      move: 'Move selected objects to a new position.',
      rotate: 'Rotate selected objects around a base point.',
      copy: 'Copy selected objects to a new location.',
      erase: 'Delete selected objects from the drawing.',
      properties: 'Open the Properties palette for the current selection.',
      quickSelect:
        'Open Quick Select to filter and select entities by criteria.',
      propertyColor:
        'Set the color for newly created objects or selected entities.',
      propertyLineType:
        'Set the line type for newly created objects or selected entities.',
      propertyLineWeight:
        'Set the line weight for newly created objects or selected entities.',
      layerAction: {
        off: 'Turns off the selected layer so its objects are hidden without freezing the layer.',
        isolate:
          'Shows only the selected layer and hides the others so you can focus on related objects.',
        freeze:
          'Freezes the selected layer so its objects are hidden and skipped during regeneration.',
        lock: 'Locks the selected layer so its objects stay visible but cannot be edited.',
        current:
          'Makes the selected layer current so new objects are created on that layer.',
        allOn:
          'Turns on every layer that is currently off. Layers that are frozen remain frozen.',
        unisolate:
          'Restores layers hidden or locked by Layer Isolate while keeping later layer changes.',
        thaw: 'Thaws the selected layer so its objects are visible and included in regeneration again.',
        unlock:
          'Unlocks the selected layer so its objects can be selected and modified again.',
        restore:
          'Restores the previous layer state from the most recent layer action in this ribbon.'
      },
      circleOption: {
        centerRadius:
          'Create a circle by specifying a center point and a radius.',
        centerDiameter:
          'Create a circle by specifying a center point and a diameter.',
        twoPoint: 'Create a circle whose diameter is defined by two points.',
        threePoint: 'Create a circle that passes through three points.',
        tanTanRadius:
          'Create a circle tangent to two objects with a specified radius.',
        tanTanTan: 'Create a circle tangent to three objects.'
      },
      arcOption: {
        threePoint:
          'Create an arc that passes through a start point, a second point, and an end point.',
        startCenterEnd:
          'Create an arc by specifying a start point, center point, and end point.',
        startCenterAngle:
          'Create an arc using a start point, center point, and included angle.',
        startCenterLength:
          'Create an arc using a start point, center point, and arc length.',
        startEndAngle:
          'Create an arc from start and end points with an included angle.',
        startEndDirection:
          'Create an arc from start and end points with a tangent direction at the start point.',
        startEndRadius:
          'Create an arc from start and end points with a specified radius.',
        centerStartEnd:
          'Create an arc by specifying a center point, start point, and end point.',
        centerStartAngle:
          'Create an arc by specifying a center point, start point, and included angle.',
        centerStartLength:
          'Create an arc by specifying a center point, start point, and arc length.'
      },
      rectOption: {
        rectangle:
          'Create a rectangle by specifying opposite corners or dimensions.',
        polygon:
          'Create a regular polygon by specifying the number of sides and construction method.'
      },
      ellipseOption: {
        ellipse: 'Create a full ellipse by specifying major and minor axes.',
        arc: 'Create an elliptical arc by specifying ellipse axes and arc limits.'
      }
    },
    command: {
      line: 'Line',
      polyline: 'Polyline',
      circle: 'Circle',
      arc: 'Arc',
      mline: 'MLine',
      ray: 'Ray',
      xline: 'XLine',
      ellipse: 'Ellipse',
      spline: 'Spline',
      rect: 'Rect',
      rectangle: 'Rectangle',
      polygon: 'Polygon',
      point: 'Point',
      divide: 'Divide',
      hatch: 'Hatch',
      text: 'Text',
      gradient: 'Gradient',
      move: 'Move',
      rotate: 'Rotate',
      copy: 'Copy',
      erase: 'Erase',
      properties: 'Properties',
      quickSelect: 'Quick Select'
    }
  },
  verticalToolbar: {
    measure: {
      text: 'Measure',
      description: 'Measurement tools'
    },
    measureDistance: {
      text: 'Distance',
      description: 'Measures the distance between two points'
    },
    measureAngle: {
      text: 'Angle',
      description:
        'Measures the angle between two lines sharing a common vertex'
    },
    measureArea: {
      text: 'Area',
      description: 'Measures the area of a polygon'
    },
    measureArc: {
      text: 'Arc',
      description: 'Measures the length of an arc defined by three points'
    },
    clearMeasurements: {
      text: 'Clear',
      description: 'Removes all active measurements from the view'
    },
    annotation: {
      text: 'Annotation',
      description:
        'Creates text or graphic annotations to explain and mark up drawing content'
    },
    hideAnnotation: {
      text: 'Hide',
      description: 'Hides annotations'
    },
    layer: {
      text: 'Layer',
      description: 'Manages layers'
    },
    pan: {
      text: 'Pan',
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    revCircle: {
      text: 'Circle',
      description: 'Uses circles to highlight and annotate areas in the drawing'
    },
    revLine: {
      text: 'Line',
      description:
        'Uses straight lines to annotate and explain objects or areas in the drawing'
    },
    revFreehand: {
      text: 'Freehand',
      description:
        'Uses freehand strokes to freely annotate and emphasize drawing content'
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
    showAnnotation: {
      text: 'Show',
      description: 'Shows annotations'
    },
    switchBg: {
      text: 'Switch',
      description: 'Switches the drawing background between white and black'
    },
    zoomToExtent: {
      text: 'Zoom Extents',
      description: 'Zooms to display the maximum extents of all entities'
    },
    zoomToBox: {
      text: 'Zoom Window',
      description: 'Zooms to display an area specified by a rectangular window'
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
      insertion: 'Insertion',
      nearest: 'Nearest'
    },
    pointStyle: {
      tooltip: 'Modify point style'
    },
    fullScreen: {
      on: 'Turn off full screen mode',
      off: 'Turn on full screen mode'
    },
    dynamicInput: {
      on: 'Turn off dynamic input',
      off: 'Turn on dynamic input'
    },
    lineWidth: {
      on: 'Hide line widths',
      off: 'Show line widths'
    },
    theme: {
      dark: 'Switch to light light',
      light: 'Switch to dark theme'
    },
    warning: {
      font: 'The following fonts are not found!'
    },
    notification: {
      tooltip: 'Show notifications'
    },
    export: {
      tooltip: 'Export image as PNG'
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
  lineTypeSelect: {
    placeholder: 'Linetype'
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
  ribbonProperty: {
    color: 'Color',
    lineType: 'Linetype',
    lineWeight: 'Lineweight',
    layer: 'Layer'
  },
  layerSelect: {
    searchPlaceholder: 'Search layer name',
    noLayerAvailable: 'No layers available',
    noMatchedLayer: 'No matched layers',
    tooltip: {
      layer: 'Layer',
      visibility: 'Visibility',
      freeze: 'Freeze',
      lock: 'Lock',
      lineType: 'Linetype',
      color: 'Color',
      visible: 'Visible',
      hidden: 'Hidden',
      frozen: 'Frozen',
      thawed: 'Thawed',
      locked: 'Locked',
      unlocked: 'Unlocked'
    }
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
