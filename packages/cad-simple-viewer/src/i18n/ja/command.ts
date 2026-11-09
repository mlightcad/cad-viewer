import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    pdfscale: {
      description: '既知の距離から読み込んだ PDF 図形の尺度を校正します',
      prompt: '尺度変更するオブジェクトを選択'
    },
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
