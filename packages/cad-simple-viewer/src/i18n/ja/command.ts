import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    pdfdim: {
      description: 'PDF で分解された寸法を寸法オブジェクトに戻します',
      prompt: '寸法を含む範囲を選択'
    },
    pdfblock: {
      description: 'PDF の繰り返し図形をブロックに戻します',
      prompt: 'ブロック 1 個分のオブジェクトを選択'
    },
    pdftext: {
      description: 'PDF で分解された文字のストロークを文字オブジェクトに戻します',
      prompt: '変換する文字ストロークを選択'
    },
    pdfscale: {
      description: '既知の距離から読み込んだ PDF 図形の尺度を校正します',
      prompt: '尺度変更するオブジェクトを選択'
    },
    group: {
      description: 'グループと呼ばれるオブジェクトの保存セットを作成および管理します'
    },
    '-bsearch': {
      description: '同一のジオメトリを検索してブロックに変換します（コマンドライン）',
      prompt: '検索するオブジェクトを選択'
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
