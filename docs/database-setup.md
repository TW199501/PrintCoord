# 數據庫設置指南

## 📋 概述

本項目支持兩種數據庫：

- **SQLite** - 用於開發和測試
- **PostgreSQL** - 用於生產環境（推薦）⭐

## 🗄️ 數據庫選擇

### SQLite（開發環境）

**優點：**

- ✅ 零配置，開箱即用
- ✅ 文件型數據庫，易於備份
- ✅ 適合單用戶或小規模應用
- ✅ 無需額外服務

**缺點：**

- ⚠️ 不支持並發寫入
- ⚠️ JSON 支持有限
- ⚠️ 不適合生產環境

**使用方式：**

```bash
# 安裝依賴
pnpm add better-sqlite3

# 環境變量
DATABASE_URL="file:./dev.db"

# 運行遷移
pnpm db:migrate:sqlite
```

### PostgreSQL（生產環境）⭐

**優點：**

- ✅ 強大的 JSONB 支持
- ✅ 高並發性能
- ✅ 完整的 ACID 事務
- ✅ 豐富的索引類型（GIN, GiST）
- ✅ 支持全文搜索
- ✅ 成熟的生態系統

**推薦原因：**

1. **JSONB 類型** - 完美存儲 PDF2JSON 輸出
2. **GIN 索引** - 快速查詢 JSON 數據
3. **並發支持** - 多用戶同時訪問
4. **可擴展性** - 支持大規模數據

**使用方式：**

```bash
# 安裝依賴
pnpm add pg

# 環境變量
DATABASE_URL="postgresql://user:password@localhost:5432/pdfdb"

# 運行遷移
pnpm db:migrate:postgresql
```

## 🚀 快速開始

### 1. 使用 Docker 啟動 PostgreSQL

```bash
# docker-compose.yml
docker-compose up -d postgres
```

或手動啟動：

```bash
docker run --name pdf-postgres \
  -e POSTGRES_DB=pdfdb \
  -e POSTGRES_USER=pdfuser \
  -e POSTGRES_PASSWORD=pdfpassword \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 2. 創建數據庫

```bash
# 連接到 PostgreSQL
psql -h localhost -U pdfuser -d pdfdb

# 或使用 GUI 工具
# - pgAdmin
# - DBeaver
# - TablePlus
```

### 3. 運行遷移腳本

```bash
# 使用 psql
psql -h localhost -U pdfuser -d pdfdb -f src/db/schema.postgresql.sql

# 或使用 Node.js
node scripts/migrate.js
```

## 📊 數據庫結構

### 表格說明

#### 1. pdf_documents

存儲 PDF 文檔的元數據和完整的 PDF2JSON 輸出

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| filename | VARCHAR(255) | 文件名 |
| title | VARCHAR(500) | PDF 標題 |
| raw_data | JSONB | 完整的 PDF2JSON 輸出 ⭐ |
| status | VARCHAR(20) | 處理狀態 |
| page_count | INTEGER | 頁數 |
| created_at | TIMESTAMP | 創建時間 |

#### 2. table_structures

記錄每頁的表格結構信息

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| document_id | UUID | 關聯文檔 |
| page_index | INTEGER | 頁碼 |
| rows | INTEGER | 行數 |
| columns | INTEGER | 列數 |
| detection_strategy | VARCHAR(20) | 檢測策略 |
| column_boundaries | JSONB | 列邊界數組 |
| row_boundaries | JSONB | 行邊界數組 |

#### 3. detected_fields

存儲所有檢測到的表格單元格

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| document_id | UUID | 關聯文檔 |
| page_index | INTEGER | 頁碼 |
| row_index | INTEGER | 行索引 |
| col_index | INTEGER | 列索引 |
| field_name | VARCHAR(255) | 欄位名稱 |
| field_value | TEXT | 欄位值 |
| position_x | REAL | X 座標 |
| position_y | REAL | Y 座標 |

## 🔍 查詢示例

### 查詢文檔的所有欄位

```sql
SELECT 
  df.field_name,
  df.field_value,
  df.row_index,
  df.col_index
FROM detected_fields df
WHERE df.document_id = 'your-document-id'
ORDER BY df.page_index, df.row_index, df.col_index;
```

### 查詢特定頁面的表格結構

```sql
SELECT 
  ts.rows,
  ts.columns,
  ts.detection_strategy,
  ts.column_boundaries,
  ts.row_boundaries
FROM table_structures ts
WHERE ts.document_id = 'your-document-id'
  AND ts.page_index = 0;
```

### 使用 JSONB 查詢 PDF 元數據

```sql
SELECT 
  id,
  filename,
  raw_data->'Meta'->>'Title' as title,
  raw_data->'Meta'->>'Author' as author,
  jsonb_array_length(raw_data->'Pages') as page_count
FROM pdf_documents
WHERE raw_data->'Meta'->>'Title' ILIKE '%invoice%';
```

### 統計每個文檔的欄位數

```sql
SELECT 
  d.filename,
  d.status,
  COUNT(df.id) as field_count
FROM pdf_documents d
LEFT JOIN detected_fields df ON d.id = df.document_id
GROUP BY d.id, d.filename, d.status
ORDER BY field_count DESC;
```

## 🔧 維護操作

### 備份數據庫

```bash
# PostgreSQL
pg_dump -h localhost -U pdfuser pdfdb > backup.sql

# 恢復
psql -h localhost -U pdfuser pdfdb < backup.sql
```

### 清理舊數據

```sql
-- 刪除 30 天前的處理失敗文檔
DELETE FROM pdf_documents
WHERE status = 'error'
  AND created_at < NOW() - INTERVAL '30 days';
```

### 重建索引

```sql
-- 重建所有索引
REINDEX DATABASE pdfdb;

-- 重建特定表的索引
REINDEX TABLE pdf_documents;
```

### 查看數據庫大小

```sql
SELECT 
  pg_size_pretty(pg_database_size('pdfdb')) as database_size;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔐 安全設置

### 創建只讀用戶

```sql
-- 創建只讀用戶
CREATE USER readonly_user WITH PASSWORD 'readonly_password';

-- 授予連接權限
GRANT CONNECT ON DATABASE pdfdb TO readonly_user;

-- 授予查詢權限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

### 啟用 SSL 連接

```bash
# 連接字符串
DATABASE_URL="postgresql://user:password@localhost:5432/pdfdb?sslmode=require"
```

## 📈 性能優化

### 1. 分析查詢性能

```sql
EXPLAIN ANALYZE
SELECT * FROM detected_fields
WHERE document_id = 'your-id';
```

### 2. 更新統計信息

```sql
ANALYZE pdf_documents;
ANALYZE detected_fields;
```

### 3. 清理死元組

```sql
VACUUM ANALYZE pdf_documents;
```

## 🐛 故障排除

### 連接失敗

```bash
# 檢查 PostgreSQL 是否運行
pg_isready -h localhost -p 5432

# 檢查連接
psql -h localhost -U pdfuser -d pdfdb
```

### 權限問題

```sql
-- 檢查用戶權限
\du

-- 授予所有權限
GRANT ALL PRIVILEGES ON DATABASE pdfdb TO pdfuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pdfuser;
```

### 磁盤空間不足

```sql
-- 清理臨時文件
SELECT pg_ls_tmpdir();

-- 清理 WAL 日誌
SELECT pg_switch_wal();
```

## 📚 相關資源

- [PostgreSQL 官方文檔](https://www.postgresql.org/docs/)
- [JSONB 使用指南](https://www.postgresql.org/docs/current/datatype-json.html)
- [性能調優](https://wiki.postgresql.org/wiki/Performance_Optimization)
