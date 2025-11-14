"use client";

import React, { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { FileUploadResult } from "../types";
import { FileProcessingService } from "@/services/fileProcessingService";

interface FileUploadProps {
  onFileProcessed: (result: FileUploadResult) => void;
  acceptedFormats?: string[];
  maxSize?: number; // MB
  maxPdfSize?: number; // PDF 專用大小限制，MB
}

export default function FileUpload({
  onFileProcessed,
  acceptedFormats = [".doc", ".docx", ".pdf"],
  maxSize = 10,
  maxPdfSize = 20, // PDF 可以稍大一些
}: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(
    null,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // 基本文件驗證
      if (!file) {
        const errorResult: FileUploadResult = {
          success: false,
          error: "沒有選擇文件",
        };
        setUploadResult(errorResult);
        onFileProcessed(errorResult);
        return;
      }

      // 檢查文件大小
      const fileSizeMB = file.size / (1024 * 1024);
      const sizeLimit = file.type === 'application/pdf' ? maxPdfSize : maxSize;
      
      if (fileSizeMB > sizeLimit) {
        const errorResult: FileUploadResult = {
          success: false,
          error: `文件大小超過限制 (${sizeLimit}MB)，當前文件大小: ${fileSizeMB.toFixed(2)}MB`,
        };
        setUploadResult(errorResult);
        onFileProcessed(errorResult);
        return;
      }

      setIsProcessing(true);
      setUploadResult(null); // 清除之前的結果

      try {
        console.log('開始處理文件:', file.name, file.type, `${fileSizeMB.toFixed(2)}MB`);
        
        const result: FileUploadResult = await FileProcessingService.processFile(
          file,
        );
        
        // 確保保留原始 File 參考（PDF 解析成功時服務內已帶回 file）
        result.file = result.file ?? file;
        setUploadResult(result);
        onFileProcessed(result);
        
        if (result.success) {
          console.log('文件處理成功:', result);
        } else {
          console.warn('文件處理失敗:', result.error);
        }
      } catch (error) {
        console.error('文件處理異常:', error);
        const errorResult: FileUploadResult = {
          success: false,
          error: error instanceof Error ? error.message : "文件處理失敗",
        };
        setUploadResult(errorResult);
        onFileProcessed(errorResult);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileProcessed, maxSize, maxPdfSize],
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      if (fileRejections.length === 0) return;

      const [rejection] = fileRejections;
      const rejectionError =
        rejection.errors?.[0]?.message ?? "不支持的文件類型";

      const errorResult: FileUploadResult = {
        success: false,
        error: rejectionError,
      };

      setUploadResult(errorResult);
      onFileProcessed(errorResult);
    },
    [onFileProcessed],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: maxSize * 1024 * 1024,
  });

  const clearFile = () => {
    setUploadResult(null);
  };

  return (
    <div className="w-full">
      {/* 上傳區域 */}
      <div
        {...getRootProps()}
        className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${uploadResult?.success ? "border-green-500 bg-green-50" : ""}
            ${uploadResult?.error ? "border-red-500 bg-red-50" : ""}
            ${isProcessing ? "border-yellow-500 bg-yellow-50" : ""}
          `}
      >
        <input {...getInputProps()} data-testid="file-input" />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />

            <p className="text-gray-600">處理文件中...</p>
            <p className="text-sm text-gray-500 mt-1">請稍候，正在解析文件內容</p>
          </div>
        ) : uploadResult?.success ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />

            <p className="text-green-700 font-medium">文件上傳成功</p>
            <p className="text-sm text-gray-600 mt-2">
              {uploadResult.file?.name}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />

            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? "放開文件以上傳" : "拖拽文件到這裡或點擊選擇"}
            </p>
            <p className="text-sm text-gray-500">
              支持格式: {acceptedFormats.join(", ")} (最大 {maxSize}MB)
            </p>
          </div>
        )}
      </div>

      {/* 錯誤顯示 */}
      {uploadResult?.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <X className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">處理失敗</p>
              <p className="text-red-600 mt-1 text-sm">{uploadResult.error}</p>
              <div className="mt-2 text-xs text-red-500">
                <p>💡 建議：</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  {uploadResult.error.includes('PDF') && (
                    <>
                      <li>確保 PDF 文件未加密且格式正確</li>
                      <li>嘗試使用較小的 PDF 文件</li>
                      <li>檢查文件是否損壞</li>
                    </>
                  )}
                  {uploadResult.error.includes('大小') && (
                    <li>請壓縮文件或分割大文件</li>
                  )}
                  <li>重新整理上傳文件</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 文件信息 */}
      {uploadResult?.success && uploadResult.file && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />

              <div>
                <p className="font-medium text-green-900">
                  {uploadResult.file.name}
                </p>
                <p className="text-sm text-green-600">
                  {(uploadResult.file.size / 1024 / 1024).toFixed(2)} MB • 解析成功
                </p>
                {uploadResult.pdfPages && (
                  <p className="text-xs text-green-600">
                    共 {uploadResult.pdfPages.length} 頁
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-green-400 hover:text-green-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* PDF 特殊信息 */}
          {uploadResult.pdfPages && uploadResult.pdfPages.length > 0 && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-700">
              <p>📄 PDF 文件已成功解析為 {uploadResult.pdfPages.length} 頁</p>
              <p>下一步：點擊「開始掃描」進行欄位檢測</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
