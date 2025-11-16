import {
  FieldType,
  BehaviorExportData,
  UserAction,
  FieldChoiceRecord,
  BehaviorPattern,
} from "../types";

import { SmartSuggestionsService } from "./smartSuggestions";

export class UserBehaviorTracker {
  private static actions: UserAction[] = [];
  private static fieldChoices: FieldChoiceRecord[] = [];
  private static readonly ACTIONS_KEY = "tableTemplate_userActions";
  private static readonly CHOICES_KEY = "tableTemplate_fieldChoices";

  /**
   * 初始化追蹤器
   */
  static initialize(): void {
    this.loadStoredData();
  }

  /**
   * 記錄欄位選擇行為
   */
  static recordFieldChoice(
    text: string,
    context: string[],
    suggestedType: FieldType,
    chosenType: FieldType,
    responseTime: number = 0
  ): void {
    const accepted = suggestedType === chosenType;

    const record: FieldChoiceRecord = {
      text,
      context,
      suggestedType,
      chosenType,
      accepted,
      confidence: 0, // 會在記錄到智慧建議服務時更新
      responseTime,
    };

    this.fieldChoices.push(record);

    // 限制記錄數量
    if (this.fieldChoices.length > 1000) {
      this.fieldChoices = this.fieldChoices.slice(-500);
    }

    // 記錄到智慧建議服務進行學習
    SmartSuggestionsService.recordUserChoice(
      text,
      context,
      chosenType,
      accepted
    );

    this.saveStoredData();
  }

  /**
   * 記錄一般用戶行為
   */
  static recordAction(action: string, data?: unknown): void {
    const userAction: UserAction = {
      action,
      timestamp: new Date(),
      data,
    };

    this.actions.push(userAction);

    // 限制記錄數量
    if (this.actions.length > 2000) {
      this.actions = this.actions.slice(-1000);
    }

    this.saveStoredData();
  }

