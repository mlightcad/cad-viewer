export default {
  command: {
    ACAD: {
      quit: {
        description: '응용 프로그램을 종료하고 열려 있는 모든 도면을 닫습니다'
      },
      exit: {
        description: '응용 프로그램을 종료하고 열려 있는 모든 도면을 닫습니다'
      }
    }
  },

  example: {
    fileUpload: {
      title: '볼 CAD 파일 선택',
      subtitle: 'DWG 또는 DXF 도면을 뷰어로 가져옵니다',
      fontCdnNotice:
        '네트워크 접속이 제한된 국가나 지역에 있다면 VPN을 켜 주세요. 기본 글꼴 파일은 GitHub에 호스팅되어 있어, 접속이 제한되면 매우 느리게 로드되며 도면이 느리게 열리거나 문자가 올바르게 표시되지 않을 수 있습니다.',
      newDrawing: '새 도면',
      or: '또는',
      dropFile: '파일을 여기에 놓거나',
      browse: '찾아보기',

      openOptions: '열기 옵션',

      initialView: '초기 뷰',
      auto: '자동',
      autoHint: '접근 모드에 따름',
      extents: '범위',
      extentsHint: '도면 전체 맞춤',
      saved: '저장됨',
      savedHint: 'AutoCAD에 저장된 뷰',

      accessMode: '접근 모드',
      read: '읽기',
      readHint: '보기 전용',
      review: '검토',
      reviewHint: '보기 및 검토',
      write: '쓰기',
      writeHint: '전체 접근',

      textRendering: '문자 렌더링',
      worker: '워커',
      workerHint: '빠름, 메모리 많이 사용',
      mainThread: '메인 스레드',
      mainThreadHint: '느림, 메모리 적게 사용',

      progressive: '점진적',
      progressiveRendering: '점진적 렌더링',
      on: '켜기',
      progressiveOnHint:
        '구문 분석/변환이 끝날 때까지 UI를 잠그고, 이후 장면을 로드하는 동안 초점이동/줌 가능',
      off: '끄기',
      progressiveOffHint: '객체와 문자가 모두 변환될 때까지 대기',

      nonPlottable: '플롯 안 함',
      nonPlottableLayers: '플롯하지 않는 도면층',
      hide: '숨기기',
      hideHint: '웹 뷰어 기본값',
      show: '표시',
      showHint: 'AutoCAD 편집기 방식',

      curveQuality: '곡선 품질',
      curveDraft: '메모리 절약',
      curveDraftHint: '정점 수가 적고 파일이 작음',
      curveStandard: '표준',
      curveStandardHint: '균형 (원당 100개 변)',
      curveHigh: '고품질',
      curveHighHint: '부드러운 곡선, 메모리 많이 사용',

      paperSpaceBackground: '용지 배경',
      paperSpaceWhite: '흰색',
      paperSpaceWhiteHint: '데스크톱 CAD / 인쇄 미리보기',
      paperSpaceBlack: '검은색',
      paperSpaceBlackHint: '웹 뷰어 선호',

      export: '내보내기',
      exportEnable: '사용',
      exportEnableHint: 'DXF/HTML/PDF/SVG/PNG 내보내기 허용',
      exportDisable: '사용 안 함',
      exportDisableHint: '내보내기 명령과 파일 메뉴 항목 숨기기',

      invalidFileType:
        '잘못된 파일 형식입니다. DWG 또는 DXF 파일을 업로드하세요.'
    }
  }
}
