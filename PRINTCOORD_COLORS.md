# PrintCoord 智慧表格模板管理系統 - 品牌配色方案

## 🎨 配色設計理念

延續 PrintCoord LOGO 設計的藍紫＋橘色系，打造「文件 + 座標 + 科技感」的一致品牌形象。

---

## 一、品牌主色（Primary）

### 主品牌藍（Primary）

- **色碼**: `#3BC8FF`
- **Tailwind**: `pc-primary`
- **用途**:
  - 主要按鈕背景
  - 重點連結
  - Icon 主色
  - Logo 漸層起點
- **感覺**: 清爽、科技、與「文件、雲端、工具」完美搭配

### 深藍（Primary Dark）

- **色碼**: `#2563EB`
- **Tailwind**: `pc-primary-dark`
- **用途**:
  - Hover 狀態
  - 深色背景上的文字或 Icon
  - 按鈕 Hover 效果

### 藍紫（Secondary）

- **色碼**: `#5A5CFF`
- **Tailwind**: `pc-secondary`
- **用途**:
  - 漸層的另一端
  - 次要按鈕
  - 標題強調背景
  - Logo 漸層終點

---

## 二、強調色（Accent）

### 橘色強調

- **色碼**: `#FFB347`
- **Tailwind**: `pc-accent`
- **用途**:
  - ⭐ **重要標籤**（如 Step 01, Step 02）
  - 📍 **XY 標記**
  - 📊 **進度步驟高亮**
  - 💰 **價格顯示**
  - 🏷️ **Badge 徽章**
  - ⚠️ **重要提醒**
- **特色**: 與藍紫形成互補色，視覺衝擊力強

---

## 三、背景與文字色（UI 基本色）

### 背景色

- **頁面背景**: `#F3F4F6` (`pc-bg`)
- **卡片背景**: `#FFFFFF` (`pc-bg-card`)

### 邊框與分隔線

- **邊框色**: `#E2E8F0` (`pc-border`)
- **用途**: 細邊框、區塊分隔線

### 文字色

- **主文字**: `#0F172A` (`pc-text`)
  - 深藍灰色，比純黑更柔和
  - 適合長時間閱讀
- **次文字/說明**: `#64748B` (`pc-text-muted`)
  - 用於輔助說明、提示文字

---

## 四、狀態色（Success / Warning / Error）

### 成功 Success

- **色碼**: `#22C55E`
- **Tailwind**: `pc-success`
- **用途**: 成功提示、完成狀態

### 警告 Warning

- **色碼**: `#F59E0B`
- **Tailwind**: `pc-warning`
- **用途**: 警告訊息、注意事項

### 錯誤 Error

- **色碼**: `#EF4444`
- **Tailwind**: `pc-error`
- **用途**: 錯誤提示、驗證失敗

---

## 五、實際應用範例

### 🔘 按鈕設計

#### 主要按鈕（Primary Button）

```tsx
className="bg-gradient-to-r from-pc-primary to-pc-secondary 
  hover:from-pc-primary-dark hover:to-pc-secondary 
  text-white shadow-md hover:shadow-lg 
  transition-all font-semibold"
```

- **背景**: 藍→藍紫漸層
- **文字**: 白色
- **Hover**: 更深的漸層 + 陰影提升

#### 次要按鈕（Secondary Button）

```tsx
className="bg-white border border-pc-border 
  text-pc-primary-dark hover:bg-pc-bg"
```

- **背景**: 白色
- **邊框**: 淡灰色
- **文字**: 深藍色

---

### 📊 步驟指示器（Step Indicator）

#### 當前步驟

```tsx
<Badge className="bg-pc-accent text-white font-semibold">
  Step 01
</Badge>
```

- **背景**: 橘色強調色
- **文字**: 白色
- **效果**: 一眼就能看到當前位置

#### 進度條

```tsx
className="bg-gradient-to-r from-pc-primary via-pc-secondary to-pc-accent"
```

- **漸層**: 藍→藍紫→橘色
- **動畫**: 平滑過渡（33% → 66% → 100%）

---

