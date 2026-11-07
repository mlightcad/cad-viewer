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
  copyMessage: 'Mesajı kopyala',
  messageCopied: 'Kopyalandı',
  editMessage: 'Mesajı düzenle',
  cancelEdit: 'İptal',
  resendMessage: 'Gönder',
  relativeTimeJustNow: 'az önce',
  relativeTimeSeconds: '{n} sn önce',
  relativeTimeMinutes: '{n} dk önce',
  relativeTimeHours: '{n} sa önce',
  relativeTimeDays: '{n} g önce',
  queuedSendNow: 'Şimdi gönder',
  queuedEdit: 'Düzenle',
  queuedDelete: 'Sil',
  inputPlaceholder: 'İsteğinizi yazın…',
  attachImage: 'Görsel ekle',
  showContextUsage: 'Bağlam kullanımını göster',
  contextUsage: 'Bağlam Kullanımı',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '%{percent} dolu',
  contextUsageTokens: '~{used} / {limit} Token',
  contextUsageSystemPrompt: 'Sistem istemi',
  contextUsageToolDefinitions: 'Araç tanımları',
  contextUsageImages: 'Görseller',
  contextUsageConversation: 'Konuşma',
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
  toolsFailed: '{count} başarısız',
  taskPrompts: 'Önerilen görevler',
  taskPromptsTitle: 'Sık kullanılan görevler',
  taskCategoryExtract: 'Çıkarma',
  taskCategoryStats: 'İstatistik',
  taskCategoryModify: 'Düzenleme',
  taskCategoryCreate: 'Oluşturma',
  taskCategoryReview: 'İnceleme',
  taskDrawingOverviewTitle: 'Çizim özeti',
  taskDrawingOverviewPrompt:
    'Açık çizimi özetle: extents, varsa birim sistemi, katman listesi ve çizimin ne içerdiğine dair kısa bir açıklama. Sorgula — yeniden çizme.',
  taskExtractTextTitle: 'Metin ve antet çıkar',
  taskExtractTextPrompt:
    'Açık çizimdeki tüm okunabilir metni çıkar; varsa antet alanlarını da dahil et. Yararlıysa katmana veya bölgeye göre grupla ve değerleri net listele.',
  taskListDimensionsTitle: 'Ölçüleri listele',
  taskListDimensionsPrompt:
    'Açık çizimdeki ölçü nesnelerini bul; ölçülen değerleri, ilişkili metni ve yaklaşık konumları listele. Eksik veya tutarsız ölçüleri özetle.',
  taskEntityStatsTitle: 'Nesne sayıları',
  taskEntityStatsPrompt:
    'Açık çizimdeki nesneleri türe ve katmana göre say. Her nesneyi dökmek yerine özet sorguları tercih et. Kompakt bir tablo veya madde listesi sun.',
  taskLayerReportTitle: 'Katman kullanım raporu',
  taskLayerReportPrompt:
    'Açık çizimdeki katmanları bildir: ad, açık/kapalı, dondurma, renk, çizgi tipi ve katman başına yaklaşık nesne sayısı. Boş, kullanılmayan veya tuhaf adlı katmanları işaretle.',
  taskOrganizeLayersTitle: 'Katmanlara göre düzenle',
  taskOrganizeLayersPrompt:
    'Açık çizim için mantıklı bir katman düzeni öner ve uygula (ör. duvarlar, kapılar, metin, ölçüler, mobilya). Yanlış katmandaki nesneleri taşı; gerekirse eksik katmanları oluştur. Değişiklikleri açıkla.',
  taskCleanupDrawingTitle: 'Çizimi temizle',
  taskCleanupDrawingPrompt:
    'Açık çizimi yaygın temizlik sorunları için incele (sıfır uzunluklu geometri, tespit edilebilen çakışan kopyalar, boş metin, kullanılmayan katmanlar) ve güvenli olanları düzelt. Yapılanları ve manuel inceleme gerekenleri özetle.',
  taskDrawDimensionedRectTitle: 'Ölçülü dikdörtgen çiz',
  taskDrawDimensionedRectPrompt:
    'Sol alt köşesi (0, 0) olan 1000 × 600 (çizim birimi) kapalı bir dikdörtgen çiz. Genişlik ve yükseklik için yatay ve dikey ölçüler ekle. Geometri ve ölçüler için net katmanlar kullan.',
  taskCreateTitleBlockTitle: 'Antet oluştur',
  taskCreateTitleBlockPrompt:
    'Model alanında (veya kuruluysa kağıt alanında) basit bir A3 tarzı antet oluştur: dış çerçeve, başlık, çizim no, ölçek, tarih ve çizen alanları yer tutucu metinle. Geometriyi ayrı bir katmana koy.',
  taskFromReferenceTitle: 'Referans görüntüden çiz',
  taskFromReferencePrompt:
    'Bir referans görüntü ekleyeceğim (kroki, ekran görüntüsü veya plan). Dikkatle analiz et, ardından doğru oranlarla 2B CAD geometrisini yeniden oluştur; katmanlara ayır ve görünen ölçüleri ekle. Yalnızca kritik bir boyut belirsizse sor.',
  taskDraftingReviewTitle: 'Çizim kalitesi incelemesi',
  taskDraftingReviewPrompt:
    'Açık çizimi çizim kalitesi açısından incele: tutarsız metin yükseklikleri, geometriyle uyuşmayabilecek ölçüler, çakışan notlar, 0 katmanında olması gereken nesneler, eksik görünümler. Bulguları önem sırasıyla listele; aksi istenmedikçe yalnızca net ve güvenli sorunları düzelt.',
  taskLayerStandardsTitle: 'Katman adlandırma kontrolü',
  taskLayerStandardsPrompt:
    'Katman adlarını, renkleri ve kullanımı yaygın CAD kurallarına göre incele. Daha net bir adlandırma öner; önerilen değişiklikleri özetledikten sonra isteğe bağlı olarak yeniden adlandır/renkleri güncelle.'
} as const
