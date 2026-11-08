import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
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
