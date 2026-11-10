import type { llmEn } from './en'

/** Arabic strings for the AI model settings dialog. */
export const llmAr = {
  title: 'إعدادات نموذج الذكاء الاصطناعي',
  activeModel: 'النموذج المستخدم',
  activeModelHint:
    'يستخدمه وكيل CAD في الدردشة. يستخدم التعرف على النص (OCR) هذا النموذج إذا كان يقبل الصور، وإلا فأول نموذج يدعم الصور قمت بإعداده.',
  activeModelNone: 'لم يتم إعداد أي مزود بعد',
  providerSettings: 'المزودون',
  saved: 'تم حفظ الإعدادات.',
  discardChangesConfirm: 'هل تريد تجاهل تغييرات المزود غير المحفوظة؟',
  visionMissing:
    'لا يقبل أي من النماذج المُعدّة الصور، لذلك التعرف على النص (OCR) غير متاح.',
  provider: 'المزوّد',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (رؤية)',
  providerDeepseekVlHint:
    'يستخدم نقطة نهاية للرؤية متوافقة مع OpenAI (الافتراضي: SiliconFlow). عند استخدام vLLM مستضاف محليًا، اضبط Base URL على عنوان الخادم، مثل http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'عنوان Base URL',
  baseUrlHint:
    'يجب أن يتضمن /v1 لمعظم البوابات، مثل https://ai-api.example.com/v1. يتم تصحيح عنوان المضيف فقط تلقائيًا.',
  apiKey: 'مفتاح API',
  tabBuiltin: 'مزوّدو الطرف الثالث',
  tabCustom: 'واجهة API مخصّصة للنموذج',
  builtinIntro:
    'اختر مزوّدًا مدمجًا مثل DeepSeek أو OpenAI أو Anthropic وأدخل مفتاح API الخاص به.',
  customIntro:
    'اتصل بخادم وسيط أو خدمة مستضافة ذاتيًا أو أي نقطة نهاية متوافقة مع OpenAI / Anthropic. أدخل عنوان API والبروتوكول والنماذج.',
  providerConfigured: 'تم الإعداد',
  apiKeyPlaceholder: 'أدخل مفتاح API',
  apiKeyRequired:
    'لا يوجد مفتاح API بعد. أدخل مفتاحًا لإرسال الرسائل عبر هذا المزوّد.',
  advancedSettings: 'إعدادات مخصّصة',
  baseUrlDefault: 'اتركه فارغًا لاستخدام العنوان الافتراضي: {url}',
  baseUrlInvalid: 'يجب أن يبدأ عنوان API بـ http:// أو https://.',
  customProvider: 'مزوّد مخصّص',
  newCustomProvider: '+ واجهة API مخصّصة جديدة',
  providerId: 'معرّف المزوّد',
  providerIdHint:
    'معرّف بأحرف صغيرة يبدأ بحرف (أحرف وأرقام وشرطات). لا يمكن تغييره بعد الإنشاء.',
  providerIdInvalid:
    'يجب أن يبدأ معرّف المزوّد بحرف صغير وأن يحتوي على أحرف صغيرة وأرقام وشرطات فقط.',
  providerIdTaken: 'معرّف المزوّد هذا مستخدم بالفعل.',
  displayName: 'الاسم المعروض',
  protocol: 'بروتوكول API',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'كتالوج النماذج',
  modelsDefault: 'يتم استخدام النماذج الافتراضية المدمجة',
  modelsCustomized: 'مخصّص',
  resetModels: 'استعادة الافتراضي',
  modelsEmpty:
    'لا توجد نماذج بعد. انقر على "جلب النماذج المتاحة" أو أضف معرّف نموذج يدويًا.',
  modelId: 'معرّف النموذج',
  modelVision: 'صور',
  modelVisionHint: 'يدعم إدخال الصور',
  removeModel: 'إزالة النموذج',
  addModel: 'إضافة نموذج',
  fetchModels: 'جلب النماذج المتاحة',
  fetching: 'جارٍ الجلب…',
  fetchNeedsKey: 'أدخل مفتاح API أولًا',
  fetchNeedsBaseUrl: 'أدخل عنوان API أولًا',
  fetchTitle: 'اختر النماذج',
  fetchSearch: 'ابحث عن النماذج',
  fetchSelectAll: 'تحديد الكل',
  fetchDeselectAll: 'إلغاء تحديد الكل',
  fetchNoMatches: 'لا توجد نماذج مطابقة',
  fetchAdopt: 'تطبيق',
  fetchKeepOne: 'أبقِ نموذجًا واحدًا على الأقل',
  fetchEmpty: 'لم تُرجع نقطة النهاية أي نماذج. أضفها يدويًا.',
  fetchFailedNetwork:
    'تعذّر الوصول إلى {url}. قد تكون هناك مشكلة في الشبكة، أو أن نقطة النهاية لا تسمح بطلبات المتصفح (CORS). أضف النماذج يدويًا.',
  fetchFailedHttp:
    'فشل جلب النماذج: أعادت نقطة النهاية HTTP {status}. تحقّق من مفتاح API والعنوان.',
  fetchFailedFormat:
    'لم يتم التعرّف على قائمة النماذج التي أعادتها نقطة النهاية. أضف النماذج يدويًا.',
  needsProviderId: 'أدخل معرّف المزوّد.',
  needsBaseUrl: 'أدخل عنوان API.',
  needsModels: 'أضف نموذجًا واحدًا على الأقل.',
  cancel: 'إلغاء',
  save: 'حفظ',
  createProvider: 'إنشاء المزوّد',
  deleteProvider: 'حذف المزوّد',
  deleteProviderConfirm: 'هل تريد حذف المزوّد "{id}" ومفتاح API الخاص به؟',
  close: 'إغلاق'
} satisfies Record<keyof typeof llmEn, string>
