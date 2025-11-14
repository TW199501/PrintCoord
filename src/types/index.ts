// PrintCoord - 類型定義

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface FieldArea {
  id: string;
  name: string;
  labelZh?: string;
  position: Position;
  size: Size;
  fieldType: FieldType;
  defaultValue?: string;
  validation?: FieldValidation;
}

export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  SELECT = "select",
  CHECKBOX = "checkbox",
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  originalFileName: string;
  fileType: FileType;
  pageSize: Size;
  fields: FieldArea[];
  createdAt: Date;
  updatedAt: Date;
}

export enum FileType {
  DOC = "doc",
  DOCX = "docx",
  PDF = "pdf",
}

export interface TemplateData {
  [fieldId: string]: any;
}

export interface ProcessedTemplate {
  config: TemplateConfig;
  canvasData: string; // Base64 encoded canvas
  thumbnail?: string;
}

// 文件上傳相關
export interface PdfPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

export interface FileUploadResult {
  success: boolean;
  file?: File;
  error?: string;
  html?: string; // DOCX 轉換後的 HTML
  messages?: any[]; // Mammoth 轉換消息
  pdfPages?: PdfPage[]; // PDF 頁面數據
}

// Canvas 相關
export interface CanvasField {
  id: string;
  type: "rect" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  text?: string;
}

// OCR 結果
export interface OCRResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, width, height
}

// OCR 處理狀態
export enum OCRStatus {
  IDLE = "idle",
  INITIALIZING = "initializing",
  PROCESSING = "processing",
  COMPLETED = "completed",
  ERROR = "error",
}

// OCR 設定
export interface OCRSettings {
  language: string; // 語言，如 'eng+chi_tra'
  minConfidence: number; // 最小置信度
  mergeThreshold: number; // 文字合併閾值
  enablePreprocessing: boolean; // 是否啟用預處理
}

// 建議結果介面
export interface SuggestionResult {
  fieldType: FieldType;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    fieldType: FieldType;
    confidence: number;
  }>;
}

// 批量處理
export interface BatchProcessItem {
  id: string;
  templateId: string;
  data: TemplateData;
  status: "pending" | "processing" | "completed" | "error";
  result?: string; // Generated file path
  error?: string;
}

// 用戶行為匯出資料
export interface BehaviorExportData {
  actions: UserAction[];
  fieldChoices: FieldChoiceRecord[];
  patterns: BehaviorPattern;
  stats: {
    totalSessions: number;
    totalFieldChoices: number;
    averageSessionTime: number;
    mostUsedFieldType: FieldType;
    lastActivity: Date | null;
  };
}

// 用戶動作記錄
export interface UserAction {
  action: string;
  timestamp: Date;
  data: any;
}

// 欄位選擇記錄
export interface FieldChoiceRecord {
  text: string;
  context: string[];
  suggestedType: FieldType;
  chosenType: FieldType;
  accepted: boolean;
  confidence: number;
  responseTime: number;
}

// 行為模式分析
export interface BehaviorPattern {
  preferredFieldTypes: Record<FieldType, number>;
  acceptanceRate: number;
  averageResponseTime: number;
  commonCorrections: Array<{
    fromType: FieldType;
    toType: FieldType;
    frequency: number;
  }>;
}
