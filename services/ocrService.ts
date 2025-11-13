// TableTemplate Pro - OCR 服務

import { createWorker, Worker } from 'tesseract.js';
import { OCRResult, Position } from '../types';

export class OCRService {
  private static worker: Worker | null = null;

  /**
   * 初始化 OCR Worker
   */
  static async initialize(): Promise<void> {
    if (this.worker) return;

    try {
      this.worker = await createWorker('eng+chi_tra+chi_sim', 1, {
        logger: m => console.log('OCR Progress:', m)
      });
      console.log('OCR Worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw error;
    }
  }

  /**
   * 終止 OCR Worker
   */
  static async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * 從圖片中識別文字
   */
  static async recognizeText(
    imageSource: string | HTMLImageElement | HTMLCanvasElement,
    options?: {
      rectangle?: { left: number; top: number; width: number; height: number };
      lang?: string;
    }
  ): Promise<OCRResult[]> {
    if (!this.worker) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const { data } = await this.worker.recognize(imageSource, options);

      // 處理識別結果
      const results: OCRResult[] = [];

      if ((data as any).words && Array.isArray((data as any).words)) {
        // 使用單詞級別的結果，更精確
        (data as any).words.forEach((word: any) => {
          if (word.confidence > 30) { // 只保留置信度 > 30% 的結果
            results.push({
              text: word.text || '',
              confidence: word.confidence || 0,
              bbox: [
                word.bbox?.x0 || 0,
                word.bbox?.y0 || 0,
                (word.bbox?.x1 || 0) - (word.bbox?.x0 || 0),
                (word.bbox?.y1 || 0) - (word.bbox?.y0 || 0)
              ]
            });
          }
        });
      } else if (data.text) {
        // 備用：使用整體文字結果
        results.push({
          text: data.text,
          confidence: data.confidence,
          bbox: [0, 0, 0, 0] // 沒有具體位置信息
        });
      }

      return results;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    }
  }

  /**
   * 從 Canvas 中提取文字和位置
   */
  static async extractTextFromCanvas(canvas: HTMLCanvasElement): Promise<{
    text: string;
    words: OCRResult[];
    confidence: number;
  }> {
    try {
      const results = await this.recognizeText(canvas);

      const text = results.map(r => r.text).join(' ');
      const confidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

      return {
        text,
        words: results,
        confidence
      };
    } catch (error) {
      console.error('Canvas text extraction failed:', error);
      throw error;
    }
  }

  /**
   * 從圖片 URL 中提取文字
   */
  static async extractTextFromImage(imageUrl: string): Promise<{
    text: string;
    words: OCRResult[];
    confidence: number;
  }> {
    try {
      const results = await this.recognizeText(imageUrl);

      const text = results.map(r => r.text).join(' ');
      const confidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

      return {
        text,
        words: results,
        confidence
      };
    } catch (error) {
      console.error('Image text extraction failed:', error);
      throw error;
    }
  }

  /**
   * 合併相近的文字區域
   */
  static mergeNearbyTextRegions(words: OCRResult[], threshold: number = 20): OCRResult[] {
    const merged: OCRResult[] = [];

    words.forEach(word => {
      let mergedWithExisting = false;

      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i];

        // 檢查是否在同一行（Y座標相近）
        const sameLine = Math.abs(word.bbox[1] - existing.bbox[1]) < threshold;

        if (sameLine) {
          // 合併文字
          existing.text += ' ' + word.text;
          // 更新邊界框
          existing.bbox[2] = Math.max(existing.bbox[2], word.bbox[2]); // 右邊界
          existing.bbox[3] = Math.max(existing.bbox[3], word.bbox[3]); // 下邊界
          // 平均置信度
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

  /**
   * 過濾低置信度的結果
   */
  static filterByConfidence(results: OCRResult[], minConfidence: number = 60): OCRResult[] {
    return results.filter(result => result.confidence >= minConfidence);
  }

  /**
   * 清理和標準化文字
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // 多個空白合併為單個
      .trim()                // 移除首尾空白
      .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 移除特殊字符，保留中文
      .trim();
  }
}
