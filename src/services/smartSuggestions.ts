// PrintCoord - 智慧建議服務

import { FieldType, SuggestionResult } from "../types";

// 學習記錄介面
interface LearningRecord {
  text: string;
  context: string[];
  userChoice: FieldType;
  confidence: number;
  timestamp: Date;
}

// 模式分析結果
interface PatternAnalysis {
  commonPatterns: Array<{
    pattern: string;
    fieldType: FieldType;
    frequency: number;
    confidence: number;
  }>;
  contextPatterns: Array<{
    context: string;
    suggestions: FieldType[];
    accuracy: number;
  }>;
}

export class SmartSuggestionsService {
  private static learningData: LearningRecord[] = [];
  private static readonly STORAGE_KEY = "tableTemplate_learningData";

  /**
   * 初始化學習數據
   */
  static initialize(): void {
    // 載入本地存儲的學習數據
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.learningData = parsed.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }));
      } catch (error) {
        console.warn("Failed to load learning data:", error);
        this.learningData = [];
      }
    }

    // 如果沒有學習數據，載入預設知識庫
    if (this.learningData.length === 0) {
      this.loadDefaultKnowledge();
    }
  }

  /**
   * 載入預設知識庫
   */
  private static loadDefaultKnowledge(): void {
    const defaultRecords: LearningRecord[] = [
      // 中文常見模式
      {
        text: "姓名",
        context: ["發票", "收件人", "客戶"],
        userChoice: FieldType.TEXT,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "地址",
        context: ["發票", "收件人"],
        userChoice: FieldType.TEXT,
        confidence: 0.85,
        timestamp: new Date(),
      },
      {
        text: "電話",
        context: ["聯絡", "客戶"],
        userChoice: FieldType.TEXT,
        confidence: 0.8,
        timestamp: new Date(),
      },
      {
        text: "金額",
        context: ["總計", "小計"],
        userChoice: FieldType.NUMBER,
        confidence: 0.95,
        timestamp: new Date(),
      },
      {
        text: "數量",
        context: ["產品", "項目"],
        userChoice: FieldType.NUMBER,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "日期",
        context: ["發票", "訂單"],
        userChoice: FieldType.DATE,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "型號",
        context: ["產品", "規格"],
        userChoice: FieldType.TEXT,
        confidence: 0.8,
        timestamp: new Date(),
      },
      {
        text: "單價",
        context: ["價格", "報價"],
        userChoice: FieldType.NUMBER,
        confidence: 0.85,
        timestamp: new Date(),
      },

      // 英文常見模式
      {
        text: "Name",
        context: ["invoice", "customer"],
        userChoice: FieldType.TEXT,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "Address",
        context: ["billing", "shipping"],
        userChoice: FieldType.TEXT,
        confidence: 0.85,
        timestamp: new Date(),
      },
      {
        text: "Phone",
        context: ["contact", "customer"],
        userChoice: FieldType.TEXT,
        confidence: 0.8,
        timestamp: new Date(),
      },
      {
        text: "Amount",
        context: ["total", "subtotal"],
        userChoice: FieldType.NUMBER,
        confidence: 0.95,
        timestamp: new Date(),
      },
      {
        text: "Quantity",
        context: ["product", "item"],
        userChoice: FieldType.NUMBER,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "Date",
        context: ["invoice", "order"],
        userChoice: FieldType.DATE,
        confidence: 0.9,
        timestamp: new Date(),
      },
      {
        text: "Model",
        context: ["product", "spec"],
        userChoice: FieldType.TEXT,
        confidence: 0.8,
        timestamp: new Date(),
      },
      {
        text: "Unit Price",
        context: ["pricing", "quote"],
        userChoice: FieldType.NUMBER,
        confidence: 0.85,
        timestamp: new Date(),
      },

      // 特殊欄位
      {
        text: "同意",
        context: ["合約", "條款"],
        userChoice: FieldType.CHECKBOX,
        confidence: 0.8,
        timestamp: new Date(),
      },
      {
        text: "類型",
        context: ["產品", "服務"],
        userChoice: FieldType.SELECT,
        confidence: 0.75,
        timestamp: new Date(),
      },
      {
        text: "狀態",
        context: ["訂單", "處理"],
        userChoice: FieldType.SELECT,
        confidence: 0.7,
        timestamp: new Date(),
      },
    ];

    this.learningData = defaultRecords;
    this.saveLearningData();
  }

  /**
   * 根據文字和上下文生成智慧建議
   */
  static generateSuggestion(
    text: string,
    context: string[] = []
  ): SuggestionResult {
    const cleanText = text.trim().toLowerCase();
    const cleanContext = context.map((c) => c.toLowerCase());

    // 計算各欄位類型的匹配度
    const scores = this.calculateFieldTypeScores(cleanText, cleanContext);

    // 排序並返回最佳建議
    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3); // 取前3名

    const bestMatch = sortedScores[0];
    const alternatives = sortedScores
      .slice(1)
      .map(([fieldType, confidence]) => ({
        fieldType: fieldType as FieldType,
        confidence,
      }));

    return {
      fieldType: bestMatch[0] as FieldType,
      confidence: bestMatch[1],
      reasoning: this.generateReasoning(
        cleanText,
        cleanContext,
        bestMatch[0] as FieldType
      ),
      alternatives,
    };
  }

  /**
   * 計算各欄位類型的匹配分數
   */
  private static calculateFieldTypeScores(
    text: string,
    context: string[]
  ): Record<FieldType, number> {
    const scores: Record<FieldType, number> = {
      [FieldType.TEXT]: 0.2, // 預設分數降低，讓明確類型脫穎而出
      [FieldType.NUMBER]: 0,
      [FieldType.DATE]: 0,
      [FieldType.SELECT]: 0,
      [FieldType.CHECKBOX]: 0,
    };

    // 關鍵字啟發式
    if (/日期|時間|date|time/.test(text)) {
      scores[FieldType.DATE] = Math.max(scores[FieldType.DATE], 0.8);
    }
    if (
      /金額|總額|總金額|amount|price|total|數量|quantity|單價|price/.test(text)
    ) {
      scores[FieldType.NUMBER] = Math.max(scores[FieldType.NUMBER], 0.8);
    }
    if (/狀態|類型|種類|status|type|category/.test(text)) {
      scores[FieldType.SELECT] = Math.max(scores[FieldType.SELECT], 0.6);
    }
    if (/同意|確認|checkbox|accept|agree/.test(text)) {
      scores[FieldType.CHECKBOX] = Math.max(scores[FieldType.CHECKBOX], 0.6);
    }

    // 基於學習數據計算分數
    for (const record of this.learningData) {
      let textMatch = 0;
      let contextMatch = 0;

      // 文字匹配度
      if (
        record.text.toLowerCase().includes(text) ||
        text.includes(record.text.toLowerCase())
      ) {
        textMatch = 0.7;
      } else {
        // 模糊匹配
        const similarity = this.calculateStringSimilarity(
          text,
          record.text.toLowerCase()
        );
        textMatch = similarity * 0.5;
      }

      // 上下文匹配度
      if (context.length > 0 && record.context.length > 0) {
        const contextOverlap = context.filter((c) =>
          record.context.some(
            (rc) => rc.toLowerCase().includes(c) || c.includes(rc.toLowerCase())
          )
        ).length;
        contextMatch =
          contextOverlap / Math.max(context.length, record.context.length);
      }

      // 總分 = 文字匹配 * 0.6 + 上下文匹配 * 0.3 + 歷史準確度 * 0.1
      const totalScore =
        textMatch * 0.6 + contextMatch * 0.3 + record.confidence * 0.1;

      scores[record.userChoice] = Math.max(
        scores[record.userChoice],
        totalScore * record.confidence
      );
    }

    // 正規化分數到 0-1 範圍
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      Object.keys(scores).forEach((key) => {
        scores[key as FieldType] = scores[key as FieldType] / maxScore;
      });
    }

    return scores;
  }

  /**
   * 生成建議理由
   */
  private static generateReasoning(
    text: string,
    context: string[],
    suggestedType: FieldType
  ): string {
    const reasons = [];

    // 基於文字內容的理由
    switch (suggestedType) {
      case FieldType.NUMBER:
        if (/\d/.test(text) || text.includes("金額") || text.includes("數量")) {
          reasons.push("文字包含數字或相關關鍵字");
        }
        break;
      case FieldType.DATE:
        if (text.includes("日期") || text.includes("時間")) {
          reasons.push("文字包含日期相關關鍵字");
        }
        break;
      case FieldType.CHECKBOX:
        if (text.includes("同意") || text.includes("確認")) {
          reasons.push("適合二元選擇的內容");
        }
        break;
      case FieldType.SELECT:
        if (text.includes("類型") || text.includes("狀態")) {
          reasons.push("適合多選項選擇的內容");
        }
        break;
    }

    // 基於上下文的理由
    if (context.length > 0) {
      reasons.push(`根據文檔上下文 (${context.slice(0, 2).join(", ")})`);
    }

    // 基於學習歷史的理由
    const similarRecords = this.learningData.filter(
      (r) =>
        r.text.toLowerCase().includes(text.toLowerCase().slice(0, 3)) &&
        r.userChoice === suggestedType
    );

    if (similarRecords.length > 0) {
      reasons.push(`基於 ${similarRecords.length} 個相似案例的學習`);
    }

    return reasons.length > 0 ? reasons.join("; ") : "基於智能分析的建議";
  }

  /**
   * 記錄用戶選擇用於學習
   */
  static recordUserChoice(
    text: string,
    context: string[],
    chosenType: FieldType,
    accepted: boolean
  ): void {
    const record: LearningRecord = {
      text,
      context,
      userChoice: chosenType,
      confidence: accepted ? 1.0 : 0.3, // 接受的選擇信心更高
      timestamp: new Date(),
    };

    this.learningData.push(record);

    // 限制學習數據大小，避免過大
    if (this.learningData.length > 1000) {
      // 保留最近的500條和最自信的500條
      this.learningData = this.learningData
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 500)
        .concat(
          this.learningData
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 500)
        )
        .filter(
          (record, index, arr) =>
            arr.findIndex(
              (r) =>
                r.text === record.text && r.userChoice === record.userChoice
            ) === index
        );
    }

    this.saveLearningData();
  }

  /**
   * 批量建議欄位類型
   */
  static generateBulkSuggestions(
    fields: Array<{ text: string; context?: string[] }>
  ): SuggestionResult[] {
    return fields.map((field) =>
      this.generateSuggestion(field.text, field.context || [])
    );
  }

  /**
   * 分析學習模式的統計信息
   */
  static getLearningStats(): {
    totalRecords: number;
    fieldTypeDistribution: Record<FieldType, number>;
    averageConfidence: number;
    recentAccuracy: number;
  } {
    const fieldTypeDistribution: Record<FieldType, number> = {
      [FieldType.TEXT]: 0,
      [FieldType.NUMBER]: 0,
      [FieldType.DATE]: 0,
      [FieldType.SELECT]: 0,
      [FieldType.CHECKBOX]: 0,
    };

    this.learningData.forEach((record) => {
      fieldTypeDistribution[record.userChoice]++;
    });

    const totalConfidence = this.learningData.reduce(
      (sum, record) => sum + record.confidence,
      0
    );
    const averageConfidence =
      this.learningData.length > 0
        ? totalConfidence / this.learningData.length
        : 0;

    // 最近30天的準確度
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecords = this.learningData.filter(
      (record) => record.timestamp > thirtyDaysAgo
    );
    const recentAccuracy =
      recentRecords.length > 0
        ? recentRecords.reduce((sum, record) => sum + record.confidence, 0) /
          recentRecords.length
        : 0;

    return {
      totalRecords: this.learningData.length,
      fieldTypeDistribution,
      averageConfidence,
      recentAccuracy,
    };
  }

  /**
   * 清除學習數據
   */
  static clearLearningData(): void {
    this.learningData = [];
    this.loadDefaultKnowledge();
  }

  /**
   * 保存學習數據到本地存儲
   */
  private static saveLearningData(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.learningData));
    } catch (error) {
      console.warn("Failed to save learning data:", error);
    }
  }

  /**
   * 計算字串相似度 (簡單的 Levenshtein 距離)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein 距離計算
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替換
            matrix[i][j - 1] + 1, // 插入
            matrix[i - 1][j] + 1 // 刪除
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
