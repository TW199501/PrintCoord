// PDF2JSON 數據結構類型定義
// 用於存儲和處理 PDF 解析結果

/**
 * PDF2JSON 元數據
 */
export interface PDF2JSONMeta {
  PDFFormatVersion: string;
  IsAcroFormPresent: boolean;
  IsXFAPresent: boolean;
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  Metadata?: Record<string, any>;
}

/**
 * 文字元素
 */
export interface PDF2JSONText {
  x: number;
  y: number;
  w?: number;
  clr?: number;
  oc?: string;
  A?: "left" | "center" | "right";
  R: Array<{
    T: string; // 文字內容（URL encoded）
    S?: number; // 樣式索引
    TS?: number[]; // [fontFaceId, fontSize, bold, italic]
    RA?: number; // 旋轉角度
  }>;
}

/**
 * 線條元素
 */
export interface PDF2JSONLine {
  x: number;
  y: number;
  w: number; // 線條寬度
  l: number; // 線條長度
  clr?: number;
  oc?: string;
  dsh?: number; // 虛線標記
}

/**
 * 填充元素（可能是背景或線條）
 */
export interface PDF2JSONFill {
  x: number;
  y: number;
  w: number;
  h: number;
  clr?: number;
  oc?: string;
}

/**
 * 表單欄位
 */
export interface PDF2JSONField {
  x: number;
  y: number;
  w: number;
  h: number;
  style?: number;
  T?: {
    Name: string;
    TypeInfo?: Record<string, any>;
  };
  id?: {
    Id: string;
    EN?: number;
  };
  V?: string; // 欄位值
  TU?: string; // 替代文字（accessibility）
}

/**
 * 頁面數據
 */
export interface PDF2JSONPage {
  Width: number;
  Height: number;
  HLines: PDF2JSONLine[];
  VLines: PDF2JSONLine[];
  Fills: PDF2JSONFill[];
  Texts: PDF2JSONText[];
  Fields?: PDF2JSONField[];
  Boxsets?: any[];
}

/**
 * 完整的 PDF2JSON 輸出
 */
export interface PDF2JSONOutput {
  Transcoder?: string;
  Meta?: PDF2JSONMeta;
  Pages: PDF2JSONPage[];
}

/**
 * PDF2JSON 數據（parsePDF 返回的類型，與 PDF2JSONOutput 相同）
 */
export type PDF2JSONData = PDF2JSONOutput;

/**
 * 用於數據庫存儲的 PDF 文檔記錄
 */
export interface PDFDocumentRecord {
  id: string;
  filename: string;
  title?: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  pdfMeta: PDF2JSONMeta;
  rawData: PDF2JSONOutput;
  pageCount: number;
  status: "pending" | "processed" | "error";
}

/**
 * 用於數據庫存儲的檢測欄位記錄
 */
export interface DetectedFieldRecord {
  id: string;
  documentId: string;
  pageIndex: number;
  rowIndex: number;
  colIndex: number;
  fieldName: string;
  fieldValue: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  fieldType: string;
  confidence?: number;
  createdAt: Date;
}

/**
 * 表格結構記錄
 */
export interface TableStructureRecord {
  id: string;
  documentId: string;
  pageIndex: number;
  rows: number;
  columns: number;
  detectionStrategy: "fills" | "lines" | "text";
  gridData: {
    horizontalLines: number;
    verticalLines: number;
    columnBoundaries: number[];
    rowBoundaries: number[];
  };
  createdAt: Date;
}
