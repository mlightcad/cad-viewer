import type { llmEn } from './en'

/** Czech strings for the AI model settings dialog. */
export const llmCs = {
  title: 'Nastavení modelu AI',
  activeModel: 'Používaný model',
  activeModelHint:
    'Používá ho chat CAD agenta. Rozpoznávání textu (OCR) použije tento model, pokud přijímá obrázky, jinak první nakonfigurovaný model s podporou obrázků.',
  activeModelNone: 'Zatím není nakonfigurován žádný poskytovatel',
  providerSettings: 'Poskytovatelé',
  saved: 'Nastavení bylo uloženo.',
  discardChangesConfirm: 'Zahodit neuložené změny poskytovatele?',
  visionMissing:
    'Žádný z nakonfigurovaných modelů nepřijímá obrázky, proto rozpoznávání textu (OCR) není k dispozici.',
  provider: 'Poskytovatel',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (vizuální)',
  providerDeepseekVlHint:
    'Používá vizuální endpoint kompatibilní s OpenAI (výchozí: SiliconFlow). Pro vlastní vLLM nastavte Základní URL na svůj server, např. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'Základní URL',
  baseUrlHint:
    'U většiny bran musí obsahovat /v1, např. https://ai-api.example.com/v1. Pouze hostitel se doplní automaticky.',
  apiKey: 'API klíč',
  tabBuiltin: 'Poskytovatelé třetích stran',
  tabCustom: 'Vlastní API modelu',
  builtinIntro:
    'Vyberte vestavěného poskytovatele, např. DeepSeek, OpenAI nebo Anthropic, a zadejte jeho API klíč.',
  customIntro:
    'Připojte relay, vlastní službu nebo jiný koncový bod kompatibilní s OpenAI / Anthropic. Zadejte URL API, protokol a modely.',
  providerConfigured: 'nastaveno',
  apiKeyPlaceholder: 'Zadejte API klíč',
  apiKeyRequired:
    'API klíč zatím chybí. Zadejte ho, abyste mohli s tímto poskytovatelem odesílat zprávy.',
  advancedSettings: 'Vlastní nastavení',
  baseUrlDefault: 'Ponechte prázdné pro výchozí adresu: {url}',
  baseUrlInvalid: 'URL API musí začínat http:// nebo https://.',
  customProvider: 'Vlastní poskytovatel',
  newCustomProvider: '+ Nové vlastní API',
  providerId: 'ID poskytovatele',
  providerIdHint:
    'Identifikátor malými písmeny začínající písmenem (písmena, číslice a pomlčky). Po vytvoření jej nelze změnit.',
  providerIdInvalid:
    'ID poskytovatele musí začínat malým písmenem a obsahovat pouze malá písmena, číslice a pomlčky.',
  providerIdTaken: 'Toto ID poskytovatele se již používá.',
  displayName: 'Zobrazovaný název',
  protocol: 'Protokol API',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'Katalog modelů',
  modelsDefault: 'Používají se vestavěné výchozí modely',
  modelsCustomized: 'Upraveno',
  resetModels: 'Obnovit výchozí',
  modelsEmpty:
    'Zatím žádné modely. Klikněte na „Načíst dostupné modely“ nebo přidejte ID modelu ručně.',
  modelId: 'ID modelu',
  modelVision: 'Obrázky',
  modelVisionHint: 'Podporuje obrazový vstup',
  removeModel: 'Odebrat model',
  addModel: 'Přidat model',
  fetchModels: 'Načíst dostupné modely',
  fetching: 'Načítání…',
  fetchNeedsKey: 'Nejprve zadejte API klíč',
  fetchNeedsBaseUrl: 'Nejprve zadejte URL API',
  fetchTitle: 'Vyberte modely',
  fetchSearch: 'Hledat modely',
  fetchSelectAll: 'Vybrat vše',
  fetchDeselectAll: 'Zrušit výběr',
  fetchNoMatches: 'Žádné odpovídající modely',
  fetchAdopt: 'Použít',
  fetchKeepOne: 'Ponechte alespoň jeden model',
  fetchEmpty: 'Koncový bod nevrátil žádné modely. Přidejte je ručně.',
  fetchFailedNetwork:
    'Nelze se připojit k {url}. Může jít o problém se sítí nebo koncový bod nepovoluje požadavky z prohlížeče (CORS). Přidejte modely ručně.',
  fetchFailedHttp:
    'Načtení modelů selhalo: koncový bod vrátil HTTP {status}. Zkontrolujte API klíč a URL.',
  fetchFailedFormat:
    'Seznam modelů vrácený koncovým bodem nebyl rozpoznán. Přidejte modely ručně.',
  needsProviderId: 'Zadejte ID poskytovatele.',
  needsBaseUrl: 'Zadejte URL API.',
  needsModels: 'Přidejte alespoň jeden model.',
  cancel: 'Zrušit',
  save: 'Uložit',
  createProvider: 'Vytvořit poskytovatele',
  deleteProvider: 'Smazat poskytovatele',
  deleteProviderConfirm: 'Smazat poskytovatele „{id}“ a jeho API klíč?',
  recognitionTimeout: 'Model AI neodpověděl do {seconds} sekund',
  close: 'Zavřít'
} satisfies Record<keyof typeof llmEn, string>
