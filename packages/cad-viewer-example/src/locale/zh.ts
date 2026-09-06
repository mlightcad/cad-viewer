export default {
  command: {
    ACAD: {
      quit: {
        description: '退出应用程序并关闭所有打开的图纸'
      },
      exit: {
        description: '退出应用程序并关闭所有打开的图纸'
      }
    }
  },

  example: {
    fileUpload: {
      title: '选择要查看的 CAD 文件',
      subtitle: '将 DWG 或 DXF 图纸导入查看器',
      newDrawing: '新建图纸',
      or: '或',
      dropFile: '拖放文件或',
      browse: '浏览',

      openOptions: '打开选项',

      initialView: '初始视图',
      auto: '自动',
      autoHint: '根据访问模式决定',
      extents: '范围',
      extentsHint: '缩放到整图',
      saved: '保存的视图',
      savedHint: 'AutoCAD 保存的视图',

      accessMode: '访问模式',
      read: '只读',
      readHint: '仅查看',
      review: '审阅',
      reviewHint: '查看和审阅',
      write: '可写',
      writeHint: '完整权限',

      textRendering: '文字渲染',
      worker: 'Worker',
      workerHint: '更快，占用更多内存',
      mainThread: '主线程',
      mainThreadHint: '更慢，占用更少内存',

      progressive: '渐进显示',
      progressiveRendering: '渐进渲染',
      on: '开',
      progressiveOnHint: '加载过程中显示图形',
      off: '关',
      progressiveOffHint: '转换完成后再显示',

      nonPlottable: '不打印图层',
      nonPlottableLayers: '不打印图层',
      hide: '隐藏',
      hideHint: 'Web 查看器默认',
      show: '显示',
      showHint: 'AutoCAD 编辑器语义',

      curveQuality: '曲线精度',
      curveDraft: '省内存',
      curveDraftHint: '顶点更少，文件更小',
      curveStandard: '标准',
      curveStandardHint: '均衡（整圆约 100 边）',
      curveHigh: '高精度',
      curveHighHint: '曲线更光滑，占用更多内存',

      paperSpaceBackground: '图纸空间背景',
      paperSpaceWhite: '白色',
      paperSpaceWhiteHint: '桌面 CAD / 打印预览',
      paperSpaceBlack: '黑色',
      paperSpaceBlackHint: 'Web 查看器常用',

      invalidFileType: '文件类型无效，请上传 DWG 或 DXF 文件。'
    }
  }
}
