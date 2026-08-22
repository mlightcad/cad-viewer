import enDialog from '../en/dialog'

export default {
  ...enDialog,

  baseDialog: {
    ...enDialog.baseDialog,
    ok: 'موافق',
    cancel: 'إلغاء',
    apply: 'تطبيق'
  },

  pointStyleDlg: {
    ...enDialog.pointStyleDlg,
    title: 'نمط النقطة',
    pointSize: 'حجم النقطة:'
  },

  drawingUnitsDlg: {
    ...enDialog.drawingUnitsDlg,

    title: 'وحدات الرسم',

    lengthSection: 'الطول',
    lengthType: 'النوع:',
    lengthPrecision: 'الدقة:',

    angleSection: 'الزاوية',
    angleType: 'النوع:',
    anglePrecision: 'الدقة:',

    clockwise: 'مع عقارب الساعة',

    insertionSection: 'مقياس الإدراج',
    insertionUnits: 'وحدات قياس المحتوى المدرج:',

    linear: {
      ...enDialog.drawingUnitsDlg.linear,
      scientific: 'علمي',
      decimal: 'عشري',
      engineering: 'هندسي',
      architectural: 'معماري',
      fractional: 'كسري',
      windowsDesktop: 'سطح مكتب Windows'
    },

    angle: {
      ...enDialog.drawingUnitsDlg.angle,
      decimalDegrees: 'درجات عشرية',
      dms: 'درجة/دقيقة/ثانية',
      gradians: 'غراديان',
      radians: 'راديان',
      surveyors: 'وحدات المساحة'
    },

    insUnits: {
      ...enDialog.drawingUnitsDlg.insUnits,
      _0: 'بدون وحدة',
      _1: 'بوصة',
      _2: 'قدم',
      _3: 'ميل',
      _4: 'ملليمتر',
      _5: 'سنتيمتر',
      _6: 'متر',
      _7: 'كيلومتر',
      _8: 'ميكروبوصة',
      _9: 'ميلز',
      _10: 'ياردة',
      _11: 'أنغستروم',
      _12: 'نانومتر',
      _13: 'ميكرون',
      _14: 'ديسيمتر',
      _15: 'ديكامتر',
      _16: 'هكتومتر',
      _17: 'غيغامتر',
      _18: 'وحدة فلكية',
      _19: 'سنة ضوئية',
      _20: 'فرسخ فلكي',
      _21: 'قدم مساحية أمريكية',
      _22: 'بوصة مساحية أمريكية',
      _23: 'ياردة مساحية أمريكية',
      _24: 'ميل مساحي أمريكي'
    }
  },

  colorPickerDlg: {
    ...enDialog.colorPickerDlg,
    title: 'اختيار اللون',
    aciTabTitle: 'فهرس الألوان',
    rgbTabTitle: 'لون حقيقي'
  },

  exportHtmlDlg: {
    ...enDialog.exportHtmlDlg,
    title: 'تصدير إلى HTML',

    layersSection: 'الطبقات',
    exportInvisibleLayers: 'تصدير الطبقات غير المرئية',
    exportInvisibleLayersHint:
      'تضمين العناصر الموجودة على الطبقات المتوقفة أو المجمدة في الملف المُصدّر',

    layoutsSection: 'المخططات',
    exportLayouts: 'تصدير المخططات',
    exportLayoutsHint:
      'تضمين مخططات مساحة الورق في الملف المُصدّر',

    yes: 'نعم',
    no: 'لا',

    initialView: 'العرض الأولي',
    initialViewExtents: 'حدود الرسم',
    initialViewExtentsHint:
      'تكبير العرض إلى حدود الرسم عند فتح ملف HTML',

    initialViewCurrent: 'العرض الحالي',
    initialViewCurrentHint:
      'الحفاظ على مركز العرض ومستوى التكبير الحالي',

    viewerMode: 'وضع العارض',
    viewerModeView: 'عرض',
    viewerModeViewHint:
      'التحريك والتكبير والتحكم في الطبقات فقط',

    viewerModeMeasure: 'قياس ومراجعة',
    viewerModeMeasureHint:
      'أدوات العرض بالإضافة إلى القياسات وتعليقات المراجعة'
  },

  quickSelectDlg: {
    ...enDialog.quickSelectDlg,

    title: 'تحديد سريع',
    applyTo: 'تطبيق على',
    applyToEntireDrawing: 'الرسم بالكامل',
    applyToCurrentSelection: 'التحديد الحالي',

    objectType: 'نوع العنصر',
    allObjectTypes: 'متعدد',
    property: 'الخاصية',
    operator: 'المعامل',
    value: 'القيمة',

    howToApply: 'طريقة التطبيق',

    propObjectType: 'نوع العنصر',
    propLayer: 'الطبقة',
    propColor: 'اللون',
    propLineType: 'نوع الخط',
    propLineWeight: 'سُمك الخط',

    opEquals: 'يساوي',
    opNotEquals: 'لا يساوي',
    opGreaterThan: 'أكبر من',
    opGreaterThanOrEqual: 'أكبر من أو يساوي',
    opLessThan: 'أقل من',
    opLessThanOrEqual: 'أقل من أو يساوي',

    modeSet: 'تضمين في مجموعة تحديد جديدة',
    modeAdd: 'إضافة إلى مجموعة التحديد الحالية',
    modeRemove: 'استبعاد من مجموعة التحديد الحالية',

    previewResult:
      'العناصر المطابقة: {count} / إجمالي العناصر: {total}',

    valueRequired: 'يرجى تحديد قيمة للتصفية',

    selectionResult:
      'تم العثور على {count} عنصر وتطبيقها على التحديد'
  },

  textStyleDlg: {
    ...enDialog.textStyleDlg,

    title: 'نمط النص',
    currentStyle: 'نمط النص الحالي: {name}',
    styles: 'الأنماط',

    fontSection: 'الخط',
    fontName: 'اسم الخط:',
    fontStyle: 'نمط الخط:',
    useBigFont: 'استخدام الخط الكبير',
    bigFontName: 'الخط الكبير:',

    sizeSection: 'الحجم',
    textHeight: 'الارتفاع:',

    effectsSection: 'التأثيرات',
    upsideDown: 'مقلوب رأسيًا',
    backwards: 'معكوس',
    vertical: 'رأسي',

    widthFactor: 'معامل العرض:',
    obliqueAngle: 'زاوية الميل:',

    setCurrent: 'تعيين كحالي',
    new: 'جديد...',
    delete: 'حذف',

    newTitle: 'نمط نص جديد',
    newStyleName: 'اسم النمط:',
    newPrompt: 'أدخل اسم نمط النص الجديد:',
    newNameRequired: 'يرجى إدخال اسم لنمط النص.',

    deleteTitle: 'حذف نمط النص',
    deleteConfirm: 'حذف نمط النص "{name}"؟',

    invalidName: 'لا يمكن أن يحتوي اسم النمط على ;=<>`\\/,',
    duplicateName: 'يوجد نمط نص بهذا الاسم بالفعل.',

    created: 'تم إنشاء نمط النص "{name}".',
    deleted: 'تم حذف نمط النص "{name}".',
    setCurrentDone: 'تم تعيين نمط النص الحالي إلى "{name}".'
  },

  attEditDlg: {
    ...enDialog.attEditDlg,

    title: 'محرر السمات المتقدم',

    block: 'الكتلة:',
    tag: 'الوسم:',
    selectBlock: 'اختيار كتلة',

    tabAttribute: 'السمة',
    tabTextOptions: 'خيارات النص',
    tabProperties: 'الخصائص',

    colTag: 'الوسم',
    colPrompt: 'المطالبة',
    colValue: 'القيمة',

    value: 'القيمة:',
    textStyle: 'نمط النص:',
    justification: 'المحاذاة:',

    backwards: 'معكوس',
    upsideDown: 'مقلوب رأسيًا',

    height: 'الارتفاع:',
    widthFactor: 'معامل العرض:',
    rotation: 'الدوران:',
    obliqueAngle: 'زاوية الميل:',

    annotative: 'تعليقي',
    boundaryWidth: 'عرض الحدود:',

    layer: 'الطبقة:',
    linetype: 'نوع الخط:',
    color: 'اللون:',
    lineweight: 'سُمك الخط:',
    plotStyle: 'نمط الطباعة:',

    promptSelectBlock: 'حدد كتلة تحتوي على سمات:',
    rejectSelectBlock: 'يجب أن يكون العنصر كتلة تحتوي على سمات.',
    noAttributes: 'الكتلة المحددة لا تحتوي على سمات.',

    justify: {
      ...enDialog.attEditDlg.justify,
      left: 'يسار',
      center: 'وسط',
      right: 'يمين',
      align: 'محاذاة',
      middle: 'منتصف',
      fit: 'ملاءمة',

      topLeft: 'أعلى يسار',
      topCenter: 'أعلى وسط',
      topRight: 'أعلى يمين',

      middleLeft: 'منتصف يسار',
      middleCenter: 'منتصف وسط',
      middleRight: 'منتصف يمين',

      bottomLeft: 'أسفل يسار',
      bottomCenter: 'أسفل وسط',
      bottomRight: 'أسفل يمين'
    }
  },

  attDefDlg: {
    ...enDialog.attDefDlg,

    title: 'تعريف السمة',

    modeSection: 'الوضع',
    invisible: 'غير مرئي',
    constant: 'ثابت',
    verify: 'تحقق',
    preset: 'مُسبق',
    lockPosition: 'قفل الموضع',
    multipleLines: 'أسطر متعددة',

    insertionSection: 'نقطة الإدراج',
    specifyOnScreen: 'تحديد على الشاشة',

    attributeSection: 'السمة',
    tag: 'الوسم:',
    prompt: 'المطالبة:',
    default: 'الافتراضي:',

    textSection: 'إعدادات النص',
    justification: 'المحاذاة:',
    textStyle: 'نمط النص:',
    annotative: 'تعليقي',

    height: 'ارتفاع النص:',
    rotation: 'الدوران:',
    boundaryWidth: 'عرض الحدود:',

    alignBelow: 'محاذاة أسفل تعريف السمة السابق',

    tagRequired: 'وسم السمة مطلوب.',
    noPrevious: 'لم يتم العثور على تعريف سمة سابق.',

    promptInsertionPoint: 'حدد نقطة البداية:',
    promptHeight: 'حدد الارتفاع:',
    promptRotation: 'حدد زاوية الدوران:',

    justify: {
      ...enDialog.attDefDlg.justify,
      left: 'يسار',
      center: 'وسط',
      right: 'يمين',
      align: 'محاذاة',
      middle: 'منتصف',
      fit: 'ملاءمة',

      topLeft: 'أعلى يسار',
      topCenter: 'أعلى وسط',
      topRight: 'أعلى يمين',

      middleLeft: 'منتصف يسار',
      middleCenter: 'منتصف وسط',
      middleRight: 'منتصف يمين',

      bottomLeft: 'أسفل يسار',
      bottomCenter: 'أسفل وسط',
      bottomRight: 'أسفل يمين'
    }
  }
}