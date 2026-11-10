/**
 * Japanese UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentJa = {
  tab: 'エージェント',
  title: 'CAD エージェント',
  settings: '設定',
  clear: '新しいチャット',
  close: '閉じる',
  model: 'モデル',
  emptyHint:
    '作図したい内容を説明するか、参照画像 (スケッチ、スクリーンショット、平面図) を添付してください。',
  toolPrefix: 'ツール',
  copyTool: 'ツール呼び出しをコピー (入力と出力)',
  toolCopied: 'コピーしました',
  copyMessage: 'メッセージをコピー',
  messageCopied: 'コピーしました',
  editMessage: 'メッセージを編集',
  cancelEdit: 'キャンセル',
  resendMessage: '送信',
  relativeTimeJustNow: 'たった今',
  relativeTimeSeconds: '{n} 秒前',
  relativeTimeMinutes: '{n} 分前',
  relativeTimeHours: '{n} 時間前',
  relativeTimeDays: '{n} 日前',
  queuedSendNow: '今すぐ送信',
  queuedEdit: '編集',
  queuedDelete: '削除',
  inputPlaceholder: '依頼内容を入力してください…',
  attachImage: '画像を添付',
  showContextUsage: 'コンテキスト使用量を表示',
  contextUsage: 'コンテキスト使用量',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '{percent}% 使用中',
  contextUsageTokens: '約 {used} / {limit} トークン',
  contextUsageSystemPrompt: 'システム プロンプト',
  contextUsageToolDefinitions: 'ツール定義',
  contextUsageImages: '画像',
  contextUsageConversation: '会話',
  removeAttachment: '削除',
  imageAlt: '添付画像',
  imageOnlyRequest:
    '添付した参照画像を分析し、これを CAD で作図するのを手伝ってください。',
  prepareImageFailed:
    '添付画像の準備に失敗しました。より小さい PNG または JPEG をお試しください。',
  errorTitle: '問題が発生しました',
  dismissError: '閉じる',
  send: '送信',
  stop: '停止',
  working: '処理中…',
  agentMode: 'エージェント モード',
  agentModeSimple: 'シンプル',
  agentModeHighInference: '高推論',
  agentModeSimpleHint:
    '既定。高速 — 計測 API による自己チェックを優先し、スクリーンショットは任意で使用します。ビジョンによる自動検証は行いません。',
  agentModeHighInferenceHint:
    '複雑なタスク向けのオプション。作図後、スクリーンショットとビジョン モデルで検証します (最大 5 回)。ビジョン対応モデルが必要です。',
  highInferenceRequiresVision: '高推論モードにはビジョン対応モデルが必要です。',
  verificationTitle: '図面の検証',
  verifying:
    '図面のスクリーンショットを依頼内容および参照画像と比較しています…',
  verificationPassed: '検証に合格しました — 図面は依頼内容と一致しています。',
  verificationFailed: '検証に失敗しました — 以下の問題が見つかりました:',
  verificationSkipped: '検証をスキップしました',
  verificationError: '検証エラー',
  verificationContinuing: '図面の改善を続けています…',
  verificationMaxAttempts: '最大試行回数内に検証に合格しませんでした。',
  referenceImages: '参照画像',
  drawingScreenshot: '現在の図面のスクリーンショット',
  missingApiKey:
    'メッセージを送信する前に、設定で API キーを構成してください。',
  toolsSummary: 'ツール呼び出し: {count}',
  toolsRunning: 'ツールを実行中 ({count})…',
  toolsFailed: '{count} 件失敗',
  taskPrompts: '推奨タスク',
  taskPromptsTitle: 'よく使うタスク',
  taskCategoryExtract: '抽出',
  taskCategoryStats: '統計',
  taskCategoryModify: '修正',
  taskCategoryCreate: '作成',
  taskCategoryReview: 'レビュー',
  taskDrawingOverviewTitle: '図面の概要',
  taskDrawingOverviewPrompt:
    '開いている図面の概要をまとめてください: 図面範囲、(判別できれば) 単位系、画層の一覧、図面に含まれていると思われる内容の簡単な説明。図面は再作図せず、照会のみ行ってください。',
  taskExtractTextTitle: '文字と表題欄の抽出',
  taskExtractTextPrompt:
    '開いている図面から読み取れるすべての文字を抽出してください。表題欄がある場合はその項目も含めてください。必要に応じて画層や領域ごとにグループ化し、値をわかりやすく一覧にしてください。',
  taskListDimensionsTitle: '寸法の一覧',
  taskListDimensionsPrompt:
    '開いている図面内の寸法オブジェクトを探し、計測値、関連する文字、おおよその位置を一覧にしてください。明らかに欠けている寸法や矛盾する寸法があれば要約してください。',
  taskEntityStatsTitle: 'オブジェクト数',
  taskEntityStatsPrompt:
    '開いている図面のオブジェクトを種類別および画層別に数えてください。すべてのオブジェクトを書き出すのではなく、集計クエリ (件数 / ブロックごとの統計) を優先してください。簡潔な表または箇条書きで示してください。',
  taskLayerReportTitle: '画層の使用状況レポート',
  taskLayerReportPrompt:
    '開いている図面の画層についてレポートしてください: 名前、表示/非表示、フリーズ、色、線種、画層ごとのおおよそのオブジェクト数。空の画層、未使用の画層、名前が不自然な画層を指摘してください。',
  taskOrganizeLayersTitle: '画層で整理',
  taskOrganizeLayersPrompt:
    '開いている図面に適した画層構成 (例: 壁、ドア、文字、寸法、家具) を提案して適用してください。誤った画層にあるオブジェクトを適切な画層に移動し、必要に応じて不足している画層を作成してください。変更内容を説明してください。',
  taskCleanupDrawingTitle: '図面のクリーンアップ',
  taskCleanupDrawingPrompt:
    '開いている図面に一般的なクリーンアップ対象 (長さゼロの図形、検出可能な重複オブジェクト、空の文字、未使用の画層) がないか調べ、安全に修正できるものを修正してください。実行した処理と、手動での確認が必要な残りの項目を要約してください。',
  taskDrawDimensionedRectTitle: '寸法付き長方形を作図',
  taskDrawDimensionedRectPrompt:
    '左下隅を (0, 0) とする 1000 × 600 (図面単位) の閉じた長方形を作図してください。幅と高さの水平寸法と垂直寸法を追加してください。図形と寸法にはわかりやすい画層を使用してください。',
  taskCreateTitleBlockTitle: '表題欄を作成',
  taskCreateTitleBlockPrompt:
    'モデル空間 (または既に設定済みならペーパー空間) に、A3 スタイルのシンプルな表題欄を作成してください: 外枠、表題、図面番号、尺度、日付、作図者の各欄にプレースホルダーの文字を入れてください。図形は専用の画層に配置してください。',
  taskFromReferenceTitle: '参照画像から作図',
  taskFromReferencePrompt:
    '参照画像 (スケッチ、スクリーンショット、または平面図) を添付します。注意深く分析し、意図された 2D CAD 図形を正しい比率、画層、および (読み取れる場合は) 寸法で再構築してください。重要な寸法があいまいな場合にのみ質問してください。',
  taskDraftingReviewTitle: '製図品質のレビュー',
  taskDraftingReviewPrompt:
    '開いている図面の製図品質の問題をレビューしてください: 文字の高さの不統一、図形と一致しない可能性のある寸法、重なっている注釈、別の画層に置くべき 0 画層上のオブジェクト、不完全なビュー。検出結果を重要度別に一覧にし、特に指示がない限り、明確で安全な問題のみを修正してください。',
  taskLayerStandardsTitle: '画層名のチェック',
  taskLayerStandardsPrompt:
    '画層の名前、色、使い方を一般的な CAD の慣例と照らし合わせてレビューしてください。よりわかりやすい命名規則を提案し、変更案を要約したうえで、必要に応じて画層の名前変更や色の変更を行ってください。'
} as const
