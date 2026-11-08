import enMain from '../en/main'

export default {
  ...enMain,
  ribbon: {
    ...enMain.ribbon,
    group: {
      ...enMain.ribbon.group,
      groups: '그룹'
    },
    tooltip: {
      ...enMain.ribbon.tooltip,
      group: '선택한 객체에서 그룹을 만듭니다(GROUP).',
      ungroup: '그룹 정의를 분해합니다(UNGROUP).',
      groupEdit:
        '그룹 구성원을 추가, 제거하거나 이름을 바꿉니다(GROUPEDIT).',
      groupSelect:
        '그룹 선택을 켜거나 끕니다(PICKSTYLE 그룹 비트).',
      classicGroup: '객체 그룹 대화상자를 엽니다(CLASSICGROUP).'
    },
    command: {
      ...enMain.ribbon.command,
      group: '그룹',
      ungroup: '그룹 해제',
      groupEdit: '그룹 편집',
      groupSelect: '그룹 선택 켜기/끄기',
      classicGroup: '그룹 관리자'
    }
  }
}
