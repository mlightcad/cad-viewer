export default {
  arc: {
    startPointOrCenter: '指定圆弧的起点或 [圆心(C)]：',
    secondPointOrOptions: '指定圆弧上的第二点或 [圆心(C)/端点(E)]：',
    startPoint: '指定圆弧的起点：',
    centerPoint: '指定圆弧的圆心：',
    endPoint: '指定圆弧的端点：',
    endPointOrOptions: '指定圆弧的端点或 [角度(A)/弦长(L)]：',
    centerPointOrOptions: '指定圆弧的圆心或 [角度(A)/方向(D)/半径(R)]：',
    includedAngle: '指定圆弧的夹角：',
    chordLength: '指定圆弧的弦长：',
    tangentDirection: '指定圆弧起点的切线方向：',
    radius: '指定圆弧的半径：',
    keywords: {
      center: {
        display: '圆心(C)',
        local: '圆心',
        global: 'Center'
      },
      end: {
        display: '端点(E)',
        local: '端点',
        global: 'End'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      chordLength: {
        display: '弦长(L)',
        local: '弦长',
        global: 'ChordLength'
      },
      direction: {
        display: '方向(D)',
        local: '方向',
        global: 'Direction'
      },
      radius: {
        display: '半径(R)',
        local: '半径',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint: '三点圆弧无效：三点共线或无法确定圆弧。',
      center: '圆心输入无效：起点与终点必须在同一圆上。',
      angle: '角度输入无效：夹角必须大于 0 且小于 360 度。',
      chordLength: '弦长输入无效：该值超出当前半径可用范围。',
      direction: '方向输入无效：无法根据该切线方向构造圆弧。',
      radius: '半径输入无效：指定半径无法连接起点与终点。'
    }
  },
  circle: {
    center: '指定圆的圆心：',
    radius: '指定圆的半径：'
  },
  measureDistance: {
    firstPoint: '指定第一个点：',
    secondPoint: '指定第二个点：'
  },
  measureArea: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点（或按 Enter 完成）：'
  },
  measureAngle: {
    vertex: '指定顶点：',
    arm1: '指定第一条边上的点：',
    arm2: '指定第二条边上的点：'
  },
  measureArc: {
    startPoint: '指定弧的起点：',
    throughPoint: '指定弧上的一个点：',
    endPoint: '指定弧的终点：'
  },
  dimlinear: {
    xLine1Point: '指定第一条尺寸界限原点：',
    xLine2Point: '指定第二条尺寸界限原点：',
    dimLinePoint: '指定尺寸线位置：'
  },
  line: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点：'
  },
  mtext: {
    point: '指定多行文本插入点：'
  },
  rect: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点：'
  },
  sketch: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定结束点：'
  },
  polyline: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点（或按 Enter 完成）：',
    nextPointWithOptions: '请指定下一个点或',
    nextPointWithArcOptions: '请指定下一个点或',
    keywords: {
      arc: {
        display: '圆弧(A)',
        local: '圆弧',
        global: 'Arc'
      },
      undo: {
        display: '放弃(U)',
        local: '放弃',
        global: 'Undo'
      },
      close: {
        display: '闭合(C)',
        local: '闭合',
        global: 'Close'
      },
      line: {
        display: '直线(L)',
        local: '直线',
        global: 'Line'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      center: {
        display: '圆心(C)',
        local: '圆心',
        global: 'Center'
      },
      secondPoint: {
        display: '第二点(P)',
        local: '第二点',
        global: 'SecondPoint'
      },
      radius: {
        display: '半径(R)',
        local: '半径',
        global: 'Radius'
      }
    },
    arcAngle: '指定弧角度：',
    arcCenter: '指定圆心：',
    arcSecondPoint: '指定弧上的第二点：',
    arcEndPoint: '指定弧的终点：',
    arcRadius: '指定弧半径：'
  },
  spline: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点（或按 Enter 完成）：'
  },
  sysvar: {
    prompt: '请输入新的值：'
  }
}
