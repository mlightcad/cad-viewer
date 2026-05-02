export default {
  ACAD: {
    '-layer': {
      description: 'Manages layers through command-line options'
    },
    arc: {
      description: 'Creates an arc'
    },
    cdxf: {
      description: 'Exports current drawing to DXF'
    },
    cecolor: {
      description: 'Sets the current default color for newly created objects'
    },
    celtscale: {
      description:
        'Controls the linetype scale factor for newly created objects'
    },
    celweight: {
      description: 'Sets the default lineweight for newly created objects'
    },
    circle: {
      description: 'Creates one circle by center and radius'
    },
    clayer: {
      description:
        'Sets the current layer for new objects and editing operations'
    },
    cmleaderstyle: {
      description: 'Sets the name of the current multileader style'
    },
    cmlscale: {
      description: 'Controls the overall width of a multiline'
    },
    cmlstyle: {
      description: 'Sets the name of the current multiline style'
    },
    colortheme: {
      description:
        'Controls the color theme of the user interface (dark or light)'
    },
    copy: {
      description: 'Copies selected entities by cloning them to new positions',
      prompt: 'Select entities'
    },
    csvg: {
      description: 'Converts current drawing to SVG'
    },
    dimlinear: {
      description: 'Creates linear dimensions'
    },
    measurearea: {
      description:
        'Calculates the area and perimeter of selected objects or points'
    },
    measureangle: {
      description: 'Measures the angle between two lines or three points'
    },
    measurearc: {
      description: 'Measures the length of an arc segment'
    },
    measuredistance: {
      description: 'Measures the distance and delta values between two points'
    },
    measurementcolor: {
      description: 'Sets the color used for measurement overlays'
    },
    ellipse: {
      description:
        'Creates an ellipse or elliptical arc by axis endpoints or center'
    },
    erase: {
      description: 'Deletes selected entities from the drawing',
      prompt: 'Select entities'
    },
    hatch: {
      description:
        'Fills an enclosed area or selected objects with a hatch pattern'
    },
    laycur: {
      description:
        'Changes the layer property of selected objects to the current layer',
      prompt: 'Select objects to be changed to the current layer'
    },
    laydel: {
      description: 'Deletes a layer and all objects on that layer'
    },
    layerclose: {
      description: 'Closes the Layer Properties Manager'
    },
    layerp: {
      description:
        'Undoes the last change or set of changes made to layer settings'
    },
    layfrz: {
      description: 'Freezes the layer of selected objects',
      prompt: 'Select object on layer to freeze'
    },
    layiso: {
      description: 'Isolates the layers of selected objects',
      prompt: 'Select objects on layers to isolate'
    },
    laylck: {
      description: 'Locks the layer of selected objects',
      prompt: 'Select object on layer to lock'
    },
    layoff: {
      description: 'Turns off the layer of selected objects',
      prompt: 'Select object on layer to turn off'
    },
    layon: {
      description: 'Turns on all layers in the drawing'
    },
    laythw: {
      description: 'Thaws all frozen layers in the drawing'
    },
    layulk: {
      description: 'Unlocks the layer of selected objects',
      prompt: 'Select object on layer to unlock'
    },
    layuniso: {
      description: 'Restores layers hidden or locked by LAYISO'
    },
    line: {
      description: 'Draws straight line segments between points'
    },
    log: {
      description: 'Logs debug information in console'
    },
    lwdisplay: {
      description: 'Controls whether lineweights are displayed in the drawing'
    },
    mline: {
      description: 'Creates multiple parallel lines as one multiline object'
    },
    move: {
      description: 'Moves selected entities by a displacement vector',
      prompt: 'Select entities'
    },
    mtext: {
      description: 'Creates one mtext entity'
    },
    open: {
      description: 'Opens an existing drawing file'
    },
    pan: {
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    pickbox: {
      description:
        'Sets the size (in pixels) of the selection box used to pick objects'
    },
    pline: {
      description: 'Creates a polyline by specifying multiple points'
    },
    pngout: {
      description: 'Exports to PNG'
    },
    point: {
      description: 'Creates points'
    },
    polygon: {
      description:
        'Creates a regular polygon by center/radius or by one polygon edge'
    },
    qnew: {
      description: 'Starts a new drawing'
    },
    ray: {
      description:
        'Creates a ray that starts at a point and extends to infinity'
    },
    rectang: {
      description: 'Creates a rectangle by specifying two opposite corners'
    },
    regen: {
      description: 'Redraws the current drawing'
    },
    revcloud: {
      description: 'Creates a revision cloud (cloud line) in rectangular shape'
    },
    rotate: {
      description: 'Rotates selected entities around a base point',
      prompt: 'Select entities'
    },
    select: {
      description: 'Selects entities'
    },
    sketch: {
      description:
        'Creates a sketch line using polyline that tracks mouse movement'
    },
    spline: {
      description: 'Creates a smooth spline curve by specifying control points'
    },
    whitebkcolor: {
      description: 'Toggles the drawing area background between white and black'
    },
    xline: {
      description:
        'Creates a construction line that extends infinitely in both directions'
    },
    zoom: {
      description: 'Zooms to display the maximum extents of all entities'
    }
  },
  USER: {}
}
