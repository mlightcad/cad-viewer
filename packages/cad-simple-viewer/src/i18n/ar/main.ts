export default {
  document: {
    untitled: 'بلا عنوان'
  },
  commandLine: {
    noLast: '(لا يوجد أمر سابق)',
    unknownCommand: 'أمر غير معروف',
    executed: 'تم تنفيذ الأمر',
    showHistory: 'عرض سجل الأوامر',
    placeholder: 'اكتب أمرًا',
    showMessages: 'عرض سجل الرسائل',
    canceled: '*تم الإلغاء*',
    noHistory: '(لا يوجد سجل)',
    invalidInput: 'إدخال غير صالح.',
    close: 'إغلاق سطر الأوامر'
  },
  mobileCommand: {
    length: 'الطول',
    angle: 'الزاوية',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    help: 'مساعدة',
    back: 'رجوع',
    collapse: 'طي',
    expand: 'توسيع'
  },
  inputManager: {
    firstCorner: 'حدد الركن الأول أو',
    secondCorner: 'حدد الركن الثاني أو'
  },
  message: {
    fetchingDrawingFile: 'جارٍ جلب ملف الرسم ...',
    exportingDxf: 'جارٍ تصدير DXF ...',
    exportingEntityPreview: 'جارٍ تصدير الصورة ...',
    collectingMemoryProfile: 'جارٍ تحليل الذاكرة ...',
    fontCached: 'تم تخزين الخط بنجاح',
    fontCacheFailed: 'فشل تخزين الخط',
    failedToOpenFile: 'فشل فتح الملف "{fileName}"!',
    failedToOpenFileWorkerOom:
      'فشل فتح "{fileName}". الرسم كبير جدًا بالنسبة للذاكرة المتاحة.',
    failedToOpenFileWorkerTimeout:
      'فشل فتح "{fileName}". انتهت مهلة العملية أثناء تحليل الرسم.',
    failedToOpenFileFontLoadFailed:
      'فشل فتح "{fileName}". تعذر تحميل الخطوط المطلوبة.',
    failedToOpenFileLicenseExpired:
      'فشل فتح "{fileName}". انتهت صلاحية ترخيص محول DWG.',
    failedToOpenFileLicenseInvalid:
      'فشل فتح "{fileName}". ترخيص محول DWG مفقود أو غير صالح.'
  },
  notification: {
    title: {
      failedToOpenFile: 'فشل فتح الملف',
      failedToOpenFileWorkerOom: 'الرسم كبير جدًا',
      failedToOpenFileWorkerTimeout: 'انتهت مهلة فتح الرسم',
      failedToOpenFileFontLoadFailed: 'فشل تحميل الخطوط',
      failedToOpenFileLicenseExpired: 'انتهت صلاحية الترخيص',
      failedToOpenFileLicenseInvalid: 'ترخيص غير صالح'
    }
  },
  progress: {
    start: 'بدء تحليل الملف ...',
    parse: 'جارٍ تحليل الملف ...',
    font: 'جارٍ تنزيل الخطوط المطلوبة لهذا الرسم ...',
    ltype: 'جارٍ تحليل أنواع الخطوط ...',
    style: 'جارٍ تحليل أنماط النص ...',
    dimstyle: 'جارٍ تحليل أنماط الأبعاد ...',
    layer: 'جارٍ تحليل الطبقات ...',
    vport: 'جارٍ تحليل منافذ العرض ...',
    blockrecord: 'جارٍ تحليل سجلات الكتل ...',
    header: 'جارٍ تحليل رأس الملف ...',
    block: 'جارٍ تحليل الكتل ...',
    entity: 'جارٍ تحليل العناصر ...',
    object: 'جارٍ تحليل القواميس المسماة ...',
    rendering: 'جارٍ عرض الرسم ...',
    end: 'اكتمل!'
  },
  about: {
    title: 'حول',
    close: 'إغلاق',
    product: 'عارض CAD',
    tagline: 'عارض CAD عالي الأداء للويب لملفات DWG وDXF.',
    website: 'الموقع الإلكتروني',
    docs: 'التوثيق',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. جميع الحقوق محفوظة.',
    ok: 'موافق'
  },
  drawStyle: {
    color: 'اللون',
    fontSize: 'ارتفاع النص'
  },
  colorPicker: {
    title: 'تحديد اللون',
    close: 'إغلاق',
    ok: 'موافق',
    cancel: 'إلغاء',
    index: 'فهرس اللون: ',
    rgb: 'RGB: ',
    input: 'اللون',
    inputPlaceholder: '1-255 أو #RRGGBB'
  },
  touchPointTutorial: {
    title: 'كيف أختار النقاط بدقة؟',
    description:
      'اضغط مطولاً على الشاشة لمدة ثانية تقريباً. يظهر صليب فوق إصبعك ويتبعه أثناء الحركة ويلتقط إلى الهندسة لاختيار أدق.',
    snoozeToday: 'لا تذكرني اليوم',
    hideForever: 'لا تذكرني مرة أخرى',
    ok: 'فهمت'
  }
}
