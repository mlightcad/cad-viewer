import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    classicgroup: {
      description: '객체 그룹 대화상자를 열어 그룹을 만들고 관리합니다'
    }
  }
}
