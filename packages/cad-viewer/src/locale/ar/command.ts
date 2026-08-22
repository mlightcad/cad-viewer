import enCommand from '../en/command'

export default {
  ...enCommand,

  ACAD: {
    ...enCommand.ACAD,

    hatch: {
      ...enCommand.ACAD.hatch,
      description:
        'إنشاء تعبئة تهشير باستخدام سير عمل سياقي عبر الشريط'
    },

    layer: {
      ...enCommand.ACAD.layer,
      description:
        'فتح مدير خصائص الطبقات'
    },

    md: {
      ...enCommand.ACAD.md,
      description:
        'فتح لوحة الموارد المفقودة والخارجية للخطوط والصور والمراجع الخارجية'
    },

    xref: {
      ...enCommand.ACAD.xref,
      description:
        'فتح لوحة الموارد المفقودة والخارجية على تبويب المراجع الخارجية'
    },

    properties: {
      ...enCommand.ACAD.properties,
      description:
        'فتح لوحة خصائص العناصر'
    },

    countlist: {
      ...enCommand.ACAD.countlist,
      description:
        'فتح لوحة العد لعرض الكتل التي تم عدها وإدارتها'
    },

    mem: {
      ...enCommand.ACAD.mem,
      description:
        'فتح لوحة ملف تعريف الذاكرة لتحليل استخدام الرسم للذاكرة'
    },

    pttype: {
      ...enCommand.ACAD.pttype,
      description:
        'تحديد نمط عرض عناصر النقاط وحجمها'
    },

    qselect: {
      ...enCommand.ACAD.qselect,
      description:
        'إنشاء مجموعة تحديد عن طريق تصفية العناصر وفق النوع وشروط الخصائص'
    },

    units: {
      ...enCommand.ACAD.units,
      description:
        'تحديد تنسيقات وحدات الطول والزوايا والدقة واتجاه الزاوية ووحدات مقياس الإدراج'
    },

    style: {
      ...enCommand.ACAD.style,
      description:
        'إنشاء أنماط النص وتعديلها وتحديدها للنص والنص متعدد الأسطر'
    },

    attedit: {
      ...enCommand.ACAD.attedit,
      description:
        'تعديل قيم السمات وخصائص عرض سمات مرجع الكتلة'
    },

    attdef: {
      ...enCommand.ACAD.attdef,
      description:
        'إنشاء تعريف سمة لاستخدامه داخل كتلة'
    }
  },

  USER: {
    ...enCommand.USER
  }
}