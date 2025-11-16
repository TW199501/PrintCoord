// i18n.d.ts - i18n Ally 生成的類型定義
// 這個文件會被 i18n Ally 自動更新

interface CommonMessages {
  brand: string;
  tagline: string;
  nav: {
    home: string;
    invoice: string;
  };
  language: {
    label: string;
    enUS: string;
    zhTW: string;
    zhCN: string;
  };
  theme: {
    toggle: string;
    accent: string;
  };
  accent: {
    label: string;
    indigo: string;
    violet: string;
    blue: string;
    teal: string;
    green: string;
    amber: string;
    rose: string;
  };
  hero: {
    title: string;
    description: string;
    cta: string;
  };
  footer: {
    about: string;
    rights: string;
  };
  'no-file-selected': string;
}

interface TemplatesMessages {
  upload: {
    title: string;
    description: string;
  };
  edit: {
    title: string;
    description: string;
  };
  preview: {
    title: string;
    description: string;
  };
  scan: {
    scanning: string;
    noCanvas: string;
    failed: string;
    finished: string;
  };
  stepIndicator: {
    step: (params: { number: string }) => string;  // ✅ 修復：正確的帶參數函數類型
    scanning: string;
    reset: string;
    previous: string;
    next: string;
    complete: string;
  };
  template: {
    unnamed: string;
    saved: string;
  };
  errors: {
    ocrInitFailed: string;
    noCanvas: string;
    scanFailed: string;
  };
  logs: {
    ocrReady: string;
    borderDetectionSuccess: string;
    borderDetectionFailed: string;
    pdfParsingFailed: string;
    ocrFallback: string;
    batchComplete: string;
  };
  header: {
    brand: string;
    tagline: string;
  };
  workflowContent: {
    tabs: {
      single: string;
      batch: string;
    };
    steps: {
      upload: {
        title: string;
        description: string;
      };
    };
    fileInfo: {
      title: string;
      name: string;
      status: string;
      success: string;
      failed: string;
      size: string;
    };
    pdfPreview: {
      title: string;
      totalPages: string;
      page: string;
      alt: string;
      success: string;
      nextStep: string;
    };
    fields: {
      title: string;
      list: string;
    };
    template: {
      settings: string;
      name: string;
      namePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      originalFile: string;
      fieldCount: string;
    };
    canvas: {
      batchPreview: string;
      uploadPreview: string;
      editArea: string;
      batchNotice: string;
      ocrPreparing: string;
      uploadInstruction: string;
    };
  };
  fieldMappings: {
    姓名: string;
    性別: string;
    性别: string;
    出生年月日: string;
    出生日期: string;
    生日: string;
    身分證字號: string;
    身份证号: string;
    電話: string;
    电话: string;
    手機: string;
    手机: string;
    地址: string;
    住址: string;
    郵遞區號: string;
    邮递区号: string;
    電子郵件: string;
    申請人: string;
    申请人: string;
    申請單位: string;
    申请单位: string;
    單位: string;
    部門: string;
    日期: string;
  };
}

type Messages = CommonMessages & TemplatesMessages;

declare module 'next-intl' {
  export interface AppMessages extends Messages {}
}