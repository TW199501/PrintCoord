# Manual Test Scripts

這個目錄包含用於測試 PDF 表格提取功能的手動測試腳本。

## 測試文件說明

### 主要測試腳本

- **`test-all-pdfs.ts`** ⭐ - 使用新的 PDF2JSONService 測試所有 PDF

  ```bash
  npx tsx src/tests/manual/test-all-pdfs.ts
  ```

- **`test-all-pdfs.js`** - JavaScript 版本（需要先編譯）

  ```bash
  node src/tests/manual/test-all-pdfs.js
  ```

### PDF2JSON 測試

- **`test-pdf2json.js`** - 基本 pdf2json 功能測試

  ```bash
  node src/tests/manual/test-pdf2json.js
  ```

- **`test-pdf2json-integration.js`** - pdf2json 整合測試（使用線條檢測）

  ```bash
  node src/tests/manual/test-pdf2json-integration.js
  ```

- **`test-pdf2json-improved.js`** - 改進的文字位置聚類測試

  ```bash
  node src/tests/manual/test-pdf2json-improved.js
  ```

- **`test-pdf-final.js`** - 最終版本（包含 Fills 檢測）

  ```bash
  node src/tests/manual/test-pdf-final.js
  ```

### 個別 PDF 測試

- **`test-pdf02-analysis.js`** - 測試 test-pdf02.pdf（人員資料表）

  ```bash
  node src/tests/manual/test-pdf02-analysis.js
  ```

- **`test-pdf03-analysis.js`** - 測試 test-pdf03.pdf（請款單）

  ```bash
  node src/tests/manual/test-pdf03-analysis.js
  ```

### 其他庫測試

- **`test-pdf-parse.js`** - 測試 pdf-parse 庫（已棄用）

  ```bash
  node src/tests/manual/test-pdf-parse.js
  ```

- **`test-pdfjs-extract.js`** - 測試 pdf.js-extract 庫（已棄用）

  ```bash
  node src/tests/manual/test-pdfjs-extract.js
  ```

## 測試 PDF 文件

測試使用的 PDF 文件位於 `public/` 目錄：

- `test-pdf01.pdf` - 發票（有部分線條）
- `test-pdf02.pdf` - 人員資料表（有大量 Fills 線條）
- `test-pdf03.pdf` - 請款單（有水平線條）⭐ 最佳測試案例

## 測試結果

### PDF2JSON 最終實現

使用 **pdf2json** 庫實現了三層檢測策略：

1. **Fills-based detection** ⭐ 優先
   - 從 Fills 中提取水平線和垂直線
   - 重建表格網格
   - 分配文字到單元格

2. **HLines/VLines detection**
   - 使用 PDF 的線條元素
   - 創建網格並分配文字

3. **Text-based detection** (fallback)
   - 根據文字位置推斷表格結構
   - 自動合併相鄰文字

### 檢測結果

| PDF | 策略 | 欄位數 | 狀態 |
|-----|------|--------|------|
| test-pdf01.pdf | Fills (H:5, V:0) | 2 | ✅ |
| test-pdf02.pdf | Fills (H:139, V:10) | 31 | ✅ |
| test-pdf03.pdf | Fills (H:18, V:0) | 5 | ✅ |

## 開發歷程

1. ❌ **pdf-parse** - 無法檢測表格結構
2. ⏸️ **pdf.js-extract** - 測試未完成
3. ✅ **pdf2json** - 成功！提供文字、位置和線條資訊

## 輸出文件

測試腳本會生成 JSON 輸出文件，存放在 `src/tests/manual/output/` 目錄：

- `pdf2json-output.json` - test-pdf01.pdf 解析結果
- `pdf02-output.json` - test-pdf02.pdf 解析結果
- `pdf03-output.json` - test-pdf03.pdf 解析結果

這些 JSON 文件包含完整的 PDF2JSON 輸出，可用於：

- 調試和分析
- 數據庫存儲
- 後續處理

詳見：`src/tests/manual/output/README.md`

## 數據存儲

### 類型定義

- `src/types/pdf2json.ts` - PDF2JSON 數據結構類型

### 數據庫

- `src/db/schema.sql` - 數據庫 Schema（SQLite）
  - `pdf_documents` - PDF 文檔表
  - `table_structures` - 表格結構表
  - `detected_fields` - 檢測欄位表

### 服務

- `src/services/pdfDatabaseService.ts` - 數據庫操作服務
  - 保存 PDF 文檔和欄位
  - 導出為 JSON
  - 查詢和檢索

## 相關文件

- 實現代碼：`src/services/pdf2jsonService.ts`
- 單元測試：`src/tests/unit/pdf2jsonService.test.ts`
- 文檔：`docs/pdf2json.md`
