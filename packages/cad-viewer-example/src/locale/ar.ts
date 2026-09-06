export default {
  command: {
    ACAD: {
      quit: {
        description: 'الخروج من التطبيق وإغلاق جميع الرسومات المفتوحة'
      },
      exit: {
        description: 'الخروج من التطبيق وإغلاق جميع الرسومات المفتوحة'
      }
    }
  },

  example: {
    fileUpload: {
      title: 'اختر ملف CAD لعرضه',
      subtitle: 'استورد رسومات DWG أو DXF إلى العارض',
      newDrawing: 'رسم جديد',
      or: 'أو',
      dropFile: 'أسقط الملف هنا أو',
      browse: 'تصفح',

      openOptions: 'خيارات الفتح',

      initialView: 'العرض الأولي',
      auto: 'تلقائي',
      autoHint: 'استنادًا إلى وضع الوصول',
      extents: 'حدود الرسم',
      extentsHint: 'ملاءمة الرسم للعرض',
      saved: 'محفوظ',
      savedHint: 'العرض المحفوظ في AutoCAD',

      accessMode: 'وضع الوصول',
      read: 'قراءة',
      readHint: 'عرض فقط',
      review: 'مراجعة',
      reviewHint: 'عرض ومراجعة',
      write: 'تحرير',
      writeHint: 'وصول كامل',

      textRendering: 'عرض النص',
      worker: 'عامل خلفي',
      workerHint: 'أسرع ويستخدم ذاكرة أكثر',
      mainThread: 'المسار الرئيسي',
      mainThreadHint: 'أبطأ ويستخدم ذاكرة أقل',

      progressive: 'العرض التدريجي',
      progressiveRendering: 'العرض التدريجي',
      on: 'تشغيل',
      progressiveOnHint: 'إظهار عناصر الرسم أثناء التحميل',
      off: 'إيقاف',
      progressiveOffHint: 'الانتظار حتى اكتمال التحويل',

      nonPlottable: 'غير قابل للطباعة',
      nonPlottableLayers: 'الطبقات غير القابلة للطباعة',
      hide: 'إخفاء',
      hideHint: 'الإعداد الافتراضي لعارض الويب',
      show: 'إظهار',
      showHint: 'سلوك محرر AutoCAD',

      curveQuality: 'جودة المنحنيات',
      curveDraft: 'ذاكرة',
      curveDraftHint: 'رؤوس أقل وملفات أصغر',
      curveStandard: 'قياسي',
      curveStandardHint: 'متوازن (100 ضلع لكل دائرة)',
      curveHigh: 'جودة',
      curveHighHint: 'منحنيات أنعم وذاكرة أكبر',

      paperSpaceBackground: 'خلفية مساحة الورق',
      paperSpaceWhite: 'أبيض',
      paperSpaceWhiteHint: 'سطح المكتب CAD / معاينة الطباعة',
      paperSpaceBlack: 'أسود',
      paperSpaceBlackHint: 'تفضيل عارض الويب',

      invalidFileType:
        'نوع الملف غير صالح. يرجى اختيار ملف DWG أو DXF.'
    }
  }
}
