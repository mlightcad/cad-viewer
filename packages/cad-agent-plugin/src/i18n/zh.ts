/**
 * Chinese UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentZh = {
  tab: '智能助手',
  title: 'CAD 智能助手',
  settings: '设置',
  clear: '新对话',
  close: '关闭',
  model: '模型',
  emptyHint: '描述要绘制的内容，或附加参考图片（草图、截图、平面图等）。',
  toolPrefix: '工具',
  copyTool: '复制工具调用（输入与输出）',
  toolCopied: '已复制',
  copyMessage: '复制消息',
  messageCopied: '已复制',
  editMessage: '编辑消息',
  cancelEdit: '取消',
  resendMessage: '发送',
  relativeTimeJustNow: '刚刚',
  relativeTimeSeconds: '{n} 秒前',
  relativeTimeMinutes: '{n} 分钟前',
  relativeTimeHours: '{n} 小时前',
  relativeTimeDays: '{n} 天前',
  queuedSendNow: '立即发送',
  queuedEdit: '编辑',
  queuedDelete: '删除',
  inputPlaceholder: '描述你的需求…',
  attachImage: '添加图片',
  showContextUsage: '显示上下文用量',
  contextUsage: '上下文用量',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '{percent}% 已用',
  contextUsageTokens: '~{used} / {limit} 令牌',
  contextUsageSystemPrompt: '系统提示',
  contextUsageToolDefinitions: '工具定义',
  contextUsageImages: '图片',
  contextUsageConversation: '对话',
  removeAttachment: '移除',
  imageAlt: '附加图片',
  imageOnlyRequest: '请分析附图，并根据图片帮我绘制 CAD 图纸。',
  prepareImageFailed: '图片处理失败，请尝试更小的 PNG 或 JPEG。',
  errorTitle: '请求出错',
  dismissError: '关闭',
  send: '发送',
  stop: '停止',
  working: '处理中…',
  agentMode: 'Agent 模式',
  agentModeSimple: '简单模式',
  agentModeHighInference: '高推理模式',
  agentModeSimpleHint:
    '默认。速度快 — 优先用测量 API 自检，可选用截图；不做自动视觉验证。',
  agentModeHighInferenceHint:
    '复杂任务可选。生成后用截图 + 视觉模型自动验证（最多 5 轮）。需使用支持视觉的模型。',
  highInferenceRequiresVision: '高推理模式需要使用支持视觉的模型。',
  verificationTitle: '图纸验证',
  verifying: '正在将图纸截图与您的需求和参考图进行比对…',
  verificationPassed: '验证通过 — 图纸符合需求。',
  verificationFailed: '验证未通过 — 发现以下问题：',
  verificationSkipped: '已跳过验证',
  verificationError: '验证出错',
  verificationContinuing: '继续优化图纸…',
  verificationMaxAttempts: '已达到最大验证次数，仍未通过验证。',
  referenceImages: '参考图片',
  drawingScreenshot: '当前图纸截图',
  missingApiKey: '请先在设置中配置 API Key 后再发送消息。',
  toolsSummary: '已执行 {count} 个工具',
  toolsRunning: '正在执行工具（{count}）…',
  toolsFailed: '{count} 个失败',
  taskPrompts: '建议任务',
  taskPromptsTitle: '常用任务',
  taskCategoryExtract: '信息提取',
  taskCategoryStats: '统计',
  taskCategoryModify: '修改',
  taskCategoryCreate: '创建',
  taskCategoryReview: '审核',
  taskDrawingOverviewTitle: '图纸概览',
  taskDrawingOverviewPrompt:
    '总结当前打开的图纸：范围（extents）、可识别的单位制、图层列表，以及图纸内容的简要说明。请查询图纸，不要重画。',
  taskExtractTextTitle: '提取文字与标题栏',
  taskExtractTextPrompt:
    '提取当前图纸中所有可读文字，包括标题栏字段（如有）。可按图层或区域分组，并清晰列出各项内容。',
  taskListDimensionsTitle: '列出尺寸标注',
  taskListDimensionsPrompt:
    '查找当前图纸中的尺寸标注实体，列出测量值、关联文字和大致位置，并总结明显缺失或不一致的尺寸。',
  taskEntityStatsTitle: '图元数量统计',
  taskEntityStatsPrompt:
    '按类型和图层统计当前图纸中的图元数量。优先使用汇总查询（计数 / 按块统计），不要导出全部图元。用紧凑表格或条目呈现。',
  taskLayerReportTitle: '图层使用报告',
  taskLayerReportPrompt:
    '报告当前图纸的图层情况：名称、开关、冻结、颜色、线型，以及各图层大致图元数量。标出空图层、未使用或命名异常的图层。',
  taskOrganizeLayersTitle: '按图层整理',
  taskOrganizeLayersPrompt:
    '为当前图纸提出并应用合理的图层组织（例如墙、门、文字、尺寸、家具）。将放错图层的图元移到合适图层，必要时创建缺失图层，并说明改动。',
  taskCleanupDrawingTitle: '清理图纸',
  taskCleanupDrawingPrompt:
    '检查当前图纸中常见的清理问题（零长度几何、可检测的重复重叠图元、空文字、未使用图层），安全可修的请修复。总结已处理项和需人工确认的项。',
  taskDrawDimensionedRectTitle: '绘制带尺寸的矩形',
  taskDrawDimensionedRectPrompt:
    '绘制一个 1000 × 600（图纸单位）的闭合矩形，左下角在 (0, 0)。为宽度和高度添加水平和垂直尺寸标注。几何与尺寸使用清晰的图层。',
  taskCreateTitleBlockTitle: '创建标题栏',
  taskCreateTitleBlockPrompt:
    '在模型空间（或已有布局的图纸空间）创建一个简易 A3 风格标题栏：外框、图名、图号、比例、日期、绘制人等占位字段。几何放在专用图层。',
  taskFromReferenceTitle: '根据参考图绘制',
  taskFromReferencePrompt:
    '我将附加一张参考图（草图、截图或平面图）。请仔细分析，并按正确比例重建二维 CAD 几何，分好图层，可见尺寸一并标注。仅在关键尺寸无法判断时再询问我。',
  taskDraftingReviewTitle: '制图质量审核',
  taskDraftingReviewPrompt:
    '审核当前图纸的制图质量：文字高度是否不一致、尺寸是否可能与几何不符、注释是否重叠、本应分层却在 0 层的图元、视图是否不完整等。按严重程度列出问题；除非我要求，否则只修复明确且安全的问题。',
  taskLayerStandardsTitle: '图层命名规范检查',
  taskLayerStandardsPrompt:
    '按常见 CAD 约定检查图层名称、颜色与用法。提出更清晰的命名方案，并在总结拟议改动后可选地重命名/重设颜色。'
} as const
