export default {
  ACAD: {
    arc: {
      description: 'Creates an arc'
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
    clayer: {
      description:
        'Sets the current layer for new objects and editing operations'
    },
    circle: {
      description: 'Creates one circle by center and radius'
    },
    colortheme: {
      description:
        'Controls the color theme of the user interface (dark or light)'
    },
    cdxf: {
      description: 'Exports current drawing to DXF'
    },
    csvg: {
      description: 'Converts current drawing to SVG'
    },
    dimlinear: {
      description: 'Creates linear dimensions'
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
    '-layer': {
      description: 'Manages layers through command-line options'
    },
    laycur: {
      description:
        'Changes the layer property of selected objects to the current layer',
      prompt: 'Select objects to be changed to the current layer'
    },
    laydel: {
      description: 'Deletes a layer and all objects on that layer'
    },
    layfrz: {
      description: 'Freezes the layer of selected objects',
      prompt: 'Select object on layer to freeze'
    },
    layiso: {
      description: 'Isolates the layers of selected objects',
      prompt: 'Select objects on layers to isolate'
    },
    layuniso: {
      description: 'Restores layers hidden or locked by LAYISO'
    },
    laylck: {
      description: 'Locks the layer of selected objects',
      prompt: 'Select object on layer to lock'
    },
    layon: {
      description: 'Turns on all layers in the drawing'
    },
    layoff: {
      description: 'Turns off the layer of selected objects',
      prompt: 'Select object on layer to turn off'
    },
    laythw: {
      description: 'Thaws all frozen layers in the drawing'
    },
    layulk: {
      description: 'Unlocks the layer of selected objects',
      prompt: 'Select object on layer to unlock'
    },
    layerclose: {
      description: 'Closes the Layer Properties Manager'
    },
    line: {
      description: 'Draws straight line segments between points'
    },
    lwdisplay: {
      description: 'Controls whether lineweights are displayed in the drawing'
    },
    pline: {
      description: 'Creates a polyline by specifying multiple points'
    },
    polygon: {
      description:
        'Creates a regular polygon by center/radius or by one polygon edge'
    },
    spline: {
      description: 'Creates a smooth spline curve by specifying control points'
    },
    mtext: {
      description: 'Creates one mtext entity'
    },
    move: {
      description: 'Moves selected entities by a displacement vector',
      prompt: 'Select entities'
    },
    copy: {
      description: 'Copies selected entities by cloning them to new positions',
      prompt: 'Select entities'
    },
    rotate: {
      description: 'Rotates selected entities around a base point',
      prompt: 'Select entities'
    },
    log: {
      description: 'Logs debug information in console'
    },
    open: {
      description: 'Opens an existing drawing file'
    },
    pan: {
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    point: {
      description: 'Creates points'
    },
    pickbox: {
      description:
        'Sets the size (in pixels) of the selection box used to pick objects'
    },
    pngout: {
      description: 'Exports to PNG'
    },
    qnew: {
      description: 'Starts a new drawing'
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
    select: {
      description: 'Selects entities'
    },
    sketch: {
      description:
        'Creates a sketch line using polyline that tracks mouse movement'
    },
    whitebkcolor: {
      description: 'Toggles the drawing area background between white and black'
    },
    zoom: {
      description: 'Zooms to display the maximum extents of all entities'
    }
  },
  USER: {}
}
