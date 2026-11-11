import type { llmEn } from './en'

/** Japanese strings for the AI model settings dialog. */
export const llmJa = {
  title: 'AI モデル設定',
  activeModel: '使用中のモデル',
  activeModelHint:
    'CAD エージェントのチャットで使用します。文字認識（OCR）は、このモデルが画像に対応していればこのモデルを、そうでなければ設定済みで最初の画像対応モデルを使用します。',
  activeModelNone: 'プロバイダがまだ設定されていません',
  providerSettings: 'プロバイダ',
  saved: '設定を保存しました。',
  discardChangesConfirm: '保存していないプロバイダの変更を破棄しますか？',
  visionMissing:
    '設定済みのモデルはいずれも画像入力に対応していないため、文字認識（OCR）は使用できません。',
  provider: 'プロバイダ',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (ビジョン)',
  providerDeepseekVlHint:
    'OpenAI 互換のビジョン エンドポイントを使用します (既定: SiliconFlow)。セルフホストの vLLM を使う場合は、ベース URL を自分のサーバーに設定してください (例: http://127.0.0.1:8000/v1)。',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'ベース URL',
  baseUrlHint:
    'ほとんどのゲートウェイでは /v1 を含める必要があります (例: https://ai-api.example.com/v1)。ホストのみの URL は自動的に補正されます。',
  apiKey: 'API キー',
  tabBuiltin: 'サードパーティ プロバイダ',
  tabCustom: 'カスタム モデル API',
  builtinIntro:
    'DeepSeek、OpenAI、Anthropic などの組み込みプロバイダを選択し、その API キーを入力してください。',
  customIntro:
    'リレー、セルフホスト サービス、またはその他の OpenAI / Anthropic 互換エンドポイントに接続します。API URL、プロトコル、モデルを入力してください。',
  providerConfigured: '構成済み',
  apiKeyPlaceholder: 'API キーを入力',
  apiKeyRequired:
    'API キーがまだありません。このプロバイダでメッセージを送信するには入力してください。',
  advancedSettings: 'カスタム設定',
  baseUrlDefault: '空欄の場合は既定値を使用します: {url}',
  baseUrlInvalid: 'API URL は http:// または https:// で始まる必要があります。',
  customProvider: 'カスタム プロバイダ',
  newCustomProvider: '+ 新しいカスタム API',
  providerId: 'プロバイダ ID',
  providerIdHint:
    '英字で始まる小文字の識別子 (英字、数字、ハイフン)。作成後は変更できません。',
  providerIdInvalid:
    'プロバイダ ID は小文字の英字で始まり、小文字の英字、数字、ハイフンのみを含む必要があります。',
  providerIdTaken: 'このプロバイダ ID は既に使用されています。',
  displayName: '表示名',
  protocol: 'API プロトコル',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'モデル カタログ',
  modelsDefault: '組み込みの既定モデルを使用中',
  modelsCustomized: 'カスタマイズ済み',
  resetModels: '既定に戻す',
  modelsEmpty:
    'モデルがまだありません。「利用可能なモデルを取得」をクリックするか、モデル ID を手動で追加してください。',
  modelId: 'モデル ID',
  modelVision: '画像',
  modelVisionHint: '画像入力に対応',
  removeModel: 'モデルを削除',
  addModel: 'モデルを追加',
  fetchModels: '利用可能なモデルを取得',
  fetching: '取得中…',
  fetchNeedsKey: '先に API キーを入力してください',
  fetchNeedsBaseUrl: '先に API URL を入力してください',
  fetchTitle: 'モデルを選択',
  fetchSearch: 'モデルを検索',
  fetchSelectAll: 'すべて選択',
  fetchDeselectAll: 'すべて選択解除',
  fetchNoMatches: '一致するモデルがありません',
  fetchAdopt: '適用',
  fetchKeepOne: '少なくとも 1 つのモデルを残してください',
  fetchEmpty:
    'エンドポイントからモデルが返されませんでした。手動で追加してください。',
  fetchFailedNetwork:
    '{url} に接続できませんでした。ネットワークがダウンしているか、エンドポイントがブラウザーからの (CORS) リクエストを許可していない可能性があります。モデルを手動で追加してください。',
  fetchFailedHttp:
    'モデルの取得に失敗しました: エンドポイントが HTTP {status} を返しました。API キーと URL を確認してください。',
  fetchFailedFormat:
    'エンドポイントから返されたモデル一覧を認識できません。モデルを手動で追加してください。',
  needsProviderId: 'プロバイダ ID を入力してください。',
  needsBaseUrl: 'API URL を入力してください。',
  needsModels: '少なくとも 1 つのモデルを追加してください。',
  cancel: 'キャンセル',
  save: '保存',
  createProvider: 'プロバイダを作成',
  deleteProvider: 'プロバイダを削除',
  deleteProviderConfirm: 'プロバイダ「{id}」とその API キーを削除しますか?',
  recognitionTimeout: 'AI モデルが {seconds} 秒以内に応答しませんでした',
  close: '閉じる'
} satisfies Record<keyof typeof llmEn, string>
