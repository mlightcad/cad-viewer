import enJig from '../en/jig'

export default {
  ...enJig,
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
  ipdf: {
    pageNumber: '페이지 번호 입력 (1-{count})',
    insertionPoint:
      '삽입점 지정 (축척 {scale}, 모드 {mode}) 또는',
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
    }
  },
  pdfdim: {
    noDimensions: '선택 영역에서 치수를 찾지 못했습니다 (화살표 또는 사선, 치수선, 숫자 문자가 필요합니다).',
    convertAll: '치수 {count}개를 찾았습니다 (도면 축척 1:{scale}). 변환하시겠습니까?',
    convertOne: '치수 {index}/{count} "{text}": 변환하시겠습니까?',
    summary: '치수 {count}개를 변환했습니다. 치수 스타일 PDF_DIM의 선형 축척 비율은 {scale}입니다.'
  },
  pdfblock: {
    basePoint: '블록 기준점 지정 (축척이 다른 사본도 일치: {scale}) 또는',
    scaleOn: '켜기',
    scaleOff: '끄기',
    name: '블록 이름 입력',
    nameExists: '"{name}" 블록이 이미 있습니다.',
    unsupported: '선택한 객체를 일치시킬 수 없습니다 (선, 호, 원, 폴리선, 타원, 스플라인, 문자 지원).',
    noCopies: '다른 사본을 찾지 못했습니다. 선택한 객체만 블록이 됩니다.',
    replaceAll: '일치하는 사본 {count}개를 찾았습니다. 블록 참조로 바꾸시겠습니까?',
    replaceOne: '사본 {index}/{count}: 블록 참조로 바꾸시겠습니까?',
    summary: '블록 "{name}"을(를) 만들었습니다 (참조 {count}개).',
    keywords: {
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
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
    enterText:
      '문자 줄 {index}/{count}: 강조 표시된 문자 입력 (비워 두면 건너뛰기, Esc 종료)',
    enterTextWithSuggestion:
      '문자 줄 {index}/{count}: 강조 표시된 문자 입력',
    noCandidates: '선택 항목에서 문자처럼 보이는 획을 찾지 못했습니다.',
    summary:
      '{converted}줄 변환 ({automatic}줄 자동 인식), {skipped}줄 건너뜀.'
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
