import type { llmEn } from './en'

/** Korean strings for the AI model settings dialog. */
export const llmKo = {
  title: 'AI 모델 설정',
  activeModel: '사용 중인 모델',
  activeModelHint:
    'CAD 에이전트 채팅에서 사용합니다. 문자 인식(OCR)은 이 모델이 이미지를 지원하면 이 모델을, 그렇지 않으면 설정한 첫 번째 이미지 지원 모델을 사용합니다.',
  activeModelNone: '아직 설정된 공급자가 없습니다',
  providerSettings: '공급자',
  saved: '설정을 저장했습니다.',
  discardChangesConfirm: '저장하지 않은 공급자 변경 내용을 취소하시겠습니까?',
  visionMissing:
    '설정된 모델 중 이미지 입력을 지원하는 모델이 없어 문자 인식(OCR)을 사용할 수 없습니다.',
  provider: '공급자',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (비전)',
  providerDeepseekVlHint:
    'OpenAI 호환 비전 엔드포인트를 사용합니다(기본값: SiliconFlow). 자체 호스팅 vLLM의 경우 기본 URL을 서버 주소로 설정하십시오(예: http://127.0.0.1:8000/v1).',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: '기본 URL',
  baseUrlHint:
    '대부분의 게이트웨이에서는 /v1을 포함해야 합니다(예: https://ai-api.example.com/v1). 호스트만 입력한 URL은 자동으로 보정됩니다.',
  apiKey: 'API 키',
  tabBuiltin: '타사 공급자',
  tabCustom: '사용자 모델 API',
  builtinIntro:
    'DeepSeek, OpenAI, Anthropic 등 기본 제공 공급자를 선택하고 API 키를 입력하십시오.',
  customIntro:
    '릴레이, 자체 호스팅 서비스 또는 기타 OpenAI / Anthropic 호환 엔드포인트에 연결합니다. API URL, 프로토콜 및 모델을 입력하십시오.',
  providerConfigured: '구성됨',
  apiKeyPlaceholder: 'API 키 입력',
  apiKeyRequired:
    '아직 API 키가 없습니다. 이 공급자로 메시지를 보내려면 키를 입력하십시오.',
  advancedSettings: '사용자 설정',
  baseUrlDefault: '기본값을 사용하려면 비워 두십시오: {url}',
  baseUrlInvalid: 'API URL은 http:// 또는 https://로 시작해야 합니다.',
  customProvider: '사용자 공급자',
  newCustomProvider: '+ 새 사용자 API',
  providerId: '공급자 ID',
  providerIdHint:
    '문자로 시작하는 소문자 식별자입니다(문자, 숫자, 하이픈). 작성 후에는 변경할 수 없습니다.',
  providerIdInvalid:
    '공급자 ID는 소문자로 시작해야 하며 소문자, 숫자, 하이픈만 포함할 수 있습니다.',
  providerIdTaken: '이 공급자 ID는 이미 사용 중입니다.',
  displayName: '표시 이름',
  protocol: 'API 프로토콜',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: '모델 카탈로그',
  modelsDefault: '기본 제공 모델 사용 중',
  modelsCustomized: '사용자 지정됨',
  resetModels: '기본값 복원',
  modelsEmpty:
    '아직 모델이 없습니다. "사용 가능한 모델 가져오기"를 클릭하거나 모델 ID를 직접 추가하십시오.',
  modelId: '모델 ID',
  modelVision: '이미지',
  modelVisionHint: '이미지 입력 지원',
  removeModel: '모델 제거',
  addModel: '모델 추가',
  fetchModels: '사용 가능한 모델 가져오기',
  fetching: '가져오는 중…',
  fetchNeedsKey: '먼저 API 키를 입력하십시오',
  fetchNeedsBaseUrl: '먼저 API URL을 입력하십시오',
  fetchTitle: '모델 선택',
  fetchSearch: '모델 검색',
  fetchSelectAll: '모두 선택',
  fetchDeselectAll: '모두 선택 해제',
  fetchNoMatches: '일치하는 모델이 없습니다',
  fetchAdopt: '적용',
  fetchKeepOne: '모델을 하나 이상 유지하십시오',
  fetchEmpty: '엔드포인트가 모델을 반환하지 않았습니다. 직접 추가하십시오.',
  fetchFailedNetwork:
    '{url}에 연결할 수 없습니다. 네트워크가 끊겼거나 엔드포인트가 브라우저(CORS) 요청을 허용하지 않을 수 있습니다. 모델을 직접 추가하십시오.',
  fetchFailedHttp:
    '모델을 가져오지 못했습니다: 엔드포인트가 HTTP {status}을(를) 반환했습니다. API 키와 URL을 확인하십시오.',
  fetchFailedFormat:
    '엔드포인트가 반환한 모델 목록을 인식할 수 없습니다. 모델을 직접 추가하십시오.',
  needsProviderId: '공급자 ID를 입력하십시오.',
  needsBaseUrl: 'API URL을 입력하십시오.',
  needsModels: '모델을 하나 이상 추가하십시오.',
  cancel: '취소',
  save: '저장',
  createProvider: '공급자 작성',
  deleteProvider: '공급자 삭제',
  deleteProviderConfirm: '공급자 "{id}"와(과) 해당 API 키를 삭제하시겠습니까?',
  recognitionTimeout: 'AI 모델이 {seconds}초 안에 응답하지 않았습니다',
  close: '닫기'
} satisfies Record<keyof typeof llmEn, string>
