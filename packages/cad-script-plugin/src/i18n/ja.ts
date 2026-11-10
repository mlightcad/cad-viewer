/**
 * Japanese UI strings for the CAD script console.
 *
 * Flat keys under `main.toolPalette.script`.
 */
export const scriptJa = {
  scriptTab: 'スクリプト',
  scriptTitle: 'CAD スクリプト',
  scriptRun: '実行',
  scriptRunning: '実行中…',
  scriptHelp: 'スクリプトのヘルプ',
  scriptResize: '結果パネルのサイズを変更',
  scriptPlaceholder: '関数本体を記述してください。引数は cad のみです。',
  scriptHint: 'Ctrl+Enter で実行。「.」または Ctrl+Space で cad を補完します。',
  scriptSuccess: '成功',
  scriptFailed: '失敗',
  scriptReturnValue: '戻り値',
  scriptNoReturn: 'スクリプトは値を返しませんでした。',
  scriptLog: 'ログ',
  scriptImages: 'プレビュー',
  scriptImageAlt: 'スクリプトのプレビュー',
  scriptImageDownload: 'ダウンロード',
  scriptImageCopy: 'コピー',
  scriptImageCopied: 'コピーしました',
  scriptImageCopyFailed: 'コピーに失敗しました',
  scriptHighlighted: '強調表示',
  scriptCreated: '作成',
  scriptEmptyResult:
    'スクリプトを実行すると、戻り値、ログ、プレビュー、エラーが表示されます。',
  scriptNoDocument: '先に図面を開くか作成してください。',
  scriptReadOnly: '図面は読み取り専用モードで開かれています。',
  scriptNoView: '図面ビューを使用できません。',
  scriptTimeout:
    'スクリプトが時間またはステップの上限を超えたため停止しました。',
  scriptNotJson: '戻り値が JSON ではありません。',
  scriptEmptyCode: 'スクリプトが空です。',
  scriptTooLarge: 'スクリプトが長すぎます。',
  scriptDynamicAccess: 'cad への計算プロパティ アクセスは許可されていません。',
  scriptForbiddenSyntax: '禁止された構文',
  scriptForbiddenIdentifier: '禁止された識別子',
  scriptForbiddenMember: '禁止されたメンバー',
  scriptUnknownApi: '不明な cad API',
  scriptExamples: 'サンプル',
  scriptExamplesSearch: 'サンプルを検索',
  scriptExamplesEmpty: 'この検索に一致するサンプルはありません。',
  scriptExamplesUse: 'このスクリプトを使用',
  scriptExamplesClose: 'サンプルを閉じる'
} as const
