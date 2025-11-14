# PDF2JSON 輸出文件

這個目錄包含 PDF2JSON 解析後的原始 JSON 輸出文件。

## 文件說明

- **`pdf2json-output.json`** (181KB) - test-pdf01.pdf 的解析結果（發票）
- **`pdf02-output.json`** (179KB) - test-pdf02.pdf 的解析結果（人員資料表）
- **`pdf03-output.json`** (53KB) - test-pdf03.pdf 的解析結果（請款單）⭐

## JSON 結構

每個 JSON 文件包含以下結構：

```json
{
  "Transcoder": "pdf2json@4.0.0",
  "Meta": {
    "PDFFormatVersion": "1.5",
    "Title": "文檔標題",
    "Author": "作者",
    "Creator": "創建工具",
    "CreationDate": "創建日期"
  },
  "Pages": [
    {
      "Width": 37.208,
      "Height": 52.627,
      "HLines": [],      // 水平線陣列
      "VLines": [],      // 垂直線陣列
      "Fills": [         // 填充區域（可能是線條或背景）
        {
          "x": 4.989,
          "y": 8.371,
          "w": 4.56,
          "h": 0.135,
          "oc": "#000000"
        }
      ],
      "Texts": [         // 文字元素
        {
          "x": 2.5,
          "y": 16.0,
          "w": 5.0,
          "R": [
            {
              "T": "ITEM"  // URL encoded 文字
            }
          ]
        }
      ]
    }
  ]
}
```

## 關鍵欄位說明

### Meta（元數據）

- `Title`: PDF 標題
- `Author`: 作者
- `Creator`: 創建工具（如 Microsoft Word）
- `PDFFormatVersion`: PDF 版本

### Page（頁面）

- `Width`, `Height`: 頁面尺寸（PDF 單位）
- `HLines`: 水平線陣列（用於表格邊框）
- `VLines`: 垂直線陣列（用於表格邊框）
- `Fills`: 填充區域（**關鍵**：包含表格線條）
- `Texts`: 文字元素陣列

### Fills（填充/線條）

- `x`, `y`: 位置座標
- `w`: 寬度
- `h`: 高度
- `oc`: 顏色（十六進制）

**檢測邏輯**：

- 水平線：`h < 0.2 && w > 1`
- 垂直線：`w < 0.2 && h > 1`

### Texts（文字）

- `x`, `y`: 位置座標
- `w`: 寬度
- `R`: 文字運行陣列
  - `T`: URL encoded 文字內容
  - `TS`: [字體ID, 字體大小, 粗體, 斜體]

## 數據庫存儲

這些 JSON 文件最終會被處理並存儲到數據庫中：

### 數據表結構

1. **pdf_documents** - PDF 文檔主表
   - 存儲文檔元數據
   - 保存完整的 raw_data (JSON)
   - 追蹤處理狀態

2. **table_structures** - 表格結構表
   - 記錄每頁的表格結構
   - 行數、列數
   - 檢測策略（fills/lines/text）
   - 網格邊界數據

3. **detected_fields** - 檢測欄位表
   - 每個檢測到的單元格
   - 位置、大小、內容
   - 關聯到文檔和表格結構

### 使用方式

```typescript
import { PDFDatabaseService } from '@/services/pdfDatabaseService';
import { PDF2JSONService } from '@/services/pdf2jsonService';

// 解析 PDF
const pdfBuffer = fs.readFileSync('test.pdf');
const pdfData = await PDF2JSONService.parsePDF(pdfBuffer);
const fields = await PDF2JSONService.detectFieldsFromPDF(pdfBuffer);

// 保存到數據庫
const documentId = await PDFDatabaseService.savePDFDocument(
  'test.pdf',
  pdfData,
  fields
);

// 導出為 JSON
const json = PDFDatabaseService.exportToJSON('test.pdf', pdfData, fields);
fs.writeFileSync('output.json', json);
```

## 相關文件

- 類型定義：`src/types/pdf2json.ts`
- 數據庫 Schema：`src/db/schema.sql`
- 數據庫服務：`src/services/pdfDatabaseService.ts`
- PDF 解析服務：`src/services/pdf2jsonService.ts`

## 檢測結果統計

| PDF | Fills | H-Lines | V-Lines | Texts | 檢測欄位 |
|-----|-------|---------|---------|-------|----------|
| pdf01 | 6 | 5 | 0 | 467 | 2 |
| pdf02 | 149 | 139 | 10 | 414 | 31 |
| pdf03 | 18 | 18 | 0 | 134 | 5 |

## 注意事項

1. **文字編碼**：所有文字內容都是 URL encoded，需要用 `decodeURIComponent()` 解碼
2. **座標系統**：使用 PDF 單位，需要乘以 20 轉換為像素
3. **Fills 用途**：大多數表格線條都在 Fills 中，不在 HLines/VLines
4. **文字合併**：相鄰的文字元素需要合併成完整單詞
