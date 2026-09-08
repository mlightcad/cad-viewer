export default {
  document: {
    untitled: '未命名'
  },
  commandLine: {
    noLast: '(无上一次命令)',
    unknownCommand: '未知命令',
    executed: '已执行命令',
    showHistory: '显示命令历史',
    placeholder: '输入命令',
    showMessages: '显示消息历史',
    canceled: '*已取消*',
    noHistory: '(无历史记录)',
    invalidInput: '输入无效。',
    close: '关闭命令行'
  },
  mobileCommand: {
    length: '长度',
    angle: '角度',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '确定',
    cancel: '取消',
    help: '帮助',
    back: '返回',
    collapse: '收起',
    expand: '展开'
  },
  inputManager: {
    firstCorner: '指定第一个角点或',
    secondCorner: '指定第二个角点或'
  },
  message: {
    fetchingDrawingFile: '正在加载图纸文件...',
    exportingDxf: '正在导出 DXF ...',
    exportingEntityPreview: '正在导出图片 ...',
    collectingMemoryProfile: '正在分析内存 ...',
    fontCached: '字体已成功缓存',
    fontCacheFailed: '缓存字体失败',
    fontsNotFound: '在字体库中找不到字体：{fonts}。',
    fontsNotLoaded: '无法加载字体：{fonts}。',
    fontMissedInDrawing:
      '字体 "{font}" 被 {count} 个文字对象使用，但不可用，已使用 "{replacementFont}" 显示。',
    fontMissedReplacement: '"{font}"（已用 "{replacement}" 显示）',
    failedToGetAvaiableFonts: '无法从"{url}"获取可用的字体信息！',
    failedToOpenFile: '无法打开文件"{fileName}"！',
    failedToOpenFileWorkerOom:
      '无法打开"{fileName}"。图纸过大，超出当前可用内存。',
    failedToOpenFileWorkerTimeout: '无法打开"{fileName}"。解析图纸时操作超时。',
    failedToOpenFileFontLoadFailed:
      '无法打开"{fileName}"。无法加载图纸所需的字体。',
    failedToOpenFileLicenseExpired:
      '无法打开"{fileName}"。DWG 转换器许可证已过期。',
    failedToOpenFileLicenseInvalid:
      '无法打开"{fileName}"。DWG 转换器许可证缺失或无效。',
    unknownEntities:
      '这张图纸中包含了{count}个未知或不支持的实体，这些实体将无法显示！',
    tianzhengEntities:
      '检测到天正（或同类第三方）自定义图元（约 {count} 个）。当前环境无法完整解析这些图元，部分内容可能无法显示。',
    emptyProxyEntities:
      '这张图纸中包含了{count}个缺少代理图形的自定义实体，这些实体将无法显示！'
  },
  notification: {
    center: {
      title: '通知',
      clearAll: '清除全部',
      noNotifications: '暂无通知'
    },
    group: {
      fontMissed: '字体缺失',
      fontMissedSummary: '共 {count} 条字体相关消息，点击展开查看详情',
      unsupportedEntities: '不支持的图元',
      unsupportedEntitiesSummary: '共 {count} 条解析相关消息，点击展开查看详情',
      genericSummary: '共 {count} 条消息，点击展开查看详情'
    },
    title: {
      failedToOpenFile: '无法打开文件',
      failedToOpenFileWorkerOom: '图纸过大',
      failedToOpenFileWorkerTimeout: '打开超时',
      failedToOpenFileFontLoadFailed: '字体加载失败',
      failedToOpenFileLicenseExpired: '许可证已过期',
      failedToOpenFileLicenseInvalid: '许可证无效',
      fontNotFound: '找不到字体',
      fontNotLoaded: '无法加载字体',
      parsingWarning: '解析图纸问题',
      systemMessage: '系统消息',
      systemWarning: '系统警告',
      systemError: '系统错误',
      systemInfo: '系统信息'
    }
  },
  progress: {
    start: '开始解析文件...',
    parse: '正在解析文件 ...',
    font: '正在下载图纸所需字体...',
    ltype: '正在解析线形...',
    style: '正在解析文字样式...',
    dimstyle: '正在解析标注样式...',
    layer: '正在解析图层...',
    vport: '正在解析视口...',
    blockrecord: '正在解析BTRs...',
    header: '正在解析文件头...',
    block: '正在解析块..',
    entity: '正在解析图元...',
    object: '正在解析NODs...',
    rendering: '正在渲染图纸 ...',
    end: '完成！'
  },
  about: {
    title: '关于',
    close: '关闭',
    product: 'CAD 查看器',
    tagline: '面向 DWG/DXF 图纸的高性能 Web CAD 查看器。',
    website: '官网',
    docs: '文档',
    repository: 'GitHub',
    copyright: '© {year} mlightcad。保留所有权利。',
    ok: '确定'
  },
  drawStyle: {
    color: '颜色',
    fontSize: '字高'
  },
  shortCutToolbar: {
    more: '更多',
    undo: '撤销',
    redo: '重做',
    erase: '删除'
  },
  textHeight: {
    title: '字高设置',
    close: '关闭',
    ok: '确定',
    cancel: '取消',
    adaptive: '自适应屏幕',
    custom: '自定义字高',
    customPlaceholder: '世界坐标字高',
    fromScreen: '按屏幕字号换算',
    fromScreenHint:
      '按当前视图缩放，输入希望看到的屏幕字号（像素），换算为固定的世界坐标字高；之后缩放时字的世界高度不变。',
    screenPxPlaceholder: '屏幕字号',
    screenUnit: 'px',
    convert: '换算'
  },
  entityPick: {
    cancel: '取消选择'
  },
  colorPicker: {
    title: '选择颜色',
    close: '关闭',
    ok: '确定',
    cancel: '取消',
    index: '颜色索引：',
    rgb: 'RGB：',
    input: '颜色',
    inputPlaceholder: '1-255 或 #RRGGBB'
  },
  touchPointTutorial: {
    title: '怎样可以精确取点？',
    description:
      '手指在屏幕上长按1s左右，上方出现十字，手指移动时十字跟随移动并自动捕捉。取点更精准。',
    snoozeToday: '今日不再提醒',
    hideForever: '不再提醒',
    ok: '我知道了'
  }
}
