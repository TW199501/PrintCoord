// PrintCoord - 主要匯出文件

// 主要組件
export { default as TemplateManager } from "./TemplateManager";
export { default as TemplateEditor } from "./components/TemplateEditor";
export { default as FileUpload } from "./components/FileUpload";
export { default as BatchUpload } from "./components/BatchUpload";
export { default as FieldSuggestions } from "./components/FieldSuggestions";

// 服務類
export { OCRService } from "./services/ocrService";
export { FieldDetectionService } from "./services/fieldDetection";
export { SmartSuggestionsService } from "./services/smartSuggestions";
export { UserBehaviorTracker } from "./services/userBehaviorTracker";
export { BatchProcessorService } from "./services/batchProcessor";
export { FileProcessingService } from "./services/fileProcessing";

// 類型定義
export type {
  Position,
  Size,
  FieldArea,
  FieldValidation,
  TemplateConfig,
  TemplateData,
  ProcessedTemplate,
  FileUploadResult,
  CanvasField,
  OCRResult,
  OCRSettings,
  SuggestionResult,
  BatchProcessItem,
  BehaviorExportData,
  UserAction,
  FieldChoiceRecord,
  BehaviorPattern,
} from "./types";

export { FieldType, FileType, OCRStatus } from "./types";

// 版本信息
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@tabletemplate/pro";

// 預設配置
export const DEFAULT_CONFIG = {
  maxFileSize: 10, // MB
  supportedFormats: [".doc", ".docx", ".pdf"],
  ocrLanguage: "eng+chi_tra",
  minConfidence: 0.6,
  concurrency: 4,
};
