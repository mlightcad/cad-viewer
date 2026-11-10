export default {
  arc: {
    startPointOrCenter: 'حدد نقطة بداية القوس أو',
    secondPointOrOptions: 'حدد النقطة الثانية للقوس أو',
    secondPoint: 'حدد النقطة الثانية للقوس',
    startPoint: 'حدد نقطة بداية القوس',
    centerPoint: 'حدد نقطة مركز القوس',
    endPoint: 'حدد نقطة نهاية القوس',
    endPointOrOptions: 'حدد نقطة نهاية القوس أو',
    centerPointOrOptions: 'حدد نقطة مركز القوس',
    includedAngle: 'حدد الزاوية المحصورة',
    chordLength: 'حدد طول الوتر',
    tangentDirection: 'حدد اتجاه المماس عند نقطة بداية القوس',
    radius: 'حدد نصف قطر القوس',
    keywords: {
      center: {
        display: 'المركز(C)',
        local: 'المركز',
        global: 'Center'
      },
      end: {
        display: 'النهاية(E)',
        local: 'النهاية',
        global: 'End'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      },
      chordLength: {
        display: 'طول الوتر(L)',
        local: 'طول الوتر',
        global: 'ChordLength'
      },
      direction: {
        display: 'الاتجاه(D)',
        local: 'الاتجاه',
        global: 'Direction'
      },
      radius: {
        display: 'نصف القطر(R)',
        local: 'نصف القطر',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'قوس الثلاث نقاط غير صالح: النقاط على استقامة واحدة أو لا يمكنها تعريف قوس.',
      center:
        'إدخال المركز غير صالح: يجب أن تقع نقطتا البداية والنهاية على الدائرة نفسها.',
      angle:
        'الزاوية غير صالحة: يجب أن تكون الزاوية المحصورة أكبر من 0 وأقل من 360 درجة.',
      chordLength:
        'طول الوتر غير صالح: القيمة خارج النطاق المسموح به لنصف القطر الحالي.',
      direction:
        'الاتجاه غير صالح: لا يمكن إنشاء القوس باستخدام اتجاه المماس المحدد.',
      radius:
        'نصف القطر غير صالح: لا يمكن لنصف القطر المحدد توصيل نقطتي البداية والنهاية.'
    }
  },
  circle: {
    center: 'حدد مركز الدائرة',
    centerOrOptions: 'حدد نقطة مركز الدائرة أو',
    radius: 'حدد نصف قطر الدائرة',
    radiusOrDiameter: 'حدد نصف قطر الدائرة أو',
    diameter: 'حدد قطر الدائرة',
    twoPointFirst: 'حدد نقطة النهاية الأولى لقطر الدائرة',
    twoPointSecond: 'حدد نقطة النهاية الثانية لقطر الدائرة',
    threePointFirst: 'حدد النقطة الأولى على الدائرة',
    threePointSecond: 'حدد النقطة الثانية على الدائرة',
    threePointThird: 'حدد النقطة الثالثة على الدائرة',
    keywords: {
      threeP: {
        display: '3 نقاط(3P)',
        local: '3 نقاط',
        global: '3P'
      },
      twoP: {
        display: 'نقطتان(2P)',
        local: 'نقطتان',
        global: '2P'
      },
      diameter: {
        display: 'القطر(D)',
        local: 'القطر',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'حدد نقطة الأساس أو',
    displacementOrArray: 'حدد الإزاحة أو',
    secondPointOrArray: 'حدد النقطة الثانية أو',
    modePrompt: 'أدخل خيار وضع النسخ',
    arrayItemCount: 'أدخل عدد العناصر في المصفوفة بما في ذلك العنصر الأصلي',
    arraySecondPointOrFit: 'حدد النقطة الثانية أو',
    arrayFitSecondPoint: 'حدد النقطة الثانية',
    keywords: {
      displacement: {
        display: 'إزاحة(D)',
        local: 'إزاحة',
        global: 'Displacement'
      },
      mode: {
        display: 'وضع(O)',
        local: 'وضع',
        global: 'Mode'
      },
      multiple: {
        display: 'متعدد(M)',
        local: 'متعدد',
        global: 'Multiple'
      },
      single: {
        display: 'مفرد(S)',
        local: 'مفرد',
        global: 'Single'
      },
      array: {
        display: 'مصفوفة(A)',
        local: 'مصفوفة',
        global: 'Array'
      },
      fit: {
        display: 'ملاءمة(F)',
        local: 'ملاءمة',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: 'حدد نقطة أصل خط الامتداد الأول',
    xLine2Point: 'حدد نقطة أصل خط الامتداد الثاني',
    dimLinePoint: 'حدد موقع خط البُعد',
    selectObject: 'حدد الكائن المراد قياس أبعاده',
    rejectObject: 'لا يمكن قياس أبعاد الكائن باستخدام DIMLINEAR.',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    rotationAngle: 'حدد زاوية خط البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      },
      horizontal: {
        display: 'أفقي(H)',
        local: 'أفقي',
        global: 'Horizontal'
      },
      vertical: {
        display: 'رأسي(V)',
        local: 'رأسي',
        global: 'Vertical'
      },
      rotated: {
        display: 'مدور(R)',
        local: 'مدور',
        global: 'Rotated'
      }
    }
  },
  dimaligned: {
    xLine1Point: 'حدد نقطة أصل خط الامتداد الأول أو <تحديد كائن>',
    xLine2Point: 'حدد نقطة أصل خط الامتداد الثاني',
    dimLinePoint: 'حدد موقع خط البُعد',
    selectObject: 'حدد الكائن المراد قياس أبعاده',
    rejectObject: 'لا يمكن قياس أبعاد الكائن باستخدام DIMALIGNED.',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      }
    }
  },
  dimradius: {
    selectObject: 'حدد قوسًا أو دائرة',
    rejectObject: 'يجب تحديد قوس أو دائرة.',
    dimLinePoint: 'حدد موقع خط البُعد',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      }
    }
  },
  dimdiameter: {
    selectObject: 'حدد قوسًا أو دائرة',
    rejectObject: 'يجب تحديد قوس أو دائرة.',
    dimLinePoint: 'حدد موقع خط البُعد',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      }
    }
  },
  dimangular: {
    vertexOrSelect: 'حدد رأس الزاوية أو <تحديد خط>',
    xLine1Point: 'حدد نقطة النهاية الأولى للزاوية',
    xLine2Point: 'حدد نقطة النهاية الثانية للزاوية',
    arcPoint: 'حدد موقع قوس البُعد',
    selectFirstLine: 'حدد الخط الأول',
    selectSecondLine: 'حدد الخط الثاني',
    rejectObject: 'يجب تحديد خط.',
    linesParallel: 'الخطان متوازيان — لا يوجد تقاطع لتكوين زاوية.',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      }
    }
  },
  dimarc: {
    selectArc: 'حدد قوسًا',
    rejectObject: 'يجب تحديد قوس.',
    arcPoint: 'حدد موقع بُعد طول القوس',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      }
    }
  },
  dimordinate: {
    featurePoint: 'حدد موقع المعلم',
    leaderEndpoint: 'حدد نقطة نهاية خط الإشارة',
    dimensionText: 'أدخل نص البُعد',
    textAngle: 'حدد زاوية نص البُعد',
    keywords: {
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      },
      xdatum: {
        display: 'مرجع X(X)',
        local: 'مرجع X',
        global: 'Xdatum'
      },
      ydatum: {
        display: 'مرجع Y(Y)',
        local: 'مرجع Y',
        global: 'Ydatum'
      }
    }
  },
  dimcontinue: {
    nextPoint: 'حدد نقطة أصل خط الامتداد الثاني أو',
    selectDimension: 'حدد البُعد المراد متابعته',
    rejectObject: 'يجب تحديد بُعد خطي أو زاوي.',
    keywords: {
      select: {
        display: 'تحديد(S)',
        local: 'تحديد',
        global: 'Select'
      }
    }
  },
  dimbaseline: {
    nextPoint: 'حدد نقطة أصل خط الامتداد الثاني أو',
    selectDimension: 'حدد البُعد الأساسي',
    rejectObject: 'يجب تحديد بُعد خطي أو زاوي.',
    keywords: {
      select: {
        display: 'تحديد(S)',
        local: 'تحديد',
        global: 'Select'
      }
    }
  },
  ellipse: {
    axisEndpointOrOptions: 'حدد نقطة نهاية محور القطع الناقص أو',
    arcAxisEndpointOrCenter: 'حدد نقطة نهاية محور القوس البيضاوي أو',
    center: 'حدد مركز القطع الناقص',
    firstAxisEndpoint: 'حدد نقطة نهاية المحور الأولى',
    secondAxisEndpoint: 'حدد نقطة النهاية الأخرى للمحور',
    otherAxisOrRotation: 'حدد المسافة إلى المحور الآخر أو',
    rotationAngle: 'حدد زاوية الدوران حول المحور الأكبر',
    arcStartAngle: 'حدد زاوية بداية القوس البيضاوي',
    arcEndAngle: 'حدد زاوية نهاية القوس البيضاوي',
    keywords: {
      arc: {
        display: 'قوس(A)',
        local: 'قوس',
        global: 'Arc'
      },
      center: {
        display: 'المركز(C)',
        local: 'المركز',
        global: 'Center'
      },
      rotation: {
        display: 'دوران(R)',
        local: 'دوران',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'المحور غير صالح: يجب أن يكون طول المحور أكبر من 0.',
      otherAxis: 'المحور الآخر غير صالح: يجب أن تكون المسافة أكبر من 0.',
      rotation: 'الدوران غير صالح: يجب أن يكون المحور الأصغر الناتج أكبر من 0.'
    }
  },
  hatch: {
    prompt: 'حدد عنصر حدود أو',
    pickPoint: 'حدد نقطة داخلية (أو اضغط Enter للإنهاء)',
    select: 'حدد العناصر المطلوب تهشيرها',
    patternName: 'أدخل اسم نمط التهشير',
    scale: 'حدد مقياس نمط التهشير',
    angle: 'حدد زاوية نمط التهشير',
    style: 'أدخل نمط التهشير',
    associative: 'حدد حالة الترابط',
    invalidBoundary: 'العناصر المحددة لا تكوّن حدودًا مغلقة.',
    keywords: {
      pick: {
        display: 'اختيار نقاط(P)',
        local: 'اختيار نقاط',
        global: 'PickPoints'
      },
      select: {
        display: 'تحديد كائنات(S)',
        local: 'تحديد كائنات',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'إلغاء(C)',
        local: 'إلغاء',
        global: 'Cancel'
      },
      pattern: {
        display: 'نمط(P)',
        local: 'نمط',
        global: 'Pattern'
      },
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      },
      style: {
        display: 'أسلوب(T)',
        local: 'أسلوب',
        global: 'HatchStyle'
      },
      associative: {
        display: 'ترابطي(AS)',
        local: 'ترابطي',
        global: 'AssociativeMode'
      },
      normal: {
        display: 'عادي(N)',
        local: 'عادي',
        global: 'Normal'
      },
      outer: {
        display: 'خارجي(O)',
        local: 'خارجي',
        global: 'Outer'
      },
      ignore: {
        display: 'تجاهل(I)',
        local: 'تجاهل',
        global: 'Ignore'
      },
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: 'تم إخفاء العناصر',
    restored: 'تمت استعادة العناصر',
    nothingToRestore: 'لا توجد عناصر مخفية لاستعادتها'
  },
  entout: {
    longSidePrompt: 'أدخل حجم الضلع الأطول للمعاينة بالبكسل',
    exported: 'تم تصدير معاينات العناصر',
    skipped: 'تم تخطي بعض العناصر',
    failed: {
      'no-preview-root': 'تعذر إنشاء هندسة المعاينة للعناصر المحددة',
      'no-bounds': 'تعذر حساب حدود المعاينة للعناصر المحددة',
      'capture-failed': 'تعذر عرض صورة معاينة العناصر',
      'download-failed': 'تم إنشاء المعاينة ولكن فشل تنزيل ملف PNG'
    }
  },
  layer: {
    main: 'أدخل خيارًا',
    listSummary: 'تمت طباعة قائمة الطبقات في وحدة تحكم المتصفح',
    emptyInput: 'لم يتم إدخال اسم طبقة.',
    newPrompt: 'أدخل اسم الطبقة أو الطبقات الجديدة',
    makePrompt: 'أدخل اسم الطبقة المطلوب إنشاؤها وجعلها حالية',
    setPrompt: 'أدخل اسم الطبقة المطلوب جعلها حالية',
    onPrompt: 'أدخل أسماء الطبقات المطلوب تشغيلها',
    offPrompt: 'أدخل أسماء الطبقات المطلوب إيقافها',
    freezePrompt: 'أدخل أسماء الطبقات المطلوب تجميدها',
    thawPrompt: 'أدخل أسماء الطبقات المطلوب إلغاء تجميدها',
    lockPrompt: 'أدخل أسماء الطبقات المطلوب قفلها',
    unlockPrompt: 'أدخل أسماء الطبقات المطلوب إلغاء قفلها',
    colorLayerPrompt: 'أدخل أسماء الطبقات المطلوب تغيير لونها',
    colorValuePrompt:
      'أدخل اللون (ACI من 1 إلى 255، أو RGB مثل 255,0,0، أو اسم لون CSS)',
    invalidColor: 'قيمة اللون غير صالحة.',
    descriptionLayerPrompt: 'أدخل اسم الطبقة المطلوب تعديل وصفها',
    descriptionValuePrompt: 'أدخل وصف الطبقة الجديد',
    created: 'عدد الطبقات التي تم إنشاؤها',
    alreadyExists: 'الطبقة موجودة بالفعل',
    notFound: 'الطبقة غير موجودة',
    cannotChangeCurrent: 'لا يمكن إيقاف الطبقة الحالية أو تجميدها.',
    keywords: {
      list: {
        display: 'قائمة(?)',
        local: 'قائمة',
        global: '?'
      },
      make: {
        display: 'إنشاء(M)',
        local: 'إنشاء',
        global: 'Make'
      },
      set: {
        display: 'تعيين(S)',
        local: 'تعيين',
        global: 'Set'
      },
      new: {
        display: 'جديد(N)',
        local: 'جديد',
        global: 'New'
      },
      on: {
        display: 'تشغيل(ON)',
        local: 'تشغيل',
        global: 'On'
      },
      off: {
        display: 'إيقاف(OF)',
        local: 'إيقاف',
        global: 'Off'
      },
      color: {
        display: 'لون(C)',
        local: 'لون',
        global: 'Color'
      },
      freeze: {
        display: 'تجميد(F)',
        local: 'تجميد',
        global: 'Freeze'
      },
      thaw: {
        display: 'إلغاء التجميد(T)',
        local: 'إلغاء التجميد',
        global: 'Thaw'
      },
      lock: {
        display: 'قفل(L)',
        local: 'قفل',
        global: 'Lock'
      },
      unlock: {
        display: 'إلغاء القفل(U)',
        local: 'إلغاء القفل',
        global: 'Unlock'
      },
      description: {
        display: 'وصف(D)',
        local: 'وصف',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: 'جميع الطبقات قيد التشغيل بالفعل.',
    turnedOn: 'تم تشغيل الطبقات'
  },
  laycur: {
    prompt: 'حدد العناصر المطلوب نقلها إلى الطبقة الحالية',
    currentLayerNotFound: 'الطبقة الحالية غير موجودة.',
    noObjects: 'لم يتم تحديد عناصر صالحة.',
    alreadyCurrent: 'العناصر المحددة موجودة بالفعل على الطبقة الحالية.',
    changed: 'تم نقل العناصر إلى الطبقة الحالية'
  },
  layfrz: {
    prompt: 'حدد عنصرًا على الطبقة المطلوب تجميدها أو',
    invalidSelection: 'العنصر المحدد غير صالح.',
    settingsPrompt: 'أدخل إعداد LAYFRZ المطلوب تغييره',
    viewportPrompt: 'حدد سلوك التجميد داخل منفذ العرض',
    blockSelectionPrompt: 'حدد سلوك اختيار الكتل المتداخلة',
    vpfreezeFallback:
      'العارض الحالي لا يدعم تجميد الطبقات بشكل مستقل لكل منفذ عرض؛ سيتم استخدام التجميد العادي بدلًا من ذلك.',
    nestedSelectionLimited:
      'تم حفظ إعدادات اختيار الكتل المتداخلة، لكن الاختيار الحالي ما زال يعتمد طبقة العنصر ذي المستوى الأعلى.',
    layerNotFound: 'الطبقة غير موجودة',
    cannotFreezeCurrent: 'لا يمكن تجميد الطبقة الحالية.',
    alreadyFrozen: 'الطبقة مجمدة بالفعل',
    frozen: 'تم تجميد الطبقة',
    restored: 'تمت استعادة الطبقة',
    nothingToUndo: 'لا توجد عملية LAYFRZ يمكن التراجع عنها.',
    keywords: {
      settings: {
        display: 'إعدادات(S)',
        local: 'إعدادات',
        global: 'Settings'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      viewports: {
        display: 'إطارات العرض(V)',
        local: 'إطارات العرض',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'تحديد الكتلة(B)',
        local: 'تحديد الكتلة',
        global: 'BlockSelection'
      },
      freeze: {
        display: 'تجميد(F)',
        local: 'تجميد',
        global: 'Freeze'
      },
      vpfreeze: {
        display: 'تجميد إطار العرض(V)',
        local: 'تجميد إطار العرض',
        global: 'Vpfreeze'
      },
      block: {
        display: 'كتلة(B)',
        local: 'كتلة',
        global: 'Block'
      },
      entity: {
        display: 'كيان(E)',
        local: 'كيان',
        global: 'Entity'
      },
      none: {
        display: 'لا شيء(N)',
        local: 'لا شيء',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: 'حدد عناصر على الطبقة أو الطبقات المطلوب عزلها أو',
    settingsPrompt: 'أدخل إعداد الطبقات غير المعزولة',
    offModePrompt: 'حدد سلوك إيقاف الطبقات غير المعزولة',
    noLayers: 'لم يتم تحديد طبقات صالحة.',
    layerNotFound: 'الطبقة غير موجودة',
    isolated: 'تم عزل الطبقات',
    affectedLayers: 'الطبقات المتأثرة',
    vpfreezeFallback:
      'العارض الحالي لا يدعم التجميد المستقل لكل منفذ عرض؛ سيتم استخدام الإيقاف بدلًا من ذلك.',
    lockFadeFallback:
      'العارض الحالي لا يدعم إظهار الطبقات بتأثير التلاشي؛ سيتم قفل الطبقات غير المعزولة دون تلاشي.',
    keywords: {
      settings: {
        display: 'إعدادات(S)',
        local: 'إعدادات',
        global: 'Settings'
      },
      off: {
        display: 'إيقاف(O)',
        local: 'إيقاف',
        global: 'Off'
      },
      lockAndFade: {
        display: 'قفل وتعتيم(L)',
        local: 'قفل وتعتيم',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: 'تجميد إطار العرض(V)',
        local: 'تجميد إطار العرض',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: 'لا توجد حالة LAYISO سابقة لاستعادتها.',
    layerNotFound: 'الطبقة غير موجودة',
    nothingRestored: 'لم تتم استعادة أي تغييرات طبقات من LAYISO.',
    restored: 'تمت استعادة الطبقات'
  },
  laythw: {
    alreadyThawed: 'جميع الطبقات غير مجمدة بالفعل.',
    thawed: 'تم إلغاء تجميد الطبقات'
  },
  laylck: {
    prompt: 'حدد عنصرًا على الطبقة المطلوب قفلها',
    invalidSelection: 'العنصر المحدد غير صالح.',
    layerNotFound: 'الطبقة غير موجودة',
    alreadyLocked: 'الطبقة مقفلة بالفعل',
    locked: 'تم قفل الطبقة'
  },
  layulk: {
    prompt: 'حدد عنصرًا على الطبقة المطلوب إلغاء قفلها',
    invalidSelection: 'العنصر المحدد غير صالح.',
    layerNotFound: 'الطبقة غير موجودة',
    alreadyUnlocked: 'الطبقة غير مقفلة بالفعل',
    unlocked: 'تم إلغاء قفل الطبقة'
  },
  layoff: {
    prompt: 'حدد عنصرًا على الطبقة المطلوب إيقافها أو',
    invalidSelection: 'العنصر المحدد غير صالح.',
    settingsPrompt: 'أدخل إعداد LAYOFF المطلوب تغييره',
    viewportPrompt: 'حدد سلوك منفذ العرض',
    blockSelectionPrompt: 'حدد سلوك اختيار الكتل المتداخلة',
    vpfreezeFallback:
      'العارض الحالي لا يدعم إيقاف الطبقات بشكل مستقل لكل منفذ عرض؛ سيتم استخدام الإيقاف العادي بدلًا من ذلك.',
    nestedSelectionLimited:
      'تم حفظ إعدادات اختيار الكتل المتداخلة، لكن الاختيار الحالي ما زال يعتمد طبقة العنصر ذي المستوى الأعلى.',
    layerNotFound: 'الطبقة غير موجودة',
    cannotTurnOffCurrent: 'لا يمكن إيقاف الطبقة الحالية.',
    alreadyOff: 'الطبقة متوقفة بالفعل',
    turnedOff: 'تم إيقاف الطبقة',
    restored: 'تمت استعادة الطبقة',
    nothingToUndo: 'لا توجد عملية LAYOFF يمكن التراجع عنها.',
    keywords: {
      settings: {
        display: 'إعدادات(S)',
        local: 'إعدادات',
        global: 'Settings'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      viewports: {
        display: 'إطارات العرض(V)',
        local: 'إطارات العرض',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'تحديد الكتلة(B)',
        local: 'تحديد الكتلة',
        global: 'BlockSelection'
      },
      off: {
        display: 'إيقاف(O)',
        local: 'إيقاف',
        global: 'Off'
      },
      vpfreeze: {
        display: 'تجميد إطار العرض(V)',
        local: 'تجميد إطار العرض',
        global: 'Vpfreeze'
      },
      block: {
        display: 'كتلة(B)',
        local: 'كتلة',
        global: 'Block'
      },
      entity: {
        display: 'كيان(E)',
        local: 'كيان',
        global: 'Entity'
      },
      none: {
        display: 'لا شيء(N)',
        local: 'لا شيء',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: 'تمت استعادة حالة الطبقات السابقة.',
    noPreviousState: 'لا توجد حالة طبقات سابقة لاستعادتها.'
  },
  line: {
    firstPoint: 'حدد النقطة الأولى',
    firstPointOrContinue: 'حدد النقطة الأولى أو',
    nextPoint: 'حدد النقطة التالية',
    nextPointWithOptions: 'حدد النقطة التالية أو',
    keywords: {
      continue: {
        display: 'متابعة(C)',
        local: 'متابعة',
        global: 'Continue'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      close: {
        display: 'إغلاق(C)',
        local: 'إغلاق',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: 'حدد نقطة أو',
    secondPoint: 'حدد النقطة الثانية',
    throughPoint: 'حدد نقطة يمر بها الخط',
    angle: 'أدخل زاوية الخط الإنشائي',
    invalidDirection: 'اتجاه XLINE غير صالح.',
    keywords: {
      hor: {
        display: 'أفقي(H)',
        local: 'أفقي',
        global: 'Hor'
      },
      ver: {
        display: 'رأسي(V)',
        local: 'رأسي',
        global: 'Ver'
      },
      ang: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: 'حدد نقطة البداية',
    throughPoint: 'حدد نقطة يمر بها الشعاع'
  },
  mline: {
    startPointWithOptions: 'حدد نقطة البداية أو',
    nextPointWithOptions: 'حدد النقطة التالية أو',
    justificationPrompt: 'أدخل نوع المحاذاة',
    scalePrompt: 'حدد مقياس الخط المتعدد',
    stylePrompt: 'أدخل اسم نمط الخط المتعدد أو [?] لعرض القائمة',
    styleNotFound: 'نمط الخط المتعدد غير موجود',
    styleListHeader: 'أنماط الخطوط المتعددة المحملة',
    styleListEmpty: 'لا توجد أنماط خطوط متعددة محملة في الرسم الحالي.',
    keywords: {
      justification: {
        display: 'محاذاة(J)',
        local: 'محاذاة',
        global: 'Justification'
      },
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      style: {
        display: 'أسلوب(ST)',
        local: 'أسلوب',
        global: 'Style'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      close: {
        display: 'إغلاق(C)',
        local: 'إغلاق',
        global: 'Close'
      },
      top: {
        display: 'أعلى(T)',
        local: 'أعلى',
        global: 'Top'
      },
      zero: {
        display: 'صفر(Z)',
        local: 'صفر',
        global: 'Zero'
      },
      bottom: {
        display: 'أسفل(B)',
        local: 'أسفل',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: 'حدد نقطة رأس الزاوية',
    arm1: 'حدد نقطة على الضلع الأول',
    arm2: 'حدد نقطة على الضلع الثاني'
  },
  measureArc: {
    startPoint: 'حدد نقطة بداية القوس',
    throughPoint: 'حدد نقطة على القوس',
    endPoint: 'حدد نقطة نهاية القوس',
    lockedEndPoint:
      'حدد نقطة نهاية القوس (استخدم Ctrl للتبديل بين القوس الأكبر والأصغر)',
    invalidPoints: 'النقاط الثلاث على استقامة واحدة ولا يمكنها تعريف قوس.'
  },
  measureArea: {
    firstPoint: 'حدد النقطة الأولى',
    nextPoint: 'حدد النقطة التالية (أو اضغط Enter للإنهاء)'
  },
  measureDistance: {
    firstPoint: 'حدد النقطة الأولى',
    secondPoint: 'حدد النقطة الثانية'
  },
  measureContinuous: {
    firstPoint: 'حدد النقطة الأولى',
    nextPoint: 'حدد النقطة التالية (أو اضغط Enter للإنهاء)'
  },
  measurePoint: {
    point: 'حدد نقطة'
  },
  measurement: {
    import: {
      chooseFile: 'اختر ملف JSON جانبيًا يحتوي على القياسات'
    }
  },
  markup: {
    author: 'حدد اسم مؤلف المراجعة (سيتم حفظه للاستخدام لاحقًا)',
    text: {
      point: 'حدد موضع علامة النص',
      content: 'أدخل نص علامة المراجعة'
    },
    line: {
      firstPoint: 'حدد النقطة الأولى لخط المراجعة',
      secondPoint: 'حدد النقطة الثانية لخط المراجعة'
    },
    arrow: {
      firstPoint: 'حدد نقطة بداية السهم',
      secondPoint: 'حدد رأس السهم'
    },
    cloud: {
      firstCorner: 'حدد الركن الأول للسحابة',
      secondCorner: 'حدد الركن المقابل للسحابة'
    },
    rect: {
      firstCorner: 'حدد الركن الأول للمستطيل',
      secondCorner: 'حدد الركن المقابل للمستطيل'
    },
    circle: {
      center: 'حدد مركز الدائرة',
      radius: 'حدد نصف قطر الدائرة'
    },
    shape: {
      calloutOn: '[وسيلة الشرح مفعلة]',
      calloutOff: '[وسيلة الشرح معطلة]',
      calloutAnchor: 'حدد موضع نص وسيلة الشرح',
      keywords: {
        callout: {
          display: 'تعليق توضيحي(C)',
          local: 'تعليق توضيحي',
          global: 'Callout'
        },
        noCallout: {
          display: 'بدون تعليق توضيحي(N)',
          local: 'بدون تعليق توضيحي',
          global: 'NoCallout'
        }
      }
    },
    highlight: {
      firstCorner: 'حدد الركن الأول لمنطقة التمييز',
      secondCorner: 'حدد الركن المقابل لمنطقة التمييز'
    },
    callout: {
      tip: 'حدد رأس خط التوجيه، أو حدد إطار سحابة/مستطيل/دائرة بدون تعليق توضيحي',
      anchor: 'حدد موضع نص وسيلة الشرح',
      content: 'أدخل نص وسيلة الشرح'
    },
    stamp: {
      kind: 'أدخل معرّف الختم [approved/rejected/revised/for-review/custom]',
      imageUrl: 'أدخل رابط صورة الختم المخصص (اختياري)',
      caption: 'أدخل تسمية الختم (اختياري)',
      point: 'حدد نقطة إدراج الختم'
    },
    import: {
      chooseFile: 'اختر ملف JSON جانبيًا يحتوي على علامات المراجعة'
    }
  },
  move: {
    basePointOrDisplacement: 'حدد نقطة الأساس أو',
    secondPointOrDisplacement: 'حدد النقطة الثانية أو',
    displacement: 'حدد الإزاحة',
    keywords: {
      displacement: {
        display: 'إزاحة(D)',
        local: 'إزاحة',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'حدد مسافة الإزاحة',
    selectObject: 'حدد العنصر المطلوب إزاحته أو اضغط Enter للإنهاء',
    sidePoint: 'حدد نقطة في جهة الإزاحة',
    invalidDistance: 'يجب أن تكون مسافة الإزاحة أكبر من 0.',
    invalidSelection: 'لا يمكن إنشاء إزاحة للعنصر المحدد.',
    offsetFailed: 'تعذر إنشاء منحنى إزاحة في الجهة المحددة.'
  },
  leader: {
    startPoint: 'حدد نقطة بداية خط الإشارة',
    nextPoint: 'حدد النقطة التالية',
    nextPointOrOptions: 'حدد النقطة التالية أو [تعليق توضيحي/تنسيق/تراجع]',
    formatPrompt: 'أدخل خيار تنسيق خط الإشارة [منحنى/مستقيم/سهم/لا شيء]',
    annotationText: 'أدخل السطر الأول من نص التعليق التوضيحي أو <خيارات>',
    nextAnnotationLine: 'أدخل السطر التالي من نص التعليق التوضيحي',
    annotationOptions:
      'أدخل خيار التعليق التوضيحي [تفاوت/نسخ/كتلة/لا شيء/نص متعدد الأسطر]',
    selectAnnotation: 'حدد كائن تعليق توضيحي لنسخه',
    rejectAnnotation: 'لا يمكن استخدام الكائن كتعليق توضيحي لخط الإشارة.',
    toleranceUnavailable: 'مربع حوار التفاوت الهندسي غير متوفر في هذا الإصدار.',
    keywords: {
      annotation: {
        display: 'تعليق توضيحي(A)',
        local: 'تعليق توضيحي',
        global: 'Annotation'
      },
      format: {
        display: 'تنسيق(F)',
        local: 'تنسيق',
        global: 'Format'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      spline: {
        display: 'منحنى(S)',
        local: 'منحنى',
        global: 'Spline'
      },
      straight: {
        display: 'مستقيم(T)',
        local: 'مستقيم',
        global: 'STraight'
      },
      arrow: {
        display: 'سهم(A)',
        local: 'سهم',
        global: 'Arrow'
      },
      none: {
        display: 'لا شيء(N)',
        local: 'لا شيء',
        global: 'None'
      },
      tolerance: {
        display: 'تفاوت',
        local: 'تفاوت',
        global: 'Tolerance'
      },
      copy: {
        display: 'نسخ(C)',
        local: 'نسخ',
        global: 'Copy'
      },
      block: {
        display: 'كتلة(B)',
        local: 'كتلة',
        global: 'Block'
      },
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      }
    }
  },
  mleader: {
    arrowheadOrOptions:
      'حدد موقع رأس سهم خط الإشارة أو [الكتف أولاً/المحتوى أولاً/خيارات]',
    landingLocation: 'حدد موقع كتف خط الإشارة',
    landingFirstPoint: 'حدد موقع كتف خط الإشارة',
    arrowheadLocation: 'حدد موقع رأس سهم خط الإشارة',
    contentLocation: 'حدد موقع المحتوى',
    nextPoint: 'حدد النقطة التالية',
    optionsPrompt:
      'أدخل خيارًا [نوع خط الإشارة/الكتف/نوع المحتوى/الحد الأقصى للنقاط/الزاوية الأولى/الزاوية الثانية/الخروج من الخيارات]',
    leaderTypePrompt: 'حدد نوع خط الإشارة [مستقيم/منحنى/لا شيء]',
    landingPrompt: 'استخدام الكتف [نعم/لا]',
    landingLength: 'حدد مسافة الكتف',
    contentTypePrompt: 'حدد نوع المحتوى [كتلة/نص متعدد الأسطر/لا شيء]',
    maxPoints: 'أدخل الحد الأقصى لنقاط خط الإشارة',
    firstAngle: 'أدخل قيد الزاوية الأولى',
    secondAngle: 'أدخل قيد الزاوية الثانية',
    keywords: {
      landingFirst: {
        display: 'الكتف أولاً(L)',
        local: 'الكتف أولاً',
        global: 'Landing first'
      },
      contentFirst: {
        display: 'المحتوى أولاً(C)',
        local: 'المحتوى أولاً',
        global: 'Content first'
      },
      options: {
        display: 'خيارات(O)',
        local: 'خيارات',
        global: 'Options'
      },
      leaderType: {
        display: 'نوع خط الإشارة(T)',
        local: 'نوع خط الإشارة',
        global: 'Leader type'
      },
      landing: {
        display: 'الكتف(A)',
        local: 'الكتف',
        global: 'lAnding'
      },
      contentType: {
        display: 'نوع المحتوى(C)',
        local: 'نوع المحتوى',
        global: 'Content type'
      },
      maxpoints: {
        display: 'الحد الأقصى للنقاط(M)',
        local: 'الحد الأقصى للنقاط',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: 'الزاوية الأولى(F)',
        local: 'الزاوية الأولى',
        global: 'First angle'
      },
      secondAngle: {
        display: 'الزاوية الثانية(S)',
        local: 'الزاوية الثانية',
        global: 'Second angle'
      },
      exitOptions: {
        display: 'الخروج من الخيارات(X)',
        local: 'الخروج من الخيارات',
        global: 'eXit options'
      },
      straight: {
        display: 'مستقيم(S)',
        local: 'مستقيم',
        global: 'Straight'
      },
      spline: {
        display: 'منحنى(P)',
        local: 'منحنى',
        global: 'sPline'
      },
      noneLeader: {
        display: 'لا شيء(N)',
        local: 'لا شيء',
        global: 'None'
      },
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      },
      block: {
        display: 'كتلة(B)',
        local: 'كتلة',
        global: 'Block'
      },
      mtext: {
        display: 'نص متعدد الأسطر(M)',
        local: 'نص متعدد الأسطر',
        global: 'Mtext'
      },
      none: {
        display: 'لا شيء(N)',
        local: 'لا شيء',
        global: 'None'
      }
    }
  },
  mleaderedit: {
    selectMLeader: 'حدد خط إشارة متعددًا',
    rejectMLeader: 'يجب تحديد خط إشارة متعدد.',
    arrowheadOrRemove: 'حدد موقع رأس سهم خط الإشارة أو [إزالة خطوط الإشارة]',
    selectLeaderToRemove: 'حدد خط إشارة لإزالته أو اضغط Enter للإنهاء',
    cannotRemoveLast: 'لا يمكن إزالة آخر خط إشارة من خط الإشارة المتعدد هذا.',
    keywords: {
      remove: {
        display: 'إزالة خطوط الإشارة(R)',
        local: 'إزالة',
        global: 'Remove'
      }
    }
  },
  mtext: {
    point: 'حدد نقطة إدراج النص متعدد الأسطر'
  },
  bmpout: {
    boundsFirstCorner: 'حدد الركن الأول لحدود الصورة',
    boundsSecondCorner: 'حدد الركن المقابل',
    longSidePrompt: 'أدخل حجم الضلع الأطول بالبكسل'
  },
  jpgout: {
    boundsFirstCorner: 'حدد الركن الأول لحدود الصورة',
    boundsSecondCorner: 'حدد الركن المقابل',
    longSidePrompt: 'أدخل حجم الضلع الأطول بالبكسل'
  },
  pngout: {
    boundsFirstCorner: 'حدد الركن الأول لحدود الصورة',
    boundsSecondCorner: 'حدد الركن المقابل',
    longSidePrompt: 'أدخل حجم الضلع الأطول بالبكسل'
  },
  imageattach: {
    insertionPoint: 'حدد نقطة الإدراج:',
    scale: 'حدد معامل المقياس:',
    rotation: 'حدد زاوية الدوران:',
    invalidScale: 'يجب أن يكون معامل المقياس أكبر من 0.',
    decodeFailed: 'فشلت قراءة ملف الصورة المحدد.'
  },
  insert: {
    blockName: 'أدخل اسم الكتلة:',
    insertionPoint: 'حدد نقطة الإدراج:',
    scale: 'حدد معامل المقياس:',
    rotation: 'حدد زاوية الدوران:',
    invalidScale: 'يجب أن يكون معامل المقياس أكبر من 0.',
    invalidBlockName: 'اسم الكتلة غير صالح.',
    blockNotFound: 'الكتلة غير موجودة',
    xrefNotAllowed: 'لا يمكن إدراج مرجع خارجي باستخدام -INSERT.'
  },
  xattach: {
    insertionPoint: 'حدد نقطة الإدراج:',
    scale: 'حدد معامل المقياس:',
    rotation: 'حدد زاوية الدوران:',
    invalidScale: 'يجب أن يكون معامل المقياس أكبر من 0.',
    unsupportedFile: 'اختر ملف DWG أو DXF.',
    loading: 'جارٍ تحميل المرجع الخارجي...',
    loadFailed: 'فشلت قراءة ملف الرسم المحدد.'
  },
  point: {
    point: 'حدد نقطة'
  },
  polygon: {
    numberOfSides: 'أدخل عدد الأضلاع',
    centerOrEdge: 'حدد مركز المضلع أو',
    radiusOrType: 'أدخل الخيارات',
    edgeStart: 'حدد نقطة النهاية الأولى للضلع',
    edgeEnd: 'حدد نقطة النهاية الثانية للضلع',
    keywords: {
      edge: {
        display: 'حافة(E)',
        local: 'حافة',
        global: 'Edge'
      },
      inscribed: {
        display: 'داخل الدائرة(I)',
        local: 'داخل الدائرة',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'محيط بالدائرة(C)',
        local: 'محيط بالدائرة',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'عدد الأضلاع غير صالح. أدخل عددًا صحيحًا بين 3 و1024.',
      radius: 'نصف القطر غير صالح. يجب أن يكون أكبر من 0.',
      edge: 'الضلع غير صالح. يجب أن يكون طول الضلع أكبر من 0.'
    }
  },
  polyline: {
    firstPoint: 'حدد النقطة الأولى',
    nextPoint: 'حدد النقطة التالية (أو اضغط Enter للإنهاء)',
    nextPointWithOptions: 'حدد النقطة التالية أو',
    nextPointWithArcOptions: 'حدد النقطة التالية أو',
    keywords: {
      arc: {
        display: 'قوس(A)',
        local: 'قوس',
        global: 'Arc'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      close: {
        display: 'إغلاق(C)',
        local: 'إغلاق',
        global: 'Close'
      },
      line: {
        display: 'خط(L)',
        local: 'خط',
        global: 'Line'
      },
      angle: {
        display: 'زاوية(A)',
        local: 'زاوية',
        global: 'Angle'
      },
      center: {
        display: 'المركز(C)',
        local: 'المركز',
        global: 'Center'
      },
      secondPoint: {
        display: 'النقطة الثانية(P)',
        local: 'النقطة الثانية',
        global: 'SecondPoint'
      },
      radius: {
        display: 'نصف القطر(R)',
        local: 'نصف القطر',
        global: 'Radius'
      }
    },
    arcAngle: 'حدد زاوية القوس',
    arcCenter: 'حدد نقطة مركز القوس',
    arcSecondPoint: 'حدد النقطة الثانية على القوس',
    arcEndPoint: 'حدد نقطة نهاية القوس',
    arcRadius: 'حدد نصف قطر القوس'
  },
  rect: {
    firstPoint: 'حدد نقطة الركن الأول',
    nextPoint: 'حدد نقطة الركن المقابل',
    firstPointWithOptions: 'حدد نقطة الركن الأول أو',
    otherCornerWithOptions: 'حدد نقطة الركن الآخر أو',
    chamferFirst: 'حدد مسافة الشطف الأولى',
    chamferSecond: 'حدد مسافة الشطف الثانية',
    filletRadius: 'حدد نصف قطر التدوير',
    segmentWidth: 'حدد عرض خط المستطيل',
    elevationValue: 'حدد المنسوب',
    thicknessValue: 'حدد السماكة',
    rotationAngle: 'حدد زاوية دوران المستطيل',
    dimensionLength: 'حدد طول المستطيل',
    dimensionWidth: 'حدد عرض المستطيل',
    areaValue: 'حدد مساحة المستطيل',
    areaLengthOrWidth: 'حدد طول المستطيل',
    areaSpecifyWidth: 'حدد عرض المستطيل',
    invalidPositive: 'إدخال غير صالح. أدخل قيمة أكبر من 0.',
    invalidRect: 'تعذر إنشاء المستطيل. حدد أركانًا أو أبعادًا صالحة.',
    thicknessNotSupported:
      'سماكة المستطيل لا تُكتب حاليًا إلى بيانات العنصر، لذلك سيتم تجاهل إعداد السماكة.',
    keywords: {
      chamfer: {
        display: 'شطف(C)',
        local: 'شطف',
        global: 'Chamfer'
      },
      elevation: {
        display: 'ارتفاع(E)',
        local: 'ارتفاع',
        global: 'Elevation'
      },
      fillet: {
        display: 'تقويس(F)',
        local: 'تقويس',
        global: 'Fillet'
      },
      thickness: {
        display: 'السماكة(T)',
        local: 'السماكة',
        global: 'Thickness'
      },
      width: {
        display: 'العرض(W)',
        local: 'العرض',
        global: 'Width'
      },
      area: {
        display: 'مساحة(A)',
        local: 'مساحة',
        global: 'Area'
      },
      dimensions: {
        display: 'الأبعاد(D)',
        local: 'الأبعاد',
        global: 'Dimensions'
      },
      rotation: {
        display: 'دوران(R)',
        local: 'دوران',
        global: 'Rotation'
      },
      length: {
        display: 'طول(L)',
        local: 'طول',
        global: 'Length'
      },
      rectWidth: {
        display: 'عرض المستطيل(W)',
        local: 'عرض المستطيل',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'حدد نقطة الأساس',
    rotationAngleOrOptions: 'حدد زاوية الدوران أو',
    referenceAngleOrPoints: 'حدد الزاوية المرجعية أو',
    firstReferencePoint: 'حدد النقطة الأولى للزاوية المرجعية',
    secondReferencePoint: 'حدد النقطة الثانية',
    newAngle: 'حدد الزاوية الجديدة',
    keywords: {
      copy: {
        display: 'نسخ(C)',
        local: 'نسخ',
        global: 'Copy'
      },
      reference: {
        display: 'مرجع(R)',
        local: 'مرجع',
        global: 'Reference'
      },
      points: {
        display: 'نقاط(P)',
        local: 'نقاط',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints:
        'النقاط المرجعية غير صالحة: يجب أن تكون النقطتان مختلفتين.'
    }
  },
  revcloud: {
    firstCornerOrOptions: 'حدد نقطة الركن الأول أو',
    firstCorner: 'حدد نقطة الركن الأول',
    oppositeCorner: 'حدد الركن المقابل',
    startPoint: 'حدد نقطة البداية',
    nextPoint: 'حدد النقطة التالية',
    nextPointOrUndo: 'حدد النقطة التالية أو',
    firstPoint: 'حدد النقطة الأولى',
    guideCursor: 'حرّك المؤشر على مسار السحابة (اضغط Enter للإنهاء)',
    arcLength: 'حدد طول القوس',
    selectObject: 'حدد عنصرًا',
    style: 'أدخل نمط أقواس سحابة المراجعة',
    reverseDirection: 'اعكس الاتجاه',
    invalidArcLength: 'يجب أن يكون طول القوس أكبر من 0.',
    invalidObject: 'لا يمكن تحويل العنصر المحدد إلى سحابة مراجعة.',
    keywords: {
      arcLength: {
        display: 'طول القوس(A)',
        local: 'طول القوس',
        global: 'ArcLength'
      },
      object: {
        display: 'كائن(O)',
        local: 'كائن',
        global: 'Object'
      },
      rectangular: {
        display: 'مستطيل(R)',
        local: 'مستطيل',
        global: 'Rectangular'
      },
      polygonal: {
        display: 'مضلّع(P)',
        local: 'مضلّع',
        global: 'Polygonal'
      },
      freehand: {
        display: 'يدوي(F)',
        local: 'يدوي',
        global: 'Freehand'
      },
      style: {
        display: 'أسلوب(S)',
        local: 'أسلوب',
        global: 'Style'
      },
      normal: {
        display: 'عادي(N)',
        local: 'عادي',
        global: 'Normal'
      },
      calligraphy: {
        display: 'خط زخرفي(C)',
        local: 'خط زخرفي',
        global: 'Calligraphy'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      }
    }
  },
  sketch: {
    specifySketch: 'حدد الرسم الحر أو',
    sketching: 'حرّك المؤشر للرسم (انقر أو اضغط Enter للإيقاف)',
    type: 'أدخل نوع الرسم الحر',
    increment: 'حدد مقدار زيادة الرسم',
    tolerance: 'حدد سماحية منحنى Spline',
    firstPoint: 'حدد النقطة الأولى',
    nextPoint: 'حدد نقطة النهاية',
    keywords: {
      type: {
        display: 'نوع(T)',
        local: 'نوع',
        global: 'Type'
      },
      increment: {
        display: 'زيادة(I)',
        local: 'زيادة',
        global: 'Increment'
      },
      tolerance: {
        display: 'سماحية(L)',
        local: 'سماحية',
        global: 'Tolerance'
      },
      line: {
        display: 'خط(L)',
        local: 'خط',
        global: 'Lines'
      },
      polyline: {
        display: 'خط متعدد(P)',
        local: 'خط متعدد',
        global: 'Polyline'
      },
      spline: {
        display: 'منحنى سبلاين(S)',
        local: 'منحنى سبلاين',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: 'حدد النقطة الأولى',
    nextPoint: 'حدد النقطة التالية (أو اضغط Enter للإنهاء)',
    firstPointWithOptions: 'حدد النقطة الأولى أو',
    nextPointWithFitOptions: 'حدد النقطة التالية أو',
    nextPointWithCvOptions: 'حدد نقطة التحكم التالية أو',
    methodPrompt: 'أدخل طريقة إنشاء Spline',
    knotsPrompt: 'أدخل طريقة توزيع العقد',
    degreePrompt: 'حدد درجة منحنى Spline',
    keywords: {
      method: {
        display: 'طريقة(M)',
        local: 'طريقة',
        global: 'Method'
      },
      fit: {
        display: 'ملاءمة(F)',
        local: 'ملاءمة',
        global: 'Fit'
      },
      cv: {
        display: 'نقاط التحكم(C)',
        local: 'نقاط التحكم',
        global: 'CV'
      },
      knots: {
        display: 'عُقد(K)',
        local: 'عُقد',
        global: 'Knots'
      },
      degree: {
        display: 'درجة(D)',
        local: 'درجة',
        global: 'Degree'
      },
      undo: {
        display: 'تراجع(U)',
        local: 'تراجع',
        global: 'Undo'
      },
      close: {
        display: 'إغلاق(C)',
        local: 'إغلاق',
        global: 'Close'
      },
      chord: {
        display: 'وتر(C)',
        local: 'وتر',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'جذر الوتر(S)',
        local: 'جذر الوتر',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'منتظم(U)',
        local: 'منتظم',
        global: 'Uniform'
      }
    }
  },
  objectscale: {
    action: 'أدخل خيارًا',
    scaleName: 'أدخل اسم مقياس التعليقات التوضيحية',
    done: 'الكائنات المحدّثة',
    none: '(لا شيء)',
    keywords: {
      add: {
        display: 'إضافة(A)',
        local: 'إضافة',
        global: 'Add'
      },
      delete: {
        display: 'حذف(D)',
        local: 'حذف',
        global: 'Delete'
      },
      list: {
        display: 'قائمة(L)',
        local: 'قائمة',
        global: 'List'
      }
    }
  },
  sysvar: {
    prompt: 'أدخل القيمة الجديدة'
  },
  view: {
    enterName: 'أدخل اسم العرض المراد استعادته',
    notFound: 'لم يتم العثور على العرض "{name}".'
  },
  zoom: {
    mainPrompt: 'حدد ركن نافذة التكبير أو',
    firstCorner: 'حدد الركن الأول',
    secondCorner: 'حدد الركن المقابل',
    centerPoint: 'حدد نقطة المركز',
    heightOrScale: 'أدخل الارتفاع أو معامل المقياس (nX أو nXP)',
    scaleFactor: 'أدخل معامل المقياس (nX أو nXP)',
    keywords: {
      all: {
        display: 'الكل(A)',
        local: 'الكل',
        global: 'All'
      },
      center: {
        display: 'المركز(C)',
        local: 'المركز',
        global: 'Center'
      },
      extents: {
        display: 'الحدود(E)',
        local: 'الحدود',
        global: 'Extents'
      },
      previous: {
        display: 'السابق(P)',
        local: 'السابق',
        global: 'Previous'
      },
      original: {
        display: 'الأصلي(O)',
        local: 'الأصلي',
        global: 'Original'
      },
      saved: {
        display: 'المحفوظ(V)',
        local: 'المحفوظ',
        global: 'Saved'
      },
      smart: {
        display: 'ذكي(I)',
        local: 'ذكي',
        global: 'Smart'
      },
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      window: {
        display: 'نافذة(W)',
        local: 'نافذة',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportFormat: 'تنسيق التصدير',
    exportInvisibleLayers: 'تصدير الطبقات غير المرئية',
    exportLayouts: 'تصدير المخططات',
    background: 'لون الخلفية',
    initialView: 'العرض الأولي عند فتح HTML',
    viewerMode: 'وضع العارض دون اتصال',
    chunkSizeMiB: 'حجم الجزء بالميبيبايت (حزمة متعددة الملفات)',
    compressChunks: 'ضغط الأجزاء (حزمة متعددة الملفات)',
    keywords: {
      single: {
        display: 'ملف واحد(S)',
        local: 'ملف واحد',
        global: 'Single'
      },
      multi: {
        display: 'حزمة متعددة الملفات(M)',
        local: 'حزمة متعددة الملفات',
        global: 'Multi'
      },
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      },
      extents: {
        display: 'الحدود(E)',
        local: 'الحدود',
        global: 'Extents'
      },
      current: {
        display: 'الحالي(C)',
        local: 'الحالي',
        global: 'Current'
      },
      view: {
        display: 'عرض(V)',
        local: 'عرض',
        global: 'View'
      },
      measure: {
        display: 'قياس(M)',
        local: 'قياس',
        global: 'Measure'
      },
      black: {
        display: 'أسود(B)',
        local: 'أسود',
        global: 'Black'
      },
      white: {
        display: 'أبيض(W)',
        local: 'أبيض',
        global: 'White'
      },
      space: {
        display: 'حسب المساحة(S)',
        local: 'حسب المساحة',
        global: 'Space'
      }
    }
  },
  cpdf: {
    modelSpaceFit: 'إطار مساحة النموذج',
    exportLayouts: 'تصدير المخططات',
    textMode: 'عرض النص',
    colorMode: 'وضع الألوان',
    keywords: {
      extents: {
        display: 'الامتدادات(E)',
        local: 'الامتدادات',
        global: 'Extents'
      },
      display: {
        display: 'العرض(D)',
        local: 'العرض',
        global: 'Display'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      vector: {
        display: 'متجه(V)',
        local: 'متجه',
        global: 'Vector'
      },
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      },
      color: {
        display: 'ملون(C)',
        local: 'ملون',
        global: 'Color'
      },
      monochrome: {
        display: 'أحادي اللون(M)',
        local: 'أحادي اللون',
        global: 'Monochrome'
      }
    }
  },
  ucs: {
    originOrOptions: 'حدد نقطة أصل UCS أو',
    pointOnXAxis: 'حدد نقطة على المحور X أو',
    pointOnXyPlane: 'حدد نقطة على المستوى XY أو',
    rotationAngle: 'حدد زاوية الدوران حول المحور {axis}',
    zAxisOrigin: 'حدد نقطة الأصل الجديدة',
    pointOnZAxis: 'حدد نقطة على الجزء الموجب من المحور Z',
    selectObject: 'حدد كائنًا لمحاذاة UCS معه',
    namedOption: 'أدخل خيارًا',
    enterName: 'أدخل اسم UCS المراد استعادته أو [?]',
    saveName: 'أدخل اسمًا لحفظ UCS الحالي',
    deleteName: 'أدخل اسم (أسماء) UCS المراد حذفها',
    noPrevious: 'لا يوجد UCS سابق في هذه الجلسة.',
    noNamed: 'لا توجد تعريفات UCS مسماة.',
    notFound: 'لم يتم العثور على UCS "{name}".',
    invalidName: 'اسم UCS غير صالح.',
    invalidObject: 'لا يمكن محاذاة UCS مع الكائن المحدد.',
    keywords: {
      named: {
        display: 'مسمى(A)',
        local: 'مسمى',
        global: 'Named'
      },
      object: {
        display: 'كائن(B)',
        local: 'كائن',
        global: 'Object'
      },
      previous: {
        display: 'سابق(P)',
        local: 'سابق',
        global: 'Previous'
      },
      view: {
        display: 'عرض(V)',
        local: 'عرض',
        global: 'View'
      },
      world: {
        display: 'عالمي(W)',
        local: 'عالمي',
        global: 'World'
      },
      x: {
        display: 'X',
        local: 'X',
        global: 'X'
      },
      y: {
        display: 'Y',
        local: 'Y',
        global: 'Y'
      },
      z: {
        display: 'Z',
        local: 'Z',
        global: 'Z'
      },
      zAxis: {
        display: 'المحور Z(N)',
        local: 'المحور Z',
        global: 'ZAxis'
      },
      apply: {
        display: 'تطبيق(L)',
        local: 'تطبيق',
        global: 'Apply'
      },
      restore: {
        display: 'استعادة(R)',
        local: 'استعادة',
        global: 'Restore'
      },
      save: {
        display: 'حفظ(S)',
        local: 'حفظ',
        global: 'Save'
      },
      delete: {
        display: 'حذف(D)',
        local: 'حذف',
        global: 'Delete'
      },
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      }
    }
  },
  group: {
    selectOrOption: 'حدد الكائنات أو',
    createOrOption: 'إنشاء مجموعة أو',
    selectObjects: 'حدد كائنات المجموعة',
    enterName: 'أدخل اسم المجموعة',
    enterDescription: 'أدخل وصف المجموعة',
    invalidName: 'اسم مجموعة غير صالح',
    nameExists: 'اسم المجموعة موجود بالفعل',
    created: 'تم إنشاء المجموعة {name}',
    keywords: {
      name: {
        display: 'اسم(N)',
        local: 'اسم',
        global: 'Name'
      },
      description: {
        display: 'وصف(D)',
        local: 'وصف',
        global: 'Description'
      }
    }
  },
  ungroup: {
    selectOrOption: 'حدد مجموعة أو',
    selectGroup: 'حدد مجموعة',
    enterName: 'أدخل اسم المجموعة',
    notFound: 'لم يتم العثور على المجموعة',
    notInGroup: 'الكائن ليس عضوًا في مجموعة',
    multiGroup: 'الكائن عضو في أكثر من مجموعة [{name}]',
    exploded: 'تم تفجير المجموعة {name}',
    explodedCount: 'تم تفجير {count} مجموعة/مجموعات',
    keywords: {
      name: {
        display: 'اسم(N)',
        local: 'اسم',
        global: 'Name'
      },
      all: {
        display: 'الكل(A)',
        local: 'الكل',
        global: 'All'
      },
      accept: {
        display: 'قبول(A)',
        local: 'قبول',
        global: 'Accept'
      },
      next: {
        display: 'التالي(N)',
        local: 'التالي',
        global: 'Next'
      }
    }
  },
  groupedit: {
    selectGroup: 'حدد مجموعة',
    enterName: 'أدخل اسم المجموعة',
    notFound: 'لم يتم العثور على المجموعة',
    multiGroup: 'الكائن عضو في أكثر من مجموعة [{name}]',
    action: 'أدخل خيارًا للمجموعة {name}',
    selectToAdd: 'حدد الكائنات لإضافتها إلى المجموعة',
    selectToRemove: 'حدد الكائنات لإزالتها من المجموعة',
    newName: 'أدخل اسم المجموعة الجديد',
    keywords: {
      add: {
        display: 'إضافة كائنات(A)',
        local: 'إضافة',
        global: 'Add'
      },
      remove: {
        display: 'إزالة كائنات(R)',
        local: 'إزالة',
        global: 'Remove'
      },
      rename: {
        display: 'إعادة تسمية(N)',
        local: 'إعادة تسمية',
        global: 'Rename'
      },
      accept: {
        display: 'قبول(A)',
        local: 'قبول',
        global: 'Accept'
      },
      next: {
        display: 'التالي(N)',
        local: 'التالي',
        global: 'Next'
      }
    }
  },
  dashgroup: {
    option: 'أدخل خيارًا',
    empty: 'لا توجد مجموعات معرّفة',
    listEntry: '{name}  {description}  [{selectable}]  ({count})',
    yes: 'نعم',
    no: 'لا',
    enterNameOrBlank: 'أدخل اسم المجموعة أو اضغط Enter لمجموعة غير مسماة',
    enterGroupName: 'أدخل اسم المجموعة',
    selectableSet: 'المجموعة {name} قابلة للتحديد = {value}',
    orderOption: 'أدخل خيار الترتيب',
    fromPosition: 'أدخل رقم موضع الكائن لإعادة ترتيبه (يبدأ من 0)',
    toPosition: 'أدخل رقم الموضع الجديد للكائن (يبدأ من 0)',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      create: {
        display: 'إنشاء(C)',
        local: 'إنشاء',
        global: 'Create'
      },
      add: {
        display: 'إضافة(A)',
        local: 'إضافة',
        global: 'Add'
      },
      remove: {
        display: 'إزالة(R)',
        local: 'إزالة',
        global: 'Remove'
      },
      explode: {
        display: 'تفجير(X)',
        local: 'تفجير',
        global: 'Explode'
      },
      rename: {
        display: 'إعادة تسمية(N)',
        local: 'إعادة تسمية',
        global: 'Rename'
      },
      selectable: {
        display: 'قابلة للتحديد(S)',
        local: 'قابلة للتحديد',
        global: 'Selectable'
      },
      order: {
        display: 'ترتيب(O)',
        local: 'ترتيب',
        global: 'Order'
      },
      reverse: {
        display: 'عكس(R)',
        local: 'عكس',
        global: 'Reverse'
      },
      position: {
        display: 'موضع(P)',
        local: 'موضع',
        global: 'Position'
      }
    }
  },
  ipdf: {
    pageNumber: 'أدخل رقم الصفحة (1-{count})',
    insertionPoint: 'حدد نقطة الإدراج (المقياس {scale}، الوضع {mode}) أو',
    modePrompt: 'اختر طريقة الاستيراد',
    modeRecover: 'استعادة الرسم',
    modeVisual: 'الحفاظ على مظهر PDF',
    scaleFactor: 'أدخل معامل المقياس',
    keywords: {
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      mode: {
        display: 'الوضع(M)',
        local: 'الوضع',
        global: 'Mode'
      },
      recover: {
        display: 'استعادة(R)',
        local: 'استعادة',
        global: 'Recover'
      },
      visual: {
        display: 'مرئي(V)',
        local: 'مرئي',
        global: 'Visual'
      }
    }
  },
  pdfdim: {
    noDimensions:
      'لم يتم العثور على أبعاد في التحديد (يلزم وجود رؤوس أسهم أو علامات وخطوط أبعاد ونصوص قيم).',
    convertAll:
      'تم العثور على {count} بُعد (مقياس الرسم 1:{scale}). هل تريد تحويلها؟',
    convertOne: 'البُعد {index}/{count} "{text}": تحويل؟',
    summary:
      'تم تحويل {count} بُعد؛ يستخدم النمط PDF_DIM معامل مقياس خطي قدره {scale}.'
  },
  bsearch: {
    unsupported:
      'لا يمكن مطابقة أي من الكائنات المحددة (المدعوم: الخطوط والأقواس والدوائر والخطوط المتعددة والقطوع الناقصة والمنحنيات والنصوص والنصوص المتعددة ومراجع الكتل).',
    skipped: 'تم تجاهل {count} من الكائنات المحددة لأنه لا يمكن مطابقتها.',
    found: 'تم العثور على {count} نسخة مطابقة، سيتم تحويل {included}. اختر',
    noMatches: 'لم يتم العثور على نسخ أخرى.',
    reviewOne: 'النسخة {index}/{count} ({state})',
    included: 'مضمّنة',
    excluded: 'مستبعدة',
    options:
      'الدوران {rotation}، الانعكاس {mirror}، المقياس {scale}، نفس الطبقة {layer}، الكتل الموجودة {blocks}، اختلاف النص {text}. تبديل',
    on: 'تشغيل',
    off: 'إيقاف',
    target: 'تحويل إلى',
    name: 'أدخل اسم الكتلة الجديدة',
    nameExists: 'توجد كتلة باسم "{name}" بالفعل.',
    nameInvalid: '"{name}" ليس اسم كتلة صالحًا.',
    basePoint: 'حدد نقطة الإدراج',
    attributeTag: 'أدخل وسم السمة للنص "{text}"',
    existingName: 'أدخل اسم كتلة موجودة',
    blockNotFound: 'لم يتم العثور على الكتلة "{name}".',
    rotation: 'حدد زاوية دوران الكتلة',
    scale: 'حدد معامل مقياس الكتلة',
    scope:
      'هل تريد تحويل النسخ الـ {count} التي تم العثور عليها أيضًا، أم الكائنات المصدر فقط؟',
    summary: 'تم التحويل إلى الكتلة "{name}": {count} مرجع.',
    keywords: {
      convert: {
        display: 'تحويل(C)',
        local: 'تحويل',
        global: 'Convert'
      },
      review: {
        display: 'مراجعة(R)',
        local: 'مراجعة',
        global: 'Review'
      },
      options: {
        display: 'خيارات(O)',
        local: 'خيارات',
        global: 'Options'
      },
      exit: {
        display: 'خروج(X)',
        local: 'خروج',
        global: 'eXit'
      },
      include: {
        display: 'تضمين(I)',
        local: 'تضمين',
        global: 'Include'
      },
      exclude: {
        display: 'استبعاد(E)',
        local: 'استبعاد',
        global: 'Exclude'
      },
      next: {
        display: 'التالي(N)',
        local: 'التالي',
        global: 'Next'
      },
      previous: {
        display: 'السابق(P)',
        local: 'السابق',
        global: 'Previous'
      },
      done: {
        display: 'تم(D)',
        local: 'تم',
        global: 'Done'
      },
      rotation: {
        display: 'دوران(R)',
        local: 'دوران',
        global: 'Rotation'
      },
      mirror: {
        display: 'انعكاس(M)',
        local: 'انعكاس',
        global: 'Mirror'
      },
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      layer: {
        display: 'طبقة(L)',
        local: 'طبقة',
        global: 'Layer'
      },
      blocks: {
        display: 'كتل(B)',
        local: 'كتل',
        global: 'Blocks'
      },
      text: {
        display: 'نص(T)',
        local: 'نص',
        global: 'Text'
      },
      new: {
        display: 'جديد(N)',
        local: 'جديد',
        global: 'New'
      },
      existing: {
        display: 'موجود(E)',
        local: 'موجود',
        global: 'Existing'
      },
      instances: {
        display: 'النسخ(I)',
        local: 'النسخ',
        global: 'Instances'
      },
      source: {
        display: 'المصدر(S)',
        local: 'المصدر',
        global: 'Source'
      }
    }
  },
  pdfblock: {
    keywords: {
      yes: {
        display: 'نعم(Y)',
        local: 'نعم',
        global: 'Yes'
      },
      no: {
        display: 'لا(N)',
        local: 'لا',
        global: 'No'
      },
      review: {
        display: 'مراجعة(R)',
        local: 'مراجعة',
        global: 'Review'
      },
      all: {
        display: 'الكل(A)',
        local: 'الكل',
        global: 'All'
      },
      exit: {
        display: 'خروج(X)',
        local: 'خروج',
        global: 'eXit'
      }
    }
  },
  pdftext: {
    enterText:
      'سطر النص {index}/{count}: أدخل النص المظلل (اتركه فارغًا للتخطي، Esc للإيقاف)',
    enterTextWithSuggestion: 'سطر النص {index}/{count}: أدخل النص المظلل',
    noCandidates: 'لم يتم العثور على خطوط تشبه النص في التحديد.',
    summary:
      'تم تحويل {converted} سطر نصي، منها {automatic} تلقائيًا؛ تم تخطي {skipped}.'
  },
  pdfscale: {
    firstPoint: 'حدد النقطة الأولى لمسافة معروفة',
    secondPoint: 'حدد النقطة الثانية',
    realLength: 'أدخل الطول الحقيقي (المقاس {measured})',
    realLengthFromDimensions:
      'أدخل الطول الحقيقي (المقاس {measured}؛ تشير نصوص الأبعاد إلى 1:{scale})',
    zeroDistance: 'النقطتان متطابقتان.',
    applied: 'تم تغيير مقياس {count} كائن بمعامل {factor}.'
  }
}
