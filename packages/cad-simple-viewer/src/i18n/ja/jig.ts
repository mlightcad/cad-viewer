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
      '挿入点を指定（尺度 {scale}、モード {mode}）または',
    modePrompt: 'インポート方式を選択',
    modeRecover: '図面を復元',
    modeVisual: 'PDF の見た目を保持',
    scaleFactor: '尺度を入力',
    keywords: {
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      mode: {
        display: 'モード(M)',
        local: 'モード',
        global: 'Mode'
      },
      recover: {
        display: '復元(R)',
        local: '復元',
        global: 'Recover'
      },
      visual: {
        display: '見た目(V)',
        local: '見た目',
        global: 'Visual'
      }
    }
  },
  pdfdim: {
    noDimensions: '選択範囲に寸法が見つかりません（矢印または斜線、寸法線、数値文字が必要です）。',
    convertAll: '寸法が {count} 個見つかりました（図面尺度 1:{scale}）。変換しますか？',
    convertOne: '寸法 {index}/{count}「{text}」: 変換しますか？',
    summary: '{count} 個の寸法を変換しました。寸法スタイル PDF_DIM の長さ尺度は {scale} です。'
  },
  bsearch: {
    unsupported: '選択したオブジェクトはどれも照合できません（線分、円弧、円、ポリライン、楕円、スプライン、文字、マルチテキスト、ブロック参照に対応）。',
    skipped: '選択したオブジェクトのうち {count} 個は照合できないため無視されます。',
    found: '一致するインスタンスが {count} 個見つかりました（変換対象 {included} 個）。選択',
    noMatches: '他のインスタンスは見つかりませんでした。',
    reviewOne: 'インスタンス {index}/{count}（{state}）',
    included: '含める',
    excluded: '除外',
    options: '回転 {rotation}、鏡像 {mirror}、尺度 {scale}、同一画層 {layer}、既存ブロック {blocks}、文字の違い {text}。切り替え',
    on: 'オン',
    off: 'オフ',
    target: '変換先',
    name: '新しいブロック名を入力',
    nameExists: 'ブロック「{name}」は既に存在します。',
    nameInvalid: '「{name}」は有効なブロック名ではありません。',
    basePoint: '挿入基点を指定',
    attributeTag: '文字「{text}」の属性名を入力',
    existingName: '既存のブロック名を入力',
    blockNotFound: 'ブロック「{name}」が見つかりません。',
    rotation: 'ブロックの回転角度を指定',
    scale: 'ブロックの尺度を指定',
    scope: '見つかった {count} 個のインスタンスも変換しますか、それとも元オブジェクトのみですか？',
    summary: 'ブロック「{name}」に変換しました：参照 {count} 個。',
    keywords: {
      convert: {
        display: '変換(C)',
        local: '変換',
        global: 'Convert'
      },
      review: {
        display: '確認(R)',
        local: '確認',
        global: 'Review'
      },
      options: {
        display: 'オプション(O)',
        local: 'オプション',
        global: 'Options'
      },
      exit: {
        display: '終了(X)',
        local: '終了',
        global: 'eXit'
      },
      include: {
        display: '含める(I)',
        local: '含める',
        global: 'Include'
      },
      exclude: {
        display: '除外(E)',
        local: '除外',
        global: 'Exclude'
      },
      next: {
        display: '次(N)',
        local: '次',
        global: 'Next'
      },
      previous: {
        display: '前(P)',
        local: '前',
        global: 'Previous'
      },
      done: {
        display: '完了(D)',
        local: '完了',
        global: 'Done'
      },
      rotation: {
        display: '回転(R)',
        local: '回転',
        global: 'Rotation'
      },
      mirror: {
        display: '鏡像(M)',
        local: '鏡像',
        global: 'Mirror'
      },
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      layer: {
        display: '画層(L)',
        local: '画層',
        global: 'Layer'
      },
      blocks: {
        display: 'ブロック(B)',
        local: 'ブロック',
        global: 'Blocks'
      },
      text: {
        display: '文字(T)',
        local: '文字',
        global: 'Text'
      },
      new: {
        display: '新規(N)',
        local: '新規',
        global: 'New'
      },
      existing: {
        display: '既存(E)',
        local: '既存',
        global: 'Existing'
      },
      instances: {
        display: 'インスタンス(I)',
        local: 'インスタンス',
        global: 'Instances'
      },
      source: {
        display: '元オブジェクト(S)',
        local: '元オブジェクト',
        global: 'Source'
      }
    }
  },
  pdfblock: {
    keywords: {
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
    realLengthFromDimensions: '実際の長さを入力（測定値 {measured}、寸法値から推定した尺度 1:{scale}）',
    zeroDistance: '2 点が同じ位置です。',
    applied: '{count} 個のオブジェクトを尺度 {factor} で変更しました。'
  }
}
