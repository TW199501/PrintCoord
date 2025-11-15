# PrintCoord

智慧表格處理系統，提供 AI 辨識、尺規對齊與視覺化編輯能力，協助企業快速建立可重複使用的文件模板。

---

## 🌟 產品總覽

- **智慧 OCR 與欄位建議**：整合 Tesseract.js 與自研策略，支援多語言識別與欄位類型建議。
- **專業尺規編輯器**：仿製印刷軟體的水平/垂直尺規與網格，提供精準定位與量測。
- **批次處理工作流程**：一次處理多份文件，搭配自動命名與欄位調整工具。
- **全端 TypeScript**：Next.js 16 + React 19 架構，支援最新的 App Router 與 Turbopack。
- **可觀測性與學習能力**：內建使用行為追蹤，持續優化欄位推薦與流程。

---

## 🧱 專案目錄重點

| 目錄 | 說明 |
|------|------|
| `src/components/TemplateEditor.tsx` | Canvas + Fabric.js 視覺化模板編輯器，內建尺規與網格 |
| `src/components/EditorWithRuler.tsx` | 尺規容器組件，負責渲染水平/垂直尺規以及網格背景 |
| `src/services/fieldDetection.ts` | 欄位檢測策略（OCR/影像分析/手動調整） |
| `src/tests/*` | 單元、整合與手動測試腳本 |
| `pnpm-workspace.yaml` | Workspace 設定，確保 Docker 與 CI 能正確安裝依賴 |

---

## ⚙️ 系統需求

- Node.js 18 LTS 或 20（建議）
- pnpm 8（或 npm / yarn，需自行調整指令）
- React 19、Next.js 16、TypeScript 5

---

## 🚀 快速開始

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器 (http://localhost:3000)
pnpm dev

# 建置正式版
pnpm build

# 啟動正式伺服器
pnpm start
```

> Docker 映像在構建時需要 `pnpm-workspace.yaml`，已在 Dockerfile 中載入。

---

## 🖥️ 模板編輯器與尺規指南

PrintCoord 內建 **EditorWithRuler**，提供與 HiPrint 類似的尺規體驗。

### 功能重點

- 水平 / 垂直尺規（10px 小刻度、50px 大刻度、數字標籤）
- 10px × 10px 淺網格 + 50px × 50px 深網格，支援顯示 / 隱藏
- A4 尺寸預設（21cm × 29.7cm @ 96DPI = 794 × 1123 px）
- 響應式設計：桌面顯示完整尺規，行動端自動隱藏尺規僅保留畫布
- 可自訂單位（px / mm / cm）、顏色與刻度密度

### 基本用法

```tsx
import EditorWithRuler from "@/components/EditorWithRuler";

<EditorWithRuler width={794} height={1123} showGrid unit="cm">
  <canvas ref={canvasRef} />
</EditorWithRuler>
```

### 自訂樣式

- 調整梯度與刻度顏色：`src/styles/ruler-background.css`
- 修改刻度間距或單位換算：`src/components/EditorWithRuler.tsx`
- A4 以外尺寸：調整 `width` / `height` 參數或動態縮放

### 進階技巧

- 可在尺規容器中加入浮水印、輔助線、縮放控制
- 配合 TemplateEditor 時，欄位位置會與尺規同步顯示，利於實體紙本比對

---

## 🧪 測試策略

```bash
# 全部測試
pnpm test

# 監聽模式
pnpm test --watch

# 覆蓋率報告
pnpm test:coverage

# 指定服務測試 (範例：PDF2JSON)
pnpm test pdf2jsonService
```

### 測試現況摘要

- PDF2JSON 核心服務：**9/9 測試全部通過**
- 整體自動化測試：持續提升中（請參考 `src/tests/TEST_STATUS.md`）
- 手動測試腳本位於 `src/tests/manual`，可快速驗證新 PDF

### 測試最佳實踐

1. 每個測試維持獨立、易讀的 `should ...` 敘述
2. 盡量使用最小化、貼近真實的 mock
3. 測試完成後記得清理資源與重置 mock
4. CI 會透過 GitHub Actions（`.github/workflows/ci.yml`）執行 `pnpm install`, `pnpm test`, `pnpm lint`

---

## 🛠️ 開發指引

- **環境變數**：請在 `.env.local` 中設定 API 金鑰或服務端點（預設不會被版本控制）
- **主題切換**：`TemplateManager` 會依據 localStorage `tableTemplate_theme` 切換 light/dark 模式
- **欄位檢測流程**：
  1. 後端（pdf2json）結果 → 2. 四邊框影像檢測 → 3. OCR 備援 → 4. 手動調整
- **行為追蹤與建議**：`SmartSuggestionsService` 與 `UserBehaviorTracker` 會在初始化時啟動；如不需要可於程式碼中停用

---

## 🤝 貢獻指南

1. Fork 專案並建立分支：`git checkout -b feature/awesome`
2. 依據測試指南撰寫或更新測試
3. 提交時請包含變更摘要與測試結果
4. 建議先開 Issue 討論大功能或架構調整

---

## 📄 授權與支援

- 授權：MIT License（詳見 [LICENSE](LICENSE)）
- 問題回報：GitHub Issues
- 聯絡：<support@tabletemplate.pro>

---

**PrintCoord** — 讓表格模板規劃與列印對齊變得智慧、準確、好操作。✨
