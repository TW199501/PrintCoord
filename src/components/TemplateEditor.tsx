"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldArea, FieldType } from "../types";

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
  const [isDrawing, setIsDrawing] = useState(false);

  // 初始化 Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // 初始化時使用預設尺寸（A4 比例）
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 595,
      height: 842,
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
          const currentCanvas = fabricCanvasRef.current;
          if (!currentCanvas) return;
          
          // 固定 Canvas 尺寸為 A4 比例（可根據螢幕調整）
          const canvasWidth = 600;  // 固定寬度
          const canvasHeight = 848; // A4 比例 (600 * 1.414)
          
          // 調整 Canvas 尺寸
          currentCanvas.setDimensions({
            width: canvasWidth,
            height: canvasHeight
          });
          
          // 創建 Fabric.js 圖片物件
          const fabricImg = new fabric.Image(imgElement);
          
          // 計算縮放比例，讓圖片填滿整個 Canvas（使用 max 而非 min）
          const scaleX = canvasWidth / imgElement.width;
          const scaleY = canvasHeight / imgElement.height;
          const scale = Math.max(scaleX, scaleY); // 使用 max 讓圖片填滿
          
          // 圖片縮放並置中
          fabricImg.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'left',
            originY: 'top',
            left: (canvasWidth - imgElement.width * scale) / 2,
            top: (canvasHeight - imgElement.height * scale) / 2
          });
          
          // 使用 Fabric.js 6.x 的方式設置背景圖片
          currentCanvas.backgroundImage = fabricImg;
          currentCanvas.renderAll();
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

    // 選擇事件（欄位編輯現在在右側 DraggableFieldList 中處理）

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

    const handleMouseDown = (e: fabric.TPointerEventInfo) => {
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

    const handleMouseMove = (e: fabric.TPointerEventInfo) => {
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

  // 監聽 fields 變化，同步更新 Canvas 上的藍色框
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // 清除所有欄位物件（保留背景圖）
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      const objWithData = obj as fabric.FabricObject & { data?: FieldArea };
      if (objWithData.data || obj.type === 'rect' || obj.type === 'text') {
        canvas.remove(obj);
      }
    });

    // 重新繪製所有欄位
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

      const text = new fabric.Text(field.labelZh || field.name, {
        left: field.position.x + 5,
        top: field.position.y + 5,
        fontSize: 12,
        fill: "#3b82f6",
        selectable: false,
      });

      canvas.add(rect);
      canvas.add(text);
    });

    canvas.renderAll();
  }, [fields]);

  // 欄位編輯功能已移至 DraggableFieldList 組件

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            模板編輯器
            <Button onClick={addField} disabled={isDrawing} size="sm">
              {isDrawing ? "繪製中..." : "添加欄位"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
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
  );
}
