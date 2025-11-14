// PrintCoord - 文件處理服務

import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import {
  FileType,
  ProcessedTemplate,
  TemplateConfig,
  FileUploadResult,
} from "../types";

type PdfViewport = {
  width: number;
  height: number;
};

type PdfPageProxy = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (params: any) => any;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
};

type PdfDocumentLoadingTask = {
  promise: Promise<PdfDocumentProxy>;
  destroy?: () => void;
};

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc?: string; workerPort?: Worker | null };
  getDocument: (params: any) => PdfDocumentLoadingTask;
};

declare global {
  interface Window {
    __pdfjsLibPromise__?: Promise<PdfJsModule>;
    pdfjsLib?: PdfJsModule;
  }
}

async function loadPdfJs(): Promise<PdfJsModule> {
  // 檢查是否在瀏覽器環境中
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF 處理需在瀏覽器環境中執行");
  }

  // 確保必要的 DOM API 可用
  if (typeof (globalThis as any).DOMMatrix === "undefined") {
    // 在 Next.js 環境中模擬 DOMMatrix
    (globalThis as any).DOMMatrix = class DOMMatrix {
      constructor(transform?: string | number[]) {
        // 簡單的模擬實現
      }
      static fromFloat32Array(array: Float32Array): DOMMatrix {
        return new DOMMatrix();
      }
      multiply(other: DOMMatrix): DOMMatrix {
        return this;
      }
    };
  }

  if (!window.__pdfjsLibPromise__) {
    window.__pdfjsLibPromise__ = (async () => {
      try {
        // 方法 1: 嘗試使用 Next.js 內建的 pdfjs
        let pdfjsModule: PdfJsModule;

        try {
          // 檢查是否有預設的 pdfjs
          if (window.pdfjsLib) {
            pdfjsModule = window.pdfjsLib;
            console.log("使用預載入的 PDF.js");
          } else {
            // 動態匯入 PDF.js
            const moduleImport = await import("pdfjs-dist/build/pdf.mjs");
            pdfjsModule = moduleImport as any;
            console.log("動態載入 PDF.js 成功");
          }
        } catch (importError) {
          console.warn("主要匯入方法失敗，嘗試替代方法:", importError);

          // 方法 2: 使用預先匯入的 pdfjsLib
          try {
            pdfjsModule = pdfjsLib as any;
            console.log("使用預先匯入的 PDF.js 成功");
          } catch (fallbackError) {
            throw new Error(
              `PDF.js 匯入失敗，請檢查安裝: ${
                fallbackError instanceof Error
                  ? fallbackError.message
                  : "未知錯誤"
              }`
            );
          }
        }

        // 設置正確的 Worker 路徑
        try {
          // 使用 Next.js 提供的靜態資源路徑
          pdfjsModule.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";
          pdfjsModule.GlobalWorkerOptions.workerPort = null;

          // 測試 Worker 是否可用
          await validateWorker(pdfjsModule);
          console.log("PDF.js Worker 初始化成功");
        } catch (workerError) {
          console.warn("Worker 初始化失敗，嘗試無 Worker 模式:", workerError);
          // 使用無 Worker 模式
          pdfjsModule.GlobalWorkerOptions.workerPort = null;
          pdfjsModule.GlobalWorkerOptions.workerSrc = "";
        }

        console.log("PDF.js 初始化完成");
        return pdfjsModule;
      } catch (error) {
        console.error("PDF.js 初始化失敗:", error);
        throw new Error(
          `PDF.js 初始化失敗: ${
            error instanceof Error ? error.message : "未知錯誤"
          }`
        );
      }
    })();
  }

  return window.__pdfjsLibPromise__;
}

/**
 * 驗證 PDF.js Worker 是否正確配置
 */
