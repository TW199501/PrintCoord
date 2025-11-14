"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileUploadResult,
  FieldArea,
  TemplateConfig,
  BatchProcessItem,
  FileType,
  OCRResult,
} from "@/types";
import TemplateHeader from "@/components/TemplateHeader";
import TemplateFooter from "@/components/TemplateFooter";
import StepIndicator from "@/components/StepIndicator";
import WorkflowContent from "@/components/WorkflowContent";
import { SmartSuggestionsService } from "@/services/smartSuggestions";
import { UserBehaviorTracker } from "@/services/userBehaviorTracker";
import { FieldDetectionService } from "@/services/fieldDetection";
import { OCRService } from "@/services/ocrService";
import { FileProcessingService } from "@/services/fileProcessingService";

type WorkflowStep = "upload" | "edit" | "preview";

const STEP_COPY: Record<WorkflowStep, { title: string; description: string }> =
  {
    upload: { title: "上傳文件", description: "先上傳表格文件並確認資訊" },
    edit: { title: "編輯欄位", description: "在畫布上調整欄位位置" },
    preview: { title: "預覽與保存", description: "確認欄位資訊並保存模板" },
  };

const LANGUAGES = [
  { value: "zh-TW", label: "繁體中文" },
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
  { value: "de-DE", label: "Deutsch" },
];

