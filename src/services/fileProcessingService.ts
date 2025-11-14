import * as pdfjs from "pdfjs-dist/build/pdf.mjs";
// Use bundled worker asset URL to avoid network fetching issues in production
// Next/Webpack will turn this into a static URL
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FileUploadResult, PdfPage } from "@/types";

// 在瀏覽器端指定 worker 路徑（改為走內部 API，避免跨網域載入失敗）
if (typeof window !== "undefined") {
  (
    pdfjs as typeof pdfjs & { GlobalWorkerOptions: any }
  ).GlobalWorkerOptions.workerSrc = pdfWorkerSrc as unknown as string;
}

export class FileProcessingService {
  static async processPdf(file: File): Promise<PdfPage[]> {
    const arrayBuffer = await file.arrayBuffer();
    // pdfjs typings expect PDFDocumentLoadingParams with a data field
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages: PdfPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");

      if (context) {
        // RenderParameters only requires canvasContext and viewport
        await page.render({ canvasContext: context as any, viewport }).promise;
        pages.push({
          pageNumber: i,
          canvas: canvas,
          dataUrl: canvas.toDataURL(),
        });
      }
    }

    return pages;
  }

  static async processFile(file: File): Promise<FileUploadResult> {
    try {
      // 驗證文件
      if (!file) {
        return {
          success: false,
          file: file,
          error: "沒有提供文件",
        };
      }

      if (file.size === 0) {
        return {
          success: false,
          file: file,
          error: "文件大小為0",
        };
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB 限制
        return {
          success: false,
          file: file,
          error: "文件超過10MB限制",
        };
      }

      if (file.type === "application/pdf") {
        const pdfPages = await this.processPdf(file);
        return {
          success: true,
          file: file,
          pdfPages: pdfPages,
        };
      }

      // 其他文件類型暫時不支援
      return {
        success: false,
        file: file,
        error: `不支援的文件類型: ${file.type}`,
      };
    } catch (error) {
      console.error("File processing failed:", error);
      return {
        success: false,
        file: file,
        error: error instanceof Error ? error.message : "未知錯誤",
      };
    }
  }

  // 兼容測試的方法別名
  static async processUploadedFile(file: File): Promise<FileUploadResult> {
    return this.processFile(file);
  }
}
