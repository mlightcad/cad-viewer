import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    pdfdim: {
      description: 'PDF에서 분해된 치수를 치수 객체로 되돌립니다',
      prompt: '치수가 있는 영역 선택'
    },
    pdfblock: {
      description: 'PDF의 반복 형상을 블록으로 되돌립니다',
      prompt: '블록 인스턴스 하나의 객체 선택'
    },
    pdftext: {
      description: 'PDF에서 분해된 문자 획을 문자 객체로 되돌립니다',
      prompt: '변환할 문자 획 선택'
    },
    pdfscale: {
      description: '알려진 거리로 가져온 PDF 형상의 축척을 보정합니다',
      prompt: '축척할 객체 선택'
    },
    group: {
      description: '그룹이라고 하는 저장된 객체 집합을 만들고 관리합니다'
    },
    '-group': {
      description: '명령행 옵션으로 그룹을 만들고 관리합니다'
    },
    groupedit: {
      description: '그룹에 객체를 추가하거나 제거하거나 그룹 이름을 바꿉니다'
    },
    ungroup: {
      description: '객체와 그룹의 연결을 해제합니다'
    }
  }
}