### 🎨 畫布預覽區（Canvas）

#### 畫布背景

```tsx
className="bg-white border border-pc-border"
```

#### 座標點/框選區

```tsx
// 邊框
stroke: '#2563EB'  // pc-primary-dark

// 節點/控制點
fill: '#FFB347'    // pc-accent
```

---

### 🏠 Header（頂部導航）

```tsx
<header className="bg-white border-b border-pc-border">
  {/* Logo 漸層 */}
  <div className="bg-gradient-to-br from-pc-primary to-pc-secondary">
    <Grid3x3 className="text-white" />
  </div>
  
  {/* 品牌名稱漸層文字 */}
  <h1 className="bg-gradient-to-r from-pc-primary to-pc-secondary 
    bg-clip-text text-transparent">
    PrintCoord
  </h1>
  
  {/* 底部裝飾線 */}
  <div className="bg-gradient-to-r from-pc-primary via-pc-secondary to-pc-accent" />
</header>
```

---

### 🎴 卡片組件（Card）

```tsx
<Card className="border-t-4 border-t-pc-primary 
  bg-pc-bg-card shadow-sm hover:shadow-md">
  <CardHeader className="border-b border-pc-border">
    {/* 內容 */}
  </CardHeader>
</Card>
```

- **頂部邊框**: 4px 品牌藍
- **背景**: 白色
- **Hover**: 陰影提升

---

## 六、Tailwind 配置

已在 `tailwind.config.ts` 中定義：

```typescript
colors: {
  'pc-primary': {
    DEFAULT: '#3BC8FF',  // 主品牌藍
    dark: '#2563EB',     // 深藍（Hover）
  },
  'pc-secondary': '#5A5CFF',  // 藍紫
  'pc-accent': '#FFB347',     // 橘色強調
  'pc-bg': {
    DEFAULT: '#F3F4F6',  // 頁面背景
    card: '#FFFFFF',     // 卡片背景
  },
  'pc-border': '#E2E8F0',  // 邊框
  'pc-text': {
    DEFAULT: '#0F172A',  // 主文字
    muted: '#64748B',    // 次文字
  },
  'pc-success': '#22C55E',
  'pc-warning': '#F59E0B',
  'pc-error': '#EF4444',
}
```

---

## 七、使用指南

### ✅ 推薦做法

1. **一致性優先**: 全站統一使用品牌色
2. **層次分明**: 主色→次色→強調色，清晰的視覺層次
3. **對比度**: 確保文字可讀性（WCAG AA 標準）
4. **漸層使用**: 適度使用，避免過度

### ⚠️ 注意事項

1. **橘色強調色**: 僅用於需要特別突出的元素
2. **深色模式**: 保持品牌色一致，調整背景和文字
3. **可訪問性**: 確保足夠的對比度
4. **性能**: 使用 CSS 漸層（GPU 加速）

---

## 八、品牌識別

### Logo 組合

- **圖標**: Grid3x3（代表表格/座標）
- **漸層**: 藍→藍紫
- **陰影**: 品牌藍 30% 透明度

### 品牌名稱

- **字體**: 粗體（font-bold）
- **效果**: 漸層文字（藍→藍紫）
- **副標**: 次文字色

### 裝飾元素

- **分隔線**: 品牌色漸層（藍→藍紫→橘）
- **進度條**: 動態漸層
- **徽章**: 橘色背景 + 白色文字

---

## 九、深色模式適配

```css
/* 淺色模式 */
bg-white
text-pc-text
border-pc-border

/* 深色模式 */
dark:bg-slate-900
dark:text-white
dark:border-slate-700

/* 品牌色保持一致 */
bg-pc-primary  /* 不需要 dark: 前綴 */
```

---

## 🎯 設計目標

✅ **專業**: 商務場景適用  
✅ **現代**: 符合當代 UI 趨勢  
✅ **識別**: 強烈的品牌特色  
✅ **舒適**: 長時間使用不疲勞  
✅ **一致**: 與 LOGO 設計呼應  

---

**PrintCoord 智慧表格模板管理系統** - 讓座標更精準，讓文件更智慧！
