"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldType, FieldArea, SuggestionResult } from "../types";
import { SmartSuggestionsService } from "../services/smartSuggestions";
import { UserBehaviorTracker } from "../services/userBehaviorTracker";
import { Check, X, RotateCcw, Lightbulb, TrendingUp } from "lucide-react";

interface FieldSuggestionsProps {
  field: FieldArea;
  onFieldUpdate: (fieldId: string, updates: Partial<FieldArea>) => void;
  context?: string[]; // 周圍的欄位名稱，用於提供上下文
}

export default function FieldSuggestions({
  field,
  onFieldUpdate,
  context = [],
}: FieldSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  type SuggestionAlternative = SuggestionResult["alternatives"][number];

  // 初始化智慧建議服務
  useEffect(() => {
    SmartSuggestionsService.initialize();
  }, []);

  // 當欄位文字改變時，生成新建議
  useEffect(() => {
    if (field.name.trim()) {
      generateSuggestion();
    }
  }, [field.name, context]);

  const generateSuggestion = async () => {
    setIsLoading(true);
    setStartTime(Date.now());

    try {
      const result = SmartSuggestionsService.generateSuggestion(
        field.name,
        context,
      );
      setSuggestion(result);
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptSuggestion = (suggestedType: FieldType) => {
    const responseTime = Date.now() - startTime;

    // 更新欄位類型
    onFieldUpdate(field.id, { fieldType: suggestedType });

    // 記錄用戶行為
    UserBehaviorTracker.recordFieldChoice(
      field.name,
      context,
      suggestion?.fieldType || FieldType.TEXT,
      suggestedType,
      responseTime,
    );

    // 重新生成建議（如果還有其他替代方案）
    if (suggestion && suggestion.alternatives.length > 0) {
      const filteredAlternatives = suggestion.alternatives.filter(
        (alt: SuggestionAlternative) => alt.fieldType !== suggestedType,
      );

      setSuggestion({
        ...suggestion,
        alternatives: filteredAlternatives,
      });
    } else {
      setSuggestion(null);
    }
  };

  const rejectSuggestion = () => {
    const responseTime = Date.now() - startTime;

    // 記錄用戶拒絕建議
    UserBehaviorTracker.recordFieldChoice(
      field.name,
      context,
      suggestion?.fieldType || FieldType.TEXT,
      field.fieldType, // 用戶當前選擇
      responseTime,
    );

    setSuggestion(null);
  };

  const getFieldTypeLabel = (type: FieldType): string => {
    switch (type) {
      case FieldType.TEXT:
        return "文字";
      case FieldType.NUMBER:
        return "數字";
      case FieldType.DATE:
        return "日期";
      case FieldType.SELECT:
        return "下拉選單";
      case FieldType.CHECKBOX:
        return "核取方塊";
      default:
        return "未知";
    }
  };

  const getFieldTypeColor = (type: FieldType): string => {
    switch (type) {
      case FieldType.TEXT:
        return "bg-blue-100 text-blue-800";
      case FieldType.NUMBER:
        return "bg-green-100 text-green-800";
      case FieldType.DATE:
        return "bg-purple-100 text-purple-800";
      case FieldType.SELECT:
        return "bg-orange-100 text-orange-800";
      case FieldType.CHECKBOX:
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceLevel = (
    confidence: number,
  ): { label: string; color: string } => {
    if (confidence >= 0.8)
      return { label: "非常確定", color: "text-green-600" };
    if (confidence >= 0.6) return { label: "較為確定", color: "text-blue-600" };
    if (confidence >= 0.4)
      return { label: "一般確定", color: "text-yellow-600" };
    return { label: "不太確定", color: "text-red-600" };
  };

  if (!field.name.trim()) {
    return null; // 沒有欄位名稱時不顯示建議
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            智慧建議
          </div>
          {suggestion && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />

              <span className="text-xs text-gray-500">
                信心: {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">分析中...</span>
          </div>
        )}

        {suggestion && !isLoading && (
          <div className="space-y-3">
            {/* 主要建議 */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getFieldTypeColor(suggestion.fieldType)}>
                      {getFieldTypeLabel(suggestion.fieldType)}
                    </Badge>
                    <span
                      className={`text-xs ${getConfidenceLevel(suggestion.confidence).color}`}
                    >
                      {getConfidenceLevel(suggestion.confidence).label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {suggestion.reasoning}
                  </p>
                  {field.fieldType === suggestion.fieldType ? (
                    <p className="text-xs text-green-600">✓ 已應用此建議</p>
                  ) : (
                    <p className="text-xs text-blue-600">
                      建議將欄位類型改為此選項
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  {field.fieldType !== suggestion.fieldType && (
                    <Button
                      onClick={() => acceptSuggestion(suggestion.fieldType)}
                      className="h-7 px-2"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button onClick={rejectSuggestion} className="h-7 px-2">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 替代建議 */}
            {suggestion.alternatives.length > 0 && (
              <>
                <div className="border-t border-border" role="separator" />

                <div>
                  <p className="text-xs text-gray-500 mb-2">其他建議選項:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.alternatives
                      .slice(0, 3)
                      .map((alt: SuggestionAlternative, index: number) => (
                        <button
                          key={index}
                          onClick={() => acceptSuggestion(alt.fieldType)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                        >
                          <Badge
                            className={`text-xs ${getFieldTypeColor(alt.fieldType)}`}
                          >
                            {getFieldTypeLabel(alt.fieldType)}
                          </Badge>
                          <span className="text-gray-500">
                            {Math.round(alt.confidence * 100)}%
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!suggestion && !isLoading && field.name.trim() && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">沒有可用的建議</p>
            <Button
              size="sm"
              variant="outline"
              onClick={generateSuggestion}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              重新分析
            </Button>
          </div>
        )}

        {/* 學習統計（可選顯示） */}
        {process.env.NODE_ENV === "development" && (
          <>
            <div className="border-t border-border" role="separator" />

            <div className="text-xs text-gray-400">
              <p>
                學習數據:{" "}
                {SmartSuggestionsService.getLearningStats().totalRecords} 條記錄
              </p>
              <p>
                平均信心:{" "}
                {Math.round(
                  SmartSuggestionsService.getLearningStats().averageConfidence *
                    100,
                )}
                %
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
