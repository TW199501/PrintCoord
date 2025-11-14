import * as pdfjs from "pdfjs-dist/build/pdf.mjs";
import { FileUploadResult, PdfPage } from "@/types";

// 在瀏覽器端使用 CDN worker 作為可靠後備（避免 SSR/bundler 相容性問題）
if (typeof window !== "undefined") {
  const gwo = (pdfjs as typeof pdfjs & { GlobalWorkerOptions: any })
    .GlobalWorkerOptions;
  // 使用 unpkg CDN 提供的 worker（與 pdfjs-dist 版本一致）
  gwo.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs`;
}

export class FileProcessingService {
  static async processPdf(file: File): Promise<PdfPage[]> {
    const arrayBuffer = await file.arrayBuffer();
    // 防禦性檢查已移除（現在統一使用 CDN worker）
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
