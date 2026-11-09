export default {
  command: {
    ACAD: {
      quit: {
        description:
          'アプリケーションを終了し、開いているすべての図面を閉じます'
      },
      exit: {
        description:
          'アプリケーションを終了し、開いているすべての図面を閉じます'
      }
    }
  },

  example: {
    fileUpload: {
      title: '表示する CAD ファイルを選択',
      subtitle: 'DWG または DXF 図面をビューアに読み込みます',
      fontCdnNotice:
        'ネットワーク アクセスが制限されている国または地域にいる場合は、VPN をオンにしてください。既定のフォント ファイルは GitHub でホストされています。アクセスが制限されていると読み込みが非常に遅くなり、図面を開くのに時間がかかったり、文字が正しく表示されなかったりすることがあります。',
      newDrawing: '新規図面',
      or: 'または',
      dropFile: 'ここにファイルをドロップ、または',
      browse: '参照',

      openOptions: '開くオプション',

      initialView: '初期ビュー',
      auto: '自動',
      autoHint: 'アクセス モードに基づく',
      extents: 'オブジェクト範囲',
      extentsHint: '図面全体を表示',
      saved: '保存済み',
      savedHint: 'AutoCAD で保存したビュー',

      accessMode: 'アクセス モード',
      read: '読み取り',
      readHint: '表示のみ',
      review: 'レビュー',
      reviewHint: '表示とレビュー',
      write: '書き込み',
      writeHint: 'フル アクセス',

      textRendering: '文字の描画',
      worker: 'ワーカー',
      workerHint: '高速、メモリ使用量大',
      mainThread: 'メイン スレッド',
      mainThreadHint: '低速、メモリ使用量小',

      progressive: '段階的',
      progressiveRendering: '段階的レンダリング',
      on: 'オン',
      progressiveOnHint:
        '解析/変換が完了するまで UI をロックし、その後シーンの読み込み中に画面移動/ズームできます',
      off: 'オフ',
      progressiveOffHint: 'オブジェクトと文字の変換がすべて完了するまで待機',

      nonPlottable: '印刷しない',
      nonPlottableLayers: '印刷しない画層',
      hide: '非表示',
      hideHint: 'Web ビューアの既定',
      show: '表示',
      showHint: 'AutoCAD エディタと同じ動作',

      curveQuality: '曲線の品質',
      curveDraft: '省メモリ',
      curveDraftHint: '頂点数が少なく、ファイルが小さい',
      curveStandard: '標準',
      curveStandardHint: 'バランス (円 1 つにつき 100 辺)',
      curveHigh: '高品質',
      curveHighHint: '滑らかな曲線、メモリ使用量大',

      paperSpaceBackground: '用紙の背景',
      paperSpaceWhite: '白',
      paperSpaceWhiteHint: 'デスクトップ CAD / 印刷プレビュー',
      paperSpaceBlack: '黒',
      paperSpaceBlackHint: 'Web ビューアの好み',

      export: '書き出し',
      exportEnable: '有効',
      exportEnableHint: 'DXF/HTML/PDF/SVG/PNG の書き出しを許可',
      exportDisable: '無効',
      exportDisableHint: '書き出しコマンドとファイル メニュー項目を非表示',

      invalidFileType:
        '無効なファイル形式です。DWG または DXF ファイルをアップロードしてください。'
    }
  }
}
