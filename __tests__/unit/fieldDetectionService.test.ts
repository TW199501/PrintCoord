// TableTemplate Pro - 欄位檢測服務單元測試

import { FieldDetectionService } from '../../services/fieldDetection';
import { OCRResult, FieldType } from '../../types';

describe('FieldDetectionService', () => {
  describe('detectFieldsFromOCR', () => {
    it('應該從 OCR 結果檢測欄位', async () => {
      const mockOCRResults: OCRResult[] = [
        { text: '客戶名稱', confidence: 90, bbox: [10, 10, 80, 30] },
        { text: '發票金額', confidence: 85, bbox: [10, 50, 80, 70] },
        { text: '發票日期', confidence: 88, bbox: [10, 90, 80, 110] }
      ];

      const fields = await FieldDetectionService.detectFieldsFromOCR(
        mockOCRResults,
        800,
        600
      );

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some(f => f.fieldType === FieldType.NUMBER)).toBe(true);
      expect(fields.some(f => f.fieldType === FieldType.DATE)).toBe(true);
    });

    it('應該為檢測到的文字創建輸入欄位', async () => {
      const mockOCRResults: OCRResult[] = [
        { text: '產品名稱', confidence: 90, bbox: [10, 10, 80, 30] }
      ];

      const fields = await FieldDetectionService.detectFieldsFromOCR(
        mockOCRResults,
        800,
        600
      );

      // 應該包含自動生成的輸入欄位
      const inputFields = fields.filter(f => f.fieldType === FieldType.TEXT);
      expect(inputFields.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeTableStructure', () => {
    it('應該分析表格結構', () => {
      const mockOCRResults: OCRResult[] = [
        { text: '名稱', confidence: 90, bbox: [10, 10, 60, 30] },
        { text: '數量', confidence: 85, bbox: [100, 10, 150, 30] },
        { text: 'Apple', confidence: 80, bbox: [10, 50, 60, 70] },
        { text: '5', confidence: 85, bbox: [100, 50, 125, 70] }
      ];

      const result = FieldDetectionService.analyzeTableStructure(mockOCRResults);

      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('suggestedFields');
      expect(result.columns).toBeGreaterThan(0);
      expect(result.rows).toBeGreaterThan(0);
    });

    it('空結果應該返回預設值', () => {
      const result = FieldDetectionService.analyzeTableStructure([]);

      expect(result.columns).toBe(0);
      expect(result.rows).toBe(0);
      expect(result.suggestedFields).toEqual([]);
    });
  });
});
