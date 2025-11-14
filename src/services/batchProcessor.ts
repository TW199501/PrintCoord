// PrintCoord - 批量處理服務

import {
  BatchProcessItem,
  TemplateConfig,
  OCRResult,
  FileType,
} from "../types";
import { FileProcessingService } from "./fileProcessingService";
import { FieldDetectionService } from "./fieldDetection";
import { OCRService } from "./ocrService";

export class BatchProcessorService {
  private static workers: Worker[] = [];
  private static maxWorkers = 4; // 最大並發處理數

  /**
   * 批量處理文件
   */
  static async processBatch(
    files: File[],
    onProgress?: (
      completed: number,
      total: number,
      currentItem?: BatchProcessItem
    ) => void,
    onItemComplete?: (item: BatchProcessItem) => void
  ): Promise<BatchProcessItem[]> {
    const items: BatchProcessItem[] = files.map(() => ({
      id: `batch_${Date.now()}_${Math.random()}`,
      templateId: "",
      data: {},
      status: "pending" as const,
      result: undefined,
      error: undefined,
    }));

    const results: BatchProcessItem[] = [];
    let completed = 0;

    // 使用限制並發的處理方式
    for (let i = 0; i < files.length; i += this.maxWorkers) {
      const batch = files.slice(i, i + this.maxWorkers);
      const batchPromises = batch.map(async (file, index) => {
        const itemIndex = i + index;
        const item = items[itemIndex];

        try {
          item.status = "processing";

          // 處理單個文件
          const result = await this.processSingleFile(file);

          if (result.success && result.template) {
            item.templateId = result.template.id;
            item.status = "completed";
            item.result = JSON.stringify(result.template);
          } else {
            item.status = "error";
            item.error = result.error || "處理失敗";
          }

          completed++;
          if (onProgress) {
            onProgress(completed, files.length, item);
          }
          if (onItemComplete) {
            onItemComplete(item);
          }

          results.push(item);
        } catch (error) {
          item.status = "error";
          item.error = error instanceof Error ? error.message : "未知錯誤";
          results.push(item);
          completed++;
          if (onProgress) {
            onProgress(completed, files.length, item);
          }
          if (onItemComplete) {
            onItemComplete(item);
          }
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * 處理單個文件
   */
  private static async processSingleFile(file: File): Promise<{
    success: boolean;
    template?: TemplateConfig;
    error?: string;
  }> {
    try {
      // 1. 文件處理
      const fileResult = await FileProcessingService.processFile(file);
      if (!fileResult.success) {
        return { success: false, error: fileResult.error };
      }

      // 2. 準備模板配置
      const templateConfig: Partial<TemplateConfig> = {
        id: `template_${Date.now()}_${Math.random()}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // 移除副檔名
        description: `從 ${file.name} 自動生成的模板`,
        originalFileName: file.name,
        fileType: (file.name.split(".").pop()?.toLowerCase() ||
          "unknown") as FileType,
        createdAt: new Date(),
        updatedAt: new Date(),
        fields: [],
      };

      // 3. 如果是圖片文件，進行 OCR 處理
      if (file.type.startsWith("image/") || fileResult.pdfPages) {
        let ocrResults: Array<{
          words: OCRResult[];
          lines: OCRResult[];
          blocks: OCRResult[];
        }> = [];

        if (fileResult.pdfPages && fileResult.pdfPages.length > 0) {
          // PDF 文件：處理每一頁
          for (const page of fileResult.pdfPages.slice(0, 3)) {
            // 最多處理前3頁
            const pageLayout = await OCRService.extractTextAndLayout(
              page.canvas
            );
            ocrResults.push(pageLayout);
          }
        } else if (file.type.startsWith("image/")) {
          // 圖片文件：直接 OCR
          const imageData = fileResult.file
            ? URL.createObjectURL(fileResult.file)
            : "";
          if (imageData) {
            // 注意：extractTextAndLayout 需要 Canvas，我們需要先將圖片繪製到 Canvas
            const imageEl = new Image();
            imageEl.src = imageData;
            await new Promise((resolve) => {
              imageEl.onload = resolve;
            });
            const canvas = document.createElement("canvas");
            canvas.width = imageEl.width;
            canvas.height = imageEl.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(imageEl, 0, 0);
            const imageLayout = await OCRService.extractTextAndLayout(canvas);
            ocrResults = [imageLayout];
          }
        }

        // 4. 檢測欄位
        if (ocrResults.length > 0) {
          // 合併所有頁面的佈局資訊
          const combinedLayout = ocrResults.reduce(
            (acc, layout) => {
              acc.words.push(...layout.words);
              acc.lines.push(...layout.lines);
              acc.blocks.push(...layout.blocks);
              return acc;
            },
            {
              words: [] as OCRResult[],
              lines: [] as OCRResult[],
              blocks: [] as OCRResult[],
            }
          );

          const imageWidth = fileResult.pdfPages?.[0]?.canvas.width || 800;
          const imageHeight = fileResult.pdfPages?.[0]?.canvas.height || 600;

          const detectedFields =
            await FieldDetectionService.detectFieldsFromLayout(
              combinedLayout,
              imageWidth,
              imageHeight
            );

          templateConfig.fields = detectedFields;
        }
      }

      return {
        success: true,
        template: templateConfig as TemplateConfig,
      };
    } catch (error) {
      console.error("批量處理單個文件失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "處理失敗",
      };
    }
  }

  /**
   * 批量生成文件
   */
  static async generateBatchFiles(
    templates: TemplateConfig[],
    data: Array<Record<string, unknown>>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ success: boolean; data?: Blob; error?: string }>> {
    const results = [];
    let completed = 0;

    for (let i = 0; i < templates.length; i++) {
      for (let j = 0; j < data.length; j++) {
        try {
          // 這裡可以整合 PDF 生成邏輯
          // 目前返回模擬結果
          const result = {
            success: true,
            data: new Blob(["Mock generated file"], {
              type: "application/pdf",
            }),
          };
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "生成失敗",
          });
        }

        completed++;
        if (onProgress) {
          onProgress(completed, templates.length * data.length);
        }
      }
    }

    return results;
  }

  /**
   * 取消批量處理
   */
  static cancelBatch(): void {
    // 終止所有 worker
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
  }

  /**
   * 獲取處理統計
   */
  static getProcessingStats(items: BatchProcessItem[]): {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    successRate: number;
  } {
    const total = items.length;
    const completed = items.filter(
      (item) => item.status === "completed"
    ).length;
    const failed = items.filter((item) => item.status === "error").length;
    const processing = items.filter(
      (item) => item.status === "processing"
    ).length;
    const successRate = total > 0 ? completed / total : 0;

    return {
      total,
      completed,
      failed,
      processing,
      successRate,
    };
  }

  /**
   * 清理資源
   */
  static cleanup(): void {
    this.cancelBatch();
  }
}
