declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: {
    workerSrc?: string;
    workerPort?: Worker | null;
  };

  export interface RenderParameters {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number }): { width: number; height: number };
    render(params: RenderParameters): { promise: Promise<void> };
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFDocumentLoadingParams {
    data: ArrayBuffer;
    disableWorker?: boolean;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(params: PDFDocumentLoadingParams): PDFDocumentLoadingTask;
}
