import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    bsearch: {
      description: 'スマート ブロック：同一のジオメトリを検索してブロックに変換します',
      prompt: '検索するオブジェクトを選択'
    },
    classicgroup: {
      description:
        'オブジェクトグループダイアログを開き、グループを作成および管理します'
    }
  }
}