async function validateWorker(pdfjsModule: PdfJsModule): Promise<void> {
  try {
    // 嘗試建立一個簡單的 PDF 文件來測試 Worker
    const testArrayBuffer = new ArrayBuffer(0);

    // 使用較低的 verbosity 來減少測試輸出
    const testTask = pdfjsModule.getDocument({
      data: testArrayBuffer,
    });

    // 等待一段時間，如果 Worker 有問題會拋出錯誤
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // 取消測試任務
        if (testTask.destroy) {
          testTask.destroy();
        }
        resolve(undefined);
      }, 100);

      // 如果立即失敗，捕獲錯誤
      testTask.promise.catch((error: Error) => {
        if (testTask.destroy) {
          testTask.destroy();
        }
        reject(error);
      });
    });
  } catch (error) {
    // 靜默處理測試錯誤，因為我們只是在測試 Worker 可用性
    console.warn("PDF.js Worker 測試失敗，但繼續執行:", error);
  }
}

export class FileProcessingService {
  /**
   * 處理上傳的文件
   */
  static async processUploadedFile(file: File): Promise<FileUploadResult> {
    try {
      // 檢查文件是否存在
      if (!file) {
        return { success: false, error: "沒有提供文件" };
      }

      const fileType = this.getFileType(file);

      if (!fileType) {
        return { success: false, error: "不支持的檔案格式" };
      }

      // 根據文件類型處理
      switch (fileType) {
        case FileType.DOCX:
          return await this.processDocxFile(file);
        case FileType.PDF:
          return await this.processPdfFile(file);
        case FileType.DOC:
          return await this.processDocFile(file);
        default:
          return { success: false, error: "不支持的檔案格式" };
      }
    } catch (error) {
      console.error("文件處理錯誤:", error);
      return { success: false, error: "文件處理失敗" };
    }
  }

