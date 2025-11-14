// PDF2JSON Service - PDF table extraction using pdf2json library

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import PDFParser from "pdf2json";
import { FieldArea, FieldType } from "@/types";
import type {
  PDF2JSONData,
  PDF2JSONPage,
  PDF2JSONText,
  PDF2JSONFill,
} from "@/types/pdf2json";

export class PDF2JSONService {
  private static zhToEn: Record<string, string> = {
    姓名: "name",
    性別: "gender",
    性别: "gender",
    出生年月日: "birth_date",
    出生日期: "birth_date",
    生日: "birth_date",
    身分證字號: "id_number",
    身份证号: "id_number",
    電話: "phone",
    电话: "phone",
    手機: "mobile",
    手机: "mobile",
    地址: "address",
    住址: "address",
    郵遞區號: "postal_code",
    邮递区号: "postal_code",
    電子郵件: "email",
    申請人: "applicant",
    申请人: "applicant",
    申請單位: "applicant_unit",
    申请单位: "applicant_unit",
    單位: "unit",
    部门: "department",
    部門: "department",
    日期: "date",
  };

  private static toSnake(input: string, fallback: string): string {
    const direct = this.zhToEn[input];
    if (direct) return direct;
    const ascii = input
      .normalize("NFKC")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
    return ascii || fallback;
  }

