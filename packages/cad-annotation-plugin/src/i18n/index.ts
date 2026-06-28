import { AcApI18n } from '@mlightcad/cad-simple-viewer'

const MESSAGE_PREFIX = 'annotation'

/** Scoped i18n helper for annotation plugin strings. */
export class AcExAnnotationI18n {
  t(key: string, params?: Record<string, string>): string {
    const fullKey = `${MESSAGE_PREFIX}.${key}`
    const template = AcApI18n.t(fullKey, { fallback: key })
    if (!params) return template
    return Object.keys(params).reduce(
      (acc, param) => acc.replace(`{${param}}`, params[param]),
      template
    )
  }
}

export function registerAnnotationI18n() {
  AcApI18n.mergeLocaleMessage('en', {
    annotation: {
      toolbar: {
        text: 'Text',
        leader: 'Leader',
        arrow: 'Arrow',
        line: 'Line',
        rect: 'Rectangle',
        ellipse: 'Ellipse',
        cloud: 'Cloud',
        sketch: 'Freehand',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        show: 'Show annotations',
        hide: 'Hide annotations',
        panel: 'Panel',
        bookmark: 'Bookmark',
        export: 'Export',
        import: 'Import',
        properties: 'Properties'
      },
      panel: {
        title: 'Annotations',
        bookmarks: 'Bookmarks',
        list: 'List',
        filterType: 'Type',
        filterKeyword: 'Keyword',
        filterAuthor: 'Author',
        filterFrom: 'From',
        filterTo: 'To',
        delete: 'Delete',
        edit: 'Edit',
        goto: 'Go to',
        addBookmark: 'Add bookmark',
        textColor: 'Text color',
        fillColor: 'Fill',
        lineColor: 'Line color',
        lineWeight: 'Line weight',
        empty: 'No annotations'
      },
      dialog: {
        ok: 'OK',
        cancel: 'Cancel'
      },
      jig: {
        line: { firstPoint: 'Specify first point:', nextPoint: 'Specify next point:' },
        rect: { firstPoint: 'Specify first corner:', nextPoint: 'Specify opposite corner:' },
        cloud: { firstPoint: 'Specify first corner:', nextPoint: 'Specify opposite corner:' },
        sketch: { firstPoint: 'Specify start point:', nextPoint: 'Specify next point:' },
        ellipse: { center: 'Specify center:', radius: 'Specify axis endpoint:' },
        arrow: { firstPoint: 'Specify arrow start:', nextPoint: 'Specify arrow end:' },
        leader: {
          anchor: 'Specify anchor point:',
          textPoint: 'Specify text location:',
          text: 'Annotation text:'
        },
        text: { point: 'Specify text location:', content: 'Text content:' },
        media: { point: 'Specify placement point:' }
      },
      bookmark: { namePrompt: 'Bookmark name:' },
      audio: { desktopDisabled: 'Audio annotations are only available on mobile.' },
      import: { failed: 'Import failed' }
    },
    command: {
      ACAD: {
        anntext: { description: 'Create text annotation' },
        anleader: { description: 'Create leader annotation' },
        anarrow: { description: 'Create arrow annotation' },
        anline: { description: 'Create line annotation' },
        anrect: { description: 'Create rectangle annotation' },
        anellipse: { description: 'Create ellipse annotation' },
        ancloud: { description: 'Create cloud annotation' },
        ansketch: { description: 'Create freehand annotation' },
        animage: { description: 'Create image annotation' },
        anvideo: { description: 'Create video annotation' },
        anaudio: { description: 'Create audio annotation' },
        annvis: { description: 'Toggle annotation visibility' },
        annexport: { description: 'Export annotations to JSON' },
        annimport: { description: 'Import annotations from JSON' },
        annpanel: { description: 'Toggle annotation panel' },
        annbookmark: { description: 'Add view bookmark' }
      }
    }
  })

  AcApI18n.mergeLocaleMessage('zh', {
    annotation: {
      toolbar: {
        text: '文字',
        leader: '引线',
        arrow: '箭头',
        line: '直线',
        rect: '矩形',
        ellipse: '椭圆',
        cloud: '云线',
        sketch: '手绘',
        image: '图片',
        video: '视频',
        audio: '音频',
        show: '显示批注',
        hide: '隐藏批注',
        panel: '面板',
        bookmark: '书签',
        export: '导出',
        import: '导入',
        properties: '属性'
      },
      panel: {
        title: '批注',
        bookmarks: '书签',
        list: '列表',
        filterType: '类型',
        filterKeyword: '关键词',
        filterAuthor: '创建人',
        filterFrom: '开始日期',
        filterTo: '结束日期',
        delete: '删除',
        edit: '编辑',
        goto: '跳转',
        addBookmark: '新建书签',
        textColor: '文字颜色',
        fillColor: '填充色',
        lineColor: '线色',
        lineWeight: '线宽',
        empty: '暂无批注'
      },
      dialog: { ok: '确定', cancel: '取消' },
      jig: {
        line: { firstPoint: '指定第一点：', nextPoint: '指定下一点：' },
        rect: { firstPoint: '指定第一角点：', nextPoint: '指定另一角点：' },
        cloud: { firstPoint: '指定第一角点：', nextPoint: '指定另一角点：' },
        sketch: { firstPoint: '指定起点：', nextPoint: '指定下一点：' },
        ellipse: { center: '指定中心：', radius: '指定轴端点：' },
        arrow: { firstPoint: '指定箭头起点：', nextPoint: '指定箭头终点：' },
        leader: {
          anchor: '指定锚点：',
          textPoint: '指定文字位置：',
          text: '批注文字：'
        },
        text: { point: '指定文字位置：', content: '文字内容：' },
        media: { point: '指定放置点：' }
      },
      bookmark: { namePrompt: '书签名称：' },
      audio: { desktopDisabled: '音频批注仅在移动端可用。' },
      import: { failed: '导入失败' }
    },
    command: {
      ACAD: {
        anntext: { description: '创建文字批注' },
        anleader: { description: '创建引线批注' },
        anarrow: { description: '创建箭头批注' },
        anline: { description: '创建直线批注' },
        anrect: { description: '创建矩形批注' },
        anellipse: { description: '创建椭圆批注' },
        ancloud: { description: '创建云线批注' },
        ansketch: { description: '创建手绘批注' },
        animage: { description: '创建图片批注' },
        anvideo: { description: '创建视频批注' },
        anaudio: { description: '创建音频批注' },
        annvis: { description: '切换批注显示' },
        annexport: { description: '导出批注 JSON' },
        annimport: { description: '导入批注 JSON' },
        annpanel: { description: '切换批注面板' },
        annbookmark: { description: '添加视图书签' }
      }
    }
  })
}