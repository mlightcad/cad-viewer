import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    bsearch: {
      description: '스마트 블록: 동일한 형상을 찾아 블록으로 변환합니다',
      prompt: '검색할 객체 선택'
    },
    classicgroup: {
      description: '객체 그룹 대화상자를 열어 그룹을 만들고 관리합니다'
    }
  }
}
