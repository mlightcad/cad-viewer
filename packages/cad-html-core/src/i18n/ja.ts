/**
 * Japanese strings for the exported HTML viewer.
 * Mirrors the `en` tree in {@link ../AcExHtmlI18n}.
 * @internal
 */
export const acexHtmlJaMessages = {
  toolbar: {
    viewerTools: 'ビューア ツール',
    select: '選択',
    pan: '画面移動',
    zoom: 'ズーム',
    zoomExtents: '範囲',
    zoomSmartExtents: 'スマート',
    zoomWindow: '窓',
    zoomSaved: '保存済み',
    zoomOriginal: '保存済み',
    measureDistance: '距離',
    measureContinuous: '連続',
    measureAngle: '角度',
    measureArc: '円弧',
    measureRadius: '半径',
    measureArea: '面積',
    measureCoordinate: '座標',
    clearMeasurements: 'クリア',
    measureHide: '非表示',
    measureShow: '表示',
    measureImport: '読み込み',
    measureExport: '書き出し',
    measurementPanel: '結果',
    measure: '計測',
    annotation: 'レビュー',
    markupCloud: '雲マーク',
    markupCallout: '吹き出し',
    markupText: '文字',
    markupRect: '長方形',
    markupCircle: '円',
    markupArrow: '矢印',
    markupStamp: 'スタンプ',
    markupPanel: '結果',
    markupHide: '非表示',
    markupShow: '表示',
    clearMarkups: 'クリア',
    markupImport: '読み込み',
    markupExport: '書き出し',
    snap: 'スナップ',
    layers: '画層',
    layout: 'レイアウト',
    settings: '設定',
    simulatedMouseOn: 'マウス',
    simulatedMouseOff: 'ルーペ',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    switchBg: '背景',
    language: '言語',
    localeEn: 'English',
    localeZh: '中文',
    localeCs: 'Čeština',
    localeTr: 'Türkçe',
    localeAr: 'العربية',
    localeJa: '日本語',
    localeKo: '한국어',
    collapse: 'ツールバーを折りたたむ',
    expand: 'ツールバーを展開',
    moreOverflow: 'その他のツール'
  },
  settings: {
    ortho: '直交モードの切り替え',
    polar: '極トラッキング角度',
    polarAngles: '極トラッキング角度'
  },
  drawStyle: {
    color: '色',
    fontSize: '文字の高さ',
    pickerTitle: '色を選択',
    close: '閉じる',
    ok: 'OK',
    cancel: 'キャンセル',
    index: '色番号: ',
    rgb: 'RGB: ',
    input: '色',
    inputPlaceholder: '1-255 または #RRGGBB'
  },
  shortCutToolbar: {
    more: 'その他',
    undo: '元に戻す',
    redo: 'やり直し',
    erase: '削除',
    collapse: 'ツールバーを折りたたむ',
    expand: 'ツールバーを展開'
  },
  textHeight: {
    title: '文字の高さ',
    close: '閉じる',
    ok: 'OK',
    cancel: 'キャンセル',
    adaptive: '画面に合わせる',
    custom: 'カスタムの文字の高さ',
    customPlaceholder: 'ワールドの高さ',
    fromScreen: '画面上のサイズから',
    fromScreenHint:
      '現在のズームで文字を画面上にどの大きさで表示するかを入力します。これはワールド空間の固定の高さに変換され、後でズームしても変わりません。',
    screenPxPlaceholder: 'フォント サイズ',
    screenUnit: 'px',
    convert: '変換'
  },
  entityPick: {
    cancel: '選択をキャンセル'
  },
  layers: {
    title: '画層',
    close: '画層を閉じる',
    showAll: 'すべて表示',
    hideAll: 'すべて非表示',
    zoomTo: '{name} にズーム'
  },
  review: {
    title: 'レビュー',
    close: 'レビューを閉じる',
    searchPlaceholder: 'マークアップを検索',
    empty: 'マークアップはまだありません',
    type: '種類',
    status: '状態',
    author: '作成者',
    summary: '概要',
    details: '詳細',
    closeDetails: '詳細を閉じる',
    label: 'ラベル',
    comment: 'コメント',
    zoomTo: 'ズーム',
    delete: '削除',
    clear: 'すべてクリア',
    statusValues: {
      open: '未対応',
      question: '質問',
      answered: '回答済み',
      closed: '完了'
    }
  },
  measurePanel: {
    title: '計測',
    close: '計測を閉じる',
    filterGroup: '種類でフィルタ',
    filterDistance: '距離',
    filterArc: '円弧',
    filterRadius: '半径',
    filterAngle: '角度',
    filterArea: '面積',
    empty: '計測はまだありません',
    type: '種類',
    value: '値',
    delete: '削除',
    clear: 'すべてクリア'
  },
  session: {
    length: '長さ',
    angle: '角度',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '確定',
    cancel: 'キャンセル',
    help: 'ヘルプ',
    back: '戻る',
    collapse: '折りたたむ',
    expand: '展開',
    undo: '元に戻す'
  },
  touchPointTutorial: {
    title: '点を正確に指定するには?',
    description:
      '画面を約 0.5 秒長押しします。指の上に十字カーソルが表示されて指の動きに追従し、図形にスナップするため、より正確に点を指定できます。',
    snoozeToday: '今日は表示しない',
    hideForever: '今後表示しない',
    ok: 'わかりました'
  },
  status: {
    ready: '準備完了',
    zoomWindowHint: '2 つのコーナーをクリックして窓ズームします。',
    measureDistanceHint:
      '2 点をクリックして距離を計測します (オブジェクト スナップ有効)。',
    measureContinuousHint:
      '点を順にタップして各セグメントを計測し、✓ をタップして終了します。長押しで正確にスナップできます。',
    measureAreaHint:
      '多角形の頂点をタップし、3 点以上指定したら ✓ をタップして終了します。長押しで正確にスナップできます。',
    measureAngleHint:
      '頂点をクリックし、次に各辺上の点を 1 つずつクリックします (オブジェクト スナップ有効)。',
    measureArcHint:
      '円または円弧をクリックしてそれに沿って計測するか、始点、円弧上の点、終点を順にクリックします (オブジェクト スナップ有効)。Ctrl (Mac では ⌘) で優弧/劣弧を切り替えます。',
    measureRadiusHint:
      '円または円弧をクリックして半径を計測します (オブジェクト スナップ有効)。',
    measureCoordinateHint:
      '点をクリックして X/Y 座標を表示します (オブジェクト スナップ有効)。',
    measureExported: '{count} 件の計測を書き出しました。',
    measureImported: '{count} 件の計測を読み込みました。',
    measureImportFailed: '計測の読み込みに失敗しました: {error}',
    markupCloudHint: '2 つのコーナーをクリックして雲マークを作成します。',
    markupCalloutHint:
      '引出線の先端、または吹き出しのない雲マーク / 長方形 / 円の輪郭をクリックし、次に文字の基点をクリックします。',
    markupTextHint: '点をクリックして文字を配置します。',
    markupRectHint: '2 つのコーナーをクリックして長方形を作成します。',
    markupCircleHint: '中心をクリックし、次に円周上の点をクリックします。',
    markupArrowHint: '始点をクリックし、次に矢印の先端をクリックします。',
    markupStampHint:
      'クリックしてスタンプを配置します (承認 / 却下 / … と順に切り替わります)。',
    markupArrowEndHint: '矢印の先端をクリックします。',
    markupRectCornerHint: 'もう一方のコーナーをクリックします。',
    markupCloudCornerHint: 'もう一方のコーナーをクリックします。',
    markupCalloutAnchorHint: '吹き出しの文字の位置をクリックします。',
    markupCircleRadiusHint: '円周上の点をクリックします。',
    markupTextPrompt: 'マークアップの文字を入力',
    markupTextEditHint:
      'キャンバス上で文字を入力します。Enter で確定、Esc でキャンセルします。',
    markupShapeCalloutHint:
      'クリックして文字ボックスを配置します (引出線は図形に接続されます)。Esc で吹き出しをキャンセルします。',
    markupDefaultLabel: 'メモ',
    markupSelected: '選択中のマークアップ: {type}',
    markupSelectedCount: '選択中のマークアップ: {count}',
    markupCount: 'マークアップ: {count}',
    markupExported: '{count} 件のマークアップを書き出しました。',
    markupImported: '{count} 件のマークアップを読み込みました。',
    markupImportFailed: 'マークアップの読み込みに失敗しました: {error}',
    distance: '距離: {value}',
    coordinates: 'X: {x} | Y: {y}',
    angle: '角度: {value}',
    arcLength:
      '円弧の長さ: {length} | 半径: {radius} | 角度: {angle} | 弦: {chord}',
    radius: '半径: {value}',
    continuousTotal: '合計長さ: {value}',
    area: '面積: {value}',
    lengthTotal: '長さの合計: {value}',
    areaTotal: '面積の合計: {value}',
    zoomLayer: 'ズーム: {name}',
    loadFailed: '図面の読み込みに失敗しました: {error}',
    noLayout: 'スナップショットにレイアウト データがありません。',
    loadingChunks: '図形を読み込み中… {loaded}/{total}',
    loadingOsnap: 'オブジェクト スナップを読み込み中… {loaded}/{total}',
    buildingOsnap: 'オブジェクト スナップのインデックスを作成中…'
  },
  package: {
    title: '図面パッケージを開く',
    hint: 'このページと同じ場所に drawing.acex.json が見つかりませんでした。ローカルのパッケージ フォルダを選択するか、マニフェストの URL を入力してください。',
    hintUrlOnly:
      'このページと同じ場所に drawing.acex.json が見つかりませんでした。パッケージを開くにはマニフェストの URL を入力してください。',
    chooseFolder: 'ローカル フォルダを選択',
    urlPlaceholder: 'https://example.com/drawing.acex.json',
    openUrl: 'URL を開く',
    urlRequired: 'マニフェストの URL を入力してください。',
    manifestNotFound:
      'このページと同じ場所に drawing.acex.json が見つかりませんでした。',
    invalidManifest:
      'パッケージ マニフェストが無効か、サポートされていないバージョンです: {error}',
    folderMissingManifest:
      '選択したフォルダには drawing.acex.json が含まれている必要があります。',
    folderUnsupported:
      'このブラウザーではローカルのパッケージ フォルダを開けません。代わりにマニフェストの URL を貼り付けてください。',
    loadFailed: 'パッケージを開けませんでした: {error}'
  },
  access: {
    title: '保護された図面',
    passwordPrompt: 'このファイルを開くにはパスワードを入力してください。',
    passwordPlaceholder: 'パスワード',
    unlock: 'ロック解除',
    passwordRequired: 'パスワードを入力してください。',
    wrongPassword: 'パスワードが正しくありません。もう一度お試しください。',
    expired: 'このファイルは有効期限が切れているため、開くことができません。',
    expiredTitle: 'ファイルの有効期限切れ',
    expiredDetail:
      'このファイルは {time} に有効期限が切れたため、開くことができません。',
    expiresAt: '有効期限: {time}',
    badgeExpires: '{time} に期限切れ',
    badgeCountdown: '残り {time}',
    tooManyAttempts:
      'パスワードの入力ミスが多すぎます。ページを更新してもう一度お試しください。'
  }
}
