// PrintCoord - 欄位檢測服務

/* eslint-disable @typescript-eslint/no-unused-vars */

import { OCRResult, FieldArea, FieldType } from "../types";
import { OCRService } from "./ocrService";

export class FieldDetectionService {
  /**
   * 從 OCR 結果中檢測可能的欄位
   */
  static async detectFieldsFromLayout(
    layoutData: { words: OCRResult[]; lines: OCRResult[]; blocks: OCRResult[] },
    imageWidth: number,
    _imageHeight: number
  ): Promise<FieldArea[]> {
    const { words, lines } = layoutData;

    // 1. 偵測水平線和垂直線
    const horizontalLines = (lines || []).filter(
      (line) => line.bbox.x1 - line.bbox.x0 > (line.bbox.y1 - line.bbox.y0) * 2
    );
    const verticalLines = (lines || []).filter(
      (line) => line.bbox.y1 - line.bbox.y0 > (line.bbox.x1 - line.bbox.x0) * 2
    );

    // 2. 確定格線座標
    const yCoords = [
      0,
      ...horizontalLines.map((l) => l.bbox.y0),
      imageHeight,
    ].sort((a, b) => a - b);
    const xCoords = [
      0,
      ...verticalLines.map((l) => l.bbox.x0),
      imageWidth,
    ].sort((a, b) => a - b);

    const mergeCloseCoords = (
      coords: number[],
      threshold: number = 5
    ): number[] => {
      if (coords.length === 0) return [];
      const sortedCoords = [...new Set(coords)].sort((a, b) => a - b);
      const merged = [sortedCoords[0]];
      for (let i = 1; i < sortedCoords.length; i++) {
        if (sortedCoords[i] - merged[merged.length - 1] > threshold) {
          merged.push(sortedCoords[i]);
        }
      }
      return merged;
    };

    const uniqueY = mergeCloseCoords(
      yCoords.filter((y) => y !== undefined) as number[]
    );
    const uniqueX = mergeCloseCoords(
      xCoords.filter((x) => x !== undefined) as number[]
    );

    // 3. 重建儲存格
    const cells: {
      x: number;
      y: number;
      width: number;
      height: number;
      words: OCRResult[];
    }[] = [];
    for (let i = 0; i < uniqueY.length - 1; i++) {
      for (let j = 0; j < uniqueX.length - 1; j++) {
        const y = uniqueY[i];
        const nextY = uniqueY[i + 1];
        const x = uniqueX[j];
        const nextX = uniqueX[j + 1];

        const cell = {
          x: x,
          y: y,
          width: nextX - x,
          height: nextY - y,
          words: [],
        };

        // 過濾掉太小的儲存格
        if (cell.width < 10 || cell.height < 10) continue;

        cells.push(cell);
      }
    }

    // 4. 配對文字與儲存格
    words.forEach((word) => {
      const wordCenterX = word.bbox[0] + word.bbox[2] / 2;
      const wordCenterY = word.bbox[1] + word.bbox[3] / 2;

      for (const cell of cells) {
        if (
          wordCenterX >= cell.x &&
          wordCenterX <= cell.x + cell.width &&
          wordCenterY >= cell.y &&
          wordCenterY <= cell.y + cell.height
        ) {
          cell.words.push(word);
          break;
        }
      }
    });

    // 5. 生成欄位
    const fields: FieldArea[] = cells.map((cell, index) => {
      const cellText = cell.words.map((w) => w.text).join(" ");
      return {
        id: `cell_${index}`,
        name:
          OCRService.cleanText(cellText) ||
          `cell_${Math.round(cell.x)}_${Math.round(cell.y)}`,
        position: { x: cell.x, y: cell.y },
        size: { width: cell.width, height: cell.height },
        fieldType: FieldType.TEXT,
        defaultValue: "",
      };
    });

    if (fields.length > 1) {
      return fields;
    }

    const fallbackFields: FieldArea[] = [];
    const rows = FieldDetectionService.groupByRows(words, 20);

    rows.forEach((row, rowIndex) => {
      const sortedRow = [...row].sort((a, b) => a.bbox[0] - b.bbox[0]);
      const groups: OCRResult[][] = [];

      sortedRow.forEach((word) => {
        const lastGroup = groups[groups.length - 1];
        if (!lastGroup) {
          groups.push([word]);
          return;
        }

        const lastWord = lastGroup[lastGroup.length - 1];
        const lastRight = lastWord.bbox[0] + lastWord.bbox[2];

        if (word.bbox[0] - lastRight < 40) {
          lastGroup.push(word);
        } else {
          groups.push([word]);
        }
      });

      groups.forEach((group, groupIndex) => {
        const x = Math.min(...group.map((g) => g.bbox[0]));
        const y = Math.min(...group.map((g) => g.bbox[1]));
        const right = Math.max(...group.map((g) => g.bbox[0] + g.bbox[2]));
        const bottom = Math.max(...group.map((g) => g.bbox[1] + g.bbox[3]));
        const width = right - x;
        const height = bottom - y;

        if (width < 10 || height < 10) {
          return;
        }

        const text = group.map((g) => g.text).join(" ");

        fallbackFields.push({
          id: `fallback_${rowIndex}_${groupIndex}`,
          name: OCRService.cleanText(text) || `cell_${rowIndex}_${groupIndex}`,
          position: { x, y },
          size: { width, height },
          fieldType: FieldType.TEXT,
          defaultValue: "",
        });
      });
    });

    return fallbackFields.length > 0 ? fallbackFields : fields;
  }

