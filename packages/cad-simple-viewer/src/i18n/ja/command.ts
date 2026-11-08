import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    group: {
      description: 'グループと呼ばれるオブジェクトの保存セットを作成および管理します'
    },
    '-group': {
      description: 'コマンドラインオプションでグループを作成および管理します'
    },
    groupedit: {
      description: 'グループにオブジェクトを追加・削除するか、グループ名を変更します'
    },
    ungroup: {
      description: 'オブジェクトとグループの関連付けを解除します'
    }
  }
}
