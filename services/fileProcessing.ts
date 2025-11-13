// TableTemplate Pro - 文件處理服務

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { FileType, ProcessedTemplate, TemplateConfig, FileUploadResult } from '../types';

// 初始化 PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export class FileProcessingService {
  /**
   * 處理上傳的文件
   */
  static async processUploadedFile(file: File): Promise<FileUploadResult> {
    try {
      const fileType = this.getFileType(file);

      if (!fileType) {
        return { success: false, error: '不支持的文件格式' };
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
          return { success: false, error: '不支持的文件格式' };
      }
    } catch (error) {
      console.error('文件處理錯誤:', error);
      return { success: false, error: '文件處理失敗' };
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
        messages: result.messages
      };
    } catch (error) {
      return { success: false, error: 'DOCX 文件處理失敗' };
    }
  }

  /**
   * 處理 PDF 文件
   */
  private static async processPdfFile(file: File): Promise<FileUploadResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const numPages = pdf.numPages;
      const pages: any[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('無法獲取 Canvas 上下文');
        }
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };

        await page.render(renderContext).promise;
        pages.push({
          pageNumber: i,
          canvas,
          dataUrl: canvas.toDataURL()
        });
      }

      return {
        success: true,
        file,
        pdfPages: pages
      };
    } catch (error) {
      return { success: false, error: 'PDF 文件處理失敗' };
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
      error: 'DOC 格式需要先轉換為 DOCX 格式才能處理'
    };
  }

  /**
   * 獲取文件類型
   */
  private static getFileType(file: File): FileType | null {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'doc':
        return FileType.DOC;
      case 'docx':
        return FileType.DOCX;
      case 'pdf':
        return FileType.PDF;
      default:
        return null;
    }
  }

  /**
   * 將 HTML 轉換為 Canvas
   */
  static async htmlToCanvas(html: string, width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('無法獲取 Canvas 上下文');
    }

    // 這裡可以整合 html2canvas 或類似庫
    // 暫時返回空 Canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    return canvas;
  }
}
