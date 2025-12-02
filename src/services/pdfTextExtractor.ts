import { OCRResult } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF 文字提取服務
 * 直接從 PDF 提取文字，不使用 OCR
 */
export class PDFTextExtractor {
    /**
     * 從 PDF 文件提取文字內容
     * @param pdfFile - PDF 文件
     * @param pageNumber - 頁碼（從 1 開始）
     * @param canvasWidth - Canvas 寬度（用於座標縮放）
     * @param canvasHeight - Canvas 高度（用於座標縮放）
     * @returns OCRResult[] - 文字結果（座標已轉換到 Canvas 空間）
     */
    static async extractTextFromPDF(
        pdfFile: File,
        pageNumber: number = 1,
        canvasWidth: number,
        canvasHeight: number
    ): Promise<OCRResult[]> {
        try {
            // 讀取 PDF 文件
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // 獲取指定頁面
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            // 計算縮放比例（PDF 原始尺寸 -> Canvas 尺寸）
            const scaleX = canvasWidth / viewport.width;
            const scaleY = canvasHeight / viewport.height;

            console.log(`PDF 原始尺寸: ${viewport.width.toFixed(0)} x ${viewport.height.toFixed(0)}`);
            console.log(`Canvas 尺寸: ${canvasWidth} x ${canvasHeight}`);
            console.log(`縮放比例: ${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`);

            const words: OCRResult[] = textContent.items.map((item: any) => {
                // PDF.js 的座標系統是從左下角開始
                const transform = item.transform;
                const pdfX = transform[4];
                const pdfYFromBottom = transform[5];

                // 轉換成從頂部算起（PDF 座標系統）
                const pdfYFromTop = viewport.height - pdfYFromBottom;

                // 估算文字的寬度和高度（PDF 座標系統）
                const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
                const pdfWidth = item.width;
                const pdfHeight = fontSize;

                // 縮放到 Canvas 座標系統
                const x = pdfX * scaleX;
                const y = pdfYFromTop * scaleY;
                const width = pdfWidth * scaleX;
                const height = pdfHeight * scaleY;

                return {
                    text: item.str,
                    confidence: 1.0,
                    bbox: [x, y, width, height] as [number, number, number, number]
                };
            });

            console.log(`PDF 文字提取完成，共 ${words.length} 個文字片段`);
            return words;
        } catch (error) {
            console.error('PDF 文字提取失敗:', error);
            return [];
        }
    }
}