  /**
   * 分析用戶行為模式
   */
  static analyzeBehaviorPatterns(): BehaviorPattern {
    const pattern: BehaviorPattern = {
      preferredFieldTypes: {
        [FieldType.TEXT]: 0,
        [FieldType.NUMBER]: 0,
        [FieldType.DATE]: 0,
        [FieldType.SELECT]: 0,
        [FieldType.CHECKBOX]: 0,
      },
      acceptanceRate: 0,
      averageResponseTime: 0,
      commonCorrections: [],
    };

    if (this.fieldChoices.length === 0) {
      return pattern;
    }

    // 計算偏好欄位類型
    this.fieldChoices.forEach((choice) => {
      pattern.preferredFieldTypes[choice.chosenType]++;
    });

    // 正規化偏好分數
    const totalChoices = this.fieldChoices.length;
    Object.keys(pattern.preferredFieldTypes).forEach((key) => {
      pattern.preferredFieldTypes[key as FieldType] /= totalChoices;
    });

    // 計算接受率
    const acceptedChoices = this.fieldChoices.filter(
      (choice) => choice.accepted
    ).length;
    pattern.acceptanceRate = acceptedChoices / totalChoices;

    // 計算平均響應時間
    const validResponseTimes = this.fieldChoices
      .filter((choice) => choice.responseTime > 0)
      .map((choice) => choice.responseTime);

    if (validResponseTimes.length > 0) {
      pattern.averageResponseTime =
        validResponseTimes.reduce((sum, time) => sum + time, 0) /
        validResponseTimes.length;
    }

    // 分析常見修正
    const corrections: Record<string, number> = {};
    this.fieldChoices
      .filter((choice) => !choice.accepted)
      .forEach((choice) => {
        const key = `${choice.suggestedType}->${choice.chosenType}`;
        corrections[key] = (corrections[key] || 0) + 1;
      });

    pattern.commonCorrections = Object.entries(corrections)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, frequency]) => {
        const [fromType, toType] = key.split("->") as [FieldType, FieldType];
        return { fromType, toType, frequency };
      });

    return pattern;
  }

  /**
   * 獲取用戶偏好設定
   */
  static getUserPreferences(): {
    autoAcceptHighConfidence: boolean; // 是否自動接受高信心建議
    showAlternatives: boolean; // 是否顯示替代建議
    learningEnabled: boolean; // 是否啟用學習功能
  } {
    const stored = localStorage.getItem("tableTemplate_userPreferences");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn("Failed to load user preferences:", error);
      }
    }

    // 預設設定
    return {
      autoAcceptHighConfidence: false,
      showAlternatives: true,
      learningEnabled: true,
    };
  }

  /**
   * 更新用戶偏好設定
   */
  static updateUserPreferences(
    preferences: Partial<{
      autoAcceptHighConfidence: boolean;
      showAlternatives: boolean;
      learningEnabled: boolean;
    }>
  ): void {
    const current = this.getUserPreferences();
    const updated = { ...current, ...preferences };

    try {
      localStorage.setItem(
        "tableTemplate_userPreferences",
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn("Failed to save user preferences:", error);
    }
  }

  /**
   * 獲取使用統計
   */
  static getUsageStats(): {
    totalSessions: number;
    totalFieldChoices: number;
    averageSessionTime: number;
    mostUsedFieldType: FieldType;
    lastActivity: Date | null;
  } {
    const sessions = this.actions.filter(
      (action) => action.action === "session_start"
    ).length;
    const lastActivity =
      this.actions.length > 0
        ? this.actions[this.actions.length - 1].timestamp
        : null;

    // 估算平均會話時間（基於操作間隔）
    let averageSessionTime = 0;
    if (this.actions.length > 1) {
      const timeSpans = [];
      for (let i = 1; i < this.actions.length; i++) {
        const timeDiff =
          this.actions[i].timestamp.getTime() -
          this.actions[i - 1].timestamp.getTime();
        if (timeDiff < 30 * 60 * 1000) {
          // 30分鐘內的操作視為同一會話
          timeSpans.push(timeDiff);
        }
      }
      if (timeSpans.length > 0) {
        averageSessionTime =
          timeSpans.reduce((sum, time) => sum + time, 0) / timeSpans.length;
      }
    }

    // 最常用的欄位類型
    const patterns = this.analyzeBehaviorPatterns();
    const mostUsedType = Object.entries(patterns.preferredFieldTypes).sort(
      ([, a], [, b]) => b - a
    )[0][0] as FieldType;

    return {
      totalSessions: sessions,
      totalFieldChoices: this.fieldChoices.length,
      averageSessionTime,
      mostUsedFieldType: mostUsedType,
      lastActivity,
    };
  }

  /**
   * 導出行為數據（用於調試或遷移）
   */
  static exportBehaviorData(): BehaviorExportData {
    return {
      actions: [...this.actions],
      fieldChoices: [...this.fieldChoices],
      patterns: this.analyzeBehaviorPatterns(),
      stats: this.getUsageStats(),
    };
  }

  /**
   * 清除所有行為數據
   */
  static clearBehaviorData(): void {
    this.actions = [];
    this.fieldChoices = [];
    this.saveStoredData();
  }

  /**
   * 載入存儲的數據
   */
  private static loadStoredData(): void {
    // 載入動作記錄
    const actionsData = localStorage.getItem(this.ACTIONS_KEY);
    if (actionsData) {
      try {
        this.actions = JSON.parse(actionsData).map((action: { action: string; timestamp: string; data?: unknown }) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      } catch (error) {
        console.warn("Failed to load actions data:", error);
        this.actions = [];
      }
    }

    // 載入欄位選擇記錄
    const choicesData = localStorage.getItem(this.CHOICES_KEY);
    if (choicesData) {
      try {
        this.fieldChoices = JSON.parse(choicesData);
      } catch (error) {
        console.warn("Failed to load field choices data:", error);
        this.fieldChoices = [];
      }
    }
  }

  /**
   * 保存數據到本地存儲
   */
  private static saveStoredData(): void {
    try {
      localStorage.setItem(this.ACTIONS_KEY, JSON.stringify(this.actions));
      localStorage.setItem(this.CHOICES_KEY, JSON.stringify(this.fieldChoices));
    } catch (error) {
      console.warn("Failed to save behavior data:", error);
    }
  }
}
