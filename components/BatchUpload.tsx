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
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Trash2,
  Play,
  Pause,
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
        return (
          <CheckCircle className="h-4 w-4 text-green-500" data-oid="7wo18a6" />
        );
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" data-oid=".ao0vq_" />;
      case "processing":
        return (
          <Clock
            className="h-4 w-4 text-blue-500 animate-spin"
            data-oid="ta85t-h"
          />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-400" data-oid="3_fse28" />;
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
    <div className="space-y-6" data-oid="b7aki6h">
      {/* 上傳區域 */}
      <Card data-oid="eyxa88t">
        <CardHeader data-oid="3-sc7oe">
          <CardTitle
            className="flex items-center justify-between"
            data-oid="cg7gf3-"
          >
            <span data-oid="rioo7s6">批量上傳文件</span>
            <div className="flex gap-2" data-oid="4mx31kl">
              {files.length > 0 && (
                <>
                  <Button onClick={clearAllFiles} data-oid="rtn7nn5">
                    <Trash2 className="h-4 w-4 mr-1" data-oid="5-51w28" />
                    清空
                  </Button>
                  {!isProcessing && (
                    <Button onClick={startBatchProcessing} data-oid="bkxshqp">
                      <Play className="h-4 w-4 mr-1" data-oid="jxd4:4u" />
                      開始處理 ({files.length} 個文件)
                    </Button>
                  )}
                  {isProcessing && (
                    <Button onClick={cancelProcessing} data-oid="3iq-_uy">
                      <Square className="h-4 w-4 mr-1" data-oid=":2vsv7j" />
                      取消
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent data-oid=":8x1-hi">
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
            data-oid="v_a2mu6"
          >
            <input {...getInputProps()} data-oid="lg1nn:i" />
            <Upload
              className="h-12 w-12 text-gray-400 mb-4 mx-auto"
              data-oid="o9x:fkp"
            />
            <p
              className="text-lg font-medium text-gray-700 mb-2"
              data-oid="ze:vgq1"
            >
              {isDragActive ? "放開文件以上傳" : "拖拽多個文件到這裡"}
            </p>
            <p className="text-sm text-gray-500" data-oid="px2516i">
              支持格式: 圖片文件 (PNG, JPG, JPEG, GIF), PDF, DOCX • 最大批量: 50
              個文件
            </p>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="mt-6" data-oid="dt:g6-.">
              <h3 className="text-sm font-medium mb-3" data-oid="u87k6_q">
                待處理文件 ({files.length})
              </h3>
              <div
                className="space-y-2 max-h-64 overflow-y-auto"
                data-oid="1nefve_"
              >
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-oid="j8nzpmo"
                  >
                    <div className="flex items-center gap-3" data-oid="ke:.ac6">
                      <span className="text-lg" data-oid="sr-srzs">
                        {getFileIcon(file)}
                      </span>
                      <div data-oid="5hl6.1t">
                        <p className="font-medium text-sm" data-oid="bfg:d:w">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500" data-oid="a_9riqd">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFile(index)}
                      disabled={isProcessing}
                      data-oid="t-j3:jz"
                    >
                      <Trash2 className="h-4 w-4" data-oid="qqb_.xj" />
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
        <Card data-oid="85pqs__">
          <CardHeader data-oid="wrnnfy:">
            <CardTitle className="flex items-center gap-2" data-oid="6lpp8yr">
              <Clock className="h-5 w-5 animate-spin" data-oid="0u40835" />
              處理進度
            </CardTitle>
          </CardHeader>
          <CardContent data-oid="6ui7cwk">
            <div className="space-y-4" data-oid="_1r_:1i">
              <div data-oid="zv76bub">
                <div
                  className="flex justify-between text-sm mb-2"
                  data-oid="zjue3ji"
                >
                  <span data-oid="fektbaw">總進度</span>
                  <span data-oid="puzl2:7">{Math.round(progress)}%</span>
                </div>
                <progress
                  value={progress}
                  max={100}
                  className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
                  style={{
                    appearance: "none",
                    backgroundColor: "#e5e7eb",
                  }}
                  data-oid="38juwx0"
                >
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    data-oid=":t3pa8c"
                  />
                </progress>
              </div>
              {currentProcessingFile && (
                <p className="text-sm text-gray-600" data-oid="1tef024">
                  正在處理: {currentProcessingFile}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 處理結果 */}
      {results.length > 0 && (
        <Card data-oid="_45b0r:">
          <CardHeader data-oid="acna799">
            <CardTitle
              className="flex items-center justify-between"
              data-oid="a47p.e-"
            >
              <span data-oid="rb2mcez">處理結果</span>
              <div className="flex gap-2" data-oid="rc1ed9c">
                <Badge
                  className={getStatusColor("completed")}
                  data-oid="1tdn.nv"
                >
                  成功: {stats.completed}
                </Badge>
                <Badge className={getStatusColor("error")} data-oid="-ttdas.">
                  失敗: {stats.failed}
                </Badge>
                <Badge
                  className={getStatusColor("processing")}
                  data-oid="a7bw4hw"
                >
                  處理中: {stats.processing}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent data-oid="j0z_ixh">
            <div className="space-y-4" data-oid="rdc0v9.">
              {/* 統計信息 */}
              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                data-oid="5jjjfa6"
              >
                <div className="text-center" data-oid="npea2bl">
                  <p
                    className="text-2xl font-bold text-blue-600"
                    data-oid="fhh40po"
                  >
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600" data-oid="bbxunwh">
                    總文件數
                  </p>
                </div>
                <div className="text-center" data-oid="ryeui7i">
                  <p
                    className="text-2xl font-bold text-green-600"
                    data-oid="k.80m65"
                  >
                    {stats.completed}
                  </p>
                  <p className="text-sm text-gray-600" data-oid="z.fa8n5">
                    成功
                  </p>
                </div>
                <div className="text-center" data-oid="l_22e72">
                  <p
                    className="text-2xl font-bold text-red-600"
                    data-oid="7su14c3"
                  >
                    {stats.failed}
                  </p>
                  <p className="text-sm text-gray-600" data-oid="z2ihe0w">
                    失敗
                  </p>
                </div>
                <div className="text-center" data-oid="h0bgxb8">
                  <p
                    className="text-2xl font-bold text-purple-600"
                    data-oid="j4t7l4j"
                  >
                    {Math.round(stats.successRate * 100)}%
                  </p>
                  <p className="text-sm text-gray-600" data-oid="4cj8luq">
                    成功率
                  </p>
                </div>
              </div>

              <div
                className="border-t border-gray-200 my-4"
                data-oid="mw:582m"
              ></div>

              {/* 詳細結果 */}
              <div data-oid="nyj4qdu">
                <div
                  className="flex justify-between items-center mb-3"
                  data-oid="e6.r:bz"
                >
                  <h3 className="text-sm font-medium" data-oid="r6unva7">
                    詳細結果
                  </h3>
                  {stats.completed > 0 && (
                    <Button onClick={downloadResults} data-oid="fr3o6_w">
                      <Download className="h-4 w-4 mr-1" data-oid="5pk_zw3" />
                      下載結果
                    </Button>
                  )}
                </div>
                <div
                  className="space-y-2 max-h-96 overflow-y-auto"
                  data-oid="zygca77"
                >
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-oid="2b-.ja_"
                    >
                      <div
                        className="flex items-center gap-3"
                        data-oid="wknje8w"
                      >
                        {getStatusIcon(result.status)}
                        <div data-oid="scp5rrr">
                          <p className="font-medium text-sm" data-oid="-lke.78">
                            {files[index]?.name || `文件 ${index + 1}`}
                          </p>
                          {result.error && (
                            <p
                              className="text-xs text-red-600"
                              data-oid="xxjci11"
                            >
                              {result.error}
                            </p>
                          )}
                          {result.result && (
                            <p
                              className="text-xs text-green-600"
                              data-oid="c2k-yd:"
                            >
                              模板已生成
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={getStatusColor(result.status)}
                        data-oid="jb-sgyw"
                      >
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
