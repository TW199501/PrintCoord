// PrintCoord - 欄位檢測服務

/* eslint-disable @typescript-eslint/no-unused-vars */

import { OCRResult, FieldArea, FieldType } from "../types";
import { OCRService } from "./ocrService";

/**
 * 矩形邊框接口
 */
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 水平 / 垂直線段（不是只有座標，而是有範圍的 segment） */
interface HSegment {
  y: number;
  x1: number;
  x2: number;
}

interface VSegment {
  x: number;
  y1: number;
  y2: number;
}


/**
 * 從圖像中檢測四邊框
 * 步驟：
 *  1. 用深色像素找出水平 / 垂直「線段」
 *  2. 依每一個 row band (相鄰水平線之間) 找出在這一帶有覆蓋的垂直線 → 切成格子
 *  3. 再把同一欄、上下相連且沒有實際水平線切開的格子合併成一大格
 */
function detectBorderedRectangles(imageData: ImageData): Rectangle[] {
  const { width, height, data } = imageData;

  // 1. 邊緣檢測 - 找出所有「深色」像素
  const edges: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    edges[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = (r + g + b) / 3;
      const isDark = gray < 210; // 放鬆一點，格線通常偏灰
      edges[y][x] = isDark;
    }
  }

  // 2. 掃描出「水平線段」
  const hSegments: HSegment[] = [];
  const MIN_H_SEG = Math.max(40, Math.floor(width * 0.25)); // 至少 25% 寬或 40px

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const isDark = x < width ? edges[y][x] : false;
      if (isDark) {
        if (runStart === -1) runStart = x;
      } else if (runStart !== -1) {
        const runEnd = x - 1;
        const runLen = runEnd - runStart + 1;
        if (runLen >= MIN_H_SEG) {
          hSegments.push({ y, x1: runStart, x2: runEnd });
        }
        runStart = -1;
      }
    }
  }

  // 3. 掃描出「垂直線段」
  const vSegments: VSegment[] = [];
  const MIN_V_SEG = Math.max(10, Math.floor(height * 0.015)); // 至少 1.5% 高或 10px
  let maxVRun = 0;

  for (let x = 0; x < width; x++) {
    let runStart = -1;
    for (let y = 0; y <= height; y++) {
      const isDark = y < height ? edges[y][x] : false;
      if (isDark) {
        if (runStart === -1) runStart = y;
      } else if (runStart !== -1) {
        const runEnd = y - 1;
        const runLen = runEnd - runStart + 1;
        if (runLen > maxVRun) maxVRun = runLen;
        if (runLen >= MIN_V_SEG) {
          vSegments.push({ x, y1: runStart, y2: runEnd });
        }
        runStart = -1;
      }
    }
  }

  if (hSegments.length === 0 || vSegments.length === 0) {
    console.log("沒有足夠的線段，無法生成矩形欄位");
    return [];
  }

  // 4. 將線段的 y / x 座標合併成候選水平線 / 垂直線
  const mergeCoords = (coords: number[], threshold: number = 3): number[] => {
    if (coords.length === 0) return [];
    const sorted = [...coords].sort((a, b) => a - b);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - merged[merged.length - 1] > threshold) {
        merged.push(sorted[i]);
      }
    }
    return merged;
  };

  const hLines = mergeCoords(hSegments.map((s) => s.y));
  const vLines = mergeCoords(vSegments.map((s) => s.x));

  console.log(
    `檢測到 ${hLines.length} 條水平線，${vLines.length} 條垂直線（hSeg=${hSegments.length}, vSeg=${vSegments.length}, maxVRun=${maxVRun})`
  );

  if (hLines.length < 2 || vLines.length < 2) {
    console.log("線條太少，無法生成矩形欄位");
    return [];
  }

  // 小工具：計算某個垂直 x 在 yBand 之內的覆蓋比例
  const verticalCoverageRatio = (x: number, y1: number, y2: number): number => {
    const bandHeight = y2 - y1;
    if (bandHeight <= 0) return 0;

    const tolX = 1;
    let covered = 0;

    for (const seg of vSegments) {
      if (Math.abs(seg.x - x) > tolX) continue;
      const overlapTop = Math.max(seg.y1, y1);
      const overlapBottom = Math.min(seg.y2, y2);
      if (overlapBottom > overlapTop) {
        covered += overlapBottom - overlapTop;
      }
    }
    return covered / bandHeight;
  };

  // 小工具：判斷在 x 範圍內，某條 y 是否存在「足夠長」的水平線段（用來阻止垂直合併）
  const hasStrongHorizontalAt = (
    y: number,
    x1: number,
    x2: number
  ): boolean => {
    const tolY = 2;
    const tolX = 2;
    const widthBand = x2 - x1;
    for (const seg of hSegments) {
      if (Math.abs(seg.y - y) > tolY) continue;
      const overlapLeft = Math.max(seg.x1, x1 + tolX);
      const overlapRight = Math.min(seg.x2, x2 - tolX);
      if (overlapRight > overlapLeft) {
        const coverRatio = (overlapRight - overlapLeft) / widthBand;
        if (coverRatio >= 0.7) return true;
      }
    }
    return false;
  };

  // 5. 先在每個 row band 中，用「有效垂直線」切出初始格子
  const rawRects: Rectangle[] = [];
  const borderInsetX = 2;  // 只在 X 方向縮進，Y 不縮

  for (let i = 0; i < hLines.length - 1; i++) {
    const yTop = hLines[i];
    const yBottom = hLines[i + 1];
    const bandHeight = yBottom - yTop;
    if (bandHeight <= 8) continue;

    // 這個 band 內有哪些垂直線「覆蓋比例 >= 80%」→ 才算是這一帶的有效分隔線
    const activeXs: number[] = [];
    for (const x of vLines) {
      const ratio = verticalCoverageRatio(x, yTop, yBottom);
      if (ratio >= 0.8) {
        activeXs.push(x);
      }
    }
    if (activeXs.length < 2) continue;

    activeXs.sort((a, b) => a - b);

    for (let j = 0; j < activeXs.length - 1; j++) {
      const xLeft = activeXs[j];
      const xRight = activeXs[j + 1];
      const w = xRight - xLeft - borderInsetX * 2;
      const h = bandHeight; // Y 方向不縮進，避免上下有縫

      if (w <= 8 || h <= 8) continue;

      rawRects.push({
        x: xLeft + borderInsetX,
        y: yTop,
        width: w,
        height: h,
      });
    }
  }

  console.log(`初始切出 ${rawRects.length} 個格子（尚未合併）`);

  if (rawRects.length === 0) return [];

  // 6. 把同一欄、上下相鄰且中間「沒有實際水平線」的格子合併成一大格
  const rects = [...rawRects].sort((a, b) => a.x - b.x || a.y - b.y);
  const used = new Array(rects.length).fill(false);
  const merged: Rectangle[] = [];
  const xTol = 2;
  const widthTol = 2;
  const yTol = 6; // 提高一點容忍度，確保可以合併

  for (let i = 0; i < rects.length; i++) {
    if (used[i]) continue;
    let cur = { ...rects[i] };

    while (true) {
      let mergedAny = false;
      for (let j = 0; j < rects.length; j++) {
        if (used[j] || j === i) continue;
        const r = rects[j];

        const sameCol =
          Math.abs(r.x - cur.x) <= xTol &&
          Math.abs(r.width - cur.width) <= widthTol;
        const directlyBelow =
          Math.abs(r.y - (cur.y + cur.height)) <= yTol;

        if (!sameCol || !directlyBelow) continue;

        // 如果中間有「實際水平線」橫跨這整欄，就不要合併
        const boundaryY = cur.y + cur.height;
        const x1 = cur.x;
        const x2 = cur.x + cur.width;
        if (hasStrongHorizontalAt(boundaryY, x1, x2)) {
          continue;
        }

        // 合併
        const bottom = Math.max(
          cur.y + cur.height,
          r.y + r.height
        );
        cur = {
          x: cur.x,
          y: cur.y,
          width: cur.width,
          height: bottom - cur.y,
        };
        used[j] = true;
        mergedAny = true;
      }
      if (!mergedAny) break;
    }

    used[i] = true;
    merged.push(cur);
  }

  console.log(`合併後剩 ${merged.length} 個矩形欄位`);
  return merged;
}




