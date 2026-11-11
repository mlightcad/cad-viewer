import type { llmEn } from './en'

/** Turkish strings for the AI model settings dialog. */
export const llmTr = {
  title: 'Yapay Zekâ Modeli Ayarları',
  activeModel: 'Kullanılan model',
  activeModelHint:
    'CAD ajanı sohbetinde kullanılır. Metin tanıma (OCR), görüntü kabul ediyorsa bu modeli, aksi halde yapılandırdığınız ilk görüntü destekli modeli kullanır.',
  activeModelNone: 'Henüz yapılandırılmış sağlayıcı yok',
  providerSettings: 'Sağlayıcılar',
  saved: 'Ayarlar kaydedildi.',
  discardChangesConfirm: 'Kaydedilmemiş sağlayıcı değişiklikleri atılsın mı?',
  visionMissing:
    'Yapılandırılmış modellerin hiçbiri görüntü kabul etmediği için metin tanıma (OCR) kullanılamıyor.',
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
  apiKey: 'API Anahtarı',
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
  recognitionTimeout: 'Yapay zekâ modeli {seconds} saniye içinde yanıt vermedi',
  close: 'Kapat'
} satisfies Record<keyof typeof llmEn, string>
