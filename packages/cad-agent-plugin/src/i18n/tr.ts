/**
 * Turkish UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentTr = {
  tab: 'Ajan',
  title: 'CAD Ajanı',
  settings: 'Ayarlar',
  clear: 'Yeni sohbet',
  close: 'Kapat',
  provider: 'Sağlayıcı',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (görsel)',
  providerDeepseekVlHint:
    'OpenAI uyumlu bir görsel uç nokta kullanır (varsayılan: SiliconFlow). Kendi barındırdığınız vLLM için Taban URL alanını sunucunuza ayarlayın, ör. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'Taban URL',
  baseUrlHint:
    'Çoğu ağ geçidi için /v1 gerekir, örn. https://ai-api.example.com/v1. Yalnızca ana bilgisayar adı otomatik düzeltilir.',
  model: 'Model',
  apiKey: 'API Anahtarı',
  emptyHint:
    'Çizilecek şeyi tanımlayın veya bir referans görsel ekleyin (kroki, ekran görüntüsü, kat planı).',
  toolPrefix: 'araç',
  copyTool: 'Araç çağrısını kopyala (girdi ve çıktı)',
  toolCopied: 'Kopyalandı',
  inputPlaceholder: 'İsteğinizi yazın…',
  attachImage: 'Görsel ekle',
  removeAttachment: 'Kaldır',
  imageAlt: 'Eklenen görsel',
  imageOnlyRequest:
    'Lütfen eklenen referans görseli/görselleri analiz edin ve bunu CAD olarak çizmeye yardımcı olun.',
  prepareImageFailed:
    'Eklenen görsel hazırlanamadı. Daha küçük bir PNG veya JPEG deneyin.',
  errorTitle: 'Bir şeyler ters gitti',
  dismissError: 'Kapat',
  send: 'Gönder',
  stop: 'Durdur',
  working: 'Çalışıyor…',
  agentMode: 'Ajan modu',
  agentModeSimple: 'Basit',
  agentModeHighInference: 'Yüksek akıl yürütme',
  agentModeSimpleHint:
    'Varsayılan. Hızlı — yalnızca ölçüm API’si ile öz kontrol; ekran görüntüsü veya görsel doğrulama yok.',
  agentModeHighInferenceHint:
    'Karmaşık görevler için isteğe bağlı. Ekran görüntüsüne izin verir; ekran görüntüsü + görsel model ile doğrular (en fazla 5 tur). Görsel destekli model gerekir.',
  highInferenceRequiresVision:
    'Yüksek akıl yürütme modu görsel destekli bir model gerektirir.',
  verificationTitle: 'Çizim doğrulaması',
  verifying:
    'Çizim ekran görüntüsü isteğiniz ve referans görsellerle karşılaştırılıyor…',
  verificationPassed: 'Doğrulama başarılı — çizim isteğe uyuyor.',
  verificationFailed: 'Doğrulama başarısız — bulunan sorunlar:',
  verificationSkipped: 'Doğrulama atlandı',
  verificationError: 'Doğrulama hatası',
  verificationContinuing: 'Çizim optimize edilmeye devam ediliyor…',
  verificationMaxAttempts:
    'Maksimum doğrulama denemesi aşıldı, doğrulama geçilemedi.',
  referenceImages: 'Referans görsel(ler)',
  drawingScreenshot: 'Mevcut çizim ekran görüntüsü',
  unsavedSettings: 'Mesaj göndermeden önce ayarları kaydedin.',
  missingApiKey:
    'Mesaj göndermeden önce ayarlardan bir API anahtarı yapılandırın.',
  tabBuiltin: 'Üçüncü taraf sağlayıcılar',
  tabCustom: 'Özel model API',
  builtinIntro:
    'DeepSeek, OpenAI veya Anthropic gibi yerleşik bir sağlayıcı seçin ve API anahtarını girin.',
  customIntro:
    'Bir aktarma sunucusuna, kendi barındırdığınız hizmete veya OpenAI / Anthropic uyumlu başka bir uç noktaya bağlanın. API URL, protokol ve modelleri girin.',
  providerConfigured: 'yapılandırıldı',
  apiKeyPlaceholder: 'API anahtarını girin',
  apiKeyRequired:
    'Henüz API anahtarı yok. Bu sağlayıcıyla mesaj göndermek için bir anahtar girin.',
  advancedSettings: 'Özel ayarlar',
  baseUrlDefault: 'Varsayılanı kullanmak için boş bırakın: {url}',
  baseUrlInvalid: 'API URL http:// veya https:// ile başlamalıdır.',
  customProvider: 'Özel sağlayıcı',
  newCustomProvider: '+ Yeni özel API',
  providerId: 'Sağlayıcı kimliği',
  providerIdHint:
    'Harfle başlayan küçük harfli bir tanımlayıcı (harf, rakam ve kısa çizgi). Oluşturulduktan sonra değiştirilemez.',
  providerIdInvalid:
    'Sağlayıcı kimliği küçük harfle başlamalı ve yalnızca küçük harf, rakam ve kısa çizgi içermelidir.',
  providerIdTaken: 'Bu sağlayıcı kimliği zaten kullanılıyor.',
  displayName: 'Görünen ad',
  protocol: 'API protokolü',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'Model kataloğu',
  modelsDefault: 'Yerleşik varsayılan modeller kullanılıyor',
  modelsCustomized: 'Özelleştirildi',
  resetModels: 'Varsayılanları geri yükle',
  modelsEmpty:
    'Henüz model yok. "Kullanılabilir modelleri getir"e tıklayın veya bir model kimliğini elle ekleyin.',
  modelId: 'Model kimliği',
  modelVision: 'Görsel',
  modelVisionHint: 'Görsel girişi destekler',
  removeModel: 'Modeli kaldır',
  addModel: 'Model ekle',
  fetchModels: 'Kullanılabilir modelleri getir',
  fetching: 'Getiriliyor…',
  fetchNeedsKey: 'Önce bir API anahtarı girin',
  fetchNeedsBaseUrl: 'Önce bir API URL girin',
  fetchTitle: 'Model seçin',
  fetchSearch: 'Model ara',
  fetchSelectAll: 'Tümünü seç',
  fetchDeselectAll: 'Seçimi kaldır',
  fetchNoMatches: 'Eşleşen model yok',
  fetchAdopt: 'Uygula',
  fetchKeepOne: 'En az bir model bırakın',
  fetchEmpty: 'Uç nokta hiç model döndürmedi. Modelleri elle ekleyin.',
  fetchFailedNetwork:
    '{url} adresine ulaşılamadı. Ağ sorunu olabilir veya uç nokta tarayıcı (CORS) isteklerine izin vermiyor. Modelleri elle ekleyin.',
  fetchFailedHttp:
    'Modeller alınamadı: uç nokta HTTP {status} döndürdü. API anahtarını ve URL’yi kontrol edin.',
  fetchFailedFormat:
    'Uç noktanın döndürdüğü model listesi tanınmadı. Modelleri elle ekleyin.',
  needsProviderId: 'Bir sağlayıcı kimliği girin.',
  needsBaseUrl: 'API URL girin.',
  needsModels: 'En az bir model ekleyin.',
  cancel: 'İptal',
  save: 'Kaydet',
  createProvider: 'Sağlayıcı oluştur',
  deleteProvider: 'Sağlayıcıyı sil',
  deleteProviderConfirm: '"{id}" sağlayıcısı ve API anahtarı silinsin mi?',
  toolsSummary: '{count} araç çağrısı',
  toolsRunning: 'Araçlar çalışıyor ({count})…',
  toolsFailed: '{count} başarısız'
} as const
