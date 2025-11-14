// PrintCoord - OCR 服務

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createWorker, Worker, PSM } from "tesseract.js";
import { OCRResult } from "../types";

export class OCRService {
  private static worker: Worker | null = null;

  static async initialize(): Promise<void> {
    if (OCRService.worker) return;
    try {
      OCRService.worker = await createWorker("eng+chi_tra+chi_sim", 1, {
        logger: (m) => console.log("OCR Progress:", m),
      });
      console.log("OCR Worker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OCR worker:", error);
      throw error;
    }
  }

  static async terminate(): Promise<void> {
    if (OCRService.worker) {
      await OCRService.worker.terminate();
      OCRService.worker = null;
    }
  }

  private static async recognizeLayout(image: HTMLCanvasElement): Promise<any> {
    if (!OCRService.worker) {
      await OCRService.initialize();
    }
    if (!OCRService.worker) {
      throw new Error("OCR worker not initialized");
    }
    // Tesseract.js v5+ 支援 PSM (Page Segmentation Mode) 來進行佈局分析
    // PSM 3 (Auto page segmentation with OSD) 是個不錯的選擇
    await OCRService.worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO_OSD,
    });
    const { data } = await OCRService.worker.recognize(image);
    return data;
  }

  private static preprocessCanvas(
    canvas: HTMLCanvasElement
  ): HTMLCanvasElement {
    const newCanvas = document.createElement("canvas");
    const ctx = newCanvas.getContext("2d");
    if (!ctx) return canvas;

    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    ctx.drawImage(canvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const threshold = 180;
      const color = avg > threshold ? 255 : 0;
      data[i] = color;
      data[i + 1] = color;
      data[i + 2] = color;
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
  }

  static async extractTextAndLayout(canvas: HTMLCanvasElement): Promise<{
    words: OCRResult[];
    lines: any[];
    blocks: any[];
    confidence: number;
  }> {
    try {
      const preprocessedCanvas = OCRService.preprocessCanvas(canvas);
      const data = await OCRService.recognizeLayout(preprocessedCanvas);

      const words: OCRResult[] = (data.words || []).map((word: any) => ({
        text: word.text || "",
        confidence: word.confidence,
        bbox: [
          word.bbox.x0,
          word.bbox.y0,
          word.bbox.x1 - word.bbox.x0,
          word.bbox.y1 - word.bbox.y0,
        ],
      }));

      const confidence =
        words.length > 0
          ? words.reduce((sum, r) => sum + r.confidence, 0) / words.length
          : 0;

      return {
        words,
        lines: data.lines || [],
        blocks: data.blocks || [],
        confidence,
      };
    } catch (error) {
      console.error("Canvas text and layout extraction failed:", error);
      throw error;
    }
  }

  static mergeNearbyTextRegions(
    words: OCRResult[],
    threshold: number = 20
  ): OCRResult[] {
    const merged: OCRResult[] = [];
    words.forEach((word) => {
      let mergedWithExisting = false;
      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];
        const sameLine = Math.abs(word.bbox[1] - existing.bbox[1]) < threshold;
        if (sameLine) {
          const existingRight = existing.bbox[0] + existing.bbox[2];
          const wordLeft = word.bbox[0];
          const horizontalGap = Math.abs(wordLeft - existingRight);
          if (horizontalGap > threshold) continue;
          existing.text += " " + word.text;
          existing.bbox[2] =
            Math.max(existingRight, word.bbox[0] + word.bbox[2]) -
            existing.bbox[0];
          existing.bbox[3] = Math.max(existing.bbox[3], word.bbox[3]);
          existing.confidence = (existing.confidence + word.confidence) / 2;
          mergedWithExisting = true;
          break;
        }
      }
      if (!mergedWithExisting) {
        merged.push({ ...word });
      }
    });
    return merged;
  }

  static filterByConfidence(
    results: OCRResult[],
    minConfidence: number = 60
  ): OCRResult[] {
    return results.filter((result) => result.confidence >= minConfidence);
  }

  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[^\w\s\u4e00-\u9fff]/g, "")
      .trim();
  }
}
