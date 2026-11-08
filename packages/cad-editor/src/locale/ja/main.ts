import enMain from '../en/main'

export default {
  ...enMain,
  ribbon: {
    ...enMain.ribbon,
    group: {
      ...enMain.ribbon.group,
      groups: 'グループ'
    },
    tooltip: {
      ...enMain.ribbon.tooltip,
      group: '選択したオブジェクトからグループを作成します (GROUP)。',
      ungroup: 'グループ定義を分解します (UNGROUP)。',
      groupEdit:
        'グループメンバの追加、削除、または名前変更を行います (GROUPEDIT)。',
      groupSelect:
        'グループ選択のオン/オフを切り替えます (PICKSTYLE グループビット)。',
      classicGroup:
        'オブジェクトグループダイアログを開きます (CLASSICGROUP)。'
    },
    command: {
      ...enMain.ribbon.command,
      group: 'グループ',
      ungroup: 'グループ解除',
      groupEdit: 'グループ編集',
      groupSelect: 'グループ選択 オン/オフ',
      classicGroup: 'グループ管理'
    }
  }
}