const formatFileSize = (size?: number) => {
  if (!size) {
    return "—";
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export default function TemplateManager() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(
    null,
  );
  const [fields, setFields] = useState<FieldArea[]>([]);
  const [canvasData, setCanvasData] = useState<string | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [templateConfig, setTemplateConfig] = useState<Partial<TemplateConfig>>(
    {},
  );
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDarkMode = theme === "dark";
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [ocrInitializing, setOcrInitializing] = useState(true);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [uploadSession, setUploadSession] = useState(0);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化服務
  useEffect(() => {
    SmartSuggestionsService.initialize();
    UserBehaviorTracker.initialize();
    UserBehaviorTracker.recordAction("session_start");

    OCRService.initialize()
      .then(() => {
        setOcrInitializing(false);
        console.log("OCR Service ready.");
      })
      .catch(error => {
        console.error("OCR Initialization failed:", error);
        setOcrError("OCR 引擎載入失敗，請檢查網路連線後刷新頁面。");
        setOcrInitializing(false);
      });

    return () => {
      // OCRService.terminate(); // 根據需求決定是否在組件卸載時終止
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem("tableTemplate_theme");

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");

    if (typeof window !== "undefined") {
      window.localStorage.setItem("tableTemplate_theme", theme);
    }
  }, [theme]);

  const handleFileProcessed = (result: FileUploadResult) => {
    setUploadResult(result);
    if (result.success && result.file) {
      UserBehaviorTracker.recordAction("file_uploaded", {
        fileName: result.file.name,
        fileSize: result.file.size,
      });

      setTemplateConfig({
        originalFileName: result.file.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setFields([]);
      setCanvasData(null);
      setSourceCanvas(null);
      setCurrentStep("upload");
      setIsScanning(false);
    }
  };

  const handleFieldsChange = (newFields: FieldArea[]) => {
    setFields(newFields);
    setTemplateConfig((prev: Partial<TemplateConfig>) => ({
      ...prev,
      updatedAt: new Date(),
    }));
  };

  // 依照「由上到下、每行由左到右」排序欄位
  // 以 yTolerance 判定同一行（可微調以適配不同 DPI/縮放）
  const sortFieldsByRowAndX = (
    list: FieldArea[],
    yTolerance: number = 16,
  ): FieldArea[] => {
    if (!list || list.length === 0) return list;

    // 先依 y 由小到大排序（取框的頂部 y）
    const sortedByY = [...list].sort(
      (a, b) => a.position.y - b.position.y,
    );

    // 逐一放入行群組
    const rows: FieldArea[][] = [];
    for (const item of sortedByY) {
      const yTop = item.position.y;
      const targetRow = rows.find((row) =>
        Math.abs(row[0].position.y - yTop) <= yTolerance,
      );
      if (targetRow) {
        targetRow.push(item);
      } else {
        rows.push([item]);
      }
    }

    // 每一行內依 x 由小到大排序，最後再扁平化
    const flattened: FieldArea[] = [];
    for (const row of rows) {
      row.sort((a, b) => a.position.x - b.position.x);
      flattened.push(...row);
    }

    return flattened;
  };

  const autoNameFieldsFromWords = (
    list: FieldArea[],
    words: OCRResult[],
    maxXDistance: number = 380,
    yTolerance: number = 28,
    maxYDistanceAbove: number = 220,
  ): FieldArea[] => {
    if (!list || list.length === 0) return list;
    if (!words || words.length === 0) return list;

    const mergedWords = OCRService.mergeNearbyTextRegions(words, 28);

    const zhToEn: Record<string, string> = {
      姓名: "name",
      性別: "gender",
      性别: "gender",
      出生年月日: "birth_date",
      出生日期: "birth_date",
      生日: "birth_date",
      身分證字號: "id_number",
      身份证号: "id_number",
      電話: "phone",
      电话: "phone",
      手機: "mobile",
      手机: "mobile",
      地址: "address",
      住址: "address",
      郵遞區號: "postal_code",
      邮递区号: "postal_code",
      電子郵件: "email",
      申請人: "applicant",
      申请人: "applicant",
      申請單位: "applicant_unit",
      申请单位: "applicant_unit",
      單位: "unit",
      部門: "department",
      日期: "date",
    };

    const normalizeToSnake = (raw: string, fallback: string): string => {
      // direct zh mapping
      if (zhToEn[raw]) return zhToEn[raw];
      // try split by spaces or non-word into words
      const ascii = raw
        .normalize("NFKC")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
      return ascii || fallback;
    };

    const named: FieldArea[] = list.map((f, idx) => {
      const fx = f.position.x;
      const fy = f.position.y;
      const fh = f.size.height;
      const fCenterY = fy + fh / 2;

      let bestLabel: OCRResult | null = null;
      let bestDist = Infinity;

      for (const w of mergedWords) {
        const wx = w.bbox[0];
        const wy = w.bbox[1];
        const ww = w.bbox[2];
        const wh = w.bbox[3];
        const wRight = wx + ww;
        const wCenterY = wy + wh / 2;

        // 左側同一行
        if (wRight <= fx && Math.abs(wCenterY - fCenterY) <= yTolerance) {
          const dist = fx - wRight;
          if (dist <= maxXDistance && dist < bestDist) {
            bestDist = dist;
            bestLabel = w;
          }
          continue;
        }

        // 上方標籤：在欄位頂部之上，水平有重疊或靠近
        const wBottom = wy + wh;
        const verticalGap = fy - wBottom; // >0 表示在上方
        const fieldRight = fx + f.size.width;
        const overlap = Math.min(fieldRight, wRight) - Math.max(fx, wx);
        const horizontalNear = overlap > 0 || Math.abs((wx + ww / 2) - (fx + f.size.width / 2)) <= 140;
        if (verticalGap >= 0 && verticalGap <= maxYDistanceAbove && horizontalNear) {
          const dist = verticalGap;
          if (dist < bestDist) {
            bestDist = dist;
            bestLabel = w;
          }
        }
      }

      // 右側小距離（少數表格標籤在右邊）
      if (!bestLabel) {
        for (const w of mergedWords) {
          const wx = w.bbox[0];
          const ww = w.bbox[2];
          const wy = w.bbox[1];
          const wh = w.bbox[3];
          const wCenterY = wy + wh / 2;
          const fieldRight = fx + f.size.width;
          if (wx >= fieldRight && Math.abs(wCenterY - fCenterY) <= yTolerance) {
            const dist = wx - fieldRight;
            if (dist <= 200 && dist < bestDist) {
              bestDist = dist;
              bestLabel = w;
            }
          }
        }
      }

      if (bestLabel) {
        const cleaned = OCRService.cleanText(bestLabel.text);
        if (cleaned) {
          return { ...f, name: normalizeToSnake(cleaned, `field_${idx + 1}`) };
        }
      }
      // 再嘗試以欄位框內的文字作為名稱候選（多為 placeholder）
      const inBox = mergedWords
        .filter((w) => {
          const wx = w.bbox[0];
          const wy = w.bbox[1];
          const ww = w.bbox[2];
          const wh = w.bbox[3];
          const cx = wx + ww / 2;
          const cy = wy + wh / 2;
          return cx >= fx && cx <= fx + f.size.width && cy >= fy && cy <= fy + f.size.height;
        })
        .map((w) => OCRService.cleanText(w.text))
        .filter(Boolean);
      if (inBox.length > 0) {
        return { ...f, name: normalizeToSnake(inBox[0], `field_${idx + 1}`) };
      }
      return { ...f, name: normalizeToSnake(f.name || "", `field_${idx + 1}`) };
    });

    return named;
  };

  const handleBatchComplete = (results: BatchProcessItem[]) => {
    console.log("批量處理完成:", results);
    // 可以這裡添加批量結果的後續處理
  };

  const handleSaveTemplate = () => {
    if (!uploadResult?.file) return;

    const extension = uploadResult.file.name.split(".").pop()?.toLowerCase();
    const fileType: FileType =
      extension === "doc"
        ? FileType.DOC
        : extension === "docx"
          ? FileType.DOCX
          : extension === "pdf"
            ? FileType.PDF
            : FileType.PDF;

    const config: TemplateConfig = {
      id: `template_${Date.now()}`,
      name: templateConfig.name || "未命名模板",
      description: templateConfig.description,
      originalFileName: uploadResult.file.name,
      fileType,
      pageSize: { width: 800, height: 600 }, // 預設大小
      fields,
      createdAt: templateConfig.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const templates = JSON.parse(
      localStorage.getItem("tableTemplates") || "[]",
    );
    templates.push(config);
    localStorage.setItem("tableTemplates", JSON.stringify(templates));

    alert("模板保存成功！");
    handleResetWorkflow();
  };

  const handleResetWorkflow = () => {
    setUploadResult(null);
    setFields([]);
    setCanvasData(null);
    setSourceCanvas(null);
    setScanError(null);
    setTemplateConfig({});
    setCurrentStep("upload");
    setIsScanning(false);
    setUploadSession((prev: number) => prev + 1);
  };

  const handleScanDocument = async () => {
    if (!uploadResult?.success || isScanning) {
      return;
    }

    setIsScanning(true);
    setScanError(null);
    UserBehaviorTracker.recordAction("scan_start", {
      fileName: uploadResult.file?.name,
    });

    try {
      let workingCanvas = sourceCanvas;

      if (!workingCanvas && uploadResult.pdfPages?.length) {
        const firstPage = uploadResult.pdfPages[0];
        workingCanvas = firstPage.canvas;
        setSourceCanvas(firstPage.canvas);
        setCanvasData(firstPage.dataUrl);
      }

      if (!workingCanvas && uploadResult.file) {
        const isImage = uploadResult.file.type.startsWith("image/");
        if (isImage) {
          const imageBitmap = await createImageBitmap(uploadResult.file);
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = imageBitmap.width;
          tempCanvas.height = imageBitmap.height;
          const ctx = tempCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(imageBitmap, 0, 0);
            workingCanvas = tempCanvas;
            setSourceCanvas(tempCanvas);
            setCanvasData(tempCanvas.toDataURL());
          }
        }
      }

      if (!workingCanvas) {
        throw new Error("沒有可用的畫布資料，請確認文件是否為 PDF 或圖像格式。");
      }

      // 1) 優先用後端 pdf2json
      let finalFields: FieldArea[] = [];
      if (uploadResult.file) {
        try {
          const form = new FormData();
          form.append("file", uploadResult.file);
          const resp = await fetch("/api/pdf", { method: "POST", body: form });
          if (resp.ok) {
            const json = await resp.json();
            const apiFields: FieldArea[] = json?.data?.fields || [];
            if (Array.isArray(apiFields) && apiFields.length > 1) {
              // 先排序
              let ordered = sortFieldsByRowAndX(apiFields);
              // 若名稱看起來是預設（以 "Cell " 開頭或空白），用 OCR 單詞做自動命名
              const needsNaming = ordered.some(f => !f.name || /^Cell\b/.test(f.name));
              if (needsNaming) {
                const ocrLayoutForNames = await OCRService.extractTextAndLayout(workingCanvas);
                ordered = autoNameFieldsFromWords(ordered, ocrLayoutForNames.words);
              }
              // 全量正規化為 snake_case
              finalFields = ordered.map((f, i) => ({
                ...f,
                name: f.name
                  ? f.name
                      .normalize("NFKC")
                      .replace(/[^A-Za-z0-9]+/g, "_")
                      .replace(/_{2,}/g, "_")
                      .replace(/^_+|_+$/g, "")
                      .toLowerCase() || `field_${i + 1}`
                  : `field_${i + 1}`,
              }));
            }
          }
        } catch (e) {
          console.warn("後端 pdf2json 失敗，將改用 OCR 備援", e);
        }
      }

      // 2) 若後端沒有多欄，改用 OCR 備援
      if (finalFields.length <= 1) {
        const ocrLayout = await OCRService.extractTextAndLayout(workingCanvas);
        const detectedFields = await FieldDetectionService.detectFieldsFromLayout(
          ocrLayout,
          workingCanvas.width || 800,
          workingCanvas.height || 600,
        );

        if (detectedFields.length > 0) {
          const named = autoNameFieldsFromWords(detectedFields, ocrLayout.words);
          finalFields = sortFieldsByRowAndX(named);
        }
      }

      if (finalFields.length > 0) {
        handleFieldsChange(finalFields);
      }

      setIsScanning(false);
      setCurrentStep("edit");
      UserBehaviorTracker.recordAction("scan_finished", {
        fieldCount: finalFields.length || fields.length,
      });
    } catch (error) {
      console.error("掃描處理失敗:", error);
      setScanError(
        error instanceof Error
          ? error.message
          : "掃描處理失敗，請確認文件格式後重試",
      );
      setIsScanning(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === "upload") {
      void handleScanDocument();
      return;
    }

    if (currentStep === "edit") {
      setCurrentStep("preview");
      return;
    }

    handleSaveTemplate();
  };

  const handlePreviousStep = () => {
    if (currentStep === "preview") {
      setCurrentStep("edit");
      return;
    }

    if (currentStep === "edit") {
      setCurrentStep("upload");
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
  };

  const handleThemeToggle = () => {
    setTheme((prev: "light" | "dark") => (prev === "light" ? "dark" : "light"));
  };

  const canProceed = (() => {
    if (currentStep === "upload") {
      return Boolean(uploadResult?.success) && !isScanning && !ocrInitializing;
    }

    if (currentStep === "edit") {
      return fields.length > 0;
    }

    return Boolean(templateConfig.name?.trim());
  })();

  const stepDetails = STEP_COPY[currentStep];
  const hasFile = Boolean(uploadResult?.file);
  const isBatchMode = activeTab === "batch";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TemplateHeader
        language={language}
        onLanguageChange={handleLanguageChange}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      <StepIndicator
        currentStep={currentStep}
        stepDetails={stepDetails}
        isScanning={isScanning}
        hasFile={hasFile}
        fieldsCount={fields.length}
        templateName={templateConfig.name ?? ""}
        onReset={handleResetWorkflow}
        onPrevious={handlePreviousStep}
        onNext={handleNextStep}
        canProceed={canProceed}
      />

      <WorkflowContent
        currentStep={currentStep}
        activeTab={activeTab}
        uploadSession={uploadSession}
        uploadResult={uploadResult}
        scanError={scanError}
        fields={fields}
        templateConfig={templateConfig}
        canvasData={canvasData}
        ocrInitializing={ocrInitializing}
        ocrError={ocrError}
        onTabChange={(tab) => setActiveTab(tab)}
        onFileProcessed={handleFileProcessed}
        onFieldsChange={handleFieldsChange}
        onTemplateConfigChange={setTemplateConfig}
        onBatchComplete={handleBatchComplete}
      />

      <TemplateFooter />
    </div>
  );
}
