import React from 'react';

interface RulerBackgroundProps {
  width?: number;
  height?: number;
  unit?: 'mm' | 'cm' | 'px';
  showGrid?: boolean;
}

/**
 * 尺規背景組件
 * 提供專業的編輯器背景，帶有刻度尺和網格
 */
export const RulerBackground: React.FC<RulerBackgroundProps> = ({
  width = 1000,
  height = 1414, // A4 比例
  unit = 'mm',
  showGrid = true,
}) => {
  // 刻度間距（像素）
  const majorTickSpacing = 50; // 大刻度
  const minorTickSpacing = 10; // 小刻度

  // 生成水平尺規刻度
  const generateHorizontalRuler = () => {
    const ticks = [];
    for (let i = 0; i <= width; i += minorTickSpacing) {
      const isMajor = i % majorTickSpacing === 0;
      const tickHeight = isMajor ? 15 : 8;
      const strokeWidth = isMajor ? 1.5 : 1;
      
      ticks.push(
        <line
          key={`h-${i}`}
          x1={i}
          y1={0}
          x2={i}
          y2={tickHeight}
          stroke="#666"
          strokeWidth={strokeWidth}
        />
      );

      // 添加數字標籤（每 50px）
      if (isMajor && i > 0) {
        ticks.push(
          <text
            key={`h-text-${i}`}
            x={i}
            y={25}
            fontSize="10"
            fill="#333"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
          >
            {i}
          </text>
        );
      }
    }
    return ticks;
  };

  // 生成垂直尺規刻度
  const generateVerticalRuler = () => {
    const ticks = [];
    for (let i = 0; i <= height; i += minorTickSpacing) {
      const isMajor = i % majorTickSpacing === 0;
      const tickWidth = isMajor ? 15 : 8;
      const strokeWidth = isMajor ? 1.5 : 1;
      
      ticks.push(
        <line
          key={`v-${i}`}
          x1={0}
          y1={i}
          x2={tickWidth}
          y2={i}
          stroke="#666"
          strokeWidth={strokeWidth}
        />
      );

      // 添加數字標籤（每 50px）
      if (isMajor && i > 0) {
        ticks.push(
          <text
            key={`v-text-${i}`}
            x={25}
            y={i + 4}
            fontSize="10"
            fill="#333"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            transform={`rotate(-90, 25, ${i})`}
          >
            {i}
          </text>
        );
      }
    }
    return ticks;
  };

  // 生成網格
  const generateGrid = () => {
    if (!showGrid) return null;

    const gridLines = [];
    
    // 垂直網格線
    for (let i = 0; i <= width; i += minorTickSpacing) {
      const isMajor = i % majorTickSpacing === 0;
      gridLines.push(
        <line
          key={`grid-v-${i}`}
          x1={i}
          y1={0}
          x2={i}
          y2={height}
          stroke={isMajor ? '#e0e0e0' : '#f0f0f0'}
          strokeWidth={isMajor ? 0.5 : 0.3}
        />
      );
    }

    // 水平網格線
    for (let i = 0; i <= height; i += minorTickSpacing) {
      const isMajor = i % majorTickSpacing === 0;
      gridLines.push(
        <line
          key={`grid-h-${i}`}
          x1={0}
          y1={i}
          x2={width}
          y2={i}
          stroke={isMajor ? '#e0e0e0' : '#f0f0f0'}
          strokeWidth={isMajor ? 0.5 : 0.3}
        />
      );
    }

    return gridLines;
  };

  return (
    <div className="relative w-full h-full bg-white">
      {/* 主 SVG 容器 */}
      <svg
        width={width + 40}
        height={height + 40}
        className="absolute top-0 left-0"
        style={{ pointerEvents: 'none' }}
      >
        {/* 網格 */}
        <g transform="translate(40, 40)">
          {generateGrid()}
        </g>

        {/* 水平尺規 */}
        <g transform="translate(40, 0)">
          <rect x={0} y={0} width={width} height={40} fill="#f8f9fa" />
          {generateHorizontalRuler()}
        </g>

        {/* 垂直尺規 */}
        <g transform="translate(0, 40)">
          <rect x={0} y={0} width={40} height={height} fill="#f8f9fa" />
          {generateVerticalRuler()}
        </g>

        {/* 左上角方塊 */}
        <rect x={0} y={0} width={40} height={40} fill="#e9ecef" />
        
        {/* 單位標籤 */}
        <text
          x={20}
          y={25}
          fontSize="11"
          fill="#666"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
        >
          {unit}
        </text>
      </svg>

      {/* 內容區域 */}
      <div 
        className="absolute" 
        style={{ 
          top: '40px', 
          left: '40px',
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* 這裡放置實際內容 */}
      </div>
    </div>
  );
};

export default RulerBackground;
