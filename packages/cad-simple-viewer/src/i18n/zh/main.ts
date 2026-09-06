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
    failedToOpenFile: '无法打开文件"{fileName}"！',
    failedToOpenFileWorkerOom:
      '无法打开"{fileName}"。图纸过大，超出当前可用内存。',
    failedToOpenFileWorkerTimeout: '无法打开"{fileName}"。解析图纸时操作超时。',
    failedToOpenFileFontLoadFailed:
      '无法打开"{fileName}"。无法加载图纸所需的字体。',
    failedToOpenFileLicenseExpired:
      '无法打开"{fileName}"。DWG 转换器许可证已过期。',
    failedToOpenFileLicenseInvalid:
      '无法打开"{fileName}"。DWG 转换器许可证缺失或无效。'
  },
  notification: {
    title: {
      failedToOpenFile: '无法打开文件',
      failedToOpenFileWorkerOom: '图纸过大',
      failedToOpenFileWorkerTimeout: '打开超时',
      failedToOpenFileFontLoadFailed: '字体加载失败',
      failedToOpenFileLicenseExpired: '许可证已过期',
      failedToOpenFileLicenseInvalid: '许可证无效'
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
    fontSize: '字号'
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
