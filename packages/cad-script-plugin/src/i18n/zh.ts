/**
 * Chinese UI strings for the CAD script console.
 */
export const scriptZh = {
  scriptTab: '脚本',
  scriptTitle: 'CAD 脚本',
  scriptRun: '运行',
  scriptRunning: '运行中…',
  scriptApi: 'API',
  scriptPlaceholder: '编写函数体。唯一参数是 cad。',
  scriptHint: 'Ctrl+Enter 运行。唯一参数是 cad。',
  scriptSuccess: '成功',
  scriptFailed: '失败',
  scriptReturnValue: '返回值',
  scriptNoReturn: '脚本没有返回值。',
  scriptLog: '日志',
  scriptHighlighted: '高亮',
  scriptCreated: '新建',
  scriptEmptyResult: '运行后在这里显示返回值、日志和错误。',
  scriptNoDocument: '请先打开或新建图纸。',
  scriptReadOnly: '图纸以只读方式打开。',
  scriptNoView: '图纸视图不可用。',
  scriptTimeout: '脚本超出时间或步数限制，已停止。',
  scriptNotJson: '返回值无法序列化为 JSON。',
  scriptEmptyCode: '脚本是空的。',
  scriptTooLarge: '脚本过长。',
  scriptDynamicAccess: '不能用计算属性访问 cad。',
  scriptForbiddenSyntax: '不允许的语法',
  scriptForbiddenIdentifier: '不允许的标识符',
  scriptForbiddenMember: '不允许的成员',
  scriptUnknownApi: '未知的 cad API'
} as const
