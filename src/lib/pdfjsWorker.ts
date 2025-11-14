/// <reference lib="webworker" />

// 直接載入 pdf.js 官方提供的 Worker 實作
// 透過 module worker 方式讓 pdf.js 在 Web Worker 中運作
import 'pdfjs-dist/build/pdf.worker.mjs';

export {};
