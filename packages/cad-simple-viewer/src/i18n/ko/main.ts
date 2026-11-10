export default {
  document: {
    untitled: '제목 없음'
  },
  commandLine: {
    noLast: '(이전 명령 없음)',
    unknownCommand: '알 수 없는 명령',
    executed: '실행된 명령',
    showHistory: '명령 기록 표시',
    placeholder: '명령 입력',
    showMessages: '메시지 기록 표시',
    canceled: '*취소*',
    noHistory: '(기록 없음)',
    invalidInput: '잘못된 입력입니다.',
    close: '명령행 닫기'
  },
  mobileCommand: {
    length: '길이',
    angle: '각도',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '확인',
    cancel: '취소',
    help: '도움말',
    back: '뒤로',
    collapse: '접기',
    expand: '펼치기'
  },
  inputManager: {
    firstCorner: '첫 번째 구석 지정 또는',
    secondCorner: '두 번째 구석 지정 또는'
  },
  message: {
    onLockedLayer: '개 객체가 잠긴 도면층에 있습니다.',
    fetchingDrawingFile: '파일을 가져오는 중 ...',
    exportingDxf: 'DXF 내보내는 중 ...',
    exportingPdf: 'PDF 내보내는 중 ...',
    exportingSvg: 'SVG 내보내는 중 ...',
    calculatingSmartExtents: '스마트 범위 계산 중 ...',
    importingPdf: 'PDF 가져오는 중 ...',
    exportingEntityPreview: '이미지 내보내는 중 ...',
    collectingMemoryProfile: '메모리 분석 중 ...',
    fontCached: '글꼴을 캐시했습니다',
    fontCacheFailed: '글꼴을 캐시하지 못했습니다',
    fontsNotFound: '글꼴 저장소에서 글꼴을 찾을 수 없습니다: {fonts}.',
    fontsNotLoaded: '글꼴을 로드하지 못했습니다: {fonts}.',
    fontMissedInDrawing:
      '글꼴 "{font}"은(는) 문자 객체 {count}개에서 사용되지만 사용할 수 없습니다. "{replacementFont}"(으)로 표시합니다.',
    fontMissedReplacement: '"{font}"("{replacement}"(으)로 표시)',
    failedToGetAvaiableFonts:
      '"{url}"에서 사용 가능한 글꼴을 가져오지 못했습니다!',
    failedToOpenFile: '파일 "{fileName}"을(를) 열지 못했습니다!',
    failedToOpenFileToast:
      '"{fileName}"을(를) 열지 못했습니다. 자세한 내용은 알림 센터를 확인하십시오.',
    failedToOpenFileWorkerOom:
      '"{fileName}"을(를) 열지 못했습니다. 사용 가능한 메모리가 부족하여 구문 분석에 실패했습니다(LibreDWG 파서). {dwgParserLink}을(를) 클릭하여 상용 DWG 파서를 구매하면 이 문제 없이 대용량 도면을 열 수 있습니다.',
    failedToOpenFileWorkerOomLink: '이 페이지',
    failedToOpenFileWorkerTimeout:
      '"{fileName}"을(를) 열지 못했습니다. 도면을 구문 분석하는 중 시간이 초과되었습니다.',
    failedToOpenFileFontLoadFailed:
      '"{fileName}"을(를) 열지 못했습니다. 필요한 글꼴을 로드할 수 없습니다.',
    failedToOpenFileLicenseExpired:
      '"{fileName}"을(를) 열지 못했습니다. DWG 변환기 라이센스가 만료되었습니다.',
    failedToOpenFileLicenseInvalid:
      '"{fileName}"을(를) 열지 못했습니다. DWG 변환기 라이센스가 없거나 유효하지 않습니다.',
    unknownEntities:
      '이 도면에는 알 수 없거나 지원되지 않는 객체가 {count}개 있습니다! 해당 객체는 표시되지 않습니다.',
    tianzhengEntities:
      '이 도면에는 TArch / Tianzheng(또는 유사한 타사) 사용자 객체가 약 {count}개 있습니다. 이 환경에서는 완전히 구문 분석할 수 없으므로 일부 내용이 표시되지 않을 수 있습니다.',
    emptyProxyEntities:
      '이 도면에는 프록시 그래픽이 없는 사용자 객체가 {count}개 있습니다! 해당 객체는 표시되지 않습니다.'
  },
  notification: {
    center: {
      title: '알림',
      clearAll: '모두 지우기',
      noNotifications: '알림 없음'
    },
    group: {
      fontMissed: '누락된 글꼴',
      fontMissedSummary:
        '글꼴 관련 메시지 {count}개. 클릭하여 자세히 표시합니다.',
      unsupportedEntities: '지원되지 않는 객체',
      unsupportedEntitiesSummary:
        '구문 분석 관련 메시지 {count}개. 클릭하여 자세히 표시합니다.',
      genericSummary: '메시지 {count}개. 클릭하여 자세히 표시합니다.'
    },
    title: {
      failedToOpenFile: '파일 열기 실패',
      failedToOpenFileWorkerOom: '메모리 부족',
      failedToOpenFileWorkerTimeout: '열기 시간 초과',
      failedToOpenFileFontLoadFailed: '글꼴 로드 실패',
      failedToOpenFileLicenseExpired: '라이센스 만료',
      failedToOpenFileLicenseInvalid: '잘못된 라이센스',
      fontNotFound: '글꼴을 찾을 수 없음',
      fontNotLoaded: '글꼴이 로드되지 않음',
      parsingWarning: '도면 구문 분석 문제',
      systemMessage: '시스템 메시지',
      systemWarning: '시스템 경고',
      systemError: '시스템 오류',
      systemInfo: '시스템 정보'
    }
  },
  progress: {
    start: '파일 구문 분석 시작 ...',
    parse: '파일 구문 분석 중 ...',
    font: '이 도면에 필요한 글꼴 다운로드 중 ...',
    ltype: '선종류 구문 분석 중 ...',
    style: '문자 스타일 구문 분석 중 ...',
    dimstyle: '치수 스타일 구문 분석 중 ...',
    layer: '도면층 구문 분석 중 ...',
    vport: '뷰포트 구문 분석 중 ...',
    blockrecord: '블록 레코드 구문 분석 중 ...',
    header: '헤더 구문 분석 중 ...',
    block: '블록 구문 분석 중 ...',
    entity: '객체 구문 분석 중 ...',
    object: '명명된 사전 구문 분석 중 ...',
    rendering: '도면 렌더링 중 ...',
    end: '완료!'
  },
  about: {
    title: '정보',
    close: '닫기',
    product: 'CAD 뷰어',
    tagline: 'DWG 및 DXF 도면을 위한 고성능 웹 CAD 뷰어입니다.',
    website: '웹 사이트',
    docs: '문서',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. 모든 권리 보유.',
    ok: '확인'
  },
  drawStyle: {
    color: '색상',
    fontSize: '문자 높이'
  },
  shortCutToolbar: {
    more: '더 보기',
    undo: '명령 취소',
    redo: '명령 복구',
    erase: '삭제',
    collapse: '도구막대 접기',
    expand: '도구막대 펼치기'
  },
  textHeight: {
    title: '문자 높이',
    close: '닫기',
    ok: '확인',
    cancel: '취소',
    adaptive: '화면에 맞춤',
    custom: '사용자 문자 높이',
    customPlaceholder: '실제 높이',
    fromScreen: '화면 크기 기준',
    fromScreenHint:
      '현재 줌에서 화면에 표시될 문자 크기를 입력합니다. 이 값은 고정된 월드 공간 높이로 변환되며 이후 줌해도 변하지 않습니다.',
    screenPxPlaceholder: '글꼴 크기',
    screenUnit: 'px',
    convert: '변환'
  },
  entityPick: {
    cancel: '선택 취소'
  },
  colorPicker: {
    title: '색상 선택',
    close: '닫기',
    ok: '확인',
    cancel: '취소',
    index: '색상 색인: ',
    rgb: 'RGB: ',
    input: '색상',
    inputPlaceholder: '1-255 또는 #RRGGBB'
  },
  touchPointTutorial: {
    title: '점을 정확하게 선택하려면?',
    description:
      '화면을 약 0.5초 동안 길게 누르십시오. 손가락 위에 십자선이 나타나 이동을 따라가며 형상에 스냅되어 더 정확하게 선택할 수 있습니다.',
    snoozeToday: '오늘은 다시 알리지 않음',
    hideForever: '다시 알리지 않음',
    ok: '확인'
  },
  dataSource: {
    open: '열기',
    local: '로컬 파일',
    url: 'URL에서',
    openFrom: '{name}에서 열기',
    signInTo: '{name}에 로그인',
    signOutOf: '{name}에서 로그아웃',
    signOutOfAccount: '{name}에서 로그아웃({account})',
    urlDialogTitle: 'URL에서 열기',
    urlDialogHint: '.dwg 또는 .dxf 파일의 URL을 입력하십시오.',
    urlPlaceholder: 'https://example.com/drawing.dwg',
    cancel: '취소',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
    or: '또는',
    dropFile: '여기에 파일을 놓거나',
    browse: '찾아보기',
    dropOrBrowse: '여기에 DWG 또는 DXF 파일을 놓거나 찾아보기',
    newDrawing: '새 도면',
    source: '소스',
    unavailable: '이 소스는 아직 사용할 수 없습니다.',
    selectFile: '파일 선택',
    signInRequired: '파일을 선택하려면 먼저 로그인하십시오.',
    downloading: '파일 다운로드 중 ...'
  }
}
