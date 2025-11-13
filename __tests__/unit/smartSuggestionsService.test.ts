// TableTemplate Pro - 智慧建議服務單元測試

import { SmartSuggestionsService } from '../../services/smartSuggestions';
import { FieldType } from '../../types';

describe('SmartSuggestionsService', () => {
  beforeEach(() => {
    // 重置學習數據
    (SmartSuggestionsService as any).learningData = [];
    SmartSuggestionsService.initialize();
  });

  describe('initialize', () => {
    it('應該載入預設知識庫', () => {
      const stats = SmartSuggestionsService.getLearningStats();
      expect(stats.totalRecords).toBeGreaterThan(0);
    });
  });

  describe('generateSuggestion', () => {
    it('應該基於文字生成建議', () => {
      const suggestion = SmartSuggestionsService.generateSuggestion('發票金額');

      expect(suggestion).toHaveProperty('fieldType');
      expect(suggestion).toHaveProperty('confidence');
      expect(suggestion).toHaveProperty('reasoning');
      expect(suggestion).toHaveProperty('alternatives');
    });

    it('應該考慮上下文信息', () => {
      const context = ['發票', '客戶'];
      const suggestion = SmartSuggestionsService.generateSuggestion('金額', context);

      expect(suggestion.confidence).toBeGreaterThan(0);
    });

    it('應該為日期相關文字建議 DATE 類型', () => {
      const suggestion = SmartSuggestionsService.generateSuggestion('發票日期');

      expect(suggestion.fieldType).toBe(FieldType.DATE);
      expect(suggestion.confidence).toBeGreaterThan(0);
    });

    it('應該為金額相關文字建議 NUMBER 類型', () => {
      const suggestion = SmartSuggestionsService.generateSuggestion('總金額');

      expect(suggestion.fieldType).toBe(FieldType.NUMBER);
      expect(suggestion.confidence).toBeGreaterThan(0);
    });
  });

  describe('recordUserChoice', () => {
    it('應該記錄用戶選擇', () => {
      const initialStats = SmartSuggestionsService.getLearningStats();

      SmartSuggestionsService.recordUserChoice(
        '客戶名稱',
        ['發票'],
        FieldType.TEXT,
        true
      );

      const updatedStats = SmartSuggestionsService.getLearningStats();
      expect(updatedStats.totalRecords).toBe(initialStats.totalRecords + 1);
    });

    it('應該區分接受和拒絕的選擇', () => {
      SmartSuggestionsService.recordUserChoice(
        '測試欄位',
        [],
        FieldType.TEXT,
        true // 接受
      );

      SmartSuggestionsService.recordUserChoice(
        '測試欄位2',
        [],
        FieldType.NUMBER,
        false // 拒絕
      );

      const stats = SmartSuggestionsService.getLearningStats();
      expect(stats.totalRecords).toBeGreaterThan(1);
    });
  });

  describe('generateBulkSuggestions', () => {
    it('應該批量生成建議', () => {
      const fields = [
        { text: '客戶名稱', context: ['發票'] },
        { text: '發票金額', context: ['總計'] },
        { text: '發票日期', context: [] }
      ];

      const suggestions = SmartSuggestionsService.generateBulkSuggestions(fields);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('fieldType');
        expect(suggestion).toHaveProperty('confidence');
      });
    });
  });

  describe('getLearningStats', () => {
    it('應該返回學習統計信息', () => {
      const stats = SmartSuggestionsService.getLearningStats();

      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('fieldTypeDistribution');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('recentAccuracy');

      expect(typeof stats.totalRecords).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
    });

    it('應該正確計算欄位類型分佈', () => {
      // 添加一些測試數據
      SmartSuggestionsService.recordUserChoice('文字欄位', [], FieldType.TEXT, true);
      SmartSuggestionsService.recordUserChoice('數字欄位', [], FieldType.NUMBER, true);
      SmartSuggestionsService.recordUserChoice('日期欄位', [], FieldType.DATE, true);

      const stats = SmartSuggestionsService.getLearningStats();

      expect(stats.fieldTypeDistribution[FieldType.TEXT]).toBeGreaterThan(0);
      expect(stats.fieldTypeDistribution[FieldType.NUMBER]).toBeGreaterThan(0);
      expect(stats.fieldTypeDistribution[FieldType.DATE]).toBeGreaterThan(0);
    });
  });

  describe('學習算法', () => {
    it('應該從重複選擇中學習', () => {
      // 多次記錄相同的選擇
      for (let i = 0; i < 5; i++) {
        SmartSuggestionsService.recordUserChoice(
          '常用欄位',
          ['發票'],
          FieldType.TEXT,
          true
        );
      }

      const suggestion = SmartSuggestionsService.generateSuggestion('常用欄位', ['發票']);
      expect(suggestion.confidence).toBeGreaterThan(0.5);
    });

    it('應該根據上下文調整建議', () => {
      SmartSuggestionsService.recordUserChoice(
        '金額',
        ['發票', '總計'],
        FieldType.NUMBER,
        true
      );

      const suggestionWithContext = SmartSuggestionsService.generateSuggestion(
        '金額',
        ['發票', '總計']
      );
      const suggestionWithoutContext = SmartSuggestionsService.generateSuggestion('金額');

      // 帶上下文的建議應該更有信心
      expect(suggestionWithContext.confidence).toBeGreaterThanOrEqual(suggestionWithoutContext.confidence);
    });
  });
});
