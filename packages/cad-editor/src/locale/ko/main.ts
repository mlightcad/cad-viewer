export default {
  mainMenu: {
    new: '새 도면',
    open: '도면 열기',
    drawingUnits: '도면 단위',
    exportMenu: '내보내기',
    export: 'DXF로 내보내기',
    exportHtml: 'HTML로 내보내기',
    exportPdf: 'PDF로 내보내기',
    exportSvg: 'SVG로 내보내기',
    exportImage: '이미지로 내보내기',
    about: '정보'
  },
  ribbon: {
    tab: {
      ai: 'AI',
      home: '홈',
      insert: '삽입',
      view: '뷰',
      review: '검토',
      measurement: '측정',
      hatchContext: '해치',
      mtextEditorContext: '문자 편집기'
    },
    hatch: {
      group: {
        boundary: '경계',
        pattern: '패턴',
        properties: '특성',
        options: '옵션',
        close: '닫기'
      },
      command: {
        pickPoints: '점 선택',
        selectObjects: '객체 선택',
        close: '닫기'
      },
      field: {
        pattern: '패턴',
        scale: '축척',
        angle: '각도',
        style: '스타일',
        associative: '연관',
        fillType: '채우기 유형',
        fillColor: '색상',
        patternColor: '패턴 색상',
        gradient1Color: '그라데이션 색상 1',
        backgroundColor: '배경색',
        gradient2Color: '그라데이션 색상 2',
        opacity: '투명도',
        imageScale: '이미지 축척'
      },
      style: {
        normal: '일반',
        outer: '외부',
        ignore: '무시'
      },
      fillType: {
        solid: '솔리드',
        pattern: '패턴',
        gradient: '그라데이션'
      },
      associative: {
        on: '켜기',
        off: '끄기'
      },
      tooltip: {
        pickPoints: '내부 점을 선택하여 해치 영역을 작성합니다.',
        selectObjects: '해치할 닫힌 경계 객체를 선택합니다.',
        pattern: '해치 패턴 이름을 선택합니다.',
        scale: '해치 패턴 축척을 설정합니다.',
        angle: '해치 패턴 각도(도)를 설정합니다.',
        style: '해치 작성 시 고립 영역 검출 스타일을 제어합니다.',
        associative: '연관 해치 모드를 전환합니다.',
        fillType: '채우기 유형(솔리드, 패턴, 그라데이션)을 선택합니다.',
        fillColor: '채우기 색상을 선택합니다.',
        patternColor: '패턴 선 색상을 선택합니다.',
        gradient1Color: '첫 번째 그라데이션 색상을 선택합니다.',
        backgroundColor: '패턴 채우기의 배경색을 선택합니다.',
        gradient2Color: '두 번째 그라데이션 색상을 선택합니다.',
        opacity: '해치 투명도(0-90)를 설정합니다.',
        imageScale: '채우기 이미지 축척을 설정합니다.',
        close: '해치 작성을 종료하고 이 상황별 탭을 닫습니다.'
      }
    },
    mtext: {
      group: {
        textStyle: '문자 스타일',
        format: '형식',
        paragraph: '문단',
        insert: '삽입',
        close: '닫기'
      },
      field: {
        textStyle: '문자 스타일',
        font: '글꼴',
        color: '색상',
        height: '높이',
        obliqueAngle: '기울기 각도',
        tracking: '자간',
        widthFactor: '폭 비율'
      },
      characterMap: {
        title: '문자표',
        font: '글꼴(F):',
        charsToCopy: '복사할 문자(A):',
        select: '선택(S)',
        copy: '복사(C)',
        noGlyphs: '이 글꼴에 사용할 수 있는 문자가 없습니다.',
        copyFailed: '클립보드에 복사할 수 없습니다.'
      },
      command: {
        bold: '굵게',
        underline: '밑줄',
        superscript: '위 첨자',
        italic: '기울임꼴',
        overline: '윗줄',
        subscript: '아래 첨자',
        strikethrough: '취소선',
        stack: '스택',
        toggleCase: '대/소문자',
        attachment: '자리맞추기',
        list: '글머리 기호 및 번호 매기기',
        lineSpacing: '줄 간격',
        paragraphAlignment: '문단 정렬',
        symbol: '기호',
        close: '닫기'
      },
      tooltip: {
        textStyle: '현재 도면에서 문자 스타일을 선택합니다.',
        bold: '굵게 서식을 전환합니다.',
        underline: '밑줄 서식을 전환합니다.',
        superscript: '위 첨자 서식을 전환합니다.',
        italic: '기울임꼴 서식을 전환합니다.',
        overline: '윗줄 서식을 전환합니다.',
        subscript: '아래 첨자 서식을 전환합니다.',
        strikethrough: '취소선 서식을 전환합니다.',
        stack: '선택한 분수 문자를 스택하거나 스택 해제합니다.',
        toggleCase: '선택한 문자를 대문자와 소문자 간에 전환합니다.',
        font: '현재 문자 글꼴을 설정합니다.',
        color: '현재 문자 색상을 설정합니다.',
        height: '현재 문자 높이를 설정합니다. 사용자 값을 입력할 수 있습니다.',
        obliqueAngle:
          '선택한 문자의 기울기 각도(도)를 설정합니다(음수는 반대 방향으로 기울임).',
        tracking: '선택한 문자 사이의 간격을 늘리거나 줄입니다(기본값 1).',
        widthFactor: '선택한 문자를 가로로 늘리거나 줄입니다(기본값 1).',
        attachment: '여러 줄 문자의 부착점을 설정합니다.',
        list: '글머리 기호 및 번호 매기기를 삽입하거나 구성합니다.',
        lineSpacing: '줄 간격을 설정합니다.',
        paragraphAlignment: '문단의 수평 정렬을 설정합니다.',
        symbol: '일반적인 제도 기호를 삽입합니다.',
        close: '문자 편집기와 이 상황별 탭을 닫습니다.'
      },
      attachment: {
        TL: '맨 위 왼쪽 TL',
        TC: '맨 위 중심 TC',
        TR: '맨 위 오른쪽 TR',
        ML: '중간 왼쪽 ML',
        MC: '중간 중심 MC',
        MR: '중간 오른쪽 MR',
        BL: '맨 아래 왼쪽 BL',
        BC: '맨 아래 중심 BC',
        BR: '맨 아래 오른쪽 BR'
      },
      list: {
        off: '끄기',
        number: '번호',
        letter: '문자',
        bullet: '글머리 기호',
        start: '시작',
        continue: '계속',
        auto: '자동 글머리 기호 및 번호 매기기 허용',
        allowList: '글머리 기호 및 리스트 허용'
      },
      lineSpacing: {
        more: '추가...',
        clear: '문단 간격 지우기'
      },
      paragraphAlign: {
        default: '기본값',
        left: '왼쪽',
        center: '중심',
        right: '오른쪽',
        justified: '양쪽 맞춤',
        distributed: '균등 분할'
      },
      symbol: {
        degree: '도  %%d',
        plusMinus: '플러스/마이너스  %%p',
        diameter: '지름  %%c',
        almostEqual: '거의 같음  \\U+2248',
        angle: '각도  \\U+2220',
        boundary: '경계선  \\U+E100',
        centerLine: '중심선  \\U+2104',
        delta: '델타  \\U+0394',
        electricalPhase: '전기 위상  \\U+0278',
        flowLine: '유동선  \\U+E101',
        identical: '동일  \\U+2261',
        notEqual: '같지 않음  \\U+2260',
        ohm: '옴  \\U+2126',
        omega: '오메가  \\U+03A9',
        propertyLine: '경계선(부지)  \\U+214A',
        subscriptTwo: '아래 첨자 2  \\U+2082',
        squared: '제곱  \\U+00B2',
        cubed: '세제곱  \\U+00B3',
        nbsp: '줄 바꿈하지 않는 공백 Ctrl+Shift+Space',
        other: '기타...'
      }
    },
    group: {
      smartBlocks: '스마트 블록',
      agent: '에이전트',
      aiModel: 'AI 모델',
      pdf: 'PDF',
      draw: '그리기',
      dimension: '치수',
      modify: '수정',
      clipboard: '클립보드',
      layer: '도면층',
      properties: '특성',
      groups: '그룹',
      utilities: '유틸리티',
      annotation: '주석',
      navigate: '탐색',
      namedViews: '명명된 뷰',
      coordinates: '좌표',
      review: '검토',
      measurement: '측정',
      style: '스타일',
      lengthUnits: '길이 단위',
      angleUnits: '각도 단위',
      reference: '참조',
      block: '블록'
    },
    insertBlock: {
      empty: '사용 가능한 블록이 없습니다',
      currentDrawing: '현재 도면',
      previewMenu: '블록 미리보기 갤러리'
    },
    property: {
      color: '색상',
      lineType: '선종류',
      lineWeight: '선가중치'
    },
    layerTools: {
      select: '도면층',
      off: '도면층 끄기',
      isolate: '격리',
      freeze: '도면층 동결',
      lock: '도면층 잠금',
      current: '현재로 설정',
      allOn: '도면층 켜기',
      unisolate: '격리 해제',
      thaw: '도면층 동결 해제',
      unlock: '도면층 잠금 해제',
      restore: '도면층 복원'
    },
    arc: {
      threePoint: '3점',
      startCenterEnd: '시작점, 중심점, 끝점',
      startCenterAngle: '시작점, 중심점, 각도',
      startCenterLength: '시작점, 중심점, 길이',
      startEndAngle: '시작점, 끝점, 각도',
      startEndDirection: '시작점, 끝점, 방향',
      startEndRadius: '시작점, 끝점, 반지름',
      centerStartEnd: '중심점, 시작점, 끝점',
      centerStartAngle: '중심점, 시작점, 각도',
      centerStartLength: '중심점, 시작점, 길이'
    },
    circle: {
      centerRadius: '중심점, 반지름',
      centerDiameter: '중심점, 지름',
      twoPoint: '2점',
      threePoint: '3점',
      tanTanRadius: '접선, 접선, 반지름',
      tanTanTan: '접선, 접선, 접선'
    },
    ellipse: {
      ellipse: '타원',
      arc: '타원형 호'
    },
    tooltip: {
      searchConvert:
        '선택한 객체의 모든 사본을 찾아 블록으로 변환합니다(BSEARCH).',
      detectConvert:
        '도면 전체에서 반복 객체를 찾아 블록으로 변환합니다(BDETECT).',
      importPdf:
        'PDF 파일에서 벡터 형상을 가져오고 원, 호, 곡선을 복원합니다 (PDFIMPORT).',
      pdfScale:
        '알려진 거리의 두 점으로 가져온 PDF 형상의 축척을 조정합니다 (PDFSCALE).',
      pdfDim:
        'PDF에서 분해된 치수(화살표 또는 사선, 치수선, 치수 보조선, 문자)를 치수 객체로 되돌립니다 (PDFDIM).',
      pdfHatch:
        'PDF에서 선분으로 분해된 해치를 패턴, 축척, 각도를 가진 해치로 되돌립니다 (PDFHATCH).',
      pdfBlock:
        'PDF의 반복 형상을 블록으로 만들고 각 사본을 블록 참조로 바꿉니다 (PDFBLOCK).',
      pdfText: 'PDF에서 분해된 문자 획을 문자 객체로 되돌립니다 (PDFTEXT).',
      line: '단일 직선 세그먼트를 그립니다.',
      polyline: '연결된 선 또는 호 세그먼트를 하나의 객체로 그립니다.',
      spline: '맞춤점 또는 조정점을 지나는 매끄러운 스플라인 곡선을 그립니다.',
      sketch: '일련의 자유곡선 세그먼트를 작성합니다.',
      revcloud: '도면 영역을 강조하는 구름형 수정 기호를 작성합니다.',
      circle: '여러 작성 방법으로 원을 그립니다.',
      arc: '여러 작성 방법으로 호를 그립니다.',
      mline: '여러 평행선을 하나의 다중선 객체로 그립니다.',
      ray: '시작점에서 한쪽으로 무한한 구성선(광선)을 그립니다.',
      xline: '무한 구성선을 그립니다.',
      ellipse: '타원 또는 타원형 호를 그립니다.',
      rect: '직사각형 또는 정다각형을 그립니다.',
      point: '도면에 점 객체를 배치합니다.',
      hatch: '닫힌 영역을 해치 패턴으로 채웁니다.',
      text: '도면에 여러 줄 문자 주석을 작성합니다.',
      dimension: '여러 작성 방법으로 치수를 작성합니다.',
      dimlinear: '수평, 수직 또는 회전된 선형 치수를 작성합니다.',
      dimaligned: '정렬된 선형 치수를 작성합니다.',
      dimradius: '원 또는 호의 반지름 치수를 작성합니다.',
      dimdiameter: '원 또는 호의 지름 치수를 작성합니다.',
      dimangular: '각도 치수를 작성합니다.',
      dimarc: '호 길이 치수를 작성합니다.',
      dimordinate: '세로좌표 치수를 작성합니다.',
      dimcontinue: '이전 치수에서 계속 치수를 작성합니다.',
      dimbaseline: '이전 치수에서 기준선 치수를 작성합니다.',
      dimstyle: '치수 스타일 관리자를 엽니다.',
      mleader: '다중 지시선 주석을 작성합니다.',
      mleaderAdd: '기존 다중 지시선에 지시선을 추가합니다.',
      mleaderRemove: '기존 다중 지시선에서 지시선을 제거합니다.',
      move: '선택한 객체를 새 위치로 이동합니다.',
      rotate: '선택한 객체를 기준점을 중심으로 회전합니다.',
      copy: '선택한 객체를 새 위치에 복사합니다.',
      erase: '도면에서 선택한 객체를 지웁니다.',
      pasteClip: '클립보드의 객체를 현재 도면에 붙여넣습니다(PASTECLIP).',
      pasteOrig:
        '원본 도면의 좌표를 사용하여 클립보드의 객체를 붙여넣습니다(PASTEORIG).',
      pasteBlock:
        '클립보드의 객체를 현재 도면에 블록으로 붙여넣습니다(PASTEBLOCK).',
      cutClip: '선택한 객체를 지우고 클립보드에 복사합니다(CUTCLIP).',
      copyClip: '선택한 객체를 클립보드에 복사합니다(COPYCLIP).',
      copyBase:
        '지정한 기준점을 사용하여 선택한 객체를 클립보드에 복사합니다(COPYBASE).',
      offset: '지정한 거리에 객체의 평행 사본을 작성합니다.',
      undo: '마지막 편집 작업을 명령 취소합니다.',
      redo: '마지막으로 취소한 편집 작업을 명령 복구합니다.',
      properties: '현재 선택 항목에 대한 특성 팔레트를 엽니다.',
      group: '선택한 객체에서 그룹을 만듭니다(GROUP).',
      ungroup: '그룹 정의를 분해합니다(UNGROUP).',
      groupEdit: '그룹 구성원을 추가, 제거하거나 이름을 바꿉니다(GROUPEDIT).',
      groupSelect: '그룹 선택을 켜거나 끕니다(PICKSTYLE 그룹 비트).',
      classicGroup: '객체 그룹 대화상자를 엽니다(CLASSICGROUP).',
      quickSelect: '빠른 선택을 열어 조건으로 객체를 필터링하고 선택합니다.',
      find: '찾기 팔레트를 열어 전체 도면 또는 현재 배치에서 문자를 검색합니다.',
      countList: '개수 팔레트를 열어 블록 개수를 보고 관리합니다.',
      missingResources:
        '글꼴, 이미지, 외부 참조에 대한 누락/외부 리소스 팔레트를 엽니다.',
      drawingUnits:
        '도면 단위를 열어 좌표 형식, 정밀도, 삽입 축척을 설정합니다.',
      attachDwg: 'DWG 또는 DXF 도면을 외부 참조로 부착합니다(XATTACH).',
      attachImage: '래스터 이미지를 외부 참조로 부착합니다(IMAGEATTACH).',
      insert: '블록 팔레트를 열어 블록 정의를 찾아보고 삽입합니다(INSERT).',
      editAttributes:
        '고급 속성 편집기를 열어 블록 속성 값과 표시 특성을 편집합니다(ATTEDIT).',
      defineAttribute: '블록에서 사용할 속성 정의를 작성합니다(ATTDEF).',
      agent: 'CAD 에이전트 팔레트 탭을 열어 자연어로 형상을 그립니다.',
      llmSettings:
        'CAD 에이전트와 PDF 문자 인식(OCR)에 사용하는 AI 모델 공급자와 API 키를 설정합니다.',
      pan: '배율을 변경하지 않고 도면의 뷰를 이동합니다.',
      zoom: '도면 표시를 줌합니다.',
      zoomExtents: '모든 객체의 최대 범위를 표시하도록 줌합니다.',
      zoomWindow: '윈도우로 지정한 영역을 표시하도록 줌합니다.',
      zoomPrevious: '이전 뷰를 표시하도록 줌합니다.',
      zoomSaved: '저장된 VPORT/배치 뷰로 줌합니다.',
      zoomSmart: '주요 형상 클러스터로 줌합니다.',
      newView: '현재 화면 또는 윈도우에서 새 명명된 뷰를 작성합니다.',
      viewManager: '뷰 관리자를 열어 명명된 뷰를 작성, 복원, 삭제합니다.',
      ucs: '현재 사용자 좌표계의 원점과 방향을 설정합니다.',
      namedUcs: '명명된 UCS 정의와 UCS 아이콘 설정을 관리합니다.',
      ucsWorld: 'UCS를 표준 좌표계로 설정합니다.',
      ucsOrigin: '새 UCS 원점을 정의합니다.',
      ucsX: 'UCS를 X축을 중심으로 회전합니다.',
      ucsY: 'UCS를 Y축을 중심으로 회전합니다.',
      ucsZ: 'UCS를 Z축을 중심으로 회전합니다.',
      ucsZAxis: 'Z축을 지정하여 UCS를 정의합니다.',
      ucsView: 'UCS를 현재 뷰에 정렬합니다.',
      ucsObject: 'UCS를 선택한 객체에 정렬합니다.',
      restoreView: '도면에 저장된 명명된 뷰를 복원합니다.',
      propertyColor: '새로 작성할 객체 또는 선택한 객체의 색상을 설정합니다.',
      propertyLineType:
        '새로 작성할 객체 또는 선택한 객체의 선종류를 설정합니다.',
      propertyLineWeight:
        '새로 작성할 객체 또는 선택한 객체의 선가중치를 설정합니다.',
      layerAction: {
        off: '선택한 도면층을 꺼서 도면층을 동결하지 않고 객체를 숨깁니다.',
        isolate:
          '선택한 도면층만 표시하고 나머지는 숨겨 관련 객체에 집중할 수 있게 합니다.',
        freeze: '선택한 도면층을 동결하여 객체를 숨기고 재생성에서 제외합니다.',
        lock: '선택한 도면층을 잠가 객체는 표시되지만 편집할 수 없게 합니다.',
        current:
          '선택한 도면층을 현재 도면층으로 설정하여 새 객체가 해당 도면층에 작성되게 합니다.',
        allOn:
          '현재 꺼져 있는 모든 도면층을 켭니다. 동결된 도면층은 동결 상태로 유지됩니다.',
        unisolate:
          '도면층 격리로 숨기거나 잠근 도면층을 복원하며 이후의 도면층 변경 사항은 유지합니다.',
        thaw: '선택한 도면층의 동결을 해제하여 객체가 다시 표시되고 재생성에 포함되게 합니다.',
        unlock:
          '선택한 도면층의 잠금을 해제하여 객체를 다시 선택하고 수정할 수 있게 합니다.',
        restore:
          '이 리본의 가장 최근 도면층 작업 이전 상태로 도면층을 복원합니다.'
      },
      circleOption: {
        centerRadius: '중심점과 반지름을 지정하여 원을 작성합니다.',
        centerDiameter: '중심점과 지름을 지정하여 원을 작성합니다.',
        twoPoint: '두 점으로 지름이 정의되는 원을 작성합니다.',
        threePoint: '세 점을 지나는 원을 작성합니다.',
        tanTanRadius: '두 객체에 접하고 지정한 반지름을 갖는 원을 작성합니다.',
        tanTanTan: '세 객체에 접하는 원을 작성합니다.'
      },
      arcOption: {
        threePoint: '시작점, 두 번째 점, 끝점을 지나는 호를 작성합니다.',
        startCenterEnd: '시작점, 중심점, 끝점을 지정하여 호를 작성합니다.',
        startCenterAngle: '시작점, 중심점, 사이각을 사용하여 호를 작성합니다.',
        startCenterLength:
          '시작점, 중심점, 호 길이를 사용하여 호를 작성합니다.',
        startEndAngle: '시작점과 끝점, 사이각으로 호를 작성합니다.',
        startEndDirection:
          '시작점과 끝점, 시작점에서의 접선 방향으로 호를 작성합니다.',
        startEndRadius: '시작점과 끝점, 지정한 반지름으로 호를 작성합니다.',
        centerStartEnd: '중심점, 시작점, 끝점을 지정하여 호를 작성합니다.',
        centerStartAngle: '중심점, 시작점, 사이각을 지정하여 호를 작성합니다.',
        centerStartLength: '중심점, 시작점, 호 길이를 지정하여 호를 작성합니다.'
      },
      rectOption: {
        rectangle: '반대쪽 구석 또는 치수를 지정하여 직사각형을 작성합니다.',
        polygon: '변의 수와 작성 방법을 지정하여 정다각형을 작성합니다.'
      },
      ellipseOption: {
        ellipse: '장축과 단축을 지정하여 전체 타원을 작성합니다.',
        arc: '타원 축과 호 범위를 지정하여 타원형 호를 작성합니다.'
      }
    },
    command: {
      searchConvert: '검색 및\n변환',
      detectConvert: '감지 및\n변환',
      importPdf: 'PDF\n가져오기',
      pdfScale: '축척\n보정',
      pdfDim: '치수\n인식',
      pdfHatch: '해치\n인식',
      pdfBlock: '블록\n만들기',
      pdfText: '문자\n인식',
      line: '선',
      polyline: '폴리선',
      circle: '원',
      arc: '호',
      mline: '다중선',
      ray: '광선',
      xline: '구성선',
      ellipse: '타원',
      spline: '스플라인',
      sketch: '스케치',
      revcloud: '구름형 수정 기호',
      rect: '직사각형',
      rectangle: '직사각형',
      polygon: '폴리곤',
      point: '점',
      divide: '등분할',
      hatch: '해치',
      text: '문자',
      gradient: '그라데이션',
      dimension: '치수',
      dimlinear: '선형',
      dimaligned: '정렬',
      dimradius: '반지름',
      dimdiameter: '지름',
      dimangular: '각도',
      dimarc: '호\n길이',
      dimordinate: '세로좌표',
      dimcontinue: '계속',
      dimbaseline: '기준선',
      dimstyle: '치수 스타일',
      mleader: '다중 지시선',
      mleaderAdd: '지시선 추가',
      mleaderRemove: '지시선 제거',
      move: '이동',
      rotate: '회전',
      copy: '복사',
      erase: '지우기',
      pasteClip: '붙여넣기',
      pasteOrig: '원래 좌표에 붙여넣기',
      pasteBlock: '블록으로 붙여넣기',
      cutClip: '잘라내기',
      copyClip: '복사',
      copyBase: '기준점을 사용하여 복사',
      offset: '간격띄우기',
      undo: '명령 취소',
      redo: '명령 복구',
      properties: '특성',
      group: '그룹',
      ungroup: '그룹 해제',
      groupEdit: '그룹 편집',
      groupSelect: '그룹 선택 켜기/끄기',
      classicGroup: '그룹 관리자',
      quickSelect: '빠른\n선택',
      find: '찾기',
      countList: '개수',
      drawingUnits: '도면\n단위',
      attachDwg: 'DWG\n부착',
      attachImage: '이미지\n부착',
      insert: '삽입',
      editAttributes: '속성\n편집',
      defineAttribute: '속성\n정의',
      agent: '에이전트',
      llmSettings: '모델\n설정',
      pan: '초점이동',
      zoom: '줌',
      zoomExtents: '범위',
      zoomWindow: '윈도우',
      zoomPrevious: '이전',
      zoomSaved: '저장됨',
      zoomSmart: '스마트',
      newView: '새\n뷰',
      viewManager: '뷰\n관리자',
      ucs: 'UCS',
      namedUcs: '명명된\nUCS',
      ucsWorld: '표준',
      ucsOrigin: '원점',
      ucsX: 'X',
      ucsY: 'Y',
      ucsZ: 'Z',
      ucsZAxis: 'Z축',
      ucsView: '뷰',
      ucsObject: '객체',
      restoreView: '뷰\n복원'
    }
  },
  bsearch: {
    found: '인스턴스 {count}개 찾음, {included}개 포함',
    previous: '이전 인스턴스',
    next: '다음 인스턴스',
    convert: '블록으로 변환…',
    cancel: '취소',
    rotation: '회전',
    mirror: '대칭',
    scale: '축척',
    sameLayer: '같은 도면층',
    existingBlocks: '기존 블록',
    textVariations: '문자 변형',
    pickPrompt: '인스턴스를 클릭하여 포함 또는 제외하거나',
    source: '선택한 객체: {count}개',
    options: '검색 옵션',
    none: '다른 인스턴스를 찾지 못했습니다. 검색 옵션을 변경하거나 선택한 객체만 변환하십시오.',
    includeAll: '모두 포함',
    include: '이 인스턴스 포함',
    instance: '인스턴스 {index}',
    blockReference: '블록 참조',
    rotatedBy: '회전 {angle}°',
    mirrored: '대칭됨',
    scaledBy: '축척 {scale}',
    hint: '행을 클릭하면 해당 인스턴스로 줌합니다. 도면에서 인스턴스를 클릭하면 포함하거나 제외합니다.'
  },
  bdetect: {
    detecting: '도면에서 반복 객체를 검색하는 중…',
    foundSoFar: '지금까지 그룹 {count}개 찾음',
    stop: '중지',
    groups: '반복 객체 그룹 {count}개',
    none: '반복 객체를 찾지 못했습니다.',
    selectAll: '모두 선택',
    instances: '인스턴스 {count}개 × 객체 {objects}개',
    layers: '도면층: {layers}',
    attributes: '속성',
    attributesHint: '인스턴스마다 다른 문자는 속성이 됩니다',
    blockName: '블록 이름',
    review: '이 그룹 검토 및 변환…',
    convertSelected: '선택 항목 변환 ({count})',
    close: '닫기',
    pickPrompt: '객체를 클릭하여 해당 그룹을 표시하거나',
    summary: '그룹 {groups}개를 블록 참조 {count}개로 변환했습니다',
    nameDuplicate: '블록 이름 "{name}"을(를) 선택한 다른 그룹에서 사용 중입니다'
  },
  verticalToolbar: {
    measure: {
      text: '측정',
      description: '측정 도구'
    },
    measureDistance: {
      text: '거리',
      description: '두 점 사이의 거리를 측정합니다'
    },
    measureContinuous: {
      text: '연속',
      description:
        'Enter 또는 취소할 때까지 연속된 점을 선택하여 누적 거리를 측정합니다'
    },
    measureAngle: {
      text: '각도',
      description: '공통 정점을 공유하는 두 선 사이의 각도를 측정합니다'
    },
    measureArea: {
      text: '면적',
      description: '다각형의 면적을 측정합니다'
    },
    measureArc: {
      text: '호',
      description: '세 점으로 정의된 호의 길이를 측정합니다'
    },
    measurePoint: {
      text: '점',
      description: '선택한 점의 X/Y 좌표를 측정합니다'
    },
    measurementPanel: {
      text: '패널',
      description: '측정 팔레트를 엽니다'
    },
    clearMeasurements: {
      text: '지우기',
      description: '현재 배치에서 모든 측정을 제거합니다'
    },
    measurementImport: {
      text: '가져오기',
      description: '사이드카 JSON 파일에서 측정을 가져옵니다'
    },
    measurementExport: {
      text: '내보내기',
      description: '측정을 사이드카 JSON 파일로 내보냅니다'
    },
    annotation: {
      text: '주석',
      description: '검토 도구'
    },
    layer: {
      text: '도면층',
      description: '도면층을 관리합니다'
    },
    pan: {
      text: '초점이동',
      description: '뷰 방향이나 배율을 변경하지 않고 뷰를 이동합니다'
    },
    markupPanel: {
      text: '패널',
      description: '마크업 팔레트를 엽니다'
    },
    markupText: {
      text: '문자',
      description: '문자 마크업을 배치합니다'
    },
    markupCloud: {
      text: '구름',
      description: '구름형 마크업을 작성합니다'
    },
    markupRect: {
      text: '직사각형',
      description: '직사각형 마크업을 작성합니다'
    },
    markupCircle: {
      text: '원',
      description: '원 마크업을 작성합니다'
    },
    markupArrow: {
      text: '화살표',
      description: '화살표 마크업을 작성합니다'
    },
    markupLine: {
      text: '선',
      description: '선 마크업을 작성합니다'
    },
    markupCallout: {
      text: '설명선',
      description: '설명선을 작성합니다'
    },
    markupStamp: {
      text: '스탬프',
      description: '스탬프를 배치합니다'
    },
    markupImport: {
      text: '가져오기',
      description: '사이드카 JSON 파일에서 마크업을 가져옵니다'
    },
    markupExport: {
      text: '내보내기',
      description: '마크업을 사이드카 JSON 파일로 내보냅니다'
    },
    markupColor: {
      text: '색상',
      description: '새 마크업 그리기의 색상을 설정합니다'
    },
    markupFontSize: {
      text: '문자 높이',
      description: '마크업의 문자 높이 설정을 엽니다(화면 맞춤 또는 실제 높이)',
      fit: '맞춤',
      wcs: 'WCS'
    },
    measurementColor: {
      text: '색상',
      description: '선택한 측정 또는 다음에 추가할 측정의 색상을 설정합니다'
    },
    measurementFontSize: {
      text: '문자 높이',
      description:
        '선택한 측정 또는 다음에 추가할 측정의 문자 높이 설정을 엽니다',
      fit: '맞춤',
      wcs: 'WCS'
    },
    showMarkup: {
      text: '표시',
      description: '마크업을 표시합니다'
    },
    hideMarkup: {
      text: '숨기기',
      description: '마크업을 숨깁니다'
    },
    showMeasurements: {
      text: '표시',
      description: '측정을 표시합니다'
    },
    hideMeasurements: {
      text: '숨기기',
      description: '측정을 숨깁니다'
    },
    clearMarkups: {
      text: '지우기',
      description: '현재 배치의 모든 마크업을 지웁니다'
    },
    select: {
      text: '선택',
      description: '객체를 선택합니다'
    },
    switchBg: {
      text: '전환',
      description: '도면 배경을 흰색과 검은색 간에 전환합니다',
      disabledInReadingMode:
        '읽기 모드가 켜져 있는 동안 사용할 수 없습니다(흰색 캔버스 고정)'
    },
    readingMode: {
      text: '읽기',
      description:
        '읽기 모드 전환: 검토하기 쉽도록 흰색 캔버스에 검은색 선으로 표시합니다'
    },
    zoom: {
      text: '줌',
      description: '줌 도구: 저장된 뷰, 범위, 스마트 범위, 윈도우'
    },
    zoomSaved: {
      text: '저장됨',
      description:
        'AutoCAD에 저장된 뷰(VPORT/배치 한계) 또는 열 때의 뷰를 복원합니다'
    },
    zoomToExtent: {
      text: '범위',
      description: '모든 객체의 최대 범위를 표시하도록 줌합니다'
    },
    zoomSmartExtents: {
      text: '스마트',
      description:
        '멀리 떨어진 이상치 객체를 무시하고 주요 형상 클러스터로 줌합니다'
    },
    zoomToBox: {
      text: '윈도우',
      description: '직사각형 윈도우로 지정한 영역을 표시하도록 줌합니다'
    }
  },
  statusBar: {
    setting: {
      tooltip: '표시 설정',
      commandLine: '명령행',
      coordinate: '좌표',
      entityInfo: '객체 정보',
      languageSelector: '언어 선택',
      ribbon: '리본',
      toolbar: '도구막대',
      stats: '통계'
    },
    cannoscale: {
      tooltip: '주석 축척 (CANNOSCALE)'
    },
    annoallvisible: {
      on: '현재 축척을 지원하지 않는 주석 객체 숨기기',
      off: '모든 주석 객체 표시 (ANNOALLVISIBLE)'
    },
    osnap: {
      tooltip: '객체 스냅',
      endpoint: '끝점',
      midpoint: '중간점',
      center: '중심',
      node: '노드',
      quadrant: '사분점',
      intersection: '교차점',
      insertion: '삽입',
      nearest: '근처점'
    },
    pointStyle: {
      tooltip: '점 스타일 수정'
    },
    fullScreen: {
      on: '전체 화면 모드 끄기',
      off: '전체 화면 모드 켜기'
    },
    dynamicInput: {
      on: '동적 입력 끄기',
      off: '동적 입력 켜기'
    },
    lineWidth: {
      on: '선가중치 숨기기',
      off: '선가중치 표시'
    },
    orthoMode: {
      on: '직교 모드 끄기',
      off: '직교 모드 켜기'
    },
    polarTracking: {
      on: '극좌표 추적 끄기',
      off: '극좌표 추적 켜기'
    },
    theme: {
      dark: '밝은 테마로 전환',
      light: '어두운 테마로 전환'
    },
    warning: {
      font: '다음 글꼴을 찾을 수 없습니다!'
    },
    notification: {
      tooltip: '알림 표시'
    },
    export: {
      tooltip: '이미지를 PNG로 내보내기'
    },
    moreLayouts: '추가 배치'
  },
  toolPalette: {
    entityProperties: {
      tab: '특성',
      title: '객체 특성',
      propertyPanel: {
        noEntitySelected: '선택한 객체가 없습니다!',
        multipleEntitySelected: '객체 {count}개 선택됨',
        propValCopied: '특성 값을 복사했습니다',
        failedToCopyPropVal: '특성 값을 복사하지 못했습니다!'
      }
    },
    layerManager: {
      tab: '도면층',
      title: '도면층 관리자',
      currentLayerLabel: '현재 도면층: {name}',
      searchPlaceholder: '도면층 검색',
      filters: '필터',
      collapseFilters: '필터 접기',
      expandFilters: '필터 펼치기',
      filterAll: '모두',
      filterAllUsed: '사용된 모든 도면층',
      toolbar: {
        showFilters: '도면층 필터',
        newFilter: '새 필터',
        newFilterGroup: '새 그룹 필터',
        newLayer: '새 도면층',
        deleteLayer: '도면층 삭제',
        setCurrent: '현재로 설정'
      },
      prompts: {
        newFilterTitle: '새 필터',
        newFilterName: '필터 이름 입력',
        newFilterGroupTitle: '새 그룹 필터',
        newFilterGroupName: '그룹 필터 이름 입력',
        newLayerTitle: '새 도면층',
        newLayerName: '도면층 이름 입력',
        confirm: '확인',
        cancel: '취소'
      },
      messages: {
        filterCreated: '필터 "{name}"을(를) 작성했습니다',
        filterExists: '이름이 "{name}"인 필터가 이미 있습니다',
        filterCreateFailed: '필터를 작성하지 못했습니다',
        layerCreated: '도면층 "{name}"을(를) 작성했습니다',
        layerExists: '도면층 "{name}"이(가) 이미 있습니다',
        layerCreateFailed: '도면층을 작성하지 못했습니다',
        layerDeleted: '도면층 "{name}"을(를) 삭제했습니다',
        layerDeleteFailed: '도면층 "{name}"을(를) 삭제하지 못했습니다',
        cannotDeleteLayer0: '도면층 "0"은 삭제할 수 없습니다',
        cannotDeleteCurrent: '현재 도면층은 삭제할 수 없습니다',
        selectLayerFirst: '먼저 도면층을 선택하십시오',
        setCurrentSuccess: '현재 도면층을 "{name}"(으)로 설정했습니다',
        setCurrentFailed: '현재 도면층을 설정하지 못했습니다'
      },
      layerList: {
        name: '이름',
        on: '켜기',
        freeze: '동결',
        lock: '잠금',
        plot: '플롯',
        color: '색상',
        linetype: '선종류',
        lineweight: '선가중치',
        transparency: '투명도',
        description: '설명',
        currentLayer: '현재 도면층',
        newLayerPlaceholder: '도면층 이름',
        zoomToLayer: '클릭한 도면층 "{layer}"(으)로 줌했습니다',
        lineWeightDefault: '기본값'
      }
    },
    find: {
      tab: '찾기',
      title: '찾기',
      placeholder: '문자 찾기',
      input: '검색 문자',
      find: '찾기',
      matchCase: '대/소문자 구분',
      currentLayoutOnly: '현재 배치만',
      hint: 'Enter 키를 눌러 전체 도면(모든 배치)에서 문자, 여러 줄 문자, 속성 및 블록, 치수, 지시선, 테이블 내 문자를 검색합니다.',
      hintLayout:
        'Enter 키를 눌러 현재 배치에서 문자, 여러 줄 문자, 속성 및 블록, 치수, 지시선, 테이블 내 문자를 검색합니다.',
      noResults: '문자를 찾을 수 없습니다',
      count: '{count}개 찾음',
      countLayouts: '배치 {layouts}개에서 {count}개 찾음',
      countTruncated:
        '처음 {count}개 결과만 표시됨 — 검색 조건을 구체화하십시오',
      noDocument: '검색하려면 도면을 여십시오',
      layoutUnavailable: '배치 "{layout}"을(를) 열 수 없습니다',
      unnamedLayout: '(이름 없는 배치)',
      kind: {
        text: '문자',
        mtext: '여러 줄 문자',
        attribute: '속성',
        block: '블록 문자',
        dimension: '치수',
        leader: '지시선',
        table: '테이블'
      }
    },
    bdetect: {
      tab: '감지',
      title: '감지 및 변환'
    },
    bsearch: {
      tab: '검색',
      title: '검색 및 변환'
    },
    countList: {
      tab: '개수',
      title: '개수',
      searchPlaceholder: '블록 이름 검색',
      countInArea: '영역 내 개수',
      areaSet: '개수 영역을 업데이트했습니다',
      areaCleared: '전체 모형 공간을 계산합니다',
      blockName: '블록',
      count: '개수',
      empty: '표시되는 블록이 없습니다',
      prompt: {
        firstCorner: '개수 영역의 첫 번째 구석 지정 또는 [전체(E)]: ',
        secondCorner: '반대 구석 지정: '
      }
    },
    designReview: {
      tab: '검토',
      title: '검토',
      searchPlaceholder: '마크업 검색',
      empty: '아직 마크업이 없습니다',
      type: '유형',
      status: '상태',
      author: '작성자',
      summary: '요약',
      details: '세부 정보',
      closeDetails: '세부 정보 닫기',
      label: '레이블',
      comment: '주석',
      zoomTo: '줌',
      delete: '삭제',
      clear: '모두 지우기',
      statusValues: {
        open: '열림',
        question: '질문',
        answered: '답변됨',
        closed: '닫힘'
      }
    },
    measurements: {
      tab: '측정',
      title: '측정',
      empty: '아직 측정이 없습니다',
      type: '유형',
      value: '값',
      filterAll: '모두',
      delete: '삭제',
      clear: '모두 지우기',
      typeValues: {
        distance: '거리',
        angle: '각도',
        area: '면적',
        arc: '호',
        point: 'XY'
      }
    },
    missingResources: {
      tab: '리소스',
      title: '누락/외부 리소스',
      fontTab: '글꼴',
      imageTab: '이미지',
      xrefTab: '외부 참조',
      attach: '부착',
      attachDwg: 'DWG/DXF 부착...',
      attachImage: '이미지 부착...',
      attachImageFailed: '이미지 "{name}"을(를) 부착하지 못했습니다',
      fileReferences: '파일 참조',
      details: '세부 정보',
      foundAt: '찾은 위치',
      selectReference: '세부 정보를 보려면 참조를 선택하십시오',
      expandDetails: '세부 정보 펼치기',
      collapseDetails: '세부 정보 접기',
      apply: '적용',
      applyDone: '대체를 적용했습니다',
      emptyFonts: '누락된 글꼴이 없습니다',
      emptyImages: '누락된 이미지가 없습니다',
      matchFontType: '글꼴 유형 일치 (SHX / 메쉬)',
      missedFont: '누락된 글꼴',
      replacedFont: '대체 글꼴',
      selectFont: '대체할 글꼴 선택',
      selectLocalFont: '로컬 글꼴 파일 선택',
      file: '파일',
      replace: '대체',
      name: '이름',
      path: '저장된 경로',
      type: '유형',
      typeAttach: '부착',
      typeOverlay: '중첩',
      typeImage: '이미지',
      status: '상태',
      statusMissing: '누락',
      statusLoaded: '로드됨',
      actions: '작업',
      visible: '표시',
      browse: '찾아보기…',
      fromUrl: 'URL…',
      unload: '언로드',
      load: '로드',
      empty: '이 도면에는 외부 참조 또는 이미지가 없습니다',
      urlPrompt: 'DWG 또는 DXF 파일의 URL 입력',
      urlRequired: 'URL을 입력하십시오',
      loadFailed: '참조 "{name}"을(를) 로드하지 못했습니다'
    },
    memoryProfile: {
      tab: '메모리',
      title: '메모리 프로파일',
      refresh: '새로 고침',
      collecting: '메모리 분석 중 ...',
      showPie: '요약 차트 표시',
      hidePie: '요약 차트 숨기기',
      collectedAt: '수집 시각 {time}',
      heapUsed: 'JS 힙 {used} / {total}',
      estimateNote:
        '형상 크기는 버퍼 byteLength에서 가져옵니다. 기타 범주는 추정값입니다.',
      estimated: '추정',
      pieTotal: '집계됨',
      pieAriaLabel: '범주별 메모리 분포',
      empty: '데이터 없음',
      missedFonts: '누락된 글꼴',
      fontMemory: '글꼴 / 여러 줄 문자 메모리',
      fontMemorySummary: '메모리 {live} (메인 {main} · 워커 {workers})',
      fontStorage: 'IndexedDB 저장소 (메모리 아님)',
      fontStorageSummary: '캐시된 글꼴 {count}개 · {size}',
      materialPoint: '점',
      materialLine: '선',
      materialFill: '채우기',
      materialTotal: '합계',
      dataModelCounts: '객체 {entities}개 · 오브젝트 {objects}개 · {total}',
      dataModelCategories: '범주별',
      dataModelEntityTypes: '객체 유형별',
      categories: {
        heap: 'JS 힙',
        geometry: '형상',
        mapping: '매핑',
        spatial: '공간 색인',
        dataModel: '데이터 모델',
        materials: '재료',
        fonts: '글꼴'
      },
      tabs: {
        geometry: '형상',
        spatial: '공간',
        dataModel: '데이터 모델',
        materials: '재료',
        fonts: '글꼴'
      },
      columns: {
        layout: '배치',
        layer: '도면층',
        geometry: '형상',
        mapping: '매핑',
        entities: '객체',
        rootItems: '루트',
        childItems: '하위',
        estimated: '추정 크기',
        type: '유형',
        count: '개수',
        category: '범주',
        font: '글꼴'
      }
    },
    openFileProfile: {
      tab: '열기 성능',
      title: '열기 성능',
      refresh: '새로 고침',
      copy: '복사',
      copied: '성능 데이터를 복사했습니다',
      copyFailed: '성능 데이터를 복사하지 못했습니다',
      collectedAt: '수집 시각 {time}',
      hint: '마지막으로 도면을 열 때 자동으로 수집됩니다. 콘솔에도 기록하려면 OPENPROF=1로 설정하십시오.',
      noData:
        '아직 열기 프로파일이 없습니다. 먼저 도면을 연 다음 OPENPERF를 실행하십시오.',
      empty: '데이터 없음',
      timing: '실제 경과 시간',
      progressive: '점진적 열기',
      progressiveMode: '모드',
      progressiveOn: '켜기',
      progressiveOff: '끄기',
      midOpenPaints: '열기 중 그리기',
      yields: '양보 횟수',
      cache: 'INSERT 렌더링 캐시 (최상위)',
      slowBlocks: '가장 느린 블록 템플릿 미스',
      total: '전체 열기',
      read: 'db.read',
      parse: '구문 분석',
      entity: '객체 플러시',
      convert: '장면 변환',
      cacheHits: '캐시 적중',
      cacheMisses: '캐시 미스',
      cacheBuild: '미스 빌드',
      cacheCompact: '미스 압축',
      cacheHitPath: '적중 경로',
      columns: {
        stage: '단계',
        duration: '소요 시간',
        share: '비율',
        metric: '지표',
        value: '값',
        block: '블록',
        build: '빌드',
        compact: '압축'
      }
    },
    blocks: {
      tab: '블록',
      title: '블록',
      tabCurrentDrawing: '현재 도면',
      tabRecent: '최근',
      tabFavorites: '즐겨찾기',
      tabLibraries: '라이브러리',
      sectionCurrentDrawing: '현재 도면 블록',
      sectionRecent: '최근 블록',
      sectionFavorites: '즐겨찾는 블록',
      sectionLibraries: '블록 라이브러리',
      filterPlaceholder: '필터...',
      empty: '사용 가능한 블록이 없습니다',
      emptyRecent: '최근에 삽입한 블록이 없습니다',
      emptyFavorites: '즐겨찾는 블록이 없습니다',
      emptyLibraries: '구성된 라이브러리가 없습니다',
      toggleFavorite: '즐겨찾기 전환',
      options: '옵션',
      insertionPoint: '삽입점',
      scale: '축척',
      rotation: '회전',
      angle: '각도',
      autoPlacement: '자동 배치',
      repeatPlacement: '반복 배치',
      explode: '분해'
    }
  },
  colorDropdown: {
    custom: '사용자'
  },
  lineTypeSelect: {
    placeholder: '선종류'
  },
  colorIndexPicker: {
    color: '색상: ',
    colorIndex: '색상 색인: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: '색상',
    layer: '도면층',
    lineType: '선종류'
  },
  ribbonProperty: {
    color: '색상',
    lineType: '선종류',
    lineWeight: '선가중치',
    layer: '도면층'
  },
  layerSelect: {
    searchPlaceholder: '도면층 이름 검색',
    noLayerAvailable: '사용 가능한 도면층이 없습니다',
    noMatchedLayer: '일치하는 도면층이 없습니다',
    tooltip: {
      layer: '도면층',
      visibility: '가시성',
      freeze: '동결',
      lock: '잠금',
      lineType: '선종류',
      color: '색상',
      visible: '표시',
      hidden: '숨김',
      frozen: '동결됨',
      thawed: '동결 해제됨',
      locked: '잠김',
      unlocked: '잠금 해제됨'
    }
  },
  message: {
    loadingFonts: '글꼴 로드 중 ...',
    loadingDwgConverter: 'DWG 변환기 로드 중...',
    fontsNotFound: '글꼴 저장소에서 글꼴 {fonts}을(를) 찾을 수 없습니다!',
    fontsNotLoaded: '글꼴 {fonts}을(를) 로드할 수 없습니다!',
    fontMissedInDrawing:
      '문자 객체 {count}개에 필요한 글꼴 "{font}"을(를) 사용할 수 없습니다. "{replacementFont}"(으)로 표시합니다.',
    fontMissedReplacement: '"{font}" ("{replacement}"(으)로 표시)',
    fontCached: '글꼴 "{font}"을(를) 캐시했습니다.',
    fontCacheFailed: '글꼴 "{fileName}"을(를) 캐시하지 못했습니다.',
    failedToGetAvaiableFonts:
      '"{url}"에서 사용 가능한 글꼴을 가져오지 못했습니다!',
    failedToOpenFile: '파일 "{fileName}"을(를) 열지 못했습니다!',
    failedToOpenFileToast:
      '"{fileName}"을(를) 열지 못했습니다. 자세한 내용은 알림 센터를 확인하십시오.',
    failedToOpenFileWorkerOom:
      '"{fileName}"을(를) 열지 못했습니다. 사용 가능한 메모리가 부족하여 구문 분석에 실패했습니다(LibreDWG 파서). {dwgParserLink}을(를) 클릭하여 상용 DWG 파서를 구입하면 이 오류 없이 대용량 도면을 열 수 있습니다.',
    failedToOpenFileWorkerOomLink: '이 페이지',
    failedToOpenFileWorkerTimeout:
      '"{fileName}"을(를) 열지 못했습니다. 도면을 구문 분석하는 동안 시간이 초과되었습니다.',
    failedToOpenFileFontLoadFailed:
      '"{fileName}"을(를) 열지 못했습니다. 필요한 글꼴을 로드할 수 없습니다.',
    failedToOpenFileLicenseExpired:
      '"{fileName}"을(를) 열지 못했습니다. DWG 변환기 라이선스가 만료되었습니다.',
    failedToOpenFileLicenseInvalid:
      '"{fileName}"을(를) 열지 못했습니다. DWG 변환기 라이선스가 없거나 유효하지 않습니다.',
    fetchingDrawingFile: '파일 가져오는 중 ...',
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
        '글꼴 관련 메시지 {count}개. 클릭하여 세부 정보를 펼칩니다.',
      unsupportedEntities: '지원되지 않는 객체',
      unsupportedEntitiesSummary:
        '구문 분석 관련 메시지 {count}개. 클릭하여 세부 정보를 펼칩니다.',
      genericSummary: '메시지 {count}개. 클릭하여 세부 정보를 펼칩니다.'
    },
    time: {
      justNow: '방금',
      minutesAgo: '{count}분 전 | {count}분 전',
      hoursAgo: '{count}시간 전 | {count}시간 전',
      daysAgo: '{count}일 전 | {count}일 전'
    },
    title: {
      failedToOpenFile: '파일 열기 실패',
      failedToOpenFileWorkerOom: '메모리 부족',
      failedToOpenFileWorkerTimeout: '열기 시간 초과',
      failedToOpenFileFontLoadFailed: '글꼴 로드 실패',
      failedToOpenFileLicenseExpired: '라이선스 만료',
      failedToOpenFileLicenseInvalid: '잘못된 라이선스',
      fontNotFound: '글꼴을 찾을 수 없음',
      fontNotLoaded: '글꼴이 로드되지 않음',
      parsingWarning: '도면 구문 분석 중 문제 발생',
      systemMessage: '시스템 메시지',
      systemWarning: '시스템 경고',
      systemError: '시스템 오류',
      systemInfo: '시스템 정보'
    }
  }
}
