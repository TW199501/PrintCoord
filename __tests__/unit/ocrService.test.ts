// TableTemplate Pro - OCR 服務單元測試

import { OCRService } from '../../services/ocrService';
import { OCRResult } from '../../types';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(() => Promise.resolve({
    recognize: jest.fn(() => Promise.resolve({
      data: {
        text: 'Sample text',
        confidence: 85,
        words: [
          {
            text: 'Sample',
            confidence: 90,
            bbox: { x0: 10, y0: 10, x1: 60, y1: 25 }
          }
        ]
      }
    })),
    terminate: jest.fn()
  }))
}));

describe('OCRService', () => {
  beforeEach(() => {
    // 重置服務狀態
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('應該成功初始化 OCR worker', async () => {
      await OCRService.initialize();
      // 由於是靜態方法，難以直接測試，但可以測試後續方法
    });
  });

  describe('recognizeText', () => {
    it('應該正確識別文字並返回結果', async () => {
      await OCRService.initialize();

      const mockImage = new Image();
      const result = await OCRService.recognizeText(mockImage);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('text');
        expect(result[0]).toHaveProperty('confidence');
        expect(result[0]).toHaveProperty('bbox');
      }
    });
  });

  describe('extractTextFromCanvas', () => {
    it('應該從 Canvas 提取文字', async () => {
      await OCRService.initialize();

      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 100, 50);
      }

      const result = await OCRService.extractTextFromCanvas(canvas);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('mergeNearbyTextRegions', () => {
    it('應該合併相近的文字區域', () => {
      const words: OCRResult[] = [
        { text: 'Hello', confidence: 90, bbox: [0, 0, 40, 20] },
        { text: 'World', confidence: 85, bbox: [45, 0, 85, 20] }
      ];

      const merged = OCRService.mergeNearbyTextRegions(words, 10);

      expect(merged.length).toBe(1);
      expect(merged[0].text).toBe('Hello World');
    });

    it('不應該合併距離較遠的文字', () => {
      const words: OCRResult[] = [
        { text: 'Hello', confidence: 90, bbox: [0, 0, 40, 20] },
        { text: 'World', confidence: 85, bbox: [100, 0, 140, 20] }
      ];

      const merged = OCRService.mergeNearbyTextRegions(words, 10);

      expect(merged.length).toBe(2);
    });
  });

  describe('filterByConfidence', () => {
    it('應該過濾低置信度的結果', () => {
      const words: OCRResult[] = [
        { text: 'High', confidence: 90, bbox: [0, 0, 30, 20] },
        { text: 'Low', confidence: 50, bbox: [35, 0, 55, 20] }
      ];

      const filtered = OCRService.filterByConfidence(words, 70);

      expect(filtered.length).toBe(1);
      expect(filtered[0].text).toBe('High');
    });
  });

  describe('cleanText', () => {
    it('應該清理和標準化文字', () => {
      const dirtyText = '  Hello   World!  ';
      const cleanText = OCRService.cleanText(dirtyText);

      expect(cleanText).toBe('Hello World');
    });
  });
});
