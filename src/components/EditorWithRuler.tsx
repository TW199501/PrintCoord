"use client";

import React from 'react';

interface EditorWithRulerProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  showGrid?: boolean;
  unit?: string;
}

/**
 * 帶尺規的編輯器容器
 * 提供專業的編輯器背景，帶有刻度尺和網格
 */
export const EditorWithRuler: React.FC<EditorWithRulerProps> = ({
  children,
  width = 1000,
  height = 1414,
  showGrid = true,
  unit = 'px',
}) => {
  // 像素轉公分的比例
  // A4 紙張: 21cm × 29.7cm
  // 寬度: 794px = 21cm，所以 1cm = 794/21 ≈ 37.81px
  // 高度: 使用相同比例，所以 1cm = 794/21 ≈ 37.81px
  const cmToPx = width / 21; // 水平和垂直使用相同比例
  const cmToPxVertical = cmToPx; // 垂直使用相同比例
  
  // 生成水平刻度標記
  const generateHorizontalMarks = () => {
    const marks = [];
    // 每 2cm 顯示一次數字（1, 3, 5, 7...）
    for (let cm = 1; cm <= 21; cm += 2) {
      const px = (cm - 1) * cmToPx;  // 從 0 開始計算位置
      marks.push(
        <span
          key={`h-${cm}`}
          className="ruler-mark ruler-mark-h"
          style={{ left: `${px}px` }}
        >
          {cm}
        </span>
      );
    }
    return marks;
  };

  // 生成垂直刻度標記
  const generateVerticalMarks = () => {
    const marks = [];
    // A4 高度 29.7cm，顯示到 30cm
    const maxCm = 30;
    // 每 2cm 顯示一次數字（1, 3, 5, 7...）
    for (let cm = 1; cm <= maxCm; cm += 2) {
      const px = cm * cmToPxVertical;  // 垂直尺規位置正確，不需要減1
      // 確保標記在可見範圍內
      if (px <= height) {
        marks.push(
          <span
            key={`v-${cm}`}
            className="ruler-mark ruler-mark-v"
            style={{ top: `${px}px` }}
          >
            {cm}
          </span>
        );
      }
    }
    return marks;
  };

  return (
    <div className="editor-with-ruler">
      {/* 左上角方塊 */}
      <div className="corner ruler-corner">
        {unit}
      </div>

      {/* 水平尺規 */}
      <div className="horizontal-ruler ruler-horizontal">
        <div className="ruler-marks" style={{ width: `${width}px` }}>
          {generateHorizontalMarks()}
        </div>
      </div>

      {/* 垂直尺規 */}
      <div className="vertical-ruler ruler-vertical">
        <div className="ruler-marks" style={{ height: `${height}px` }}>
          {generateVerticalMarks()}
        </div>
      </div>

      {/* Canvas 區域 */}
      <div className={`canvas-area ${showGrid ? 'grid-background' : ''}`} style={{ overflow: 'hidden' }}>
        <div style={{ width: `${width}px`, height: `${height}px`, position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default EditorWithRuler;
