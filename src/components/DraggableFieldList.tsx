"use client";

import React, { useState } from "react";
import { FieldArea, FieldType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface DraggableFieldListProps {
  fields: FieldArea[];
  onFieldsChange: (fields: FieldArea[]) => void;
}

export default function DraggableFieldList({
  fields,
  onFieldsChange,
}: DraggableFieldListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);

    onFieldsChange(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleFieldUpdate = (id: string, updates: Partial<FieldArea>) => {
    const newFields = fields.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    onFieldsChange(newFields);
  };

  const handleFieldDelete = (id: string) => {
    const newFields = fields.filter((f) => f.id !== id);
    onFieldsChange(newFields);
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (fields.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        尚未有欄位，請點擊「開始掃描」偵測欄位
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {fields.map((field, index) => {
        const isExpanded = expandedId === field.id;
        const isDragging = draggedIndex === index;

        return (
          <div
            key={field.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-md border border-border/40 bg-card/50 transition-all ${
              isDragging ? "opacity-50" : "opacity-100"
            }`}
          >
            {/* 欄位標題列 */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleExpand(field.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {field.labelZh || field.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {field.fieldType} • {Math.round(field.size.width)} × {Math.round(field.size.height)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                ({Math.round(field.position.x)}, {Math.round(field.position.y)})
              </span>
            </div>

            {/* 展開的編輯表單 */}
            {isExpanded && (
              <div className="border-t border-border/30 bg-muted/10 px-3 py-3 space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    欄位名稱
                  </label>
                  <Input
                    value={field.labelZh || field.name}
                    onChange={(e) =>
                      handleFieldUpdate(field.id, { labelZh: e.target.value })
                    }
                    className="h-8 text-sm"
                    placeholder="輸入欄位名稱"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    欄位類型
                  </label>
                  <Select
                    value={field.fieldType}
                    onValueChange={(value: FieldType) =>
                      handleFieldUpdate(field.id, { fieldType: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">文字</SelectItem>
                      <SelectItem value="number">數字</SelectItem>
                      <SelectItem value="date">日期</SelectItem>
                      <SelectItem value="checkbox">核取方塊</SelectItem>
                      <SelectItem value="signature">簽名</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">X</label>
                    <Input
                      type="number"
                      value={Math.round(field.position.x)}
                      onChange={(e) =>
                        handleFieldUpdate(field.id, {
                          position: {
                            ...field.position,
                            x: Number(e.target.value),
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Y</label>
                    <Input
                      type="number"
                      value={Math.round(field.position.y)}
                      onChange={(e) =>
                        handleFieldUpdate(field.id, {
                          position: {
                            ...field.position,
                            y: Number(e.target.value),
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">寬度</label>
                    <Input
                      type="number"
                      value={Math.round(field.size.width)}
                      onChange={(e) =>
                        handleFieldUpdate(field.id, {
                          size: {
                            ...field.size,
                            width: Number(e.target.value),
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">高度</label>
                    <Input
                      type="number"
                      value={Math.round(field.size.height)}
                      onChange={(e) =>
                        handleFieldUpdate(field.id, {
                          size: {
                            ...field.size,
                            height: Number(e.target.value),
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleFieldDelete(field.id)}
                  className="w-full h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  刪除欄位
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
