// TableTemplate Pro - 欄位檢測服務

import { OCRResult, FieldArea, FieldType } from '../types';
import { OCRService } from './ocrService';

export class FieldDetectionService {
  /**
   * 從 OCR 結果中檢測可能的欄位
   */
  static async detectFieldsFromOCR(
    ocrResults: OCRResult[],
    imageWidth: number,
    imageHeight: number
  ): Promise<FieldArea[]> {
    const fields: FieldArea[] = [];

    // 1. 過濾和清理 OCR 結果
    const filteredResults = OCRService.filterByConfidence(ocrResults, 60);
    const mergedResults = OCRService.mergeNearbyTextRegions(filteredResults, 15);

    // 2. 分析可能的欄位類型
    for (const result of mergedResults) {
      const fieldType = this.inferFieldType(result.text);
      if (fieldType !== FieldType.TEXT) { // 只為非普通文字的欄位創建建議
        const fieldPositionX = Math.max(0, Math.min(result.bbox[0], imageWidth));
        const fieldPositionY = Math.max(0, Math.min(result.bbox[1], imageHeight));
        const fieldWidth = Math.min(result.bbox[2], Math.max(imageWidth - fieldPositionX, 0));
        const fieldHeight = Math.min(result.bbox[3], Math.max(imageHeight - fieldPositionY, 0));

        const field: FieldArea = {
          id: `detected_${Date.now()}_${Math.random()}`,
          name: result.text.trim(),
          position: {
            x: fieldPositionX,
            y: fieldPositionY
          },
          size: {
            width: fieldWidth,
            height: fieldHeight
          },
          fieldType,
          defaultValue: this.getDefaultValue(fieldType)
        };
        fields.push(field);
      }
    }

    // 3. 為檢測到的欄位創建輸入區域（稍微大一點的區域）
    const inputFields = this.createInputFieldsForDetectedText(
      mergedResults,
      imageWidth,
      imageHeight
    );
    fields.push(...inputFields);

    return fields;
  }

  /**
   * 根據文字內容推斷欄位類型
   */
  private static inferFieldType(text: string): FieldType {
    const cleanText = OCRService.cleanText(text).toLowerCase();

    // 日期相關
    if (this.isDateField(cleanText)) {
      return FieldType.DATE;
    }

    // 數字相關
    if (this.isNumberField(cleanText)) {
      return FieldType.NUMBER;
    }

    // 選擇相關
    if (this.isSelectField(cleanText)) {
      return FieldType.SELECT;
    }

    // 核取方塊
    if (this.isCheckboxField(cleanText)) {
      return FieldType.CHECKBOX;
    }

    return FieldType.TEXT;
  }

