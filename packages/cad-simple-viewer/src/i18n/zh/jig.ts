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
    centerOrOptions: '指定圆的圆心或 [三点(3P)/两点(2P)]：',
    radius: '指定圆的半径：',
    radiusOrDiameter: '指定圆的半径或 [直径(D)]：',
    diameter: '指定圆的直径：',
    twoPointFirst: '指定圆直径的第一个端点：',
    twoPointSecond: '指定圆直径的第二个端点：',
    threePointFirst: '指定圆上的第一个点：',
    threePointSecond: '指定圆上的第二个点：',
    threePointThird: '指定圆上的第三个点：',
    keywords: {
      threeP: {
        display: '三点(3P)',
        local: '三点',
        global: '3P'
      },
      twoP: {
        display: '两点(2P)',
        local: '两点',
        global: '2P'
      },
      diameter: {
        display: '直径(D)',
        local: '直径',
        global: 'Diameter'
      }
    }
  },
  ellipse: {
    axisEndpointOrOptions: '指定椭圆的轴端点或 [圆弧(A)/中心点(C)]：',
    arcAxisEndpointOrCenter: '指定椭圆弧的轴端点或 [中心点(C)]：',
    center: '指定椭圆中心点：',
    firstAxisEndpoint: '指定轴的端点：',
    secondAxisEndpoint: '指定轴的另一个端点：',
    otherAxisOrRotation: '指定到另一轴的距离或 [旋转(R)]：',
    rotationAngle: '指定绕长轴的旋转角度：',
    arcStartAngle: '指定椭圆弧起始角：',
    arcEndAngle: '指定椭圆弧终止角：',
    keywords: {
      arc: {
        display: '圆弧(A)',
        local: '圆弧',
        global: 'Arc'
      },
      center: {
        display: '中心点(C)',
        local: '中心点',
        global: 'Center'
      },
      rotation: {
        display: '旋转(R)',
        local: '旋转',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: '轴输入无效：轴长必须大于 0。',
      otherAxis: '另一轴输入无效：距离必须大于 0。',
      rotation: '旋转输入无效：计算得到的短轴必须大于 0。'
    }
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
    nextPoint: '指定下一个点：',
    nextPointWithOptions: '请指定下一个点或',
    keywords: {
      undo: {
        display: '放弃(U)',
        local: '放弃',
        global: 'Undo'
      },
      close: {
        display: '闭合(C)',
        local: '闭合',
        global: 'Close'
      }
    }
  },
  mtext: {
    point: '指定多行文本插入点：'
  },
  rect: {
    firstPoint: '指定第一个角点：',
    nextPoint: '指定另一个角点：',
    firstPointWithOptions: '指定第一个角点或者',
    otherCornerWithOptions: '指定另一个角点或者',
    chamferFirst: '指定第一个倒角距离：',
    chamferSecond: '指定第二个倒角距离：',
    filletRadius: '指定圆角半径：',
    segmentWidth: '指定矩形线宽：',
    elevationValue: '指定标高：',
    thicknessValue: '指定厚度：',
    rotationAngle: '指定矩形旋转角度：',
    dimensionLength: '指定矩形长度：',
    dimensionWidth: '指定矩形宽度：',
    areaValue: '指定矩形面积：',
    areaLengthOrWidth: '指定矩形长度或 [宽度(W)]：',
    areaSpecifyWidth: '指定矩形宽度：',
    invalidPositive: '输入无效：请输入大于 0 的数值。',
    invalidRect: '无法创建矩形：请输入有效的角点或尺寸。',
    thicknessNotSupported:
      '当前版本暂不支持将矩形厚度写入图元，已忽略厚度设置。',
    keywords: {
      chamfer: {
        display: '倒角(C)',
        local: '倒角',
        global: 'Chamfer'
      },
      elevation: {
        display: '标高(E)',
        local: '标高',
        global: 'Elevation'
      },
      fillet: {
        display: '圆角(F)',
        local: '圆角',
        global: 'Fillet'
      },
      thickness: {
        display: '厚度(T)',
        local: '厚度',
        global: 'Thickness'
      },
      width: {
        display: '宽度(W)',
        local: '宽度',
        global: 'Width'
      },
      area: {
        display: '面积(A)',
        local: '面积',
        global: 'Area'
      },
      dimensions: {
        display: '尺寸(D)',
        local: '尺寸',
        global: 'Dimensions'
      },
      rotation: {
        display: '旋转(R)',
        local: '旋转',
        global: 'Rotation'
      },
      length: {
        display: '长度(L)',
        local: '长度',
        global: 'Length'
      },
      rectWidth: {
        display: '宽度(W)',
        local: '宽度',
        global: 'Width'
      }
    }
  },
  polygon: {
    numberOfSides: '输入边数：',
    centerOrEdge: '指定多边形中心点或',
    radiusOrType: '输入选项',
    edgeStart: '指定边的第一个端点：',
    edgeEnd: '指定边的第二个端点：',
    keywords: {
      edge: {
        display: '边(E)',
        local: '边',
        global: 'Edge'
      },
      inscribed: {
        display: '内接于圆(I)',
        local: '内接于圆',
        global: 'Inscribed'
      },
      circumscribed: {
        display: '外切于圆(C)',
        local: '外切于圆',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: '边数无效：请输入 3 到 1024 之间的整数。',
      radius: '半径无效：半径必须大于 0。',
      edge: '边无效：边长必须大于 0。'
    }
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
    nextPoint: '指定下一个点（或按 Enter 完成）：',
    firstPointWithOptions: '指定第一个点或',
    nextPointWithFitOptions: '指定下一个点或',
    nextPointWithCvOptions: '指定下一个控制顶点或',
    methodPrompt: '输入样条创建方式',
    knotsPrompt: '输入节点参数化方式',
    degreePrompt: '指定样条次数：',
    keywords: {
      method: {
        display: '方法(M)',
        local: '方法',
        global: 'Method'
      },
      fit: {
        display: '拟合(F)',
        local: '拟合',
        global: 'Fit'
      },
      cv: {
        display: '控制顶点(C)',
        local: '控制顶点',
        global: 'CV'
      },
      knots: {
        display: '节点(K)',
        local: '节点',
        global: 'Knots'
      },
      degree: {
        display: '次数(D)',
        local: '次数',
        global: 'Degree'
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
      chord: {
        display: '弦长(C)',
        local: '弦长',
        global: 'Chord'
      },
      sqrtChord: {
        display: '平方根弦长(S)',
        local: '平方根弦长',
        global: 'SqrtChord'
      },
      uniform: {
        display: '均匀(U)',
        local: '均匀',
        global: 'Uniform'
      }
    }
  },
  sysvar: {
    prompt: '请输入新的值：'
  }
}