export class FieldDetectionService {
  /**
   * 從圖像中檢測有四邊框的欄位
   * 這是新的主要檢測方法
   *
   * @param imageElement - 圖像元素
   * @param targetWidth - 目標顯示寬度（用於縮放調整）
   * @param targetHeight - 目標顯示高度（用於縮放調整）
   */
  static async detectFieldsFromImage(
    imageElement: HTMLImageElement,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<FieldArea[]> {
    // 創建 Canvas 來處理圖像
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("無法獲取 Canvas context");
      return [];
    }

    // 繪製圖像到 Canvas
    ctx.drawImage(imageElement, 0, 0);

    // 獲取圖像數據
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 檢測四邊框矩形
    const rectangles = detectBorderedRectangles(imageData);

    // 計算縮放比例
    const scaleX = 1;
    const scaleY = 1;

    console.log(`原始圖片尺寸: ${imageElement.width} × ${imageElement.height}`);
    console.log(`目標顯示尺寸: ${targetWidth} × ${targetHeight}`);
    console.log(`縮放比例: ${scaleX.toFixed(3)} × ${scaleY.toFixed(3)}`);

    // 轉換為 FieldArea 格式，並應用縮放比例
    const fields: FieldArea[] = rectangles.map((rect, index) => ({
      id: `field_${Date.now()}_${index}`,
      name: `欄位_${index + 1}`,
      labelZh: `欄位 ${index + 1}`,
      fieldType: "text" as FieldType,
      position: {
        x: rect.x * scaleX,
        y: rect.y * scaleY,
      },
      size: {
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      },
      required: false,
      validation: {},
    }));

    console.log(`檢測到 ${fields.length} 個有四邊框的欄位（已應用縮放）`);
    return fields;
  }

  /**
   * 從 OCR 結果中檢測可能的欄位（舊方法，保留作為備用）
   */
  static async detectFieldsFromLayout(
    layoutData: { words: OCRResult[]; lines: OCRResult[]; blocks: OCRResult[] },
    imageWidth: number,
    imageHeight: number
  ): Promise<FieldArea[]> {
    const { words, lines } = layoutData;

    // 1. 偵測水平線和垂直線
    const horizontalLines = (lines || []).filter((line) => {
      const [, , w, h] = line.bbox;
      return w > h * 2;
    });
    const verticalLines = (lines || []).filter((line) => {
      const [, , w, h] = line.bbox;
      return h > w * 2;
    });

    // 2. 確定格線座標
    const yCoords = [
      0,
      ...horizontalLines.flatMap((line) => {
        const [, y, , h] = line.bbox;
        return [y, y + h];
      }),
      imageHeight,
    ].sort((a, b) => a - b);
    const xCoords = [
      0,
      ...verticalLines.flatMap((line) => {
        const [x, , w] = line.bbox;
        return [x, x + w];
      }),
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