  /**
   * 根據文字內容推斷欄位類型
   */
  private static inferFieldType(text: string): FieldType {
    const cleanText = OCRService.cleanText(text).toLowerCase();

    if (FieldDetectionService.isDateField(cleanText)) {
      return FieldType.DATE;
    }
    if (FieldDetectionService.isNumberField(cleanText)) {
      return FieldType.NUMBER;
    }
    if (FieldDetectionService.isSelectField(cleanText)) {
      return FieldType.SELECT;
    }
    if (FieldDetectionService.isCheckboxField(cleanText)) {
      return FieldType.CHECKBOX;
    }
    return FieldType.TEXT;
  }

  private static isDateField(text: string): boolean {
    const dateKeywords = [
      "date",
      "日期",
      "時間",
      "年",
      "月",
      "日",
      "發票日期",
      "到期日",
    ];
    return dateKeywords.some((keyword) => text.includes(keyword));
  }

  private static isNumberField(text: string): boolean {
    const numberKeywords = [
      "amount",
      "金額",
      "總額",
      "數量",
      "價格",
      "qty",
      "總計",
      "小計",
    ];
    return numberKeywords.some((keyword) => text.includes(keyword));
  }

  private static isSelectField(text: string): boolean {
    const selectKeywords = ["type", "類型", "種類", "選擇", "選項", "category"];
    return selectKeywords.some((keyword) => text.includes(keyword));
  }

  private static isCheckboxField(text: string): boolean {
    const checkboxKeywords = ["yes/no", "是/否", "同意", "確認", "核准"];
    return checkboxKeywords.some((keyword) => text.includes(keyword));
  }

