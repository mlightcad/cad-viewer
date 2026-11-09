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
      '삽입점 지정 (축척 {scale}, 곡선 인식 {curves}) 또는',
    curvesOn: '켜기',
    curvesOff: '끄기',
    scaleFactor: '축척 비율 입력',
    keywords: {
      scale: {
        display: '축척(S)',
        local: '축척',
        global: 'Scale'
      },
      curves: {
        display: '곡선(C)',
        local: '곡선',
        global: 'Curves'
      }
    }
  },
  pdftext: {
    enterText:
      '문자 줄 {index}/{count}: 강조 표시된 문자 입력 (Enter 건너뛰기, Esc 종료)',
    enterTextWithSuggestion:
      '문자 줄 {index}/{count}: 강조 표시된 문자 입력 <{suggestion}>',
    noCandidates: '선택 항목에서 문자처럼 보이는 획을 찾지 못했습니다.',
    summary:
      '{converted}줄 변환 ({automatic}줄 자동 인식), {skipped}줄 건너뜀.'
  },
  pdfscale: {
    firstPoint: '알려진 거리의 첫 번째 점 지정',
    secondPoint: '두 번째 점 지정',
    realLength: '실제 길이 입력 (측정값 {measured})',
    zeroDistance: '두 점이 같습니다.',
    applied: '{count}개 객체를 {factor} 배로 축척했습니다.'
  }
}
