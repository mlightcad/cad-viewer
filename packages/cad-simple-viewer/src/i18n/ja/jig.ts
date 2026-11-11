export default {
  arc: {
    startPointOrCenter: '円弧の始点を指定 または',
    secondPointOrOptions: '円弧の 2 点目を指定 または',
    secondPoint: '円弧の 2 点目を指定',
    startPoint: '円弧の始点を指定',
    centerPoint: '円弧の中心点を指定',
    endPoint: '円弧の終点を指定',
    endPointOrOptions: '円弧の終点を指定 または',
    centerPointOrOptions: '円弧の中心点を指定',
    includedAngle: '中心角を指定',
    chordLength: '弦の長さを指定',
    tangentDirection: '円弧の始点の接線方向を指定',
    radius: '円弧の半径を指定',
    keywords: {
      center: {
        display: '中心(C)',
        local: '中心',
        global: 'Center'
      },
      end: {
        display: '終点(E)',
        local: '終点',
        global: 'End'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      chordLength: {
        display: '弦の長さ(L)',
        local: '弦の長さ',
        global: 'ChordLength'
      },
      direction: {
        display: '方向(D)',
        local: '方向',
        global: 'Direction'
      },
      radius: {
        display: '半径(R)',
        local: '半径',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        '無効な 3 点円弧: 点が同一直線上にあるか、円弧を定義できません。',
      center: '無効な中心の入力: 始点と終点は同じ円周上にある必要があります。',
      angle:
        '無効な角度の入力: 中心角は 0 度より大きく 360 度未満である必要があります。',
      chordLength: '無効な弦の長さ: 現在の半径に対して範囲外の値です。',
      direction: '無効な方向: この接線方向からは円弧を作成できません。',
      radius: '無効な半径: 指定した半径では始点と終点を結ぶことができません。'
    }
  },
  circle: {
    center: '円の中心を指定',
    centerOrOptions: '円の中心点を指定 または',
    radius: '円の半径を指定',
    radiusOrDiameter: '円の半径を指定 または',
    diameter: '円の直径を指定',
    twoPointFirst: '円の直径の 1 点目を指定',
    twoPointSecond: '円の直径の 2 点目を指定',
    threePointFirst: '円周上の 1 点目を指定',
    threePointSecond: '円周上の 2 点目を指定',
    threePointThird: '円周上の 3 点目を指定',
    keywords: {
      threeP: {
        display: '3 点(3P)',
        local: '3 点',
        global: '3P'
      },
      twoP: {
        display: '2 点(2P)',
        local: '2 点',
        global: '2P'
      },
      diameter: {
        display: '直径(D)',
        local: '直径',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: '基点を指定 または',
    displacementOrArray: '移動距離を指定 または',
    secondPointOrArray: '2 点目を指定 または',
    modePrompt: '複写モードのオプションを入力',
    arrayItemCount: '元のオブジェクトを含む配列の項目数を入力',
    arraySecondPointOrFit: '2 点目を指定 または',
    arrayFitSecondPoint: '2 点目を指定',
    keywords: {
      displacement: {
        display: '移動距離(D)',
        local: '移動距離',
        global: 'Displacement'
      },
      mode: {
        display: 'モード(O)',
        local: 'モード',
        global: 'Mode'
      },
      multiple: {
        display: '複数(M)',
        local: '複数',
        global: 'Multiple'
      },
      single: {
        display: '単一(S)',
        local: '単一',
        global: 'Single'
      },
      array: {
        display: '配列複写(A)',
        local: '配列複写',
        global: 'Array'
      },
      fit: {
        display: 'フィット(F)',
        local: 'フィット',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: '1 本目の寸法補助線の起点を指定 または <オブジェクトを選択>',
    xLine2Point: '2 本目の寸法補助線の起点を指定',
    dimLinePoint: '寸法線の位置を指定',
    selectObject: '寸法を記入するオブジェクトを選択',
    rejectObject: 'このオブジェクトには DIMLINEAR で寸法を記入できません。',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    rotationAngle: '寸法線の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' },
      horizontal: {
        display: '水平(H)',
        local: '水平',
        global: 'Horizontal'
      },
      vertical: {
        display: '垂直(V)',
        local: '垂直',
        global: 'Vertical'
      },
      rotated: {
        display: '回転(R)',
        local: '回転',
        global: 'Rotated'
      }
    }
  },
  dimaligned: {
    xLine1Point: '1 本目の寸法補助線の起点を指定 または <オブジェクトを選択>',
    xLine2Point: '2 本目の寸法補助線の起点を指定',
    dimLinePoint: '寸法線の位置を指定',
    selectObject: '寸法を記入するオブジェクトを選択',
    rejectObject: 'このオブジェクトには DIMALIGNED で寸法を記入できません。',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' }
    }
  },
  dimradius: {
    selectObject: '円弧または円を選択',
    rejectObject: '円弧または円を選択する必要があります。',
    dimLinePoint: '寸法線の位置を指定',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' }
    }
  },
  dimdiameter: {
    selectObject: '円弧または円を選択',
    rejectObject: '円弧または円を選択する必要があります。',
    dimLinePoint: '寸法線の位置を指定',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' }
    }
  },
  dimangular: {
    vertexOrSelect: '角度の頂点を指定 または <線分を選択>',
    xLine1Point: '角度の 1 本目の端点を指定',
    xLine2Point: '角度の 2 本目の端点を指定',
    arcPoint: '寸法円弧線の位置を指定',
    selectFirstLine: '1 本目の線分を選択',
    selectSecondLine: '2 本目の線分を選択',
    rejectObject: '線分を選択する必要があります。',
    linesParallel: '線分が平行です — 角度の交点がありません。',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' }
    }
  },
  dimarc: {
    selectArc: '円弧を選択',
    rejectObject: '円弧を選択する必要があります。',
    arcPoint: '弧長寸法の位置を指定',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' }
    }
  },
  dimordinate: {
    featurePoint: '測点の位置を指定',
    leaderEndpoint: '引出線の端点を指定',
    dimensionText: '寸法値を入力',
    textAngle: '寸法値の角度を指定',
    keywords: {
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      text: { display: '寸法値(T)', local: '寸法値', global: 'Text' },
      angle: { display: '寸法値角度(A)', local: '寸法値角度', global: 'Angle' },
      xdatum: { display: 'X 基準(X)', local: 'X 基準', global: 'Xdatum' },
      ydatum: { display: 'Y 基準(Y)', local: 'Y 基準', global: 'Ydatum' }
    }
  },
  dimcontinue: {
    nextPoint: '2 本目の寸法補助線の起点を指定 または',
    selectDimension: '直列寸法記入する寸法を選択',
    rejectObject: '長さ寸法または角度寸法を選択する必要があります。',
    keywords: {
      select: { display: '選択(S)', local: '選択', global: 'Select' }
    }
  },
  dimbaseline: {
    nextPoint: '2 本目の寸法補助線の起点を指定 または',
    selectDimension: '基準寸法を選択',
    rejectObject: '長さ寸法または角度寸法を選択する必要があります。',
    keywords: {
      select: { display: '選択(S)', local: '選択', global: 'Select' }
    }
  },
  ellipse: {
    axisEndpointOrOptions: '楕円の軸の端点を指定 または',
    arcAxisEndpointOrCenter: '楕円弧の軸の端点を指定 または',
    center: '楕円の中心を指定',
    firstAxisEndpoint: '軸の端点を指定',
    secondAxisEndpoint: '軸のもう一方の端点を指定',
    otherAxisOrRotation: 'もう一方の軸の距離を指定 または',
    rotationAngle: '長軸を中心とした回転角度を指定',
    arcStartAngle: '楕円弧の開始角度を指定',
    arcEndAngle: '楕円弧の終了角度を指定',
    keywords: {
      arc: {
        display: '円弧(A)',
        local: '円弧',
        global: 'Arc'
      },
      center: {
        display: '中心(C)',
        local: '中心',
        global: 'Center'
      },
      rotation: {
        display: '回転(R)',
        local: '回転',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: '無効な軸の入力: 軸の長さは 0 より大きくする必要があります。',
      otherAxis:
        '無効なもう一方の軸の入力: 距離は 0 より大きくする必要があります。',
      rotation:
        '無効な回転の入力: 結果の短軸は 0 より大きくする必要があります。'
    }
  },
  hatch: {
    prompt: '境界オブジェクトを選択 または',
    pickPoint: '内側の点を指定 (Enter キーで終了)',
    select: 'ハッチングするオブジェクトを選択',
    patternName: 'ハッチング パターン名を入力',
    scale: 'ハッチング パターンの尺度を指定',
    angle: 'ハッチング パターンの角度を指定',
    style: 'ハッチング スタイルを入力',
    associative: '自動調整を指定',
    invalidBoundary: '選択したオブジェクトは閉じた境界を形成していません。',
    keywords: {
      pick: {
        display: '点をクリック(P)',
        local: '点をクリック',
        global: 'PickPoints'
      },
      select: {
        display: 'オブジェクトを選択(S)',
        local: 'オブジェクトを選択',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'キャンセル(C)',
        local: 'キャンセル',
        global: 'Cancel'
      },
      pattern: {
        display: 'パターン(P)',
        local: 'パターン',
        global: 'Pattern'
      },
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      style: {
        display: 'スタイル(T)',
        local: 'スタイル',
        global: 'HatchStyle'
      },
      associative: {
        display: '自動調整(AS)',
        local: '自動調整',
        global: 'AssociativeMode'
      },
      normal: {
        display: '標準(N)',
        local: '標準',
        global: 'Normal'
      },
      outer: {
        display: '外側(O)',
        local: '外側',
        global: 'Outer'
      },
      ignore: {
        display: '無視(I)',
        local: '無視',
        global: 'Ignore'
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
      }
    }
  },
  hideobjects: {
    hidden: '個のオブジェクトを非表示にしました',
    restored: '個のオブジェクトを再表示しました',
    nothingToRestore: '再表示する非表示オブジェクトはありません'
  },
  entout: {
    longSidePrompt: 'プレビューの長辺のサイズをピクセル単位で入力',
    exported: '個のオブジェクト プレビューを書き出しました',
    skipped: '個のオブジェクトをスキップしました',
    failed: {
      'no-preview-root': '選択セットのプレビュー ジオメトリを作成できません',
      'no-bounds': '選択セットのプレビュー範囲を計算できません',
      'capture-failed':
        'オブジェクトのプレビュー イメージをレンダリングできません',
      'download-failed':
        'プレビューはレンダリングされましたが、PNG のダウンロードに失敗しました'
    }
  },
  layer: {
    main: 'オプションを入力',
    listSummary: '画層一覧をブラウザのコンソールに出力しました',
    emptyInput: '画層名が入力されていません。',
    newPrompt: '新しい画層の名前を入力',
    makePrompt: '現在の画層にする画層の名前を入力',
    setPrompt: '現在の画層に設定する画層の名前を入力',
    onPrompt: '表示する画層名を入力',
    offPrompt: '非表示にする画層名を入力',
    freezePrompt: 'フリーズする画層名を入力',
    thawPrompt: 'フリーズ解除する画層名を入力',
    lockPrompt: 'ロックする画層名を入力',
    unlockPrompt: 'ロック解除する画層名を入力',
    colorLayerPrompt: '色を変更する画層名を入力',
    colorValuePrompt:
      '色を入力 (ACI 1-255、RGB は 255,0,0 の形式、または CSS の色名)',
    invalidColor: '無効な色の入力です。',
    descriptionLayerPrompt: '説明を編集する画層名を入力',
    descriptionValuePrompt: '新しい画層の説明を入力',
    created: '作成した画層数',
    alreadyExists: '画層は既に存在します',
    notFound: '画層が見つかりません',
    cannotChangeCurrent:
      '現在の画層を非表示またはフリーズすることはできません。',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: '作成(M)',
        local: '作成',
        global: 'Make'
      },
      set: {
        display: '設定(S)',
        local: '設定',
        global: 'Set'
      },
      new: {
        display: '新規作成(N)',
        local: '新規作成',
        global: 'New'
      },
      on: {
        display: '表示(ON)',
        local: '表示',
        global: 'On'
      },
      off: {
        display: '非表示(OF)',
        local: '非表示',
        global: 'Off'
      },
      color: {
        display: '色(C)',
        local: '色',
        global: 'Color'
      },
      freeze: {
        display: 'フリーズ(F)',
        local: 'フリーズ',
        global: 'Freeze'
      },
      thaw: {
        display: 'フリーズ解除(T)',
        local: 'フリーズ解除',
        global: 'Thaw'
      },
      lock: {
        display: 'ロック(L)',
        local: 'ロック',
        global: 'Lock'
      },
      unlock: {
        display: 'ロック解除(U)',
        local: 'ロック解除',
        global: 'Unlock'
      },
      description: {
        display: '説明(D)',
        local: '説明',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: 'すべての画層は既に表示されています。',
    turnedOn: '表示にした画層'
  },
  laycur: {
    prompt: '現在の画層に変更するオブジェクトを選択',
    currentLayerNotFound: '現在の画層が見つかりません。',
    noObjects: '有効なオブジェクトが選択されていません。',
    alreadyCurrent: '選択したオブジェクトは既に現在の画層にあります。',
    changed: '現在の画層に変更したオブジェクト'
  },
  layfrz: {
    prompt: 'フリーズする画層上のオブジェクトを選択 または',
    invalidSelection: '無効なオブジェクトが選択されました。',
    settingsPrompt: '変更する LAYFRZ の設定を入力',
    viewportPrompt: 'ビューポートのフリーズ動作を指定',
    blockSelectionPrompt: 'ネストされたブロックの選択動作を指定',
    vpfreezeFallback:
      '現在のビューアはビューポートごとの画層フリーズをサポートしていません。代わりにフリーズ動作を使用します。',
    nestedSelectionLimited:
      'ネストされたブロックの選択設定は保存されますが、現在の選択では最上位オブジェクトの画層が使用されます。',
    layerNotFound: '画層が見つかりません',
    cannotFreezeCurrent: '現在の画層はフリーズできません。',
    alreadyFrozen: '画層は既にフリーズされています',
    frozen: 'フリーズした画層',
    restored: '復元した画層',
    nothingToUndo: '元に戻す LAYFRZ の操作はありません。',
    keywords: {
      settings: {
        display: '設定(S)',
        local: '設定',
        global: 'Settings'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      viewports: {
        display: 'ビューポート(V)',
        local: 'ビューポート',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'ブロック選択(B)',
        local: 'ブロック選択',
        global: 'BlockSelection'
      },
      freeze: {
        display: 'フリーズ(F)',
        local: 'フリーズ',
        global: 'Freeze'
      },
      vpfreeze: {
        display: 'VP フリーズ(V)',
        local: 'VP フリーズ',
        global: 'Vpfreeze'
      },
      block: {
        display: 'ブロック(B)',
        local: 'ブロック',
        global: 'Block'
      },
      entity: {
        display: 'オブジェクト(E)',
        local: 'オブジェクト',
        global: 'Entity'
      },
      none: {
        display: 'なし(N)',
        local: 'なし',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: '分離する画層上のオブジェクトを選択 または',
    settingsPrompt: '分離されていない画層の設定を入力',
    offModePrompt: '分離されていない画層の非表示動作を入力',
    noLayers: '有効な画層が選択されていません。',
    layerNotFound: '画層が見つかりません',
    isolated: '分離した画層',
    affectedLayers: '個の画層に影響しました',
    vpfreezeFallback:
      '現在のビューアはビューポートごとの画層フリーズをサポートしていません。代わりに非表示動作を使用します。',
    lockFadeFallback:
      '現在のビューアは画層のフェード表示をサポートしていません。分離されていない画層はフェードなしでロックされます。',
    keywords: {
      settings: {
        display: '設定(S)',
        local: '設定',
        global: 'Settings'
      },
      off: {
        display: '非表示(O)',
        local: '非表示',
        global: 'Off'
      },
      lockAndFade: {
        display: 'ロックとフェード(L)',
        local: 'ロックとフェード',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: 'VP フリーズ(V)',
        local: 'VP フリーズ',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: '復元する以前の LAYISO 画層状態はありません。',
    layerNotFound: '画層が見つかりません',
    nothingRestored: 'LAYISO による画層の変更は復元されませんでした。',
    restored: '復元した画層'
  },
  laythw: {
    alreadyThawed: 'すべての画層は既にフリーズ解除されています。',
    thawed: 'フリーズ解除した画層'
  },
  laylck: {
    prompt: 'ロックする画層上のオブジェクトを選択',
    invalidSelection: '無効なオブジェクトが選択されました。',
    layerNotFound: '画層が見つかりません',
    alreadyLocked: '画層は既にロックされています',
    locked: 'ロックした画層'
  },
  layulk: {
    prompt: 'ロック解除する画層上のオブジェクトを選択',
    invalidSelection: '無効なオブジェクトが選択されました。',
    layerNotFound: '画層が見つかりません',
    alreadyUnlocked: '画層は既にロック解除されています',
    unlocked: 'ロック解除した画層'
  },
  layoff: {
    prompt: '非表示にする画層上のオブジェクトを選択 または',
    invalidSelection: '無効なオブジェクトが選択されました。',
    settingsPrompt: '変更する LAYOFF の設定を入力',
    viewportPrompt: 'ビューポートの動作を指定',
    blockSelectionPrompt: 'ネストされたブロックの選択動作を指定',
    vpfreezeFallback:
      '現在のビューアはビューポートごとの画層非表示をサポートしていません。代わりに非表示動作を使用します。',
    nestedSelectionLimited:
      'ネストされたブロックの選択設定は保存されますが、現在の選択では最上位オブジェクトの画層が使用されます。',
    layerNotFound: '画層が見つかりません',
    cannotTurnOffCurrent: '現在の画層は非表示にできません。',
    alreadyOff: '画層は既に非表示です',
    turnedOff: '非表示にした画層',
    restored: '復元した画層',
    nothingToUndo: '元に戻す LAYOFF の操作はありません。',
    keywords: {
      settings: {
        display: '設定(S)',
        local: '設定',
        global: 'Settings'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      viewports: {
        display: 'ビューポート(V)',
        local: 'ビューポート',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'ブロック選択(B)',
        local: 'ブロック選択',
        global: 'BlockSelection'
      },
      off: {
        display: '非表示(O)',
        local: '非表示',
        global: 'Off'
      },
      vpfreeze: {
        display: 'VP フリーズ(V)',
        local: 'VP フリーズ',
        global: 'Vpfreeze'
      },
      block: {
        display: 'ブロック(B)',
        local: 'ブロック',
        global: 'Block'
      },
      entity: {
        display: 'オブジェクト(E)',
        local: 'オブジェクト',
        global: 'Entity'
      },
      none: {
        display: 'なし(N)',
        local: 'なし',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: '以前の画層状態を復元しました。',
    noPreviousState: '復元する以前の画層状態はありません。'
  },
  line: {
    firstPoint: '1 点目を指定',
    firstPointOrContinue: '1 点目を指定 または',
    nextPoint: '次の点を指定',
    nextPointWithOptions: '次の点を指定 または',
    keywords: {
      continue: {
        display: '継続(C)',
        local: '継続',
        global: 'Continue'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      close: {
        display: '閉じる(C)',
        local: '閉じる',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: '点を指定 または',
    secondPoint: '2 点目を指定',
    throughPoint: '通過点を指定',
    angle: '構築線の角度を入力',
    invalidDirection: 'XLINE の方向が無効です。',
    keywords: {
      hor: {
        display: '水平(H)',
        local: '水平',
        global: 'Hor'
      },
      ver: {
        display: '垂直(V)',
        local: '垂直',
        global: 'Ver'
      },
      ang: {
        display: '角度(A)',
        local: '角度',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: '始点を指定',
    throughPoint: '通過点を指定'
  },
  mline: {
    startPointWithOptions: '始点を指定 または',
    nextPointWithOptions: '次の点を指定 または',
    justificationPrompt: '位置合わせのタイプを入力',
    scalePrompt: 'マルチラインの尺度を指定',
    stylePrompt: 'マルチライン スタイル名を入力 または [?] で一覧表示',
    styleNotFound: 'マルチライン スタイルが見つかりません',
    styleListHeader: 'ロードされているマルチライン スタイル',
    styleListEmpty:
      '現在の図面にはマルチライン スタイルがロードされていません。',
    keywords: {
      justification: {
        display: '位置合わせ(J)',
        local: '位置合わせ',
        global: 'Justification'
      },
      scale: {
        display: '尺度(S)',
        local: '尺度',
        global: 'Scale'
      },
      style: {
        display: 'スタイル(ST)',
        local: 'スタイル',
        global: 'Style'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      close: {
        display: '閉じる(C)',
        local: '閉じる',
        global: 'Close'
      },
      top: {
        display: '上端(T)',
        local: '上端',
        global: 'Top'
      },
      zero: {
        display: 'ゼロ(Z)',
        local: 'ゼロ',
        global: 'Zero'
      },
      bottom: {
        display: '下端(B)',
        local: '下端',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: '頂点を指定',
    arm1: '1 本目の辺上の点を指定',
    arm2: '2 本目の辺上の点を指定'
  },
  measureArc: {
    startPoint: '円弧の始点を指定',
    throughPoint: '円弧上の点を指定',
    endPoint: '円弧の終点を指定',
    lockedEndPoint: '円弧の終点を指定 (Ctrl キーで優弧/劣弧を切り替え)',
    invalidPoints: '3 点が同一直線上にあるため、円弧を定義できません。'
  },
  measureArea: {
    firstPoint: '1 点目を指定',
    nextPoint: '次の点を指定 (Enter キーで終了)'
  },
  measureDistance: {
    firstPoint: '1 点目を指定',
    secondPoint: '2 点目を指定'
  },
  measureContinuous: {
    firstPoint: '1 点目を指定',
    nextPoint: '次の点を指定 (Enter キーで終了)'
  },
  measurePoint: {
    point: '点を指定'
  },
  measurement: {
    import: {
      chooseFile: '計測のサイドカー JSON ファイルを選択'
    }
  },
  markup: {
    author: 'レビュー作成者を指定 (以降も使用されます)',
    text: {
      point: 'テキスト マークアップの位置を指定',
      content: 'マークアップ テキストを入力'
    },
    line: {
      firstPoint: '線分マークアップの 1 点目を指定',
      secondPoint: '線分マークアップの 2 点目を指定'
    },
    arrow: {
      firstPoint: '矢印の始点を指定',
      secondPoint: '矢印の先端を指定'
    },
    cloud: {
      firstCorner: '雲マークの 1 つ目のコーナーを指定',
      secondCorner: '雲マークの対角コーナーを指定'
    },
    rect: {
      firstCorner: '長方形の 1 つ目のコーナーを指定',
      secondCorner: '長方形の対角コーナーを指定'
    },
    circle: {
      center: '円の中心を指定',
      radius: '円の半径を指定'
    },
    shape: {
      calloutOn: '[吹き出し オン]',
      calloutOff: '[吹き出し オフ]',
      calloutAnchor: '吹き出しテキストの位置を指定',
      keywords: {
        callout: {
          display: '吹き出し(C)',
          local: '吹き出し',
          global: 'Callout'
        },
        noCallout: {
          display: '吹き出しなし(N)',
          local: '吹き出しなし',
          global: 'NoCallout'
        }
      }
    },
    highlight: {
      firstCorner: 'ハイライトの 1 つ目のコーナーを指定',
      secondCorner: 'ハイライトの対角コーナーを指定'
    },
    callout: {
      tip: '引出線の先端を指定、または吹き出しなしの雲マーク / 長方形 / 円の輪郭を指定',
      anchor: '吹き出しテキストの位置を指定',
      content: '吹き出しテキストを入力'
    },
    stamp: {
      kind: 'スタンプ ID を入力 [approved/rejected/revised/for-review/custom]',
      imageUrl: 'カスタム スタンプ イメージの URL を入力 (省略可)',
      caption: 'スタンプのキャプションを入力 (省略可)',
      point: 'スタンプの挿入点を指定'
    },
    import: {
      chooseFile: 'マークアップのサイドカー JSON ファイルを選択'
    }
  },
  move: {
    basePointOrDisplacement: '基点を指定 または',
    secondPointOrDisplacement: '2 点目を指定 または',
    displacement: '移動距離を指定',
    keywords: {
      displacement: {
        display: '移動距離(D)',
        local: '移動距離',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'オフセット距離を指定',
    selectObject: 'オフセットするオブジェクトを選択 または Enter キーで終了',
    sidePoint: 'オフセットする側の点を指定',
    invalidDistance: 'オフセット距離は 0 より大きくする必要があります。',
    invalidSelection: '選択したオブジェクトはオフセットできません。',
    offsetFailed: '指定した側にオフセット曲線を作成できません。'
  },
  leader: {
    startPoint: '引出線の始点を指定',
    nextPoint: '次の点を指定',
    nextPointOrOptions: '次の点を指定 または [注釈(A)/書式(F)/元に戻す(U)]',
    formatPrompt:
      '引出線の書式オプションを入力 [スプライン(S)/直線(T)/矢印(A)/なし(N)]',
    annotationText: '注釈文字の 1 行目を入力 または <オプション>',
    nextAnnotationLine: '注釈文字の次の行を入力',
    annotationOptions:
      '注釈オプションを入力 [公差(Tolerance)/複写(C)/ブロック(B)/なし(N)/マルチテキスト(M)]',
    selectAnnotation: '複写する注釈オブジェクトを選択',
    rejectAnnotation: 'このオブジェクトは引出線の注釈として使用できません。',
    toleranceUnavailable: 'このビルドでは幾何公差ダイアログを使用できません。',
    keywords: {
      annotation: {
        display: '注釈(A)',
        local: '注釈',
        global: 'Annotation'
      },
      format: {
        display: '書式(F)',
        local: '書式',
        global: 'Format'
      },
      undo: { display: '元に戻す(U)', local: '元に戻す', global: 'Undo' },
      spline: {
        display: 'スプライン(S)',
        local: 'スプライン',
        global: 'Spline'
      },
      straight: {
        display: '直線(T)',
        local: '直線',
        global: 'STraight'
      },
      arrow: { display: '矢印(A)', local: '矢印', global: 'Arrow' },
      none: { display: 'なし(N)', local: 'なし', global: 'None' },
      tolerance: {
        display: '公差',
        local: '公差',
        global: 'Tolerance'
      },
      copy: { display: '複写(C)', local: '複写', global: 'Copy' },
      block: { display: 'ブロック(B)', local: 'ブロック', global: 'Block' },
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      }
    }
  },
  mleader: {
    arrowheadOrOptions:
      '引出線の矢印の位置を指定 または [引出線参照線優先(L)/コンテンツ優先(C)/オプション(O)]',
    landingLocation: '引出線参照線の位置を指定',
    landingFirstPoint: '引出線参照線の位置を指定',
    arrowheadLocation: '引出線の矢印の位置を指定',
    contentLocation: 'コンテンツの位置を指定',
    nextPoint: '次の点を指定',
    optionsPrompt:
      'オプションを入力 [引出線の種類(T)/参照線(A)/コンテンツの種類(C)/最大点数(M)/1 番目の角度(F)/2 番目の角度(S)/オプションを終了(X)]',
    leaderTypePrompt: '引出線の種類を選択 [直線(S)/スプライン(P)/なし(N)]',
    landingPrompt: '参照線を使用 [はい(Y)/いいえ(N)]',
    landingLength: '参照線の距離を指定',
    contentTypePrompt:
      'コンテンツの種類を選択 [ブロック(B)/マルチテキスト(M)/なし(N)]',
    maxPoints: '引出線の最大点数を入力',
    firstAngle: '1 番目の角度拘束を入力',
    secondAngle: '2 番目の角度拘束を入力',
    keywords: {
      landingFirst: {
        display: '引出線参照線優先(L)',
        local: '引出線参照線優先',
        global: 'Landing first'
      },
      contentFirst: {
        display: 'コンテンツ優先(C)',
        local: 'コンテンツ優先',
        global: 'Content first'
      },
      options: {
        display: 'オプション(O)',
        local: 'オプション',
        global: 'Options'
      },
      leaderType: {
        display: '引出線の種類(T)',
        local: '引出線の種類',
        global: 'Leader type'
      },
      landing: {
        display: '参照線(A)',
        local: '参照線',
        global: 'lAnding'
      },
      contentType: {
        display: 'コンテンツの種類(C)',
        local: 'コンテンツの種類',
        global: 'Content type'
      },
      maxpoints: {
        display: '最大点数(M)',
        local: '最大点数',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: '1 番目の角度(F)',
        local: '1 番目の角度',
        global: 'First angle'
      },
      secondAngle: {
        display: '2 番目の角度(S)',
        local: '2 番目の角度',
        global: 'Second angle'
      },
      exitOptions: {
        display: 'オプションを終了(X)',
        local: 'オプションを終了',
        global: 'eXit options'
      },
      straight: {
        display: '直線(S)',
        local: '直線',
        global: 'Straight'
      },
      spline: {
        display: 'スプライン(P)',
        local: 'スプライン',
        global: 'sPline'
      },
      noneLeader: {
        display: 'なし(N)',
        local: 'なし',
        global: 'None'
      },
      yes: { display: 'はい(Y)', local: 'はい', global: 'Yes' },
      no: { display: 'いいえ(N)', local: 'いいえ', global: 'No' },
      block: { display: 'ブロック(B)', local: 'ブロック', global: 'Block' },
      mtext: {
        display: 'マルチテキスト(M)',
        local: 'マルチテキスト',
        global: 'Mtext'
      },
      none: { display: 'なし(N)', local: 'なし', global: 'None' }
    }
  },
  mleaderedit: {
    selectMLeader: 'マルチ引出線を選択',
    rejectMLeader: 'マルチ引出線を選択する必要があります。',
    arrowheadOrRemove: '引出線の矢印の位置を指定 または [引出線を削除(R)]',
    selectLeaderToRemove: '削除する引出線を指定 または Enter キーで終了',
    cannotRemoveLast:
      'このマルチ引出線から最後の引出線を削除することはできません。',
    keywords: {
      remove: {
        display: '引出線を削除(R)',
        local: '削除',
        global: 'Remove'
      }
    }
  },
  mtext: {
    point: 'マルチテキストの挿入点を指定'
  },
  bmpout: {
    boundsFirstCorner: '範囲の 1 つ目のコーナーを指定',
    boundsSecondCorner: '対角コーナーを指定',
    longSidePrompt: '長辺のサイズをピクセル単位で入力'
  },
  jpgout: {
    boundsFirstCorner: '範囲の 1 つ目のコーナーを指定',
    boundsSecondCorner: '対角コーナーを指定',
    longSidePrompt: '長辺のサイズをピクセル単位で入力'
  },
  pngout: {
    boundsFirstCorner: '範囲の 1 つ目のコーナーを指定',
    boundsSecondCorner: '対角コーナーを指定',
    longSidePrompt: '長辺のサイズをピクセル単位で入力'
  },
  imageattach: {
    insertionPoint: '挿入点を指定:',
    scale: '尺度を指定:',
    rotation: '回転角度を指定:',
    invalidScale: '尺度は 0 より大きくする必要があります。',
    decodeFailed: '選択したイメージ ファイルを読み込めませんでした。'
  },
  insert: {
    blockName: 'ブロック名を入力:',
    insertionPoint: '挿入点を指定:',
    scale: '尺度を指定:',
    rotation: '回転角度を指定:',
    invalidScale: '尺度は 0 より大きくする必要があります。',
    invalidBlockName: '無効なブロック名です。',
    blockNotFound: 'ブロックが見つかりません',
    xrefNotAllowed: '-INSERT で外部参照を挿入することはできません。'
  },
  xattach: {
    insertionPoint: '挿入点を指定:',
    scale: '尺度を指定:',
    rotation: '回転角度を指定:',
    invalidScale: '尺度は 0 より大きくする必要があります。',
    unsupportedFile: 'DWG または DXF ファイルを選択してください。',
    loading: '外部参照を読み込んでいます...',
    loadFailed: '選択した図面ファイルを読み込めませんでした。'
  },
  point: {
    point: '点を指定'
  },
  polygon: {
    numberOfSides: 'エッジの数を入力',
    centerOrEdge: 'ポリゴンの中心を指定 または',
    radiusOrType: 'オプションを入力',
    edgeStart: 'エッジの 1 つ目の端点を指定',
    edgeEnd: 'エッジの 2 つ目の端点を指定',
    keywords: {
      edge: {
        display: 'エッジ(E)',
        local: 'エッジ',
        global: 'Edge'
      },
      inscribed: {
        display: '円に内接(I)',
        local: '円に内接',
        global: 'Inscribed'
      },
      circumscribed: {
        display: '円に外接(C)',
        local: '円に外接',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: '無効なエッジ数です。3 から 1024 までの整数を入力してください。',
      radius: '無効な半径です。半径は 0 より大きくする必要があります。',
      edge: '無効なエッジです。エッジの長さは 0 より大きくする必要があります。'
    }
  },
  polyline: {
    firstPoint: '1 点目を指定',
    nextPoint: '次の点を指定 (Enter キーで終了)',
    nextPointWithOptions: '次の点を指定 または',
    nextPointWithArcOptions: '次の点を指定 または',
    keywords: {
      arc: {
        display: '円弧(A)',
        local: '円弧',
        global: 'Arc'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      close: {
        display: '閉じる(C)',
        local: '閉じる',
        global: 'Close'
      },
      line: {
        display: '線分(L)',
        local: '線分',
        global: 'Line'
      },
      angle: {
        display: '角度(A)',
        local: '角度',
        global: 'Angle'
      },
      center: {
        display: '中心(C)',
        local: '中心',
        global: 'Center'
      },
      secondPoint: {
        display: '2 点目(P)',
        local: '2 点目',
        global: 'SecondPoint'
      },
      radius: {
        display: '半径(R)',
        local: '半径',
        global: 'Radius'
      }
    },
    arcAngle: '円弧の角度を指定',
    arcCenter: '中心点を指定',
    arcSecondPoint: '円弧上の 2 点目を指定',
    arcEndPoint: '円弧の終点を指定',
    arcRadius: '円弧の半径を指定'
  },
  rect: {
    firstPoint: '一方のコーナーを指定',
    nextPoint: 'もう一方のコーナーを指定',
    firstPointWithOptions: '一方のコーナーを指定 または',
    otherCornerWithOptions: 'もう一方のコーナーを指定 または',
    chamferFirst: '1 本目の面取り距離を指定',
    chamferSecond: '2 本目の面取り距離を指定',
    filletRadius: 'フィレット半径を指定',
    segmentWidth: '長方形の線の幅を指定',
    elevationValue: '高度を指定',
    thicknessValue: '厚さを指定',
    rotationAngle: '長方形の回転角度を指定',
    dimensionLength: '長方形の長さを指定',
    dimensionWidth: '長方形の幅を指定',
    areaValue: '長方形の面積を指定',
    areaLengthOrWidth: '長方形の長さを指定',
    areaSpecifyWidth: '長方形の幅を指定',
    invalidPositive: '無効な入力です。0 より大きい値を入力してください。',
    invalidRect:
      '長方形を作成できません。有効なコーナーまたは寸法を指定してください。',
    thicknessNotSupported:
      '長方形の厚さは現在オブジェクト データに書き込まれません。厚さの設定は無視されます。',
    keywords: {
      chamfer: {
        display: '面取り(C)',
        local: '面取り',
        global: 'Chamfer'
      },
      elevation: {
        display: '高度(E)',
        local: '高度',
        global: 'Elevation'
      },
      fillet: {
        display: 'フィレット(F)',
        local: 'フィレット',
        global: 'Fillet'
      },
      thickness: {
        display: '厚さ(T)',
        local: '厚さ',
        global: 'Thickness'
      },
      width: {
        display: '幅(W)',
        local: '幅',
        global: 'Width'
      },
      area: {
        display: '面積(A)',
        local: '面積',
        global: 'Area'
      },
      dimensions: {
        display: '寸法(D)',
        local: '寸法',
        global: 'Dimensions'
      },
      rotation: {
        display: '回転(R)',
        local: '回転',
        global: 'Rotation'
      },
      length: {
        display: '長さ(L)',
        local: '長さ',
        global: 'Length'
      },
      rectWidth: {
        display: '幅(W)',
        local: '幅',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: '基点を指定',
    rotationAngleOrOptions: '回転角度を指定 または',
    referenceAngleOrPoints: '参照角度を指定 または',
    firstReferencePoint: '参照角度の 1 点目を指定',
    secondReferencePoint: '2 点目を指定',
    newAngle: '新しい角度を指定',
    keywords: {
      copy: {
        display: '複写(C)',
        local: '複写',
        global: 'Copy'
      },
      reference: {
        display: '参照(R)',
        local: '参照',
        global: 'Reference'
      },
      points: {
        display: '点(P)',
        local: '点',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: '無効な参照点: 点はそれぞれ異なる必要があります。'
    }
  },
  revcloud: {
    firstCornerOrOptions: '一方のコーナーを指定 または',
    firstCorner: '一方のコーナーを指定',
    oppositeCorner: '対角コーナーを指定',
    startPoint: '始点を指定',
    nextPoint: '次の点を指定',
    nextPointOrUndo: '次の点を指定 または',
    firstPoint: '1 点目を指定',
    guideCursor: '雲マークのパスに沿ってカーソルを移動 (Enter キーで終了)',
    arcLength: '弧長を指定',
    selectObject: 'オブジェクトを選択',
    style: '雲マークの円弧スタイルを入力',
    reverseDirection: '方向を反転',
    invalidArcLength: '弧長は 0 より大きくする必要があります。',
    invalidObject: '選択したオブジェクトは雲マークに変換できません。',
    keywords: {
      arcLength: {
        display: '弧長(A)',
        local: '弧長',
        global: 'ArcLength'
      },
      object: {
        display: 'オブジェクト(O)',
        local: 'オブジェクト',
        global: 'Object'
      },
      rectangular: {
        display: '長方形(R)',
        local: '長方形',
        global: 'Rectangular'
      },
      polygonal: {
        display: 'ポリゴン(P)',
        local: 'ポリゴン',
        global: 'Polygonal'
      },
      freehand: {
        display: 'フリーハンド(F)',
        local: 'フリーハンド',
        global: 'Freehand'
      },
      style: {
        display: 'スタイル(S)',
        local: 'スタイル',
        global: 'Style'
      },
      normal: {
        display: '標準(N)',
        local: '標準',
        global: 'Normal'
      },
      calligraphy: {
        display: 'カリグラフィ(C)',
        local: 'カリグラフィ',
        global: 'Calligraphy'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
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
      }
    }
  },
  sketch: {
    specifySketch: 'スケッチを指定 または',
    sketching: 'ポインタを移動してスケッチ (クリックまたは Enter キーで停止)',
    type: 'スケッチの種類を入力',
    increment: 'スケッチの増分を指定',
    tolerance: 'スプラインの許容差を指定',
    firstPoint: '1 点目を指定',
    nextPoint: '終点を指定',
    keywords: {
      type: {
        display: '種類(T)',
        local: '種類',
        global: 'Type'
      },
      increment: {
        display: '増分(I)',
        local: '増分',
        global: 'Increment'
      },
      tolerance: {
        display: '許容差(L)',
        local: '許容差',
        global: 'Tolerance'
      },
      line: {
        display: '線分(L)',
        local: '線分',
        global: 'Lines'
      },
      polyline: {
        display: 'ポリライン(P)',
        local: 'ポリライン',
        global: 'Polyline'
      },
      spline: {
        display: 'スプライン(S)',
        local: 'スプライン',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: '1 点目を指定',
    nextPoint: '次の点を指定 (Enter キーで終了)',
    firstPointWithOptions: '1 点目を指定 または',
    nextPointWithFitOptions: '次の点を指定 または',
    nextPointWithCvOptions: '次の制御点を指定 または',
    methodPrompt: 'スプラインの作成方法を入力',
    knotsPrompt: 'ノットのパラメータ化を入力',
    degreePrompt: 'スプラインの次数を指定',
    keywords: {
      method: {
        display: '方式(M)',
        local: '方式',
        global: 'Method'
      },
      fit: {
        display: 'フィット(F)',
        local: 'フィット',
        global: 'Fit'
      },
      cv: {
        display: '制御点(C)',
        local: '制御点',
        global: 'CV'
      },
      knots: {
        display: 'ノット(K)',
        local: 'ノット',
        global: 'Knots'
      },
      degree: {
        display: '次数(D)',
        local: '次数',
        global: 'Degree'
      },
      undo: {
        display: '元に戻す(U)',
        local: '元に戻す',
        global: 'Undo'
      },
      close: {
        display: '閉じる(C)',
        local: '閉じる',
        global: 'Close'
      },
      chord: {
        display: '弦長(C)',
        local: '弦長',
        global: 'Chord'
      },
      sqrtChord: {
        display: '弦長の平方根(S)',
        local: '弦長の平方根',
        global: 'SqrtChord'
      },
      uniform: {
        display: '均等(U)',
        local: '均等',
        global: 'Uniform'
      }
    }
  },
  objectscale: {
    action: 'オプションを入力',
    scaleName: '異尺度対応の尺度名を入力',
    done: '更新したオブジェクト',
    none: '(なし)',
    keywords: {
      add: {
        display: '追加(A)',
        local: '追加',
        global: 'Add'
      },
      delete: {
        display: '削除(D)',
        local: '削除',
        global: 'Delete'
      },
      list: {
        display: '一覧(L)',
        local: '一覧',
        global: 'List'
      }
    }
  },
  sysvar: {
    prompt: '新しい値を入力してください'
  },
  view: {
    enterName: '復元するビュー名を入力',
    notFound: 'ビュー "{name}" が見つかりません。'
  },
  zoom: {
    mainPrompt: '窓の一方のコーナーを指定 または',
    firstCorner: '一方のコーナーを指定',
    secondCorner: '対角コーナーを指定',
    centerPoint: '中心点を指定',
    heightOrScale: '高さまたは尺度を入力 (nX または nXP)',
    scaleFactor: '尺度を入力 (nX または nXP)',
    keywords: {
      all: {
        display: '全体(A)',
        local: '全体',
        global: 'All'
      },
      center: {
        display: '中心(C)',
        local: '中心',
        global: 'Center'
      },
      extents: {
        display: 'オブジェクト範囲(E)',
        local: 'オブジェクト範囲',
        global: 'Extents'
      },
      previous: {
        display: '前画面(P)',
        local: '前画面',
        global: 'Previous'
      },
      original: {
        display: '初期表示(O)',
        local: '初期表示',
        global: 'Original'
      },
      saved: {
        display: '保存ビュー(V)',
        local: '保存ビュー',
        global: 'Saved'
      },
      smart: {
        display: 'スマート(I)',
        local: 'スマート',
        global: 'Smart'
      },
      scale: {
        display: '倍率(S)',
        local: '倍率',
        global: 'Scale'
      },
      window: {
        display: '窓(W)',
        local: '窓',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportFormat: '書き出し形式',
    exportInvisibleLayers: '非表示の画層を書き出す',
    exportLayouts: 'レイアウトを書き出す',
    background: '背景色',
    initialView: 'HTML を開いたときの初期ビュー',
    viewerMode: 'オフライン ビューアのモード',
    chunkSizeMiB: 'チャンク サイズ (MiB、複数ファイル パッケージ)',
    compressChunks: 'チャンクを圧縮 (複数ファイル パッケージ)',
    keywords: {
      single: {
        display: '単一ファイル(S)',
        local: '単一ファイル',
        global: 'Single'
      },
      multi: {
        display: '複数ファイル パッケージ(M)',
        local: '複数ファイル パッケージ',
        global: 'Multi'
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
      extents: {
        display: 'オブジェクト範囲(E)',
        local: 'オブジェクト範囲',
        global: 'Extents'
      },
      current: {
        display: '現在(C)',
        local: '現在',
        global: 'Current'
      },
      view: {
        display: '表示(V)',
        local: '表示',
        global: 'View'
      },
      measure: {
        display: '計測とレビュー(M)',
        local: '計測とレビュー',
        global: 'Measure'
      },
      black: {
        display: '黒(B)',
        local: '黒',
        global: 'Black'
      },
      white: {
        display: '白(W)',
        local: '白',
        global: 'White'
      },
      space: {
        display: '空間(S)',
        local: '空間',
        global: 'Space'
      }
    }
  },
  cpdf: {
    modelSpaceFit: 'モデル空間の範囲',
    exportLayouts: 'レイアウトを書き出す',
    textMode: '文字のレンダリング',
    colorMode: '色モード',
    keywords: {
      extents: {
        display: 'オブジェクト範囲(E)',
        local: 'オブジェクト範囲',
        global: 'Extents'
      },
      display: {
        display: '画面表示(D)',
        local: '画面表示',
        global: 'Display'
      },
      text: {
        display: '文字(T)',
        local: '文字',
        global: 'Text'
      },
      vector: {
        display: 'ベクトル(V)',
        local: 'ベクトル',
        global: 'Vector'
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
      color: {
        display: 'カラー(C)',
        local: 'カラー',
        global: 'Color'
      },
      monochrome: {
        display: 'モノクロ(M)',
        local: 'モノクロ',
        global: 'Monochrome'
      }
    }
  },
  ucs: {
    originOrOptions: 'UCS の原点を指定 または',
    pointOnXAxis: 'X 軸上の点を指定 または',
    pointOnXyPlane: 'XY 平面上の点を指定 または',
    rotationAngle: '{axis} 軸を中心とした回転角度を指定',
    zAxisOrigin: '新しい原点を指定',
    pointOnZAxis: 'Z 軸の正の方向上の点を指定',
    selectObject: 'UCS を位置合わせするオブジェクトを選択',
    namedOption: 'オプションを入力',
    enterName: '復元する UCS の名前を入力 または [?]',
    saveName: '現在の UCS を保存する名前を入力',
    deleteName: '削除する UCS 名を入力',
    noPrevious: 'このセッションには以前の UCS がありません。',
    noNamed: '名前の付いた UCS 定義はありません。',
    notFound: 'UCS "{name}" が見つかりません。',
    invalidName: '無効な UCS 名です。',
    invalidObject: '選択したオブジェクトに UCS を位置合わせできません。',
    keywords: {
      named: {
        display: '名前の付いた UCS(A)',
        local: '名前の付いた UCS',
        global: 'Named'
      },
      object: {
        display: 'オブジェクト(B)',
        local: 'オブジェクト',
        global: 'Object'
      },
      previous: {
        display: '前の UCS(P)',
        local: '前の UCS',
        global: 'Previous'
      },
      view: {
        display: 'ビュー(V)',
        local: 'ビュー',
        global: 'View'
      },
      world: {
        display: 'ワールド(W)',
        local: 'ワールド',
        global: 'World'
      },
      x: {
        display: 'X',
        local: 'X',
        global: 'X'
      },
      y: {
        display: 'Y',
        local: 'Y',
        global: 'Y'
      },
      z: {
        display: 'Z',
        local: 'Z',
        global: 'Z'
      },
      zAxis: {
        display: 'Z 軸(N)',
        local: 'Z 軸',
        global: 'ZAxis'
      },
      apply: {
        display: '適用(L)',
        local: '適用',
        global: 'Apply'
      },
      restore: {
        display: '復元(R)',
        local: '復元',
        global: 'Restore'
      },
      save: {
        display: '保存(S)',
        local: '保存',
        global: 'Save'
      },
      delete: {
        display: '削除(D)',
        local: '削除',
        global: 'Delete'
      },
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      }
    }
  },
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
    enterNameOrBlank: 'グループ名を入力するか、無名の場合は Enter を押します',
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
    insertionPoint: '挿入点を指定（尺度 {scale}、モード {mode}）または',
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
    noDimensions:
      '選択範囲に寸法が見つかりません（矢印または斜線、寸法線、数値文字が必要です）。',
    convertAll:
      '寸法が {count} 個見つかりました（図面尺度 1:{scale}）。変換しますか？',
    convertOne: '寸法 {index}/{count}「{text}」: 変換しますか？',
    summary:
      '{count} 個の寸法を変換しました。寸法スタイル PDF_DIM の長さ尺度は {scale} です。'
  },
  bsearch: {
    unsupported:
      '選択したオブジェクトはどれも照合できません（線分、円弧、円、ポリライン、楕円、スプライン、文字、マルチテキスト、ブロック参照に対応）。',
    skipped:
      '選択したオブジェクトのうち {count} 個は照合できないため無視されます。',
    found:
      '一致するインスタンスが {count} 個見つかりました（変換対象 {included} 個）。選択',
    noMatches: '他のインスタンスは見つかりませんでした。',
    reviewOne: 'インスタンス {index}/{count}（{state}）',
    included: '含める',
    excluded: '除外',
    options:
      '回転 {rotation}、鏡像 {mirror}、尺度 {scale}、同一画層 {layer}、既存ブロック {blocks}、文字の違い {text}。切り替え',
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
    scope:
      '見つかった {count} 個のインスタンスも変換しますか、それとも元オブジェクトのみですか？',
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
    panel: {
      title: '文字認識',
      shxGroup: 'SHX 文字（線フォント）',
      meshGroup: 'TrueType 文字（アウトライン フォント）',
      style: '文字スタイル',
      newStyle: '新しい文字スタイル…',
      newTag: '新規',
      newStyleName: '新しい文字スタイル名',
      create: '作成',
      cancel: 'キャンセル',
      apply: '適用',
      nameError: {
        empty: '名前を入力してください。',
        invalid: '名前に使用できない文字が含まれています。',
        exists: '同じ名前の文字スタイルが既に存在します。'
      },
      font: 'フォント',
      bigFont: 'ビッグフォント',
      noBigFont: '(なし)',
      shxFonts: 'SHX フォント',
      ttfFonts: 'TrueType フォント',
      fontsUsed: '使用フォント: {fonts}',
      fontMissing: 'フォント「{font}」は使用できないため、「{fallback}」で表示されます。',
      fontNotShx: 'TrueType フォントです。SHX の線文字のようには表示されません。',
      fontNotTtf: 'SHX フォントです。TrueType のアウトライン文字のようには表示されません。',
      styleChanges: '文字スタイル「{style}」のフォントを変更します。このスタイルを使用している既存の文字も変わります。',
      heightScale: '高さの尺度',
      widthFactor: '幅係数',
      autoWidth: '元の幅に合わせる',
      lines: '文字行',
      include: 'この行を変換',
      textPlaceholder: '文字を入力 (空欄の場合はスキップ)',
      switchKind: 'SHX 文字と TrueType 文字を切り替え',
      kind: {
        shx: 'SHX',
        mesh: 'TrueType'
      },
      source: {
        dictionary: '学習済み',
        ocr: 'OCR',
        typed: '編集済み',
        unread: '未認識'
      },
      hideStrokes: '元の線分を非表示',
      ready: '{count} 行中 {ready} 行が準備完了',
      merge: 'マルチテキストに結合',
      mergeTip: '選択した行を 1 つのマルチテキスト（MTEXT）に結合します',
      split: '分割',
      splitTip: '選択した結合済みの文字を元の行に分割します',
      mergeAdjacent: '隣接文字を結合',
      mergeAdjacentTip: '同じベースライン上で隣り合う文字や単語をマルチテキストに結合します',
      mergedCount: '{count} 個のマルチテキストに結合しました。',
      selectHint: 'Ctrl+クリックまたは Shift+クリックで複数の行を選択できます。',
      mtextTag: 'マルチテキスト'
    },
    cancelled: '文字認識をキャンセルしました。変更はありません。',
    ocrNotConfigured:
      '文字認識（OCR）は無効です：画像に対応した AI モデルが設定されていません。LLMSETTINGS を実行して設定してください。',
    recognizing: '{count} 行の文字を認識しています…',
    ocrFailed:
      '文字認識（OCR）に失敗しました：{message}。文字を手動で入力するか、LLMSETTINGS を実行して AI モデルの設定を確認してください。',
    noCandidates: '選択内に文字らしいストロークが見つかりません。',
    summary:
      '{converted} 行を変換しました（自動認識 {automatic} 行）。スキップ {skipped} 行。'
  },
  pdfscale: {
    firstPoint: '既知の距離の 1 点目を指定',
    secondPoint: '2 点目を指定',
    realLength: '実際の長さを入力（測定値 {measured}）',
    realLengthFromDimensions:
      '実際の長さを入力（測定値 {measured}、寸法値から推定した尺度 1:{scale}）',
    zeroDistance: '2 点が同じ位置です。',
    applied: '{count} 個のオブジェクトを尺度 {factor} で変更しました。'
  }
}