  // Pick a label text near a cell in pdf2json coordinate space
  private static pickLabelForCell(
    page: PDF2JSONPage,
    cell: { x: number; y: number; width: number; height: number }
  ): { label: string | null } {
    const texts: any[] = (page as any).Texts || [];
    const fx = cell.x;
    const fy = cell.y;
    const fw = cell.width;
    const fh = cell.height;
    const fRight = fx + fw;
    const fCenterY = fy + fh / 2;

    let best: { text: string; dist: number } | null = null;
    const consider = (txt: string, dist: number) => {
      const cleaned = decodeURIComponent(txt || "").trim();
      if (!cleaned) return;
      if (!best || dist < best.dist) best = { text: cleaned, dist };
    };

    // 1) Left side same row
    for (const t of texts) {
      const wx = Number(t.x) || 0;
      const wy = Number(t.y) || 0;
      const ww = Number(t.w) || 0.5;
      const wRight = wx + ww;
      const wCenterY = wy; // pdf2json 的 y 近似行基線
      if (wRight <= fx && Math.abs(wCenterY - fCenterY) <= 1.0) {
        const dist = fx - wRight;
        if (dist <= 5.0) consider((t.R && t.R[0]?.T) as string, dist);
      }
    }

    // 2) Above
    if (!best) {
      for (const t of texts) {
        const wx = Number(t.x) || 0;
        const wy = Number(t.y) || 0;
        const ww = Number(t.w) || 0.5;
        const wRight = wx + ww;
        const verticalGap = fy - wy;
        const overlap = Math.min(fRight, wRight) - Math.max(fx, wx);
        if (
          verticalGap >= 0 &&
          verticalGap <= 6.0 &&
          (overlap > 0 || Math.abs(wx + ww / 2 - (fx + fw / 2)) <= 3.0)
        ) {
          consider(t.R?.[0]?.T, verticalGap);
        }
      }
    }

    // 3) Inside
    if (!best) {
      for (const t of texts) {
        const wx = Number(t.x) || 0;
        const wy = Number(t.y) || 0;
        if (wx >= fx && wx <= fRight && wy >= fy && wy <= fy + fh) {
          consider((t.R && t.R[0]?.T) as string, 0.1);
        }
      }
    }

    // 4) Right side small distance
    if (!best) {
      for (const t of texts) {
        const wx = Number(t.x) || 0;
        const wy = Number(t.y) || 0;
        const wCenterY = wy;
        if (wx >= fRight && Math.abs(wCenterY - fCenterY) <= 1.0) {
          const dist = wx - fRight;
          if (dist <= 3.0) consider((t.R && t.R[0]?.T) as string, dist);
        }
      }
    }

    return { label: best ? best.text : null };
  }
  /**
   * Parse PDF buffer and return structured data
   */
  static async parsePDF(pdfBuffer: Buffer): Promise<PDF2JSONData> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error(errData.parserError));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfData as PDF2JSONData);
      });

      pdfParser.parseBuffer(pdfBuffer);
    });
  }

  /**
   * Detect table cells from PDF using improved algorithm
   */
  static async detectFieldsFromPDF(pdfBuffer: Buffer): Promise<FieldArea[]> {
    try {
      const pdfData = await this.parsePDF(pdfBuffer);
      const fields: FieldArea[] = [];

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`Processing page ${pageIndex + 1}`);
        console.log(`  Texts: ${page.Texts.length}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}`);
        console.log(`  Fills: ${page.Fills?.length || 0}`);

        // Strategy 1: Check if Fills contain lines (most common in forms)
        if (page.Fills && page.Fills.length > 0) {
          const { horizontalLines, verticalLines } = this.analyzeFills(
            page.Fills
          );

          if (horizontalLines.length > 0 || verticalLines.length > 0) {
            console.log(
              `  Using Fills-based detection (H:${horizontalLines.length}, V:${verticalLines.length})`
            );
            fields.push(
              ...this.detectFieldsFromFillLines(
                page,
                pageIndex,
                horizontalLines,
                verticalLines
              )
            );
            return;
          }
        }

        // Strategy 2: Use HLines/VLines if available
        if (
          (page.HLines && page.HLines.length > 0) ||
          (page.VLines && page.VLines.length > 0)
        ) {
          console.log(`  Using HLines/VLines detection`);
          const hLines = (page.HLines || [])
            .map((line) => line.y)
            .sort((a, b) => a - b);
          const vLines = (page.VLines || [])
            .map((line) => line.x)
            .sort((a, b) => a - b);
          fields.push(
            ...this.detectFieldsFromLines(page, pageIndex, hLines, vLines)
          );
          return;
        }

        // Strategy 3: Fallback to text-based detection
        console.log(`  Using text-based detection`);
        fields.push(...this.detectFieldsFromTextPositions(page, pageIndex));
      });

      console.log(`Total fields detected: ${fields.length}`);
      return fields;
    } catch (error) {
      console.error("PDF field detection failed:", error);
      throw error;
    }
  }

  /**
   * Analyze Fills to extract horizontal and vertical lines
   */
  private static analyzeFills(fills: PDF2JSONFill[]): {
    horizontalLines: PDF2JSONFill[];
    verticalLines: PDF2JSONFill[];
  } {
    const horizontalLines: PDF2JSONFill[] = [];
    const verticalLines: PDF2JSONFill[] = [];

    fills.forEach((fill) => {
      // Horizontal line: very thin height (< 0.2) and reasonable width (> 1)
      if (fill.h < 0.2 && fill.w > 1) {
        horizontalLines.push(fill);
      }
      // Vertical line: very thin width (< 0.2) and reasonable height (> 1)
      else if (fill.w < 0.2 && fill.h > 1) {
        verticalLines.push(fill);
      }
    });

    return { horizontalLines, verticalLines };
  }

  /**
   * Detect fields using lines extracted from Fills
   */
  private static detectFieldsFromFillLines(
    page: PDF2JSONPage,
    pageIndex: number,
    horizontalLines: PDF2JSONFill[],
    verticalLines: PDF2JSONFill[]
  ): FieldArea[] {
    const fields: FieldArea[] = [];

    // Extract column boundaries from horizontal lines
    const columnBoundaries = this.extractColumnBoundaries(horizontalLines);

    // Extract row boundaries from horizontal lines
    const rowBoundaries = this.extractRowBoundaries(horizontalLines);

    console.log(`  Column boundaries: ${columnBoundaries.length}`);
    console.log(`  Row boundaries: ${rowBoundaries.length}`);

    // Group and merge texts by row
    const rowMap = this.groupTextsByRow(page.Texts);
    const mergedTextsByRow = new Map<number, any[]>();

    rowMap.forEach((texts, y) => {
      const merged = this.mergeAdjacentTexts(texts);
      mergedTextsByRow.set(y, merged);
    });

    // Create cells based on grid
    for (let rowIdx = 0; rowIdx < rowBoundaries.length - 1; rowIdx++) {
      for (let colIdx = 0; colIdx < columnBoundaries.length - 1; colIdx++) {
        const cellX = columnBoundaries[colIdx];
        const cellY = rowBoundaries[rowIdx];
        const cellWidth = columnBoundaries[colIdx + 1] - cellX;
        const cellHeight = rowBoundaries[rowIdx + 1] - cellY;

        // Find texts within this cell
        const cellTexts: string[] = [];
        mergedTextsByRow.forEach((mergedTexts: any[]) => {
          mergedTexts.forEach((text: any) => {
            if (
              text.x >= cellX &&
              text.x <= cellX + cellWidth &&
              text.y >= cellY &&
              text.y <= cellY + cellHeight
            ) {
              cellTexts.push(text.text);
            }
          });
        });

        const cellText = cellTexts.join(" ").trim();
        const { label } = this.pickLabelForCell(page, {
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
        });

        const labelZh = label ? label : cellText || "";
        const snake = this.toSnake(
          labelZh,
          `field_p${pageIndex}_r${rowIdx}_c${colIdx}`
        );

        fields.push({
          id: `field-p${pageIndex}-r${rowIdx}-c${colIdx}`,
          name: snake,
          labelZh: labelZh || undefined,
          position: {
            x: cellX * 20,
            y: cellY * 20,
          },
          size: {
            width: cellWidth * 20,
            height: cellHeight * 20,
          },
          fieldType: FieldType.TEXT,
          defaultValue: cellText,
        });
      }
    }

    return fields;
  }

  /**
   * Detect fields using HLines and VLines
   */
  private static detectFieldsFromLines(
    page: PDF2JSONPage,
    pageIndex: number,
    hLines: number[],
    vLines: number[]
  ): FieldArea[] {
    const fields: FieldArea[] = [];

    const mergedHLines = this.mergeCloseCoordinates(hLines, 0.5);
    const mergedVLines = this.mergeCloseCoordinates(vLines, 0.5);

    console.log(`  Merged H-Lines: ${mergedHLines.length}`);
    console.log(`  Merged V-Lines: ${mergedVLines.length}`);

    for (let row = 0; row < mergedHLines.length - 1; row++) {
      for (let col = 0; col < mergedVLines.length - 1; col++) {
        const cellX = mergedVLines[col];
        const cellY = mergedHLines[row];
        const cellWidth = mergedVLines[col + 1] - cellX;
        const cellHeight = mergedHLines[row + 1] - cellY;

        const cellTexts = page.Texts.filter((text) => {
          return (
            text.x >= cellX &&
            text.x <= cellX + cellWidth &&
            text.y >= cellY &&
            text.y <= cellY + cellHeight
          );
        });

        const cellText = cellTexts
          .map((text) => decodeURIComponent(text.R[0].T))
          .filter((t) => t.trim())
          .join(" ");

        const { label } = this.pickLabelForCell(page, {
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
        });
        const labelZh = label ? label : cellText || "";
        const snake = this.toSnake(
          labelZh,
          `field_p${pageIndex}_r${row}_c${col}`
        );
        fields.push({
          id: `field-p${pageIndex}-r${row}-c${col}`,
          name: snake,
          labelZh: labelZh || undefined,
          position: {
            x: cellX * 20,
            y: cellY * 20,
          },
          size: {
            width: cellWidth * 20,
            height: cellHeight * 20,
          },
          fieldType: FieldType.TEXT,
          defaultValue: cellText,
        });
      }
    }

    return fields;
  }

  /**
   * Detect fields by analyzing text positions (fallback method)
   */
  private static detectFieldsFromTextPositions(
    page: PDF2JSONPage,
    pageIndex: number
  ): FieldArea[] {
    const fields: FieldArea[] = [];
    const rowMap = this.groupTextsByRow(page.Texts);

    let rowIndex = 0;
    const sortedRows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);

    sortedRows.forEach(([y, texts]) => {
      const mergedTexts = this.mergeAdjacentTexts(texts);

      mergedTexts.forEach((merged, colIndex) => {
        const cellX = merged.x;
        const cellY = merged.y;
        const cellW = merged.width || 1;
        const { label } = this.pickLabelForCell(page, {
          x: cellX,
          y: cellY,
          width: cellW,
          height: 1.5,
        });
        const labelZh = label ? label : merged.text || "";
        const snake = this.toSnake(
          labelZh,
          `field_p${pageIndex}_r${rowIndex}_c${colIndex}`
        );
        fields.push({
          id: `field-p${pageIndex}-r${rowIndex}-c${colIndex}`,
          name: snake,
          labelZh: labelZh || undefined,
          position: {
            x: cellX * 20,
            y: cellY * 20,
          },
          size: {
            width: cellW * 20,
            height: 30,
          },
          fieldType: FieldType.TEXT,
          defaultValue: merged.text,
        });
      });

      rowIndex++;
    });

    return fields;
  }

  /**
   * Merge close coordinates to reduce noise
   */
  private static mergeCloseCoordinates(
    coords: number[],
    threshold: number
  ): number[] {
    if (coords.length === 0) return [];

    const sorted = [...new Set(coords)].sort((a, b) => a - b);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - merged[merged.length - 1] > threshold) {
        merged.push(sorted[i]);
      }
    }

    return merged;
  }

  /**
   * Merge horizontally adjacent text items
   */
  private static mergeAdjacentTexts(
    texts: PDF2JSONText[],
    threshold: number = 0.5
  ): any[] {
    if (texts.length === 0) return [];

    const sorted = texts.sort((a, b) => a.x - b.x);
    const merged: any[] = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      const curr = sorted[i];

      const prevEnd = prev.x + (prev.w || 0.5);

      if (curr.x - prevEnd < threshold) {
        currentGroup.push(curr);
      } else {
        merged.push({
          x: currentGroup[0].x,
          y: currentGroup[0].y,
          text: currentGroup.map((t) => decodeURIComponent(t.R[0].T)).join(""),
          width: curr.x - currentGroup[0].x,
        });
        currentGroup = [curr];
      }
    }

    if (currentGroup.length > 0) {
      const lastItem = currentGroup[currentGroup.length - 1];
      merged.push({
        x: currentGroup[0].x,
        y: currentGroup[0].y,
        text: currentGroup.map((t) => decodeURIComponent(t.R[0].T)).join(""),
        width: lastItem.x + (lastItem.w || 0.5) - currentGroup[0].x,
      });
    }

    return merged;
  }

  /**
   * Group texts by row
   */
  private static groupTextsByRow(
    texts: PDF2JSONText[],
    yThreshold: number = 0.3
  ): Map<number, PDF2JSONText[]> {
    const rowMap = new Map<number, PDF2JSONText[]>();

    texts.forEach((text) => {
      const decoded = decodeURIComponent(text.R[0].T);
      if (!decoded.trim()) return;

      let foundRow = false;
      for (const [y, items] of rowMap.entries()) {
        if (Math.abs(text.y - y) < yThreshold) {
          items.push(text);
          foundRow = true;
          break;
        }
      }
      if (!foundRow) {
        rowMap.set(text.y, [text]);
      }
    });

    return rowMap;
  }

  /**
   * Extract column boundaries from horizontal lines
   */
  private static extractColumnBoundaries(
    horizontalLines: PDF2JSONFill[]
  ): number[] {
    const xCoords: number[] = [];

    horizontalLines.forEach((line) => {
      xCoords.push(line.x);
      xCoords.push(line.x + line.w);
    });

    return this.mergeCloseCoordinates(xCoords, 0.3);
  }

  /**
   * Extract row boundaries from horizontal lines
   */
  private static extractRowBoundaries(
    horizontalLines: PDF2JSONFill[]
  ): number[] {
    const yCoords = horizontalLines.map((line) => line.y);
    return this.mergeCloseCoordinates(yCoords, 0.3);
  }
}
