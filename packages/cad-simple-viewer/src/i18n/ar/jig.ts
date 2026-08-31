import enJig from '../en/jig'

export default {
  ...enJig,

  arc: {
    ...enJig.arc,

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

    invalid: {
      ...enJig.arc.invalid,

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
  ,
    keywords: {
      ...enJig.arc.keywords,
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
      },
    },
  },

  circle: {
    ...enJig.circle,

    center: 'حدد مركز الدائرة',
    centerOrOptions: 'حدد نقطة مركز الدائرة أو',
    radius: 'حدد نصف قطر الدائرة',
    radiusOrDiameter: 'حدد نصف قطر الدائرة أو',
    diameter: 'حدد قطر الدائرة',

    twoPointFirst: 'حدد نقطة النهاية الأولى لقطر الدائرة',
    twoPointSecond: 'حدد نقطة النهاية الثانية لقطر الدائرة',

    threePointFirst: 'حدد النقطة الأولى على الدائرة',
    threePointSecond: 'حدد النقطة الثانية على الدائرة',
    threePointThird: 'حدد النقطة الثالثة على الدائرة'
  ,
    keywords: {
      ...enJig.circle.keywords,
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
      },
    },
  },

  copy: {
    ...enJig.copy,

    basePointOrOptions: 'حدد نقطة الأساس أو',
    displacementOrArray: 'حدد الإزاحة أو',
    secondPointOrArray: 'حدد النقطة الثانية أو',

    modePrompt: 'أدخل خيار وضع النسخ',

    arrayItemCount:
      'أدخل عدد العناصر في المصفوفة بما في ذلك العنصر الأصلي',

    arraySecondPointOrFit: 'حدد النقطة الثانية أو',
    arrayFitSecondPoint: 'حدد النقطة الثانية'
  ,
    keywords: {
      ...enJig.copy.keywords,
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
      },
    },
  },

  dimlinear: {
    ...enJig.dimlinear,

    xLine1Point:
      'حدد نقطة أصل خط الامتداد الأول',

    xLine2Point:
      'حدد نقطة أصل خط الامتداد الثاني',

    dimLinePoint:
      'حدد موقع خط البُعد'
  },

  ellipse: {
    ...enJig.ellipse,

    axisEndpointOrOptions:
      'حدد نقطة نهاية محور القطع الناقص أو',

    arcAxisEndpointOrCenter:
      'حدد نقطة نهاية محور القوس البيضاوي أو',

    center:
      'حدد مركز القطع الناقص',

    firstAxisEndpoint:
      'حدد نقطة نهاية المحور الأولى',

    secondAxisEndpoint:
      'حدد نقطة النهاية الأخرى للمحور',

    otherAxisOrRotation:
      'حدد المسافة إلى المحور الآخر أو',

    rotationAngle:
      'حدد زاوية الدوران حول المحور الأكبر',

    arcStartAngle:
      'حدد زاوية بداية القوس البيضاوي',

    arcEndAngle:
      'حدد زاوية نهاية القوس البيضاوي',

    invalid: {
      ...enJig.ellipse.invalid,

      axis:
        'المحور غير صالح: يجب أن يكون طول المحور أكبر من 0.',

      otherAxis:
        'المحور الآخر غير صالح: يجب أن تكون المسافة أكبر من 0.',

      rotation:
        'الدوران غير صالح: يجب أن يكون المحور الأصغر الناتج أكبر من 0.'
    }
  ,
    keywords: {
      ...enJig.ellipse.keywords,
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
      },
    },
  },

  hatch: {
    ...enJig.hatch,

    prompt:
      'حدد عنصر حدود أو',

    pickPoint:
      'حدد نقطة داخلية (أو اضغط Enter للإنهاء)',

    select:
      'حدد العناصر المطلوب تهشيرها',

    patternName:
      'أدخل اسم نمط التهشير',

    scale:
      'حدد مقياس نمط التهشير',

    angle:
      'حدد زاوية نمط التهشير',

    style:
      'أدخل نمط التهشير',

    associative:
      'حدد حالة الترابط',

    invalidBoundary:
      'العناصر المحددة لا تكوّن حدودًا مغلقة.'
  ,
    keywords: {
      ...enJig.hatch.keywords,
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
      },
    },
  },

  line: {
    ...enJig.line,

    firstPoint:
      'حدد النقطة الأولى',

    firstPointOrContinue:
      'حدد النقطة الأولى أو',

    nextPoint:
      'حدد النقطة التالية',

    nextPointWithOptions:
      'حدد النقطة التالية أو'
  ,
    keywords: {
      ...enJig.line.keywords,
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
      },
    },
  },

  xline: {
    ...enJig.xline,

    firstPointOrOptions:
      'حدد نقطة أو',

    secondPoint:
      'حدد النقطة الثانية',

    throughPoint:
      'حدد نقطة يمر بها الخط',

    angle:
      'أدخل زاوية الخط الإنشائي',

    invalidDirection:
      'اتجاه XLINE غير صالح.'
  ,
    keywords: {
      ...enJig.xline.keywords,
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
      },
    },
  },

  ray: {
    ...enJig.ray,

    startPoint:
      'حدد نقطة البداية',

    throughPoint:
      'حدد نقطة يمر بها الشعاع'
  },

  move: {
    ...enJig.move,

    basePointOrDisplacement:
      'حدد نقطة الأساس أو',

    secondPointOrDisplacement:
      'حدد النقطة الثانية أو',

    displacement:
      'حدد الإزاحة'
  ,
    keywords: {
      ...enJig.move.keywords,
      displacement: {
        display: 'إزاحة(D)',
        local: 'إزاحة',
        global: 'Displacement'
      },
    },
  },

  offset: {
    ...enJig.offset,

    distance:
      'حدد مسافة الإزاحة',

    selectObject:
      'حدد العنصر المطلوب إزاحته أو اضغط Enter للإنهاء',

    sidePoint:
      'حدد نقطة في جهة الإزاحة',

    invalidDistance:
      'يجب أن تكون مسافة الإزاحة أكبر من 0.',

    invalidSelection:
      'لا يمكن إنشاء إزاحة للعنصر المحدد.',

    offsetFailed:
      'تعذر إنشاء منحنى إزاحة في الجهة المحددة.'
  },

  mtext: {
    ...enJig.mtext,

    point:
      'حدد نقطة إدراج النص متعدد الأسطر'
  },

  point: {
    ...enJig.point,

    point:
      'حدد نقطة'
  },

  polygon: {
    ...enJig.polygon,

    numberOfSides:
      'أدخل عدد الأضلاع',

    centerOrEdge:
      'حدد مركز المضلع أو',

    radiusOrType:
      'أدخل الخيارات',

    edgeStart:
      'حدد نقطة النهاية الأولى للضلع',

    edgeEnd:
      'حدد نقطة النهاية الثانية للضلع',

    invalid: {
      ...enJig.polygon.invalid,

      sides:
        'عدد الأضلاع غير صالح. أدخل عددًا صحيحًا بين 3 و1024.',

      radius:
        'نصف القطر غير صالح. يجب أن يكون أكبر من 0.',

      edge:
        'الضلع غير صالح. يجب أن يكون طول الضلع أكبر من 0.'
    }
  ,
    keywords: {
      ...enJig.polygon.keywords,
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
      },
    },
  },

  polyline: {
    ...enJig.polyline,

    firstPoint:
      'حدد النقطة الأولى',

    nextPoint:
      'حدد النقطة التالية (أو اضغط Enter للإنهاء)',

    nextPointWithOptions:
      'حدد النقطة التالية أو',

    nextPointWithArcOptions:
      'حدد النقطة التالية أو',

    arcAngle:
      'حدد زاوية القوس',

    arcCenter:
      'حدد نقطة مركز القوس',

    arcSecondPoint:
      'حدد النقطة الثانية على القوس',

    arcEndPoint:
      'حدد نقطة نهاية القوس',

    arcRadius:
      'حدد نصف قطر القوس'
  ,
    keywords: {
      ...enJig.polyline.keywords,
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
      },
    },
  },

  rect: {
    ...enJig.rect,

    firstPoint:
      'حدد نقطة الركن الأول',

    nextPoint:
      'حدد نقطة الركن المقابل',

    firstPointWithOptions:
      'حدد نقطة الركن الأول أو',

    otherCornerWithOptions:
      'حدد نقطة الركن الآخر أو',

    chamferFirst:
      'حدد مسافة الشطف الأولى',

    chamferSecond:
      'حدد مسافة الشطف الثانية',

    filletRadius:
      'حدد نصف قطر التدوير',

    segmentWidth:
      'حدد عرض خط المستطيل',

    elevationValue:
      'حدد المنسوب',

    thicknessValue:
      'حدد السماكة',

    rotationAngle:
      'حدد زاوية دوران المستطيل',

    dimensionLength:
      'حدد طول المستطيل',

    dimensionWidth:
      'حدد عرض المستطيل',

    areaValue:
      'حدد مساحة المستطيل',

    areaLengthOrWidth:
      'حدد طول المستطيل',

    areaSpecifyWidth:
      'حدد عرض المستطيل',

    invalidPositive:
      'إدخال غير صالح. أدخل قيمة أكبر من 0.',

    invalidRect:
      'تعذر إنشاء المستطيل. حدد أركانًا أو أبعادًا صالحة.',

    thicknessNotSupported:
      'سماكة المستطيل لا تُكتب حاليًا إلى بيانات العنصر، لذلك سيتم تجاهل إعداد السماكة.'
  ,
    keywords: {
      ...enJig.rect.keywords,
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
      },
    },
  },

  rotate: {
    ...enJig.rotate,

    basePoint:
      'حدد نقطة الأساس',

    rotationAngleOrOptions:
      'حدد زاوية الدوران أو',

    referenceAngleOrPoints:
      'حدد الزاوية المرجعية أو',

    firstReferencePoint:
      'حدد النقطة الأولى للزاوية المرجعية',

    secondReferencePoint:
      'حدد النقطة الثانية',

    newAngle:
      'حدد الزاوية الجديدة',

    invalid: {
      ...enJig.rotate.invalid,

      referencePoints:
        'النقاط المرجعية غير صالحة: يجب أن تكون النقطتان مختلفتين.'
    }
  ,
    keywords: {
      ...enJig.rotate.keywords,
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
      },
    },
  },

  spline: {
    ...enJig.spline,

    firstPoint:
      'حدد النقطة الأولى',

    nextPoint:
      'حدد النقطة التالية (أو اضغط Enter للإنهاء)',

    firstPointWithOptions:
      'حدد النقطة الأولى أو',

    nextPointWithFitOptions:
      'حدد النقطة التالية أو',

    nextPointWithCvOptions:
      'حدد نقطة التحكم التالية أو',

    methodPrompt:
      'أدخل طريقة إنشاء Spline',

    knotsPrompt:
      'أدخل طريقة توزيع العقد',

    degreePrompt:
      'حدد درجة منحنى Spline'
  ,
    keywords: {
      ...enJig.spline.keywords,
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
      },
    },
  },

  zoom: {
    ...enJig.zoom,

    mainPrompt:
      'حدد ركن نافذة التكبير أو',

    firstCorner:
      'حدد الركن الأول',

    secondCorner:
      'حدد الركن المقابل',

    centerPoint:
      'حدد نقطة المركز',

    heightOrScale:
      'أدخل الارتفاع أو معامل المقياس (nX أو nXP)',

    scaleFactor:
      'أدخل معامل المقياس (nX أو nXP)'
  ,
    keywords: {
      ...enJig.zoom.keywords,
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
      scale: {
        display: 'مقياس(S)',
        local: 'مقياس',
        global: 'Scale'
      },
      window: {
        display: 'نافذة(W)',
        local: 'نافذة',
        global: 'Window'
      },
    },
  },

  hideobjects: {
    ...enJig.hideobjects,
    hidden: 'تم إخفاء العناصر',
    restored: 'تمت استعادة العناصر',
    nothingToRestore: 'لا توجد عناصر مخفية لاستعادتها'
  },

  entout: {
    ...enJig.entout,

    longSidePrompt:
      'أدخل حجم الضلع الأطول للمعاينة بالبكسل',

    exported:
      'تم تصدير معاينات العناصر',

    skipped:
      'تم تخطي بعض العناصر',

    failed: {
      ...enJig.entout.failed,

      'no-preview-root':
        'تعذر إنشاء هندسة المعاينة للعناصر المحددة',

      'no-bounds':
        'تعذر حساب حدود المعاينة للعناصر المحددة',

      'capture-failed':
        'تعذر عرض صورة معاينة العناصر',

      'download-failed':
        'تم إنشاء المعاينة ولكن فشل تنزيل ملف PNG'
    }
  },

  layer: {
    ...enJig.layer,

    main:
      'أدخل خيارًا',

    listSummary:
      'تمت طباعة قائمة الطبقات في وحدة تحكم المتصفح',

    emptyInput:
      'لم يتم إدخال اسم طبقة.',

    newPrompt:
      'أدخل اسم الطبقة أو الطبقات الجديدة',

    makePrompt:
      'أدخل اسم الطبقة المطلوب إنشاؤها وجعلها حالية',

    setPrompt:
      'أدخل اسم الطبقة المطلوب جعلها حالية',

    onPrompt:
      'أدخل أسماء الطبقات المطلوب تشغيلها',

    offPrompt:
      'أدخل أسماء الطبقات المطلوب إيقافها',

    freezePrompt:
      'أدخل أسماء الطبقات المطلوب تجميدها',

    thawPrompt:
      'أدخل أسماء الطبقات المطلوب إلغاء تجميدها',

    lockPrompt:
      'أدخل أسماء الطبقات المطلوب قفلها',

    unlockPrompt:
      'أدخل أسماء الطبقات المطلوب إلغاء قفلها',

    colorLayerPrompt:
      'أدخل أسماء الطبقات المطلوب تغيير لونها',

    colorValuePrompt:
      'أدخل اللون (ACI من 1 إلى 255، أو RGB مثل 255,0,0، أو اسم لون CSS)',

    invalidColor:
      'قيمة اللون غير صالحة.',

    descriptionLayerPrompt:
      'أدخل اسم الطبقة المطلوب تعديل وصفها',

    descriptionValuePrompt:
      'أدخل وصف الطبقة الجديد',

    created:
      'عدد الطبقات التي تم إنشاؤها',

    alreadyExists:
      'الطبقة موجودة بالفعل',

    notFound:
      'الطبقة غير موجودة',

    cannotChangeCurrent:
      'لا يمكن إيقاف الطبقة الحالية أو تجميدها.'
  ,
    keywords: {
      ...enJig.layer.keywords,
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
      },
    },
  },

  layon: {
    ...enJig.layon,

    alreadyOn:
      'جميع الطبقات قيد التشغيل بالفعل.',

    turnedOn:
      'تم تشغيل الطبقات'
  },

  laycur: {
    ...enJig.laycur,

    prompt:
      'حدد العناصر المطلوب نقلها إلى الطبقة الحالية',

    currentLayerNotFound:
      'الطبقة الحالية غير موجودة.',

    noObjects:
      'لم يتم تحديد عناصر صالحة.',

    alreadyCurrent:
      'العناصر المحددة موجودة بالفعل على الطبقة الحالية.',

    changed:
      'تم نقل العناصر إلى الطبقة الحالية'
  },

  layfrz: {
    ...enJig.layfrz,

    prompt:
      'حدد عنصرًا على الطبقة المطلوب تجميدها أو',

    invalidSelection:
      'العنصر المحدد غير صالح.',

    settingsPrompt:
      'أدخل إعداد LAYFRZ المطلوب تغييره',

    viewportPrompt:
      'حدد سلوك التجميد داخل منفذ العرض',

    blockSelectionPrompt:
      'حدد سلوك اختيار الكتل المتداخلة',

    vpfreezeFallback:
      'العارض الحالي لا يدعم تجميد الطبقات بشكل مستقل لكل منفذ عرض؛ سيتم استخدام التجميد العادي بدلًا من ذلك.',

    nestedSelectionLimited:
      'تم حفظ إعدادات اختيار الكتل المتداخلة، لكن الاختيار الحالي ما زال يعتمد طبقة العنصر ذي المستوى الأعلى.',

    layerNotFound:
      'الطبقة غير موجودة',

    cannotFreezeCurrent:
      'لا يمكن تجميد الطبقة الحالية.',

    alreadyFrozen:
      'الطبقة مجمدة بالفعل',

    frozen:
      'تم تجميد الطبقة',

    restored:
      'تمت استعادة الطبقة',

    nothingToUndo:
      'لا توجد عملية LAYFRZ يمكن التراجع عنها.'
  ,
    keywords: {
      ...enJig.layfrz.keywords,
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
      },
    },
  },

  layiso: {
    ...enJig.layiso,

    prompt:
      'حدد عناصر على الطبقة أو الطبقات المطلوب عزلها أو',

    settingsPrompt:
      'أدخل إعداد الطبقات غير المعزولة',

    offModePrompt:
      'حدد سلوك إيقاف الطبقات غير المعزولة',

    noLayers:
      'لم يتم تحديد طبقات صالحة.',

    layerNotFound:
      'الطبقة غير موجودة',

    isolated:
      'تم عزل الطبقات',

    affectedLayers:
      'الطبقات المتأثرة',

    vpfreezeFallback:
      'العارض الحالي لا يدعم التجميد المستقل لكل منفذ عرض؛ سيتم استخدام الإيقاف بدلًا من ذلك.',

    lockFadeFallback:
      'العارض الحالي لا يدعم إظهار الطبقات بتأثير التلاشي؛ سيتم قفل الطبقات غير المعزولة دون تلاشي.'
  ,
    keywords: {
      ...enJig.layiso.keywords,
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
      },
    },
  },

  layuniso: {
    ...enJig.layuniso,

    noPrevious:
      'لا توجد حالة LAYISO سابقة لاستعادتها.',

    layerNotFound:
      'الطبقة غير موجودة',

    nothingRestored:
      'لم تتم استعادة أي تغييرات طبقات من LAYISO.',

    restored:
      'تمت استعادة الطبقات'
  },

  laythw: {
    ...enJig.laythw,

    alreadyThawed:
      'جميع الطبقات غير مجمدة بالفعل.',

    thawed:
      'تم إلغاء تجميد الطبقات'
  },

  laylck: {
    ...enJig.laylck,

    prompt:
      'حدد عنصرًا على الطبقة المطلوب قفلها',

    invalidSelection:
      'العنصر المحدد غير صالح.',

    layerNotFound:
      'الطبقة غير موجودة',

    alreadyLocked:
      'الطبقة مقفلة بالفعل',

    locked:
      'تم قفل الطبقة'
  },

  layulk: {
    ...enJig.layulk,

    prompt:
      'حدد عنصرًا على الطبقة المطلوب إلغاء قفلها',

    invalidSelection:
      'العنصر المحدد غير صالح.',

    layerNotFound:
      'الطبقة غير موجودة',

    alreadyUnlocked:
      'الطبقة غير مقفلة بالفعل',

    unlocked:
      'تم إلغاء قفل الطبقة'
  },

  layoff: {
    ...enJig.layoff,

    prompt:
      'حدد عنصرًا على الطبقة المطلوب إيقافها أو',

    invalidSelection:
      'العنصر المحدد غير صالح.',

    settingsPrompt:
      'أدخل إعداد LAYOFF المطلوب تغييره',

    viewportPrompt:
      'حدد سلوك منفذ العرض',

    blockSelectionPrompt:
      'حدد سلوك اختيار الكتل المتداخلة',

    vpfreezeFallback:
      'العارض الحالي لا يدعم إيقاف الطبقات بشكل مستقل لكل منفذ عرض؛ سيتم استخدام الإيقاف العادي بدلًا من ذلك.',

    nestedSelectionLimited:
      'تم حفظ إعدادات اختيار الكتل المتداخلة، لكن الاختيار الحالي ما زال يعتمد طبقة العنصر ذي المستوى الأعلى.',

    layerNotFound:
      'الطبقة غير موجودة',

    cannotTurnOffCurrent:
      'لا يمكن إيقاف الطبقة الحالية.',

    alreadyOff:
      'الطبقة متوقفة بالفعل',

    turnedOff:
      'تم إيقاف الطبقة',

    restored:
      'تمت استعادة الطبقة',

    nothingToUndo:
      'لا توجد عملية LAYOFF يمكن التراجع عنها.'
  ,
    keywords: {
      ...enJig.layoff.keywords,
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
      },
    },
  },

  layerp: {
    ...enJig.layerp,

    restored:
      'تمت استعادة حالة الطبقات السابقة.',

    noPreviousState:
      'لا توجد حالة طبقات سابقة لاستعادتها.'
  },

  mline: {
    ...enJig.mline,

    startPointWithOptions:
      'حدد نقطة البداية أو',

    nextPointWithOptions:
      'حدد النقطة التالية أو',

    justificationPrompt:
      'أدخل نوع المحاذاة',

    scalePrompt:
      'حدد مقياس الخط المتعدد',

    stylePrompt:
      'أدخل اسم نمط الخط المتعدد أو [?] لعرض القائمة',

    styleNotFound:
      'نمط الخط المتعدد غير موجود',

    styleListHeader:
      'أنماط الخطوط المتعددة المحملة',

    styleListEmpty:
      'لا توجد أنماط خطوط متعددة محملة في الرسم الحالي.'
  ,
    keywords: {
      ...enJig.mline.keywords,
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
      },
    },
  },

  measureAngle: {
    ...enJig.measureAngle,

    vertex:
      'حدد نقطة رأس الزاوية',

    arm1:
      'حدد نقطة على الضلع الأول',

    arm2:
      'حدد نقطة على الضلع الثاني'
  },

  measureArc: {
    ...enJig.measureArc,

    startPoint:
      'حدد نقطة بداية القوس',

    throughPoint:
      'حدد نقطة على القوس',

    endPoint:
      'حدد نقطة نهاية القوس',

    lockedEndPoint:
      'حدد نقطة نهاية القوس (استخدم Ctrl للتبديل بين القوس الأكبر والأصغر)',

    invalidPoints:
      'النقاط الثلاث على استقامة واحدة ولا يمكنها تعريف قوس.'
  },

  measureArea: {
    ...enJig.measureArea,

    firstPoint:
      'حدد النقطة الأولى',

    nextPoint:
      'حدد النقطة التالية (أو اضغط Enter للإنهاء)'
  },

  measureDistance: {
    ...enJig.measureDistance,

    firstPoint:
      'حدد النقطة الأولى',

    secondPoint:
      'حدد النقطة الثانية'
  },

  measureContinuous: {
    ...enJig.measureContinuous,

    firstPoint:
      'حدد النقطة الأولى',

    nextPoint:
      'حدد النقطة التالية (أو اضغط Enter للإنهاء)'
  },

  measurePoint: {
    ...enJig.measurePoint,

    point:
      'حدد نقطة'
  },

  measurement: {
    ...enJig.measurement,

    import: {
      ...enJig.measurement.import,

      chooseFile:
        'اختر ملف JSON جانبيًا يحتوي على القياسات'
    }
  },

  markup: {
    ...enJig.markup,

    author:
      'حدد اسم مؤلف المراجعة (سيتم حفظه للاستخدام لاحقًا)',

    text: {
      ...enJig.markup.text,

      point:
        'حدد موضع علامة النص',

      content:
        'أدخل نص علامة المراجعة'
    },

    line: {
      ...enJig.markup.line,

      firstPoint:
        'حدد النقطة الأولى لخط المراجعة',

      secondPoint:
        'حدد النقطة الثانية لخط المراجعة'
    },

    arrow: {
      ...enJig.markup.arrow,

      firstPoint:
        'حدد نقطة بداية السهم',

      secondPoint:
        'حدد رأس السهم'
    },

    cloud: {
      ...enJig.markup.cloud,

      firstCorner:
        'حدد الركن الأول للسحابة',

      secondCorner:
        'حدد الركن المقابل للسحابة'
    },

    rect: {
      ...enJig.markup.rect,

      firstCorner:
        'حدد الركن الأول للمستطيل',

      secondCorner:
        'حدد الركن المقابل للمستطيل'
    },

    circle: {
      ...enJig.markup.circle,

      center:
        'حدد مركز الدائرة',

      radius:
        'حدد نصف قطر الدائرة'
    },

    shape: {
      ...enJig.markup.shape,

      calloutOn:
        '[وسيلة الشرح مفعلة]',

      calloutOff:
        '[وسيلة الشرح معطلة]',

      calloutAnchor:
        'حدد موضع نص وسيلة الشرح'
    ,
      keywords: {
        ...enJig.markup.shape.keywords,
        callout: {
          display: 'تعليق توضيحي(C)',
          local: 'تعليق توضيحي',
          global: 'Callout'
        },
        noCallout: {
          display: 'بدون تعليق توضيحي(N)',
          local: 'بدون تعليق توضيحي',
          global: 'NoCallout'
        },
      },
    },

    highlight: {
      ...enJig.markup.highlight,

      firstCorner:
        'حدد الركن الأول لمنطقة التمييز',

      secondCorner:
        'حدد الركن المقابل لمنطقة التمييز'
    },

    callout: {
      ...enJig.markup.callout,

      tip:
        'حدد رأس خط التوجيه، أو حدد إطار سحابة/مستطيل/دائرة بدون تعليق توضيحي',

      anchor:
        'حدد موضع نص وسيلة الشرح',

      content:
        'أدخل نص وسيلة الشرح'
    },

    stamp: {
      ...enJig.markup.stamp,

      kind:
        'أدخل معرّف الختم [approved/rejected/revised/for-review/custom]',

      imageUrl:
        'أدخل رابط صورة الختم المخصص (اختياري)',

      caption:
        'أدخل تسمية الختم (اختياري)',

      point:
        'حدد نقطة إدراج الختم'
    },

    import: {
      ...enJig.markup.import,

      chooseFile:
        'اختر ملف JSON جانبيًا يحتوي على علامات المراجعة'
    }
  },

  pngout: {
    ...enJig.pngout,

    boundsFirstCorner:
      'حدد الركن الأول لحدود الصورة',

    boundsSecondCorner:
      'حدد الركن المقابل',

    longSidePrompt:
      'أدخل حجم الضلع الأطول بالبكسل'
  },

  imageattach: {
    ...enJig.imageattach,

    insertionPoint:
      'حدد نقطة الإدراج:',

    scale:
      'حدد معامل المقياس:',

    rotation:
      'حدد زاوية الدوران:',

    invalidScale:
      'يجب أن يكون معامل المقياس أكبر من 0.',

    decodeFailed:
      'فشلت قراءة ملف الصورة المحدد.'
  },

  insert: {
    ...enJig.insert,

    blockName:
      'أدخل اسم الكتلة:',

    insertionPoint:
      'حدد نقطة الإدراج:',

    scale:
      'حدد معامل المقياس:',

    rotation:
      'حدد زاوية الدوران:',

    invalidScale:
      'يجب أن يكون معامل المقياس أكبر من 0.',

    invalidBlockName:
      'اسم الكتلة غير صالح.',

    blockNotFound:
      'الكتلة غير موجودة',

    xrefNotAllowed:
      'لا يمكن إدراج مرجع خارجي باستخدام -INSERT.'
  },

  xattach: {
    ...enJig.xattach,

    insertionPoint:
      'حدد نقطة الإدراج:',

    scale:
      'حدد معامل المقياس:',

    rotation:
      'حدد زاوية الدوران:',

    invalidScale:
      'يجب أن يكون معامل المقياس أكبر من 0.',

    unsupportedFile:
      'اختر ملف DWG أو DXF.',

    loading:
      'جارٍ تحميل المرجع الخارجي...',

    loadFailed:
      'فشلت قراءة ملف الرسم المحدد.'
  },

  revcloud: {
    ...enJig.revcloud,

    firstCornerOrOptions:
      'حدد نقطة الركن الأول أو',

    firstCorner:
      'حدد نقطة الركن الأول',

    oppositeCorner:
      'حدد الركن المقابل',

    startPoint:
      'حدد نقطة البداية',

    nextPoint:
      'حدد النقطة التالية',

    nextPointOrUndo:
      'حدد النقطة التالية أو',

    firstPoint:
      'حدد النقطة الأولى',

    guideCursor:
      'حرّك المؤشر على مسار السحابة (اضغط Enter للإنهاء)',

    arcLength:
      'حدد طول القوس',

    selectObject:
      'حدد عنصرًا',

    style:
      'أدخل نمط أقواس سحابة المراجعة',

    reverseDirection:
      'اعكس الاتجاه',

    invalidArcLength:
      'يجب أن يكون طول القوس أكبر من 0.',

    invalidObject:
      'لا يمكن تحويل العنصر المحدد إلى سحابة مراجعة.'
  ,
    keywords: {
      ...enJig.revcloud.keywords,
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
      },
    },
  },

  sketch: {
    ...enJig.sketch,

    specifySketch:
      'حدد الرسم الحر أو',

    sketching:
      'حرّك المؤشر للرسم (انقر أو اضغط Enter للإيقاف)',

    type:
      'أدخل نوع الرسم الحر',

    increment:
      'حدد مقدار زيادة الرسم',

    tolerance:
      'حدد سماحية منحنى Spline',

    firstPoint:
      'حدد النقطة الأولى',

    nextPoint:
      'حدد نقطة النهاية'
  ,
    keywords: {
      ...enJig.sketch.keywords,
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
      },
    },
  },

  sysvar: {
    ...enJig.sysvar,

    prompt:
      'أدخل القيمة الجديدة'
  },

  chtml: {
    ...enJig.chtml,

    exportInvisibleLayers:
      'تصدير الطبقات غير المرئية',

    exportLayouts:
      'تصدير المخططات',

    initialView:
      'العرض الأولي عند فتح HTML',

    viewerMode:
      'وضع العارض دون اتصال'
  ,
    keywords: {
      ...enJig.chtml.keywords,
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
    },
  }
}