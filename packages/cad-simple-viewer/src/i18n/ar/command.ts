import enCommand from '../en/command'

export default {
  ...enCommand,

  ACAD: {
    ...enCommand.ACAD,

    '-hatch': {
      ...enCommand.ACAD['-hatch'],
      description:
        'إنشاء تعبئة تهشير باستخدام خيارات سطر الأوامر دون واجهة الشريط'
    },

    '-layer': {
      ...enCommand.ACAD['-layer'],
      description:
        'إدارة الطبقات باستخدام خيارات سطر الأوامر'
    },

    about: {
      ...enCommand.ACAD.about,
      description:
        'عرض معلومات حول mlightcad'
    },

    acadver: {
      ...enCommand.ACAD.acadver,
      description:
        'عرض معرّف إصدار قاعدة بيانات الرسم (للقراءة فقط)'
    },

    angbase: {
      ...enCommand.ACAD.angbase,
      description:
        'تحديد اتجاه زاوية الأساس 0 بالنسبة إلى نظام الإحداثيات UCS الحالي'
    },

    angdir: {
      ...enCommand.ACAD.angdir,
      description:
        'تحديد ما إذا كانت الزوايا الموجبة تُقاس مع أو عكس اتجاه عقارب الساعة'
    },

    arc: {
      ...enCommand.ACAD.arc,
      description:
        'إنشاء قوس'
    },

    aunits: {
      ...enCommand.ACAD.aunits,
      description:
        'تحديد تنسيق عرض الزوايا'
    },

    auprec: {
      ...enCommand.ACAD.auprec,
      description:
        'تحديد دقة عرض الزوايا بالتكامل مع AUNITS'
    },

    cdxf: {
      ...enCommand.ACAD.cdxf,
      description:
        'تصدير الرسم الحالي إلى DXF'
    },

    cpdf: {
      ...enCommand.ACAD.cpdf,
      description:
        'تصدير الرسم الحالي إلى PDF'
    },

    cecolor: {
      ...enCommand.ACAD.cecolor,
      description:
        'تحديد اللون الافتراضي الحالي للعناصر الجديدة'
    },

    celtscale: {
      ...enCommand.ACAD.celtscale,
      description:
        'التحكم في معامل مقياس نوع الخط للعناصر الجديدة'
    },

    celtype: {
      ...enCommand.ACAD.celtype,
      description:
        'تحديد نوع الخط للعناصر الجديدة'
    },

    celweight: {
      ...enCommand.ACAD.celweight,
      description:
        'تحديد سُمك الخط الافتراضي للعناصر الجديدة'
    },

    cetransparency: {
      ...enCommand.ACAD.cetransparency,
      description:
        'تحديد الشفافية للعناصر الجديدة'
    },

    cachefont: {
      ...enCommand.ACAD.cachefont,
      description:
        'تخزين ملف خط محلي مؤقتًا في IndexedDB لاستخدامه في عرض النص'
    },

    circle: {
      ...enCommand.ACAD.circle,
      description:
        'إنشاء دائرة باستخدام المركز ونصف القطر'
    },

    clayer: {
      ...enCommand.ACAD.clayer,
      description:
        'تحديد الطبقة الحالية للعناصر الجديدة وعمليات التحرير'
    },

    cmleaderstyle: {
      ...enCommand.ACAD.cmleaderstyle,
      description:
        'تحديد اسم نمط Multileader الحالي'
    },

    cmlscale: {
      ...enCommand.ACAD.cmlscale,
      description:
        'التحكم في العرض الكلي للخط متعدد المسارات'
    },

    cmlstyle: {
      ...enCommand.ACAD.cmlstyle,
      description:
        'تحديد اسم نمط الخط متعدد المسارات الحالي'
    },

    colortheme: {
      ...enCommand.ACAD.colortheme,
      description:
        'التحكم في سمة ألوان واجهة المستخدم بين الوضع الداكن والفاتح'
    },

    copy: {
      ...enCommand.ACAD.copy,
      description:
        'نسخ العناصر المحددة إلى مواضع جديدة',
      prompt:
        'حدد العناصر'
    },

    csvg: {
      ...enCommand.ACAD.csvg,
      description:
        'تحويل الرسم الحالي إلى SVG'
    },

    chtml: {
      ...enCommand.ACAD.chtml,
      description:
        'تصدير الرسم الحالي إلى ملف HTML مستقل يعمل دون اتصال'
    },

    '-chtml': {
      ...enCommand.ACAD['-chtml'],
      description:
        'تصدير الرسم الحالي إلى HTML باستخدام خيارات سطر الأوامر'
    },

    dimlinear: {
      ...enCommand.ACAD.dimlinear,
      description:
        'إنشاء أبعاد خطية'
    },

    dimstyle: {
      ...enCommand.ACAD.dimstyle,
      description:
        'تحديد اسم نمط الأبعاد الحالي'
    },

    dwgname: {
      ...enCommand.ACAD.dwgname,
      description:
        'عرض اسم ملف الرسم الحالي (للقراءة فقط)'
    },

    loginname: {
      ...enCommand.ACAD.loginname,
      description:
        'عرض اسم تسجيل دخول المستخدم (للقراءة فقط)'
    },

    dynmode: {
      ...enCommand.ACAD.dynmode,
      description:
        'التحكم في إعدادات الإدخال الديناميكي عند المؤشر'
    },

    dynprompt: {
      ...enCommand.ACAD.dynprompt,
      description:
        'التحكم في عرض رسائل الأوامر داخل تلميحات الإدخال الديناميكي'
    },

    ellipse: {
      ...enCommand.ACAD.ellipse,
      description:
        'إنشاء قطع ناقص أو قوس بيضاوي باستخدام نهايات المحور أو المركز'
    },

    erase: {
      ...enCommand.ACAD.erase,
      description:
        'حذف العناصر المحددة من الرسم',
      prompt:
        'حدد العناصر'
    },

    extmax: {
      ...enCommand.ACAD.extmax,
      description:
        'عرض الركن العلوي الأيمن لحدود الرسم في مساحة النموذج (للقراءة فقط)'
    },

    extmin: {
      ...enCommand.ACAD.extmin,
      description:
        'عرض الركن السفلي الأيسر لحدود الرسم في مساحة النموذج (للقراءة فقط)'
    },

    entout: {
      ...enCommand.ACAD.entout,
      description:
        'تصدير صورة معاينة مدمجة للعناصر المحددة',
      prompt:
        'حدد العناصر'
    },

    hideobjects: {
      ...enCommand.ACAD.hideobjects,
      description:
        'إخفاء العناصر المحددة مؤقتًا من العرض',
      prompt:
        'حدد العناصر'
    },

    imageattach: {
      ...enCommand.ACAD.imageattach,
      description:
        'إرفاق صورة نقطية كمرجع خارجي إلى الرسم الحالي'
    },

    '-insert': {
      ...enCommand.ACAD['-insert'],
      description:
        'إدراج تعريف كتلة داخل الرسم الحالي باستخدام سطر الأوامر'
    },

    xattach: {
      ...enCommand.ACAD.xattach,
      description:
        'إرفاق رسم DWG أو DXF كمرجع خارجي إلى الرسم الحالي'
    },

    gripcolor: {
      ...enCommand.ACAD.gripcolor,
      description:
        'تحديد لون مقابض التحكم غير المحددة للعناصر المحددة'
    },

    griphot: {
      ...enCommand.ACAD.griphot,
      description:
        'تحديد لون مقابض التحكم المحددة'
    },

    gripobjlimit: {
      ...enCommand.ACAD.gripobjlimit,
      description:
        'إيقاف عرض مقابض التحكم عندما يتجاوز عدد العناصر المحددة الحد المعين، والقيمة 0 تعني عدم وجود حد'
    },

    grips: {
      ...enCommand.ACAD.grips,
      description:
        'التحكم في عرض مقابض التحكم على العناصر المحددة'
    },

    gripsize: {
      ...enCommand.ACAD.gripsize,
      description:
        'تحديد حجم مربعات مقابض التحكم بالبكسل'
    },

    hatch: {
      ...enCommand.ACAD.hatch,
      description:
        'ملء منطقة مغلقة أو عناصر محددة بنمط تهشير'
    },

    ipdf: {
      ...enCommand.ACAD.ipdf,
      description:
        'استيراد الهندسة المتجهية من ملف PDF'
    },

    hpang: {
      ...enCommand.ACAD.hpang,
      description:
        'تحديد الزاوية الافتراضية بالراديان لأنماط التهشير الجديدة'
    },

    hpassoc: {
      ...enCommand.ACAD.hpassoc,
      description:
        'التحكم في كون التهشير الجديد ترابطيًا'
    },

    hpbackgroundcolor: {
      ...enCommand.ACAD.hpbackgroundcolor,
      description:
        'تحديد لون الخلفية الافتراضي لأنماط التهشير الجديدة'
    },

    hpcolor: {
      ...enCommand.ACAD.hpcolor,
      description:
        'تحديد اللون الافتراضي للتهشير الجديد'
    },

    hpdouble: {
      ...enCommand.ACAD.hpdouble,
      description:
        'التحكم في مضاعفة أنماط التهشير المعرفة بواسطة المستخدم'
    },

    hpislanddetection: {
      ...enCommand.ACAD.hpislanddetection,
      description:
        'التحكم في كيفية التعامل مع الجزر داخل حدود التهشير الجديدة'
    },

    hplayer: {
      ...enCommand.ACAD.hplayer,
      description:
        'تحديد الطبقة الافتراضية للتهشير والتعبئة الجديدة'
    },

    hpname: {
      ...enCommand.ACAD.hpname,
      description:
        'تحديد اسم نمط التهشير الافتراضي للعناصر الجديدة في الجلسة الحالية'
    },

    hpscale: {
      ...enCommand.ACAD.hpscale,
      description:
        'تحديد معامل المقياس الافتراضي لأنماط التهشير الجديدة'
    },

    hpseparate: {
      ...enCommand.ACAD.hpseparate,
      description:
        'التحكم في إنشاء عنصر تهشير واحد أو عناصر منفصلة عند وجود عدة حدود'
    },

    hptransparency: {
      ...enCommand.ACAD.hptransparency,
      description:
        'تحديد الشفافية الافتراضية للتهشير والتعبئة الجديدة'
    },

    insunits: {
      ...enCommand.ACAD.insunits,
      description:
        'تحديد وحدات الرسم المستخدمة في التحجيم التلقائي للكتل والصور والمراجع الخارجية عند الإدراج'
    },

    laycur: {
      ...enCommand.ACAD.laycur,
      description:
        'تغيير طبقة العناصر المحددة إلى الطبقة الحالية',
      prompt:
        'حدد العناصر المطلوب نقلها إلى الطبقة الحالية'
    },

    laydel: {
      ...enCommand.ACAD.laydel,
      description:
        'حذف طبقة وجميع العناصر الموجودة عليها'
    },

    layerclose: {
      ...enCommand.ACAD.layerclose,
      description:
        'إغلاق مدير خصائص الطبقات'
    },

    layerp: {
      ...enCommand.ACAD.layerp,
      description:
        'التراجع عن آخر تغيير أو مجموعة تغييرات في إعدادات الطبقات'
    },

    layfrz: {
      ...enCommand.ACAD.layfrz,
      description:
        'تجميد طبقة العناصر المحددة',
      prompt:
        'حدد عنصرًا على الطبقة المراد تجميدها'
    },

    layiso: {
      ...enCommand.ACAD.layiso,
      description:
        'عزل طبقات العناصر المحددة',
      prompt:
        'حدد عناصر على الطبقات المراد عزلها'
    },

    laylck: {
      ...enCommand.ACAD.laylck,
      description:
        'قفل طبقة العناصر المحددة',
      prompt:
        'حدد عنصرًا على الطبقة المراد قفلها'
    },

    layoff: {
      ...enCommand.ACAD.layoff,
      description:
        'إيقاف طبقة العناصر المحددة',
      prompt:
        'حدد عنصرًا على الطبقة المراد إيقافها'
    },

    layon: {
      ...enCommand.ACAD.layon,
      description:
        'تشغيل جميع الطبقات في الرسم'
    },

    laythw: {
      ...enCommand.ACAD.laythw,
      description:
        'إلغاء تجميد جميع الطبقات المجمدة في الرسم'
    },

    layulk: {
      ...enCommand.ACAD.layulk,
      description:
        'إلغاء قفل طبقة العناصر المحددة',
      prompt:
        'حدد عنصرًا على الطبقة المراد إلغاء قفلها'
    },

    layuniso: {
      ...enCommand.ACAD.layuniso,
      description:
        'استعادة الطبقات التي تم إخفاؤها أو قفلها بواسطة LAYISO'
    },

    line: {
      ...enCommand.ACAD.line,
      description:
        'رسم مقاطع خطوط مستقيمة بين النقاط'
    },

    log: {
      ...enCommand.ACAD.log,
      description:
        'تسجيل معلومات تصحيح الأخطاء في وحدة التحكم'
    },

    ltscale: {
      ...enCommand.ACAD.ltscale,
      description:
        'تحديد معامل مقياس نوع الخط العام للرسم'
    },

    lunits: {
      ...enCommand.ACAD.lunits,
      description:
        'تحديد تنسيق عرض الإحداثيات والمسافات'
    },

    luprec: {
      ...enCommand.ACAD.luprec,
      description:
        'تحديد دقة عرض الوحدات الخطية بالتكامل مع LUNITS'
    },

    lwdisplay: {
      ...enCommand.ACAD.lwdisplay,
      description:
        'التحكم في عرض سُمك الخطوط داخل الرسم'
    },

    clearmeasurements: {
      ...enCommand.ACAD.clearmeasurements,
      description:
        'إزالة جميع القياسات من المخطط الحالي'
    },

    measurementvis: {
      ...enCommand.ACAD.measurementvis,
      description:
        'إظهار أو إخفاء القياسات في المخطط الحالي'
    },

    measurementpanel: {
      ...enCommand.ACAD.measurementpanel,
      description:
        'فتح لوحة القياس'
    },

    measurementexport: {
      ...enCommand.ACAD.measurementexport,
      description:
        'تصدير القياسات إلى ملف JSON جانبي'
    },

    measurementimport: {
      ...enCommand.ACAD.measurementimport,
      description:
        'استيراد القياسات من ملف JSON جانبي'
    },

    measurearea: {
      ...enCommand.ACAD.measurearea,
      description:
        'حساب المساحة والمحيط للعناصر أو النقاط المحددة'
    },

    measureangle: {
      ...enCommand.ACAD.measureangle,
      description:
        'قياس الزاوية بين خطين أو باستخدام ثلاث نقاط'
    },

    measurearc: {
      ...enCommand.ACAD.measurearc,
      description:
        'قياس طول مقطع قوس'
    },

    measuredistance: {
      ...enCommand.ACAD.measuredistance,
      description:
        'قياس المسافة وفروق الإحداثيات بين نقطتين'
    },

    measurecontinuous: {
      ...enCommand.ACAD.measurecontinuous,
      description:
        'قياس مسافات متسلسلة باختيار نقاط متتالية حتى Enter أو إلغاء'
    },

    measurepoint: {
      ...enCommand.ACAD.measurepoint,
      description:
        'قياس إحداثيات X وY لنقطة محددة'
    },

    measurement: {
      ...enCommand.ACAD.measurement,
      description:
        'تحديد ما إذا كان الرسم يستخدم الوحدات الإمبراطورية أو المترية'
    },

    measurementcolor: {
      ...enCommand.ACAD.measurementcolor,
      description:
        'تحديد اللون المستخدم لتراكبات القياس'
    },

    modelbkcolor: {
      ...enCommand.ACAD.modelbkcolor,
      description:
        'تحديد لون خلفية مساحة النموذج'
    },

    mline: {
      ...enCommand.ACAD.mline,
      description:
        'إنشاء عدة خطوط متوازية كعنصر متعدد الخطوط واحد'
    },

    move: {
      ...enCommand.ACAD.move,
      description:
        'نقل العناصر المحددة باستخدام متجه إزاحة',
      prompt:
        'حدد العناصر'
    },

    offset: {
      ...enCommand.ACAD.offset,
      description:
        'إنشاء منحنيات أو خطوط متعددة أو دوائر موازية على مسافة محددة'
    },

    mtext: {
      ...enCommand.ACAD.mtext,
      description:
        'إنشاء عنصر نص متعدد الأسطر'
    },

    open: {
      ...enCommand.ACAD.open,
      description:
        'فتح ملف رسم موجود'
    },

    openprof: {
      ...enCommand.ACAD.openprof,
      description:
        'التحكم في تسجيل أزمنة مراحل فتح الملفات داخل وحدة التحكم'
    },

    openperf: {
      ...enCommand.ACAD.openperf,
      description:
        'فتح لوحة أداء الفتح وعرض أزمنة آخر عملية فتح للرسم'
    },

    orthomode: {
      ...enCommand.ACAD.orthomode,
      description:
        'تقييد حركة المؤشر على المحور الأفقي أو الرأسي'
    },

    osmode: {
      ...enCommand.ACAD.osmode,
      description:
        'تحديد أوضاع Object Snap المستمرة باستخدام قيمة bitcode'
    },

    pan: {
      ...enCommand.ACAD.pan,
      description:
        'تحريك العرض دون تغيير اتجاه الرؤية أو مستوى التكبير'
    },

    paperbkcolor: {
      ...enCommand.ACAD.paperbkcolor,
      description:
        'تحديد لون خلفية مساحة الورق أو المخطط'
    },

    pdmode: {
      ...enCommand.ACAD.pdmode,
      description:
        'التحكم في طريقة عرض عناصر POINT'
    },

    pdsize: {
      ...enCommand.ACAD.pdsize,
      description:
        'تحديد حجم عرض عناصر POINT'
    },

    pickbox: {
      ...enCommand.ACAD.pickbox,
      description:
        'تحديد حجم مربع التحديد المستخدم لاختيار العناصر بالبكسل'
    },

    pline: {
      ...enCommand.ACAD.pline,
      description:
        'إنشاء متعدد خطوط باستخدام عدة نقاط'
    },

    pngout: {
      ...enCommand.ACAD.pngout,
      description:
        'تصدير الرسم إلى PNG'
    },

    point: {
      ...enCommand.ACAD.point,
      description:
        'إنشاء نقاط'
    },

    polaraddang: {
      ...enCommand.ACAD.polaraddang,
      description:
        'تخزين زوايا إضافية للتتبع القطبي كقائمة مفصولة بفواصل منقوطة'
    },

    polarang: {
      ...enCommand.ACAD.polarang,
      description:
        'تحديد مقدار زيادة الزاوية للتتبع القطبي'
    },

    polarmode: {
      ...enCommand.ACAD.polarmode,
      description:
        'التحكم في إعدادات التتبع القطبي وتتبع Object Snap'
    },

    polygon: {
      ...enCommand.ACAD.polygon,
      description:
        'إنشاء مضلع منتظم باستخدام المركز ونصف القطر أو باستخدام أحد أضلاع المضلع'
    },

    qnew: {
      ...enCommand.ACAD.qnew,
      description:
        'بدء رسم جديد'
    },

    close: {
      ...enCommand.ACAD.close,
      description:
        'إغلاق الرسم الحالي'
    },

    ray: {
      ...enCommand.ACAD.ray,
      description:
        'إنشاء شعاع يبدأ من نقطة ويمتد إلى ما لا نهاية'
    },

    rectang: {
      ...enCommand.ACAD.rectang,
      description:
        'إنشاء مستطيل بتحديد ركنين متقابلين'
    },

    regen: {
      ...enCommand.ACAD.regen,
      description:
        'إعادة رسم العرض الحالي'
    },

    revcloud: {
      ...enCommand.ACAD.revcloud,
      description:
        'إنشاء أو تعديل سحابة مراجعة'
    },

    markuptext: {
      ...enCommand.ACAD.markuptext,
      description:
        'وضع علامة مراجعة نصية'
    },

    markupline: {
      ...enCommand.ACAD.markupline,
      description:
        'إنشاء علامة مراجعة خطية'
    },

    markuparrow: {
      ...enCommand.ACAD.markuparrow,
      description:
        'إنشاء سهم مراجعة'
    },

    markupcloud: {
      ...enCommand.ACAD.markupcloud,
      description:
        'إنشاء سحابة مراجعة'
    },

    markuprect: {
      ...enCommand.ACAD.markuprect,
      description:
        'إنشاء مستطيل مراجعة'
    },

    markupcircle: {
      ...enCommand.ACAD.markupcircle,
      description:
        'إنشاء دائرة مراجعة'
    },

    markuphighlight: {
      ...enCommand.ACAD.markuphighlight,
      description:
        'إنشاء مستطيل تمييز'
    },

    markupcallout: {
      ...enCommand.ACAD.markupcallout,
      description:
        'إنشاء وسيلة شرح: حدد رأس خط التوجيه ثم موضع مربع النص ثم أدخل النص'
    },

    markupstamp: {
      ...enCommand.ACAD.markupstamp,
      description:
        'وضع ختم أو رمز مخصص'
    },

    markupvis: {
      ...enCommand.ACAD.markupvis,
      description:
        'إظهار أو إخفاء علامات المراجعة'
    },

    clearmarkups: {
      ...enCommand.ACAD.clearmarkups,
      description:
        'مسح جميع علامات المراجعة من المخطط الحالي'
    },

    markupexport: {
      ...enCommand.ACAD.markupexport,
      description:
        'تصدير علامات المراجعة إلى ملف JSON جانبي'
    },

    markupimport: {
      ...enCommand.ACAD.markupimport,
      description:
        'استيراد علامات المراجعة من ملف JSON جانبي'
    },

    markuppanel: {
      ...enCommand.ACAD.markuppanel,
      description:
        'فتح لوحة علامات المراجعة'
    },

    rotate: {
      ...enCommand.ACAD.rotate,
      description:
        'تدوير العناصر المحددة حول نقطة أساس',
      prompt:
        'حدد العناصر'
    },

    select: {
      ...enCommand.ACAD.select,
      description:
        'تحديد العناصر'
    },

    shortcutmenu: {
      ...enCommand.ACAD.shortcutmenu,
      description:
        'التحكم في إتاحة القوائم المختصرة داخل منطقة الرسم'
    },

    sketch: {
      ...enCommand.ACAD.sketch,
      description:
        'إنشاء سلسلة من مقاطع الخطوط بالرسم الحر'
    },

    spline: {
      ...enCommand.ACAD.spline,
      description:
        'إنشاء منحنى Spline ناعم باستخدام نقاط التحكم'
    },

    textstyle: {
      ...enCommand.ACAD.textstyle,
      description:
        'تحديد اسم نمط النص الحالي'
    },

    unitmode: {
      ...enCommand.ACAD.unitmode,
      description:
        'التحكم في عرض الكسور للإحداثيات عندما يكون LUNITS من النوع Architectural أو Fractional'
    },

    switchbg: {
      ...enCommand.ACAD.switchbg,
      description:
        'التبديل بين الخلفية البيضاء والسوداء لمنطقة الرسم'
    },

    unisolateobjects: {
      ...enCommand.ACAD.unisolateobjects,
      description:
        'إعادة عرض جميع العناصر التي تم إخفاؤها بواسطة HIDEOBJECTS'
    },

    undo: {
      ...enCommand.ACAD.undo,
      description:
        'التراجع عن آخر عملية تحرير في قاعدة بيانات الرسم',
      nothingToUndo:
        'لا توجد عملية يمكن التراجع عنها.'
    },

    redo: {
      ...enCommand.ACAD.redo,
      description:
        'إعادة آخر عملية تم التراجع عنها',
      nothingToRedo:
        'لا توجد عملية يمكن إعادتها.'
    },

    xline: {
      ...enCommand.ACAD.xline,
      description:
        'إنشاء خط إنشائي يمتد إلى ما لا نهاية في الاتجاهين'
    },

    zoom: {
      ...enCommand.ACAD.zoom,
      description:
        'التكبير أو التصغير لعرض أقصى امتداد لجميع العناصر'
    }
  },

  USER: {
    ...enCommand.USER
  }
}