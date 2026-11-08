import enDialog from '../en/dialog'

export default {
  ...enDialog,
  classicGroupDlg: {
    ...enDialog.classicGroupDlg,
    title: 'オブジェクトグループ',
    groupName: 'グループ名',
    selectable: '選択可能',
    identification: 'グループ識別',
    description: '説明',
    findName: '名前を検索 <',
    highlight: 'ハイライト <',
    includeUnnamed: '無名を含める',
    createGroup: 'グループを作成',
    new: '新規 <',
    unnamed: '無名',
    changeGroup: 'グループを変更',
    remove: '削除 <',
    add: '追加 <',
    rename: '名前変更',
    reOrder: '並べ替え...',
    descriptionBtn: '説明',
    explode: '分解',
    selectableBtn: '選択可能',
    yes: 'はい',
    no: 'いいえ',
    pickObject: 'グループを検索するオブジェクトを選択',
    notInGroup: 'オブジェクトはグループのメンバではありません',
    selectObjects: '新しいグループのオブジェクトを選択',
    selectToAdd: '追加するオブジェクトを選択',
    selectToRemove: '削除するオブジェクトを選択',
    clearSelectableFirst:
      'オブジェクトを削除する前にグループの「選択可能」をオフにしてください',
    invalidName: '無効なグループ名です',
    nameExists: 'グループ名は既に存在します',
    created: 'グループ {name} を作成しました'
  },
  orderGroupDlg: {
    ...enDialog.orderGroupDlg,
    title: 'グループの順序',
    groupName: 'グループ名',
    description: '説明',
    removeFrom: '位置から削除 (0 から)',
    newPosition: 'オブジェクトの新しい位置番号を入力',
    numberOfObjects: 'オブジェクト数',
    reOrder: '並べ替え',
    reverseOrder: '順序を反転',
    highlight: 'ハイライト'
  }
}
