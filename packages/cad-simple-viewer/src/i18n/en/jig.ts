export default {
  arc: {
    startPointOrCenter: 'Specify start point of arc or',
    secondPointOrOptions: 'Specify second point of arc or',
    secondPoint: 'Specify second point of arc',
    startPoint: 'Specify start point of arc',
    centerPoint: 'Specify center point of arc',
    endPoint: 'Specify end point of arc',
    endPointOrOptions: 'Specify end point of arc or',
    centerPointOrOptions: 'Specify center point of arc',
    includedAngle: 'Specify included angle',
    chordLength: 'Specify chord length',
    tangentDirection: 'Specify tangent direction for start point of arc',
    radius: 'Specify radius of arc',
    keywords: {
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      end: {
        display: 'End(E)',
        local: 'End',
        global: 'End'
      },
      angle: {
        display: 'Angle(A)',
        local: 'Angle',
        global: 'Angle'
      },
      chordLength: {
        display: 'chord Length(L)',
        local: 'Chord Length',
        global: 'ChordLength'
      },
      direction: {
        display: 'Direction(D)',
        local: 'Direction',
        global: 'Direction'
      },
      radius: {
        display: 'Radius(R)',
        local: 'Radius',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'Invalid 3-point arc: points are collinear or cannot define an arc.',
      center:
        'Invalid center input: start and end points must lie on the same circle.',
      angle:
        'Invalid angle input: included angle must be greater than 0 and less than 360 degrees.',
      chordLength:
        'Invalid chord length: value is out of range for the current radius.',
      direction:
        'Invalid direction: cannot construct an arc from this tangent direction.',
      radius:
        'Invalid radius: the specified radius cannot connect start and end points.'
    }
  },
  circle: {
    center: 'Specify the center of circle',
    centerOrOptions: 'Specify center point of circle or',
    radius: 'Specify the radius of circle',
    radiusOrDiameter: 'Specify radius of circle or',
    diameter: 'Specify diameter of circle',
    twoPointFirst: 'Specify first endpoint of circle diameter',
    twoPointSecond: 'Specify second endpoint of circle diameter',
    threePointFirst: 'Specify first point on circle',
    threePointSecond: 'Specify second point on circle',
    threePointThird: 'Specify third point on circle',
    keywords: {
      threeP: {
        display: '3P(3P)',
        local: '3P',
        global: '3P'
      },
      twoP: {
        display: '2P(2P)',
        local: '2P',
        global: '2P'
      },
      diameter: {
        display: 'Diameter(D)',
        local: 'Diameter',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'Specify base point or',
    displacementOrArray: 'Specify displacement or',
    secondPointOrArray: 'Specify second point or',
    modePrompt: 'Enter copy mode option',
    arrayItemCount:
      'Enter the number of items in the array including the original',
    arraySecondPointOrFit: 'Specify second point or',
    arrayFitSecondPoint: 'Specify second point',
    keywords: {
      displacement: {
        display: 'Displacement(D)',
        local: 'Displacement',
        global: 'Displacement'
      },
      mode: {
        display: 'Mode(O)',
        local: 'Mode',
        global: 'Mode'
      },
      multiple: {
        display: 'Multiple(M)',
        local: 'Multiple',
        global: 'Multiple'
      },
      single: {
        display: 'Single(S)',
        local: 'Single',
        global: 'Single'
      },
      array: {
        display: 'Array(A)',
        local: 'Array',
        global: 'Array'
      },
      fit: {
        display: 'Fit(F)',
        local: 'Fit',
        global: 'Fit'
      }
    }
  },
  copybase: {
    basePoint: 'Specify base point'
  },
  pasteclip: {
    insertionPoint: 'Specify insertion point',
    empty: 'The clipboard contains no drawing objects'
  },
  pasteorig: {
    sameDrawing:
      'PASTEORIG cannot paste into the drawing the objects were copied from'
  },
  pasteblock: {
    insertionPoint: 'Specify insertion point'
  },
  dimlinear: {
    xLine1Point: 'Specify first extension line origin or <select object>',
    xLine2Point: 'Specify second extension line origin',
    dimLinePoint: 'Specify dimension line location',
    selectObject: 'Select object to dimension',
    rejectObject: 'Object cannot be dimensioned with DIMLINEAR.',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    rotationAngle: 'Specify angle of dimension line',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' },
      horizontal: {
        display: 'Horizontal(H)',
        local: 'Horizontal',
        global: 'Horizontal'
      },
      vertical: {
        display: 'Vertical(V)',
        local: 'Vertical',
        global: 'Vertical'
      },
      rotated: {
        display: 'Rotated(R)',
        local: 'Rotated',
        global: 'Rotated'
      }
    }
  },
  dimaligned: {
    xLine1Point: 'Specify first extension line origin or <select object>',
    xLine2Point: 'Specify second extension line origin',
    dimLinePoint: 'Specify dimension line location',
    selectObject: 'Select object to dimension',
    rejectObject: 'Object cannot be dimensioned with DIMALIGNED.',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' }
    }
  },
  dimradius: {
    selectObject: 'Select arc or circle',
    rejectObject: 'Must select an arc or circle.',
    dimLinePoint: 'Specify dimension line location',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' }
    }
  },
  dimdiameter: {
    selectObject: 'Select arc or circle',
    rejectObject: 'Must select an arc or circle.',
    dimLinePoint: 'Specify dimension line location',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' }
    }
  },
  dimangular: {
    vertexOrSelect: 'Specify angle vertex or <select line>',
    xLine1Point: 'Specify first angle endpoint',
    xLine2Point: 'Specify second angle endpoint',
    arcPoint: 'Specify dimension arc line location',
    selectFirstLine: 'Select first line',
    selectSecondLine: 'Select second line',
    rejectObject: 'Must select a line.',
    linesParallel: 'Lines are parallel — no angle intersection.',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' }
    }
  },
  dimarc: {
    selectArc: 'Select arc',
    rejectObject: 'Must select an arc.',
    arcPoint: 'Specify arc length dimension location',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' }
    }
  },
  dimordinate: {
    featurePoint: 'Specify feature location',
    leaderEndpoint: 'Specify leader endpoint',
    dimensionText: 'Enter dimension text',
    textAngle: 'Specify angle of dimension text',
    keywords: {
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      text: { display: 'Text(T)', local: 'Text', global: 'Text' },
      angle: { display: 'Angle(A)', local: 'Angle', global: 'Angle' },
      xdatum: { display: 'Xdatum(X)', local: 'Xdatum', global: 'Xdatum' },
      ydatum: { display: 'Ydatum(Y)', local: 'Ydatum', global: 'Ydatum' }
    }
  },
  dimcontinue: {
    nextPoint: 'Specify a second extension line origin or',
    selectDimension: 'Select continued dimension',
    rejectObject: 'Must select a linear or angular dimension.',
    keywords: {
      select: { display: 'Select(S)', local: 'Select', global: 'Select' }
    }
  },
  dimbaseline: {
    nextPoint: 'Specify a second extension line origin or',
    selectDimension: 'Select base dimension',
    rejectObject: 'Must select a linear or angular dimension.',
    keywords: {
      select: { display: 'Select(S)', local: 'Select', global: 'Select' }
    }
  },
  ellipse: {
    axisEndpointOrOptions: 'Specify axis endpoint of ellipse or',
    arcAxisEndpointOrCenter: 'Specify axis endpoint of elliptical arc or',
    center: 'Specify center of ellipse',
    firstAxisEndpoint: 'Specify endpoint of axis',
    secondAxisEndpoint: 'Specify other endpoint of axis',
    otherAxisOrRotation: 'Specify distance to other axis or',
    rotationAngle: 'Specify rotation angle around major axis',
    arcStartAngle: 'Specify start angle of elliptical arc',
    arcEndAngle: 'Specify end angle of elliptical arc',
    keywords: {
      arc: {
        display: 'Arc(A)',
        local: 'Arc',
        global: 'Arc'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      rotation: {
        display: 'Rotation(R)',
        local: 'Rotation',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'Invalid axis input: axis length must be greater than 0.',
      otherAxis: 'Invalid other-axis input: distance must be greater than 0.',
      rotation:
        'Invalid rotation input: resulting minor axis must be greater than 0.'
    }
  },
  hatch: {
    prompt: 'Select boundary object or',
    pickPoint: 'Specify internal point (or press Enter to finish)',
    select: 'Select objects to hatch',
    patternName: 'Enter hatch pattern name',
    scale: 'Specify hatch pattern scale',
    angle: 'Specify hatch pattern angle',
    style: 'Enter hatch style',
    associative: 'Specify associativity',
    invalidBoundary: 'Selected objects do not form a closed boundary.',
    keywords: {
      pick: {
        display: 'Pick points(P)',
        local: 'Pick points',
        global: 'PickPoints'
      },
      select: {
        display: 'Select objects(S)',
        local: 'Select objects',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'Cancel(C)',
        local: 'Cancel',
        global: 'Cancel'
      },
      pattern: {
        display: 'Pattern(P)',
        local: 'Pattern',
        global: 'Pattern'
      },
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      angle: {
        display: 'Angle(A)',
        local: 'Angle',
        global: 'Angle'
      },
      style: {
        display: 'Style(T)',
        local: 'Style',
        global: 'HatchStyle'
      },
      associative: {
        display: 'Associative(AS)',
        local: 'Associative',
        global: 'AssociativeMode'
      },
      normal: {
        display: 'Normal(N)',
        local: 'Normal',
        global: 'Normal'
      },
      outer: {
        display: 'Outer(O)',
        local: 'Outer',
        global: 'Outer'
      },
      ignore: {
        display: 'Ignore(I)',
        local: 'Ignore',
        global: 'Ignore'
      },
      yes: {
        display: 'Yes(Y)',
        local: 'Yes',
        global: 'Yes'
      },
      no: {
        display: 'No(N)',
        local: 'No',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: 'object(s) hidden',
    restored: 'object(s) restored',
    nothingToRestore: 'No hidden objects to restore'
  },
  entout: {
    longSidePrompt: 'Enter preview long side size in pixels',
    exported: 'object preview(s) exported',
    skipped: 'object(s) skipped',
    failed: {
      'no-preview-root': 'Unable to build preview geometry for the selection',
      'no-bounds': 'Unable to compute preview bounds for the selection',
      'capture-failed': 'Unable to render the entity preview image',
      'download-failed': 'Preview rendered but the PNG download failed'
    }
  },
  layer: {
    main: 'Enter option',
    listSummary: 'Layer list was printed to browser console',
    emptyInput: 'No layer name was entered.',
    newPrompt: 'Enter name for new layer(s)',
    makePrompt: 'Enter name of layer to make current',
    setPrompt: 'Enter name of layer to set current',
    onPrompt: 'Enter layer name(s) to turn on',
    offPrompt: 'Enter layer name(s) to turn off',
    freezePrompt: 'Enter layer name(s) to freeze',
    thawPrompt: 'Enter layer name(s) to thaw',
    lockPrompt: 'Enter layer name(s) to lock',
    unlockPrompt: 'Enter layer name(s) to unlock',
    colorLayerPrompt: 'Enter layer name(s) to change color',
    colorValuePrompt:
      'Enter color (ACI 1-255, RGB like 255,0,0, or CSS color name)',
    invalidColor: 'Invalid color input.',
    descriptionLayerPrompt: 'Enter layer name to edit description',
    descriptionValuePrompt: 'Enter new layer description',
    created: 'Created layer count',
    alreadyExists: 'Layer already exists',
    notFound: 'Layer not found',
    cannotChangeCurrent: 'Cannot turn off or freeze the current layer.',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: 'Make(M)',
        local: 'Make',
        global: 'Make'
      },
      set: {
        display: 'Set(S)',
        local: 'Set',
        global: 'Set'
      },
      new: {
        display: 'New(N)',
        local: 'New',
        global: 'New'
      },
      on: {
        display: 'On(ON)',
        local: 'On',
        global: 'On'
      },
      off: {
        display: 'Off(OF)',
        local: 'Off',
        global: 'Off'
      },
      color: {
        display: 'Color(C)',
        local: 'Color',
        global: 'Color'
      },
      freeze: {
        display: 'Freeze(F)',
        local: 'Freeze',
        global: 'Freeze'
      },
      thaw: {
        display: 'Thaw(T)',
        local: 'Thaw',
        global: 'Thaw'
      },
      lock: {
        display: 'Lock(L)',
        local: 'Lock',
        global: 'Lock'
      },
      unlock: {
        display: 'Unlock(U)',
        local: 'Unlock',
        global: 'Unlock'
      },
      description: {
        display: 'Description(D)',
        local: 'Description',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: 'All layers are already on.',
    turnedOn: 'Turned on layers'
  },
  laycur: {
    prompt: 'Select objects to be changed to the current layer',
    currentLayerNotFound: 'Current layer not found.',
    noObjects: 'No valid objects were selected.',
    alreadyCurrent: 'Selected objects are already on the current layer.',
    changed: 'Changed objects to current layer'
  },
  layfrz: {
    prompt: 'Select object on layer to freeze or',
    invalidSelection: 'Invalid object selected.',
    settingsPrompt: 'Enter LAYFRZ setting to change',
    viewportPrompt: 'Specify viewport freeze behavior',
    blockSelectionPrompt: 'Specify nested block selection behavior',
    vpfreezeFallback:
      'Current viewer does not support per-viewport layer freeze; using Freeze behavior instead.',
    nestedSelectionLimited:
      'Nested block selection settings are stored, but current picking still resolves the top-level entity layer.',
    layerNotFound: 'Layer not found',
    cannotFreezeCurrent: 'Cannot freeze the current layer.',
    alreadyFrozen: 'Layer is already frozen',
    frozen: 'Frozen layer',
    restored: 'Restored layer',
    nothingToUndo: 'There is no LAYFRZ action to undo.',
    keywords: {
      settings: {
        display: 'Settings(S)',
        local: 'Settings',
        global: 'Settings'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      viewports: {
        display: 'Viewports(V)',
        local: 'Viewports',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Block selection(B)',
        local: 'Block selection',
        global: 'BlockSelection'
      },
      freeze: {
        display: 'Freeze(F)',
        local: 'Freeze',
        global: 'Freeze'
      },
      vpfreeze: {
        display: 'Vpfreeze(V)',
        local: 'Vpfreeze',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Block(B)',
        local: 'Block',
        global: 'Block'
      },
      entity: {
        display: 'Entity(E)',
        local: 'Entity',
        global: 'Entity'
      },
      none: {
        display: 'None(N)',
        local: 'None',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: 'Select objects on the layer(s) to be isolated or',
    settingsPrompt: 'Enter setting for layers not isolated',
    offModePrompt: 'Enter off behavior for layers not isolated',
    noLayers: 'No valid layers were selected.',
    layerNotFound: 'Layer not found',
    isolated: 'Isolated layer(s)',
    affectedLayers: 'affected layers',
    vpfreezeFallback:
      'Current viewer does not support per-viewport layer freeze; using Off behavior instead.',
    lockFadeFallback:
      'Current viewer does not support layer fade display; non-isolated layers will be locked without fade.',
    keywords: {
      settings: {
        display: 'Settings(S)',
        local: 'Settings',
        global: 'Settings'
      },
      off: {
        display: 'Off(O)',
        local: 'Off',
        global: 'Off'
      },
      lockAndFade: {
        display: 'Lock and fade(L)',
        local: 'Lock and fade',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: 'Vpfreeze(V)',
        local: 'Vpfreeze',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: 'No previous LAYISO layer state to restore.',
    layerNotFound: 'Layer not found',
    nothingRestored: 'No LAYISO layer changes were restored.',
    restored: 'Restored layers'
  },
  laythw: {
    alreadyThawed: 'All layers are already thawed.',
    thawed: 'Thawed layers'
  },
  laylck: {
    prompt: 'Select an object on the layer to be locked',
    invalidSelection: 'Invalid object selected.',
    layerNotFound: 'Layer not found',
    alreadyLocked: 'Layer is already locked',
    locked: 'Locked layer'
  },
  layulk: {
    prompt: 'Select an object on the layer to be unlocked',
    invalidSelection: 'Invalid object selected.',
    layerNotFound: 'Layer not found',
    alreadyUnlocked: 'Layer is already unlocked',
    unlocked: 'Unlocked layer'
  },
  layoff: {
    prompt: 'Select object on layer to turn off or',
    invalidSelection: 'Invalid object selected.',
    settingsPrompt: 'Enter LAYOFF setting to change',
    viewportPrompt: 'Specify viewport behavior',
    blockSelectionPrompt: 'Specify nested block selection behavior',
    vpfreezeFallback:
      'Current viewer does not support per-viewport layer off; using Off behavior instead.',
    nestedSelectionLimited:
      'Nested block selection settings are stored, but current picking still resolves the top-level entity layer.',
    layerNotFound: 'Layer not found',
    cannotTurnOffCurrent: 'Cannot turn off the current layer.',
    alreadyOff: 'Layer is already off',
    turnedOff: 'Turned off layer',
    restored: 'Restored layer',
    nothingToUndo: 'There is no LAYOFF action to undo.',
    keywords: {
      settings: {
        display: 'Settings(S)',
        local: 'Settings',
        global: 'Settings'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      viewports: {
        display: 'Viewports(V)',
        local: 'Viewports',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Block selection(B)',
        local: 'Block selection',
        global: 'BlockSelection'
      },
      off: {
        display: 'Off(O)',
        local: 'Off',
        global: 'Off'
      },
      vpfreeze: {
        display: 'Vpfreeze(V)',
        local: 'Vpfreeze',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Block(B)',
        local: 'Block',
        global: 'Block'
      },
      entity: {
        display: 'Entity(E)',
        local: 'Entity',
        global: 'Entity'
      },
      none: {
        display: 'None(N)',
        local: 'None',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: 'Restored previous layer state.',
    noPreviousState: 'There is no previous layer state to restore.'
  },
  line: {
    firstPoint: 'Specify the first point',
    firstPointOrContinue: 'Specify first point or',
    nextPoint: 'Specify the next point',
    nextPointWithOptions: 'Specify next point or',
    keywords: {
      continue: {
        display: 'Continue(C)',
        local: 'Continue',
        global: 'Continue'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: 'Specify a point or',
    secondPoint: 'Specify second point',
    throughPoint: 'Specify through point',
    angle: 'Enter angle of xline',
    invalidDirection: 'Invalid direction for XLINE.',
    keywords: {
      hor: {
        display: 'Hor(H)',
        local: 'Hor',
        global: 'Hor'
      },
      ver: {
        display: 'Ver(V)',
        local: 'Ver',
        global: 'Ver'
      },
      ang: {
        display: 'Ang(A)',
        local: 'Ang',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: 'Specify start point',
    throughPoint: 'Specify through point'
  },
  mline: {
    startPointWithOptions: 'Specify start point or',
    nextPointWithOptions: 'Specify next point or',
    justificationPrompt: 'Enter justification type',
    scalePrompt: 'Specify mline scale',
    stylePrompt: 'Enter mline style name or [?] for list',
    styleNotFound: 'Mline style not found',
    styleListHeader: 'Loaded mline styles',
    styleListEmpty: 'No mline style is loaded in current drawing.',
    keywords: {
      justification: {
        display: 'Justification(J)',
        local: 'Justification',
        global: 'Justification'
      },
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      style: {
        display: 'Style(ST)',
        local: 'Style',
        global: 'Style'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      },
      top: {
        display: 'Top(T)',
        local: 'Top',
        global: 'Top'
      },
      zero: {
        display: 'Zero(Z)',
        local: 'Zero',
        global: 'Zero'
      },
      bottom: {
        display: 'Bottom(B)',
        local: 'Bottom',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: 'Specify vertex point',
    arm1: 'Specify point on first arm',
    arm2: 'Specify point on second arm'
  },
  measureArc: {
    startPoint: 'Specify arc start point',
    throughPoint: 'Specify a point on the arc',
    endPoint: 'Specify arc end point',
    lockedEndPoint:
      'Specify arc end point (Ctrl to switch major/minor arc)',
    invalidPoints: 'The three points are collinear and do not define an arc.'
  },
  measureArea: {
    firstPoint: 'Specify first point',
    nextPoint: 'Specify next point (or press Enter to finish)'
  },
  measureDistance: {
    firstPoint: 'Specify first point',
    secondPoint: 'Specify second point'
  },
  measureContinuous: {
    firstPoint: 'Specify first point',
    nextPoint: 'Specify next point (or press Enter to finish)'
  },
  measurePoint: {
    point: 'Specify point'
  },
  measurement: {
    import: {
      chooseFile: 'Choose a measurement sidecar JSON file'
    }
  },
  markup: {
    author: 'Specify review author (saved for later)',
    text: {
      point: 'Specify text markup point',
      content: 'Enter markup text'
    },
    line: {
      firstPoint: 'Specify first point of line markup',
      secondPoint: 'Specify second point of line markup'
    },
    arrow: {
      firstPoint: 'Specify arrow start point',
      secondPoint: 'Specify arrow tip'
    },
    cloud: {
      firstCorner: 'Specify first corner of cloud',
      secondCorner: 'Specify opposite corner of cloud'
    },
    rect: {
      firstCorner: 'Specify first corner of rectangle',
      secondCorner: 'Specify opposite corner of rectangle'
    },
    circle: {
      center: 'Specify center of circle',
      radius: 'Specify radius of circle'
    },
    shape: {
      calloutOn: '[Callout on]',
      calloutOff: '[Callout off]',
      calloutAnchor: 'Specify callout text location',
      keywords: {
        callout: {
          display: 'Callout(C)',
          local: 'Callout',
          global: 'Callout'
        },
        noCallout: {
          display: 'NoCallout(N)',
          local: 'NoCallout',
          global: 'NoCallout'
        }
      }
    },
    highlight: {
      firstCorner: 'Specify first corner of highlight',
      secondCorner: 'Specify opposite corner of highlight'
    },
    callout: {
      tip: 'Specify leader tip, or a cloud / rectangle / circle outline without a callout',
      anchor: 'Specify callout text location',
      content: 'Enter callout text'
    },
    stamp: {
      kind: 'Enter stamp id [approved/rejected/revised/for-review/custom]',
      imageUrl: 'Enter custom stamp image URL (optional)',
      caption: 'Enter stamp caption (optional)',
      point: 'Specify stamp insertion point'
    },
    import: {
      chooseFile: 'Choose a markup sidecar JSON file'
    }
  },
  move: {
    basePointOrDisplacement: 'Specify base point or',
    secondPointOrDisplacement: 'Specify second point or',
    displacement: 'Specify displacement',
    keywords: {
      displacement: {
        display: 'Displacement(D)',
        local: 'Displacement',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'Specify offset distance',
    selectObject: 'Select object to offset or press Enter to finish',
    sidePoint: 'Specify point on side to offset',
    invalidDistance: 'Offset distance must be greater than 0.',
    invalidSelection: 'Selected object cannot be offset.',
    offsetFailed: 'Unable to create an offset curve for the specified side.'
  },
  leader: {
    startPoint: 'Specify leader start point',
    nextPoint: 'Specify next point',
    nextPointOrOptions:
      'Specify next point or [Annotation/Format/Undo]',
    formatPrompt: 'Enter leader format option [Spline/STraight/Arrow/None]',
    annotationText: 'Enter first line of annotation text or <options>',
    nextAnnotationLine: 'Enter next line of annotation text',
    annotationOptions:
      'Enter an annotation option [Tolerance/Copy/Block/None/Mtext]',
    selectAnnotation: 'Select an annotation object to copy',
    rejectAnnotation: 'Object cannot be used as a leader annotation.',
    toleranceUnavailable:
      'Geometric Tolerance dialog is not available in this build.',
    keywords: {
      annotation: {
        display: 'Annotation(A)',
        local: 'Annotation',
        global: 'Annotation'
      },
      format: {
        display: 'Format(F)',
        local: 'Format',
        global: 'Format'
      },
      undo: { display: 'Undo(U)', local: 'Undo', global: 'Undo' },
      spline: {
        display: 'Spline(S)',
        local: 'Spline',
        global: 'Spline'
      },
      straight: {
        display: 'STraight(T)',
        local: 'STraight',
        global: 'STraight'
      },
      arrow: { display: 'Arrow(A)', local: 'Arrow', global: 'Arrow' },
      none: { display: 'None(N)', local: 'None', global: 'None' },
      tolerance: {
        display: 'Tolerance',
        local: 'Tolerance',
        global: 'Tolerance'
      },
      copy: { display: 'Copy(C)', local: 'Copy', global: 'Copy' },
      block: { display: 'Block(B)', local: 'Block', global: 'Block' },
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' }
    }
  },
  mleader: {
    arrowheadOrOptions:
      'Specify leader arrowhead location or [leader Landing first/Content first/Options]',
    landingLocation: 'Specify leader landing location',
    landingFirstPoint: 'Specify leader landing location',
    arrowheadLocation: 'Specify leader arrowhead location',
    contentLocation: 'Specify content location',
    nextPoint: 'Specify next point',
    optionsPrompt:
      'Enter an option [Leader type/landing/Content type/Maxpoints/First angle/Second angle/eXit options]',
    leaderTypePrompt: 'Select a leader type [Straight/sPline/None]',
    landingPrompt: 'Use landing [Yes/No]',
    landingLength: 'Specify landing distance',
    contentTypePrompt: 'Select a content type [Block/Mtext/None]',
    maxPoints: 'Enter the maximum points for leader line',
    firstAngle: 'Enter first angle constraint',
    secondAngle: 'Enter second angle constraint',
    keywords: {
      landingFirst: {
        display: 'Landing first(L)',
        local: 'Landing first',
        global: 'Landing first'
      },
      contentFirst: {
        display: 'Content first(C)',
        local: 'Content first',
        global: 'Content first'
      },
      options: {
        display: 'Options(O)',
        local: 'Options',
        global: 'Options'
      },
      leaderType: {
        display: 'Leader type(T)',
        local: 'Leader type',
        global: 'Leader type'
      },
      landing: {
        display: 'lAnding(A)',
        local: 'lAnding',
        global: 'lAnding'
      },
      contentType: {
        display: 'Content type(C)',
        local: 'Content type',
        global: 'Content type'
      },
      maxpoints: {
        display: 'Maxpoints(M)',
        local: 'Maxpoints',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: 'First angle(F)',
        local: 'First angle',
        global: 'First angle'
      },
      secondAngle: {
        display: 'Second angle(S)',
        local: 'Second angle',
        global: 'Second angle'
      },
      exitOptions: {
        display: 'eXit options(X)',
        local: 'eXit options',
        global: 'eXit options'
      },
      straight: {
        display: 'Straight(S)',
        local: 'Straight',
        global: 'Straight'
      },
      spline: {
        display: 'sPline(P)',
        local: 'sPline',
        global: 'sPline'
      },
      noneLeader: {
        display: 'None(N)',
        local: 'None',
        global: 'None'
      },
      yes: { display: 'Yes(Y)', local: 'Yes', global: 'Yes' },
      no: { display: 'No(N)', local: 'No', global: 'No' },
      block: { display: 'Block(B)', local: 'Block', global: 'Block' },
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      none: { display: 'None(N)', local: 'None', global: 'None' }
    }
  },
  mleaderedit: {
    selectMLeader: 'Select a multileader',
    rejectMLeader: 'Must select a multileader.',
    arrowheadOrRemove:
      'Specify leader arrowhead location or [Remove leaders]',
    selectLeaderToRemove: 'Specify a leader to remove or press Enter to finish',
    cannotRemoveLast: 'Cannot remove the last leader from this multileader.',
    keywords: {
      remove: {
        display: 'Remove leaders(R)',
        local: 'Remove',
        global: 'Remove'
      }
    }
  },
  mtext: {
    point: 'Specify mtext insertion point'
  },
  bmpout: {
    boundsFirstCorner: 'Specify first corner of bounds',
    boundsSecondCorner: 'Specify opposite corner',
    longSidePrompt: 'Enter long side size in pixels'
  },
  jpgout: {
    boundsFirstCorner: 'Specify first corner of bounds',
    boundsSecondCorner: 'Specify opposite corner',
    longSidePrompt: 'Enter long side size in pixels'
  },
  pngout: {
    boundsFirstCorner: 'Specify first corner of bounds',
    boundsSecondCorner: 'Specify opposite corner',
    longSidePrompt: 'Enter long side size in pixels'
  },
  imageattach: {
    insertionPoint: 'Specify insertion point:',
    scale: 'Specify scale factor:',
    rotation: 'Specify rotation angle:',
    invalidScale: 'Scale factor must be greater than 0.',
    decodeFailed: 'Failed to read the selected image file.'
  },
  insert: {
    blockName: 'Enter block name:',
    insertionPoint: 'Specify insertion point:',
    scale: 'Specify scale factor:',
    rotation: 'Specify rotation angle:',
    invalidScale: 'Scale factor must be greater than 0.',
    invalidBlockName: 'Invalid block name.',
    blockNotFound: 'Block not found',
    xrefNotAllowed: 'Cannot insert an external reference with -INSERT.'
  },
  xattach: {
    insertionPoint: 'Specify insertion point:',
    scale: 'Specify scale factor:',
    rotation: 'Specify rotation angle:',
    invalidScale: 'Scale factor must be greater than 0.',
    unsupportedFile: 'Please select a DWG or DXF file.',
    loading: 'Loading external reference...',
    loadFailed: 'Failed to read the selected drawing file.'
  },
  point: {
    point: 'Specify a point'
  },
  polygon: {
    numberOfSides: 'Enter number of sides',
    centerOrEdge: 'Specify center of polygon or',
    radiusOrType: 'Enter options',
    edgeStart: 'Specify first endpoint of edge',
    edgeEnd: 'Specify second endpoint of edge',
    keywords: {
      edge: {
        display: 'Edge(E)',
        local: 'Edge',
        global: 'Edge'
      },
      inscribed: {
        display: 'Inscribed in circle(I)',
        local: 'Inscribed in circle',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'Circumscribed about circle(C)',
        local: 'Circumscribed about circle',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'Invalid number of sides. Enter an integer between 3 and 1024.',
      radius: 'Invalid radius. Radius must be greater than 0.',
      edge: 'Invalid edge. The edge length must be greater than 0.'
    }
  },
  polyline: {
    firstPoint: 'Specify the first point',
    nextPoint: 'Specify the next point (or press Enter to finish)',
    nextPointWithOptions: 'Specify next point or',
    nextPointWithArcOptions: 'Specify next point or',
    keywords: {
      arc: {
        display: 'Arc(A)',
        local: 'Arc',
        global: 'Arc'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      },
      line: {
        display: 'Line(L)',
        local: 'Line',
        global: 'Line'
      },
      angle: {
        display: 'Angle(A)',
        local: 'Angle',
        global: 'Angle'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      secondPoint: {
        display: 'Second point(P)',
        local: 'Second point',
        global: 'SecondPoint'
      },
      radius: {
        display: 'Radius(R)',
        local: 'Radius',
        global: 'Radius'
      }
    },
    arcAngle: 'Specify arc angle',
    arcCenter: 'Specify center point',
    arcSecondPoint: 'Specify second point on arc',
    arcEndPoint: 'Specify arc end point',
    arcRadius: 'Specify arc radius'
  },
  rect: {
    firstPoint: 'Specify first corner point',
    nextPoint: 'Specify other corner point',
    firstPointWithOptions: 'Specify first corner point or',
    otherCornerWithOptions: 'Specify other corner point or',
    chamferFirst: 'Specify first chamfer distance',
    chamferSecond: 'Specify second chamfer distance',
    filletRadius: 'Specify fillet radius',
    segmentWidth: 'Specify rectangle line width',
    elevationValue: 'Specify elevation',
    thicknessValue: 'Specify thickness',
    rotationAngle: 'Specify rectangle rotation angle',
    dimensionLength: 'Specify rectangle length',
    dimensionWidth: 'Specify rectangle width',
    areaValue: 'Specify rectangle area',
    areaLengthOrWidth: 'Specify rectangle length',
    areaSpecifyWidth: 'Specify rectangle width',
    invalidPositive: 'Invalid input. Please enter a value greater than 0.',
    invalidRect:
      'Unable to create rectangle. Please specify valid corners or dimensions.',
    thicknessNotSupported:
      'Rectangle thickness is currently not written to entity data. The thickness setting is ignored.',
    keywords: {
      chamfer: {
        display: 'Chamfer(C)',
        local: 'Chamfer',
        global: 'Chamfer'
      },
      elevation: {
        display: 'Elevation(E)',
        local: 'Elevation',
        global: 'Elevation'
      },
      fillet: {
        display: 'Fillet(F)',
        local: 'Fillet',
        global: 'Fillet'
      },
      thickness: {
        display: 'Thickness(T)',
        local: 'Thickness',
        global: 'Thickness'
      },
      width: {
        display: 'Width(W)',
        local: 'Width',
        global: 'Width'
      },
      area: {
        display: 'Area(A)',
        local: 'Area',
        global: 'Area'
      },
      dimensions: {
        display: 'Dimensions(D)',
        local: 'Dimensions',
        global: 'Dimensions'
      },
      rotation: {
        display: 'Rotation(R)',
        local: 'Rotation',
        global: 'Rotation'
      },
      length: {
        display: 'Length(L)',
        local: 'Length',
        global: 'Length'
      },
      rectWidth: {
        display: 'Width(W)',
        local: 'Width',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'Specify base point',
    rotationAngleOrOptions: 'Specify rotation angle or',
    referenceAngleOrPoints: 'Specify reference angle or',
    firstReferencePoint: 'Specify first point of reference angle',
    secondReferencePoint: 'Specify second point',
    newAngle: 'Specify new angle',
    keywords: {
      copy: {
        display: 'Copy(C)',
        local: 'Copy',
        global: 'Copy'
      },
      reference: {
        display: 'Reference(R)',
        local: 'Reference',
        global: 'Reference'
      },
      points: {
        display: 'Points(P)',
        local: 'Points',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: 'Invalid reference points: points must be different.'
    }
  },
  revcloud: {
    firstCornerOrOptions: 'Specify first corner point or',
    firstCorner: 'Specify first corner point',
    oppositeCorner: 'Specify opposite corner',
    startPoint: 'Specify start point',
    nextPoint: 'Specify next point',
    nextPointOrUndo: 'Specify next point or',
    firstPoint: 'Specify first point',
    guideCursor: 'Guide cursor along cloud path (press Enter to finish)',
    arcLength: 'Specify arc length',
    selectObject: 'Select object',
    style: 'Enter revision cloud arc style',
    reverseDirection: 'Reverse direction',
    invalidArcLength: 'Arc length must be greater than 0.',
    invalidObject: 'Selected object cannot be converted to a revision cloud.',
    keywords: {
      arcLength: {
        display: 'Arc length(A)',
        local: 'Arc length',
        global: 'ArcLength'
      },
      object: {
        display: 'Object(O)',
        local: 'Object',
        global: 'Object'
      },
      rectangular: {
        display: 'Rectangular(R)',
        local: 'Rectangular',
        global: 'Rectangular'
      },
      polygonal: {
        display: 'Polygonal(P)',
        local: 'Polygonal',
        global: 'Polygonal'
      },
      freehand: {
        display: 'Freehand(F)',
        local: 'Freehand',
        global: 'Freehand'
      },
      style: {
        display: 'Style(S)',
        local: 'Style',
        global: 'Style'
      },
      normal: {
        display: 'Normal(N)',
        local: 'Normal',
        global: 'Normal'
      },
      calligraphy: {
        display: 'Calligraphy(C)',
        local: 'Calligraphy',
        global: 'Calligraphy'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      yes: {
        display: 'Yes(Y)',
        local: 'Yes',
        global: 'Yes'
      },
      no: {
        display: 'No(N)',
        local: 'No',
        global: 'No'
      }
    }
  },
  sketch: {
    specifySketch: 'Specify sketch or',
    sketching: 'Move the pointer to sketch (click or press Enter to stop)',
    type: 'Enter sketch type',
    increment: 'Specify sketch increment',
    tolerance: 'Specify spline tolerance',
    firstPoint: 'Specify the first point',
    nextPoint: 'Specify the end point',
    keywords: {
      type: {
        display: 'Type(T)',
        local: 'Type',
        global: 'Type'
      },
      increment: {
        display: 'Increment(I)',
        local: 'Increment',
        global: 'Increment'
      },
      tolerance: {
        display: 'toLerance(L)',
        local: 'toLerance',
        global: 'Tolerance'
      },
      line: {
        display: 'Lines(L)',
        local: 'Lines',
        global: 'Lines'
      },
      polyline: {
        display: 'Polyline(P)',
        local: 'Polyline',
        global: 'Polyline'
      },
      spline: {
        display: 'Spline(S)',
        local: 'Spline',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: 'Specify the first point',
    nextPoint: 'Specify the next point (or press Enter to finish)',
    firstPointWithOptions: 'Specify first point or',
    nextPointWithFitOptions: 'Specify next point or',
    nextPointWithCvOptions: 'Specify next control vertex or',
    methodPrompt: 'Enter spline creation method',
    knotsPrompt: 'Enter knot parameterization',
    degreePrompt: 'Specify spline degree',
    keywords: {
      method: {
        display: 'Method(M)',
        local: 'Method',
        global: 'Method'
      },
      fit: {
        display: 'Fit(F)',
        local: 'Fit',
        global: 'Fit'
      },
      cv: {
        display: 'CV(C)',
        local: 'CV',
        global: 'CV'
      },
      knots: {
        display: 'Knots(K)',
        local: 'Knots',
        global: 'Knots'
      },
      degree: {
        display: 'Degree(D)',
        local: 'Degree',
        global: 'Degree'
      },
      undo: {
        display: 'Undo(U)',
        local: 'Undo',
        global: 'Undo'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      },
      chord: {
        display: 'Chord(C)',
        local: 'Chord',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'Sqrt chord(S)',
        local: 'Sqrt chord',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'Uniform(U)',
        local: 'Uniform',
        global: 'Uniform'
      }
    }
  },
  objectscale: {
    action: 'Enter an option',
    scaleName: 'Enter annotation scale name',
    done: 'Updated objects',
    none: '(none)',
    keywords: {
      add: {
        display: 'Add(A)',
        local: 'Add',
        global: 'Add'
      },
      delete: {
        display: 'Delete(D)',
        local: 'Delete',
        global: 'Delete'
      },
      list: {
        display: 'List(L)',
        local: 'List',
        global: 'List'
      }
    }
  },
  sysvar: {
    prompt: 'Please input new value'
  },
  view: {
    enterName: 'Enter view name to restore',
    notFound: 'View "{name}" was not found.'
  },
  zoom: {
    mainPrompt: 'Specify corner of window or',
    firstCorner: 'Specify first corner',
    secondCorner: 'Specify opposite corner',
    centerPoint: 'Specify center point',
    heightOrScale: 'Enter height or scale factor (nX or nXP)',
    scaleFactor: 'Enter scale factor (nX or nXP)',
    keywords: {
      all: {
        display: 'All(A)',
        local: 'All',
        global: 'All'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      extents: {
        display: 'Extents(E)',
        local: 'Extents',
        global: 'Extents'
      },
      previous: {
        display: 'Previous(P)',
        local: 'Previous',
        global: 'Previous'
      },
      original: {
        display: 'Original(O)',
        local: 'Original',
        global: 'Original'
      },
      saved: {
        display: 'Saved(V)',
        local: 'Saved',
        global: 'Saved'
      },
      smart: {
        display: 'Smart(I)',
        local: 'Smart',
        global: 'Smart'
      },
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      window: {
        display: 'Window(W)',
        local: 'Window',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportFormat: 'Export format',
    exportInvisibleLayers: 'Export invisible layers',
    exportLayouts: 'Export layouts',
    exportEmptyLayouts: 'Export empty layouts',
    background: 'Background color',
    initialView: 'Initial view when opening HTML',
    viewerMode: 'Offline viewer mode',
    chunkSizeMiB: 'Chunk size in MiB (multi-file package)',
    compressChunks: 'Compress chunks (multi-file package)',
    keywords: {
      single: {
        display: 'Single(S)',
        local: 'Single',
        global: 'Single'
      },
      multi: {
        display: 'Multi-file package(M)',
        local: 'Multi-file package',
        global: 'Multi'
      },
      yes: {
        display: 'Yes(Y)',
        local: 'Yes',
        global: 'Yes'
      },
      no: {
        display: 'No(N)',
        local: 'No',
        global: 'No'
      },
      extents: {
        display: 'Extents(E)',
        local: 'Extents',
        global: 'Extents'
      },
      current: {
        display: 'Current(C)',
        local: 'Current',
        global: 'Current'
      },
      view: {
        display: 'View(V)',
        local: 'View',
        global: 'View'
      },
      measure: {
        display: 'Measure & Review(M)',
        local: 'Measure & Review',
        global: 'Measure'
      },
      black: {
        display: 'Black(B)',
        local: 'Black',
        global: 'Black'
      },
      white: {
        display: 'White(W)',
        local: 'White',
        global: 'White'
      },
      space: {
        display: 'Space(S)',
        local: 'Space',
        global: 'Space'
      }
    }
  },
  cpdf: {
    modelSpaceFit: 'Model space frame',
    exportLayouts: 'Export layouts',
    exportEmptyLayouts: 'Export empty layouts',
    textMode: 'Text rendering',
    colorMode: 'Color mode',
    keywords: {
      extents: {
        display: 'Extents(E)',
        local: 'Extents',
        global: 'Extents'
      },
      display: {
        display: 'Display(D)',
        local: 'Display',
        global: 'Display'
      },
      text: {
        display: 'Text(T)',
        local: 'Text',
        global: 'Text'
      },
      vector: {
        display: 'Vector(V)',
        local: 'Vector',
        global: 'Vector'
      },
      yes: {
        display: 'Yes(Y)',
        local: 'Yes',
        global: 'Yes'
      },
      no: {
        display: 'No(N)',
        local: 'No',
        global: 'No'
      },
      color: {
        display: 'Color(C)',
        local: 'Color',
        global: 'Color'
      },
      monochrome: {
        display: 'Monochrome(M)',
        local: 'Monochrome',
        global: 'Monochrome'
      }
    }
  },
  ucs: {
    originOrOptions: 'Specify origin of UCS or',
    pointOnXAxis: 'Specify point on X-axis or',
    pointOnXyPlane: 'Specify point on XY plane or',
    rotationAngle: 'Specify rotation angle about {axis} axis',
    zAxisOrigin: 'Specify new origin point',
    pointOnZAxis: 'Specify point on positive portion of Z-axis',
    selectObject: 'Select object to align UCS',
    namedOption: 'Enter an option',
    enterName: 'Enter name of UCS to restore or [?]',
    saveName: 'Enter name to save current UCS',
    deleteName: 'Enter UCS name(s) to delete',
    noPrevious: 'No previous UCS in this session.',
    noNamed: 'No named UCS definitions.',
    notFound: 'UCS "{name}" not found.',
    invalidName: 'Invalid UCS name.',
    invalidObject: 'Cannot align UCS to the selected object.',
    keywords: {
      named: {
        display: 'NAmed(A)',
        local: 'Named',
        global: 'Named'
      },
      object: {
        display: 'OBject(B)',
        local: 'Object',
        global: 'Object'
      },
      previous: {
        display: 'Previous(P)',
        local: 'Previous',
        global: 'Previous'
      },
      view: {
        display: 'View(V)',
        local: 'View',
        global: 'View'
      },
      world: {
        display: 'World(W)',
        local: 'World',
        global: 'World'
      },
      x: {
        display: 'X',
        local: 'X',
        global: 'X'
      },
      y: {
        display: 'Y',
        local: 'Y',
        global: 'Y'
      },
      z: {
        display: 'Z',
        local: 'Z',
        global: 'Z'
      },
      zAxis: {
        display: 'ZAxis(N)',
        local: 'ZAxis',
        global: 'ZAxis'
      },
      apply: {
        display: 'Apply(L)',
        local: 'Apply',
        global: 'Apply'
      },
      restore: {
        display: 'Restore(R)',
        local: 'Restore',
        global: 'Restore'
      },
      save: {
        display: 'Save(S)',
        local: 'Save',
        global: 'Save'
      },
      delete: {
        display: 'Delete(D)',
        local: 'Delete',
        global: 'Delete'
      },
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      }
    }
  },
  group: {
    selectOrOption: 'Select objects or',
    createOrOption: 'Create group or',
    selectObjects: 'Select objects for group',
    enterName: 'Enter group name',
    enterDescription: 'Enter group description',
    invalidName: 'Invalid group name',
    nameExists: 'Group name already exists',
    created: 'Group {name} created',
    keywords: {
      name: {
        display: 'Name(N)',
        local: 'Name',
        global: 'Name'
      },
      description: {
        display: 'Description(D)',
        local: 'Description',
        global: 'Description'
      }
    }
  },
  ungroup: {
    selectOrOption: 'Select group or',
    selectGroup: 'Select group',
    enterName: 'Enter group name',
    notFound: 'Group not found',
    notInGroup: 'Object is not a member of a group',
    multiGroup: 'Object is a member of more than one group [{name}]',
    exploded: 'Group {name} exploded',
    explodedCount: 'Exploded {count} group(s)',
    keywords: {
      name: {
        display: 'Name(N)',
        local: 'Name',
        global: 'Name'
      },
      all: {
        display: 'All(A)',
        local: 'All',
        global: 'All'
      },
      accept: {
        display: 'Accept(A)',
        local: 'Accept',
        global: 'Accept'
      },
      next: {
        display: 'Next(N)',
        local: 'Next',
        global: 'Next'
      }
    }
  },
  groupedit: {
    selectGroup: 'Select a group',
    enterName: 'Enter group name',
    notFound: 'Group not found',
    multiGroup: 'Object is a member of more than one group [{name}]',
    action: 'Enter an option for group {name}',
    selectToAdd: 'Select objects to add to group',
    selectToRemove: 'Select objects to remove from group',
    newName: 'Enter new group name',
    keywords: {
      add: {
        display: 'Add objects(A)',
        local: 'Add',
        global: 'Add'
      },
      remove: {
        display: 'Remove objects(R)',
        local: 'Remove',
        global: 'Remove'
      },
      rename: {
        display: 'REName(N)',
        local: 'Rename',
        global: 'Rename'
      },
      accept: {
        display: 'Accept(A)',
        local: 'Accept',
        global: 'Accept'
      },
      next: {
        display: 'Next(N)',
        local: 'Next',
        global: 'Next'
      }
    }
  },
  dashgroup: {
    option: 'Enter an option',
    empty: 'No groups defined',
    listEntry:
      '{name}  {description}  [{selectable}]  ({count})',
    yes: 'Yes',
    no: 'No',
    enterNameOrBlank: 'Enter group name or press Enter for unnamed',
    enterGroupName: 'Enter group name',
    selectableSet: 'Group {name} selectable = {value}',
    orderOption: 'Enter order option',
    fromPosition: 'Enter position number of object to reorder (0-based)',
    toPosition: 'Enter new position number for object (0-based)',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      create: {
        display: 'Create(C)',
        local: 'Create',
        global: 'Create'
      },
      add: {
        display: 'Add(A)',
        local: 'Add',
        global: 'Add'
      },
      remove: {
        display: 'Remove(R)',
        local: 'Remove',
        global: 'Remove'
      },
      explode: {
        display: 'eXplode(X)',
        local: 'Explode',
        global: 'Explode'
      },
      rename: {
        display: 'REName(N)',
        local: 'Rename',
        global: 'Rename'
      },
      selectable: {
        display: 'Selectable(S)',
        local: 'Selectable',
        global: 'Selectable'
      },
      order: {
        display: 'Order(O)',
        local: 'Order',
        global: 'Order'
      },
      reverse: {
        display: 'Reverse(R)',
        local: 'Reverse',
        global: 'Reverse'
      },
      position: {
        display: 'Position(P)',
        local: 'Position',
        global: 'Position'
      }
    }
  },
  pdfimport: {
    pageNumber: 'Enter page number (1-{count})',
    insertionPoint:
      'Specify insertion point (scale {scale}, mode {mode}) or',
    modePrompt: 'Select import mode',
    modeRecover: 'recover drawing',
    modeVisual: 'keep PDF appearance',
    scaleFactor: 'Enter scale factor',
    keywords: {
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      mode: {
        display: 'Mode(M)',
        local: 'Mode',
        global: 'Mode'
      },
      recover: {
        display: 'Recover(R)',
        local: 'Recover',
        global: 'Recover'
      },
      visual: {
        display: 'Visual(V)',
        local: 'Visual',
        global: 'Visual'
      }
    },
    pickInsertionPoint: 'Specify insertion point',
    dialog: {
      title: 'Import PDF',
      close: 'Close',
      fileName: 'File name:',
      browse: 'Browse...',
      pagesGroup: 'Page to import',
      page: 'Page:',
      total: 'Total: {count}',
      singleView: 'Show page preview',
      gridView: 'Show page thumbnails',
      pageLabel: 'Page {page}',
      pageSize: 'Page size: {width} × {height} mm ({widthIn} × {heightIn} in)',
      previewError: 'Preview not available',
      positionGroup: 'Location',
      onScreen: 'Specify insertion point on-screen',
      x: 'X:',
      y: 'Y:',
      scale: 'Scale:',
      modeGroup: 'Import mode',
      modeRecover: 'Recover drawing',
      recoverHint: 'Rebuild circles, arcs, curves, text, hatches and blocks',
      modeVisual: 'Keep PDF appearance',
      visualHint: 'Import paths and text exactly as drawn in the PDF',
      ok: 'OK',
      cancel: 'Cancel'
    }
  },
  pdfdim: {
    cancelled: 'Recover Dimensions cancelled; nothing was changed.',
    noDimensions:
      'No dimensions found in the selection (arrowheads or ticks, dimension lines and value texts are needed).',
    summary:
      'Converted {count} dimension(s); style {style} uses a linear scale factor of {scale}.',
    panel: {
      title: 'Recover Dimensions',
      style: 'Dimension style',
      dimStyle: 'Style',
      newStyle: 'New dim style…',
      newStyleName: 'Name of the new dim style',
      createStyle: 'Create',
      nameEmpty: 'Enter a name.',
      nameInvalid: 'The name contains characters that are not allowed.',
      nameExists: 'A dim style with this name already exists.',
      scale: 'Drawing scale',
      stylePreview: 'Preview of the selected dim style with recovered sizes',
      dimensions: 'Dimensions',
      selectHint: 'Select a dimension to zoom to it; edit the value before Apply.',
      empty: 'No dimensions found in the selection.',
      include: 'Convert this dimension',
      kindLinear: 'Linear',
      kindRadius: 'Radius',
      kindDiameter: 'Diameter',
      kindAngular: 'Angular',
      textTip: 'Dimension text (override)',
      measured: 'Measured {value}',
      hideStrokes: 'Hide original strokes',
      ready: '{ready} of {count} dimensions ready',
      cancel: 'Cancel',
      apply: 'Apply'
    }
  },
  pdfhatch: {
    cancelled: 'Recover Hatch cancelled; nothing was changed.',
    pickPoint: 'Pick a point inside the area to hatch',
    panel: {
      title: 'Recover Hatch',
      hatches: 'Hatches',
      addArea: 'Add area',
      addAreaTip: 'Pick a point inside an area the recognition missed; the best fitting pattern is matched to its strokes.',
      picking: 'Pick a point inside the area in the drawing…',
      noBoundary: 'No closed area was found around that point.',
      noStrokes: 'No regular pattern was found in that area.',
      empty: 'No hatch found. Use Add area to pick one.',
      include: 'Convert this hatch',
      addedTag: 'added',
      entities: '{count} objects',
      selectHint: 'Select a hatch to change its pattern, scale or angle.',
      ownGroup: 'Measured / user defined',
      libraryGroup: 'Predefined',
      pattern: 'Pattern',
      scale: 'Scale',
      spacing: 'Spacing',
      angle: 'Angle',
      autoFit: 'Auto fit',
      autoFitTip: 'Measure the scale, angle and origin of this pattern from the strokes again.',
      match: 'Pattern on strokes: {precision} · strokes re-drawn: {recall}',
      noEntities: 'This pattern re-draws no object completely; nothing would be replaced.',
      guessed: 'The strokes show no trace of this pattern; its scale and angle are a guess.',
      poorMatch: 'Poor match: strokes the hatch does not re-draw are kept.',
      userSingle: 'User defined',
      userDouble: 'User defined, double',
      measured: 'Measured pattern',
      hideStrokes: 'Hide original strokes',
      ready: '{ready} of {count} hatches ready',
      cancel: 'Cancel',
      apply: 'Apply'
    },
    noHatches:
      'No hatch found in the selection (regular parallel strokes and the lines bounding them are needed).',
    summary:
      'Converted {count} hatch(es) ({patterns}), replacing {strokes} object(s).'
  },
  bsearch: {
    unsupported: 'None of the selected objects can be matched (lines, arcs, circles, polylines, ellipses, splines, text, mtext and block references are supported).',
    skipped: '{count} selected object(s) cannot be matched and are ignored.',
    found: 'Found {count} matching instance(s), {included} to convert. Choose',
    noMatches: 'No other instances found.',
    reviewOne: 'Instance {index}/{count} ({state})',
    included: 'included',
    excluded: 'excluded',
    options: 'Rotation {rotation}, mirror {mirror}, scale {scale}, same layer {layer}, existing blocks {blocks}, text variations {text}. Toggle',
    on: 'on',
    off: 'off',
    target: 'Convert to',
    name: 'Enter new block name',
    nameExists: 'A block named "{name}" already exists.',
    nameInvalid: '"{name}" is not a valid block name.',
    basePoint: 'Specify insertion point',
    attributeTag: 'Enter attribute tag for the text "{text}"',
    existingName: 'Enter existing block name',
    blockNotFound: 'Block "{name}" not found.',
    rotation: 'Specify rotation angle of the block',
    scale: 'Specify scale factor of the block',
    scope: 'Convert the {count} found instance(s) as well, or only the source objects?',
    summary: 'Converted into block "{name}": {count} reference(s).',
    keywords: {
      convert: {
        display: 'Convert(C)',
        local: 'Convert',
        global: 'Convert'
      },
      review: {
        display: 'Review(R)',
        local: 'Review',
        global: 'Review'
      },
      options: {
        display: 'Options(O)',
        local: 'Options',
        global: 'Options'
      },
      exit: {
        display: 'eXit(X)',
        local: 'eXit',
        global: 'eXit'
      },
      include: {
        display: 'Include(I)',
        local: 'Include',
        global: 'Include'
      },
      exclude: {
        display: 'Exclude(E)',
        local: 'Exclude',
        global: 'Exclude'
      },
      next: {
        display: 'Next(N)',
        local: 'Next',
        global: 'Next'
      },
      previous: {
        display: 'Previous(P)',
        local: 'Previous',
        global: 'Previous'
      },
      done: {
        display: 'Done(D)',
        local: 'Done',
        global: 'Done'
      },
      rotation: {
        display: 'Rotation(R)',
        local: 'Rotation',
        global: 'Rotation'
      },
      mirror: {
        display: 'Mirror(M)',
        local: 'Mirror',
        global: 'Mirror'
      },
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      layer: {
        display: 'Layer(L)',
        local: 'Layer',
        global: 'Layer'
      },
      blocks: {
        display: 'Blocks(B)',
        local: 'Blocks',
        global: 'Blocks'
      },
      text: {
        display: 'Text(T)',
        local: 'Text',
        global: 'Text'
      },
      new: {
        display: 'New(N)',
        local: 'New',
        global: 'New'
      },
      existing: {
        display: 'Existing(E)',
        local: 'Existing',
        global: 'Existing'
      },
      instances: {
        display: 'Instances(I)',
        local: 'Instances',
        global: 'Instances'
      },
      source: {
        display: 'Source(S)',
        local: 'Source',
        global: 'Source'
      }
    }
  },
  pdfblock: {
    keywords: {
      yes: {
        display: 'Yes(Y)',
        local: 'Yes',
        global: 'Yes'
      },
      no: {
        display: 'No(N)',
        local: 'No',
        global: 'No'
      },
      review: {
        display: 'Review(R)',
        local: 'Review',
        global: 'Review'
      },
      all: {
        display: 'All(A)',
        local: 'All',
        global: 'All'
      },
      exit: {
        display: 'eXit(X)',
        local: 'eXit',
        global: 'eXit'
      }
    }
  },
  pdftext: {
    panel: {
      title: 'Recover Text',
      shxGroup: 'SHX text (line fonts)',
      meshGroup: 'TrueType text (outline fonts)',
      style: 'Text style',
      newStyle: 'New text style…',
      newTag: 'new',
      newStyleName: 'Name of the new text style',
      create: 'Create',
      cancel: 'Cancel',
      apply: 'Apply',
      nameError: {
        empty: 'Enter a name.',
        invalid: 'The name contains characters that are not allowed.',
        exists: 'A text style with this name already exists.'
      },
      font: 'Font',
      bigFont: 'Big font',
      noBigFont: '(None)',
      shxFonts: 'SHX fonts',
      ttfFonts: 'TrueType fonts',
      fontsUsed: 'Uses: {fonts}',
      fontMissing:
        'Font "{font}" is not available; it is drawn with "{fallback}".',
      fontNotShx:
        'This is a TrueType font: the text will not look like SHX line text.',
      fontNotTtf:
        'This is an SHX font: the text will not look like TrueType outline text.',
      styleChanges:
        'Changes the fonts of text style "{style}": texts already using it change too.',
      heightScale: 'Height scale',
      widthFactor: 'Width factor',
      autoWidth: 'Fit original width',
      lines: 'Text lines',
      include: 'Convert this line',
      textPlaceholder: 'Type the text, or leave empty to skip',
      switchKind: 'Switch between SHX and TrueType text',
      kind: {
        shx: 'SHX',
        mesh: 'TrueType'
      },
      source: {
        dictionary: 'Learned',
        ocr: 'OCR',
        typed: 'Edited',
        unread: 'Unread'
      },
      hideStrokes: 'Hide original strokes',
      ready: '{ready} of {count} lines ready',
      merge: 'Merge into MText',
      mergeTip: 'Merge the selected lines into one multiline text (MTEXT)',
      split: 'Split',
      splitTip: 'Split the selected merged text back into its lines',
      mergeAdjacent: 'Merge adjacent',
      mergeAdjacentTip:
        'Merge characters and words that stand next to each other on one baseline into multiline text',
      mergedCount: 'Merged into {count} multiline text(s).',
      selectHint: 'Ctrl+click or Shift+click lines to select several.',
      mtextTag: 'MTEXT'
    },
    cancelled: 'Recover Text cancelled; nothing was changed.',
    ocrNotConfigured:
      'Text recognition (OCR) is off: no image-capable AI model is configured. Run LLMSETTINGS to set one up.',
    recognizing: 'Recognizing {count} text line(s)…',
    ocrFailed:
      'Text recognition (OCR) failed: {message}. Type the text yourself, or run LLMSETTINGS to check the AI model.',
    noCandidates: 'No text-like strokes found in the selection.',
    summary:
      'Converted {converted} text line(s), {automatic} recognized automatically; skipped {skipped}.'
  },
  pdfscale: {
    firstPoint: 'Specify first point of a known distance',
    secondPoint: 'Specify second point',
    realLength: 'Enter the real length (measured {measured})',
    realLengthFromDimensions:
      'Enter the real length (measured {measured}; dimension texts suggest 1:{scale})',
    zeroDistance: 'The two points are identical.',
    applied: 'Scaled {count} objects by a factor of {factor}.'
  }
}
