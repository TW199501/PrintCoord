"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldArea, FieldType } from "../types";
import EditorWithRuler from "./EditorWithRuler";

interface TemplateEditorProps {
  canvasData?: string; // Base64 encoded image
  fields: FieldArea[];
  onFieldsChange: (fields: FieldArea[]) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

// 用來記錄背景圖在 Canvas 上的變換
interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  imgWidth: number;
  imgHeight: number;
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
  const [hasImage, setHasImage] = useState(false);

  // 背景圖縮放與位移資訊
  const [imageTransform, setImageTransform] = useState<ImageTransform | null>(null);

  const handlePrint = useCallback(() => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    iframe.onload = () => {
      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframeWindow?.document;

      if (!iframeWindow || !iframeDoc) {
        cleanup();
        return;
      }

      const executePrint = () => {
        iframeWindow.focus();
        iframeWindow.print();
        cleanup();
      };

      const img = iframeDoc.getElementById("print-image") as HTMLImageElement | null;

      if (!img) {
        setTimeout(executePrint, 50);
        return;
      }

      if (img.complete) {
        setTimeout(executePrint, 50);
      } else {
        img.onload = () => setTimeout(executePrint, 50);
        img.onerror = cleanup;
      }
    };

    iframe.srcdoc = `<!DOCTYPE html><html><head><title>列印模板</title>
      <style>
        @page { size: 210mm 297mm; margin: 0; }
        html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; }
        img { width: 210mm; height: 297mm; }
      </style>
    </head><body>
      <img id="print-image" src="${dataUrl}" alt="Template" />
    </body></html>`;
  }, []);

  // 初始化 Canvas + 背景圖片
  useEffect(() => {
    if (!canvasRef.current) return;

    // A4 尺寸（21cm × 29.7cm @ 96 DPI）
    const canvasWidth = 794;
    const canvasHeight = 1123;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#f8f9fa",
    });

    fabricCanvasRef.current = canvas;

    // 載入背景圖片
    if (canvasData) {
      try {
        const imgElement = new Image();
        imgElement.crossOrigin = "anonymous";
        imgElement.onload = () => {
          const currentCanvas = fabricCanvasRef.current;
          if (!currentCanvas) return;

          // 設定 Canvas 尺寸（仍採用固定 A4）
          currentCanvas.setDimensions({
            width: canvasWidth,
            height: canvasHeight,
          });

          setHasImage(true);

          const fabricImg = new fabric.Image(imgElement);

          // 計算縮放比例，讓圖片填滿整個 Canvas（你原本是用 max）
          const scaleX = canvasWidth / imgElement.width;
          const scaleY = canvasHeight / imgElement.height;
          const scale = Math.max(scaleX, scaleY);

          const left = (canvasWidth - imgElement.width * scale) / 2;
          const top = (canvasHeight - imgElement.height * scale) / 2;

          fabricImg.set({
            scaleX: scale,
            scaleY: scale,
            originX: "left",
            originY: "top",
            left,
            top,
          });

          // 存下背景圖的 transform，之後畫欄位要用同一套
          setImageTransform({
            scale,
            offsetX: left,
            offsetY: top,
            imgWidth: imgElement.width,
            imgHeight: imgElement.height,
          });

          currentCanvas.backgroundImage = fabricImg;
          currentCanvas.renderAll();
        };
        imgElement.onerror = () => {
          console.warn("無法載入背景圖片: 圖片載入失敗");
        };
        imgElement.src = canvasData;
      } catch (error) {
        console.warn("無法載入背景圖片:", error);
      }
    }

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    return () => {
      canvas.dispose();
    };
  }, [canvasData, onCanvasReady]);

  // 畫出 fields（藍色框）── 套用跟背景圖一樣的 scale / offset
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !imageTransform) return;

    const { scale, offsetX, offsetY } = imageTransform;

    // 先清掉舊的欄位（保留背景圖）
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      const objWithData = obj as fabric.FabricObject & { data?: FieldArea };
      // 這裡假設背景圖是 backgroundImage，不在 objects list 裡
      if (
        objWithData.data ||
        obj.type === "rect" ||
        obj.type === "text"
      ) {
        canvas.remove(obj);
      }
    });

    // 重新把所有欄位畫上去
    fields.forEach((field) => {
      // 原始座標（偵測時用的，是以原圖片尺寸為基準）
      const baseX = field.position.x;
      const baseY = field.position.y;
      const baseW = field.size.width;
      const baseH = field.size.height;

      // 轉成 Canvas 上的實際位置
      const x = offsetX + baseX * scale;
      const y = offsetY + baseY * scale;
      const w = baseW * scale;
      const h = baseH * scale;

      const rect = new fabric.Rect({
        left: x,
        top: y,
        width: w,
        height: h,
        fill: "rgba(59, 130, 246, 0.2)",
        stroke: "#3b82f6",
        strokeWidth: 2,
        selectable: true,
        hasControls: true,
        lockRotation: true,
        data: field,
      });

      const text = new fabric.Text(field.labelZh || field.name, {
        left: x + 5,
        top: y + 5,
        fontSize: 12,
        fill: "#3b82f6",
        selectable: false,
      });

      canvas.add(rect);
      canvas.add(text);
    });

    canvas.renderAll();
  }, [fields, imageTransform]);

  // 添加新欄位（這段先保留原本邏輯，之後如果要跟偵測共用座標系再加 inverse transform）
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

      const left = rect.left || 0;
      const top = rect.top || 0;
      const width = rect.width || 100;
      const height = rect.height || 30;

      // 如果之後想讓「手動畫出來的欄位」也回到原始圖片座標，
      // 可以在這裡用 imageTransform 做反向換算：
      // baseX = (left - offsetX) / scale; baseY = (top - offsetY) / scale; ...

      const newField: FieldArea = {
        id: `field_${Date.now()}`,
        name: `欄位 ${fields.length + 1}`,
        position: { x: left, y: top },
        size: { width, height },
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
  }, [fields, onFieldsChange]);

  return (
    <Card className="overflow-hidden" style={{ width: "fit-content", marginTop: "1px" }}>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span>模板編輯器</span>
            <span className="text-xs text-pc-text-muted font-normal">專業尺規視圖</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              列印
            </Button>
            <Button onClick={addField} disabled={isDrawing} size="sm">
              {isDrawing ? "繪製中..." : "添加欄位"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="overflow-auto"
          style={{
            height: hasImage ? "fit-content" : "400px",
            maxHeight: hasImage ? "none" : "400px",
          }}
        >
          <EditorWithRuler width={794} height={1123} showGrid={true} unit="cm">
            <canvas
              ref={canvasRef}
              className="block"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </EditorWithRuler>
        </div>
        {isDrawing && (
          <p className="text-sm text-blue-600 mt-2 px-6">
            拖拽鼠標繪製欄位區域
          </p>
        )}
      </CardContent>
    </Card>
  );
}
