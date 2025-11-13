# TableTemplate Pro

智慧表格處理系統 - 基於 AI 的文件模板識別與處理解決方案

## 🚀 功能特色

- **智慧 OCR 識別**: 使用 Tesseract.js 進行文字識別
- **AI 欄位建議**: 基於機器學習的智慧欄位類型推薦
- **批量處理**: 支持多文件並發處理
- **多格式支持**: Word (.doc/.docx)、PDF 文件處理
- **視覺化編輯**: 基於 Fabric.js 的 Canvas 編輯器
- **學習能力**: 用戶行為追蹤與持續改進

## 📦 安裝

```bash
npm install @tabletemplate/pro
# 或
yarn add @tabletemplate/pro
# 或
pnpm add @tabletemplate/pro
```

## 🎯 系統需求

- **React**: 19.0.0 或更高版本
- **Next.js**: 16.0.0 或更高版本
- **Node.js**: 18.0.0 或更高版本
- **TypeScript**: 5.0.0 或更高版本

## 🎯 快速開始

### 基本使用

```tsx
import { TemplateManager } from '@tabletemplate/pro';

function App() {
  return (
    <div>
      <TemplateManager />
    </div>
  );
}
```

### 自定義組件

```tsx
import {
  TemplateEditor,
  FileUpload,
  BatchUpload,
  FieldType
} from '@tabletemplate/pro';

function CustomTemplate() {
  const [fields, setFields] = useState([]);

  const handleFileProcessed = (result) => {
    console.log('文件處理結果:', result);
  };

  return (
    <div>
      <FileUpload onFileProcessed={handleFileProcessed} />
      <TemplateEditor
        fields={fields}
        onFieldsChange={setFields}
      />
    </div>
  );
}
```

## 🔧 API 參考

### 組件

#### TemplateManager

主要管理組件，包含完整的表格處理功能。

#### TemplateEditor

模板編輯器，提供視覺化的欄位編輯功能。

```tsx
interface TemplateEditorProps {
  canvasData?: string;
  fields: FieldArea[];
  onFieldsChange: (fields: FieldArea[]) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}
```

#### FileUpload

文件上傳組件，支持拖拽上傳。

```tsx
interface FileUploadProps {
  onFileProcessed: (result: FileUploadResult) => void;
  acceptedFormats?: string[];
  maxSize?: number;
}
```

#### BatchUpload

批量文件處理組件。

### 服務類

#### OCRService

OCR 文字識別服務。

```tsx
// 初始化
await OCRService.initialize();

// 識別圖片中的文字
const result = await OCRService.extractTextFromImage(imageData);
```

#### SmartSuggestionsService

智慧建議服務。

```tsx
// 生成欄位建議
const suggestion = SmartSuggestionsService.generateSuggestion(
  fieldName,
  context
);
```

#### BatchProcessorService

批量處理服務。

```tsx
// 批量處理文件
const results = await BatchProcessorService.processBatch(
  files,
  progressCallback
);
```

## 🆕 React 19 & Next.js 16 特性支持

### React 19 新特性

- **Server Components**: 完整支持 React Server Components
- **Actions**: 支持新的 Actions API
- **use() Hook**: 支持新的 use() Hook
- **Concurrent Features**: 完整的並發特性支持

### Next.js 16 優化

- **Turbopack**: 支持 Turbopack 構建系統
- **App Router**: 完整的 App Router 支持
- **Server Actions**: 支持 Server Actions
- **Streaming**: 支持 Streaming SSR

## 🎨 自定義樣式

TableTemplate Pro 使用 Tailwind CSS 進行樣式設計，你可以通過以下方式自定義：

```css
/* 自定義主題色彩 */
.table-template-primary {
  @apply bg-blue-500 text-white;
}

.table-template-secondary {
  @apply bg-gray-100 text-gray-800;
}
```

## ⚙️ 配置選項

```tsx
import { DEFAULT_CONFIG } from '@tabletemplate/pro';

const customConfig = {
  ...DEFAULT_CONFIG,
  maxFileSize: 20, // MB
  supportedFormats: ['.docx', '.pdf'],
  ocrLanguage: 'eng+chi_tra+jpn',
  minConfidence: 0.8,
  concurrency: 8
};
```

## 🧪 測試

```bash
# 運行測試
npm test

# 監視模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage
```

## 📊 性能優化

- **並發處理**: 支持多文件並發處理，提升批量處理效率
- **智慧快取**: OCR 結果和學習數據本地快取
- **懶加載**: 組件按需加載，減少初始包大小
- **Web Workers**: OCR 處理在 Web Worker 中執行，避免阻塞主線程

## 🔒 隱私保護

- **本地處理**: 所有文件處理和 OCR 識別均在本地進行
- **數據安全**: 學習數據僅存儲在用戶本地
- **無服務器依賴**: 不需要外部 API 調用

## 🌍 國際化

支持多語言 OCR 識別：

- 英文 (eng)
- 繁體 (chi_tra)
- 簡體 (chi_sim)
- 日文 (jpn)
- 韓文 (kor)

## 📈 版本歷史

### v1.0.0

- ✅ 基礎 OCR 功能
- ✅ 智慧欄位建議
- ✅ 批量處理
- ✅ 視覺化編輯器
- ✅ 完整測試覆蓋
- ✅ React 19 & Next.js 16 支持

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 🆘 支援

- 📧 Email: <support@tabletemplate.pro>
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/tabletemplate-pro/issues)
- 📖 文檔: [完整文檔](https://docs.tabletemplate.pro)

---

**TableTemplate Pro** - 讓表格處理變得智慧而簡單 ✨

*支持最新的 React 19 和 Next.js 16 技術棧*
