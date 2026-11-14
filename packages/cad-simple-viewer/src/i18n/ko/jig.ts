export default {
  arc: {
    startPointOrCenter: '호의 시작점 지정 또는',
    secondPointOrOptions: '호의 두 번째 점 지정 또는',
    secondPoint: '호의 두 번째 점 지정',
    startPoint: '호의 시작점 지정',
    centerPoint: '호의 중심점 지정',
    endPoint: '호의 끝점 지정',
    endPointOrOptions: '호의 끝점 지정 또는',
    centerPointOrOptions: '호의 중심점 지정',
    includedAngle: '사이각 지정',
    chordLength: '현의 길이 지정',
    tangentDirection: '호의 시작점에 대한 접선 방향 지정',
    radius: '호의 반지름 지정',
    keywords: {
      center: {
        display: '중심(C)',
        local: '중심',
        global: 'Center'
      },
      end: {
        display: '끝(E)',
        local: '끝',
        global: 'End'
      },
      angle: {
        display: '각도(A)',
        local: '각도',
        global: 'Angle'
      },
      chordLength: {
        display: '현의 길이(L)',
        local: '현의 길이',
        global: 'ChordLength'
      },
      direction: {
        display: '방향(D)',
        local: '방향',
        global: 'Direction'
      },
      radius: {
        display: '반지름(R)',
        local: '반지름',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        '잘못된 3점 호: 점들이 동일 선상에 있거나 호를 정의할 수 없습니다.',
      center: '잘못된 중심 입력: 시작점과 끝점이 같은 원 위에 있어야 합니다.',
      angle: '잘못된 각도 입력: 사이각은 0보다 크고 360도보다 작아야 합니다.',
      chordLength:
        '잘못된 현의 길이: 값이 현재 반지름에 대한 범위를 벗어났습니다.',
      direction: '잘못된 방향: 이 접선 방향으로는 호를 만들 수 없습니다.',
      radius:
        '잘못된 반지름: 지정한 반지름으로 시작점과 끝점을 연결할 수 없습니다.'
    }
  },
  circle: {
    center: '원의 중심 지정',
    centerOrOptions: '원의 중심점 지정 또는',
    radius: '원의 반지름 지정',
    radiusOrDiameter: '원의 반지름 지정 또는',
    diameter: '원의 지름 지정',
    twoPointFirst: '원 지름의 첫 번째 끝점 지정',
    twoPointSecond: '원 지름의 두 번째 끝점 지정',
    threePointFirst: '원 위의 첫 번째 점 지정',
    threePointSecond: '원 위의 두 번째 점 지정',
    threePointThird: '원 위의 세 번째 점 지정',
    keywords: {
      threeP: {
        display: '3점(3P)',
        local: '3점',
        global: '3P'
      },
      twoP: {
        display: '2점(2P)',
        local: '2점',
        global: '2P'
      },
      diameter: {
        display: '지름(D)',
        local: '지름',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: '기준점 지정 또는',
    displacementOrArray: '변위 지정 또는',
    secondPointOrArray: '두 번째 점 지정 또는',
    modePrompt: '복사 모드 옵션 입력',
    arrayItemCount: '원본을 포함하여 배열할 항목 수 입력',
    arraySecondPointOrFit: '두 번째 점 지정 또는',
    arrayFitSecondPoint: '두 번째 점 지정',
    keywords: {
      displacement: {
        display: '변위(D)',
        local: '변위',
        global: 'Displacement'
      },
      mode: {
        display: '모드(O)',
        local: '모드',
        global: 'Mode'
      },
      multiple: {
        display: '다중(M)',
        local: '다중',
        global: 'Multiple'
      },
      single: {
        display: '단일(S)',
        local: '단일',
        global: 'Single'
      },
      array: {
        display: '배열(A)',
        local: '배열',
        global: 'Array'
      },
      fit: {
        display: '맞춤(F)',
        local: '맞춤',
        global: 'Fit'
      }
    }
  },
  copybase: {
    basePoint: '기준점 지정'
  },
  pasteclip: {
    insertionPoint: '삽입점 지정',
    empty: '클립보드에 도면 객체가 없습니다'
  },
  pasteorig: {
    sameDrawing: 'PASTEORIG는 객체를 복사한 원본 도면에는 붙여넣을 수 없습니다'
  },
  pasteblock: {
    insertionPoint: '삽입점 지정'
  },
  dimlinear: {
    xLine1Point: '첫 번째 치수보조선 원점 지정 또는 <객체 선택>',
    xLine2Point: '두 번째 치수보조선 원점 지정',
    dimLinePoint: '치수선의 위치 지정',
    selectObject: '치수를 기입할 객체 선택',
    rejectObject: 'DIMLINEAR로 치수를 기입할 수 없는 객체입니다.',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    rotationAngle: '치수선의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' },
      horizontal: {
        display: '수평(H)',
        local: '수평',
        global: 'Horizontal'
      },
      vertical: {
        display: '수직(V)',
        local: '수직',
        global: 'Vertical'
      },
      rotated: {
        display: '회전(R)',
        local: '회전',
        global: 'Rotated'
      }
    }
  },
  dimaligned: {
    xLine1Point: '첫 번째 치수보조선 원점 지정 또는 <객체 선택>',
    xLine2Point: '두 번째 치수보조선 원점 지정',
    dimLinePoint: '치수선의 위치 지정',
    selectObject: '치수를 기입할 객체 선택',
    rejectObject: 'DIMALIGNED로 치수를 기입할 수 없는 객체입니다.',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' }
    }
  },
  dimradius: {
    selectObject: '호 또는 원 선택',
    rejectObject: '호 또는 원을 선택해야 합니다.',
    dimLinePoint: '치수선의 위치 지정',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' }
    }
  },
  dimdiameter: {
    selectObject: '호 또는 원 선택',
    rejectObject: '호 또는 원을 선택해야 합니다.',
    dimLinePoint: '치수선의 위치 지정',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' }
    }
  },
  dimangular: {
    vertexOrSelect: '각도 정점 지정 또는 <선 선택>',
    xLine1Point: '첫 번째 각도 끝점 지정',
    xLine2Point: '두 번째 각도 끝점 지정',
    arcPoint: '치수 호 선의 위치 지정',
    selectFirstLine: '첫 번째 선 선택',
    selectSecondLine: '두 번째 선 선택',
    rejectObject: '선을 선택해야 합니다.',
    linesParallel: '선이 평행합니다 — 각도 교차점이 없습니다.',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' }
    }
  },
  dimarc: {
    selectArc: '호 선택',
    rejectObject: '호를 선택해야 합니다.',
    arcPoint: '호 길이 치수의 위치 지정',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' }
    }
  },
  dimordinate: {
    featurePoint: '피쳐 위치 지정',
    leaderEndpoint: '지시선 끝점 지정',
    dimensionText: '치수 문자 입력',
    textAngle: '치수 문자의 각도 지정',
    keywords: {
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      text: { display: '문자(T)', local: '문자', global: 'Text' },
      angle: { display: '각도(A)', local: '각도', global: 'Angle' },
      xdatum: { display: 'X데이텀(X)', local: 'X데이텀', global: 'Xdatum' },
      ydatum: { display: 'Y데이텀(Y)', local: 'Y데이텀', global: 'Ydatum' }
    }
  },
  dimcontinue: {
    nextPoint: '두 번째 치수보조선 원점 지정 또는',
    selectDimension: '연속 치수 선택',
    rejectObject: '선형 또는 각도 치수를 선택해야 합니다.',
    keywords: {
      select: { display: '선택(S)', local: '선택', global: 'Select' }
    }
  },
  dimbaseline: {
    nextPoint: '두 번째 치수보조선 원점 지정 또는',
    selectDimension: '기준 치수 선택',
    rejectObject: '선형 또는 각도 치수를 선택해야 합니다.',
    keywords: {
      select: { display: '선택(S)', local: '선택', global: 'Select' }
    }
  },
  ellipse: {
    axisEndpointOrOptions: '타원의 축 끝점 지정 또는',
    arcAxisEndpointOrCenter: '타원형 호의 축 끝점 지정 또는',
    center: '타원의 중심 지정',
    firstAxisEndpoint: '축의 끝점 지정',
    secondAxisEndpoint: '축의 다른 끝점 지정',
    otherAxisOrRotation: '다른 축으로 거리 지정 또는',
    rotationAngle: '장축 주위로 회전 각도 지정',
    arcStartAngle: '타원형 호의 시작 각도 지정',
    arcEndAngle: '타원형 호의 끝 각도 지정',
    keywords: {
      arc: {
        display: '호(A)',
        local: '호',
        global: 'Arc'
      },
      center: {
        display: '중심(C)',
        local: '중심',
        global: 'Center'
      },
      rotation: {
        display: '회전(R)',
        local: '회전',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: '잘못된 축 입력: 축 길이는 0보다 커야 합니다.',
      otherAxis: '잘못된 다른 축 입력: 거리는 0보다 커야 합니다.',
      rotation: '잘못된 회전 입력: 결과 단축은 0보다 커야 합니다.'
    }
  },
  hatch: {
    prompt: '경계 객체 선택 또는',
    pickPoint: '내부 점 지정 (또는 Enter 키를 눌러 완료)',
    select: '해치할 객체 선택',
    patternName: '해치 패턴 이름 입력',
    scale: '해치 패턴 축척 지정',
    angle: '해치 패턴 각도 지정',
    style: '해치 스타일 입력',
    associative: '연관성 지정',
    invalidBoundary: '선택한 객체가 닫힌 경계를 형성하지 않습니다.',
    keywords: {
      pick: {
        display: '점 선택(P)',
        local: '점 선택',
        global: 'PickPoints'
      },
      select: {
        display: '객체 선택(S)',
        local: '객체 선택',
        global: 'SelectObjects'
      },
      cancel: {
        display: '취소(C)',
        local: '취소',
        global: 'Cancel'
      },
      pattern: {
        display: '패턴(P)',
        local: '패턴',
        global: 'Pattern'
      },
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      angle: {
        display: '각도(A)',
        local: '각도',
        global: 'Angle'
      },
      style: {
        display: '스타일(T)',
        local: '스타일',
        global: 'HatchStyle'
      },
      associative: {
        display: '연관(AS)',
        local: '연관',
        global: 'AssociativeMode'
      },
      normal: {
        display: '일반(N)',
        local: '일반',
        global: 'Normal'
      },
      outer: {
        display: '외부(O)',
        local: '외부',
        global: 'Outer'
      },
      ignore: {
        display: '무시(I)',
        local: '무시',
        global: 'Ignore'
      },
      yes: {
        display: '예(Y)',
        local: '예',
        global: 'Yes'
      },
      no: {
        display: '아니오(N)',
        local: '아니오',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: '개 객체를 숨겼습니다',
    restored: '개 객체를 복원했습니다',
    nothingToRestore: '복원할 숨겨진 객체가 없습니다'
  },
  entout: {
    longSidePrompt: '미리보기 긴 변의 크기(픽셀) 입력',
    exported: '개 객체 미리보기를 내보냈습니다',
    skipped: '개 객체를 건너뛰었습니다',
    failed: {
      'no-preview-root': '선택 항목에 대한 미리보기 형상을 만들 수 없습니다',
      'no-bounds': '선택 항목에 대한 미리보기 경계를 계산할 수 없습니다',
      'capture-failed': '객체 미리보기 이미지를 렌더링할 수 없습니다',
      'download-failed': '미리보기는 렌더링했지만 PNG 다운로드에 실패했습니다'
    }
  },
  layer: {
    main: '옵션 입력',
    listSummary: '도면층 목록이 브라우저 콘솔에 출력되었습니다',
    emptyInput: '도면층 이름이 입력되지 않았습니다.',
    newPrompt: '새 도면층 이름 입력',
    makePrompt: '현재로 만들 도면층 이름 입력',
    setPrompt: '현재로 설정할 도면층 이름 입력',
    onPrompt: '켤 도면층 이름 입력',
    offPrompt: '끌 도면층 이름 입력',
    freezePrompt: '동결할 도면층 이름 입력',
    thawPrompt: '동결 해제할 도면층 이름 입력',
    lockPrompt: '잠글 도면층 이름 입력',
    unlockPrompt: '잠금 해제할 도면층 이름 입력',
    colorLayerPrompt: '색상을 변경할 도면층 이름 입력',
    colorValuePrompt:
      '색상 입력 (ACI 1-255, 255,0,0 같은 RGB 또는 CSS 색상 이름)',
    invalidColor: '잘못된 색상 입력입니다.',
    descriptionLayerPrompt: '설명을 편집할 도면층 이름 입력',
    descriptionValuePrompt: '새 도면층 설명 입력',
    created: '만든 도면층 수',
    alreadyExists: '도면층이 이미 있습니다',
    notFound: '도면층을 찾을 수 없습니다',
    cannotChangeCurrent: '현재 도면층은 끄거나 동결할 수 없습니다.',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: '만들기(M)',
        local: '만들기',
        global: 'Make'
      },
      set: {
        display: '설정(S)',
        local: '설정',
        global: 'Set'
      },
      new: {
        display: '새로 만들기(N)',
        local: '새로 만들기',
        global: 'New'
      },
      on: {
        display: '켜기(ON)',
        local: '켜기',
        global: 'On'
      },
      off: {
        display: '끄기(OF)',
        local: '끄기',
        global: 'Off'
      },
      color: {
        display: '색상(C)',
        local: '색상',
        global: 'Color'
      },
      freeze: {
        display: '동결(F)',
        local: '동결',
        global: 'Freeze'
      },
      thaw: {
        display: '동결 해제(T)',
        local: '동결 해제',
        global: 'Thaw'
      },
      lock: {
        display: '잠금(L)',
        local: '잠금',
        global: 'Lock'
      },
      unlock: {
        display: '잠금 해제(U)',
        local: '잠금 해제',
        global: 'Unlock'
      },
      description: {
        display: '설명(D)',
        local: '설명',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: '모든 도면층이 이미 켜져 있습니다.',
    turnedOn: '켠 도면층'
  },
  laycur: {
    prompt: '현재 도면층으로 변경할 객체 선택',
    currentLayerNotFound: '현재 도면층을 찾을 수 없습니다.',
    noObjects: '유효한 객체가 선택되지 않았습니다.',
    alreadyCurrent: '선택한 객체가 이미 현재 도면층에 있습니다.',
    changed: '현재 도면층으로 변경한 객체'
  },
  layfrz: {
    prompt: '동결할 도면층의 객체 선택 또는',
    invalidSelection: '잘못된 객체가 선택되었습니다.',
    settingsPrompt: '변경할 LAYFRZ 설정 입력',
    viewportPrompt: '뷰포트 동결 동작 지정',
    blockSelectionPrompt: '중첩된 블록 선택 동작 지정',
    vpfreezeFallback:
      '현재 뷰어는 뷰포트별 도면층 동결을 지원하지 않습니다. 대신 동결 동작을 사용합니다.',
    nestedSelectionLimited:
      '중첩된 블록 선택 설정은 저장되지만, 현재 선택은 여전히 최상위 객체의 도면층을 사용합니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    cannotFreezeCurrent: '현재 도면층은 동결할 수 없습니다.',
    alreadyFrozen: '도면층이 이미 동결되어 있습니다',
    frozen: '동결한 도면층',
    restored: '복원한 도면층',
    nothingToUndo: '명령 취소할 LAYFRZ 작업이 없습니다.',
    keywords: {
      settings: {
        display: '설정(S)',
        local: '설정',
        global: 'Settings'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      viewports: {
        display: '뷰포트(V)',
        local: '뷰포트',
        global: 'Viewports'
      },
      blockSelection: {
        display: '블록 선택(B)',
        local: '블록 선택',
        global: 'BlockSelection'
      },
      freeze: {
        display: '동결(F)',
        local: '동결',
        global: 'Freeze'
      },
      vpfreeze: {
        display: '뷰포트 동결(V)',
        local: '뷰포트 동결',
        global: 'Vpfreeze'
      },
      block: {
        display: '블록(B)',
        local: '블록',
        global: 'Block'
      },
      entity: {
        display: '객체(E)',
        local: '객체',
        global: 'Entity'
      },
      none: {
        display: '없음(N)',
        local: '없음',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: '격리할 도면층의 객체 선택 또는',
    settingsPrompt: '격리되지 않은 도면층에 대한 설정 입력',
    offModePrompt: '격리되지 않은 도면층의 끄기 동작 입력',
    noLayers: '유효한 도면층이 선택되지 않았습니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    isolated: '격리한 도면층',
    affectedLayers: '개 도면층이 영향을 받았습니다',
    vpfreezeFallback:
      '현재 뷰어는 뷰포트별 도면층 동결을 지원하지 않습니다. 대신 끄기 동작을 사용합니다.',
    lockFadeFallback:
      '현재 뷰어는 도면층 페이드 표시를 지원하지 않습니다. 격리되지 않은 도면층은 페이드 없이 잠깁니다.',
    keywords: {
      settings: {
        display: '설정(S)',
        local: '설정',
        global: 'Settings'
      },
      off: {
        display: '끄기(O)',
        local: '끄기',
        global: 'Off'
      },
      lockAndFade: {
        display: '잠금 및 페이드(L)',
        local: '잠금 및 페이드',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: '뷰포트 동결(V)',
        local: '뷰포트 동결',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: '복원할 이전 LAYISO 도면층 상태가 없습니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    nothingRestored: '복원된 LAYISO 도면층 변경 사항이 없습니다.',
    restored: '복원한 도면층'
  },
  laythw: {
    alreadyThawed: '모든 도면층이 이미 동결 해제되어 있습니다.',
    thawed: '동결 해제한 도면층'
  },
  laylck: {
    prompt: '잠글 도면층의 객체 선택',
    invalidSelection: '잘못된 객체가 선택되었습니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    alreadyLocked: '도면층이 이미 잠겨 있습니다',
    locked: '잠근 도면층'
  },
  layulk: {
    prompt: '잠금 해제할 도면층의 객체 선택',
    invalidSelection: '잘못된 객체가 선택되었습니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    alreadyUnlocked: '도면층이 이미 잠금 해제되어 있습니다',
    unlocked: '잠금 해제한 도면층'
  },
  layoff: {
    prompt: '끌 도면층의 객체 선택 또는',
    invalidSelection: '잘못된 객체가 선택되었습니다.',
    settingsPrompt: '변경할 LAYOFF 설정 입력',
    viewportPrompt: '뷰포트 동작 지정',
    blockSelectionPrompt: '중첩된 블록 선택 동작 지정',
    vpfreezeFallback:
      '현재 뷰어는 뷰포트별 도면층 끄기를 지원하지 않습니다. 대신 끄기 동작을 사용합니다.',
    nestedSelectionLimited:
      '중첩된 블록 선택 설정은 저장되지만, 현재 선택은 여전히 최상위 객체의 도면층을 사용합니다.',
    layerNotFound: '도면층을 찾을 수 없습니다',
    cannotTurnOffCurrent: '현재 도면층은 끌 수 없습니다.',
    alreadyOff: '도면층이 이미 꺼져 있습니다',
    turnedOff: '끈 도면층',
    restored: '복원한 도면층',
    nothingToUndo: '명령 취소할 LAYOFF 작업이 없습니다.',
    keywords: {
      settings: {
        display: '설정(S)',
        local: '설정',
        global: 'Settings'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      viewports: {
        display: '뷰포트(V)',
        local: '뷰포트',
        global: 'Viewports'
      },
      blockSelection: {
        display: '블록 선택(B)',
        local: '블록 선택',
        global: 'BlockSelection'
      },
      off: {
        display: '끄기(O)',
        local: '끄기',
        global: 'Off'
      },
      vpfreeze: {
        display: '뷰포트 동결(V)',
        local: '뷰포트 동결',
        global: 'Vpfreeze'
      },
      block: {
        display: '블록(B)',
        local: '블록',
        global: 'Block'
      },
      entity: {
        display: '객체(E)',
        local: '객체',
        global: 'Entity'
      },
      none: {
        display: '없음(N)',
        local: '없음',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: '이전 도면층 상태를 복원했습니다.',
    noPreviousState: '복원할 이전 도면층 상태가 없습니다.'
  },
  line: {
    firstPoint: '첫 번째 점 지정',
    firstPointOrContinue: '첫 번째 점 지정 또는',
    nextPoint: '다음 점 지정',
    nextPointWithOptions: '다음 점 지정 또는',
    keywords: {
      continue: {
        display: '계속(C)',
        local: '계속',
        global: 'Continue'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      close: {
        display: '닫기(C)',
        local: '닫기',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: '점 지정 또는',
    secondPoint: '두 번째 점 지정',
    throughPoint: '통과점 지정',
    angle: '구성선의 각도 입력',
    invalidDirection: 'XLINE에 대한 잘못된 방향입니다.',
    keywords: {
      hor: {
        display: '수평(H)',
        local: '수평',
        global: 'Hor'
      },
      ver: {
        display: '수직(V)',
        local: '수직',
        global: 'Ver'
      },
      ang: {
        display: '각도(A)',
        local: '각도',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: '시작점 지정',
    throughPoint: '통과점 지정'
  },
  mline: {
    startPointWithOptions: '시작점 지정 또는',
    nextPointWithOptions: '다음 점 지정 또는',
    justificationPrompt: '자리맞추기 유형 입력',
    scalePrompt: '여러 줄 축척 지정',
    stylePrompt: '여러 줄 스타일 이름 입력 또는 목록을 보려면 [?]',
    styleNotFound: '여러 줄 스타일을 찾을 수 없습니다',
    styleListHeader: '로드된 여러 줄 스타일',
    styleListEmpty: '현재 도면에 로드된 여러 줄 스타일이 없습니다.',
    keywords: {
      justification: {
        display: '자리맞추기(J)',
        local: '자리맞추기',
        global: 'Justification'
      },
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      style: {
        display: '스타일(ST)',
        local: '스타일',
        global: 'Style'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      close: {
        display: '닫기(C)',
        local: '닫기',
        global: 'Close'
      },
      top: {
        display: '맨 위(T)',
        local: '맨 위',
        global: 'Top'
      },
      zero: {
        display: '0(Z)',
        local: '0',
        global: 'Zero'
      },
      bottom: {
        display: '맨 아래(B)',
        local: '맨 아래',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: '정점 지정',
    arm1: '첫 번째 변 위의 점 지정',
    arm2: '두 번째 변 위의 점 지정'
  },
  measureArc: {
    startPoint: '호의 시작점 지정',
    throughPoint: '호 위의 점 지정',
    endPoint: '호의 끝점 지정',
    lockedEndPoint: '호의 끝점 지정 (Ctrl 키로 큰 호/작은 호 전환)',
    invalidPoints: '세 점이 동일 선상에 있어 호를 정의할 수 없습니다.',
    pickArc: '원, 호 또는 폴리선 호 선택',
    noArc: '여기에 원이나 호가 없습니다. 곡선을 클릭하거나 3점을 선택하세요.',
    keywords: {
      threePoint: {
        display: '3점(T)',
        local: '3점',
        global: 'ThreePoint'
      }
    }
  },
  measureArea: {
    firstPoint: '첫 번째 점 지정',
    nextPoint: '다음 점 지정 (또는 Enter 키를 눌러 완료)'
  },
  measureDistance: {
    firstPoint: '첫 번째 점 지정',
    secondPoint: '두 번째 점 지정'
  },
  measureContinuous: {
    firstPoint: '첫 번째 점 지정',
    nextPoint: '다음 점 지정 (또는 Enter 키를 눌러 완료)'
  },
  measurePoint: {
    point: '점 지정'
  },
  measurement: {
    import: {
      chooseFile: '측정 사이드카 JSON 파일 선택'
    }
  },
  markup: {
    author: '검토 작성자 지정 (나중을 위해 저장됨)',
    text: {
      point: '문자 마크업 점 지정',
      content: '마크업 문자 입력'
    },
    line: {
      firstPoint: '선 마크업의 첫 번째 점 지정',
      secondPoint: '선 마크업의 두 번째 점 지정'
    },
    arrow: {
      firstPoint: '화살표 시작점 지정',
      secondPoint: '화살표 끝 지정'
    },
    cloud: {
      firstCorner: '구름의 첫 번째 구석 지정',
      secondCorner: '구름의 반대 구석 지정'
    },
    rect: {
      firstCorner: '직사각형의 첫 번째 구석 지정',
      secondCorner: '직사각형의 반대 구석 지정'
    },
    circle: {
      center: '원의 중심 지정',
      radius: '원의 반지름 지정'
    },
    shape: {
      calloutOn: '[설명선 켜기]',
      calloutOff: '[설명선 끄기]',
      calloutAnchor: '설명선 문자 위치 지정',
      keywords: {
        callout: {
          display: '설명선(C)',
          local: '설명선',
          global: 'Callout'
        },
        noCallout: {
          display: '설명선 없음(N)',
          local: '설명선 없음',
          global: 'NoCallout'
        }
      }
    },
    highlight: {
      firstCorner: '강조 표시의 첫 번째 구석 지정',
      secondCorner: '강조 표시의 반대 구석 지정'
    },
    callout: {
      tip: '지시선 끝을 지정하거나, 설명선 없이 구름 / 직사각형 / 원 윤곽 지정',
      anchor: '설명선 문자 위치 지정',
      content: '설명선 문자 입력'
    },
    stamp: {
      kind: '스탬프 ID 입력 [approved/rejected/revised/for-review/custom]',
      imageUrl: '사용자 스탬프 이미지 URL 입력 (선택 사항)',
      caption: '스탬프 캡션 입력 (선택 사항)',
      point: '스탬프 삽입점 지정'
    },
    import: {
      chooseFile: '마크업 사이드카 JSON 파일 선택'
    }
  },
  move: {
    basePointOrDisplacement: '기준점 지정 또는',
    secondPointOrDisplacement: '두 번째 점 지정 또는',
    displacement: '변위 지정',
    keywords: {
      displacement: {
        display: '변위(D)',
        local: '변위',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: '간격띄우기 거리 지정',
    selectObject: '간격띄우기할 객체 선택 또는 Enter 키를 눌러 완료',
    sidePoint: '간격띄우기할 쪽의 점 지정',
    invalidDistance: '간격띄우기 거리는 0보다 커야 합니다.',
    invalidSelection: '선택한 객체는 간격띄우기할 수 없습니다.',
    offsetFailed: '지정한 쪽에 간격띄우기 곡선을 만들 수 없습니다.'
  },
  leader: {
    startPoint: '지시선 시작점 지정',
    nextPoint: '다음 점 지정',
    nextPointOrOptions: '다음 점 지정 또는 [주석(A)/형식(F)/명령 취소(U)]',
    formatPrompt:
      '지시선 형식 옵션 입력 [스플라인(S)/직선(T)/화살표(A)/없음(N)]',
    annotationText: '주석 문자의 첫 번째 행 입력 또는 <옵션>',
    nextAnnotationLine: '주석 문자의 다음 행 입력',
    annotationOptions:
      '주석 옵션 입력 [공차(T)/복사(C)/블록(B)/없음(N)/여러 줄 문자(M)]',
    selectAnnotation: '복사할 주석 객체 선택',
    rejectAnnotation: '이 객체는 지시선 주석으로 사용할 수 없습니다.',
    toleranceUnavailable:
      '이 빌드에서는 기하학적 공차 대화상자를 사용할 수 없습니다.',
    keywords: {
      annotation: {
        display: '주석(A)',
        local: '주석',
        global: 'Annotation'
      },
      format: {
        display: '형식(F)',
        local: '형식',
        global: 'Format'
      },
      undo: { display: '명령 취소(U)', local: '명령 취소', global: 'Undo' },
      spline: {
        display: '스플라인(S)',
        local: '스플라인',
        global: 'Spline'
      },
      straight: {
        display: '직선(T)',
        local: '직선',
        global: 'STraight'
      },
      arrow: { display: '화살표(A)', local: '화살표', global: 'Arrow' },
      none: { display: '없음(N)', local: '없음', global: 'None' },
      tolerance: {
        display: '공차',
        local: '공차',
        global: 'Tolerance'
      },
      copy: { display: '복사(C)', local: '복사', global: 'Copy' },
      block: { display: '블록(B)', local: '블록', global: 'Block' },
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      }
    }
  },
  mleader: {
    arrowheadOrOptions:
      '지시선 화살촉 위치 지정 또는 [지시선 연결선 먼저(L)/콘텐츠 먼저(C)/옵션(O)]',
    landingLocation: '지시선 연결선 위치 지정',
    landingFirstPoint: '지시선 연결선 위치 지정',
    arrowheadLocation: '지시선 화살촉 위치 지정',
    contentLocation: '콘텐츠 위치 지정',
    nextPoint: '다음 점 지정',
    optionsPrompt:
      '옵션 입력 [지시선 유형(T)/연결선(A)/콘텐츠 유형(C)/최대 점 수(M)/첫 번째 각도(F)/두 번째 각도(S)/옵션 종료(X)]',
    leaderTypePrompt: '지시선 유형 선택 [직선(S)/스플라인(P)/없음(N)]',
    landingPrompt: '연결선 사용 [예(Y)/아니오(N)]',
    landingLength: '연결선 거리 지정',
    contentTypePrompt: '콘텐츠 유형 선택 [블록(B)/여러 줄 문자(M)/없음(N)]',
    maxPoints: '지시선의 최대 점 수 입력',
    firstAngle: '첫 번째 각도 구속 입력',
    secondAngle: '두 번째 각도 구속 입력',
    keywords: {
      landingFirst: {
        display: '지시선 연결선 먼저(L)',
        local: '연결선 먼저',
        global: 'Landing first'
      },
      contentFirst: {
        display: '콘텐츠 먼저(C)',
        local: '콘텐츠 먼저',
        global: 'Content first'
      },
      options: {
        display: '옵션(O)',
        local: '옵션',
        global: 'Options'
      },
      leaderType: {
        display: '지시선 유형(T)',
        local: '지시선 유형',
        global: 'Leader type'
      },
      landing: {
        display: '연결선(A)',
        local: '연결선',
        global: 'lAnding'
      },
      contentType: {
        display: '콘텐츠 유형(C)',
        local: '콘텐츠 유형',
        global: 'Content type'
      },
      maxpoints: {
        display: '최대 점 수(M)',
        local: '최대 점 수',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: '첫 번째 각도(F)',
        local: '첫 번째 각도',
        global: 'First angle'
      },
      secondAngle: {
        display: '두 번째 각도(S)',
        local: '두 번째 각도',
        global: 'Second angle'
      },
      exitOptions: {
        display: '옵션 종료(X)',
        local: '옵션 종료',
        global: 'eXit options'
      },
      straight: {
        display: '직선(S)',
        local: '직선',
        global: 'Straight'
      },
      spline: {
        display: '스플라인(P)',
        local: '스플라인',
        global: 'sPline'
      },
      noneLeader: {
        display: '없음(N)',
        local: '없음',
        global: 'None'
      },
      yes: { display: '예(Y)', local: '예', global: 'Yes' },
      no: { display: '아니오(N)', local: '아니오', global: 'No' },
      block: { display: '블록(B)', local: '블록', global: 'Block' },
      mtext: {
        display: '여러 줄 문자(M)',
        local: '여러 줄 문자',
        global: 'Mtext'
      },
      none: { display: '없음(N)', local: '없음', global: 'None' }
    }
  },
  mleaderedit: {
    selectMLeader: '다중 지시선 선택',
    rejectMLeader: '다중 지시선을 선택해야 합니다.',
    arrowheadOrRemove: '지시선 화살촉 위치 지정 또는 [지시선 제거(R)]',
    selectLeaderToRemove: '제거할 지시선 지정 또는 Enter 키를 눌러 완료',
    cannotRemoveLast: '이 다중 지시선에서 마지막 지시선은 제거할 수 없습니다.',
    keywords: {
      remove: {
        display: '지시선 제거(R)',
        local: '제거',
        global: 'Remove'
      }
    }
  },
  mtext: {
    point: '여러 줄 문자 삽입점 지정'
  },
  bmpout: {
    boundsFirstCorner: '경계의 첫 번째 구석 지정',
    boundsSecondCorner: '반대 구석 지정',
    longSidePrompt: '긴 변의 크기(픽셀) 입력'
  },
  jpgout: {
    boundsFirstCorner: '경계의 첫 번째 구석 지정',
    boundsSecondCorner: '반대 구석 지정',
    longSidePrompt: '긴 변의 크기(픽셀) 입력'
  },
  pngout: {
    boundsFirstCorner: '경계의 첫 번째 구석 지정',
    boundsSecondCorner: '반대 구석 지정',
    longSidePrompt: '긴 변의 크기(픽셀) 입력'
  },
  imageattach: {
    insertionPoint: '삽입점 지정:',
    scale: '축척 비율 지정:',
    rotation: '회전 각도 지정:',
    invalidScale: '축척 비율은 0보다 커야 합니다.',
    decodeFailed: '선택한 이미지 파일을 읽지 못했습니다.'
  },
  insert: {
    blockName: '블록 이름 입력:',
    insertionPoint: '삽입점 지정:',
    scale: '축척 비율 지정:',
    rotation: '회전 각도 지정:',
    invalidScale: '축척 비율은 0보다 커야 합니다.',
    invalidBlockName: '잘못된 블록 이름입니다.',
    blockNotFound: '블록을 찾을 수 없습니다',
    xrefNotAllowed: '-INSERT로 외부 참조를 삽입할 수 없습니다.'
  },
  xattach: {
    insertionPoint: '삽입점 지정:',
    scale: '축척 비율 지정:',
    rotation: '회전 각도 지정:',
    invalidScale: '축척 비율은 0보다 커야 합니다.',
    unsupportedFile: 'DWG 또는 DXF 파일을 선택하십시오.',
    loading: '외부 참조를 로드하는 중...',
    loadFailed: '선택한 도면 파일을 읽지 못했습니다.'
  },
  point: {
    point: '점 지정'
  },
  polygon: {
    numberOfSides: '면의 수 입력',
    centerOrEdge: '폴리곤의 중심 지정 또는',
    radiusOrType: '옵션 입력',
    edgeStart: '모서리의 첫 번째 끝점 지정',
    edgeEnd: '모서리의 두 번째 끝점 지정',
    keywords: {
      edge: {
        display: '모서리(E)',
        local: '모서리',
        global: 'Edge'
      },
      inscribed: {
        display: '원에 내접(I)',
        local: '원에 내접',
        global: 'Inscribed'
      },
      circumscribed: {
        display: '원에 외접(C)',
        local: '원에 외접',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: '잘못된 면의 수입니다. 3에서 1024 사이의 정수를 입력하십시오.',
      radius: '잘못된 반지름입니다. 반지름은 0보다 커야 합니다.',
      edge: '잘못된 모서리입니다. 모서리 길이는 0보다 커야 합니다.'
    }
  },
  polyline: {
    firstPoint: '첫 번째 점 지정',
    nextPoint: '다음 점 지정 (또는 Enter 키를 눌러 완료)',
    nextPointWithOptions: '다음 점 지정 또는',
    nextPointWithArcOptions: '다음 점 지정 또는',
    keywords: {
      arc: {
        display: '호(A)',
        local: '호',
        global: 'Arc'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      close: {
        display: '닫기(C)',
        local: '닫기',
        global: 'Close'
      },
      line: {
        display: '선(L)',
        local: '선',
        global: 'Line'
      },
      angle: {
        display: '각도(A)',
        local: '각도',
        global: 'Angle'
      },
      center: {
        display: '중심(C)',
        local: '중심',
        global: 'Center'
      },
      secondPoint: {
        display: '두 번째 점(P)',
        local: '두 번째 점',
        global: 'SecondPoint'
      },
      radius: {
        display: '반지름(R)',
        local: '반지름',
        global: 'Radius'
      }
    },
    arcAngle: '호의 각도 지정',
    arcCenter: '중심점 지정',
    arcSecondPoint: '호 위의 두 번째 점 지정',
    arcEndPoint: '호의 끝점 지정',
    arcRadius: '호의 반지름 지정'
  },
  rect: {
    firstPoint: '첫 번째 구석점 지정',
    nextPoint: '다른 구석점 지정',
    firstPointWithOptions: '첫 번째 구석점 지정 또는',
    otherCornerWithOptions: '다른 구석점 지정 또는',
    chamferFirst: '첫 번째 모따기 거리 지정',
    chamferSecond: '두 번째 모따기 거리 지정',
    filletRadius: '모깎기 반지름 지정',
    segmentWidth: '직사각형의 선 폭 지정',
    elevationValue: '고도 지정',
    thicknessValue: '두께 지정',
    rotationAngle: '직사각형의 회전 각도 지정',
    dimensionLength: '직사각형의 길이 지정',
    dimensionWidth: '직사각형의 폭 지정',
    areaValue: '직사각형의 면적 지정',
    areaLengthOrWidth: '직사각형의 길이 지정',
    areaSpecifyWidth: '직사각형의 폭 지정',
    invalidPositive: '잘못된 입력입니다. 0보다 큰 값을 입력하십시오.',
    invalidRect:
      '직사각형을 만들 수 없습니다. 유효한 구석점 또는 치수를 지정하십시오.',
    thicknessNotSupported:
      '직사각형 두께는 현재 객체 데이터에 기록되지 않습니다. 두께 설정은 무시됩니다.',
    keywords: {
      chamfer: {
        display: '모따기(C)',
        local: '모따기',
        global: 'Chamfer'
      },
      elevation: {
        display: '고도(E)',
        local: '고도',
        global: 'Elevation'
      },
      fillet: {
        display: '모깎기(F)',
        local: '모깎기',
        global: 'Fillet'
      },
      thickness: {
        display: '두께(T)',
        local: '두께',
        global: 'Thickness'
      },
      width: {
        display: '폭(W)',
        local: '폭',
        global: 'Width'
      },
      area: {
        display: '면적(A)',
        local: '면적',
        global: 'Area'
      },
      dimensions: {
        display: '치수(D)',
        local: '치수',
        global: 'Dimensions'
      },
      rotation: {
        display: '회전(R)',
        local: '회전',
        global: 'Rotation'
      },
      length: {
        display: '길이(L)',
        local: '길이',
        global: 'Length'
      },
      rectWidth: {
        display: '폭(W)',
        local: '폭',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: '기준점 지정',
    rotationAngleOrOptions: '회전 각도 지정 또는',
    referenceAngleOrPoints: '참조 각도 지정 또는',
    firstReferencePoint: '참조 각도의 첫 번째 점 지정',
    secondReferencePoint: '두 번째 점 지정',
    newAngle: '새 각도 지정',
    keywords: {
      copy: {
        display: '복사(C)',
        local: '복사',
        global: 'Copy'
      },
      reference: {
        display: '참조(R)',
        local: '참조',
        global: 'Reference'
      },
      points: {
        display: '점(P)',
        local: '점',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: '잘못된 참조점: 점들은 서로 달라야 합니다.'
    }
  },
  revcloud: {
    firstCornerOrOptions: '첫 번째 구석점 지정 또는',
    firstCorner: '첫 번째 구석점 지정',
    oppositeCorner: '반대 구석 지정',
    startPoint: '시작점 지정',
    nextPoint: '다음 점 지정',
    nextPointOrUndo: '다음 점 지정 또는',
    firstPoint: '첫 번째 점 지정',
    guideCursor: '구름 경로를 따라 커서 안내 (Enter 키를 눌러 완료)',
    arcLength: '호 길이 지정',
    selectObject: '객체 선택',
    style: '구름형 수정 기호 호 스타일 입력',
    reverseDirection: '방향 반전',
    invalidArcLength: '호 길이는 0보다 커야 합니다.',
    invalidObject: '선택한 객체는 구름형 수정 기호로 변환할 수 없습니다.',
    keywords: {
      arcLength: {
        display: '호 길이(A)',
        local: '호 길이',
        global: 'ArcLength'
      },
      object: {
        display: '객체(O)',
        local: '객체',
        global: 'Object'
      },
      rectangular: {
        display: '직사각형(R)',
        local: '직사각형',
        global: 'Rectangular'
      },
      polygonal: {
        display: '폴리곤(P)',
        local: '폴리곤',
        global: 'Polygonal'
      },
      freehand: {
        display: '프리핸드(F)',
        local: '프리핸드',
        global: 'Freehand'
      },
      style: {
        display: '스타일(S)',
        local: '스타일',
        global: 'Style'
      },
      normal: {
        display: '일반(N)',
        local: '일반',
        global: 'Normal'
      },
      calligraphy: {
        display: '컬리그래피(C)',
        local: '컬리그래피',
        global: 'Calligraphy'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      yes: {
        display: '예(Y)',
        local: '예',
        global: 'Yes'
      },
      no: {
        display: '아니오(N)',
        local: '아니오',
        global: 'No'
      }
    }
  },
  sketch: {
    specifySketch: '스케치 지정 또는',
    sketching: '포인터를 움직여 스케치 (클릭하거나 Enter 키를 눌러 중지)',
    type: '스케치 유형 입력',
    increment: '스케치 증분 지정',
    tolerance: '스플라인 공차 지정',
    firstPoint: '첫 번째 점 지정',
    nextPoint: '끝점 지정',
    keywords: {
      type: {
        display: '유형(T)',
        local: '유형',
        global: 'Type'
      },
      increment: {
        display: '증분(I)',
        local: '증분',
        global: 'Increment'
      },
      tolerance: {
        display: '공차(L)',
        local: '공차',
        global: 'Tolerance'
      },
      line: {
        display: '선(L)',
        local: '선',
        global: 'Lines'
      },
      polyline: {
        display: '폴리선(P)',
        local: '폴리선',
        global: 'Polyline'
      },
      spline: {
        display: '스플라인(S)',
        local: '스플라인',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: '첫 번째 점 지정',
    nextPoint: '다음 점 지정 (또는 Enter 키를 눌러 완료)',
    firstPointWithOptions: '첫 번째 점 지정 또는',
    nextPointWithFitOptions: '다음 점 입력 또는',
    nextPointWithCvOptions: '다음 조정 정점 입력 또는',
    methodPrompt: '스플라인 작성 방식 입력',
    knotsPrompt: '매듭 매개변수화 입력',
    degreePrompt: '스플라인 차수 지정',
    keywords: {
      method: {
        display: '방식(M)',
        local: '방식',
        global: 'Method'
      },
      fit: {
        display: '맞춤(F)',
        local: '맞춤',
        global: 'Fit'
      },
      cv: {
        display: '조정 정점(C)',
        local: '조정 정점',
        global: 'CV'
      },
      knots: {
        display: '매듭(K)',
        local: '매듭',
        global: 'Knots'
      },
      degree: {
        display: '차수(D)',
        local: '차수',
        global: 'Degree'
      },
      undo: {
        display: '명령 취소(U)',
        local: '명령 취소',
        global: 'Undo'
      },
      close: {
        display: '닫기(C)',
        local: '닫기',
        global: 'Close'
      },
      chord: {
        display: '현(C)',
        local: '현',
        global: 'Chord'
      },
      sqrtChord: {
        display: '제곱근(S)',
        local: '제곱근',
        global: 'SqrtChord'
      },
      uniform: {
        display: '균일(U)',
        local: '균일',
        global: 'Uniform'
      }
    }
  },
  objectscale: {
    action: '옵션 입력',
    scaleName: '주석 축척 이름 입력',
    done: '업데이트한 객체',
    none: '(없음)',
    keywords: {
      add: {
        display: '추가(A)',
        local: '추가',
        global: 'Add'
      },
      delete: {
        display: '삭제(D)',
        local: '삭제',
        global: 'Delete'
      },
      list: {
        display: '리스트(L)',
        local: '리스트',
        global: 'List'
      }
    }
  },
  sysvar: {
    prompt: '새 값 입력'
  },
  view: {
    enterName: '복원할 뷰 이름 입력',
    notFound: '뷰 "{name}"을(를) 찾을 수 없습니다.'
  },
  zoom: {
    mainPrompt: '윈도우 구석 지정 또는',
    firstCorner: '첫 번째 구석 지정',
    secondCorner: '반대 구석 지정',
    centerPoint: '중심점 지정',
    heightOrScale: '높이 또는 축척 비율 입력 (nX 또는 nXP)',
    scaleFactor: '축척 비율 입력 (nX 또는 nXP)',
    keywords: {
      all: {
        display: '전체(A)',
        local: '전체',
        global: 'All'
      },
      center: {
        display: '중심(C)',
        local: '중심',
        global: 'Center'
      },
      extents: {
        display: '범위(E)',
        local: '범위',
        global: 'Extents'
      },
      previous: {
        display: '이전(P)',
        local: '이전',
        global: 'Previous'
      },
      original: {
        display: '원래(O)',
        local: '원래',
        global: 'Original'
      },
      saved: {
        display: '저장된 뷰(V)',
        local: '저장된 뷰',
        global: 'Saved'
      },
      smart: {
        display: '스마트(I)',
        local: '스마트',
        global: 'Smart'
      },
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      window: {
        display: '윈도우(W)',
        local: '윈도우',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportFormat: '내보내기 형식',
    exportInvisibleLayers: '보이지 않는 도면층 내보내기',
    exportLayouts: '배치 내보내기',
    exportEmptyLayouts: '빈 배치 내보내기',
    background: '배경색',
    initialView: 'HTML을 열 때의 초기 뷰',
    viewerMode: '오프라인 뷰어 모드',
    chunkSizeMiB: '청크 크기(MiB) (다중 파일 패키지)',
    compressChunks: '청크 압축 (다중 파일 패키지)',
    keywords: {
      single: {
        display: '단일 파일(S)',
        local: '단일 파일',
        global: 'Single'
      },
      multi: {
        display: '다중 파일 패키지(M)',
        local: '다중 파일 패키지',
        global: 'Multi'
      },
      yes: {
        display: '예(Y)',
        local: '예',
        global: 'Yes'
      },
      no: {
        display: '아니오(N)',
        local: '아니오',
        global: 'No'
      },
      extents: {
        display: '범위(E)',
        local: '범위',
        global: 'Extents'
      },
      current: {
        display: '현재(C)',
        local: '현재',
        global: 'Current'
      },
      view: {
        display: '보기(V)',
        local: '보기',
        global: 'View'
      },
      measure: {
        display: '측정 및 검토(M)',
        local: '측정 및 검토',
        global: 'Measure'
      },
      black: {
        display: '검은색(B)',
        local: '검은색',
        global: 'Black'
      },
      white: {
        display: '흰색(W)',
        local: '흰색',
        global: 'White'
      },
      space: {
        display: '공간(S)',
        local: '공간',
        global: 'Space'
      }
    }
  },
  cpdf: {
    modelSpaceFit: '모형 공간 프레임',
    exportLayouts: '배치 내보내기',
    exportEmptyLayouts: '빈 배치 내보내기',
    textMode: '문자 렌더링',
    colorMode: '색상 모드',
    keywords: {
      extents: {
        display: '범위(E)',
        local: '범위',
        global: 'Extents'
      },
      display: {
        display: '화면 표시(D)',
        local: '화면 표시',
        global: 'Display'
      },
      text: {
        display: '문자(T)',
        local: '문자',
        global: 'Text'
      },
      vector: {
        display: '벡터(V)',
        local: '벡터',
        global: 'Vector'
      },
      yes: {
        display: '예(Y)',
        local: '예',
        global: 'Yes'
      },
      no: {
        display: '아니오(N)',
        local: '아니오',
        global: 'No'
      },
      color: {
        display: '색상(C)',
        local: '색상',
        global: 'Color'
      },
      monochrome: {
        display: '단색(M)',
        local: '단색',
        global: 'Monochrome'
      }
    }
  },
  ucs: {
    originOrOptions: 'UCS의 원점 지정 또는',
    pointOnXAxis: 'X축 위의 점 지정 또는',
    pointOnXyPlane: 'XY 평면 위의 점 지정 또는',
    rotationAngle: '{axis}축을 중심으로 회전 각도 지정',
    zAxisOrigin: '새 원점 지정',
    pointOnZAxis: 'Z축의 양의 부분에 있는 점 지정',
    selectObject: 'UCS를 정렬할 객체 선택',
    namedOption: '옵션 입력',
    enterName: '복원할 UCS 이름 입력 또는 [?]',
    saveName: '현재 UCS를 저장할 이름 입력',
    deleteName: '삭제할 UCS 이름 입력',
    noPrevious: '이 세션에 이전 UCS가 없습니다.',
    noNamed: '이름이 지정된 UCS 정의가 없습니다.',
    notFound: 'UCS "{name}"을(를) 찾을 수 없습니다.',
    invalidName: '잘못된 UCS 이름입니다.',
    invalidObject: '선택한 객체에 UCS를 정렬할 수 없습니다.',
    keywords: {
      named: {
        display: '이름(A)',
        local: '이름',
        global: 'Named'
      },
      object: {
        display: '객체(B)',
        local: '객체',
        global: 'Object'
      },
      previous: {
        display: '이전(P)',
        local: '이전',
        global: 'Previous'
      },
      view: {
        display: '뷰(V)',
        local: '뷰',
        global: 'View'
      },
      world: {
        display: '표준(W)',
        local: '표준',
        global: 'World'
      },
      x: {
        display: 'X',
        local: 'X',
        global: 'X'
      },
      y: {
        display: 'Y',
        local: 'Y',
        global: 'Y'
      },
      z: {
        display: 'Z',
        local: 'Z',
        global: 'Z'
      },
      zAxis: {
        display: 'Z축(N)',
        local: 'Z축',
        global: 'ZAxis'
      },
      apply: {
        display: '적용(L)',
        local: '적용',
        global: 'Apply'
      },
      restore: {
        display: '복원(R)',
        local: '복원',
        global: 'Restore'
      },
      save: {
        display: '저장(S)',
        local: '저장',
        global: 'Save'
      },
      delete: {
        display: '삭제(D)',
        local: '삭제',
        global: 'Delete'
      },
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      }
    }
  },
  group: {
    selectOrOption: '객체를 선택하거나',
    createOrOption: '그룹을 만들거나',
    selectObjects: '그룹 객체를 선택',
    enterName: '그룹 이름 입력',
    enterDescription: '그룹 설명 입력',
    invalidName: '잘못된 그룹 이름입니다',
    nameExists: '그룹 이름이 이미 있습니다',
    created: '그룹 {name}을(를) 만들었습니다',
    keywords: {
      name: {
        display: '이름(N)',
        local: '이름',
        global: 'Name'
      },
      description: {
        display: '설명(D)',
        local: '설명',
        global: 'Description'
      }
    }
  },
  ungroup: {
    selectOrOption: '그룹을 선택하거나',
    selectGroup: '그룹 선택',
    enterName: '그룹 이름 입력',
    notFound: '그룹을 찾을 수 없습니다',
    notInGroup: '객체가 그룹의 구성원이 아닙니다',
    multiGroup: '객체가 여러 그룹에 속해 있습니다 [{name}]',
    exploded: '그룹 {name}을(를) 분해했습니다',
    explodedCount: '{count}개의 그룹을 분해했습니다',
    keywords: {
      name: {
        display: '이름(N)',
        local: '이름',
        global: 'Name'
      },
      all: {
        display: '모두(A)',
        local: '모두',
        global: 'All'
      },
      accept: {
        display: '수락(A)',
        local: '수락',
        global: 'Accept'
      },
      next: {
        display: '다음(N)',
        local: '다음',
        global: 'Next'
      }
    }
  },
  groupedit: {
    selectGroup: '그룹 선택',
    enterName: '그룹 이름 입력',
    notFound: '그룹을 찾을 수 없습니다',
    multiGroup: '객체가 여러 그룹에 속해 있습니다 [{name}]',
    action: '그룹 {name}에 대한 옵션 입력',
    selectToAdd: '그룹에 추가할 객체 선택',
    selectToRemove: '그룹에서 제거할 객체 선택',
    newName: '새 그룹 이름 입력',
    keywords: {
      add: {
        display: '객체 추가(A)',
        local: '추가',
        global: 'Add'
      },
      remove: {
        display: '객체 제거(R)',
        local: '제거',
        global: 'Remove'
      },
      rename: {
        display: '이름 바꾸기(N)',
        local: '이름 바꾸기',
        global: 'Rename'
      },
      accept: {
        display: '수락(A)',
        local: '수락',
        global: 'Accept'
      },
      next: {
        display: '다음(N)',
        local: '다음',
        global: 'Next'
      }
    }
  },
  dashgroup: {
    option: '옵션 입력',
    empty: '정의된 그룹이 없습니다',
    listEntry: '{name}  {description}  [{selectable}]  ({count})',
    yes: '예',
    no: '아니요',
    enterNameOrBlank:
      '그룹 이름을 입력하거나 이름 없는 그룹은 Enter를 누르십시오',
    enterGroupName: '그룹 이름 입력',
    selectableSet: '그룹 {name} 선택 가능 = {value}',
    orderOption: '순서 옵션 입력',
    fromPosition: '재정렬할 객체의 위치 번호 입력 (0부터)',
    toPosition: '객체의 새 위치 번호 입력 (0부터)',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      create: {
        display: '만들기(C)',
        local: '만들기',
        global: 'Create'
      },
      add: {
        display: '추가(A)',
        local: '추가',
        global: 'Add'
      },
      remove: {
        display: '제거(R)',
        local: '제거',
        global: 'Remove'
      },
      explode: {
        display: '분해(X)',
        local: '분해',
        global: 'Explode'
      },
      rename: {
        display: '이름 바꾸기(N)',
        local: '이름 바꾸기',
        global: 'Rename'
      },
      selectable: {
        display: '선택 가능(S)',
        local: '선택 가능',
        global: 'Selectable'
      },
      order: {
        display: '순서(O)',
        local: '순서',
        global: 'Order'
      },
      reverse: {
        display: '반전(R)',
        local: '반전',
        global: 'Reverse'
      },
      position: {
        display: '위치(P)',
        local: '위치',
        global: 'Position'
      }
    }
  },
  pdfimport: {
    pageNumber: '페이지 번호 입력 (1-{count})',
    insertionPoint: '삽입점 지정 (축척 {scale}, 모드 {mode}) 또는',
    modePrompt: '가져오기 방식 선택',
    modeRecover: '도면 복원',
    modeVisual: 'PDF 모양 유지',
    scaleFactor: '축척 비율 입력',
    keywords: {
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      mode: {
        display: '모드(M)',
        local: '모드',
        global: 'Mode'
      },
      recover: {
        display: '복원(R)',
        local: '복원',
        global: 'Recover'
      },
      visual: {
        display: '시각(V)',
        local: '시각',
        global: 'Visual'
      }
    },
    pickInsertionPoint: '삽입점 지정',
    dialog: {
      title: 'PDF 가져오기',
      close: '닫기',
      fileName: '파일 이름:',
      browse: '찾아보기...',
      pagesGroup: '가져올 페이지',
      page: '페이지:',
      total: '합계: {count}',
      singleView: '페이지 미리보기 표시',
      gridView: '페이지 축소판 표시',
      pageLabel: '페이지 {page}',
      pageSize: '페이지 크기: {width} × {height} mm ({widthIn} × {heightIn} 인치)',
      previewError: '미리보기를 표시할 수 없음',
      positionGroup: '위치',
      onScreen: '화면상에 삽입점 지정',
      x: 'X:',
      y: 'Y:',
      scale: '축척:',
      modeGroup: '가져오기 모드',
      modeRecover: '도면 복원',
      recoverHint: '원, 호, 곡선, 문자, 해치 및 블록을 재구성합니다',
      modeVisual: 'PDF 모양 유지',
      visualHint: 'PDF에 그려진 그대로 경로와 문자를 가져옵니다',
      ok: '확인',
      cancel: '취소'
    }
  },
  pdfdim: {
    cancelled: '치수 인식을 취소했습니다. 변경된 내용이 없습니다.',
    noDimensions:
      '선택 영역에서 치수를 찾지 못했습니다 (화살표 또는 사선, 치수선, 숫자 문자가 필요합니다).',
    summary:
      '치수 {count}개를 변환했습니다. 치수 스타일 {style}의 선형 축척 비율은 {scale}입니다.',
    panel: {
      title: '치수 인식',
      style: '치수 스타일',
      dimStyle: '스타일',
      newStyle: '새 치수 스타일…',
      newStyleName: '새 치수 스타일 이름',
      createStyle: '만들기',
      nameEmpty: '이름을 입력하십시오.',
      nameInvalid: '이름에 사용할 수 없는 문자가 있습니다.',
      nameExists: '같은 이름의 치수 스타일이 이미 있습니다.',
      scale: '도면 축척',
      stylePreview: '선택한 치수 스타일 미리보기(인식된 크기 반영)',
      dimensions: '치수',
      selectHint: '치수를 선택하면 해당 위치로 확대됩니다. 적용 전에 값을 수정할 수 있습니다.',
      empty: '선택 영역에서 치수를 찾지 못했습니다.',
      include: '이 치수 변환',
      kindLinear: '선형',
      kindRadius: '반지름',
      kindDiameter: '지름',
      kindAngular: '각도',
      textTip: '치수 문자(재정의)',
      measured: '측정값 {value}',
      hideStrokes: '원본 선 숨기기',
      ready: '{ready}/{count}개 치수 준비됨',
      cancel: '취소',
      apply: '적용'
    }
  },
  pdfhatch: {
    cancelled: '해치 인식을 취소했습니다. 변경된 내용이 없습니다.',
    pickPoint: '해치할 영역 내부의 점 지정',
    panel: {
      title: '해치 인식',
      hatches: '해치',
      addArea: '영역 추가',
      addAreaTip: '인식되지 않은 영역 내부의 점을 지정하면 그 안의 선에 가장 알맞은 패턴을 맞춥니다.',
      picking: '도면에서 영역 내부의 점을 지정하십시오…',
      noBoundary: '그 점 주위에서 닫힌 영역을 찾지 못했습니다.',
      noStrokes: '그 영역에서 규칙적인 패턴을 찾지 못했습니다.',
      empty: '해치를 찾지 못했습니다. "영역 추가"로 지정하십시오.',
      include: '이 해치 변환',
      addedTag: '추가됨',
      entities: '객체 {count}개',
      selectHint: '해치를 선택하면 패턴, 축척, 각도를 변경할 수 있습니다.',
      ownGroup: '측정 / 사용자 정의',
      libraryGroup: '미리 정의됨',
      pattern: '패턴',
      scale: '축척',
      spacing: '간격',
      angle: '각도',
      autoFit: '자동 맞춤',
      autoFitTip: '선에서 이 패턴의 축척, 각도, 원점을 다시 측정합니다.',
      match: '선 위의 패턴: {precision} · 다시 그려진 선: {recall}',
      noEntities: '이 패턴으로 완전히 다시 그려지는 객체가 없어 아무것도 대체되지 않습니다.',
      guessed: '선에서 이 패턴의 흔적을 찾지 못했습니다. 축척과 각도는 추정값입니다.',
      poorMatch: '일치도 낮음: 해치가 다시 그리지 못한 선은 그대로 유지됩니다.',
      userSingle: '사용자 정의',
      userDouble: '사용자 정의 (이중)',
      measured: '측정된 패턴',
      hideStrokes: '원래 선 숨기기',
      ready: '해치 {count}개 중 {ready}개 준비됨',
      cancel: '취소',
      apply: '적용'
    },
    noHatches: '선택 영역에서 해치를 찾지 못했습니다 (규칙적인 평행 선분과 그 경계선이 필요합니다).',
    summary: '해치 {count}개를 변환했습니다 ({patterns}). 객체 {strokes}개를 대체했습니다.'
  },
  bsearch: {
    unsupported:
      '선택한 객체 중 일치시킬 수 있는 객체가 없습니다(선, 호, 원, 폴리선, 타원, 스플라인, 문자, 여러 줄 문자, 블록 참조 지원).',
    skipped: '선택한 객체 {count}개는 일치시킬 수 없어 무시됩니다.',
    found:
      '일치하는 인스턴스 {count}개를 찾았습니다({included}개 변환 예정). 선택',
    noMatches: '다른 인스턴스를 찾지 못했습니다.',
    reviewOne: '인스턴스 {index}/{count} ({state})',
    included: '포함됨',
    excluded: '제외됨',
    options:
      '회전 {rotation}, 대칭 {mirror}, 축척 {scale}, 같은 도면층 {layer}, 기존 블록 {blocks}, 문자 변형 {text}. 전환',
    on: '켜기',
    off: '끄기',
    target: '변환 대상',
    name: '새 블록 이름 입력',
    nameExists: '"{name}" 블록이 이미 있습니다.',
    nameInvalid: '"{name}"은(는) 유효한 블록 이름이 아닙니다.',
    basePoint: '삽입점 지정',
    attributeTag: '문자 "{text}"의 속성 태그 입력',
    existingName: '기존 블록 이름 입력',
    blockNotFound: '"{name}" 블록을 찾을 수 없습니다.',
    rotation: '블록의 회전 각도 지정',
    scale: '블록의 축척 비율 지정',
    scope:
      '찾은 인스턴스 {count}개도 변환하시겠습니까, 아니면 원본 객체만 변환하시겠습니까?',
    summary: '블록 "{name}"(으)로 변환했습니다: 참조 {count}개.',
    keywords: {
      convert: {
        display: '변환(C)',
        local: '변환',
        global: 'Convert'
      },
      review: {
        display: '검토(R)',
        local: '검토',
        global: 'Review'
      },
      options: {
        display: '옵션(O)',
        local: '옵션',
        global: 'Options'
      },
      exit: {
        display: '종료(X)',
        local: '종료',
        global: 'eXit'
      },
      include: {
        display: '포함(I)',
        local: '포함',
        global: 'Include'
      },
      exclude: {
        display: '제외(E)',
        local: '제외',
        global: 'Exclude'
      },
      next: {
        display: '다음(N)',
        local: '다음',
        global: 'Next'
      },
      previous: {
        display: '이전(P)',
        local: '이전',
        global: 'Previous'
      },
      done: {
        display: '완료(D)',
        local: '완료',
        global: 'Done'
      },
      rotation: {
        display: '회전(R)',
        local: '회전',
        global: 'Rotation'
      },
      mirror: {
        display: '대칭(M)',
        local: '대칭',
        global: 'Mirror'
      },
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      layer: {
        display: '도면층(L)',
        local: '도면층',
        global: 'Layer'
      },
      blocks: {
        display: '블록(B)',
        local: '블록',
        global: 'Blocks'
      },
      text: {
        display: '문자(T)',
        local: '문자',
        global: 'Text'
      },
      new: {
        display: '새로 만들기(N)',
        local: '새로 만들기',
        global: 'New'
      },
      existing: {
        display: '기존(E)',
        local: '기존',
        global: 'Existing'
      },
      instances: {
        display: '인스턴스(I)',
        local: '인스턴스',
        global: 'Instances'
      },
      source: {
        display: '원본 객체(S)',
        local: '원본 객체',
        global: 'Source'
      }
    }
  },
  pdfblock: {
    keywords: {
      yes: {
        display: '예(Y)',
        local: '예',
        global: 'Yes'
      },
      no: {
        display: '아니요(N)',
        local: '아니요',
        global: 'No'
      },
      review: {
        display: '개별 확인(R)',
        local: '개별 확인',
        global: 'Review'
      },
      all: {
        display: '모두(A)',
        local: '모두',
        global: 'All'
      },
      exit: {
        display: '종료(X)',
        local: '종료',
        global: 'eXit'
      }
    }
  },
  pdftext: {
    panel: {
      title: '문자 인식',
      shxGroup: 'SHX 문자(선 글꼴)',
      meshGroup: 'TrueType 문자(윤곽선 글꼴)',
      style: '문자 스타일',
      newStyle: '새 문자 스타일…',
      newTag: '새로 만들기',
      newStyleName: '새 문자 스타일 이름',
      create: '만들기',
      cancel: '취소',
      apply: '적용',
      nameError: {
        empty: '이름을 입력하십시오.',
        invalid: '이름에 사용할 수 없는 문자가 있습니다.',
        exists: '같은 이름의 문자 스타일이 이미 있습니다.'
      },
      font: '글꼴',
      bigFont: '큰 글꼴',
      noBigFont: '(없음)',
      shxFonts: 'SHX 글꼴',
      ttfFonts: 'TrueType 글꼴',
      fontsUsed: '사용 글꼴: {fonts}',
      fontMissing: '"{font}" 글꼴을 사용할 수 없어 "{fallback}"(으)로 표시됩니다.',
      fontNotShx: 'TrueType 글꼴입니다. SHX 선 문자처럼 보이지 않습니다.',
      fontNotTtf: 'SHX 글꼴입니다. TrueType 윤곽선 문자처럼 보이지 않습니다.',
      styleChanges: '문자 스타일 "{style}"의 글꼴을 변경합니다. 이 스타일을 사용하는 기존 문자도 바뀝니다.',
      heightScale: '높이 축척',
      widthFactor: '폭 비율',
      autoWidth: '원래 폭에 맞춤',
      lines: '문자 행',
      include: '이 행 변환',
      textPlaceholder: '문자를 입력하십시오(비워 두면 건너뜀)',
      switchKind: 'SHX 문자와 TrueType 문자 간 전환',
      kind: {
        shx: 'SHX',
        mesh: 'TrueType'
      },
      source: {
        dictionary: '학습됨',
        ocr: 'OCR',
        typed: '편집됨',
        unread: '인식 안 됨'
      },
      hideStrokes: '원래 선 숨기기',
      ready: '{count}개 행 중 {ready}개 준비됨',
      merge: '여러 줄 문자로 결합',
      mergeTip: '선택한 행을 하나의 여러 줄 문자(MTEXT)로 결합합니다',
      split: '분할',
      splitTip: '선택한 결합 문자를 원래 행으로 분할합니다',
      mergeAdjacent: '인접 문자 결합',
      mergeAdjacentTip: '같은 기준선에서 서로 인접한 문자와 단어를 여러 줄 문자로 결합합니다',
      mergedCount: '여러 줄 문자 {count}개로 결합했습니다.',
      selectHint: 'Ctrl+클릭 또는 Shift+클릭으로 여러 행을 선택할 수 있습니다.',
      mtextTag: '여러 줄 문자'
    },
    cancelled: '문자 인식을 취소했습니다. 변경된 내용이 없습니다.',
    ocrNotConfigured:
      '문자 인식(OCR)이 꺼져 있습니다. 이미지를 지원하는 AI 모델이 설정되지 않았습니다. LLMSETTINGS를 실행하여 설정하십시오.',
    recognizing: '문자 {count}줄을 인식하는 중…',
    ocrFailed:
      '문자 인식(OCR)에 실패했습니다: {message}. 문자를 직접 입력하거나 LLMSETTINGS를 실행하여 AI 모델 설정을 확인하십시오.',
    noCandidates: '선택 항목에서 문자처럼 보이는 획을 찾지 못했습니다.',
    summary: '{converted}줄 변환 ({automatic}줄 자동 인식), {skipped}줄 건너뜀.'
  },
  pdfscale: {
    firstPoint: '알려진 거리의 첫 번째 점 지정',
    secondPoint: '두 번째 점 지정',
    realLength: '실제 길이 입력 (측정값 {measured})',
    realLengthFromDimensions:
      '실제 길이 입력 (측정값 {measured}, 치수 문자 기준 축척 1:{scale})',
    zeroDistance: '두 점이 같습니다.',
    applied: '{count}개 객체를 {factor} 배로 축척했습니다.'
  }
}