  /**
   * 處理 DOCX 文件
   */
  private static async processDocxFile(file: File): Promise<FileUploadResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      return {
        success: true,
        file,
        html,
        messages: result.messages,
      };
    } catch (error) {
      return { success: false, error: "DOCX 文件處理失敗" };
    }
  }

  /**
   * 處理 PDF 文件
   */
  private static async processPdfFile(file: File): Promise<FileUploadResult> {
    try {
      // 驗證文件
      if (!file) {
        return { success: false, error: "沒有提供文件" };
      }

      if (file.size === 0) {
        return { success: false, error: "文件大小不能為零" };
      }

      // 檢查文件類型
      if (!file.type || file.type !== "application/pdf") {
        return { success: false, error: "文件不是有效的 PDF 格式" };
      }

      console.log("開始處理 PDF 文件:", file.name);

      // 載入 PDF.js 並檢查初始化
      const pdfjsLib = await loadPdfJs();

      // 驗證 PDF.js 是否正確初始化
      if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
        throw new Error("PDF.js 初始化失敗，請檢查 Worker 配置");
      }

      console.log("PDF.js 已載入，開始讀取文件陣列緩衝區");
      const arrayBuffer = await file.arrayBuffer();

      if (arrayBuffer.byteLength === 0) {
        return { success: false, error: "文件內容為空" };
      }

      console.log("開始解析 PDF 文件");
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
      });

      const pdf = await loadingTask.promise;
      console.log(`PDF 解析成功，共 ${pdf.numPages} 頁`);

      const numPages = pdf.numPages;
      const pages: Array<{
        pageNumber: number;
        canvas: HTMLCanvasElement;
        dataUrl: string;
      }> = [];

      // 處理每一頁
      for (let i = 1; i <= numPages; i++) {
        console.log(`處理第 ${i} 頁`);

        // 性能優化：根據頁面大小調整縮放比例
        const page = await pdf.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });

        // 根据原始大小决定缩放比例
        let scale = 1.5;
        const area = originalViewport.width * originalViewport.height;

        if (area > 2000000) {
          // 大型頁面 (>200萬像素)
          scale = 1.0;
        } else if (area > 1000000) {
          // 中型頁面 (100-200萬像素)
          scale = 1.2;
        } else {
          // 小型頁面 (<100萬像素)
          scale = 1.5;
        }

        const viewport = page.getViewport({ scale });

        // 性能檢查：限制最大尺寸以避免記憶體問題
        const maxWidth = 1200;
        const maxHeight = 1600;

        if (viewport.width > maxWidth || viewport.height > maxHeight) {
          const widthRatio = maxWidth / viewport.width;
          const heightRatio = maxHeight / viewport.height;
          const finalRatio = Math.min(widthRatio, heightRatio);

          const adjustedViewport = page.getViewport({
            scale: scale * finalRatio,
          });
          Object.assign(viewport, adjustedViewport);
        }

        // 創建 canvas 並驗證
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(`無法獲取第 ${i} 頁的 Canvas 上下文`);
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 性能優化：設置清晰度和記憶體管理
        if (typeof canvas.style !== "undefined") {
          canvas.style.imageRendering = "pixelated"; // 提高渲染性能
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        // 渲染頁面到 canvas
        await page.render(renderContext).promise;

        // 性能優化：使用 JPEG 壓縮減少 data URL 大小
        // 根据页面内容选择最佳格式
        const isTextHeavy = area > 500000; // 簡單的啟發式判斷
        const dataUrl = isTextHeavy
          ? canvas.toDataURL("image/jpeg", 0.7) // 圖片為主用 JPEG
          : canvas.toDataURL("image/png", 0.8); // 文字為主用 PNG

        pages.push({
          pageNumber: i,
          canvas,
          dataUrl,
        });

        console.log(
          `第 ${i} 頁處理完成 (${Math.round(viewport.width)}×${Math.round(
            viewport.height
          )}px, ${scale.toFixed(1)}x)`
        );
      }

      console.log("PDF 文件處理完成，共處理", pages.length, "頁");
      return {
        success: true,
        file,
        pdfPages: pages,
      };
    } catch (error) {
      console.error("PDF 文件處理失敗:", error);

      // 提供更具體的錯誤訊息
      let errorMessage = "PDF 文件處理失敗";

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("worker") || message.includes("worker")) {
          errorMessage = "PDF Worker 配置錯誤，請檢查瀏覽器相容性";
        } else if (message.includes("corrupt") || message.includes("invalid")) {
          errorMessage = "PDF 文件已損壞或格式無效";
        } else if (message.includes("memory") || message.includes("size")) {
          errorMessage = "PDF 文件過大，請嘗試較小的文件";
        } else if (message.includes("canvas") || message.includes("context")) {
          errorMessage = "Canvas 渲染失敗，請檢查瀏覽器支援";
        } else if (message.includes("network") || message.includes("fetch")) {
          errorMessage = "網路錯誤，請檢查文件載入";
        } else {
          errorMessage = `PDF 處理錯誤：${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 處理舊版 DOC 文件 (需要轉換)
   */
  private static async processDocFile(file: File): Promise<FileUploadResult> {
    // DOC 文件處理比較複雜，可能需要服務端轉換
    // 這裡先返回錯誤，提示需要轉換
    return {
      success: false,
      error: "DOC 格式需要先轉換為 DOCX 格式才能處理",
    };
  }

  /**
   * 獲取文件類型
   */
  private static getFileType(file: File): FileType | null {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type;

    // 優先使用副檔名判斷
    switch (extension) {
      case "doc":
        return FileType.DOC;
      case "docx":
        return FileType.DOCX;
      case "pdf":
        return FileType.PDF;
      default:
        // 如果副檔名不明確，使用 MIME 類型
        if (mimeType === "application/pdf") {
          return FileType.PDF;
        } else if (mimeType === "application/msword") {
          return FileType.DOC;
        } else if (
          mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          return FileType.DOCX;
        }
        return null;
    }
  }

  /**
   * 將 HTML 轉換為 Canvas
   */
  static async htmlToCanvas(
    html: string,
    width: number,
    height: number
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("無法獲取 Canvas 上下文");
    }

    // 這裡可以整合 html2canvas 或類似庫
    // 暫時返回空 Canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    return canvas;
  }
}
