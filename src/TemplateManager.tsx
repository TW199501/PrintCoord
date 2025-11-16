"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { useTranslations } from "next-intl";

type WorkflowStep = "upload" | "edit" | "preview";

const LANGUAGES = [
  { value: "en-US", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "zh-CN", label: "简体中文" },
];

export default function TemplateManager() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const t = useTranslations('templates');
  const fieldMappings = t.raw('fieldMappings') as Record<string, string>;
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

  // Get translated step details
  const getTranslatedStep = (step: WorkflowStep) => ({
    title: t(`${step}.title`),
    description: t(`${step}.description`),
  });

  // Initialize services
  useEffect(() => {
    SmartSuggestionsService.initialize();
    UserBehaviorTracker.initialize();
    UserBehaviorTracker.recordAction("session_start");

    OCRService.initialize()
      .then(() => {
        setOcrInitializing(false);
        console.log(t('logs.ocrReady'));
      })
      .catch(error => {
        console.error("OCR Initialization failed:", error);
        setOcrError(t('errors.ocrInitFailed'));
        setOcrInitializing(false);
      });

    return () => {
      // Terminate OCR service when component unmounts (decide based on requirements)
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

  // Sort fields from top to bottom, left to right within each row
  // Use yTolerance to determine same row (adjustable for different DPI/scaling)
  const sortFieldsByRowAndX = (
    list: FieldArea[],
    yTolerance: number = 16,
  ): FieldArea[] => {
    if (!list || list.length === 0) return list;

    // Sort by y from small to large (take the top y of the box)
    const sortedByY = [...list].sort(
      (a, b) => a.position.y - b.position.y,
    );

    // Group into rows one by one
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

    // Sort by x from left to right within each row, then flatten
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

    const zhToEn: Record<string, string> = fieldMappings;

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

        // Left side same row
        if (wRight <= fx && Math.abs(wCenterY - fCenterY) <= yTolerance) {
          const dist = fx - wRight;
          if (dist <= maxXDistance && dist < bestDist) {
            bestDist = dist;
            bestLabel = w;
          }
          continue;
        }

        // Upper label: above the field top, with horizontal overlap or proximity
        const wBottom = wy + wh;
        const verticalGap = fy - wBottom; // >0 means above
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

      // Small right distance (rare cases where table labels are on the right)
      if (!bestLabel) {
        for (const w of mergedWords) {
          const wx = w.bbox[0];
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
      // Also try to use text inside the field box as name candidates (mostly placeholders)
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
    console.log(t('logs.batchComplete'), results);
    // Can add subsequent processing for batch results here
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
      name: templateConfig.name || t('template.unnamed'),
      description: templateConfig.description,
      originalFileName: uploadResult.file.name,
      fileType,
      pageSize: { width: 800, height: 600 }, // Default size
      fields,
      createdAt: templateConfig.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const templates = JSON.parse(
      localStorage.getItem("tableTemplates") || "[]",
    );
    templates.push(config);
    localStorage.setItem("tableTemplates", JSON.stringify(templates));

    alert(t('template.saved'));
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
        throw new Error(t('errors.noCanvas'));
      }

      // 1) Prefer using new border detection (more accurate)
      let finalFields: FieldArea[] = [];
      
      // First try using new image detection method (detect borders)
      const imageEl = new Image();
      imageEl.src = workingCanvas.toDataURL();
      await new Promise((resolve) => {
        imageEl.onload = resolve;
      });
      
      // Pass target display size (A4 standard size) to calculate scaling ratio
      const targetWidth = 794;  // A4 width
      const targetHeight = 1123; // A4 height
      const detectedFields = await FieldDetectionService.detectFieldsFromImage(
        imageEl,
        targetWidth,
        targetHeight
      );
      
      if (detectedFields.length > 0) {
        console.log(t('logs.borderDetectionSuccess', { count: detectedFields.length }));
        finalFields = sortFieldsByRowAndX(detectedFields);
      }
      
      // 2) If border detection has no results, try backend pdf2json
      if (finalFields.length === 0 && uploadResult.file) {
        try {
          console.log(t('logs.borderDetectionFailed'));
          const form = new FormData();
          form.append("file", uploadResult.file);
          const resp = await fetch("/api/pdf", { method: "POST", body: form });
          if (resp.ok) {
            const json = await resp.json();
            const apiFields: FieldArea[] = json?.data?.fields || [];
            if (Array.isArray(apiFields) && apiFields.length > 1) {
              // First sort
              let ordered = sortFieldsByRowAndX(apiFields);
              // If names look like defaults (starting with "Cell " or blank), use OCR words for auto naming
              const needsNaming = ordered.some(f => !f.name || /^Cell\b/.test(f.name));
              if (needsNaming) {
                const ocrLayoutForNames = await OCRService.extractTextAndLayout(workingCanvas);
                ordered = autoNameFieldsFromWords(ordered, ocrLayoutForNames.words);
              }
              // Normalize all to snake_case
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
          console.warn(t('logs.pdfParsingFailed'), e);
        }
      }

      // 3) Finally use OCR fallback
      if (finalFields.length === 0) {
        console.log(t('logs.ocrFallback'));
        const ocrLayout = await OCRService.extractTextAndLayout(workingCanvas);
        const ocrFields = await FieldDetectionService.detectFieldsFromLayout(
          ocrLayout,
          workingCanvas.width || 800,
          workingCanvas.height || 600,
        );

        if (ocrFields.length > 0) {
          const named = autoNameFieldsFromWords(ocrFields, ocrLayout.words);
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
          : t('errors.scanFailed'),
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

  const stepDetails = getTranslatedStep(currentStep);
  const hasFile = Boolean(uploadResult?.file);

  return (
    <div className="flex min-h-screen flex-col bg-pc-bg dark:bg-slate-950 text-pc-text dark:text-foreground">
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
