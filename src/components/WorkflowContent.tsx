"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Loader2, ScanLine, Upload as UploadIcon } from "lucide-react";
import { FileUploadResult, FieldArea, TemplateConfig, BatchProcessItem } from "@/types";
import FileUpload from "@/components/FileUpload";
import DraggableFieldList from "@/components/DraggableFieldList";

const TemplateEditor = dynamic(() => import("@/components/TemplateEditor"), {
  ssr: false,
});
const BatchUpload = dynamic(() => import("@/components/BatchUpload"), {
  ssr: false,
});

type WorkflowStep = "upload" | "edit" | "preview";

interface WorkflowContentProps {
  // 狀態
  currentStep: WorkflowStep;
  activeTab: "single" | "batch";
  uploadSession: number;
  uploadResult: FileUploadResult | null;
  scanError: string | null;
  fields: FieldArea[];
  templateConfig: Partial<TemplateConfig>;
  canvasData: string | null;
  ocrInitializing: boolean;
  ocrError: string | null;
  
  // 事件處理
  onTabChange: (tab: "single" | "batch") => void;
  onFileProcessed: (result: FileUploadResult) => void;
  onFieldsChange: (fields: FieldArea[]) => void;
  onTemplateConfigChange: (config: Partial<TemplateConfig>) => void;
  onBatchComplete: (results: BatchProcessItem[]) => void;
}

export default function WorkflowContent({
  currentStep,
  activeTab,
  uploadSession,
  uploadResult,
  scanError,
  fields,
  templateConfig,
  canvasData,
  ocrInitializing,
  ocrError,
  onTabChange,
  onFileProcessed,
  onFieldsChange,
  onTemplateConfigChange,
  onBatchComplete,
}: WorkflowContentProps) {
  const isBatchMode = activeTab === "batch";

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="flex-1 gap-6 px-0 pb-0 pt-6 lg:grid lg:grid-cols-[minmax(18rem,26rem)_1fr] lg:items-start">
      {/* 左側區域 */}
      <section className="mb-6 space-y-6 lg:mb-0">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "single" | "batch")}>
          <TabsList className="grid h-11 grid-cols-2">
            <TabsTrigger value="single">單個處理</TabsTrigger>
            <TabsTrigger value="batch">批量處理</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            {/* 步驟 1：上傳文件 */}
            <Card className="border-t-4 border-t-pc-primary shadow-sm hover:shadow-md transition-shadow bg-pc-bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-pc-border">
                <div>
                  <CardTitle className="text-base">步驟 1：上傳文件</CardTitle>
                  <p className="text-xs text-muted-foreground">支援 Word / PDF</p>
                </div>
                <UploadIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <FileUpload
                  key={uploadSession}
                  onFileProcessed={onFileProcessed}
                  maxSize={10}
                  maxPdfSize={20}
                />
              </CardContent>
            </Card>

            {/* 文件資訊 */}
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">文件資訊</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">檔名</span>
                    <span className="font-medium">{uploadResult.file?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">狀態</span>
                    <span
                      className={`font-medium ${uploadResult.success ? "text-green-600" : "text-red-600"}`}
                    >
                      {uploadResult.success ? "成功" : (uploadResult.error ?? "失敗")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">大小</span>
                    <span>{formatFileSize(uploadResult.file?.size)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 掃描錯誤 */}
            {scanError && (
              <Card>
                <CardContent>
                  <p className="text-sm text-red-600">{scanError}</p>
                </CardContent>
              </Card>
            )}

            {/* PDF 頁面預覽 */}
            {uploadResult?.pdfPages && uploadResult.pdfPages.length > 0 && currentStep === "upload" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">PDF 預覽</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    共 {uploadResult.pdfPages.length} 頁
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uploadResult.pdfPages.map((page, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-muted">
                          <span className="text-xs font-medium">第 {index + 1} 頁</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(page.canvas.width)} × {Math.round(page.canvas.height)} px
                          </span>
                        </div>
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={page.dataUrl}
                            alt={`PDF 第 ${index + 1} 頁`}
                            className="w-full h-auto border rounded"
                            style={{ maxHeight: "200px", objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    <p>✅ PDF 文件已成功解析</p>
                    <p>下一步：點擊「開始掃描」進行欄位檢測</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 偵測欄位 */}
            {fields.length > 0 && currentStep !== "edit" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">偵測欄位 ({fields.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-sm">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-start justify-between rounded-lg border border-border/60 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">{field.labelZh || field.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.fieldType} • {Math.round(field.size.width)} × {Math.round(field.size.height)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(field.position.x)}, {Math.round(field.position.y)})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 模板設定 */}
            {currentStep === "preview" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">模板設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">模板名稱</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={templateConfig.name ?? ""}
                      onChange={(e) =>
                        onTemplateConfigChange({ ...templateConfig, name: e.target.value })
                      }
                      placeholder="輸入模板名稱"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">描述</label>
                    <textarea
                      className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={templateConfig.description ?? ""}
                      onChange={(e) =>
                        onTemplateConfigChange({
                          ...templateConfig,
                          description: e.target.value,
                        })
                      }
                      placeholder="輸入模板描述"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>原始文件：{uploadResult?.file?.name ?? "—"}</div>
                    <div>欄位數量：{fields.length}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchUpload onBatchComplete={onBatchComplete} />
          </TabsContent>
        </Tabs>
      </section>

      {/* 右側區域 */}
      <section className="flex h-full flex-col">
        <Card className="flex h-full flex-1 flex-col">
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              {isBatchMode
                ? "批量處理預覽"
                : currentStep === "upload"
                  ? "畫布預覽區"
                  : "畫布編輯區"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center p-0">
            {isBatchMode ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                <Globe className="h-10 w-10 text-muted-foreground/70" />
                <p>批量處理模式不支援畫布編輯。請於左側完成檔案設定。</p>
              </div>
            ) : currentStep === "upload" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ScanLine className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {ocrInitializing
                    ? "正在準備 OCR 辨識引擎..."
                    : ocrError
                      ? ocrError
                      : "請先於左側上傳文件並點擊「開始掃描」。掃描完成後，畫布將顯示偵測結果。"}
                </p>
                {ocrInitializing && <Loader2 className="h-6 w-6 animate-spin" />}
              </div>
            ) : (
              <div className="flex h-full w-full gap-6">
                <div className="flex-1 overflow-auto pl-6 pr-0 pt-0 pb-2">
                  <div className="mx-auto max-w-[980px]">
                    <TemplateEditor
                      canvasData={canvasData ?? undefined}
                      fields={fields}
                      onFieldsChange={onFieldsChange}
                    />
                  </div>
                </div>
                <aside className="w-[320px] pr-6 flex flex-col h-full">
                  <Card className="flex flex-col flex-1 overflow-hidden">
                    <CardHeader className="py-3 flex-shrink-0">
                      <CardTitle className="text-base">欄位清單</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                      <div className="px-6 py-4">
                        <DraggableFieldList fields={fields} onFieldsChange={onFieldsChange} />
                      </div>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
