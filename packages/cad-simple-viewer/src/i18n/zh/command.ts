export default {
  ACAD: {
    '-hatch': {
      description: '通过命令行选项创建填充，不显示 Ribbon 界面'
    },
    '-layer': {
      description: '通过命令行选项管理图层'
    },
    arc: {
      description: '创建圆弧'
    },
    cdxf: {
      description: '导出当前图纸为DXF格式'
    },
    cecolor: {
      description: '设置新创建对象的当前默认颜色'
    },
    celtscale: {
      description: '控制新创建对象的线型比例系数'
    },
    celweight: {
      description: '设置新创建对象的默认线宽'
    },
    circle: {
      description: '使用圆心和半径创建圆'
    },
    clayer: {
      description: '设置新建对象和编辑操作所使用的当前图层'
    },
    cmleaderstyle: {
      description: '设置当前多重引线样式名称'
    },
    cmlscale: {
      description: '控制多线的整体宽度'
    },
    cmlstyle: {
      description: '设置当前多线样式名称'
    },
    colortheme: {
      description: '控制用户界面的颜色主题（深色或浅色）'
    },
    copy: {
      description: '通过克隆将所选图元复制到新位置',
      prompt: '选择对象'
    },
    csvg: {
      description: '转换当前图纸为SVG格式'
    },
    dimlinear: {
      description: '创建线性尺寸标注'
    },
    measurearea: {
      description: '计算所选对象或点定义区域的面积和周长'
    },
    measureangle: {
      description: '测量两条线或三个点之间的夹角'
    },
    measurearc: {
      description: '测量圆弧段的弧长'
    },
    measuredistance: {
      description: '测量两点之间的距离及坐标增量'
    },
    measurementcolor: {
      description: '设置测量标注覆盖图形使用的颜色'
    },
    ellipse: {
      description: '通过轴端点或中心点创建椭圆或椭圆弧'
    },
    erase: {
      description: '从图纸中删除所选对象',
      prompt: '选择对象'
    },
    hatch: {
      description: '用填充图案填充封闭区域或所选对象'
    },
    hpang: {
      description: '设置新创建填充图案的默认角度（弧度）'
    },
    hpassoc: {
      description: '控制新创建的填充是否具有关联性'
    },
    hpbackgroundcolor: {
      description: '设置新创建填充图案的默认背景颜色'
    },
    hpcolor: {
      description: '设置新创建填充的默认颜色'
    },
    hpdouble: {
      description: '控制用户定义的填充图案是否加倍'
    },
    hpislanddetection: {
      description: '控制新创建填充边界内孤岛的处理方式'
    },
    hplayer: {
      description: '设置新创建填充和填充区域的默认图层'
    },
    hpname: {
      description: '设置当前会话中新创建填充的默认图案名称'
    },
    hpscale: {
      description: '设置新创建填充图案的默认比例系数'
    },
    hpseparate: {
      description: '控制为多个边界创建单个还是独立的填充对象'
    },
    hptransparency: {
      description: '设置新创建填充和填充区域的默认透明度'
    },
    laycur: {
      description: '将所选对象的图层属性更改为当前图层',
      prompt: '选择要更改到当前图层的对象'
    },
    laydel: {
      description: '删除图层及该图层上的所有对象'
    },
    layerclose: {
      description: '关闭图层属性管理器'
    },
    layerp: {
      description: '撤销对图层设置的最后一次更改或一组更改'
    },
    layfrz: {
      description: '冻结所选对象所在的图层',
      prompt: '选择要冻结其图层的对象'
    },
    layiso: {
      description: '隔离所选对象所在的图层',
      prompt: '选择要隔离其图层的对象'
    },
    laylck: {
      description: '锁定所选对象所在的图层',
      prompt: '选择要锁定其图层的对象'
    },
    layoff: {
      description: '关闭所选对象所在的图层',
      prompt: '选择要关闭其图层的对象'
    },
    layon: {
      description: '打开图纸中的所有图层'
    },
    laythw: {
      description: '解冻图纸中的所有冻结图层'
    },
    layulk: {
      description: '解锁所选对象所在的图层',
      prompt: '选择要解锁其图层的对象'
    },
    layuniso: {
      description: '恢复由 LAYISO 隐藏或锁定的图层'
    },
    line: {
      description: '在指定点之间绘制直线段'
    },
    log: {
      description: '在控制台输出调试信息'
    },
    lwdisplay: {
      description: '用于控制是否在图纸中显示线宽效果'
    },
    mline: {
      description: '创建由多条平行线组成的多线对象'
    },
    move: {
      description: '通过位移向量移动所选图元',
      prompt: '选择对象'
    },
    mtext: {
      description: '创建多行文本'
    },
    open: {
      description: '打开图纸'
    },
    pan: {
      description: '平移视图'
    },
    pickbox: {
      description: '控制用于选择对象的拾取框大小（像素）'
    },
    pline: {
      description: '通过指定多个点创建多段线'
    },
    pngout: {
      description: '导出为 PNG 图片'
    },
    point: {
      description: '连续创建点'
    },
    polygon: {
      description: '通过中心和半径或指定一条边创建正多边形'
    },
    qnew: {
      description: '创建新图纸'
    },
    ray: {
      description: '创建从起点向单一方向无限延伸的射线'
    },
    rectang: {
      description: '通过指定两个对角点创建矩形'
    },
    regen: {
      description: '重绘图纸'
    },
    revcloud: {
      description: '创建矩形修订云线'
    },
    rotate: {
      description: '绕基点旋转所选图元',
      prompt: '选择对象'
    },
    select: {
      description: '选择图元'
    },
    sketch: {
      description: '使用多段线创建手绘线，跟踪鼠标移动'
    },
    spline: {
      description: '通过指定控制点创建平滑的样条曲线'
    },
    whitebkcolor: {
      description: '切换绘图区域背景颜色，在白色和黑色背景之间切换'
    },
    xline: {
      description: '创建在两个方向上无限延伸的构造线'
    },
    zoom: {
      description: '缩放以显示所有对象'
    }
  },
  USER: {}
}