  /**
   * 檢查是否為日期欄位
   */
  private static isDateField(text: string): boolean {
    const dateKeywords = ['date', '日期', '時間', '年', '月', '日', '日期', '發票日期', '到期日'];
    return dateKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為數字欄位
   */
  private static isNumberField(text: string): boolean {
    const numberKeywords = ['amount', '金額', '總額', '數量', '價格', 'qty', '總計', '小計'];
    return numberKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為選擇欄位
   */
  private static isSelectField(text: string): boolean {
    const selectKeywords = ['type', '類型', '種類', '選擇', '選項', 'category'];
    return selectKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為核取方塊欄位
   */
  private static isCheckboxField(text: string): boolean {
    const checkboxKeywords = ['yes/no', '是/否', '同意', '確認', '核准'];
    return checkboxKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 為推斷的欄位類型提供預設值
   */
  private static getDefaultValue(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.DATE:
        return new Date().toISOString().split('T')[0];
      case FieldType.NUMBER:
        return '0';
      case FieldType.CHECKBOX:
        return 'false';
      default:
        return '';
    }
  }

  /**
   * 為檢測到的文字創建輸入欄位
   */
  private static createInputFieldsForDetectedText(
    ocrResults: OCRResult[],
    imageWidth: number,
    imageHeight: number
  ): FieldArea[] {
    const fields: FieldArea[] = [];

    ocrResults.forEach((result, index) => {
      // 創建一個稍微大一點的輸入區域
      const baseX = Math.max(0, Math.min(result.bbox[0] - 10, imageWidth));
      const baseY = Math.max(0, Math.min(result.bbox[1] + result.bbox[3] + 5, imageHeight));
      const width = Math.min(Math.max(result.bbox[2], 150), Math.max(imageWidth - baseX, 0));
      const height = Math.min(30, Math.max(imageHeight - baseY, 0));

      const field: FieldArea = {
        id: `input_${Date.now()}_${index}`,
        name: `欄位 ${index + 1}`,
        position: {
          x: baseX,
          y: baseY // 在文字下方 5px 處
        },
        size: {
          width,
          height
        },
        fieldType: FieldType.TEXT,
        defaultValue: ''
      };

      fields.push(field);
    });

    return fields;
  }

  /**
   * 分析表格結構並建議欄位佈局
   */
  static analyzeTableStructure(ocrResults: OCRResult[]): {
    columns: number;
    rows: number;
    suggestedFields: FieldArea[];
  } {
    if (ocrResults.length === 0) {
      return { columns: 0, rows: 0, suggestedFields: [] };
    }

    // 根據 Y 座標分組（行）
    const rows = this.groupByRows(ocrResults);

    // 根據 X 座標分析列
    const columns = this.analyzeColumns(ocrResults);

    // 生成建議的欄位佈局
    const suggestedFields = this.generateTableFields(rows, columns);

    return {
      columns: columns.length,
      rows: rows.length,
      suggestedFields
    };
  }

  /**
   * 按行分組文字
   */
  private static groupByRows(results: OCRResult[], rowTolerance: number = 20): OCRResult[][] {
    const sorted = results.sort((a, b) => a.bbox[1] - b.bbox[1]);
    const rows: OCRResult[][] = [];

    sorted.forEach(result => {
      let foundRow = false;

      for (const row of rows) {
        if (row.length > 0) {
          const rowY = row[0].bbox[1];
          if (Math.abs(result.bbox[1] - rowY) < rowTolerance) {
            row.push(result);
            foundRow = true;
            break;
          }
        }
      }

      if (!foundRow) {
        rows.push([result]);
      }
    });

    return rows;
  }

  /**
   * 分析列結構
   */
  private static analyzeColumns(results: OCRResult[]): number[] {
    const xPositions = results.map(r => r.bbox[0]).sort((a, b) => a - b);
    const columns: number[] = [];

    xPositions.forEach(x => {
      const existingColumn = columns.find(col => Math.abs(x - col) < 50);
      if (!existingColumn) {
        columns.push(x);
      }
    });

    return columns.sort((a, b) => a - b);
  }

  /**
   * 生成表格欄位佈局
   */
  private static generateTableFields(rows: OCRResult[][], columns: number[]): FieldArea[] {
    const fields: FieldArea[] = [];

    rows.forEach((row, rowIndex) => {
      columns.forEach((colX, colIndex) => {
        // 查找此位置是否有文字
        const cellText = row.find(cell =>
          Math.abs(cell.bbox[0] - colX) < 50 &&
          cell.bbox[1] >= row[0].bbox[1] - 10 &&
          cell.bbox[1] <= row[0].bbox[1] + 10
        );

        if (cellText) {
          const field: FieldArea = {
            id: `table_${rowIndex}_${colIndex}`,
            name: cellText.text.trim() || `欄位 ${rowIndex + 1}-${colIndex + 1}`,
            position: {
              x: colX - 5,
              y: cellText.bbox[1] + cellText.bbox[3] + 10
            },
            size: {
              width: 120,
              height: 25
            },
            fieldType: this.inferFieldType(cellText.text),
            defaultValue: this.getDefaultValue(this.inferFieldType(cellText.text))
          };

          fields.push(field);
        }
      });
    });

    return fields;
  }
}
