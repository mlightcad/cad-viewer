export default {
  ACAD: {
    '-hatch': {
      description:
        'Creates hatch fills through command-line options without the ribbon UI'
    },
    '-layer': {
      description: 'Manages layers through command-line options'
    },
    about: {
      description: 'Displays information about mlightcad'
    },
    acadver: {
      description: 'Stores the drawing database version identifier (read-only)'
    },
    annoallvisible: {
      description:
        'Controls whether annotative objects that do not support the current annotation scale are displayed'
    },
    angbase: {
      description:
        'Sets the base angle 0 direction with respect to the current UCS'
    },
    angdir: {
      description:
        'Sets whether positive angles are measured clockwise or counterclockwise'
    },
    arc: {
      description: 'Creates an arc'
    },
    aunits: {
      description: 'Sets the display format for angles'
    },
    auprec: {
      description:
        'Sets the display precision for angles, used together with AUNITS'
    },
    bmpout: {
      description: 'Exports to BMP'
    },
    cannoscale: {
      description: 'Sets the name of the current annotation scale'
    },
    cdxf: {
      description: 'Exports current drawing to DXF'
    },
    cpdf: {
      description: 'Exports current drawing to PDF'
    },
    '-cpdf': {
      description: 'Exports current drawing to PDF using command-line options'
    },
    cecolor: {
      description: 'Sets the current default color for newly created objects'
    },
    celtscale: {
      description:
        'Controls the linetype scale factor for newly created objects'
    },
    celtype: {
      description: 'Sets the linetype for newly created objects'
    },
    celweight: {
      description: 'Sets the default lineweight for newly created objects'
    },
    cetransparency: {
      description: 'Sets the transparency for newly created objects'
    },
    cachefont: {
      description: 'Caches a local font file into IndexedDB for text rendering'
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
    commandpreview: {
      description:
        'Controls whether a preview of the possible outcome of certain commands is displayed'
    },
    comparehatch: {
      description:
        'Controls whether hatch objects are included in drawing comparison'
    },
    compareprops: {
      description:
        'Controls which non-geometric property changes are identified as differences between drawings'
    },
    comparercmargin: {
      description:
        'Sets the offset between a change-set boundary and the revision cloud in a comparison drawing'
    },
    comparetext: {
      description:
        'Controls whether text objects are included in drawing comparison'
    },
    comparetolerance: {
      description:
        'Sets the decimal-place tolerance used when comparing two drawings'
    },
    copy: {
      description: 'Copies selected entities by cloning them to new positions',
      prompt: 'Select entities'
    },
    copybase: {
      description:
        'Copies selected objects to the clipboard with a specified base point',
      prompt: 'Select entities'
    },
    copyclip: {
      description: 'Copies selected objects to the clipboard',
      prompt: 'Select entities'
    },
    cutclip: {
      description:
        'Copies selected objects to the clipboard and removes them from the drawing',
      prompt: 'Select entities'
    },
    pasteblock: {
      description: 'Pastes objects from the clipboard as a block'
    },
    pasteclip: {
      description: 'Pastes objects from the clipboard into the current drawing'
    },
    pasteorig: {
      description:
        'Pastes objects from the clipboard using the coordinates of the original drawing'
    },
    csvg: {
      description: 'Converts current drawing to SVG'
    },
    chtml: {
      description: 'Exports current drawing to a standalone offline HTML file'
    },
    '-chtml': {
      description: 'Exports current drawing to HTML using command-line options'
    },
    dimlinear: {
      description: 'Creates linear dimensions'
    },
    dimaligned: {
      description: 'Creates an aligned linear dimension'
    },
    dimradius: {
      description: 'Creates radial dimensions for circles and arcs'
    },
    dimdiameter: {
      description: 'Creates diameter dimensions for circles and arcs'
    },
    dimangular: {
      description: 'Creates angular dimensions'
    },
    dimarc: {
      description: 'Creates arc length dimensions'
    },
    dimordinate: {
      description: 'Creates ordinate dimensions'
    },
    dimcontinue: {
      description: 'Creates a continued dimension'
    },
    dimbaseline: {
      description: 'Creates a baseline dimension'
    },
    dimstyle: {
      description: 'Sets the name of the current dimension style'
    },
    dwgname: {
      description: 'Stores the name of the current drawing file (read-only)'
    },
    find: {
      description: 'Opens the text search dock panel'
    },
    layer: {
      description: 'Opens or closes the layer manager dock panel'
    },
    loginname: {
      description: 'Displays the user\'s login name (read-only)'
    },
    dynmode: {
      description: 'Controls Dynamic Input settings at the cursor'
    },
    dynprompt: {
      description: 'Controls display of prompts in Dynamic Input tooltips'
    },
    ellipse: {
      description:
        'Creates an ellipse or elliptical arc by axis endpoints or center'
    },
    erase: {
      description: 'Deletes selected entities from the drawing',
      prompt: 'Select entities'
    },
    explode: {
      description: 'Breaks a compound object into its component objects',
      prompt: 'Select objects to explode'
    },
    join: {
      description:
        'Joins the endpoints of lines, arcs, and polylines to create a single object',
      prompt: 'Select objects to join'
    },
    extend: {
      description: 'Extends objects to meet the edges of other objects'
    },
    trim: {
      description: 'Trims objects to meet the edges of other objects'
    },
    group: {
      description: 'Creates and manages saved sets of objects called groups'
    },
    groupdisplaymode: {
      description:
        'Controls how grips are displayed when group selection is on and a group member is selected'
    },
    '-bsearch': {
      description:
        'Finds identical geometry and converts it into blocks (command line)',
      prompt: 'Select objects to search for'
    },
    '-group': {
      description: 'Creates and manages groups through command-line options'
    },
    groupedit: {
      description: 'Adds and removes objects from a group, or renames a group'
    },
    ungroup: {
      description: 'Disassociates objects from a group'
    },
    extmax: {
      description:
        'Stores the upper-right corner of the model-space drawing extents (read-only)'
    },
    extmin: {
      description:
        'Stores the lower-left corner of the model-space drawing extents (read-only)'
    },
    entout: {
      description: 'Exports a merged preview image for selected entities',
      prompt: 'Select entities'
    },
    hideobjects: {
      description: 'Temporarily suppresses the display of selected objects',
      prompt: 'Select objects'
    },
    imageattach: {
      description:
        'Attaches a raster image as an external reference to the current drawing'
    },
    '-insert': {
      description:
        'Inserts a block definition into the current drawing (command-line)'
    },
    xattach: {
      description:
        'Attaches a DWG or DXF drawing as an external reference to the current drawing'
    },
    gripcolor: {
      description:
        'Sets the color of unselected grips displayed on selected objects'
    },
    griphot: {
      description: 'Sets the color of selected (hot) grips'
    },
    gripobjlimit: {
      description:
        'Suppresses grip display when the selection set exceeds the specified number of objects (0 = no limit)'
    },
    grips: {
      description: 'Controls whether grips are displayed on selected objects'
    },
    gripsize: {
      description: 'Sets the size of grip boxes in pixels'
    },
    hatch: {
      description:
        'Fills an enclosed area or selected objects with a hatch pattern'
    },
    pdfdim: {
      description: 'Turns exploded PDF dimensions back into dimension objects',
      prompt: 'Select the area with dimensions'
    },
    pdfhatch: {
      description:
        'Turns the loose strokes of a PDF hatch back into a hatch object',
      prompt: 'Select the hatched area with the lines around it'
    },
    pdftext: {
      description: 'Converts exploded PDF text strokes back into text objects',
      prompt: 'Select text strokes to convert'
    },
    pdfscale: {
      description: 'Calibrates imported PDF geometry from a known distance',
      prompt: 'Select objects to scale'
    },
    pdfimport: {
      description:
        'Imports vector geometry from a PDF file through the Import PDF dialog'
    },
    '-pdfimport': {
      description:
        'Imports vector geometry from a PDF file using command-line options'
    },
    hpang: {
      description:
        'Sets the default angle, in radians, for newly created hatch patterns'
    },
    hpassoc: {
      description: 'Controls whether newly created hatches are associative'
    },
    hpbackgroundcolor: {
      description:
        'Sets the default background color for newly created hatch patterns'
    },
    hpcolor: {
      description: 'Sets the default color for newly created hatches'
    },
    hpdouble: {
      description: 'Controls whether user-defined hatch patterns are doubled'
    },
    hpislanddetection: {
      description:
        'Controls how islands within newly created hatch boundaries are treated'
    },
    hplayer: {
      description: 'Sets the default layer for newly created hatches and fills'
    },
    hpname: {
      description:
        'Sets the default pattern name for newly created hatches in this session'
    },
    hpscale: {
      description:
        'Sets the default scale factor for newly created hatch patterns'
    },
    hpseparate: {
      description:
        'Controls whether one or separate hatch objects are created for multiple boundaries'
    },
    hptransparency: {
      description:
        'Sets the default transparency for newly created hatches and fills'
    },
    insunits: {
      description:
        'Specifies drawing units for automatic scaling of inserted blocks, images, or xrefs'
    },
    jpgout: {
      description: 'Exports to JPEG'
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
    ltscale: {
      description: 'Sets the global linetype scale factor for the drawing'
    },
    lunits: {
      description: 'Sets the display format for coordinates and distances'
    },
    luprec: {
      description:
        'Sets the display precision for linear units, used together with LUNITS'
    },
    lwdisplay: {
      description: 'Controls whether lineweights are displayed in the drawing'
    },
    clearmeasurements: {
      description: 'Removes all measurements from the current layout'
    },
    measurementvis: {
      description: 'Shows or hides measurements on the current layout'
    },
    measurementpanel: {
      description: 'Opens the measurement palette'
    },
    measurementexport: {
      description: 'Exports measurements to a sidecar JSON file'
    },
    measurementimport: {
      description: 'Imports measurements from a sidecar JSON file'
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
    measurecontinuous: {
      description:
        'Measures chained distances by picking successive points until Enter or Cancel'
    },
    measurepoint: {
      description: 'Measures the X/Y coordinates of a picked point'
    },
    measurement: {
      description:
        'Sets whether the drawing uses English (imperial) or metric units'
    },
    measurementcolor: {
      description: 'Sets the color used for measurement overlays'
    },
    mirrtext: {
      description:
        'Controls how MIRROR reflects TEXT and MTEXT: 0 keeps text readable, 1 mirrors text'
    },
    mirror: {
      description: 'Creates a mirrored copy of selected objects',
      prompt: 'Select objects'
    },
    modelbkcolor: {
      description: 'Sets the background color of the model-space drawing area'
    },
    leader: {
      description: 'Creates a leader line that connects annotation to a feature'
    },
    mleader: {
      description: 'Creates a multileader object'
    },
    mleaderedit: {
      description:
        'Adds leader lines to, or removes leader lines from, a multileader'
    },
    mleadereditremove: {
      description: 'Removes leader lines from a multileader'
    },
    mline: {
      description: 'Creates multiple parallel lines as one multiline object'
    },
    move: {
      description: 'Moves selected entities by a displacement vector',
      prompt: 'Select entities'
    },
    objectscale: {
      description:
        'Adds or deletes supported annotation scales for selected annotative objects',
      prompt: 'Select annotative objects'
    },
    fillet: {
      description: 'Rounds and fillets the edges of objects'
    },
    filletpolyarc: {
      description:
        'Controls whether the FILLET Polyline option fillets arc segments in polylines'
    },
    filletrad: {
      description: 'Stores the current fillet radius for 2D objects'
    },
    chamfer: {
      description: 'Bevels the edges of objects'
    },
    chamfera: {
      description: 'Sets the first chamfer distance when CHAMMODE is set to 0'
    },
    chamferb: {
      description: 'Sets the second chamfer distance when CHAMMODE is set to 0'
    },
    chamferc: {
      description: 'Sets the chamfer length when CHAMMODE is set to 1'
    },
    chamferd: {
      description: 'Sets the chamfer angle when CHAMMODE is set to 1'
    },
    chammode: {
      description:
        'Sets the input method for CHAMFER: 0 = two distances, 1 = length and angle'
    },
    offset: {
      description:
        'Creates parallel curves, polylines, or circles at a specified distance'
    },
    mtext: {
      description: 'Creates one mtext entity'
    },
    txt2mtxt: {
      description:
        'Combines selected text and mtext entities into one mtext entity',
      prompt: 'Select text or mtext entities'
    },
    open: {
      description: 'Opens an existing drawing file'
    },
    openprof: {
      description:
        'Controls whether open-file stage timing profiles are logged to the console'
    },
    openperf: {
      description:
        'Opens the Open Performance palette with timings from the last drawing open'
    },
    orthomode: {
      description:
        'Constrains cursor movement to the horizontal or vertical axis'
    },
    osmode: {
      description: 'Sets running Object Snap modes using a bitcode value'
    },
    pan: {
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    paperbkcolor: {
      description:
        'Sets the background color of the paper-space (layout) drawing area'
    },
    pdmode: {
      description: 'Controls how POINT entities are displayed'
    },
    pdsize: {
      description: 'Sets the display size for POINT entities'
    },
    pickbox: {
      description:
        'Sets the size (in pixels) of the selection box used to pick objects'
    },
    pickstyle: {
      description: 'Controls group selection and associative hatch selection'
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
    polaraddang: {
      description:
        'Stores additional polar tracking angles as a semicolon-separated list'
    },
    polarang: {
      description: 'Sets the polar angle increment for polar tracking'
    },
    polarmode: {
      description: 'Controls polar and object snap tracking settings'
    },
    projmode: {
      description: 'Sets the current Projection mode for trimming or extending'
    },
    edgemode: {
      description:
        'Controls whether cutting and boundary edges are extended to their natural geometry when trimming or extending'
    },
    trimedges: {
      description:
        'Controls whether hatch pattern lines act as cutting edges in Quick mode of TRIM and EXTEND'
    },
    trimextendmode: {
      description:
        'Controls whether TRIM and EXTEND use Quick mode or Standard mode'
    },
    polygon: {
      description:
        'Creates a regular polygon by center/radius or by one polygon edge'
    },
    qnew: {
      description: 'Starts a new drawing'
    },
    close: {
      description: 'Closes the current drawing'
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
      description: 'Creates or modifies a revision cloud'
    },
    markuptext: {
      description: 'Places a text markup label'
    },
    markupline: {
      description: 'Creates a line markup'
    },
    markuparrow: {
      description: 'Creates an arrow markup'
    },
    markupcloud: {
      description: 'Creates a revision cloud markup'
    },
    markuprect: {
      description: 'Creates a rectangle markup'
    },
    markupcircle: {
      description: 'Creates a circle markup'
    },
    markuphighlight: {
      description: 'Creates a highlight rectangle markup'
    },
    markupcallout: {
      description:
        'Creates a callout: pick leader tip, place text box, then enter text'
    },
    markupstamp: {
      description: 'Places a stamp or custom symbol'
    },
    markupvis: {
      description: 'Shows or hides markups'
    },
    clearmarkups: {
      description: 'Clears all markups on the current layout'
    },
    markupexport: {
      description: 'Exports markups to a sidecar JSON file'
    },
    markupimport: {
      description: 'Imports markups from a sidecar JSON file'
    },
    markuppanel: {
      description: 'Opens the markup palette'
    },
    rotate: {
      description: 'Rotates selected entities around a base point',
      prompt: 'Select entities'
    },
    scale: {
      description:
        'Enlarges or reduces selected entities, keeping the proportions the same after scaling',
      prompt: 'Select entities'
    },
    select: {
      description: 'Selects entities'
    },
    shortcutmenu: {
      description:
        'Controls the availability of shortcut menus in the drawing area'
    },
    sketch: {
      description: 'Creates a series of freehand line segments'
    },
    spline: {
      description: 'Creates a smooth spline curve by specifying control points'
    },
    textstyle: {
      description: 'Sets the name of the current text style'
    },
    tilemode: {
      description:
        'Controls whether the Model tab or a paper-space layout is active'
    },
    trimmode: {
      description:
        'Controls whether selected edges for chamfers and fillets are trimmed'
    },
    unitmode: {
      description:
        'Controls fractional display of coordinates when LUNITS is Architectural or Fractional'
    },
    switchbg: {
      description: 'Toggles the drawing area background between white and black'
    },
    readingmode: {
      description:
        'Toggles reading mode: black linework on a white canvas for easier review'
    },
    unisolateobjects: {
      description: 'Redisplay all objects hidden by HIDEOBJECTS'
    },
    undo: {
      description: 'Undoes the last database editing operation',
      nothingToUndo: 'Nothing to undo.'
    },
    redo: {
      description: 'Redoes the last undone database editing operation',
      nothingToRedo: 'Nothing to redo.'
    },
    xline: {
      description:
        'Creates a construction line that extends infinitely in both directions'
    },
    zoom: {
      description: 'Zooms to display the maximum extents of all entities'
    },
    view: {
      description:
        'Opens the View Manager to create, restore, and delete named views'
    },
    newview: {
      description:
        'Creates a new named view from the current display or a window'
    },
    viewrestore: {
      description: 'Restores a named view by name'
    },
    ucs: {
      description:
        'Sets the origin and orientation of the current user coordinate system'
    },
    ucsman: {
      description: 'Manages named UCS definitions and UCS icon settings'
    }
  },
  USER: {}
}
