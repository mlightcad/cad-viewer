import enJig from '../en/jig'

export default {
  ...enJig,
  group: {
    selectOrOption: 'オブジェクトを選択または',
    createOrOption: 'グループを作成または',
    selectObjects: 'グループのオブジェクトを選択',
    enterName: 'グループ名を入力',
    enterDescription: 'グループの説明を入力',
    invalidName: '無効なグループ名です',
    nameExists: 'グループ名は既に存在します',
    created: 'グループ {name} を作成しました',
    keywords: {
      name: {
        display: '名前(N)',
        local: '名前',
        global: 'Name'
      },
      description: {
        display: '説明(D)',
        local: '説明',
        global: 'Description'
      }
    }
  },
  ungroup: {
    selectOrOption: 'グループを選択または',
    selectGroup: 'グループを選択',
    enterName: 'グループ名を入力',
    notFound: 'グループが見つかりません',
    notInGroup: 'オブジェクトはグループのメンバではありません',
    multiGroup: 'オブジェクトは複数のグループに属しています [{name}]',
    exploded: 'グループ {name} を分解しました',
    explodedCount: '{count} 個のグループを分解しました',
    keywords: {
      name: {
        display: '名前(N)',
        local: '名前',
        global: 'Name'
      },
      all: {
        display: 'すべて(A)',
        local: 'すべて',
        global: 'All'
      },
      accept: {
        display: '確定(A)',
        local: '確定',
        global: 'Accept'
      },
      next: {
        display: '次へ(N)',
        local: '次へ',
        global: 'Next'
      }
    }
  },
  groupedit: {
    selectGroup: 'グループを選択',
    enterName: 'グループ名を入力',
    notFound: 'グループが見つかりません',
    multiGroup: 'オブジェクトは複数のグループに属しています [{name}]',
    action: 'グループ {name} のオプションを入力',
    selectToAdd: 'グループに追加するオブジェクトを選択',
    selectToRemove: 'グループから削除するオブジェクトを選択',
    newName: '新しいグループ名を入力',
    keywords: {
      add: {
        display: 'オブジェクトを追加(A)',
        local: '追加',
        global: 'Add'
      },
      remove: {
        display: 'オブジェクトを削除(R)',
        local: '削除',
        global: 'Remove'
      },
      rename: {
        display: '名前変更(N)',
        local: '名前変更',
        global: 'Rename'
      },
      accept: {
        display: '確定(A)',
        local: '確定',
        global: 'Accept'
      },
      next: {
        display: '次へ(N)',
        local: '次へ',
        global: 'Next'
      }
    }
  },
  dashgroup: {
    option: 'オプションを入力',
    empty: 'グループが定義されていません',
    listEntry: '{name}  {description}  [{selectable}]  ({count})',
    yes: 'はい',
    no: 'いいえ',
    enterNameOrBlank:
      'グループ名を入力するか、無名の場合は Enter を押します',
    enterGroupName: 'グループ名を入力',
    selectableSet: 'グループ {name} 選択可能 = {value}',
    orderOption: '順序オプションを入力',
    fromPosition: '並べ替えるオブジェクトの位置番号を入力 (0 から)',
    toPosition: 'オブジェクトの新しい位置番号を入力 (0 から)',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      create: {
        display: '作成(C)',
        local: '作成',
        global: 'Create'
      },
      add: {
        display: '追加(A)',
        local: '追加',
        global: 'Add'
      },
      remove: {
        display: '削除(R)',
        local: '削除',
        global: 'Remove'
      },
      explode: {
        display: '分解(X)',
        local: '分解',
        global: 'Explode'
      },
      rename: {
        display: '名前変更(N)',
        local: '名前変更',
        global: 'Rename'
      },
      selectable: {
        display: '選択可能(S)',
        local: '選択可能',
        global: 'Selectable'
      },
      order: {
        display: '順序(O)',
        local: '順序',
        global: 'Order'
      },
      reverse: {
        display: '反転(R)',
        local: '反転',
        global: 'Reverse'
      },
      position: {
        display: '位置(P)',
        local: '位置',
        global: 'Position'
      }
    }
  }
}
