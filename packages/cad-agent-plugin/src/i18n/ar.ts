/**
 * Arabic UI strings for the CAD Agent panel.
 */
export const agentAr = {
  tab: 'الوكيل',
  title: 'وكيل CAD',

  settings: 'الإعدادات',
  clear: 'مسح',
  close: 'إغلاق',

  provider: 'المزوّد',

  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (رؤية)',

  providerDeepseekVlHint:
    'يستخدم نقطة نهاية للرؤية متوافقة مع OpenAI (الافتراضي: SiliconFlow). عند استخدام vLLM مستضاف محليًا، اضبط Base URL على عنوان الخادم، مثل http://127.0.0.1:8000/v1.',

  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',

  providerOpenaiCompatible:
    'متوافق مع OpenAI',

  baseUrl:
    'عنوان Base URL',

  model:
    'النموذج',

  visionModels:
    'نماذج الرؤية',

  textModels:
    'نماذج نصية فقط',

  customModel:
    'نموذج مخصص…',

  customModelName:
    'اسم النموذج المخصص',

  modelSupportsVision:
    'يدعم إدخال الصور',

  modelTextOnly:
    'نصي فقط — تم تعطيل إرفاق الصور',

  apiKey:
    'مفتاح API',

  saveSettings:
    'حفظ الإعدادات',

  emptyHint:
    'صف ما تريد رسمه، أو أرفق صورة مرجعية مثل رسم تخطيطي أو لقطة شاشة أو مخطط معماري.',

  toolPrefix:
    'أداة',

  inputPlaceholder:
    'صف الهندسة التي تريد إنشاءها…',

  attachImage:
    'إرفاق صورة',

  removeAttachment:
    'إزالة',

  imageAlt:
    'الصورة المرفقة',

  errorTitle:
    'حدث خطأ',

  dismissError:
    'إغلاق الخطأ',

  send:
    'إرسال',

  stop:
    'إيقاف',

  working:
    'جارٍ العمل…',

  agentMode:
    'وضع الوكيل',

  agentModeSimple:
    'بسيط',

  agentModeHighInference:
    'استدلال متقدم',

  agentModeSimpleHint:
    'سريع — بدون التحقق من الرسم باستخدام لقطة شاشة بعد الإنشاء.',

  agentModeHighInferenceHint:
    'يتحقق من الرسم باستخدام لقطة شاشة ونموذج رؤية، حتى 5 محاولات. يتطلب نموذجًا يدعم الرؤية.',

  highInferenceRequiresVision:
    'وضع الاستدلال المتقدم يتطلب نموذجًا يدعم الرؤية.',

  verificationTitle:
    'التحقق من الرسم',

  verifying:
    'جارٍ مقارنة لقطة شاشة الرسم بطلبك والصور المرجعية…',

  verificationPassed:
    'نجح التحقق — الرسم يطابق الطلب.',

  verificationFailed:
    'فشل التحقق — تم العثور على مشكلات:',

  verificationSkipped:
    'تم تخطي التحقق',

  verificationError:
    'حدث خطأ أثناء التحقق',

  verificationContinuing:
    'جارٍ متابعة تحسين الرسم…',

  verificationMaxAttempts:
    'لم ينجح التحقق خلال الحد الأقصى لعدد المحاولات.',

  referenceImages:
    'الصور المرجعية',

  drawingScreenshot:
    'لقطة شاشة الرسم الحالي',

  unsavedSettings:
    'احفظ الإعدادات قبل إرسال الرسائل.',

  missingApiKey:
    'اضبط مفتاح API في الإعدادات قبل إرسال الرسائل.'
} as const