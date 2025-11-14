"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldArea, FieldType } from "../types";
import { Sparkles } from "lucide-react";
import FieldSuggestions from "./FieldSuggestions";

interface TemplateEditorProps {
  canvasData?: string; // Base64 encoded image
  fields: FieldArea[];
  onFieldsChange: (fields: FieldArea[]) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export default function TemplateEditor({
  canvasData,
  fields,
  onFieldsChange,
  onCanvasReady,
}: TemplateEditorProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedField, setSelectedField] = useState<FieldArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 初始化 Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f8f9fa",
    });

    fabricCanvasRef.current = canvas;

    // 載入背景圖片
    if (canvasData) {
      try {
        // 使用圖片元素創建背景
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';
        imgElement.onload = () => {
          // 創建 Fabric.js 圖片物件
          const fabricImg = new fabric.Image(imgElement);
          
          // 設置圖片尺寸以適應 canvas
          const scaleX = canvas.width! / imgElement.width;
          const scaleY = canvas.height! / imgElement.height;
          const scale = Math.min(scaleX, scaleY);
          
          fabricImg.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'left',
            originY: 'top'
          });
          
          // 使用 Fabric.js 6.x 的方式設置背景圖片
          canvas.backgroundImage = fabricImg;
          canvas.renderAll();
        };
        imgElement.onerror = () => {
          console.warn('無法載入背景圖片: 圖片載入失敗');
        };
        imgElement.src = canvasData;
      } catch (error) {
        console.warn('無法載入背景圖片:', error);
      }
    }

    // 載入現有欄位
    fields.forEach((field) => {
      const rect = new fabric.Rect({
        left: field.position.x,
        top: field.position.y,
        width: field.size.width,
        height: field.size.height,
        fill: "rgba(59, 130, 246, 0.2)",
        stroke: "#3b82f6",
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        lockRotation: true,
        data: field,
      });

      // 添加文字標籤
      const text = new fabric.Text(field.name, {
        left: field.position.x + 5,
        top: field.position.y + 5,
        fontSize: 12,
        fill: "#3b82f6",
        selectable: false,
      });

      canvas.add(rect);
      canvas.add(text);
    });

    // 選擇事件
    canvas.on("selection:created", (e: any) => {
      const selected = e.selected?.[0];
      if (selected && selected.data) {
        setSelectedField(selected.data);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedField(null);
    });

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    return () => {
      canvas.dispose();
    };
  }, [canvasData, fields, onCanvasReady]);

  // 添加新欄位
  const addField = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    setIsDrawing(true);

    const canvas = fabricCanvasRef.current;
    let startX = 0;
    let startY = 0;
    let rect: fabric.Rect | null = null;

    const handleMouseDown = (e: any) => {
      if (!e.pointer) return;

      startX = e.pointer.x;
      startY = e.pointer.y;

      rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: "rgba(59, 130, 246, 0.2)",
        stroke: "#3b82f6",
        strokeWidth: 2,
        selectable: false,
      });

      canvas.add(rect);
    };

    const handleMouseMove = (e: any) => {
      if (!rect || !e.pointer) return;

      const width = e.pointer.x - startX;
      const height = e.pointer.y - startY;

      rect.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width < 0 ? e.pointer.x : startX,
        top: height < 0 ? e.pointer.y : startY,
      });

      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!rect) return;

      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);

      // 創建新欄位
      const newField: FieldArea = {
        id: `field_${Date.now()}`,
        name: `欄位 ${fields.length + 1}`,
        position: { x: rect.left || 0, y: rect.top || 0 },
        size: { width: rect.width || 100, height: rect.height || 30 },
        fieldType: FieldType.TEXT,
      };

      onFieldsChange([...fields, newField]);
      setIsDrawing(false);

      canvas.remove(rect);
      canvas.renderAll();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
  }, []);


  // 更新欄位
  const updateField = (fieldId: string, updates: Partial<FieldArea>) => {
    const updatedFields = fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field,
    );
    onFieldsChange(updatedFields);
  };

  // 刪除欄位
  const deleteField = (fieldId: string) => {
    const updatedFields = fields.filter((field) => field.id !== fieldId);
    onFieldsChange(updatedFields);
    setSelectedField(null);
  };

  return (
    <div className="flex gap-6">
      {/* Canvas 區域 */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              模板編輯器
              <Button onClick={addField} disabled={isDrawing}>
                {isDrawing ? "繪製中..." : "添加欄位"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
            {isDrawing && (
              <p className="text-sm text-blue-600 mt-2">拖拽鼠標繪製欄位區域</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 欄位屬性面板 */}
      <div className="w-80">
        <Card>
          <CardHeader>
            <CardTitle>欄位屬性</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedField ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    欄位名稱
                  </label>
                  <Input
                    value={selectedField.name}
                    onChange={(e) =>
                      updateField(selectedField.id, { name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    欄位類型
                  </label>
                  <Select
                    value={selectedField.fieldType}
                    onValueChange={(value: FieldType) =>
                      updateField(selectedField.id, { fieldType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FieldType.TEXT}>文字</SelectItem>
                      <SelectItem value={FieldType.NUMBER}>數字</SelectItem>
                      <SelectItem value={FieldType.DATE}>日期</SelectItem>
                      <SelectItem value={FieldType.SELECT}>下拉選單</SelectItem>
                      <SelectItem value={FieldType.CHECKBOX}>
                        核取方塊
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      X 座標
                    </label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.position.x)}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          position: {
                            ...selectedField.position,
                            x: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Y 座標
                    </label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.position.y)}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          position: {
                            ...selectedField.position,
                            y: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      寬度
                    </label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.size.width)}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          size: {
                            ...selectedField.size,
                            width: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      高度
                    </label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.size.height)}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          size: {
                            ...selectedField.size,
                            height: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full"
                >
                  刪除欄位
                </Button>

                {/* 智慧欄位建議 */}
                <FieldSuggestions
                  field={selectedField}
                  onFieldUpdate={updateField}
                  context={fields
                    .filter((f) => f.id !== selectedField.id)
                    .map((f) => f.name)}
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                請選擇一個欄位來編輯屬性
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
