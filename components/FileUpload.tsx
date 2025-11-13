"use client";

import React, { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { FileUploadResult } from "../types";

interface FileUploadProps {
  onFileProcessed: (result: FileUploadResult) => void;
  acceptedFormats?: string[];
  maxSize?: number; // MB
}

export default function FileUpload({
  onFileProcessed,
  acceptedFormats = [".doc", ".docx", ".pdf"],
  maxSize = 10,
}: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(
    null,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsProcessing(true);

      try {
        // 這裡會調用文件處理服務
        // 暫時模擬處理結果
        const result: FileUploadResult = {
          success: true,
          file,
        };

        setUploadResult(result);
        onFileProcessed(result);
      } catch (error) {
        const errorResult: FileUploadResult = {
          success: false,
          error: "文件處理失敗",
        };
        setUploadResult(errorResult);
        onFileProcessed(errorResult);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileProcessed],
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
    <div className="w-full" data-oid="uzceyif">
      {/* 上傳區域 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${uploadResult?.success ? "border-green-500 bg-green-50" : ""}
        `}
        data-oid="ej8hmse"
      >
        <input
          {...getInputProps()}
          data-testid="file-input"
          data-oid="x53c5af"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center" data-oid="qj:tt43">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"
              data-oid="hui5n5z"
            />
            <p className="text-gray-600" data-oid="odp:nxk">
              處理文件中...
            </p>
          </div>
        ) : uploadResult?.success ? (
          <div className="flex flex-col items-center" data-oid=".5hotid">
            <CheckCircle
              className="h-12 w-12 text-green-500 mb-4"
              data-oid="bssxw-w"
            />
            <p className="text-green-700 font-medium" data-oid="jgxvbgm">
              文件上傳成功
            </p>
            <p className="text-sm text-gray-600 mt-2" data-oid="2u.u6mn">
              {uploadResult.file?.name}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center" data-oid="hf0td_t">
            <Upload
              className="h-12 w-12 text-gray-400 mb-4"
              data-oid="icqd:s8"
            />
            <p
              className="text-lg font-medium text-gray-700 mb-2"
              data-oid="czmzqpk"
            >
              {isDragActive ? "放開文件以上傳" : "拖拽文件到這裡或點擊選擇"}
            </p>
            <p className="text-sm text-gray-500" data-oid=".ny.wv_">
              支持格式: {acceptedFormats.join(", ")} (最大 {maxSize}MB)
            </p>
          </div>
        )}
      </div>

      {/* 錯誤顯示 */}
      {uploadResult?.error && (
        <div
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          data-oid="crhlq4r"
        >
          <div className="flex items-center" data-oid="ieqsw09">
            <X className="h-5 w-5 text-red-500 mr-2" data-oid="cjrit0w" />
            <p className="text-red-700" data-oid="h4skhao">
              {uploadResult.error}
            </p>
          </div>
        </div>
      )}

      {/* 文件信息 */}
      {uploadResult?.success && uploadResult.file && (
        <div
          className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg"
          data-oid=".r_:3ok"
        >
          <div className="flex items-center justify-between" data-oid="yfkh_ie">
            <div className="flex items-center" data-oid="_-ctjh7">
              <FileText
                className="h-5 w-5 text-gray-500 mr-2"
                data-oid="oq3u8cl"
              />
              {uploadResult.file && (
                <div data-oid="5gupd8v">
                  <p className="font-medium text-gray-900" data-oid="f4bvtdw">
                    {uploadResult.file.name}
                  </p>
                  <p className="text-sm text-gray-600" data-oid="v_d6y:p">
                    {(uploadResult.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
              data-oid="_xk8bxv"
            >
              <X className="h-5 w-5" data-oid="ai.abd8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
