/**
 * Arabic UI strings for the CAD Agent panel.
 */
export const agentAr = {
  tab: 'الوكيل',
  title: 'وكيل CAD',

  settings: 'الإعدادات',
  clear: 'محادثة جديدة',
  close: 'إغلاق',

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

  model: 'النموذج',

  apiKey: 'مفتاح API',

  emptyHint:
    'صف ما تريد رسمه، أو أرفق صورة مرجعية مثل رسم تخطيطي أو لقطة شاشة أو مخطط معماري.',

  toolPrefix: 'أداة',

  copyTool: 'نسخ استدعاء الأداة (الإدخال والإخراج)',

  toolCopied: 'تم النسخ',

  inputPlaceholder: 'صف طلبك…',

  attachImage: 'إرفاق صورة',

  showContextUsage: 'عرض استخدام السياق',

  contextUsage: 'استخدام السياق',

  contextUsageDetail: '{percent}% · {used} / {limit}',

  contextUsageFull: '{percent}% ممتلئ',

  contextUsageTokens: '~{used} / {limit} رمزًا',

  contextUsageSystemPrompt: 'موجه النظام',

  contextUsageToolDefinitions: 'تعريفات الأدوات',

  contextUsageImages: 'الصور',

  contextUsageConversation: 'المحادثة',

  removeAttachment: 'إزالة',

  imageAlt: 'الصورة المرفقة',

  imageOnlyRequest:
    'يرجى تحليل الصورة المرجعية المرفقة ومساعدتي في رسمها في CAD.',

  prepareImageFailed: 'تعذّر تجهيز الصورة المرفقة. جرّب ملف PNG أو JPEG أصغر.',

  errorTitle: 'حدث خطأ',

  dismissError: 'إغلاق الخطأ',

  send: 'إرسال',

  stop: 'إيقاف',

  working: 'جارٍ العمل…',

  agentMode: 'وضع الوكيل',

  agentModeSimple: 'بسيط',

  agentModeHighInference: 'استدلال متقدم',

  agentModeSimpleHint:
    'الافتراضي. سريع — تحقق ذاتي عبر واجهة القياس فقط؛ بدون لقطات أو تحقق بصري.',

  agentModeHighInferenceHint:
    'اختياري للمهام المعقدة. يسمح بلقطات الشاشة ويتحقق باللقطة + نموذج رؤية، حتى 5 محاولات. يتطلب نموذجًا يدعم الرؤية.',

  highInferenceRequiresVision:
    'وضع الاستدلال المتقدم يتطلب نموذجًا يدعم الرؤية.',

  verificationTitle: 'التحقق من الرسم',

  verifying: 'جارٍ مقارنة لقطة شاشة الرسم بطلبك والصور المرجعية…',

  verificationPassed: 'نجح التحقق — الرسم يطابق الطلب.',

  verificationFailed: 'فشل التحقق — تم العثور على مشكلات:',

  verificationSkipped: 'تم تخطي التحقق',

  verificationError: 'حدث خطأ أثناء التحقق',

  verificationContinuing: 'جارٍ متابعة تحسين الرسم…',

  verificationMaxAttempts: 'لم ينجح التحقق خلال الحد الأقصى لعدد المحاولات.',

  referenceImages: 'الصور المرجعية',

  drawingScreenshot: 'لقطة شاشة الرسم الحالي',

  unsavedSettings: 'احفظ الإعدادات قبل إرسال الرسائل.',

  missingApiKey: 'اضبط مفتاح API في الإعدادات قبل إرسال الرسائل.',
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
  toolsSummary: 'استدعاءات الأدوات: {count}',
  toolsRunning: 'جارٍ تشغيل الأدوات ({count})…',
  toolsFailed: 'فشل {count}',
  taskPrompts: 'مهام مقترحة',
  taskPromptsTitle: 'مهام شائعة',
  taskCategoryExtract: 'استخراج',
  taskCategoryStats: 'إحصاءات',
  taskCategoryModify: 'تعديل',
  taskCategoryCreate: 'إنشاء',
  taskCategoryReview: 'مراجعة',
  taskDrawingOverviewTitle: 'نظرة عامة على الرسم',
  taskDrawingOverviewPrompt:
    'لخّص الرسم المفتوح: الحدود (extents)، ونظام الوحدات إن أمكن، وقائمة الطبقات، ووصفًا قصيرًا لمحتوى الرسم. استعلم عن الرسم — لا تعد رسمه.',
  taskExtractTextTitle: 'استخراج النص وكتلة العنوان',
  taskExtractTextPrompt:
    'استخرج كل النص المقروء من الرسم المفتوح، بما في ذلك حقول كتلة العنوان إن وُجدت. جمّع حسب الطبقة أو المنطقة عند الحاجة، واعرض القيم بوضوح.',
  taskListDimensionsTitle: 'سرد الأبعاد',
  taskListDimensionsPrompt:
    'اعثر على كيانات الأبعاد في الرسم المفتوح واسرد قيمها المقاسة والنص المرتبط والمواقع التقريبية. لخّص أي أبعاد ناقصة أو غير متسقة بوضوح.',
  taskEntityStatsTitle: 'عدد الكيانات',
  taskEntityStatsPrompt:
    'أحصِ الكيانات في الرسم المفتوح حسب النوع وحسب الطبقة. فضّل استعلامات الملخص على تفريغ كل كيان. اعرض جدولًا مضغوطًا أو قائمة نقاط.',
  taskLayerReportTitle: 'تقرير استخدام الطبقات',
  taskLayerReportPrompt:
    'قدّم تقريرًا عن طبقات الرسم المفتوح: الاسم، التشغيل/الإيقاف، التجميد، اللون، نوع الخط، والعدد التقريبي للكيانات لكل طبقة. أشر إلى الطبقات الفارغة أو غير المستخدمة أو ذات الأسماء الغريبة.',
  taskOrganizeLayersTitle: 'تنظيم حسب الطبقة',
  taskOrganizeLayersPrompt:
    'اقترح وطبّق تنظيمًا منطقيًا للطبقات في الرسم المفتوح (مثل الجدران والأبواب والنص والأبعاد والأثاث). انقل الكيانات من الطبقات الخاطئة وأنشئ الطبقات الناقصة عند الحاجة. اشرح ما تغيّر.',
  taskCleanupDrawingTitle: 'تنظيف الرسم',
  taskCleanupDrawingPrompt:
    'افحص الرسم المفتوح بحثًا عن مشاكل تنظيف شائعة (هندسة بطول صفري، تكرارات متداخلة يمكن اكتشافها، نص فارغ، طبقات غير مستخدمة) وأصلح ما هو آمن. لخّص الإجراءات وما يحتاج مراجعة يدوية.',
  taskDrawDimensionedRectTitle: 'رسم مستطيل بأبعاد',
  taskDrawDimensionedRectPrompt:
    'ارسم مستطيلًا مغلقًا 1000 × 600 (وحدات الرسم) زاويته السفلية اليسرى عند (0, 0). أضف أبعادًا أفقية وعمودية للعرض والارتفاع. استخدم طبقات واضحة للهندسة والأبعاد.',
  taskCreateTitleBlockTitle: 'إنشاء كتلة عنوان',
  taskCreateTitleBlockPrompt:
    'أنشئ كتلة عنوان بسيطة بأسلوب A3 في فضاء النموذج (أو فضاء الورق إن كان معدًّا): إطار خارجي، عنوان، رقم رسم، مقياس، تاريخ، وحقل الرسام بنص نائب. ضع الهندسة على طبقة مخصصة.',
  taskFromReferenceTitle: 'الرسم من صورة مرجعية',
  taskFromReferencePrompt:
    'سأرفق صورة مرجعية (مسودة أو لقطة شاشة أو مخطط). حلّلها بعناية ثم أعد بناء الهندسة ثنائية الأبعاد المقصودة بنِسب صحيحة وطبقات وأبعاد ظاهرة. اسأل فقط إذا كان بُعد حرج غير واضح.',
  taskDraftingReviewTitle: 'مراجعة جودة الرسم',
  taskDraftingReviewPrompt:
    'راجع الرسم المفتوح من حيث جودة الرسم: ارتفاعات نص غير متسقة، أبعاد قد لا تطابق الهندسة، تعليقات متداخلة، كيانات على الطبقة 0، ومناظر ناقصة. اسرد النتائج حسب الشدة؛ أصلح فقط المشاكل الواضحة والآمنة ما لم أطلب غير ذلك.',
  taskLayerStandardsTitle: 'فحص تسمية الطبقات',
  taskLayerStandardsPrompt:
    'راجع أسماء الطبقات والألوان والاستخدام وفق أعراف CAD الشائعة. اقترح مخطط تسمية أوضح، وبعد تلخيص التغييرات المقترحة يمكنك إعادة التسمية/تغيير الألوان اختياريًا.'
} as const
