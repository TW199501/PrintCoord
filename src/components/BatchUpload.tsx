"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BatchProcessItem } from "../types";
import { BatchProcessorService } from "../services/batchProcessor";
import {
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Trash2,
  Play,
  Square,
} from "lucide-react";

interface BatchUploadProps {
  onBatchComplete?: (results: BatchProcessItem[]) => void;
}

export default function BatchUpload({ onBatchComplete }: BatchUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchProcessItem[]>([]);
  const [currentProcessingFile, setCurrentProcessingFile] =
    useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 過濾支持的文件類型
    const validFiles = acceptedFiles.filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".docx"),
    );

    if (validFiles.length !== acceptedFiles.length) {
      alert(`部分文件類型不受支持。只接受圖片、PDF和DOCX文件。`);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setResults([]);
    setProgress(0);
    setCurrentProcessingFile("");
  };

  const startBatchProcessing = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const batchResults = await BatchProcessorService.processBatch(
        files,
        (completed, total, currentItem) => {
          setProgress((completed / total) * 100);
          if (currentItem) {
            setCurrentProcessingFile(currentItem.id);
            setResults((prev) => {
              const existing = prev.find((r) => r.id === currentItem.id);
              if (existing) {
                return prev.map((r) =>
                  r.id === currentItem.id ? currentItem : r,
                );
              } else {
                return [...prev, currentItem];
              }
            });
          }
        },
        (item) => {
          console.log("項目完成:", item);
        },
      );

      setResults(batchResults);
      if (onBatchComplete) {
        onBatchComplete(batchResults);
      }
    } catch (error) {
      console.error("批量處理失敗:", error);
      alert("批量處理過程中發生錯誤");
    } finally {
      setIsProcessing(false);
      setCurrentProcessingFile("");
    }
  };

  const cancelProcessing = () => {
    BatchProcessorService.cancelBatch();
    setIsProcessing(false);
    setCurrentProcessingFile("");
  };

  const downloadResults = () => {
    const successfulResults = results.filter((r) => r.status === "completed");
    if (successfulResults.length === 0) {
      alert("沒有可下載的結果");
      return;
    }

    // 創建總結報告
    const summary = {
      totalFiles: files.length,
      successful: successfulResults.length,
      failed: results.filter((r) => r.status === "error").length,
      results: results,
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_processing_results_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return "🖼️";
    if (file.type === "application/pdf") return "📄";
    if (file.name.endsWith(".docx")) return "📝";
    return "📄";
  };

  const getStatusIcon = (status: BatchProcessItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;

      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;

      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: BatchProcessItem["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = BatchProcessorService.getProcessingStats(results);

  return (
    <div className="space-y-6">
      {/* 上傳區域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>批量上傳文件</span>
            <div className="flex gap-2">
              {files.length > 0 && (
                <>
                  <Button onClick={clearAllFiles}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    清空
                  </Button>
                  {!isProcessing && (
                    <Button onClick={startBatchProcessing}>
                      <Play className="h-4 w-4 mr-1" />
                      開始處理 ({files.length} 個文件)
                    </Button>
                  )}
                  {isProcessing && (
                    <Button onClick={cancelProcessing}>
                      <Square className="h-4 w-4 mr-1" />
                      取消
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mb-4 mx-auto" />

            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? "放開文件以上傳" : "拖拽多個文件到這裡"}
            </p>
            <p className="text-sm text-gray-500">
              支持格式: 圖片文件 (PNG, JPG, JPEG, GIF), PDF, DOCX • 最大批量: 50
              個文件
            </p>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">
                待處理文件 ({files.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getFileIcon(file)}</span>
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFile(index)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 處理進度 */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              處理進度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>總進度</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <progress
                  value={progress}
                  max={100}
                  className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
                  style={{
                    appearance: "none",
                    backgroundColor: "#e5e7eb",
                  }}
                >
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </progress>
              </div>
              {currentProcessingFile && (
                <p className="text-sm text-gray-600">
                  正在處理: {currentProcessingFile}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 處理結果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>處理結果</span>
              <div className="flex gap-2">
                <Badge className={getStatusColor("completed")}>
                  成功: {stats.completed}
                </Badge>
                <Badge className={getStatusColor("error")}>
                  失敗: {stats.failed}
                </Badge>
                <Badge className={getStatusColor("processing")}>
                  處理中: {stats.processing}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 統計信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600">總文件數</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                  <p className="text-sm text-gray-600">成功</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {stats.failed}
                  </p>
                  <p className="text-sm text-gray-600">失敗</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(stats.successRate * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">成功率</p>
                </div>
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              {/* 詳細結果 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium">詳細結果</h3>
                  {stats.completed > 0 && (
                    <Button onClick={downloadResults}>
                      <Download className="h-4 w-4 mr-1" />
                      下載結果
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <p className="font-medium text-sm">
                            {files[index]?.name || `文件 ${index + 1}`}
                          </p>
                          {result.error && (
                            <p className="text-xs text-red-600">
                              {result.error}
                            </p>
                          )}
                          {result.result && (
                            <p className="text-xs text-green-600">模板已生成</p>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status === "completed"
                          ? "成功"
                          : result.status === "error"
                            ? "失敗"
                            : result.status === "processing"
                              ? "處理中"
                              : "待處理"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
