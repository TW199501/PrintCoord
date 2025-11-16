"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations('templates');
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
            <TabsTrigger value="single">{t('workflowContent.tabs.single')}</TabsTrigger>
            <TabsTrigger value="batch">{t('workflowContent.tabs.batch')}</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            {/* 步驟 1：上傳文件 */}
            <Card className="border-t-4 border-t-pc-primary shadow-sm hover:shadow-md transition-shadow bg-pc-bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-pc-border">
                <div>
                  <CardTitle className="text-base">{t('workflowContent.steps.upload.title')}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t('workflowContent.steps.upload.description')}</p>
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
                  <CardTitle className="text-base">{t('workflowContent.fileInfo.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('workflowContent.fileInfo.name')}</span>
                    <span className="font-medium">{uploadResult.file?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('workflowContent.fileInfo.status')}</span>
                    <span
                      className={`font-medium ${uploadResult.success ? "text-green-600" : "text-red-600"}`}
                    >
                      {uploadResult.success ? t('workflowContent.fileInfo.success') : (uploadResult.error ?? t('workflowContent.fileInfo.failed'))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('workflowContent.fileInfo.size')}</span>
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
                  <CardTitle className="text-base">{t('workflowContent.pdfPreview.title')}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t('workflowContent.pdfPreview.totalPages', { count: uploadResult.pdfPages.length })}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uploadResult.pdfPages.map((page, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-muted">
                          <span className="text-xs font-medium">{t('workflowContent.pdfPreview.page', { number: index + 1 })}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(page.canvas.width)} × {Math.round(page.canvas.height)} px
                          </span>
                        </div>
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={page.dataUrl}
                            alt={t('workflowContent.pdfPreview.alt', { number: index + 1 })}
                            className="w-full h-auto border rounded"
                            style={{ maxHeight: "200px", objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    <p>{t('workflowContent.pdfPreview.success')}</p>
                    <p>{t('workflowContent.pdfPreview.nextStep')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 偵測欄位 */}
            {fields.length > 0 && currentStep !== "edit" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('workflowContent.fields.title', { count: fields.length })}</CardTitle>
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
                  <CardTitle className="text-base">{t('workflowContent.template.settings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('workflowContent.template.name')}</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={templateConfig.name ?? ""}
                      onChange={(e) =>
                        onTemplateConfigChange({ ...templateConfig, name: e.target.value })
                      }
                      placeholder={t('workflowContent.template.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('workflowContent.template.description')}</label>
                    <textarea
                      className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={templateConfig.description ?? ""}
                      onChange={(e) =>
                        onTemplateConfigChange({
                          ...templateConfig,
                          description: e.target.value,
                        })
                      }
                      placeholder={t('workflowContent.template.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>{t('workflowContent.template.originalFile')}{uploadResult?.file?.name ?? "—"}</div>
                    <div>{t('workflowContent.template.fieldCount')}{fields.length}</div>
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
                ? t('workflowContent.canvas.batchPreview')
                : currentStep === "upload"
                  ? t('workflowContent.canvas.uploadPreview')
                  : t('workflowContent.canvas.editArea')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center p-0">
            {isBatchMode ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                <Globe className="h-10 w-10 text-muted-foreground/70" />
                <p>{t('workflowContent.canvas.batchNotice')}</p>
              </div>
            ) : currentStep === "upload" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ScanLine className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {ocrInitializing
                    ? t('workflowContent.canvas.ocrPreparing')
                    : ocrError
                      ? ocrError
                      : t('workflowContent.canvas.uploadInstruction')}
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
                      <CardTitle className="text-base">{t('workflowContent.fields.list')}</CardTitle>
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
