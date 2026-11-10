/**
 * Korean UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentKo = {
  tab: '에이전트',
  title: 'CAD 에이전트',
  settings: '설정',
  clear: '새 채팅',
  close: '닫기',
  model: '모델',
  emptyHint:
    '그릴 내용을 설명하거나 참조 이미지(스케치, 스크린샷, 평면도)를 첨부하십시오.',
  toolPrefix: '도구',
  copyTool: '도구 호출 복사(입력 및 출력)',
  toolCopied: '복사됨',
  copyMessage: '메시지 복사',
  messageCopied: '복사됨',
  editMessage: '메시지 편집',
  cancelEdit: '취소',
  resendMessage: '보내기',
  relativeTimeJustNow: '방금',
  relativeTimeSeconds: '{n}초 전',
  relativeTimeMinutes: '{n}분 전',
  relativeTimeHours: '{n}시간 전',
  relativeTimeDays: '{n}일 전',
  queuedSendNow: '지금 보내기',
  queuedEdit: '편집',
  queuedDelete: '삭제',
  inputPlaceholder: '요청 내용을 설명하십시오…',
  attachImage: '이미지 첨부',
  showContextUsage: '컨텍스트 사용량 표시',
  contextUsage: '컨텍스트 사용량',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '{percent}% 사용',
  contextUsageTokens: '~{used} / {limit} 토큰',
  contextUsageSystemPrompt: '시스템 프롬프트',
  contextUsageToolDefinitions: '도구 정의',
  contextUsageImages: '이미지',
  contextUsageConversation: '대화',
  removeAttachment: '제거',
  imageAlt: '첨부된 이미지',
  imageOnlyRequest:
    '첨부된 참조 이미지를 분석하여 CAD에서 그릴 수 있도록 도와주십시오.',
  prepareImageFailed:
    '첨부된 이미지를 준비하지 못했습니다. 더 작은 PNG 또는 JPEG 파일을 사용해 보십시오.',
  errorTitle: '문제가 발생했습니다',
  dismissError: '닫기',
  send: '보내기',
  stop: '중지',
  working: '작업 중…',
  agentMode: '에이전트 모드',
  agentModeSimple: '단순',
  agentModeHighInference: '고급 추론',
  agentModeSimpleHint:
    '기본값. 빠름 — 측정 API를 이용한 자체 점검을 우선하며, 필요 시 스크린샷도 사용할 수 있습니다. 자동 비전 검증은 없습니다.',
  agentModeHighInferenceHint:
    '복잡한 작업에 선택적으로 사용합니다. 그린 후 스크린샷과 비전 모델로 검증합니다(최대 5회). 비전 모델이 필요합니다.',
  highInferenceRequiresVision:
    '고급 추론 모드에는 비전을 지원하는 모델이 필요합니다.',
  verificationTitle: '도면 검증',
  verifying: '도면 스크린샷을 요청 내용 및 참조 이미지와 비교하는 중…',
  verificationPassed: '검증 통과 — 도면이 요청과 일치합니다.',
  verificationFailed: '검증 실패 — 발견된 문제:',
  verificationSkipped: '검증 건너뜀',
  verificationError: '검증 오류',
  verificationContinuing: '도면을 계속 개선하는 중…',
  verificationMaxAttempts: '최대 시도 횟수 내에 검증을 통과하지 못했습니다.',
  referenceImages: '참조 이미지',
  drawingScreenshot: '현재 도면 스크린샷',
  missingApiKey: '메시지를 보내기 전에 설정에서 API 키를 구성하십시오.',
  toolsSummary: '도구 호출: {count}',
  toolsRunning: '도구 실행 중({count})…',
  toolsFailed: '{count}개 실패',
  taskPrompts: '추천 작업',
  taskPromptsTitle: '일반 작업',
  taskCategoryExtract: '추출',
  taskCategoryStats: '통계',
  taskCategoryModify: '수정',
  taskCategoryCreate: '작성',
  taskCategoryReview: '검토',
  taskDrawingOverviewTitle: '도면 개요',
  taskDrawingOverviewPrompt:
    '열려 있는 도면을 요약해 주십시오: 범위, 확인 가능한 경우 단위계, 도면층 목록, 그리고 도면에 포함된 것으로 보이는 내용에 대한 간단한 설명. 도면을 조회만 하고 다시 그리지 마십시오.',
  taskExtractTextTitle: '문자 및 표제란 추출',
  taskExtractTextPrompt:
    '열려 있는 도면에서 읽을 수 있는 모든 문자를 추출해 주십시오. 표제란 필드가 있으면 포함합니다. 필요하면 도면층 또는 영역별로 묶고 값을 명확하게 나열해 주십시오.',
  taskListDimensionsTitle: '치수 나열',
  taskListDimensionsPrompt:
    '열려 있는 도면에서 치수 객체를 찾아 측정값, 관련 문자, 대략적인 위치를 나열해 주십시오. 명백히 누락되었거나 일관성이 없는 치수가 있으면 요약해 주십시오.',
  taskEntityStatsTitle: '객체 수',
  taskEntityStatsPrompt:
    '열려 있는 도면의 객체 수를 유형별, 도면층별로 세어 주십시오. 모든 객체를 나열하기보다 요약 쿼리(개수 / 블록별 통계)를 우선 사용하십시오. 간결한 표나 글머리 기호 요약으로 제시해 주십시오.',
  taskLayerReportTitle: '도면층 사용 보고서',
  taskLayerReportPrompt:
    '열려 있는 도면의 도면층에 대해 보고해 주십시오: 이름, 켜기/끄기, 동결, 색상, 선종류, 도면층별 대략적인 객체 수. 비어 있거나, 사용되지 않거나, 이름이 이상한 도면층은 표시해 주십시오.',
  taskOrganizeLayersTitle: '도면층별 정리',
  taskOrganizeLayersPrompt:
    '열려 있는 도면에 적합한 도면층 구성(예: 벽, 문, 문자, 치수, 가구)을 제안하고 적용해 주십시오. 잘못 배치된 객체는 적절한 도면층으로 옮기고, 필요하면 없는 도면층을 작성하십시오. 변경한 내용을 설명해 주십시오.',
  taskCleanupDrawingTitle: '도면 정리',
  taskCleanupDrawingPrompt:
    '열려 있는 도면에서 일반적인 정리 문제(길이가 0인 형상, 감지 가능한 경우 중복되어 겹친 객체, 빈 문자, 사용되지 않는 도면층)를 검사하고 안전하게 고칠 수 있는 것은 수정해 주십시오. 수행한 작업과 수동 검토가 필요한 항목을 요약해 주십시오.',
  taskDrawDimensionedRectTitle: '치수가 있는 직사각형 그리기',
  taskDrawDimensionedRectPrompt:
    '왼쪽 아래 구석이 (0, 0)인 1000 × 600(도면 단위) 크기의 닫힌 직사각형을 그려 주십시오. 폭과 높이에 대한 수평 및 수직 치수를 추가하십시오. 형상과 치수에는 명확한 도면층을 사용하십시오.',
  taskCreateTitleBlockTitle: '표제란 작성',
  taskCreateTitleBlockPrompt:
    '모형 공간(이미 설정되어 있으면 도면 공간)에 간단한 A3 스타일 표제란을 작성해 주십시오: 외곽 테두리, 제목, 도면 번호, 축척, 날짜, 작성자 필드와 자리 표시자 문자. 형상은 전용 도면층에 두십시오.',
  taskFromReferenceTitle: '참조 이미지로 그리기',
  taskFromReferencePrompt:
    '참조 이미지(스케치, 스크린샷 또는 평면도)를 첨부하겠습니다. 이미지를 주의 깊게 분석한 다음, 의도된 2D CAD 형상을 올바른 비율과 도면층으로 재구성하고, 보이는 경우 치수도 추가해 주십시오. 중요한 크기가 모호한 경우에만 질문해 주십시오.',
  taskDraftingReviewTitle: '제도 품질 검토',
  taskDraftingReviewPrompt:
    '열려 있는 도면의 제도 품질 문제를 검토해 주십시오: 일관성 없는 문자 높이, 형상과 맞지 않을 수 있는 치수, 겹치는 주석, 다른 도면층에 있어야 할 0 도면층의 객체, 불완전한 뷰. 발견 사항을 심각도별로 나열하고, 별도로 요청하지 않는 한 명확하고 안전한 문제만 수정해 주십시오.',
  taskLayerStandardsTitle: '도면층 이름 점검',
  taskLayerStandardsPrompt:
    '도면층 이름, 색상, 사용 방식을 일반적인 CAD 규칙과 비교하여 검토해 주십시오. 더 명확한 명명 체계를 제안하고, 제안한 변경 사항을 요약한 후 필요하면 도면층 이름이나 색상을 변경해 주십시오.'
} as const
