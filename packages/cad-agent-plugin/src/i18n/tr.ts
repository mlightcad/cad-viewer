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
  clear: 'Temizle',
  close: 'Kapat',
  provider: 'Sağlayıcı',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (görsel)',
  providerDeepseekVlHint:
    'OpenAI uyumlu bir görsel uç nokta kullanır (varsayılan: SiliconFlow). Kendi barındırdığınız vLLM için Taban URL alanını sunucunuza ayarlayın, ör. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  providerOpenaiCompatible: 'OpenAI Uyumlu',
  baseUrl: 'Taban URL',
  model: 'Model',
  visionModels: 'Görsel modeller',
  textModels: 'Yalnızca metin modelleri',
  customModel: 'Özel model…',
  customModelName: 'Özel model adı',
  modelSupportsVision: 'Görsel girişi destekler',
  modelTextOnly: 'Yalnızca metin — görsel ekleri devre dışı',
  apiKey: 'API Anahtarı',
  saveSettings: 'Ayarları kaydet',
  emptyHint:
    'Çizilecek şeyi tanımlayın veya bir referans görsel ekleyin (kroki, ekran görüntüsü, kat planı).',
  toolPrefix: 'araç',
  inputPlaceholder: 'Oluşturulacak geometriyi tanımlayın…',
  attachImage: 'Görsel ekle',
  removeAttachment: 'Kaldır',
  imageAlt: 'Eklenen görsel',
  errorTitle: 'Bir şeyler ters gitti',
  dismissError: 'Kapat',
  send: 'Gönder',
  stop: 'Durdur',
  working: 'Çalışıyor…',
  agentMode: 'Ajan modu',
  agentModeSimple: 'Basit',
  agentModeHighInference: 'Yüksek akıl yürütme',
  agentModeSimpleHint:
    'Hızlı — çizimden sonra ekran görüntüsü doğrulaması yapılmaz.',
  agentModeHighInferenceHint:
    'Çizimden sonra ekran görüntüsü + görsel model ile doğrular (en fazla 5 tur). Görsel destekli model gerekir.',
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
    'Mesaj göndermeden önce ayarlardan bir API anahtarı yapılandırın.'
} as const
