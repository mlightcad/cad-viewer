import enMain from '../en/main'

export default {
  ...enMain,

  mainMenu: {
    ...enMain.mainMenu,
    new: 'رسم جديد',
    open: 'فتح رسم',
    drawingUnits: 'وحدات الرسم',
    exportMenu: 'تصدير',
    export: 'تصدير إلى DXF',
    exportHtml: 'تصدير إلى HTML',
    exportPdf: 'تصدير إلى PDF',
    exportSvg: 'تصدير إلى SVG',
    exportImage: 'تصدير إلى صورة',
    about: 'حول'
  },

  ribbon: {
    ...enMain.ribbon,

    tab: {
      ...enMain.ribbon.tab,
      home: 'الرئيسية',
      insert: 'إدراج',
      review: 'مراجعة',
      measurement: 'القياس',
      hatchContext: 'التهشير',
      mtextEditorContext: 'محرر النص'
    },

    group: {
      ...enMain.ribbon.group,
      draw: 'رسم',
      modify: 'تعديل',
      layer: 'الطبقات',
      properties: 'الخصائص',
      utilities: 'أدوات',
      annotation: 'تعليقات توضيحية',
      review: 'مراجعة',
      measurement: 'القياس',
      style: 'النمط',
      lengthUnits: 'وحدات الطول',
      angleUnits: 'وحدات الزوايا',
      reference: 'المراجع',
      block: 'الكتل'
    },

    property: {
      ...enMain.ribbon.property,
      color: 'اللون',
      lineType: 'نوع الخط',
      lineWeight: 'سُمك الخط'
    },

    layerTools: {
      ...enMain.ribbon.layerTools,
      select: 'الطبقة',
      off: 'إيقاف الطبقة',
      isolate: 'عزل',
      freeze: 'تجميد الطبقة',
      lock: 'قفل الطبقة',
      current: 'تعيين كحالية',
      allOn: 'تشغيل الطبقات',
      unisolate: 'إلغاء العزل',
      thaw: 'إلغاء التجميد',
      unlock: 'إلغاء القفل',
      restore: 'استعادة الطبقات'
    },

    command: {
      ...enMain.ribbon.command,
      line: 'خط',
      polyline: 'متعدد الخطوط',
      circle: 'دائرة',
      arc: 'قوس',
      ellipse: 'قطع ناقص',
      spline: 'منحنى',
      sketch: 'رسم حر',
      revcloud: 'سحابة مراجعة',
      rect: 'مستطيل',
      rectangle: 'مستطيل',
      polygon: 'مضلع',
      point: 'نقطة',
      divide: 'تقسيم',
      hatch: 'تهشير',
      text: 'نص',
      gradient: 'تدرج',
      move: 'نقل',
      rotate: 'تدوير',
      copy: 'نسخ',
      erase: 'حذف',
      offset: 'إزاحة',
      undo: 'تراجع',
      redo: 'إعادة',
      properties: 'الخصائص',
      countList: 'العد',
      insert: 'إدراج',

      quickSelect: 'تحديد\nسريع',
      drawingUnits: 'وحدات\nالرسم',
      attachDwg: 'إرفاق\nDWG',
      attachImage: 'إرفاق\nصورة',
      editAttributes: 'تعديل\nالسمات',
      defineAttribute: 'تعريف\nسمة',
      agent: 'وكيل\nCAD'
,
  mline: 'خط متعدد',
  ray: 'شعاع',
  xline: 'خط إنشائي',
},
    hatch: {
      ...enMain.ribbon.hatch,

      group: {
        ...enMain.ribbon.hatch.group,
        boundary: 'الحدود',
        pattern: 'نمط التهشير',
        properties: 'الخصائص',
        options: 'الخيارات',
        close: 'إغلاق'
      },

      command: {
        ...enMain.ribbon.hatch.command,
        pickPoints: 'اختيار نقاط',
        selectObjects: 'تحديد عناصر',
        close: 'إغلاق'
      },

      field: {
        ...enMain.ribbon.hatch.field,
        pattern: 'النمط',
        scale: 'المقياس',
        angle: 'الزاوية',
        style: 'النمط الهندسي',
        associative: 'ترابطي',
        fillType: 'نوع التعبئة',
        fillColor: 'اللون',
        patternColor: 'لون النمط',
        gradient1Color: 'لون التدرج 1',
        backgroundColor: 'لون الخلفية',
        gradient2Color: 'لون التدرج 2',
        opacity: 'الشفافية',
        imageScale: 'مقياس الصورة'
      },

      style: {
        ...enMain.ribbon.hatch.style,
        normal: 'عادي',
        outer: 'خارجي',
        ignore: 'تجاهل'
      },

      fillType: {
        ...enMain.ribbon.hatch.fillType,
        solid: 'مصمت',
        pattern: 'نمط',
        gradient: 'تدرج'
      },

      associative: {
        ...enMain.ribbon.hatch.associative,
        on: 'تشغيل',
        off: 'إيقاف'
      },

      tooltip: {
        ...enMain.ribbon.hatch.tooltip,
        pickPoints: 'حدد نقاطًا داخلية لإنشاء مناطق التهشير.',
        selectObjects: 'حدد عناصر حدود مغلقة لتطبيق التهشير.',
        pattern: 'اختر اسم نمط التهشير.',
        scale: 'حدد مقياس نمط التهشير.',
        angle: 'حدد زاوية نمط التهشير بالدرجات.',
        style: 'حدد أسلوب اكتشاف الجزر داخل التهشير.',
        associative: 'تشغيل أو إيقاف التهشير الترابطي.',
        fillType: 'اختر نوع التعبئة: مصمت أو نمط أو تدرج.',
        fillColor: 'اختر لون التعبئة.',
        patternColor: 'اختر لون خطوط النمط.',
        gradient1Color: 'اختر اللون الأول للتدرج.',
        backgroundColor: 'اختر لون خلفية تعبئة النمط.',
        gradient2Color: 'اختر اللون الثاني للتدرج.',
        opacity: 'حدد شفافية التهشير من 0 إلى 90.',
        imageScale: 'حدد مقياس صورة التعبئة.',
        close: 'إنهاء إنشاء التهشير وإغلاق هذا التبويب.'
      }
    },

    mtext: {
      ...enMain.ribbon.mtext,

      group: {
        ...enMain.ribbon.mtext.group,
        textStyle: 'نمط النص',
        format: 'التنسيق',
        paragraph: 'الفقرة',
        insert: 'إدراج',
        close: 'إغلاق'
      },

      field: {
        ...enMain.ribbon.mtext.field,
        textStyle: 'نمط النص',
        font: 'الخط',
        color: 'اللون',
        height: 'الارتفاع',
        obliqueAngle: 'زاوية الميل',
        tracking: 'تباعد الأحرف',
        widthFactor: 'معامل العرض'
      },

      characterMap: {
        ...enMain.ribbon.mtext.characterMap,
        title: 'جدول المحارف',
        font: 'الخط:',
        charsToCopy: 'المحارف المراد نسخها:',
        select: 'تحديد',
        copy: 'نسخ',
        noGlyphs: 'لا توجد محارف متاحة لهذا الخط.',
        copyFailed: 'تعذر النسخ إلى الحافظة.'
      },

      command: {
        ...enMain.ribbon.mtext.command,
        bold: 'عريض',
        underline: 'تسطير',
        superscript: 'مرتفع',
        italic: 'مائل',
        overline: 'خط علوي',
        subscript: 'منخفض',
        strikethrough: 'يتوسطه خط',
        stack: 'تكديس',
        toggleCase: 'تبديل حالة الأحرف',
        attachment: 'المحاذاة',
        list: 'تعداد وترقيم',
        lineSpacing: 'تباعد الأسطر',
        paragraphAlignment: 'محاذاة الفقرة',
        symbol: 'رمز',
        close: 'إغلاق'
      },

      tooltip: {
        ...enMain.ribbon.mtext.tooltip,
        textStyle: 'اختر نمط نص من الرسم الحالي.',
        bold: 'تشغيل أو إيقاف التنسيق العريض.',
        underline: 'تشغيل أو إيقاف التسطير.',
        superscript: 'تشغيل أو إيقاف النص المرتفع.',
        italic: 'تشغيل أو إيقاف التنسيق المائل.',
        overline: 'تشغيل أو إيقاف الخط العلوي.',
        subscript: 'تشغيل أو إيقاف النص المنخفض.',
        strikethrough: 'تشغيل أو إيقاف الخط المتوسط.',
        stack: 'تكديس أو فك تكديس النص الكسري المحدد.',
        toggleCase: 'التبديل بين الأحرف الكبيرة والصغيرة للنص المحدد.',
        font: 'حدد خط النص الحالي.',
        color: 'حدد لون النص الحالي.',
        height: 'حدد ارتفاع النص الحالي. القيم المخصصة مسموحة.',
        obliqueAngle: 'حدد زاوية ميل المحارف المحددة بالدرجات.',
        tracking: 'زيادة أو تقليل التباعد بين المحارف المحددة.',
        widthFactor: 'تمديد أو ضغط المحارف المحددة أفقيًا.',
        attachment: 'حدد نقطة إرفاق النص متعدد الأسطر.',
        list: 'إدراج أو إعداد التعداد والترقيم.',
        lineSpacing: 'حدد تباعد الأسطر.',
        paragraphAlignment: 'حدد المحاذاة الأفقية للفقرة.',
        symbol: 'إدراج رمز هندسي شائع.',
        close: 'إغلاق محرر النص وإنهاء هذا التبويب.'
      },

      attachment: {
        ...enMain.ribbon.mtext.attachment,
        TL: 'أعلى يسار',
        TC: 'أعلى وسط',
        TR: 'أعلى يمين',
        ML: 'منتصف يسار',
        MC: 'منتصف وسط',
        MR: 'منتصف يمين',
        BL: 'أسفل يسار',
        BC: 'أسفل وسط',
        BR: 'أسفل يمين'
      },

      list: {
        ...enMain.ribbon.mtext.list,
        off: 'إيقاف',
        number: 'مرقم',
        letter: 'حروفي',
        bullet: 'نقطي',
        start: 'بدء',
        continue: 'متابعة',
        auto: 'السماح بالتعداد والترقيم التلقائي',
        allowList: 'السماح بالتعداد والقوائم'
      },

      lineSpacing: {
        ...enMain.ribbon.mtext.lineSpacing,
        more: 'المزيد...',
        clear: 'مسح تباعد الفقرة'
      },

      paragraphAlign: {
        ...enMain.ribbon.mtext.paragraphAlign,
        default: 'افتراضي',
        left: 'يسار',
        center: 'وسط',
        right: 'يمين',
        justified: 'ضبط',
        distributed: 'موزع'
      },

      symbol: {
        ...enMain.ribbon.mtext.symbol,
        degree: 'درجة  %%d',
        plusMinus: 'زائد/ناقص  %%p',
        diameter: 'قطر  %%c',
        almostEqual: 'يساوي تقريبًا  \\U+2248',
        angle: 'زاوية  \\U+2220',
        boundary: 'خط حدود  \\U+E100',
        centerLine: 'خط مركز  \\U+2104',
        delta: 'دلتا  \\U+0394',
        electricalPhase: 'طور كهربائي  \\U+0278',
        flowLine: 'خط تدفق  \\U+E101',
        identical: 'مطابق  \\U+2261',
        notEqual: 'لا يساوي  \\U+2260',
        ohm: 'أوم  \\U+2126',
        omega: 'أوميغا  \\U+03A9',
        propertyLine: 'خط الملكية  \\U+214A',
        subscriptTwo: 'رقم 2 منخفض  \\U+2082',
        squared: 'تربيع  \\U+00B2',
        cubed: 'تكعيب  \\U+00B3',
        nbsp: 'مسافة غير قابلة للكسر Ctrl+Shift+Space',
        other: 'أخرى...'
      }
    },

    arc: {
      ...enMain.ribbon.arc,
      threePoint: '3 نقاط',
      startCenterEnd: 'البداية، المركز، النهاية',
      startCenterAngle: 'البداية، المركز، الزاوية',
      startCenterLength: 'البداية، المركز، الطول',
      startEndAngle: 'البداية، النهاية، الزاوية',
      startEndDirection: 'البداية، النهاية، الاتجاه',
      startEndRadius: 'البداية، النهاية، نصف القطر',
      centerStartEnd: 'المركز، البداية، النهاية',
      centerStartAngle: 'المركز، البداية، الزاوية',
      centerStartLength: 'المركز، البداية، الطول'
    },

    circle: {
      ...enMain.ribbon.circle,
      centerRadius: 'المركز، نصف القطر',
      centerDiameter: 'المركز، القطر',
      twoPoint: 'نقطتان',
      threePoint: '3 نقاط',
      tanTanRadius: 'مماس، مماس، نصف القطر',
      tanTanTan: 'مماس، مماس، مماس'
    },

    ellipse: {
      ...enMain.ribbon.ellipse,
      ellipse: 'قطع ناقص',
      arc: 'قوس بيضاوي'
    },

    insertBlock: {
      ...enMain.ribbon.insertBlock,
      empty: 'لا توجد كتل متاحة',
      currentDrawing: 'الرسم الحالي',
      previewMenu: 'معرض معاينة الكتل'
    },

    tooltip: {
      ...enMain.ribbon.tooltip,

      line: 'ارسم قطعة خط مستقيم واحدة.',

      polyline:
        'ارسم سلسلة مترابطة من مقاطع الخطوط أو الأقواس كعنصر واحد.',

      spline:
        'ارسم منحنى Spline ناعمًا باستخدام نقاط الملاءمة أو نقاط التحكم.',

      sketch:
        'أنشئ سلسلة من مقاطع الخطوط بالرسم الحر.',

      revcloud:
        'أنشئ سحابة مراجعة لإبراز منطقة في الرسم.',

      circle:
        'ارسم دائرة باستخدام عدة طرق إنشائية.',

      arc:
        'ارسم قوسًا باستخدام عدة طرق إنشائية.',

      mline:
        'ارسم عدة خطوط متوازية كعنصر متعدد الخطوط واحد.',

      ray:
        'ارسم شعاعًا إنشائيًا يبدأ من نقطة ويمتد بلا نهاية في اتجاه واحد.',

      xline:
        'ارسم خطًا إنشائيًا غير محدود في الاتجاهين.',

      ellipse:
        'ارسم قطعًا ناقصًا أو قوسًا بيضاويًا.',

      rect:
        'ارسم مستطيلًا أو مضلعًا منتظمًا.',

      point:
        'ضع عنصر نقطة داخل الرسم.',

      hatch:
        'املأ منطقة مغلقة بنمط تهشير.',

      text:
        'أنشئ نصًا متعدد الأسطر داخل الرسم.',

      move:
        'انقل العناصر المحددة إلى موضع جديد.',

      rotate:
        'دوّر العناصر المحددة حول نقطة أساس.',

      copy:
        'انسخ العناصر المحددة إلى موضع جديد.',

      erase:
        'احذف العناصر المحددة من الرسم.',

      offset:
        'أنشئ نسخة موازية من عنصر على مسافة محددة.',

      undo:
        'تراجع عن آخر عملية تحرير.',

      redo:
        'أعد آخر عملية تم التراجع عنها.',

      properties:
        'افتح لوحة الخصائص للعناصر المحددة حاليًا.',

      quickSelect:
        'افتح التحديد السريع لتصفية العناصر وتحديدها وفق شروط.',

      countList:
        'افتح لوحة العد لعرض أعداد الكتل وإدارتها.',

      missingResources:
        'افتح لوحة الموارد المفقودة والخارجية للخطوط والصور والمراجع الخارجية.',

      drawingUnits:
        'افتح وحدات الرسم لتحديد تنسيق الإحداثيات والدقة ومقياس الإدراج.',

      attachDwg:
        'أرفق رسم DWG أو DXF كمرجع خارجي (XATTACH).',

      attachImage:
        'أرفق صورة نقطية كمرجع خارجي (IMAGEATTACH).',

      insert:
        'افتح لوحة الكتل لاستعراض تعريفات الكتل وإدراجها (INSERT).',

      editAttributes:
        'افتح محرر السمات المتقدم لتعديل قيم وخصائص عرض سمات الكتلة (ATTEDIT).',

      defineAttribute:
        'أنشئ تعريف سمة لاستخدامه داخل كتلة (ATTDEF).',

      agent:
        'افتح لوحة CAD Agent لإنشاء هندسة باستخدام اللغة الطبيعية.',

      propertyColor:
        'حدد لون العناصر الجديدة أو العناصر المحددة.',

      propertyLineType:
        'حدد نوع الخط للعناصر الجديدة أو العناصر المحددة.',

      propertyLineWeight:
        'حدد سُمك الخط للعناصر الجديدة أو العناصر المحددة.',

      layerAction: {
        ...enMain.ribbon.tooltip.layerAction,

        off:
          'أوقف الطبقة المحددة لإخفاء عناصرها دون تجميدها.',

        isolate:
          'اعزل الطبقة المحددة وأخفِ الطبقات الأخرى للتركيز على عناصرها.',

        freeze:
          'جمّد الطبقة المحددة لإخفاء عناصرها واستبعادها من إعادة التوليد.',

        lock:
          'اقفل الطبقة المحددة بحيث تظل عناصرها مرئية دون إمكانية تعديلها.',

        current:
          'اجعل الطبقة المحددة هي الحالية بحيث تُنشأ العناصر الجديدة عليها.',

        allOn:
          'شغّل جميع الطبقات المتوقفة حاليًا. تظل الطبقات المجمدة مجمدة.',

        unisolate:
          'ألغِ عزل الطبقات واستعد الطبقات التي تم إخفاؤها أو قفلها.',

        thaw:
          'ألغِ تجميد الطبقة المحددة لإظهار عناصرها وإدراجها في إعادة التوليد.',

        unlock:
          'ألغِ قفل الطبقة المحددة للسماح بتحديد عناصرها وتعديلها.',

        restore:
          'استعد حالة الطبقات السابقة من آخر عملية طبقات.'
      },

      circleOption: {
        ...enMain.ribbon.tooltip.circleOption,

        centerRadius:
          'أنشئ دائرة بتحديد نقطة المركز ونصف القطر.',

        centerDiameter:
          'أنشئ دائرة بتحديد نقطة المركز والقطر.',

        twoPoint:
          'أنشئ دائرة يُحدد قطرها بواسطة نقطتين.',

        threePoint:
          'أنشئ دائرة تمر عبر ثلاث نقاط.',

        tanTanRadius:
          'أنشئ دائرة مماسة لعنصرين بنصف قطر محدد.',

        tanTanTan:
          'أنشئ دائرة مماسة لثلاثة عناصر.'
      },

      arcOption: {
        ...enMain.ribbon.tooltip.arcOption,

        threePoint:
          'أنشئ قوسًا يمر بنقطة بداية ونقطة ثانية ونقطة نهاية.',

        startCenterEnd:
          'أنشئ قوسًا بتحديد نقطة البداية والمركز والنهاية.',

        startCenterAngle:
          'أنشئ قوسًا بتحديد نقطة البداية والمركز والزاوية المحصورة.',

        startCenterLength:
          'أنشئ قوسًا بتحديد نقطة البداية والمركز وطول القوس.',

        startEndAngle:
          'أنشئ قوسًا من نقطتي البداية والنهاية مع تحديد الزاوية المحصورة.',

        startEndDirection:
          'أنشئ قوسًا من نقطتي البداية والنهاية مع تحديد اتجاه المماس عند البداية.',

        startEndRadius:
          'أنشئ قوسًا من نقطتي البداية والنهاية مع تحديد نصف القطر.',

        centerStartEnd:
          'أنشئ قوسًا بتحديد المركز ونقطة البداية والنهاية.',

        centerStartAngle:
          'أنشئ قوسًا بتحديد المركز ونقطة البداية والزاوية المحصورة.',

        centerStartLength:
          'أنشئ قوسًا بتحديد المركز ونقطة البداية وطول القوس.'
      },

      rectOption: {
        ...enMain.ribbon.tooltip.rectOption,

        rectangle:
          'أنشئ مستطيلًا بتحديد ركنين متقابلين أو باستخدام الأبعاد.',

        polygon:
          'أنشئ مضلعًا منتظمًا بتحديد عدد الأضلاع وطريقة الإنشاء.'
      },

      ellipseOption: {
        ...enMain.ribbon.tooltip.ellipseOption,

        ellipse:
          'أنشئ قطعًا ناقصًا كاملًا بتحديد المحورين الأكبر والأصغر.',

        arc:
          'أنشئ قوسًا بيضاويًا بتحديد محوري القطع الناقص وحدود القوس.'
      }
    }

},
  verticalToolbar: {
    ...enMain.verticalToolbar,

    measure: {
      ...enMain.verticalToolbar.measure,
      text: 'قياس',
      description: 'أدوات القياس'
    },

    measureDistance: {
      ...enMain.verticalToolbar.measureDistance,
      text: 'المسافة',
      description: 'قياس المسافة بين نقطتين'
    },

    measureContinuous: {
      ...enMain.verticalToolbar.measureContinuous,
      text: 'مستمر',
      description: 'قياس مسافات متسلسلة باختيار نقاط متتالية حتى Enter أو إلغاء'
    },

    measureAngle: {
      ...enMain.verticalToolbar.measureAngle,
      text: 'الزاوية',
      description: 'قياس الزاوية بين خطين يشتركان في رأس واحد'
    },

    measureArea: {
      ...enMain.verticalToolbar.measureArea,
      text: 'المساحة',
      description: 'قياس مساحة مضلع'
    },

    measureArc: {
      ...enMain.verticalToolbar.measureArc,
      text: 'القوس',
      description: 'قياس طول قوس محدد بثلاث نقاط'
    },

    measurePoint: {
      ...enMain.verticalToolbar.measurePoint,
      text: 'نقطة',
      description: 'قراءة إحداثيات X وY لنقطة محددة'
    },

    measurementPanel: {
      ...enMain.verticalToolbar.measurementPanel,
      text: 'لوحة القياس',
      description: 'فتح لوحة القياس'
    },

    clearMeasurements: {
      ...enMain.verticalToolbar.clearMeasurements,
      text: 'مسح',
      description: 'حذف جميع القياسات من المخطط الحالي'
    },

    measurementImport: {
      ...enMain.verticalToolbar.measurementImport,
      text: 'استيراد',
      description: 'استيراد القياسات من ملف JSON جانبي'
    },

    measurementExport: {
      ...enMain.verticalToolbar.measurementExport,
      text: 'تصدير',
      description: 'تصدير القياسات إلى ملف JSON جانبي'
    },

    annotation: {
      ...enMain.verticalToolbar.annotation,
      text: 'تعليقات',
      description: 'أدوات المراجعة'
    },

    layer: {
      ...enMain.verticalToolbar.layer,
      text: 'الطبقات',
      description: 'إدارة الطبقات'
    },

    pan: {
      ...enMain.verticalToolbar.pan,
      text: 'تحريك',
      description: 'تحريك العرض دون تغيير اتجاه الرؤية أو مستوى التكبير'
    },

    markupPanel: {
      ...enMain.verticalToolbar.markupPanel,
      text: 'لوحة المراجعة',
      description: 'فتح لوحة المراجعة'
    },

    markupText: {
      ...enMain.verticalToolbar.markupText,
      text: 'نص',
      description: 'إضافة تعليق نصي'
    },

    markupCloud: {
      ...enMain.verticalToolbar.markupCloud,
      text: 'سحابة',
      description: 'إنشاء سحابة مراجعة'
    },

    markupRect: {
      ...enMain.verticalToolbar.markupRect,
      text: 'مستطيل',
      description: 'إنشاء تعليق على شكل مستطيل'
    },

    markupCircle: {
      ...enMain.verticalToolbar.markupCircle,
      text: 'دائرة',
      description: 'إنشاء تعليق على شكل دائرة'
    },

    markupArrow: {
      ...enMain.verticalToolbar.markupArrow,
      text: 'سهم',
      description: 'إنشاء سهم مراجعة'
    },

    markupLine: {
      ...enMain.verticalToolbar.markupLine,
      text: 'خط',
      description: 'إنشاء خط مراجعة'
    },

    markupCallout: {
      ...enMain.verticalToolbar.markupCallout,
      text: 'وسيلة شرح',
      description: 'إنشاء وسيلة شرح'
    },

    markupStamp: {
      ...enMain.verticalToolbar.markupStamp,
      text: 'ختم',
      description: 'إضافة ختم'
    },

    markupImport: {
      ...enMain.verticalToolbar.markupImport,
      text: 'استيراد',
      description: 'استيراد علامات المراجعة من ملف JSON جانبي'
    },

    markupExport: {
      ...enMain.verticalToolbar.markupExport,
      text: 'تصدير',
      description: 'تصدير علامات المراجعة إلى ملف JSON جانبي'
    },

    markupColor: {
      ...enMain.verticalToolbar.markupColor,
      text: 'اللون',
      description: 'تحديد لون علامات المراجعة الجديدة'
    },

    markupFontSize: {
      ...enMain.verticalToolbar.markupFontSize,
      text: 'ارتفاع النص',
      description: 'فتح إعدادات ارتفاع النص لعلامات المراجعة'
    },

    measurementColor: {
      ...enMain.verticalToolbar.measurementColor,
      text: 'اللون',
      description: 'تحديد لون القياس المحدد أو القياسات الجديدة'
    },

    measurementFontSize: {
      ...enMain.verticalToolbar.measurementFontSize,
      text: 'ارتفاع النص',
      description: 'فتح إعدادات ارتفاع النص للقياس المحدد أو القياسات الجديدة'
    },

    showMarkup: {
      ...enMain.verticalToolbar.showMarkup,
      text: 'إظهار',
      description: 'إظهار علامات المراجعة'
    },

    hideMarkup: {
      ...enMain.verticalToolbar.hideMarkup,
      text: 'إخفاء',
      description: 'إخفاء علامات المراجعة'
    },

    showMeasurements: {
      ...enMain.verticalToolbar.showMeasurements,
      text: 'إظهار',
      description: 'إظهار القياسات'
    },

    hideMeasurements: {
      ...enMain.verticalToolbar.hideMeasurements,
      text: 'إخفاء',
      description: 'إخفاء القياسات'
    },

    clearMarkups: {
      ...enMain.verticalToolbar.clearMarkups,
      text: 'مسح',
      description: 'حذف جميع علامات المراجعة من المخطط الحالي'
    },

    select: {
      ...enMain.verticalToolbar.select,
      text: 'تحديد',
      description: 'تحديد العناصر'
    },

    switchBg: {
      ...enMain.verticalToolbar.switchBg,
      text: 'تبديل',
      description: 'التبديل بين خلفية الرسم السوداء والبيضاء'
    },

    zoomToExtent: {
      ...enMain.verticalToolbar.zoomToExtent,
      text: 'ملاءمة الرسم',
      description: 'إظهار كامل حدود جميع عناصر الرسم'
    },

    zoomToBox: {
      ...enMain.verticalToolbar.zoomToBox,
      text: 'تكبير نافذة',
      description: 'تكبير منطقة محددة بواسطة نافذة مستطيلة'
    }
  },

  statusBar: {
    ...enMain.statusBar,

    setting: {
      ...enMain.statusBar.setting,
      tooltip: 'إعدادات العرض',
      commandLine: 'سطر الأوامر',
      coordinate: 'الإحداثيات',
      entityInfo: 'معلومات العنصر',
      languageSelector: 'اختيار اللغة',
      ribbon: 'الشريط',
      toolbar: 'شريط الأدوات',
      stats: 'الإحصائيات'
    },

    osnap: {
      ...enMain.statusBar.osnap,
      tooltip: 'التقاط الكائنات',
      endpoint: 'نقطة النهاية',
      midpoint: 'نقطة المنتصف',
      center: 'المركز',
      node: 'عقدة',
      quadrant: 'ربع الدائرة',
      intersection: 'تقاطع',
      insertion: 'إدراج',
      nearest: 'الأقرب'
    },

    pointStyle: {
      ...enMain.statusBar.pointStyle,
      tooltip: 'تعديل نمط النقطة'
    },

    fullScreen: {
      ...enMain.statusBar.fullScreen,
      on: 'إيقاف وضع ملء الشاشة',
      off: 'تشغيل وضع ملء الشاشة'
    },

    dynamicInput: {
      ...enMain.statusBar.dynamicInput,
      on: 'إيقاف الإدخال الديناميكي',
      off: 'تشغيل الإدخال الديناميكي'
    },

    lineWidth: {
      ...enMain.statusBar.lineWidth,
      on: 'إخفاء سماكات الخطوط',
      off: 'إظهار سماكات الخطوط'
    },

    orthoMode: {
      ...enMain.statusBar.orthoMode,
      on: 'إيقاف الوضع المتعامد',
      off: 'تشغيل الوضع المتعامد'
    },

    polarTracking: {
      ...enMain.statusBar.polarTracking,
      on: 'إيقاف التتبع القطبي',
      off: 'تشغيل التتبع القطبي'
    },

    theme: {
      ...enMain.statusBar.theme,
      dark: 'التبديل إلى الوضع الفاتح',
      light: 'التبديل إلى الوضع الداكن'
    },

    warning: {
      ...enMain.statusBar.warning,
      font: 'لم يتم العثور على الخطوط التالية!'
    },

    notification: {
      ...enMain.statusBar.notification,
      tooltip: 'عرض الإشعارات'
    },

    export: {
      ...enMain.statusBar.export,
      tooltip: 'تصدير الصورة بصيغة PNG'
    },

    moreLayouts: 'المزيد من المخططات'
  },
  toolPalette: {
    ...enMain.toolPalette,

    entityProperties: {
      ...enMain.toolPalette.entityProperties,

      tab: 'الخصائص',
      title: 'خصائص العنصر',

      propertyPanel: {
        ...enMain.toolPalette.entityProperties.propertyPanel,

        noEntitySelected: 'لم يتم تحديد أي عنصر!',
        multipleEntitySelected: 'تم تحديد {count} عنصر',
        propValCopied: 'تم نسخ قيمة الخاصية',
        failedToCopyPropVal: 'فشل نسخ قيمة الخاصية!'
      }
    },

    layerManager: {
      ...enMain.toolPalette.layerManager,

      tab: 'الطبقات',
      title: 'مدير الطبقات',

      currentLayerLabel: 'الطبقة الحالية: {name}',
      searchPlaceholder: 'البحث في الطبقات',

      filters: 'عوامل التصفية',
      collapseFilters: 'طي عوامل التصفية',
      expandFilters: 'توسيع عوامل التصفية',

      filterAll: 'الكل',
      filterAllUsed: 'جميع الطبقات المستخدمة',

      toolbar: {
        ...enMain.toolPalette.layerManager.toolbar,

        showFilters: 'عوامل تصفية الطبقات',
        newFilter: 'عامل تصفية جديد',
        newFilterGroup: 'مجموعة تصفية جديدة',
        newLayer: 'طبقة جديدة',
        deleteLayer: 'حذف الطبقة',
        setCurrent: 'تعيين كحالية'
      },

      prompts: {
        ...enMain.toolPalette.layerManager.prompts,

        newFilterTitle: 'عامل تصفية جديد',
        newFilterName: 'أدخل اسم عامل التصفية',

        newFilterGroupTitle: 'مجموعة تصفية جديدة',
        newFilterGroupName: 'أدخل اسم مجموعة التصفية',

        newLayerTitle: 'طبقة جديدة',
        newLayerName: 'أدخل اسم الطبقة',

        confirm: 'موافق',
        cancel: 'إلغاء'
      },

      messages: {
        ...enMain.toolPalette.layerManager.messages,

        filterCreated: 'تم إنشاء عامل التصفية "{name}"',
        filterExists: 'يوجد عامل تصفية باسم "{name}" بالفعل',
        filterCreateFailed: 'فشل إنشاء عامل التصفية',

        layerCreated: 'تم إنشاء الطبقة "{name}"',
        layerExists: 'توجد طبقة باسم "{name}" بالفعل',
        layerCreateFailed: 'فشل إنشاء الطبقة',

        layerDeleted: 'تم حذف الطبقة "{name}"',
        layerDeleteFailed: 'فشل حذف الطبقة "{name}"',

        cannotDeleteLayer0: 'لا يمكن حذف الطبقة "0"',
        cannotDeleteCurrent: 'لا يمكن حذف الطبقة الحالية',

        selectLayerFirst: 'حدد طبقة أولًا',

        setCurrentSuccess: 'تم تعيين الطبقة الحالية إلى "{name}"',
        setCurrentFailed: 'فشل تعيين الطبقة الحالية'
      },

      layerList: {
        ...enMain.toolPalette.layerManager.layerList,

        name: 'الاسم',
        on: 'تشغيل',
        freeze: 'تجميد',
        lock: 'قفل',
        plot: 'طباعة',

        color: 'اللون',
        linetype: 'نوع الخط',
        lineweight: 'سُمك الخط',
        transparency: 'الشفافية',

        description: 'الوصف',

        currentLayer: 'الطبقة الحالية',
        newLayerPlaceholder: 'اسم الطبقة',

        zoomToLayer: 'تم التكبير إلى الطبقة "{layer}"',
        lineWeightDefault: 'افتراضي'
      }
    },

    countList: {
      ...enMain.toolPalette.countList,

      tab: 'العد',
      title: 'العد',

      searchPlaceholder: 'البحث باسم الكتلة',

      countInArea: 'العد داخل منطقة',
      areaSet: 'تم تحديث منطقة العد',
      areaCleared: 'يتم العد في مساحة النموذج بالكامل',

      blockName: 'الكتلة',
      count: 'العدد',

      empty: 'لم يتم العثور على كتل ظاهرة',

      prompt: {
        ...enMain.toolPalette.countList.prompt,

        firstCorner:
          'حدد الركن الأول لمنطقة العد أو [الرسم بالكامل]: ',

        secondCorner:
          'حدد الركن المقابل: '
      }
    },

    designReview: {
      ...enMain.toolPalette.designReview,

      tab: 'مراجعة',
      title: 'المراجعة',

      searchPlaceholder: 'البحث في علامات المراجعة',
      empty: 'لا توجد علامات مراجعة حتى الآن',

      type: 'النوع',
      status: 'الحالة',
      author: 'المؤلف',

      summary: 'الملخص',
      details: 'التفاصيل',
      closeDetails: 'إغلاق التفاصيل',

      label: 'التسمية',
      comment: 'التعليق',

      zoomTo: 'تكبير إلى',
      delete: 'حذف',
      clear: 'مسح الكل',

      statusValues: {
        ...enMain.toolPalette.designReview.statusValues,

        open: 'مفتوح',
        question: 'سؤال',
        answered: 'تمت الإجابة',
        closed: 'مغلق'
      }
    },

    measurements: {
      ...enMain.toolPalette.measurements,

      tab: 'القياس',
      title: 'القياسات',

      empty: 'لا توجد قياسات حتى الآن',
      type: 'النوع',
      value: 'القيمة',
      filterAll: 'الكل',
      delete: 'حذف',
      clear: 'مسح الكل',

      typeValues: {
        ...enMain.toolPalette.measurements.typeValues,
        distance: 'مسافة',
        angle: 'زاوية',
        area: 'مساحة',
        arc: 'قوس',
        point: 'XY'
      }
    },

    missingResources: {
      ...enMain.toolPalette.missingResources,

      tab: 'الموارد',
      title: 'الموارد المفقودة / الخارجية',

      fontTab: 'الخطوط',
      imageTab: 'الصور',
      xrefTab: 'المراجع الخارجية',

      attach: 'إرفاق',
      attachDwg: 'إرفاق DWG/DXF...',
      attachImage: 'إرفاق صورة...',

      attachImageFailed:
        'فشل إرفاق الصورة "{name}"',

      fileReferences: 'مراجع الملفات',

      details: 'التفاصيل',
      foundAt: 'تم العثور عليه في',

      selectReference:
        'حدد مرجعًا لعرض التفاصيل',

      expandDetails: 'توسيع التفاصيل',
      collapseDetails: 'طي التفاصيل',

      apply: 'تطبيق',
      applyDone: 'تم تطبيق الاستبدالات',

      emptyFonts: 'لا توجد خطوط مفقودة',
      emptyImages: 'لا توجد صور مفقودة',

      matchFontType:
        'مطابقة نوع الخط (SHX / Mesh)',

      missedFont: 'الخط المفقود',
      replacedFont: 'الخط البديل',

      selectFont: 'حدد الخط البديل',
      selectLocalFont: 'حدد ملف خط محلي',

      file: 'الملف',
      replace: 'استبدال',

      name: 'الاسم',
      path: 'المسار المحفوظ',

      type: 'النوع',

      typeAttach: 'إرفاق',
      typeOverlay: 'تراكب',
      typeImage: 'صورة',

      status: 'الحالة',
      statusMissing: 'مفقود',
      statusLoaded: 'تم التحميل',

      actions: 'الإجراءات',
      visible: 'مرئي',

      browse: 'استعراض…',
      fromUrl: 'رابط URL…',

      unload: 'إلغاء التحميل',
      load: 'تحميل',

      empty:
        'لا توجد مراجع خارجية أو صور في هذا الرسم',

      urlPrompt:
        'أدخل رابط URL لملف DWG أو DXF',

      urlRequired:
        'يرجى إدخال رابط URL',

      loadFailed:
        'فشل تحميل المرجع "{name}"'
    },
    memoryProfile: {
      ...enMain.toolPalette.memoryProfile,

      tab: 'الذاكرة',
      title: 'ملف تعريف الذاكرة',

      refresh: 'تحديث',
      collecting: 'جارٍ تحليل الذاكرة ...',

      showPie: 'إظهار مخطط الملخص',
      hidePie: 'إخفاء مخطط الملخص',

      collectedAt: 'تم جمع البيانات في {time}',

      heapUsed: 'ذاكرة JS ‏{used} / {total}',

      estimateNote:
        'أحجام الهندسة مأخوذة من byteLength للمخازن المؤقتة. الفئات الأخرى تقديرية.',

      estimated: 'تقديري',

      pieTotal: 'المحتسب',
      pieAriaLabel: 'توزيع استخدام الذاكرة حسب الفئة',

      empty: 'لا توجد بيانات',

      missedFonts: 'الخطوط المفقودة',

      fontMemory: 'ذاكرة الخطوط / MText',

      fontMemorySummary:
        'الذاكرة {live} (الرئيسية {main} · العمال {workers})',

      fontStorage:
        'تخزين IndexedDB (ليس ذاكرة تشغيل)',

      fontStorageSummary:
        '{count} خط مخزن مؤقتًا · {size}',

      materialPoint: 'نقاط',
      materialLine: 'خطوط',
      materialFill: 'تعبئة',
      materialTotal: 'الإجمالي',

      dataModelCounts:
        '{entities} عنصر · {objects} كائن · {total}',

      dataModelCategories: 'حسب الفئة',
      dataModelEntityTypes: 'حسب نوع العنصر',

      categories: {
        ...enMain.toolPalette.memoryProfile.categories,

        heap: 'ذاكرة JavaScript',
        geometry: 'الهندسة',
        mapping: 'الربط',
        spatial: 'الفهرس المكاني',
        dataModel: 'نموذج البيانات',
        materials: 'المواد',
        fonts: 'الخطوط'
      },

      tabs: {
        ...enMain.toolPalette.memoryProfile.tabs,

        geometry: 'الهندسة',
        spatial: 'مكاني',
        dataModel: 'نموذج البيانات',
        materials: 'المواد',
        fonts: 'الخطوط'
      },

      columns: {
        ...enMain.toolPalette.memoryProfile.columns,

        layout: 'المخطط',
        layer: 'الطبقة',
        geometry: 'الهندسة',
        mapping: 'الربط',
        entities: 'العناصر',
        rootItems: 'الجذر',
        childItems: 'العناصر الفرعية',
        estimated: 'الحجم التقديري',
        type: 'النوع',
        count: 'العدد',
        category: 'الفئة',
        font: 'الخط'
      }
    },

    openFileProfile: {
      ...enMain.toolPalette.openFileProfile,

      tab: 'أداء الفتح',
      title: 'أداء فتح الرسم',

      refresh: 'تحديث',
      copy: 'نسخ',

      copied: 'تم نسخ بيانات الأداء',
      copyFailed: 'فشل نسخ بيانات الأداء',

      collectedAt: 'تم جمع البيانات في {time}',

      hint:
        'يتم تسجيل البيانات تلقائيًا عند آخر فتح للرسم. استخدم OPENPROF=1 لتسجيلها أيضًا في وحدة التحكم.',

      noData:
        'لا توجد بيانات أداء للفتح حتى الآن. افتح رسمًا أولًا ثم شغّل OPENPERF.',

      empty: 'لا توجد بيانات',

      timing: 'الزمن الفعلي',
      progressive: 'الفتح التدريجي',

      progressiveMode: 'الوضع',
      progressiveOn: 'تشغيل',
      progressiveOff: 'إيقاف',

      midOpenPaints: 'عمليات الرسم أثناء الفتح',
      yields: 'مرات إتاحة التنفيذ',

      cache: 'ذاكرة تخزين عرض INSERT',
      slowBlocks: 'أبطأ عمليات إنشاء قوالب الكتل',

      total: 'إجمالي الفتح',

      read: 'قراءة قاعدة البيانات',
      parse: 'تحليل الملف',
      entity: 'معالجة العناصر',
      convert: 'تحويل المشهد',

      cacheHits: 'إصابات الذاكرة المؤقتة',
      cacheMisses: 'إخفاقات الذاكرة المؤقتة',
      cacheBuild: 'زمن البناء عند الإخفاق',
      cacheCompact: 'زمن الضغط عند الإخفاق',
      cacheHitPath: 'مسار الإصابة',

      columns: {
        ...enMain.toolPalette.openFileProfile.columns,

        stage: 'المرحلة',
        duration: 'المدة',
        share: 'النسبة',
        metric: 'المقياس',
        value: 'القيمة',
        block: 'الكتلة',
        build: 'البناء',
        compact: 'الضغط'
      }
    },

    blocks: {
      ...enMain.toolPalette.blocks,

      tab: 'الكتل',
      title: 'الكتل',

      tabCurrentDrawing: 'الرسم الحالي',
      tabRecent: 'الأخيرة',
      tabFavorites: 'المفضلة',
      tabLibraries: 'المكتبات',

      sectionCurrentDrawing: 'كتل الرسم الحالي',
      sectionRecent: 'الكتل الأخيرة',
      sectionFavorites: 'الكتل المفضلة',
      sectionLibraries: 'مكتبات الكتل',

      filterPlaceholder: 'تصفية...',

      empty: 'لا توجد كتل متاحة',
      emptyRecent: 'لا توجد كتل تم إدراجها مؤخرًا',
      emptyFavorites: 'لا توجد كتل مفضلة',
      emptyLibraries: 'لم يتم إعداد أي مكتبات',

      toggleFavorite: 'إضافة أو إزالة من المفضلة',

      options: 'الخيارات',

      insertionPoint: 'نقطة الإدراج',
      scale: 'المقياس',
      rotation: 'الدوران',
      angle: 'الزاوية',

      autoPlacement: 'الوضع التلقائي',
      repeatPlacement: 'تكرار الإدراج',

      explode: 'تفكيك'
    }
},

  colorDropdown: {
    ...enMain.colorDropdown,
    custom: 'مخصص'
  },

  lineTypeSelect: {
    ...enMain.lineTypeSelect,
    placeholder: 'نوع الخط'
  },

  colorIndexPicker: {
    ...enMain.colorIndexPicker,

    color: 'اللون: ',
    colorIndex: 'فهرس اللون: ',

    inputPlaceholder:
      '0-256, BYLAYER, BYBLOCK',

    rgb: 'RGB: '
  },

  entityInfo: {
    ...enMain.entityInfo,

    color: 'اللون',
    layer: 'الطبقة',
    lineType: 'نوع الخط'
  },

  ribbonProperty: {
    ...enMain.ribbonProperty,

    color: 'اللون',
    lineType: 'نوع الخط',
    lineWeight: 'سُمك الخط',
    layer: 'الطبقة'
  },

  layerSelect: {
    ...enMain.layerSelect,

    searchPlaceholder: 'البحث باسم الطبقة',

    noLayerAvailable: 'لا توجد طبقات متاحة',
    noMatchedLayer: 'لا توجد طبقات مطابقة',

    tooltip: {
      ...enMain.layerSelect.tooltip,

      layer: 'الطبقة',
      visibility: 'الرؤية',
      freeze: 'تجميد',
      lock: 'قفل',
      lineType: 'نوع الخط',
      color: 'اللون',

      visible: 'مرئي',
      hidden: 'مخفي',

      frozen: 'مجمد',
      thawed: 'غير مجمد',

      locked: 'مقفل',
      unlocked: 'غير مقفل'
    }
  },

  message: {
    ...enMain.message,

    loadingFonts:
      'جارٍ تحميل الخطوط ...',

    loadingDwgConverter:
      'جارٍ تحميل محول DWG ...',

    fontsNotFound:
      'تعذر العثور على الخطوط {fonts} في مستودع الخطوط!',

    fontsNotLoaded:
      'تعذر تحميل الخطوط {fonts}!',

    fontMissedInDrawing:
      'الخط "{font}" مطلوب بواسطة {count} عنصر نصي ولكنه غير متاح. سيتم العرض باستخدام "{replacementFont}".',

    fontMissedReplacement:
      '"{font}" (يتم العرض باستخدام "{replacement}")',

    fontCached:
      'تم تخزين الخط "{font}" مؤقتًا بنجاح.',

    fontCacheFailed:
      'فشل تخزين الخط "{fileName}" مؤقتًا.',

    failedToGetAvaiableFonts:
      'فشل الحصول على الخطوط المتاحة من "{url}"!',

    failedToOpenFile:
      'فشل فتح الملف "{fileName}"!',

    failedToOpenFileWorkerOom:
      'فشل فتح "{fileName}". الرسم كبير جدًا بالنسبة للذاكرة المتاحة.',

    failedToOpenFileWorkerTimeout:
      'فشل فتح "{fileName}". انتهت مهلة العملية أثناء تحليل الرسم.',

    failedToOpenFileFontLoadFailed:
      'فشل فتح "{fileName}". تعذر تحميل الخطوط المطلوبة.',

    failedToOpenFileLicenseExpired:
      'فشل فتح "{fileName}". انتهت صلاحية ترخيص محول DWG.',

    failedToOpenFileLicenseInvalid:
      'فشل فتح "{fileName}". ترخيص محول DWG مفقود أو غير صالح.',

    fetchingDrawingFile:
      'جارٍ جلب ملف الرسم ...',

    unknownEntities:
      'يحتوي هذا الرسم على {count} عنصر غير معروف أو غير مدعوم. لن يتم عرض هذه العناصر.'
  },

  notification: {
    ...enMain.notification,

    center: {
      ...enMain.notification.center,

      title: 'الإشعارات',
      clearAll: 'مسح الكل',
      noNotifications: 'لا توجد إشعارات'
    },

    time: {
      ...enMain.notification.time,

      justNow: 'الآن',
      minutesAgo: 'منذ {count} دقيقة',
      hoursAgo: 'منذ {count} ساعة',
      daysAgo: 'منذ {count} يوم'
    },

    title: {
      ...enMain.notification.title,

      failedToOpenFile: 'فشل فتح الملف',
      failedToOpenFileWorkerOom: 'الرسم كبير جدًا',
      failedToOpenFileWorkerTimeout: 'انتهت مهلة فتح الرسم',
      failedToOpenFileFontLoadFailed: 'فشل تحميل الخطوط',
      failedToOpenFileLicenseExpired: 'انتهت صلاحية الترخيص',
      failedToOpenFileLicenseInvalid: 'ترخيص غير صالح',

      fontNotFound: 'الخط غير موجود',
      fontNotLoaded: 'لم يتم تحميل الخط',

      parsingWarning: 'مشكلات أثناء تحليل الرسم'
    }
  }

}