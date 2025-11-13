"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Loader2,
  Moon,
  ScanLine,
  Sun,
  Upload as UploadIcon,
} from "lucide-react";
import {
  FileUploadResult,
  FieldArea,
  TemplateConfig,
  BatchProcessItem,
  FileType,
} from "./types";
import FileUpload from "./components/FileUpload";
const TemplateEditor = dynamic(() => import("./components/TemplateEditor"), {
  ssr: false,
});
const BatchUpload = dynamic(() => import("./components/BatchUpload"), {
  ssr: false,
});
import { SmartSuggestionsService } from "./services/smartSuggestions";
import { UserBehaviorTracker } from "./services/userBehaviorTracker";

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
  const [templateConfig, setTemplateConfig] = useState<Partial<TemplateConfig>>(
    {},
  );
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isScanning, setIsScanning] = useState(false);
  const [uploadSession, setUploadSession] = useState(0);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化智慧服務
  useEffect(() => {
    SmartSuggestionsService.initialize();
    UserBehaviorTracker.initialize();
    UserBehaviorTracker.recordAction("session_start");
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
      setCurrentStep("upload");
      setIsScanning(false);
    }
  };

  const handleFieldsChange = (newFields: FieldArea[]) => {
    setFields(newFields);
    setTemplateConfig((prev) => ({
      ...prev,
      updatedAt: new Date(),
    }));
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
    setTemplateConfig({});
    setCurrentStep("upload");
    setIsScanning(false);
    setUploadSession((prev) => prev + 1);
  };

  const handleScanDocument = () => {
    if (!uploadResult?.success || isScanning) {
      return;
    }

    setIsScanning(true);
    UserBehaviorTracker.recordAction("scan_start", {
      fileName: uploadResult.file?.name,
    });

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setCurrentStep("edit");
      UserBehaviorTracker.recordAction("scan_finished", {
        fieldCount: fields.length,
      });
    }, 600);
  };

  const handleNextStep = () => {
    if (currentStep === "upload") {
      handleScanDocument();
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
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const canProceed = (() => {
    if (currentStep === "upload") {
      return Boolean(uploadResult?.success) && !isScanning;
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
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      data-oid="qf_6owr"
    >
      <header
        className="flex items-center gap-6 border-b bg-background/95 px-6 py-4 backdrop-blur"
        data-oid="5d-c4l5"
      >
        <div className="flex items-center gap-4" data-oid="0rj5r:0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
            data-oid="hl7ujgx"
          >
            TT
          </div>
          <div data-oid="y_29njo">
            <h1 className="text-xl font-semibold" data-oid="w8hh2r2">
              TableTemplate Pro
            </h1>
            <p className="text-sm text-muted-foreground" data-oid="0tuyuef">
              智慧表格模板管理系統
            </p>
          </div>
        </div>
        <div
          className="flex flex-1 justify-center"
          aria-hidden="true"
          data-oid="4d:kqr5"
        />
        <div className="flex items-center gap-3" data-oid="19oflrm">
          <Select
            value={language}
            onValueChange={handleLanguageChange}
            data-oid="4n7dreg"
          >
            <SelectTrigger className="w-40" data-oid="_ky0hd_">
              <SelectValue placeholder="選擇語言" data-oid="ot:u99i" />
            </SelectTrigger>
            <SelectContent data-oid="0czilh8">
              {LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                  data-oid="3akqdc9"
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleThemeToggle}
            aria-label={theme === "dark" ? "切換為亮色模式" : "切換為暗色模式"}
            data-oid="pws620:"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" data-oid="_94::n0" />
            ) : (
              <Moon className="h-4 w-4" data-oid="ybr3hm3" />
            )}
          </Button>
        </div>
      </header>

      <section
        className="flex items-center justify-between border-b bg-muted/50 px-6"
        style={{ minHeight: "3em" }}
        data-oid="vb51f3l"
      >
        <div className="flex items-center gap-4 py-3" data-oid="k5qpapz">
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs uppercase tracking-wide"
            data-oid="hhgb170"
          >
            {`Step ${currentStep === "upload" ? "01" : currentStep === "edit" ? "02" : "03"}`}
          </Badge>
          <div data-oid="x2g81yc">
            <p className="text-sm font-medium" data-oid="s5y5xkv">
              {stepDetails.title}
            </p>
            <p className="text-xs text-muted-foreground" data-oid="rb.2.4k">
              {stepDetails.description}
            </p>
          </div>
          {isScanning && (
            <div
              className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
              data-oid="qepbazs"
            >
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                data-oid="_4_x2.j"
              />
              掃描中...
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 py-3" data-oid="x0-vljf">
          <Button
            variant="ghost"
            disabled={!hasFile && fields.length === 0 && !templateConfig.name}
            onClick={handleResetWorkflow}
            data-oid="lqwn.xl"
          >
            重設流程
          </Button>
          <div className="flex items-center gap-2" data-oid="osre7i-">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === "upload" || isScanning}
              data-oid="f-fa5n5"
            >
              上一步
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={!canProceed}
              data-oid="bmqedve"
            >
              {currentStep === "upload" ? (
                <div className="flex items-center gap-2" data-oid="wtyv94r">
                  <ScanLine className="h-4 w-4" data-oid="ky7n:.i" />
                  {isScanning ? "掃描中..." : "開始掃描"}
                </div>
              ) : currentStep === "edit" ? (
                "前往預覽"
              ) : (
                "保存模板"
              )}
            </Button>
          </div>
        </div>
      </section>

      <main
        className="flex-1 gap-6 px-6 pb-8 pt-6 lg:grid lg:grid-cols-[minmax(18rem,26rem)_1fr]"
        data-oid="8h6t5_0"
      >
        <section className="mb-6 space-y-6 lg:mb-0" data-oid="c.c:vq9">
          <Tabs
            value={activeTab}
            onValueChange={(value: "single" | "batch") => setActiveTab(value)}
            data-oid="th1q4jg"
          >
            <TabsList className="grid h-11 grid-cols-2" data-oid="kzkfgnx">
              <TabsTrigger value="single" data-oid="detl22_">
                單個處理
              </TabsTrigger>
              <TabsTrigger value="batch" data-oid=".rn6:gx">
                批量處理
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="single"
              className="space-y-6"
              data-oid="wl98mg7"
            >
              <Card data-oid="gci7fmf">
                <CardHeader
                  className="flex flex-row items-center justify-between space-y-0"
                  data-oid="v1s3dol"
                >
                  <div data-oid="prxh445">
                    <CardTitle className="text-base" data-oid="zvjozes">
                      步驟 1：上傳文件
                    </CardTitle>
                    <p
                      className="text-xs text-muted-foreground"
                      data-oid="._xnm4-"
                    >
                      支援 Word / PDF
                    </p>
                  </div>
                  <UploadIcon
                    className="h-4 w-4 text-muted-foreground"
                    data-oid="96m-9he"
                  />
                </CardHeader>
                <CardContent data-oid=":h-1t1.">
                  <FileUpload
                    key={uploadSession}
                    onFileProcessed={handleFileProcessed}
                    data-oid="a5m8x.3"
                  />
                </CardContent>
              </Card>

              {uploadResult && (
                <Card data-oid="w7-rbl-">
                  <CardHeader data-oid="6h-.5-.">
                    <CardTitle className="text-base" data-oid="jifeszp">
                      文件資訊
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm" data-oid="1g2bmpo">
                    <div
                      className="flex items-center justify-between"
                      data-oid="so:vk.a"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="p-vjuvw"
                      >
                        檔名
                      </span>
                      <span className="font-medium" data-oid="is0u1zc">
                        {uploadResult.file?.name ?? "—"}
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between"
                      data-oid="st4nm92"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="jawap9d"
                      >
                        狀態
                      </span>
                      <span
                        className={`font-medium ${uploadResult.success ? "text-green-600" : "text-red-600"}`}
                        data-oid="n_2w54r"
                      >
                        {uploadResult.success
                          ? "成功"
                          : (uploadResult.error ?? "失敗")}
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between"
                      data-oid=".qyy_m-"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="r20svib"
                      >
                        大小
                      </span>
                      <span data-oid="gyvap9v">
                        {formatFileSize(uploadResult.file?.size)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {fields.length > 0 && (
                <Card data-oid="_jh06zu">
                  <CardHeader data-oid="zd37qo-">
                    <CardTitle className="text-base" data-oid="g:42-42">
                      偵測欄位 ({fields.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent data-oid="tzwdhgg">
                    <div
                      className="space-y-2 max-h-48 overflow-y-auto pr-1 text-sm"
                      data-oid="1qza6o7"
                    >
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-start justify-between rounded-lg border border-border/60 px-3 py-2"
                          data-oid="683tno6"
                        >
                          <div data-oid="es0z5pl">
                            <p className="font-medium" data-oid="o9vqu4r">
                              {field.name}
                            </p>
                            <p
                              className="text-xs text-muted-foreground"
                              data-oid="r39kvgx"
                            >
                              {field.fieldType} • {Math.round(field.size.width)}{" "}
                              × {Math.round(field.size.height)}
                            </p>
                          </div>
                          <span
                            className="text-xs text-muted-foreground"
                            data-oid="-i7bz4-"
                          >
                            ({Math.round(field.position.x)},{" "}
                            {Math.round(field.position.y)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === "preview" && (
                <Card data-oid="ulro2l3">
                  <CardHeader data-oid="pdylr20">
                    <CardTitle className="text-base" data-oid="ckpt01.">
                      模板設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4" data-oid=".t335by">
                    <div className="space-y-2" data-oid="ujr:h3.">
                      <label className="text-sm font-medium" data-oid="_00k95-">
                        模板名稱
                      </label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={templateConfig.name ?? ""}
                        onChange={(event) =>
                          setTemplateConfig((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="輸入模板名稱"
                        data-oid="wr1d7j1"
                      />
                    </div>
                    <div className="space-y-2" data-oid="9f5pmb0">
                      <label className="text-sm font-medium" data-oid="psga23g">
                        描述
                      </label>
                      <textarea
                        className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={templateConfig.description ?? ""}
                        onChange={(event) =>
                          setTemplateConfig((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        placeholder="輸入模板描述"
                        data-oid=".35o3_."
                      />
                    </div>
                    <div
                      className="grid grid-cols-2 gap-3 text-xs text-muted-foreground"
                      data-oid="cduk.kr"
                    >
                      <div data-oid="10agrrf">
                        原始文件：{uploadResult?.file?.name ?? "—"}
                      </div>
                      <div data-oid="su30t02">欄位數量：{fields.length}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="batch" className="space-y-6" data-oid="tejvmqh">
              <BatchUpload
                onBatchComplete={handleBatchComplete}
                data-oid="d09_3a."
              />
            </TabsContent>
          </Tabs>
        </section>

        <section className="flex h-full flex-col" data-oid="v04lqer">
          <Card className="flex h-full flex-1 flex-col" data-oid="oxrkzrv">
            <CardHeader data-oid="pjq2m7h">
              <CardTitle className="text-base" data-oid="s8cdrt:">
                {isBatchMode
                  ? "批量處理預覽"
                  : currentStep === "upload"
                    ? "畫布預覽區"
                    : "畫布編輯區"}
              </CardTitle>
            </CardHeader>
            <CardContent
              className="flex flex-1 items-center justify-center p-0"
              data-oid="h.8bo94"
            >
              {isBatchMode ? (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground"
                  data-oid=".t0xg8f"
                >
                  <Globe
                    className="h-10 w-10 text-muted-foreground/70"
                    data-oid="buj4m9y"
                  />
                  <p data-oid="do1bh9o">
                    批量處理模式不支援畫布編輯。請於左側完成檔案設定。
                  </p>
                </div>
              ) : currentStep === "upload" ? (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
                  data-oid="10nsy2n"
                >
                  <ScanLine
                    className="h-10 w-10 text-muted-foreground"
                    data-oid="tobbyqk"
                  />
                  <p
                    className="text-sm text-muted-foreground"
                    data-oid="5022z4d"
                  >
                    請先於左側上傳文件並點擊「開始掃描」。掃描完成後，畫布將顯示偵測結果。
                  </p>
                </div>
              ) : (
                <div className="flex h-full w-full flex-col" data-oid="olq:1te">
                  <TemplateEditor
                    fields={fields}
                    onFieldsChange={handleFieldsChange}
                    data-oid="1z.n4l3"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <footer
            className="mt-6 flex h-10 items-center justify-between rounded-md border border-dashed border-border/80 bg-muted/40 px-4 text-xs text-muted-foreground"
            data-oid="5wuz9ia"
          >
            <span data-oid="c:bd3g5">
              © {new Date().getFullYear()} TableTemplate Inc. All rights
              reserved.
            </span>
            <span data-oid="e.673ko">版本 1.0.0</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
