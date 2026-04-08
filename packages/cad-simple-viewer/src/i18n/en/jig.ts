export default {
  arc: {
    startPointOrCenter: 'Specify start point of arc or [Center]:',
    secondPointOrOptions: 'Specify second point of arc or [Center/End]:',
    startPoint: 'Specify start point of arc:',
    centerPoint: 'Specify center point of arc:',
    endPoint: 'Specify end point of arc:',
    endPointOrOptions: 'Specify end point of arc or [Angle/chord Length]:',
    centerPointOrOptions:
      'Specify center point of arc or [Angle/Direction/Radius]:',
    includedAngle: 'Specify included angle:',
    chordLength: 'Specify chord length:',
    tangentDirection: 'Specify tangent direction for start point of arc:',
    radius: 'Specify radius of arc:',
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
    center: 'Specify the center of circle:',
    radius: 'Specify the radius of circle:'
  },
  measureDistance: {
    firstPoint: 'Specify first point:',
    secondPoint: 'Specify second point:'
  },
  measureArea: {
    firstPoint: 'Specify first point:',
    nextPoint: 'Specify next point (or press Enter to finish):'
  },
  measureAngle: {
    vertex: 'Specify vertex point:',
    arm1: 'Specify point on first arm:',
    arm2: 'Specify point on second arm:'
  },
  measureArc: {
    startPoint: 'Specify arc start point:',
    throughPoint: 'Specify a point on the arc:',
    endPoint: 'Specify arc end point:'
  },
  dimlinear: {
    xLine1Point: 'Specify the first extension line origin:',
    xLine2Point: 'Specify the second extension line origin:',
    dimLinePoint: 'Specify dimension line location:'
  },
  line: {
    firstPoint: 'Specify the first point:',
    nextPoint: 'Specify the next point:'
  },
  mtext: {
    point: 'Specify mtext insertion point:'
  },
  rect: {
    firstPoint: 'Specify the first point:',
    nextPoint: 'Specify the next point:'
  },
  sketch: {
    firstPoint: 'Specify the first point:',
    nextPoint: 'Specify the end point:'
  },
  polyline: {
    firstPoint: 'Specify the first point:',
    nextPoint: 'Specify the next point (or press Enter to finish):',
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
    arcAngle: 'Specify arc angle:',
    arcCenter: 'Specify center point:',
    arcSecondPoint: 'Specify second point on arc:',
    arcEndPoint: 'Specify arc end point:',
    arcRadius: 'Specify arc radius:'
  },
  spline: {
    firstPoint: 'Specify the first point:',
    nextPoint: 'Specify the next point (or press Enter to finish):'
  },
  sysvar: {
    prompt: 'Please input new value:'
  }
}
