export default {
  mainMenu: {
    new: '新建图纸',
    open: '打开图纸',
    export: '导出为SVG'
  },
  verticalToolbar: {
    select: {
      text: '选择',
      description: '选择图元'
    },
    pan: {
      text: '移动',
      description: '平移视图'
    },
    zoomToExtent: {
      text: '范围缩放',
      description: '缩放以显示所有对象'
    },
    zoomToBox: {
      text: '矩形缩放',
      description: '缩放以显示矩形窗口内的对象'
    },
    layer: {
      text: '图层',
      description: '管理图层'
    }
  },
  statusBar: {
    setting: {
      tooltip: '显示设置',
      commandLine: '命令行',
      coordinate: '坐标',
      entityInfo: '图元信息',
      languageSelector: '语言菜单',
      mainMenu: '主菜单',
      toolbar: '工具栏',
      stats: '性能面板'
    },
    pointStyle: {
      tooltip: '修改点样式'
    },
    fullScreen: {
      on: '切换到全屏模式',
      off: '退出全屏模式'
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
