/**
 * Built-in CAD Agent task templates shown in the toolbar prompt picker.
 *
 * Titles and prompts are looked up via {@link AgentChatLabelKey} i18n keys.
 */

/** Groups tasks in the picker UI. */
export type AgentTaskCategory =
  | 'extract'
  | 'stats'
  | 'modify'
  | 'create'
  | 'review'

/** Stable id for one suggested task. */
export type AgentTaskId =
  | 'drawingOverview'
  | 'extractText'
  | 'listDimensions'
  | 'entityStats'
  | 'layerReport'
  | 'organizeLayers'
  | 'cleanupDrawing'
  | 'drawDimensionedRect'
  | 'createTitleBlock'
  | 'fromReference'
  | 'draftingReview'
  | 'layerStandards'

/** One suggested task: category + i18n keys for title and prompt body. */
export interface AgentTaskDef {
  id: AgentTaskId
  category: AgentTaskCategory
  titleKey: `task${Capitalize<AgentTaskId>}Title`
  promptKey: `task${Capitalize<AgentTaskId>}Prompt`
}

/** Display order of category sections in the picker. */
export const AGENT_TASK_CATEGORY_ORDER: readonly AgentTaskCategory[] = [
  'extract',
  'stats',
  'modify',
  'create',
  'review'
] as const

/** i18n key for each category section heading. */
export const AGENT_TASK_CATEGORY_LABEL_KEYS = {
  extract: 'taskCategoryExtract',
  stats: 'taskCategoryStats',
  modify: 'taskCategoryModify',
  create: 'taskCategoryCreate',
  review: 'taskCategoryReview'
} as const satisfies Record<AgentTaskCategory, string>

/**
 * Suggested CAD tasks. Keep prompts concrete enough that the agent can act
 * with tools, but open enough that users can edit before sending.
 */
export const AGENT_TASKS: readonly AgentTaskDef[] = [
  {
    id: 'drawingOverview',
    category: 'extract',
    titleKey: 'taskDrawingOverviewTitle',
    promptKey: 'taskDrawingOverviewPrompt'
  },
  {
    id: 'extractText',
    category: 'extract',
    titleKey: 'taskExtractTextTitle',
    promptKey: 'taskExtractTextPrompt'
  },
  {
    id: 'listDimensions',
    category: 'extract',
    titleKey: 'taskListDimensionsTitle',
    promptKey: 'taskListDimensionsPrompt'
  },
  {
    id: 'entityStats',
    category: 'stats',
    titleKey: 'taskEntityStatsTitle',
    promptKey: 'taskEntityStatsPrompt'
  },
  {
    id: 'layerReport',
    category: 'stats',
    titleKey: 'taskLayerReportTitle',
    promptKey: 'taskLayerReportPrompt'
  },
  {
    id: 'organizeLayers',
    category: 'modify',
    titleKey: 'taskOrganizeLayersTitle',
    promptKey: 'taskOrganizeLayersPrompt'
  },
  {
    id: 'cleanupDrawing',
    category: 'modify',
    titleKey: 'taskCleanupDrawingTitle',
    promptKey: 'taskCleanupDrawingPrompt'
  },
  {
    id: 'drawDimensionedRect',
    category: 'create',
    titleKey: 'taskDrawDimensionedRectTitle',
    promptKey: 'taskDrawDimensionedRectPrompt'
  },
  {
    id: 'createTitleBlock',
    category: 'create',
    titleKey: 'taskCreateTitleBlockTitle',
    promptKey: 'taskCreateTitleBlockPrompt'
  },
  {
    id: 'fromReference',
    category: 'create',
    titleKey: 'taskFromReferenceTitle',
    promptKey: 'taskFromReferencePrompt'
  },
  {
    id: 'draftingReview',
    category: 'review',
    titleKey: 'taskDraftingReviewTitle',
    promptKey: 'taskDraftingReviewPrompt'
  },
  {
    id: 'layerStandards',
    category: 'review',
    titleKey: 'taskLayerStandardsTitle',
    promptKey: 'taskLayerStandardsPrompt'
  }
] as const
