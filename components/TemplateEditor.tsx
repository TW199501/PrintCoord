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
import { Position, Size, FieldArea, FieldType, OCRStatus } from "../types";
import { OCRService } from "../services/ocrService";
import { FieldDetectionService } from "../services/fieldDetection";
import { ScanLine, Sparkles, Loader2 } from "lucide-react";
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
}: TemplateEditorProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedField, setSelectedField] = useState<FieldArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>(OCRStatus.IDLE);
  const [ocrProgress, setOcrProgress] = useState(0);

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
      fabric.Image.fromURL(canvasData).then((img: any) => {
        (canvas as any).setBackgroundImage(img, canvas.renderAll.bind(canvas));
      });
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

  // OCR 自動檢測欄位
  const performOCR = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    setOcrStatus(OCRStatus.INITIALIZING);
    setOcrProgress(0);

    try {
      // 將 Canvas 轉換為圖片
      const canvas = fabricCanvasRef.current;
      const imageData = canvas.toDataURL();

      setOcrStatus(OCRStatus.PROCESSING);
      setOcrProgress(25);

      // 初始化 OCR
      await OCRService.initialize();
      setOcrProgress(50);

      // 執行 OCR
      const ocrResults = await OCRService.extractTextFromImage(imageData);
      setOcrProgress(75);

      // 檢測欄位
      const detectedFields = await FieldDetectionService.detectFieldsFromOCR(
        ocrResults.words,
        canvas.width || 800,
        canvas.height || 600,
      );

      // 合併現有欄位和新檢測到的欄位
      const existingIds = new Set(fields.map((f) => f.id));
      const newFields = detectedFields.filter((f) => !existingIds.has(f.id));

      if (newFields.length > 0) {
        onFieldsChange([...fields, ...newFields]);
        setOcrStatus(OCRStatus.COMPLETED);
        setOcrProgress(100);
      } else {
        setOcrStatus(OCRStatus.COMPLETED);
        setOcrProgress(100);
        alert("未檢測到新的欄位");
      }
    } catch (error) {
      console.error("OCR 處理失敗:", error);
      setOcrStatus(OCRStatus.ERROR);
      alert("OCR 處理失敗，請重試");
    } finally {
      // 清理
      setTimeout(() => {
        setOcrProgress(0);
        if (ocrStatus !== OCRStatus.ERROR) {
          setOcrStatus(OCRStatus.IDLE);
        }
      }, 2000);
    }
  }, [fields, onFieldsChange, ocrStatus]);

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
    <div className="flex gap-6" data-oid="xvakrur">
      {/* Canvas 區域 */}
      <div className="flex-1" data-oid="aphuitt">
        <Card data-oid="pswne4-">
          <CardHeader data-oid="m2uqv4x">
            <CardTitle
              className="flex items-center justify-between"
              data-oid="5_ptrzf"
            >
              模板編輯器
              <div className="flex gap-2" data-oid="xbdcqo:">
                <Button
                  onClick={performOCR}
                  disabled={
                    isDrawing ||
                    ocrStatus === OCRStatus.PROCESSING ||
                    ocrStatus === OCRStatus.INITIALIZING
                  }
                  data-oid="-ydkpmc"
                >
                  {ocrStatus === OCRStatus.PROCESSING ||
                  ocrStatus === OCRStatus.INITIALIZING ? (
                    <>
                      <Loader2
                        className="h-4 w-4 mr-2 animate-spin"
                        data-oid="z_d45ss"
                      />
                      {ocrStatus === OCRStatus.INITIALIZING
                        ? "初始化..."
                        : "識別中..."}
                    </>
                  ) : ocrStatus === OCRStatus.COMPLETED ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" data-oid="qg5p7e8" />
                      完成
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4 mr-2" data-oid="1w.0bsx" />
                      OCR 識別
                    </>
                  )}
                </Button>
                <Button
                  onClick={addField}
                  disabled={isDrawing}
                  data-oid="69sqwp3"
                >
                  {isDrawing ? "繪製中..." : "添加欄位"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent data-oid=":cp2_t1">
            <div
              className="border rounded-lg overflow-hidden"
              data-oid="3r3dmxq"
            >
              <canvas
                ref={canvasRef}
                className="block"
                style={{ maxWidth: "100%", height: "auto" }}
                data-oid="6fan3ao"
              />
            </div>
            {ocrProgress > 0 && (
              <div className="mt-2" data-oid="bv6qt:b">
                <div
                  className="flex justify-between text-sm text-gray-600 mb-1"
                  data-oid="p72jj-w"
                >
                  <span data-oid="0v.yz3y">OCR 處理進度</span>
                  <span data-oid="o4q8j7w">{ocrProgress}%</span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2"
                  data-oid="jkjppe."
                >
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                    data-oid="3_tk1.i"
                  />
                </div>
              </div>
            )}
            {isDrawing && (
              <p className="text-sm text-blue-600 mt-2" data-oid="e:oothg">
                拖拽鼠標繪製欄位區域
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 欄位屬性面板 */}
      <div className="w-80" data-oid="v63424g">
        <Card data-oid="5cvanhe">
          <CardHeader data-oid="6s.5meo">
            <CardTitle data-oid="9q_c7my">欄位屬性</CardTitle>
          </CardHeader>
          <CardContent data-oid="2nwrp9y">
            {selectedField ? (
              <div className="space-y-4" data-oid=":5iotkx">
                <div data-oid="j7tvo-i">
                  <label
                    className="block text-sm font-medium mb-1"
                    data-oid="ph7plkf"
                  >
                    欄位名稱
                  </label>
                  <Input
                    value={selectedField.name}
                    onChange={(e) =>
                      updateField(selectedField.id, { name: e.target.value })
                    }
                    data-oid="3.xzenf"
                  />
                </div>

                <div data-oid="7yzn681">
                  <label
                    className="block text-sm font-medium mb-1"
                    data-oid="32e-h2s"
                  >
                    欄位類型
                  </label>
                  <Select
                    value={selectedField.fieldType}
                    onValueChange={(value: FieldType) =>
                      updateField(selectedField.id, { fieldType: value })
                    }
                    data-oid="cvy.ppd"
                  >
                    <SelectTrigger data-oid="6idl.p9">
                      <SelectValue data-oid="faiqqaa" />
                    </SelectTrigger>
                    <SelectContent data-oid="y4l79:9">
                      <SelectItem value={FieldType.TEXT} data-oid="1y0u2jz">
                        文字
                      </SelectItem>
                      <SelectItem value={FieldType.NUMBER} data-oid="950_xnq">
                        數字
                      </SelectItem>
                      <SelectItem value={FieldType.DATE} data-oid="6poaw2t">
                        日期
                      </SelectItem>
                      <SelectItem value={FieldType.SELECT} data-oid="2alk::b">
                        下拉選單
                      </SelectItem>
                      <SelectItem value={FieldType.CHECKBOX} data-oid="gseft6f">
                        核取方塊
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2" data-oid="xh7pc81">
                  <div data-oid="q43sfjf">
                    <label
                      className="block text-sm font-medium mb-1"
                      data-oid="1espw_c"
                    >
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
                      data-oid="hc54-ex"
                    />
                  </div>
                  <div data-oid="fulw-de">
                    <label
                      className="block text-sm font-medium mb-1"
                      data-oid="6.t-e4z"
                    >
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
                      data-oid=".2_ku_2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2" data-oid="qccax39">
                  <div data-oid="lo7qaar">
                    <label
                      className="block text-sm font-medium mb-1"
                      data-oid="i75fv2h"
                    >
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
                      data-oid="8xi3n1_"
                    />
                  </div>
                  <div data-oid="owuh_5c">
                    <label
                      className="block text-sm font-medium mb-1"
                      data-oid="gv9-:n9"
                    >
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
                      data-oid="o8d0ufo"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full"
                  data-oid="x7r1h6z"
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
                  data-oid="ws:fyrn"
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8" data-oid="1eytu1d">
                請選擇一個欄位來編輯屬性
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
