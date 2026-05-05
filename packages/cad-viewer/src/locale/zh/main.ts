export default {
  mainMenu: {
    new: '新建图纸',
    open: '打开图纸',
    export: '导出为DXF',
    exportImage: '导出图片'
  },
  ribbon: {
    tab: {
      home: '常用',
      tools: '工具',
      hatchContext: '填充'
    },
    hatch: {
      contextTitle: '填充创建',
      group: {
        boundary: '边界',
        pattern: '图案',
        properties: '特性',
        close: '关闭'
      },
      command: {
        pickPoints: '拾取点',
        selectObjects: '选择对象',
        close: '关闭'
      },
      field: {
        pattern: '图案',
        scale: '比例',
        angle: '角度',
        style: '样式',
        associative: '关联',
        fillType: '填充类型',
        fillColor: '颜色',
        patternColor: '图案颜色',
        gradient1Color: '渐变色1',
        backgroundColor: '背景颜色',
        gradient2Color: '渐变色2',
        opacity: '透明度',
        imageScale: '图片比例'
      },
      style: {
        normal: '普通',
        outer: '外部',
        ignore: '忽略'
      },
      fillType: {
        solid: '实体',
        pattern: '图案',
        gradient: '渐变色'
      },
      associative: {
        on: '开',
        off: '关'
      },
      tooltip: {
        pickPoints: '拾取内部点来创建填充区域。',
        selectObjects: '选择闭合边界对象进行填充。',
        pattern: '设置填充图案名称。',
        scale: '设置填充图案比例。',
        angle: '设置填充图案角度（度）。',
        style: '控制填充时的岛屿检测样式。',
        associative: '切换关联填充模式。',
        fillType: '选择填充类型：实体、图案或渐变色。',
        fillColor: '选择填充颜色。',
        patternColor: '选择图案线条颜色。',
        gradient1Color: '选择第一个渐变颜色。',
        backgroundColor: '为图案填充选择背景颜色。',
        gradient2Color: '选择第二个渐变颜色。',
        opacity: '设置填充透明度（0-90）。',
        imageScale: '设置填充图片比例。',
        close: '退出填充创建并关闭该上下文标签。'
      }
    },
    group: {
      draw: '绘制',
      modify: '修改',
      layer: '图层',
      properties: '属性',
      utilities: '实用工具',
      annotation: '批注',
      measurement: '测量'
    },
    property: {
      color: '颜色',
      lineType: '线型',
      lineWeight: '线宽'
    },
    layerTools: {
      select: '图层',
      off: '关闭图层',
      isolate: '隔离',
      freeze: '冻结图层',
      lock: '锁定图层',
      current: '置为当前',
      allOn: '图层全开',
      unisolate: '取消隔离',
      thaw: '解冻图层',
      unlock: '解锁图层',
      restore: '图层恢复'
    },
    arc: {
      threePoint: '三点',
      startCenterEnd: '起点、圆心、终点',
      startCenterAngle: '起点、圆心、角度',
      startCenterLength: '起点、圆心、长度',
      startEndAngle: '起点、终点、角度',
      startEndDirection: '起点、终点、方向',
      startEndRadius: '起点、终点、半径',
      centerStartEnd: '圆心、起点、终点',
      centerStartAngle: '圆心、起点、角度',
      centerStartLength: '圆心、起点、长度'
    },
    circle: {
      centerRadius: '圆心、半径',
      centerDiameter: '圆心、直径',
      twoPoint: '两点',
      threePoint: '三点',
      tanTanRadius: '相切、相切、半径',
      tanTanTan: '相切、相切、相切'
    },
    ellipse: {
      ellipse: '椭圆',
      arc: '椭圆弧'
    },
    tooltip: {
      line: '绘制单段直线。',
      polyline: '以一个对象绘制由直线或圆弧组成的连续线段。',
      spline: '通过拟合点或控制点绘制平滑样条曲线。',
      circle: '使用多种构造方式绘制圆。',
      arc: '使用多种构造方式绘制圆弧。',
      mline: '将多条平行线作为一个多线对象进行绘制。',
      ray: '从起点绘制沿单向无限延伸的构造射线。',
      xline: '绘制无限长的构造线。',
      ellipse: '绘制椭圆或椭圆弧。',
      rect: '绘制矩形或正多边形。',
      point: '在图纸中放置点对象。',
      hatch: '用填充图案填充闭合区域。',
      text: '在图纸中创建多行文字标注。',
      move: '将选中的对象移动到新位置。',
      rotate: '围绕基点旋转选中的对象。',
      copy: '将选中的对象复制到新位置。',
      erase: '从图纸中删除选中的对象。',
      properties: '打开当前所选对象的属性面板。',
      quickSelect: '打开快速选择对话框，按条件筛选并选择图元。',
      propertyColor: '设置新建对象或当前选中对象使用的颜色。',
      propertyLineType: '设置新建对象或当前选中对象使用的线型。',
      propertyLineWeight: '设置新建对象或当前选中对象使用的线宽。',
      layerAction: {
        off: '关闭当前选中的图层，使该图层上的对象隐藏，但不会冻结该图层。',
        isolate: '仅显示当前选中的图层，并隐藏其他图层，方便专注处理相关对象。',
        freeze: '冻结当前选中的图层，使其对象隐藏，并在重生成时跳过该图层。',
        lock: '锁定当前选中的图层，使其对象保持可见，但不能被编辑。',
        current:
          '将当前选中的图层设为当前图层，之后新建对象会默认放在该图层上。',
        allOn: '打开所有已关闭的图层；已冻结的图层会继续保持冻结状态。',
        unisolate:
          '恢复被图层隔离隐藏或锁定的图层，同时保留隔离之后的其他图层更改。',
        thaw: '解冻当前选中的图层，使其对象重新显示并重新参与重生成。',
        unlock: '解锁当前选中的图层，使其对象可以再次被选择和编辑。',
        restore: '恢复此 Ribbon 中最近一次图层操作之前的图层状态。'
      },
      circleOption: {
        centerRadius: '通过指定圆心和半径创建圆。',
        centerDiameter: '通过指定圆心和直径创建圆。',
        twoPoint: '通过两个点定义直径来创建圆。',
        threePoint: '创建经过三个点的圆。',
        tanTanRadius: '创建与两个对象相切并指定半径的圆。',
        tanTanTan: '创建与三个对象相切的圆。'
      },
      arcOption: {
        threePoint: '通过起点、中间点和终点创建圆弧。',
        startCenterEnd: '通过起点、圆心和终点创建圆弧。',
        startCenterAngle: '通过起点、圆心和夹角创建圆弧。',
        startCenterLength: '通过起点、圆心和弧长创建圆弧。',
        startEndAngle: '通过起点、终点和夹角创建圆弧。',
        startEndDirection: '通过起点、终点和起点切线方向创建圆弧。',
        startEndRadius: '通过起点、终点和指定半径创建圆弧。',
        centerStartEnd: '通过圆心、起点和终点创建圆弧。',
        centerStartAngle: '通过圆心、起点和夹角创建圆弧。',
        centerStartLength: '通过圆心、起点和弧长创建圆弧。'
      },
      rectOption: {
        rectangle: '通过指定对角点或尺寸创建矩形。',
        polygon: '通过指定边数和构造方式创建正多边形。'
      },
      ellipseOption: {
        ellipse: '通过指定主轴和次轴创建完整椭圆。',
        arc: '通过指定椭圆轴和弧段范围创建椭圆弧。'
      }
    },
    command: {
      line: '直线',
      polyline: '多段线',
      circle: '圆',
      arc: '圆弧',
      mline: '多线',
      ray: '射线',
      xline: '构造线',
      ellipse: '椭圆',
      spline: '样条曲线',
      rect: '矩形',
      rectangle: '矩形',
      polygon: '多边形',
      point: '点',
      divide: '定数等分',
      hatch: '填充',
      text: '文字',
      gradient: '渐变',
      move: '移动',
      rotate: '旋转',
      copy: '复制',
      erase: '删除',
      properties: '属性',
      quickSelect: '快速选择'
    }
  },
  verticalToolbar: {
    measure: {
      text: '测量',
      description: '测量工具'
    },
    measureDistance: {
      text: '距离',
      description: '测量两点之间的距离'
    },
    measureAngle: {
      text: '角度',
      description: '测量共享一个顶点的两条线之间的角度'
    },
    measureArea: {
      text: '面积',
      description: '测量多边形的面积'
    },
    measureArc: {
      text: '弧长',
      description: '测量由三点定义的弧长'
    },
    clearMeasurements: {
      text: '清除',
      description: '清除视图中的所有测量标注'
    },
    annotation: {
      text: '批注',
      description: '创建用于说明和标注图纸内容的文字或图形批注'
    },
    hideAnnotation: {
      text: '隐藏批注',
      description: '隐藏批注'
    },
    layer: {
      text: '图层',
      description: '管理图层'
    },
    pan: {
      text: '移动',
      description: '平移视图'
    },
    revCircle: {
      text: '圆',
      description: '使用圆高亮并标注图纸中的区域'
    },
    revLine: {
      text: '直线',
      description: '使用直线对图纸中的对象或区域进行标注和说明'
    },
    revFreehand: {
      text: '手绘线',
      description: '使用手绘线自由标注和强调图纸中的内容'
    },
    revRect: {
      text: '矩形',
      description: '使用矩形高亮并标注图纸中的对象或区域'
    },
    revCloud: {
      text: '云线',
      description: '在图纸中以云状线条标出修改或需要重点关注的区域'
    },
    select: {
      text: '选择',
      description: '选择图元'
    },
    showAnnotation: {
      text: '显示批注',
      description: '显示批注'
    },
    switchBg: {
      text: '切换背景色',
      description: '在白色与黑色之间切换绘图背景色'
    },
    zoomToExtent: {
      text: '范围缩放',
      description: '缩放以显示所有对象'
    },
    zoomToBox: {
      text: '矩形缩放',
      description: '缩放以显示矩形窗口内的对象'
    }
  },
  statusBar: {
    setting: {
      tooltip: '显示设置',
      commandLine: '命令行',
      coordinate: '坐标',
      entityInfo: '图元信息',
      fileName: '文件名',
      languageSelector: '语言菜单',
      mainMenu: '主菜单',
      toolbar: '工具栏',
      stats: '性能面板'
    },
    osnap: {
      tooltip: '对象捕捉',
      endpoint: '端点',
      midpoint: '中点',
      center: '圆心',
      node: '节点',
      quadrant: '象限点',
      insertion: '插入',
      nearest: '最近点'
    },
    pointStyle: {
      tooltip: '修改点样式'
    },
    fullScreen: {
      on: '切换到全屏模式',
      off: '退出全屏模式'
    },
    dynamicInput: {
      on: '打开动态输入',
      off: '关闭动态输入'
    },
    lineWidth: {
      on: '隐藏线宽',
      off: '显示线宽'
    },
    theme: {
      dark: '切换到暗黑主题',
      light: '切换到明亮主题'
    },
    warning: {
      font: '没有找到如下字体：'
    },
    notification: {
      tooltip: '显示通知'
    },
    export: {
      tooltip: '导出图片为 PNG'
    }
  },
  toolPalette: {
    entityProperties: {
      tab: '属性',
      title: '图元属性',
      propertyPanel: {
        noEntitySelected: '未选择任何图元！',
        multipleEntitySelected: '{count}个图元',
        propValCopied: '属性值已复制',
        failedToCopyPropVal: '复制属性值失败！'
      }
    },
    layerManager: {
      tab: '图层',
      title: '图层管理器',
      layerList: {
        name: '名称',
        on: '可见',
        color: '颜色',
        zoomToLayer: '已缩放到所点击的图层"{layer}"'
      }
    }
  },
  colorDropdown: {
    custom: '自定义'
  },
  lineTypeSelect: {
    placeholder: '线型'
  },
  colorIndexPicker: {
    color: '颜色：',
    colorIndex: '颜色索引：',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: '颜色',
    layer: '图层',
    lineType: '线型'
  },
  ribbonProperty: {
    color: '颜色',
    lineType: '线型',
    lineWeight: '线宽',
    layer: '图层'
  },
  layerSelect: {
    searchPlaceholder: '请输入图层名字进行搜索',
    noLayerAvailable: '无可用图层',
    noMatchedLayer: '未找到匹配图层',
    tooltip: {
      layer: '图层',
      visibility: '可见性',
      freeze: '冻结',
      lock: '锁定',
      lineType: '线型',
      color: '颜色',
      visible: '显示',
      hidden: '隐藏',
      frozen: '已冻结',
      thawed: '未冻结',
      locked: '已锁定',
      unlocked: '未锁定'
    }
  },
  message: {
    loadingFonts: '正在加载字体...',
    loadingDwgConverter: '正在加载DWG转换器...',
    fontsNotFound: '在字体库中找不到字体：{fonts}。',
    fontsNotLoaded: '无法加载字体：{fonts}。',
    failedToGetAvaiableFonts: '无法从"{url}"获取可用的字体信息！',
    failedToOpenFile: '无法打开文件"{fileName}"！',
    fetchingDrawingFile: '正在加载图纸文件...',
    unknownEntities:
      '这张图纸中包含了{count}个未知或不支持的实体，这些实体将无法显示！'
  },
  notification: {
    center: {
      title: '通知',
      clearAll: '清除全部',
      noNotifications: '暂无通知'
    },
    time: {
      justNow: '刚刚',
      minutesAgo: '{count} 分钟前',
      hoursAgo: '{count} 小时前',
      daysAgo: '{count} 天前'
    },
    title: {
      failedToOpenFile: '无法打开文件',
      fontNotFound: '找不到字体',
      fontNotLoaded: '无法加载字体',
      parsingWarning: '解析图纸问题'
    }
  }
}
