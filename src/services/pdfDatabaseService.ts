// PDF Database Service - 管理 PDF 解析結果的數據庫操作

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  PDF2JSONOutput,
  PDFDocumentRecord,
  DetectedFieldRecord,
  TableStructureRecord,
} from "@/types/pdf2json";
import { FieldArea } from "@/types";

/**
 * PDF 數據庫服務
 * 用於存儲和檢索 PDF2JSON 解析結果
 */
export class PDFDatabaseService {
  /**
   * 保存 PDF 文檔和解析結果
   */
  static async savePDFDocument(
    filename: string,
    pdfData: PDF2JSONOutput,
    fields: FieldArea[]
  ): Promise<string> {
    const documentId = this.generateId();

    const document: PDFDocumentRecord = {
      id: documentId,
      filename,
      title: pdfData.Meta?.Title,
      author: pdfData.Meta?.Author,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfMeta: pdfData.Meta || ({} as any),
      rawData: pdfData,
      pageCount: pdfData.Pages.length,
      status: "processed",
    };

    // 在實際應用中，這裡會將數據保存到數據庫
    // 目前先返回 JSON 格式用於開發
    console.log("Saving PDF document:", {
      id: documentId,
      filename,
      pageCount: pdfData.Pages.length,
      fieldsCount: fields.length,
    });

    // 保存檢測到的欄位
    await this.saveDetectedFields(documentId, fields);

    return documentId;
  }

  /**
   * 保存檢測到的欄位
   */
  static async saveDetectedFields(
    documentId: string,
    fields: FieldArea[]
  ): Promise<void> {
    const fieldRecords: DetectedFieldRecord[] = fields.map((field) => {
      // 從 field.id 解析頁面、行、列索引
      // 格式: field-p{pageIndex}-r{rowIndex}-c{colIndex}
      const match = field.id.match(/field-p(\d+)-r(\d+)-c(\d+)/);
      const pageIndex = match ? parseInt(match[1]) : 0;
      const rowIndex = match ? parseInt(match[2]) : 0;
      const colIndex = match ? parseInt(match[3]) : 0;

      return {
        id: this.generateId(),
        documentId,
        pageIndex,
        rowIndex,
        colIndex,
        fieldName: field.name,
        fieldValue: field.defaultValue || "",
        position: field.position,
        size: field.size,
        fieldType: field.fieldType,
        confidence: 1.0,
        createdAt: new Date(),
      };
    });

    console.log(`Saving ${fieldRecords.length} detected fields`);

    // 在實際應用中，這裡會批量插入到數據庫
    // 目前先輸出到控制台
  }

  /**
   * 保存表格結構信息
   */
  static async saveTableStructure(
    documentId: string,
    pageIndex: number,
    structure: {
      rows: number;
      columns: number;
      strategy: "fills" | "lines" | "text";
      horizontalLines: number;
      verticalLines: number;
      columnBoundaries: number[];
      rowBoundaries: number[];
    }
  ): Promise<string> {
    const structureId = this.generateId();

    const record: TableStructureRecord = {
      id: structureId,
      documentId,
      pageIndex,
      rows: structure.rows,
      columns: structure.columns,
      detectionStrategy: structure.strategy,
      gridData: {
        horizontalLines: structure.horizontalLines,
        verticalLines: structure.verticalLines,
        columnBoundaries: structure.columnBoundaries,
        rowBoundaries: structure.rowBoundaries,
      },
      createdAt: new Date(),
    };

    console.log("Saving table structure:", {
      id: structureId,
      pageIndex,
      rows: structure.rows,
      columns: structure.columns,
      strategy: structure.strategy,
    });

    return structureId;
  }

  /**
   * 獲取文檔的所有欄位
   */
  static async getDocumentFields(
    documentId: string
  ): Promise<DetectedFieldRecord[]> {
    // 在實際應用中，從數據庫查詢
    console.log(`Fetching fields for document: ${documentId}`);
    return [];
  }

  /**
   * 獲取文檔信息
   */
  static async getDocument(
    documentId: string
  ): Promise<PDFDocumentRecord | null> {
    // 在實際應用中，從數據庫查詢
    console.log(`Fetching document: ${documentId}`);
    return null;
  }

  /**
   * 導出為 JSON 文件
   */
  static exportToJSON(
    filename: string,
    pdfData: PDF2JSONOutput,
    fields: FieldArea[]
  ): string {
    const exportData = {
      metadata: {
        filename,
        exportDate: new Date().toISOString(),
        version: "1.0",
      },
      pdfInfo: {
        title: pdfData.Meta?.Title,
        author: pdfData.Meta?.Author,
        pageCount: pdfData.Pages.length,
      },
      pages: pdfData.Pages.map((page, pageIndex) => {
        const pageFields = fields.filter((f) => {
          const match = f.id.match(/field-p(\d+)-/);
          return match && parseInt(match[1]) === pageIndex;
        });

        return {
          pageIndex,
          dimensions: {
            width: page.Width,
            height: page.Height,
          },
          structure: {
            horizontalLines: page.HLines?.length || 0,
            verticalLines: page.VLines?.length || 0,
            fills: page.Fills?.length || 0,
            texts: page.Texts?.length || 0,
          },
          fields: pageFields.map((f) => ({
            id: f.id,
            name: f.name,
            value: f.defaultValue,
            position: f.position,
            size: f.size,
            type: f.fieldType,
          })),
        };
      }),
      rawData: pdfData,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 生成唯一 ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
