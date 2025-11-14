# 📏 尺規背景使用指南

## ✅ 已完成的設置

PrintCoord 現在擁有專業的尺規背景編輯器，類似於圖片中的 HiPrint 效果！

### 創建的文件

1. **`src/components/RulerBackground.tsx`** - SVG 尺規組件（完整版）
2. **`src/components/EditorWithRuler.tsx`** - 簡化尺規組件（當前使用）
3. **`src/styles/ruler-background.css`** - 尺規樣式
4. **`src/components/TemplateEditor.tsx`** - 已更新使用尺規背景

---

## 🎨 功能特性

### 1. 專業尺規

- ✅ 水平尺規（頂部）
- ✅ 垂直尺規（左側）
- ✅ 刻度標記（每 10px 小刻度，每 50px 大刻度）
- ✅ 數字標籤（每 50px）
- ✅ 單位顯示（px/mm/cm）

### 2. 網格背景

- ✅ 小網格（10px × 10px）淺灰色
- ✅ 大網格（50px × 50px）深灰色
- ✅ 可開關網格顯示

### 3. 視覺效果

- ✅ 漸層尺規背景
- ✅ 左上角單位標識
- ✅ 響應式設計（移動端自動隱藏尺規）

---

## 🚀 使用方法

### 基本用法

```tsx
import EditorWithRuler from '@/components/EditorWithRuler';

<EditorWithRuler 
  width={600} 
  height={848} 
  showGrid={true} 
  unit="px"
>
  <canvas ref={canvasRef} />
</EditorWithRuler>
```

### Props 說明

| Prop | 類型 | 默認值 | 說明 |
|------|------|--------|------|
| `width` | number | 1000 | 編輯區域寬度 |
| `height` | number | 1414 | 編輯區域高度（A4 比例） |
| `showGrid` | boolean | true | 是否顯示網格 |
| `unit` | string | 'px' | 單位標識（px/mm/cm） |
| `children` | ReactNode | - | 內容區域 |

---

## 🎯 當前效果

### 模板編輯器現在包含

```
┌─────┬──────────────────────────────────────┐
│ px  │  0    50   100   150   200   250... │ ← 水平尺規
├─────┼──────────────────────────────────────┤
│  0  │                                      │
│     │                                      │
│ 50  │         [Canvas 編輯區域]            │
│     │                                      │
│100  │         帶網格背景                    │
│     │                                      │
│150  │                                      │
│     │                                      │
└─────┴──────────────────────────────────────┘
  ↑
垂直尺規
```

---

## 🎨 樣式自定義

### 修改尺規顏色

編輯 `src/styles/ruler-background.css`:

```css
/* 尺規背景色 */
.ruler-horizontal,
.ruler-vertical {
  background: linear-gradient(...);  /* 修改這裡 */
}

/* 刻度顏色 */
background-image: 
  repeating-linear-gradient(
    90deg,
    #adb5bd 0,  /* 小刻度顏色 */
    ...
  );
```

### 修改網格樣式

```css
.grid-background {
  background-image: 
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),  /* 小網格 */
    linear-gradient(to right, #e0e0e0 1px, transparent 1px);  /* 大網格 */
}
```

### 調整刻度間距

編輯 `src/components/EditorWithRuler.tsx`:

```tsx
// 生成水平刻度標記
const generateHorizontalMarks = () => {
  const marks = [];
  for (let i = 0; i <= width; i += 50) {  // 修改間距
    marks.push(...);
  }
  return marks;
};
```

---

## 📐 尺寸配置

### A4 紙張尺寸

```tsx
// 72 DPI
<EditorWithRuler width={595} height={842} unit="px" />

// 96 DPI
<EditorWithRuler width={794} height={1123} unit="px" />

// 150 DPI
<EditorWithRuler width={1240} height={1754} unit="px" />
```

### 自定義尺寸

```tsx
// 名片 (90mm × 54mm @ 96 DPI)
<EditorWithRuler width={340} height={204} unit="mm" />

// 海報 (A3)
<EditorWithRuler width={1123} height={1587} unit="px" />
```

---

## 🔧 進階功能

### 1. 添加浮水印

在 `EditorWithRuler` 中添加：

```tsx
<div className="canvas-area">
  <div className="watermark-text" style={{ top: '50%', left: '50%' }}>
    PrintCoord
  </div>
  {children}
</div>
```

### 2. 動態單位轉換

```tsx
const [unit, setUnit] = useState<'px' | 'mm' | 'cm'>('px');

// 轉換函數
const pxToMm = (px: number) => px * 0.264583;
const pxToCm = (px: number) => px * 0.0264583;
```

### 3. 縮放功能

```tsx
const [zoom, setZoom] = useState(100);

<EditorWithRuler 
  width={600 * (zoom / 100)} 
  height={848 * (zoom / 100)}
/>
```

---

## 🎯 與圖片對比

### 您提供的圖片特性

- ✅ 頂部和左側尺規 → **已實現**
- ✅ 刻度標記 → **已實現**
- ✅ 網格背景 → **已實現**
- ✅ 左上角單位標識 → **已實現**
- ✅ 藍色邊距標記 → **可選功能**

### PrintCoord 額外特性

- ✅ 響應式設計
- ✅ 可自定義單位
- ✅ 可開關網格
- ✅ 品牌配色整合

---

## 📱 響應式行為

### 桌面端（> 768px）

- 顯示完整尺規和網格
- 30px 尺規寬度

### 移動端（≤ 768px）

- 自動隱藏尺規
- 僅顯示編輯區域
- 保留網格背景

---

## 🎨 配色方案

### 當前配色（專業灰）

```css
尺規背景: #f8f9fa → #e9ecef (漸層)
邊框: #dee2e6
小刻度: #adb5bd
大刻度: #6c757d
數字: #495057
網格小: #f0f0f0
網格大: #e0e0e0
```

### 可選配色（品牌藍）

```css
尺規背景: #e3f2fd → #bbdefb
刻度: #1976d2
數字: #0d47a1
```

---

## ✅ 檢查清單

部署前確認：

- [x] 尺規組件已創建
- [x] CSS 樣式已添加
- [x] TemplateEditor 已更新
- [x] globals.css 已導入樣式
- [x] 水平和垂直尺規顯示正常
- [x] 網格背景顯示正常
- [x] 刻度數字顯示正常
- [x] 響應式設計正常

---

## 🚀 立即測試

```bash
# 啟動開發服務器
pnpm dev

# 訪問模板編輯器
# 上傳 PDF/Word 文件
# 查看專業尺規背景效果
```

---

## 🎯 下一步優化

### 可選增強功能

1. **縮放控制**
   - 添加縮放滑塊（50% - 200%）
   - 鼠標滾輪縮放

2. **單位切換**
   - px / mm / cm 切換按鈕
   - 動態刻度轉換

3. **輔助線**
   - 拖拽創建輔助線
   - 對齊輔助線

4. **邊距標記**
   - 藍色邊距區域（如圖片所示）
   - 可調整邊距

5. **導出功能**
   - 導出帶尺規的預覽圖
   - PDF 導出

---

**PrintCoord 尺規背景** - 專業、精準、易用！📏✨