  private static getDefaultValue(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.DATE:
        return new Date().toISOString().split("T")[0];
      case FieldType.NUMBER:
        return "0";
      case FieldType.CHECKBOX:
        return "false";
      default:
        return "";
    }
  }

  /**
   * 尋找標籤-值配對來創建欄位
   */
  private static findLabelValuePairs(
    ocrResults: OCRResult[],
    imageWidth: number,
    imageHeight: number
  ): FieldArea[] {
    const fields: FieldArea[] = [];
    const rows = FieldDetectionService.groupByRows(ocrResults, 15);

    rows.forEach((row) => {
      const sortedRow = row.sort((a, b) => a.bbox[0] - b.bbox[0]);

      for (let i = 0; i < sortedRow.length; i++) {
        const currentWord = sortedRow[i];
        const text = currentWord.text.trim();

        if (text.endsWith(":") || text.endsWith("：")) {
          const label = currentWord;
          let valueArea: {
            x: number;
            y: number;
            width: number;
            height: number;
          };

          if (i + 1 < sortedRow.length) {
            const nextWord = sortedRow[i + 1];
            const gap = nextWord.bbox[0] - (label.bbox[0] + label.bbox[2]);

            if (gap < 50) {
              valueArea = {
                x: nextWord.bbox[0],
                y: nextWord.bbox[1],
                width: nextWord.bbox[2],
                height: nextWord.bbox[3],
              };
            } else {
              const x = label.bbox[0] + label.bbox[2] + 10;
              const y = label.bbox[1];
              const width = Math.min(200, imageWidth - x);
              const height = label.bbox[3] * 1.2;
              valueArea = { x, y, width, height };
            }
          } else {
            const x = label.bbox[0] + label.bbox[2] + 10;
            const y = label.bbox[1];
            const width = Math.min(200, imageWidth - x);
            const height = label.bbox[3] * 1.2;
            valueArea = { x, y, width, height };
          }

          fields.push({
            id: `lvp_${label.text}_${Math.random()}`,
            name: text.slice(0, -1),
            position: { x: valueArea.x, y: valueArea.y },
            size: { width: valueArea.width, height: valueArea.height },
            fieldType: FieldDetectionService.inferFieldType(text),
            defaultValue: "",
          });
        }
      }
    });

    return fields;
  }

  /**
   * 分析表格結構並建議欄位佈局 (未來可用)
   */
  static analyzeTableStructure(ocrResults: OCRResult[]): {
    columns: number;
    rows: number;
    suggestedFields: FieldArea[];
  } {
    if (ocrResults.length === 0) {
      return { columns: 0, rows: 0, suggestedFields: [] };
    }

    const rows = FieldDetectionService.groupByRows(ocrResults);
    const columns = FieldDetectionService.analyzeColumns(ocrResults);
    const suggestedFields = FieldDetectionService.generateTableFields(
      rows,
      columns
    );

    return {
      columns: columns.length,
      rows: rows.length,
      suggestedFields,
    };
  }

  /**
   * 按行分組文字
   */
  private static groupByRows(
    results: OCRResult[],
    rowTolerance: number = 20
  ): OCRResult[][] {
    const sorted = results.sort((a, b) => a.bbox[1] - b.bbox[1]);
    const rows: OCRResult[][] = [];

    sorted.forEach((result) => {
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
    const xPositions = results.map((r) => r.bbox[0]).sort((a, b) => a - b);
    const columns: number[] = [];

    xPositions.forEach((x) => {
      const existingColumn = columns.find((col) => Math.abs(x - col) < 50);
      if (!existingColumn) {
        columns.push(x);
      }
    });

    return columns.sort((a, b) => a - b);
  }

  /**
   * 生成表格欄位佈局 (未來可用)
   */
  private static generateTableFields(
    rows: OCRResult[][],
    columns: number[]
  ): FieldArea[] {
    const fields: FieldArea[] = [];

    rows.forEach((row, rowIndex) => {
      columns.forEach((colX, colIndex) => {
        const cellText = row.find(
          (cell) =>
            Math.abs(cell.bbox[0] - colX) < 50 &&
            cell.bbox[1] >= row[0].bbox[1] - 10 &&
            cell.bbox[1] <= row[0].bbox[1] + 10
        );

        if (cellText) {
          const field: FieldArea = {
            id: `table_${rowIndex}_${colIndex}`,
            name:
              cellText.text.trim() || `欄位 ${rowIndex + 1}-${colIndex + 1}`,
            position: {
              x: colX - 5,
              y: cellText.bbox[1] + cellText.bbox[3] + 10,
            },
            size: {
              width: 120,
              height: 25,
            },
            fieldType: FieldDetectionService.inferFieldType(cellText.text),
            defaultValue: FieldDetectionService.getDefaultValue(
              FieldDetectionService.inferFieldType(cellText.text)
            ),
          };

          fields.push(field);
        }
      });
    });

    return fields;
  }
}
