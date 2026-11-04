/**
 * Czech UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentCs = {
  tab: 'Agent',
  title: 'CAD Agent',
  settings: 'Nastavení',
  clear: 'Nový chat',
  close: 'Zavřít',
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
  model: 'Model',
  apiKey: 'API klíč',
  emptyHint:
    'Popište, co se má nakreslit, nebo přiložte referenční obrázek (skica, snímek obrazovky, půdorys).',
  toolPrefix: 'nástroj',
  copyTool: 'Kopírovat volání nástroje (vstup a výstup)',
  toolCopied: 'Zkopírováno',
  inputPlaceholder: 'Popište svůj požadavek…',
  attachImage: 'Přiložit obrázek',
  removeAttachment: 'Odebrat',
  imageAlt: 'Přiložený obrázek',
  imageOnlyRequest:
    'Prosím analyzujte přiložený referenční obrázek (nebo obrázky) a pomozte mi jej nakreslit v CADu.',
  prepareImageFailed:
    'Přípravu přiloženého obrázku se nepodařilo dokončit. Zkuste menší PNG nebo JPEG.',
  errorTitle: 'Něco se pokazilo',
  dismissError: 'Zavřít',
  send: 'Odeslat',
  stop: 'Zastavit',
  working: 'Pracuji…',
  agentMode: 'Režim agenta',
  agentModeSimple: 'Jednoduchý',
  agentModeHighInference: 'Vysoká inference',
  agentModeSimpleHint:
    'Výchozí. Rychlý — pouze sebekontrola přes měřicí API; bez snímků a vizuálního ověření.',
  agentModeHighInferenceHint:
    'Volitelné pro složité úlohy. Povolí snímky a ověří výkres snímkem + vizuálním modelem (až 5 kol). Vyžaduje vizuální model.',
  highInferenceRequiresVision:
    'Režim vysoké inference vyžaduje model s podporou obrazu.',
  verificationTitle: 'Ověření výkresu',
  verifying:
    'Porovnávám snímek výkresu s vaším požadavkem a referenčními obrázky…',
  verificationPassed: 'Ověření prošlo — výkres odpovídá požadavku.',
  verificationFailed: 'Ověření selhalo — nalezené problémy:',
  verificationSkipped: 'Ověření přeskočeno',
  verificationError: 'Chyba ověření',
  verificationContinuing: 'Pokračuji v optimalizaci výkresu…',
  verificationMaxAttempts: 'Ověření neprošlo v rámci maximálního počtu pokusů.',
  referenceImages: 'Referenční obrázek(y)',
  drawingScreenshot: 'Snímek aktuálního výkresu',
  unsavedSettings: 'Před odesíláním zpráv uložte nastavení.',
  missingApiKey: 'Před odesíláním zpráv nastavte v nastavení API klíč.',
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
  toolsSummary: 'Volání nástrojů: {count}',
  toolsRunning: 'Probíhá volání nástrojů ({count})…',
  toolsFailed: 'Selhalo: {count}'
} as const
