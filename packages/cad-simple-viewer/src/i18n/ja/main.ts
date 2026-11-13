export default {
  document: {
    untitled: '無題'
  },
  commandLine: {
    noLast: '(直前のコマンドなし)',
    unknownCommand: '不明なコマンド',
    executed: '実行したコマンド',
    showHistory: 'コマンド履歴を表示',
    placeholder: 'コマンドを入力',
    showMessages: 'メッセージ履歴を表示',
    canceled: '*キャンセル*',
    noHistory: '(履歴なし)',
    invalidInput: '無効な入力です。',
    close: 'コマンド ラインを閉じる'
  },
  mobileCommand: {
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
    expand: '展開'
  },
  inputManager: {
    firstCorner: '一方のコーナーを指定 または',
    secondCorner: 'もう一方のコーナーを指定 または'
  },
  message: {
    onLockedLayer: 'ロックされた画層上にあります。',
    fetchingDrawingFile: 'ファイルを取得しています...',
    exportingDxf: 'DXF を書き出しています...',
    exportingPdf: 'PDF を書き出しています...',
    exportingSvg: 'SVG を書き出しています...',
    calculatingSmartExtents: 'スマート範囲を計算しています...',
    importingPdf: 'PDF を読み込んでいます...',
    exportingEntityPreview: 'イメージを書き出しています...',
    collectingMemoryProfile: 'メモリを分析しています...',
    fontCached: 'フォントをキャッシュしました',
    fontCacheFailed: 'フォントのキャッシュに失敗しました',
    fontsNotFound: 'フォント リポジトリにフォントが見つかりません: {fonts}。',
    fontsNotLoaded: 'フォントの読み込みに失敗しました: {fonts}。',
    fontMissedInDrawing:
      'フォント「{font}」は {count} 個の文字オブジェクトで必要ですが、使用できません。「{replacementFont}」で表示します。',
    fontMissedReplacement: '「{font}」(「{replacement}」で表示)',
    failedToGetAvaiableFonts:
      '「{url}」から使用可能なフォントを取得できませんでした。',
    failedToOpenFile: 'ファイル「{fileName}」を開けませんでした。',
    failedToOpenFileToast:
      '「{fileName}」を開けませんでした。詳細は通知センターを確認してください。',
    failedToOpenFileWorkerOom:
      '「{fileName}」を開けませんでした。使用可能なメモリが不足したため解析に失敗しました (LibreDWG パーサー)。{dwgParserLink} から商用 DWG パーサーを購入すると、このクラッシュなしで大きな図面を開くことができます。',
    failedToOpenFileWorkerOomLink: 'このページ',
    failedToOpenFileWorkerTimeout:
      '「{fileName}」を開けませんでした。図面の解析中にタイムアウトしました。',
    failedToOpenFileFontLoadFailed:
      '「{fileName}」を開けませんでした。必要なフォントを読み込めませんでした。',
    failedToOpenFileLicenseExpired:
      '「{fileName}」を開けませんでした。DWG コンバーターのライセンスの有効期限が切れています。',
    failedToOpenFileLicenseInvalid:
      '「{fileName}」を開けませんでした。DWG コンバーターのライセンスが見つからないか無効です。',
    unknownEntities:
      'この図面には不明またはサポートされていないオブジェクトが {count} 個含まれています。これらのオブジェクトは表示されません。',
    tianzhengEntities:
      'この図面には TArch / Tianzheng (または類似のサード パーティ製) のカスタム オブジェクトが約 {count} 個含まれています。この環境では完全に解析できないため、一部の内容が表示されない場合があります。',
    emptyProxyEntities:
      'この図面にはプロキシ グラフィックスのないカスタム オブジェクトが {count} 個含まれています。これらのオブジェクトは表示されません。'
  },
  notification: {
    center: {
      title: '通知',
      clearAll: 'すべてクリア',
      noNotifications: '通知はありません'
    },
    group: {
      fontMissed: 'フォントの欠落',
      fontMissedSummary:
        'フォント関連のメッセージが {count} 件あります。クリックして詳細を表示します。',
      unsupportedEntities: 'サポートされていないオブジェクト',
      unsupportedEntitiesSummary:
        '解析関連のメッセージが {count} 件あります。クリックして詳細を表示します。',
      genericSummary:
        'メッセージが {count} 件あります。クリックして詳細を表示します。'
    },
    title: {
      failedToOpenFile: 'ファイルを開けませんでした',
      failedToOpenFileWorkerOom: 'メモリ不足',
      failedToOpenFileWorkerTimeout: '開く操作がタイムアウトしました',
      failedToOpenFileFontLoadFailed: 'フォントの読み込みに失敗',
      failedToOpenFileLicenseExpired: 'ライセンスの有効期限切れ',
      failedToOpenFileLicenseInvalid: '無効なライセンス',
      fontNotFound: 'フォントが見つかりません',
      fontNotLoaded: 'フォントが読み込まれていません',
      parsingWarning: '図面の解析時の問題',
      systemMessage: 'システム メッセージ',
      systemWarning: 'システム警告',
      systemError: 'システム エラー',
      systemInfo: 'システム情報'
    }
  },
  progress: {
    start: 'ファイルの解析を開始しています...',
    parse: 'ファイルを解析しています...',
    font: 'この図面に必要なフォントをダウンロードしています...',
    ltype: '線種を解析しています...',
    style: '文字スタイルを解析しています...',
    dimstyle: '寸法スタイルを解析しています...',
    layer: '画層を解析しています...',
    vport: 'ビューポートを解析しています...',
    blockrecord: 'ブロック レコードを解析しています...',
    header: 'ヘッダーを解析しています...',
    block: 'ブロックを解析しています...',
    entity: 'オブジェクトを解析しています...',
    object: '名前付きディクショナリを解析しています...',
    rendering: '図面をレンダリングしています...',
    end: '完了しました。'
  },
  about: {
    title: 'バージョン情報',
    close: '閉じる',
    product: 'CAD ビューア',
    tagline: 'DWG および DXF 図面用の高性能 Web CAD ビューア。',
    website: 'Web サイト',
    docs: 'ドキュメント',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. 無断転載を禁じます。',
    ok: 'OK'
  },
  drawStyle: {
    color: '色',
    fontSize: '文字の高さ'
  },
  shortCutToolbar: {
    more: 'その他',
    undo: '元に戻す',
    redo: 'やり直し',
    erase: '削除',
    copy: 'コピー',
    cut: '切り取り',
    paste: '貼り付け',
    collapse: 'ツールバーを折りたたむ',
    expand: 'ツールバーを展開'
  },
  textHeight: {
    title: '文字の高さ',
    close: '閉じる',
    ok: 'OK',
    cancel: 'キャンセル',
    adaptive: '画面に合わせる',
    custom: 'カスタム文字高さ',
    customPlaceholder: 'ワールド高さ',
    fromScreen: '画面サイズから',
    fromScreenHint:
      '現在のズームで画面上に表示される文字の大きさを入力します。この値は固定のワールド空間の高さに変換され、後でズームしても一定に保たれます。',
    screenPxPlaceholder: 'フォント サイズ',
    screenUnit: 'px',
    convert: '変換'
  },
  entityPick: {
    cancel: '選択をキャンセル'
  },
  colorPicker: {
    title: '色を選択',
    close: '閉じる',
    ok: 'OK',
    cancel: 'キャンセル',
    index: 'インデックス カラー: ',
    rgb: 'RGB: ',
    input: '色',
    inputPlaceholder: '1-255 または #RRGGBB'
  },
  touchPointTutorial: {
    title: '点を正確に指定するには',
    description:
      '画面を約 0.5 秒間長押しします。指の上に十字カーソルが表示されて指の動きに追従し、図形にスナップするため、より正確に指定できます。',
    snoozeToday: '今日は表示しない',
    hideForever: '今後表示しない',
    ok: 'OK'
  },
  dataSource: {
    open: '開く',
    local: 'ローカル ファイル',
    url: 'URL から',
    openFrom: '{name} から開く',
    signInTo: '{name} にサインイン',
    signOutOf: '{name} からサインアウト',
    signOutOfAccount: '{name} ({account}) からサインアウト',
    urlDialogTitle: 'URL から開く',
    urlDialogHint: '.dwg または .dxf ファイルの URL を入力してください。',
    urlPlaceholder: 'https://example.com/drawing.dwg',
    cancel: 'キャンセル',
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
    or: 'または',
    dropFile: 'ここにファイルをドロップ、または',
    browse: '参照',
    dropOrBrowse: 'ここに DWG または DXF ファイルをドロップするか、参照します',
    newDrawing: '新規図面',
    source: 'ソース',
    unavailable: 'このソースはまだ使用できません。',
    selectFile: 'ファイルを選択',
    signInRequired: 'ファイルを選択するには、先にサインインしてください。',
    downloading: 'ファイルをダウンロードしています...'
  },
  dockPanel: {
    close: 'パネルを閉じる',
    dockSide: 'ドッキング位置',
    dockTop: '上にドッキング',
    dockBottom: '下にドッキング',
    dockLeft: '左にドッキング',
    dockRight: '右にドッキング',
    moreTabs: 'その他のタブ',
    resize: 'パネルのサイズを変更',
    tab: {
      layers: '画層',
      review: 'レビュー',
      find: '検索',
      measurements: '計測'
    }
  }
}
