/**
 * Arabic UI strings for simple UI plugin.
 */
export const ar: Record<string, string> = {
  'toolbar.select': 'تحديد',
  'toolbar.pan': 'تحريك العرض',
  'toolbar.zoom': 'تكبير',
  'toolbar.zoomExtent': 'ملاءمة',
  'toolbar.zoomWindow': 'نافذة',
  'toolbar.zoomOriginal': 'أصلي',
  'toolbar.layer': 'مدير الطبقات',
  'toolbar.layerShort': 'الطبقات',
  'toolbar.layout': 'المخطط',
  'toolbar.settings': 'الإعدادات',

  'toolbar.measure': 'القياس',
  'toolbar.measureDistance': 'مسافة',
  'toolbar.measureContinuous': 'مستمر',
  'toolbar.measureAngle': 'زاوية',
  'toolbar.measureArea': 'مساحة',
  'toolbar.measureArc': 'قوس',
  'toolbar.measurePoint': 'XY',

  'toolbar.showMeasurements': 'إظهار',
  'toolbar.hideMeasurements': 'إخفاء',
  'toolbar.measurementImport': 'استيراد',
  'toolbar.measurementExport': 'تصدير',
  'toolbar.clearMeasurements': 'مسح',
  'toolbar.measurementPanel': 'نتائج',

  'toolbar.switchBg': 'خلفية',
  'toolbar.readingMode': 'قراءة',

  'toolbar.annotation': 'أدوات المراجعة',
  'toolbar.annotationShort': 'مراجعة',

  'toolbar.markupCloud': 'سحابة',
  'toolbar.markupCallout': 'وسيلة شرح',
  'toolbar.markupText': 'نص',
  'toolbar.markupRect': 'مستطيل',
  'toolbar.markupCircle': 'دائرة',
  'toolbar.markupArrow': 'سهم',
  'toolbar.markupStamp': 'ختم',
  'toolbar.markupPanel': 'نتائج',

  'toolbar.markupImport': 'استيراد',
  'toolbar.markupExport': 'تصدير',
  'toolbar.clearMarkups': 'مسح',
  'toolbar.showMarkup': 'إظهار',
  'toolbar.hideMarkup': 'إخفاء',

  'toolbar.export': 'تصدير',
  'toolbar.exportHtml': 'تصدير HTML',
  'toolbar.exportPdf': 'تصدير PDF',
  'toolbar.exportSvg': 'تصدير SVG',

  'toolbar.placement': 'موضع شريط الأدوات',
  'toolbar.placementTop': 'أعلى',
  'toolbar.placementBottom': 'أسفل',
  'toolbar.placementLeft': 'يسار',
  'toolbar.placementRight': 'يمين',

  'toolbar.themeLight': 'داكن',
  'toolbar.themeDark': 'فاتح',

  'toolbar.locale': 'اللغة',
  'toolbar.localeEn': 'English',
  'toolbar.localeZh': '中文',
  'toolbar.localeCs': 'Čeština',
  'toolbar.localeTr': 'Türkçe',
  'toolbar.localeAr': 'العربية',

  'toolbar.collapse': 'طي شريط الأدوات',
  'toolbar.moreOverflow': 'المزيد من الأدوات',
  'toolbar.expand': 'توسيع شريط الأدوات',

  'layerManager.title': 'مدير الطبقات',
  'layerManager.name': 'الاسم',
  'layerManager.on': 'تشغيل',
  'layerManager.color': 'اللون',
  'layerManager.currentLayer': 'الطبقة الحالية',

  'layerManager.zoomToLayer':
    'تم التكبير إلى الطبقة: {layer}',

  'layerManager.sortByNameAsc':
    'ترتيب حسب الاسم تصاعديًا',

  'layerManager.sortByNameDesc':
    'ترتيب حسب الاسم تنازليًا',

  'layerManager.sortByNameNone':
    'إلغاء ترتيب الاسم',

  'colorPicker.title': 'تحديد اللون',
  'colorPicker.index': 'فهرس اللون: ',
  'colorPicker.rgb': 'RGB: ',
  'colorPicker.input': 'اللون',
  'colorPicker.inputPlaceholder': '1-255 أو #RRGGBB',
  'colorPicker.ok': 'موافق',
  'colorPicker.cancel': 'إلغاء',

  'dockPanel.close': 'إغلاق اللوحة',
  'dockPanel.dockSide': 'جهة الإرساء',
  'dockPanel.dockTop': 'إرساء بالأعلى',
  'dockPanel.dockBottom': 'إرساء بالأسفل',
  'dockPanel.dockLeft': 'إرساء باليسار',
  'dockPanel.dockRight': 'إرساء باليمين',
  'dockPanel.moreTabs': 'المزيد من علامات التبويب',

  'dockPanel.tab.layers': 'الطبقات',
  'dockPanel.tab.review': 'المراجعة',
  'dockPanel.tab.measurements': 'القياسات',
  'dockPanel.resize': 'تغيير ارتفاع اللوحة',

  'reviewPalette.searchPlaceholder':
    'البحث في علامات المراجعة',

  'reviewPalette.empty':
    'لا توجد علامات مراجعة حتى الآن',

  'reviewPalette.type': 'النوع',
  'reviewPalette.status': 'الحالة',
  'reviewPalette.author': 'المؤلف',
  'reviewPalette.summary': 'الملخص',
  'reviewPalette.details': 'التفاصيل',
  'reviewPalette.closeDetails': 'إغلاق التفاصيل',
  'reviewPalette.label': 'التسمية',
  'reviewPalette.comment': 'التعليق',
  'reviewPalette.zoomTo': 'تكبير إلى',
  'reviewPalette.delete': 'حذف',
  'reviewPalette.clear': 'مسح الكل',

  'reviewPalette.statusValues.open': 'مفتوح',
  'reviewPalette.statusValues.question': 'سؤال',
  'reviewPalette.statusValues.answered': 'تمت الإجابة',
  'reviewPalette.statusValues.closed': 'مغلق',

  'reviewPalette.typeValues.cloud': 'سحابة',
  'reviewPalette.typeValues.callout': 'وسيلة شرح',
  'reviewPalette.typeValues.text': 'نص',
  'reviewPalette.typeValues.rect': 'مستطيل',
  'reviewPalette.typeValues.circle': 'دائرة',
  'reviewPalette.typeValues.arrow': 'سهم',
  'reviewPalette.typeValues.stamp': 'ختم',
  'reviewPalette.typeValues.line': 'خط',
  'reviewPalette.typeValues.highlight': 'تمييز',
  'reviewPalette.typeValues.symbol': 'رمز',

  'measurePalette.filterGroup': 'التصفية حسب النوع',
  'measurePalette.empty': 'لا توجد قياسات حتى الآن',
  'measurePalette.type': 'النوع',
  'measurePalette.value': 'القيمة',
  'measurePalette.delete': 'حذف',
  'measurePalette.clear': 'مسح الكل',
  'measurePalette.typeValues.distance': 'مسافة',
  'measurePalette.typeValues.angle': 'زاوية',
  'measurePalette.typeValues.area': 'مساحة',
  'measurePalette.typeValues.arc': 'قوس',
  'measurePalette.typeValues.point': 'XY'
}