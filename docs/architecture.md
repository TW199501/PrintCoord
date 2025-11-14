# 前後端分離架構設計

## 📐 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 (Frontend)                      │
│                      Next.js 16 + React                      │
├─────────────────────────────────────────────────────────────┤
│  - 文件上傳界面                                              │
│  - PDF 預覽                                                  │
│  - 表格編輯器                                                │
│  - 欄位管理                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ RESTful API / GraphQL
                       │ (HTTP/HTTPS)
┌──────────────────────▼──────────────────────────────────────┐
│                      後端 API (Backend)                      │
│                    Next.js API Routes                        │
├─────────────────────────────────────────────────────────────┤
│  - PDF 上傳處理 (/api/pdf/upload)                           │
│  - 文檔管理 (/api/pdf/:id)                                  │
│  - 欄位檢測 (/api/pdf/:id/fields)                           │
│  - 數據導出 (/api/pdf/:id/export)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    業務邏輯層 (Services)                     │
├─────────────────────────────────────────────────────────────┤
│  - PDF2JSONService (PDF 解析)                               │
│  - PDFDatabaseService (數據庫操作)                          │
│  - FieldDetectionService (欄位檢測)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  數據庫 (Database)                           │
│              PostgreSQL / SQLite                             │
├─────────────────────────────────────────────────────────────┤
│  - pdf_documents (文檔表)                                   │
│  - table_structures (表格結構表)                            │
│  - detected_fields (檢測欄位表)                             │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ 數據庫選擇

### 開發環境：SQLite

- ✅ 零配置，文件型數據庫
- ✅ 適合本地開發和測試
- ✅ 輕量級，無需額外服務

```bash
# 使用 SQLite
DATABASE_URL="file:./dev.db"
```

### 生產環境：PostgreSQL ⭐

- ✅ 強大的 JSONB 支持（存儲 PDF2JSON 輸出）
- ✅ 完整的 ACID 事務
- ✅ 高並發性能
- ✅ 豐富的索引類型
- ✅ 支持全文搜索

```bash
# 使用 PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/pdfdb"
```

## 📡 API 端點設計

### 1. PDF 文檔管理

#### POST /api/pdf/upload

上傳並處理 PDF 文件

**Request:**

```typescript
Content-Type: multipart/form-data

{
  file: File
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    documentId: string,
    filename: string,
    pageCount: number,
    status: 'processing' | 'processed',
    fieldsDetected: number
  }
}
```

#### GET /api/pdf/:id

獲取 PDF 文檔信息

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    filename: string,
    title: string,
    pageCount: number,
    status: string,
    createdAt: string,
    updatedAt: string
  }
}
```

#### GET /api/pdf/:id/fields

獲取檢測到的欄位

**Query Parameters:**

- `page?: number` - 頁碼（可選）
- `row?: number` - 行索引（可選）
- `col?: number` - 列索引（可選）

**Response:**

```typescript
{
  success: true,
  data: {
    fields: Array<{
      id: string,
      name: string,
      value: string,
      position: { x: number, y: number },
      size: { width: number, height: number },
      type: string,
      pageIndex: number,
      rowIndex: number,
      colIndex: number
    }>,
    total: number
  }
}
```

#### GET /api/pdf/:id/export

導出為 JSON

**Query Parameters:**

- `format?: 'json' | 'csv' | 'excel'`

**Response:**

```typescript
{
  success: true,
  data: {
    downloadUrl: string,
    format: string,
    size: number
  }
}
```

#### DELETE /api/pdf/:id

刪除 PDF 文檔

**Response:**

```typescript
{
  success: true,
  message: 'Document deleted successfully'
}
```

### 2. 表格結構管理

#### GET /api/pdf/:id/structure

獲取表格結構信息

**Response:**

```typescript
{
  success: true,
  data: {
    pages: Array<{
      pageIndex: number,
      rows: number,
      columns: number,
      strategy: 'fills' | 'lines' | 'text',
      gridData: {
        horizontalLines: number,
        verticalLines: number,
        columnBoundaries: number[],
        rowBoundaries: number[]
      }
    }>
  }
}
```

## 🔧 技術棧

### 前端

- **框架**: Next.js 16 (App Router)
- **UI**: React + TailwindCSS + shadcn/ui
- **狀態管理**: React Context / Zustand
- **HTTP 客戶端**: Fetch API / Axios

### 後端

- **框架**: Next.js API Routes
- **PDF 處理**: pdf2json
- **ORM**: Prisma / Drizzle ORM
- **驗證**: Zod
- **文件存儲**: 本地文件系統 / S3

### 數據庫

- **開發**: SQLite
- **生產**: PostgreSQL 15+
- **遷移**: Prisma Migrate / Drizzle Kit

## 📦 部署方案

### 選項 1：Vercel (推薦)

```bash
# 自動部署
vercel --prod

# 環境變量
DATABASE_URL=postgresql://...
```

### 選項 2：Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/pdfdb
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pdfdb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 選項 3：傳統服務器

```bash
# 使用 PM2
npm install -g pm2
npm run build
pm2 start npm --name "pdf-app" -- start
```

## 🔐 安全考慮

1. **文件上傳限制**
   - 最大文件大小：10MB
   - 允許的文件類型：.pdf
   - 文件名消毒

2. **API 認證**
   - JWT Token
   - API Key
   - Rate Limiting

3. **數據庫安全**
   - 參數化查詢（防止 SQL 注入）
   - 連接加密
   - 定期備份

## 📊 性能優化

1. **數據庫索引**
   - 文檔 ID 索引
   - 狀態索引
   - JSONB GIN 索引

2. **緩存策略**
   - Redis 緩存熱門文檔
   - CDN 緩存靜態資源

3. **異步處理**
   - 使用隊列處理大文件
   - 後台任務處理

## 🔄 數據流程

```
1. 用戶上傳 PDF
   ↓
2. 前端發送到 /api/pdf/upload
   ↓
3. 後端接收文件
   ↓
4. PDF2JSONService 解析 PDF
   ↓
5. 檢測表格和欄位
   ↓
6. 保存到 PostgreSQL
   ↓
7. 返回文檔 ID 給前端
   ↓
8. 前端顯示結果
```

## 📝 環境變量

```env
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/pdfdb"
NODE_ENV="development"
MAX_FILE_SIZE="10485760" # 10MB
UPLOAD_DIR="./uploads"
```

## 🚀 快速開始

```bash
# 1. 安裝依賴
pnpm install

# 2. 設置數據庫
pnpm db:migrate

# 3. 啟動開發服務器
pnpm dev

# 4. 訪問
open http://localhost:3000
```
