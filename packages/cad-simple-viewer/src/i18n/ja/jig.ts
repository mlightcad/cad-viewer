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
  },
  ipdf: {
    pageNumber: 'ページ番号を入力 (1-{count})',
    insertionPoint:
      '挿入点を指定（尺度 {scale}、曲線認識 {curves}）または',
    curvesOn: 'オン',
    curvesOff: 'オフ',
    scaleFactor: '尺度を入力',
    keywords: {
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      curves: {
        display: '曲線(C)',
        local: '曲線',
        global: 'Curves'
      }
    }
  },
  pdfdim: {
    noDimensions: '選択範囲に寸法が見つかりません（矢印または斜線、寸法線、数値文字が必要です）。',
    convertAll: '寸法が {count} 個見つかりました（図面尺度 1:{scale}）。変換しますか？',
    convertOne: '寸法 {index}/{count}「{text}」: 変換しますか？',
    summary: '{count} 個の寸法を変換しました。寸法スタイル PDF_DIM の長さ尺度は {scale} です。'
  },
  pdfblock: {
    basePoint: 'ブロックの基点を指定（尺度違いのコピーも一致: {scale}）または',
    scaleOn: 'オン',
    scaleOff: 'オフ',
    name: 'ブロック名を入力',
    nameExists: 'ブロック "{name}" は既に存在します。',
    unsupported: '選択したオブジェクトは照合できません（線分、円弧、円、ポリライン、楕円、スプライン、文字に対応）。',
    noCopies: '他のコピーは見つかりませんでした。選択したオブジェクトだけをブロックにします。',
    replaceAll: '一致するコピーが {count} 個見つかりました。ブロック参照に置き換えますか？',
    replaceOne: 'コピー {index}/{count}: ブロック参照に置き換えますか？',
    summary: 'ブロック "{name}" を作成しました（参照 {count} 個）。',
    keywords: {
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      yes: {
        display: 'はい(Y)',
        local: 'はい',
        global: 'Yes'
      },
      no: {
        display: 'いいえ(N)',
        local: 'いいえ',
        global: 'No'
      },
      review: {
        display: '個別確認(R)',
        local: '個別確認',
        global: 'Review'
      },
      all: {
        display: 'すべて(A)',
        local: 'すべて',
        global: 'All'
      },
      exit: {
        display: '終了(X)',
        local: '終了',
        global: 'eXit'
      }
    }
  },
  pdftext: {
    enterText:
      '文字行 {index}/{count}: ハイライトされた文字を入力（空欄でスキップ、Esc で終了）',
    enterTextWithSuggestion:
      '文字行 {index}/{count}: ハイライトされた文字を入力',
    noCandidates: '選択内に文字らしいストロークが見つかりません。',
    summary:
      '{converted} 行を変換しました（自動認識 {automatic} 行）。スキップ {skipped} 行。'
  },
  pdfscale: {
    firstPoint: '既知の距離の 1 点目を指定',
    secondPoint: '2 点目を指定',
    realLength: '実際の長さを入力（測定値 {measured}）',
    zeroDistance: '2 点が同じ位置です。',
    applied: '{count} 個のオブジェクトを尺度 {factor} で変更しました。'
  }
}
