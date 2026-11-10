/**
 * Korean UI strings for the CAD script console.
 *
 * Flat keys under `main.toolPalette.script`.
 */
export const scriptKo = {
  scriptTab: '스크립트',
  scriptTitle: 'CAD 스크립트',
  scriptRun: '실행',
  scriptRunning: '실행 중…',
  scriptHelp: '스크립트 도움말',
  scriptResize: '결과 패널 크기 조정',
  scriptPlaceholder: '함수 본문을 작성하십시오. 유일한 인수는 cad입니다.',
  scriptHint:
    'Ctrl+Enter로 실행합니다. "." 또는 Ctrl+Space로 cad를 자동 완성합니다.',
  scriptSuccess: '성공',
  scriptFailed: '실패',
  scriptReturnValue: '반환 값',
  scriptNoReturn: '스크립트가 값을 반환하지 않았습니다.',
  scriptLog: '로그',
  scriptImages: '미리보기',
  scriptImageAlt: '스크립트 미리보기',
  scriptImageDownload: '다운로드',
  scriptImageCopy: '복사',
  scriptImageCopied: '복사됨',
  scriptImageCopyFailed: '복사 실패',
  scriptHighlighted: '강조 표시됨',
  scriptCreated: '작성됨',
  scriptEmptyResult:
    '스크립트를 실행하면 반환 값, 로그, 미리보기 및 오류가 표시됩니다.',
  scriptNoDocument: '먼저 도면을 열거나 작성하십시오.',
  scriptReadOnly: '도면이 읽기 전용 모드로 열려 있습니다.',
  scriptNoView: '도면 뷰를 사용할 수 없습니다.',
  scriptTimeout: '스크립트가 시간 또는 단계 제한을 초과하여 중지되었습니다.',
  scriptNotJson: '반환 값이 JSON이 아닙니다.',
  scriptEmptyCode: '스크립트가 비어 있습니다.',
  scriptTooLarge: '스크립트가 너무 깁니다.',
  scriptDynamicAccess: 'cad에 대한 계산된 접근은 허용되지 않습니다.',
  scriptForbiddenSyntax: '금지된 구문',
  scriptForbiddenIdentifier: '금지된 식별자',
  scriptForbiddenMember: '금지된 멤버',
  scriptUnknownApi: '알 수 없는 cad API',
  scriptExamples: '예제',
  scriptExamplesSearch: '예제 검색',
  scriptExamplesEmpty: '검색과 일치하는 예제가 없습니다.',
  scriptExamplesUse: '이 스크립트 사용',
  scriptExamplesClose: '예제 닫기'
} as const
