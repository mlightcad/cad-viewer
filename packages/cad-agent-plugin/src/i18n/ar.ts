/**
 * Arabic UI strings for the CAD Agent panel.
 */
export const agentAr = {
  tab: 'الوكيل',
  title: 'وكيل CAD',

  settings: 'الإعدادات',
  clear: 'محادثة جديدة',
  close: 'إغلاق',

  model: 'النموذج',

  emptyHint:
    'صف ما تريد رسمه، أو أرفق صورة مرجعية مثل رسم تخطيطي أو لقطة شاشة أو مخطط معماري.',

  toolPrefix: 'أداة',

  copyTool: 'نسخ استدعاء الأداة (الإدخال والإخراج)',

  toolCopied: 'تم النسخ',

  copyMessage: 'نسخ الرسالة',

  messageCopied: 'تم النسخ',

  editMessage: 'تعديل الرسالة',

  cancelEdit: 'إلغاء',

  resendMessage: 'إرسال',

  relativeTimeJustNow: 'الآن',

  relativeTimeSeconds: 'قبل {n} ث',

  relativeTimeMinutes: 'قبل {n} د',

  relativeTimeHours: 'قبل {n} س',

  relativeTimeDays: 'قبل {n} ي',

  queuedSendNow: 'أرسل الآن',

  queuedEdit: 'تعديل',

  queuedDelete: 'حذف',

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
    'الافتراضي. سريع — يفضّل التحقق الذاتي عبر واجهة القياس؛ اللقطات اختيارية. بلا تحقق بصري تلقائي.',

  agentModeHighInferenceHint:
    'اختياري للمهام المعقدة. بعد الرسم يتحقق باللقطة + نموذج رؤية، حتى 5 محاولات. يتطلب نموذجًا يدعم الرؤية.',

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

  missingApiKey: 'اضبط مفتاح API في الإعدادات قبل إرسال الرسائل.',
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
