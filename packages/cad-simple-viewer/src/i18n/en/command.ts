export default {
  ACAD: {
    circle: {
      description: 'Creates one circle by center and radius'
    },
    csvg: {
      description: 'Converts current drawing to SVG'
    },
    dimlinear: {
      description: 'Creates linear dimensions'
    },
    erase: {
      description: 'Deletes selected entities from the drawing',
      prompt: 'Select entities'
    },
    line: {
      description: 'Draws straight line segments between points'
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
    pickbox: {
      description:
        'Sets the size (in pixels) of the selection box used to pick objects'
    },
    qnew: {
      description: 'Starts a new drawing'
    },
    regen: {
      description: 'Redraw the current drawing'
    },
    select: {
      description: 'Selects entities'
    },
    zoom: {
      description: 'Zooms to display the maximum extents of all entities'
    },
    zoomw: {
      description: 'Zooms to display an area specified by a rectangular window'
    }
  },
  USER: {}
}
