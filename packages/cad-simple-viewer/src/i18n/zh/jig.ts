export default {
  arc: {
    startPointOrCenter: '指定圆弧的起点或',
    secondPointOrOptions: '指定圆弧上的第二点或',
    secondPoint: '指定圆弧上的第二点：',
    startPoint: '指定圆弧的起点：',
    centerPoint: '指定圆弧的圆心：',
    endPoint: '指定圆弧的端点：',
    endPointOrOptions: '指定圆弧的端点或',
    centerPointOrOptions: '指定圆弧的圆心或',
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
    centerOrOptions: '指定圆的圆心或',
    radius: '指定圆的半径：',
    radiusOrDiameter: '指定圆的半径或',
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
  copy: {
    basePointOrOptions: '指定基点或',
    displacementOrArray: '指定位移或',
    secondPointOrArray: '指定第二个点或',
    modePrompt: '输入复制模式选项',
    arrayItemCount: '输入阵列中的项目数（包括原对象）：',
    arraySecondPointOrFit: '指定第二个点或',
    arrayFitSecondPoint: '指定第二个点：',
    keywords: {
      displacement: {
        display: '位移(D)',
        local: '位移',
        global: 'Displacement'
      },
      mode: {
        display: '模式(O)',
        local: '模式',
        global: 'Mode'
      },
      multiple: {
        display: '多个(M)',
        local: '多个',
        global: 'Multiple'
      },
      single: {
        display: '单个(S)',
        local: '单个',
        global: 'Single'
      },
      array: {
        display: '阵列(A)',
        local: '阵列',
        global: 'Array'
      },
      fit: {
        display: '布满(F)',
        local: '布满',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: '指定第一条尺寸界限原点：',
    xLine2Point: '指定第二条尺寸界限原点：',
    dimLinePoint: '指定尺寸线位置：'
  },
  ellipse: {
    axisEndpointOrOptions: '指定椭圆的轴端点或',
    arcAxisEndpointOrCenter: '指定椭圆弧的轴端点或',
    center: '指定椭圆中心点：',
    firstAxisEndpoint: '指定轴的端点：',
    secondAxisEndpoint: '指定轴的另一个端点：',
    otherAxisOrRotation: '指定到另一轴的距离或',
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
  hatch: {
    prompt: '选择边界对象或',
    pickPoint: '指定内部点（或按 Enter 结束）：',
    select: '选择要填充的对象：',
    patternName: '输入填充图案名称：',
    scale: '指定填充图案比例：',
    angle: '指定填充图案角度：',
    style: '输入填充样式',
    associative: '指定关联性',
    invalidBoundary: '所选对象无法构成闭合边界。',
    keywords: {
      pick: {
        display: '拾取点(P)',
        local: '拾取点',
        global: 'PickPoints'
      },
      select: {
        display: '选择对象(S)',
        local: '选择对象',
        global: 'SelectObjects'
      },
      pattern: {
        display: '图案(P)',
        local: '图案',
        global: 'Pattern'
      },
      scale: {
        display: '比例(S)',
        local: '比例',
        global: 'Scale'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      style: {
        display: '样式(T)',
        local: '样式',
        global: 'HatchStyle'
      },
      associative: {
        display: '关联(AS)',
        local: '关联',
        global: 'AssociativeMode'
      },
      normal: {
        display: '普通(N)',
        local: '普通',
        global: 'Normal'
      },
      outer: {
        display: '外部(O)',
        local: '外部',
        global: 'Outer'
      },
      ignore: {
        display: '忽略(I)',
        local: '忽略',
        global: 'Ignore'
      },
      yes: {
        display: '是(Y)',
        local: '是',
        global: 'Yes'
      },
      no: {
        display: '否(N)',
        local: '否',
        global: 'No'
      }
    }
  },
  layer: {
    main: '输入选项',
    listSummary: '图层列表已输出到浏览器控制台',
    emptyInput: '未输入图层名。',
    newPrompt: '输入新建图层名称（可用逗号分隔多个）：',
    makePrompt: '输入要创建并设为当前的图层名：',
    setPrompt: '输入要设为当前的图层名：',
    onPrompt: '输入要打开的图层名：',
    offPrompt: '输入要关闭的图层名：',
    freezePrompt: '输入要冻结的图层名：',
    thawPrompt: '输入要解冻的图层名：',
    lockPrompt: '输入要锁定的图层名：',
    unlockPrompt: '输入要解锁的图层名：',
    colorLayerPrompt: '输入要修改颜色的图层名：',
    colorValuePrompt: '输入颜色（ACI 1-255、RGB 如 255,0,0 或颜色名）：',
    invalidColor: '颜色输入无效。',
    descriptionLayerPrompt: '输入要修改说明的图层名：',
    descriptionValuePrompt: '输入新的图层说明：',
    created: '已创建图层数量',
    alreadyExists: '图层已存在',
    notFound: '未找到图层',
    cannotChangeCurrent: '不能关闭或冻结当前图层。',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: '创建并置为当前(M)',
        local: '创建并置为当前',
        global: 'Make'
      },
      set: {
        display: '置为当前(S)',
        local: '置为当前',
        global: 'Set'
      },
      new: {
        display: '新建(N)',
        local: '新建',
        global: 'New'
      },
      on: {
        display: '打开(ON)',
        local: '打开',
        global: 'On'
      },
      off: {
        display: '关闭(OF)',
        local: '关闭',
        global: 'Off'
      },
      color: {
        display: '颜色(C)',
        local: '颜色',
        global: 'Color'
      },
      freeze: {
        display: '冻结(F)',
        local: '冻结',
        global: 'Freeze'
      },
      thaw: {
        display: '解冻(T)',
        local: '解冻',
        global: 'Thaw'
      },
      lock: {
        display: '锁定(L)',
        local: '锁定',
        global: 'Lock'
      },
      unlock: {
        display: '解锁(U)',
        local: '解锁',
        global: 'Unlock'
      },
      description: {
        display: '说明(D)',
        local: '说明',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: '所有图层都已经打开。',
    turnedOn: '已打开图层数量'
  },
  layoff: {
    prompt: '选择要关闭其图层的对象或',
    invalidSelection: '所选对象无效。',
    settingsPrompt: '输入要修改的 LAYOFF 设置',
    viewportPrompt: '指定视口行为',
    blockSelectionPrompt: '指定嵌套块选择行为',
    vpfreezeFallback:
      '当前 viewer 不支持按视口关闭图层，已退化为普通 Off 行为。',
    nestedSelectionLimited:
      '嵌套块选择设置会被保存，但当前拾取仍只能解析顶层对象所在图层。',
    layerNotFound: '未找到图层',
    cannotTurnOffCurrent: '不能关闭当前图层。',
    alreadyOff: '图层已处于关闭状态',
    turnedOff: '已关闭图层',
    restored: '已恢复图层',
    nothingToUndo: '当前没有可撤销的 LAYOFF 操作。',
    keywords: {
      settings: {
        display: '设置(S)',
        local: '设置',
        global: 'Settings'
      },
      undo: {
        display: '放弃(U)',
        local: '放弃',
        global: 'Undo'
      },
      viewports: {
        display: '视口(V)',
        local: '视口',
        global: 'Viewports'
      },
      blockSelection: {
        display: '块选择(B)',
        local: '块选择',
        global: 'BlockSelection'
      },
      off: {
        display: '关闭(O)',
        local: '关闭',
        global: 'Off'
      },
      vpfreeze: {
        display: '视口冻结(V)',
        local: '视口冻结',
        global: 'Vpfreeze'
      },
      block: {
        display: '块(B)',
        local: '块',
        global: 'Block'
      },
      entity: {
        display: '对象(E)',
        local: '对象',
        global: 'Entity'
      },
      none: {
        display: '无(N)',
        local: '无',
        global: 'None'
      }
    }
  },
  line: {
    firstPoint: '指定第一个点：',
    firstPointOrContinue: '请指定第一个点或',
    nextPoint: '指定下一个点：',
    nextPointWithOptions: '请指定下一个点或',
    keywords: {
      continue: {
        display: '继续(C)',
        local: '继续',
        global: 'Continue'
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
      }
    }
  },
  measureArc: {
    startPoint: '指定弧的起点：',
    throughPoint: '指定弧上的一个点：',
    endPoint: '指定弧的终点：'
  },
  measureAngle: {
    vertex: '指定顶点：',
    arm1: '指定第一条边上的点：',
    arm2: '指定第二条边上的点：'
  },
  measureArea: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定下一个点（或按 Enter 完成）：'
  },
  measureDistance: {
    firstPoint: '指定第一个点：',
    secondPoint: '指定第二个点：'
  },
  move: {
    basePointOrDisplacement: '指定基点或',
    secondPointOrDisplacement: '指定第二个点或',
    displacement: '指定位移：',
    keywords: {
      displacement: {
        display: '位移(D)',
        local: '位移',
        global: 'Displacement'
      }
    }
  },
  mtext: {
    point: '指定多行文本插入点：'
  },
  pngout: {
    boundsFirstCorner: '指定边界的第一个角点',
    boundsSecondCorner: '指定对角点',
    longSidePrompt: '输入长边像素大小'
  },
  point: {
    point: '指定点'
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
  rotate: {
    basePoint: '指定基点：',
    rotationAngleOrOptions: '指定旋转角度或',
    referenceAngleOrPoints: '指定参考角或',
    firstReferencePoint: '指定参考角的第一点：',
    secondReferencePoint: '指定第二点：',
    newAngle: '指定新角度：',
    keywords: {
      copy: {
        display: '复制(C)',
        local: '复制',
        global: 'Copy'
      },
      reference: {
        display: '参照(R)',
        local: '参照',
        global: 'Reference'
      },
      points: {
        display: '点(P)',
        local: '点',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: '参考点输入无效：两点必须不同。'
    }
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
    areaLengthOrWidth: '指定矩形长度',
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
  sketch: {
    firstPoint: '指定第一个点：',
    nextPoint: '指定结束点：'
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
  },
  zoom: {
    mainPrompt: '指定窗口角点或',
    firstCorner: '指定第一个角点：',
    secondCorner: '指定对角点：',
    centerPoint: '指定缩放中心点：',
    heightOrScale: '输入高度或比例因子（nX 或 nXP）：',
    scaleFactor: '输入比例因子（nX 或 nXP）：',
    keywords: {
      all: {
        display: '全部(A)',
        local: '全部',
        global: 'All'
      },
      center: {
        display: '中心(C)',
        local: '中心',
        global: 'Center'
      },
      extents: {
        display: '范围(E)',
        local: '范围',
        global: 'Extents'
      },
      previous: {
        display: '上一个(P)',
        local: '上一个',
        global: 'Previous'
      },
      scale: {
        display: '比例(S)',
        local: '比例',
        global: 'Scale'
      },
      window: {
        display: '窗口(W)',
        local: '窗口',
        global: 'Window'
      }
    }
  }
}
