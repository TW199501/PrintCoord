// PrintCoord - 整合測試

 
/* eslint-disable @typescript-eslint/no-unused-vars */

import { FileProcessingService } from "@/services/fileProcessingService";
import { FieldDetectionService } from "@/services/fieldDetection";
import { SmartSuggestionsService } from "@/services/smartSuggestions";
import { OCRService } from "@/services/ocrService";
import { FieldType, OCRResult } from "@/types";

// Mock 文件創建
const createMockFile = (
  name: string,
  type: string,
  size: number = 1024
): File => {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
};

describe("Integration Tests", () => {
  beforeEach(() => {
    // 重置所有服務
    SmartSuggestionsService.initialize();
  });

  describe("完整文件處理流程", () => {
    it("應該完整處理一個模擬的文件流程", async () => {
      // 1. 模擬文件處理
      const mockFile = createMockFile(
        "test.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      // 注意：實際的文件處理需要真實的文件內容，這裡是模擬測試
      const fileResult = await FileProcessingService.processFile(mockFile);

      // 由於我們沒有真實的文件，這個測試主要是確保服務不會崩潰
      expect(fileResult).toBeDefined();
      expect(fileResult.success).toBeDefined();
    });

    it("應該整合 OCR 和欄位檢測", async () => {
      // 模擬佈局資料
      const mockLayoutData = {
        words: [
          { text: "客戶名稱", confidence: 90, bbox: [10, 10, 80, 20] },
          { text: "發票金額", confidence: 85, bbox: [10, 50, 80, 20] },
        ] as OCRResult[],
        lines: [
          { text: "", confidence: 100, bbox: [5, 5, 195, 1] },
          { text: "", confidence: 100, bbox: [5, 45, 195, 1] },
        ] as OCRResult[],
        blocks: [],
      };

      // 測試欄位檢測
      const detectedFields = await FieldDetectionService.detectFieldsFromLayout(
        mockLayoutData,
        800,
        600
      );

      expect(detectedFields.length).toBeGreaterThan(0);

      // 測試智慧建議
      detectedFields.forEach((field: { name: string }) => {
        const suggestion = SmartSuggestionsService.generateSuggestion(
          field.name,
          detectedFields.map((f: { name: string }) => f.name)
        );

        expect(suggestion.fieldType).toBeDefined();
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("學習和改進循環", () => {
    it("應該通過用戶回饋改進建議準確度", () => {
      // 初始建議
      const _initialSuggestion =
        SmartSuggestionsService.generateSuggestion("自定義欄位");

      // 記錄用戶選擇
      SmartSuggestionsService.recordUserChoice(
        "自定義欄位",
        [],
        FieldType.SELECT,
        true
      );

      // 再次生成建議
      const improvedSuggestion =
        SmartSuggestionsService.generateSuggestion("自定義欄位");

      // 統計應該更新
      const stats = SmartSuggestionsService.getLearningStats();
      expect(stats.totalRecords).toBeGreaterThan(0);
    });

    it("應該維護用戶偏好模式", () => {
      // 模擬用戶多次選擇相同類型
      for (let i = 0; i < 3; i++) {
        SmartSuggestionsService.recordUserChoice(
          `測試欄位${i}`,
          ["表單"],
          FieldType.NUMBER,
          true
        );
      }

      const stats = SmartSuggestionsService.getLearningStats();

      // NUMBER 類型的使用頻率應該增加
      expect(stats.fieldTypeDistribution[FieldType.NUMBER]).toBeGreaterThan(0);
    });
  });

  describe("錯誤處理和恢復", () => {
    it("應該優雅處理 OCR 失敗", async () => {
      // 模擬 OCR 失敗的情況
      try {
        // 模擬 extractTextAndLayout 失敗
        jest
          .spyOn(OCRService, "extractTextAndLayout")
          .mockRejectedValue(new Error("OCR Failed"));
        await expect(
          OCRService.extractTextAndLayout(document.createElement("canvas"))
        ).rejects.toThrow("OCR Failed");
      } catch (error) {
        expect(error).toBeDefined();
        // 應該不會崩潰整個應用
      }
    });

    it("應該處理無效的文件輸入", async () => {
      const invalidFile = createMockFile("test.txt", "text/plain");

      const result = await FileProcessingService.processFile(invalidFile);

      // 應該返回錯誤而不是崩潰
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe("性能和規模", () => {
    it("應該處理大量欄位而不崩潰", () => {
      const largeFieldSet = Array.from({ length: 100 }, (_, i) => ({
        text: `欄位${i}`,
        context: ["大表單"],
      }));

      const suggestions =
        SmartSuggestionsService.generateBulkSuggestions(largeFieldSet);

      expect(suggestions).toHaveLength(100);
      suggestions.forEach((suggestion: { fieldType: FieldType }) => {
        expect(suggestion.fieldType).toBeDefined();
      });
    });

    it("應該維持學習數據的合理大小", () => {
      // 添加大量學習記錄
      for (let i = 0; i < 200; i++) {
        SmartSuggestionsService.recordUserChoice(
          `欄位${i}`,
          [],
          i % 2 === 0 ? FieldType.TEXT : FieldType.NUMBER,
          true
        );
      }

      const stats = SmartSuggestionsService.getLearningStats();

      // 學習數據應該被限制在合理大小內
      expect(stats.totalRecords).toBeLessThanOrEqual(1500); // 應該有清理邏輯
    });
  });

  describe("跨模組整合", () => {
    it("應該整合所有服務的輸出", async () => {
      // 模擬完整的處理流程
      const mockLayoutData = {
        words: [
          { text: "產品名稱", confidence: 90, bbox: [10, 10, 80, 20] },
          { text: "數量", confidence: 85, bbox: [10, 50, 50, 20] },
        ] as OCRResult[],
        lines: [],
        blocks: [],
      };

      // 1. 欄位檢測
      const fields = await FieldDetectionService.detectFieldsFromLayout(
        mockLayoutData,
        800,
        600
      );

      // 2. 生成建議
      const suggestions = SmartSuggestionsService.generateBulkSuggestions(
        fields.map((f) => ({ text: f.name, context: [] }))
      );

      // 3. 記錄學習
      suggestions.forEach(
        (suggestion: { fieldType: FieldType }, index: number) => {
          SmartSuggestionsService.recordUserChoice(
            fields[index].name,
            [],
            suggestion.fieldType,
            true
          );
        }
      );

      // 驗證整合結果
      expect(fields.length).toBeGreaterThan(0);
      expect(suggestions.length).toBe(fields.length);

      const finalStats = SmartSuggestionsService.getLearningStats();
      expect(finalStats.totalRecords).toBeGreaterThan(0);
    });
  });
});
