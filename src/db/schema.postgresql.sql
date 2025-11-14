-- PDF 文檔處理數據庫 Schema (PostgreSQL)
-- 用於存儲 PDF2JSON 解析結果和檢測到的欄位

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PDF 文檔表
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    author VARCHAR(255),
    subject VARCHAR(500),
    creator VARCHAR(255),
    producer VARCHAR(255),
    pdf_format_version VARCHAR(10),
    creation_date TIMESTAMP,
    modification_date TIMESTAMP,
    page_count INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK(status IN ('pending', 'processing', 'processed', 'error')),
    error_message TEXT,
    raw_data JSONB NOT NULL, -- 使用 JSONB 存儲 PDF2JSON 輸出
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 表格結構表
CREATE TABLE IF NOT EXISTS table_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL,
    rows INTEGER NOT NULL,
    columns INTEGER NOT NULL,
    detection_strategy VARCHAR(20) NOT NULL CHECK(detection_strategy IN ('fills', 'lines', 'text')),
    horizontal_lines INTEGER DEFAULT 0,
    vertical_lines INTEGER DEFAULT 0,
    column_boundaries JSONB, -- JSON array of numbers
    row_boundaries JSONB,    -- JSON array of numbers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_document_page UNIQUE (document_id, page_index)
);

-- 檢測欄位表
CREATE TABLE IF NOT EXISTS detected_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    table_structure_id UUID REFERENCES table_structures(id) ON DELETE SET NULL,
    page_index INTEGER NOT NULL,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    field_type VARCHAR(50) NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    confidence REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pdf_documents_status ON pdf_documents(status);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_created_at ON pdf_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_filename ON pdf_documents(filename);
CREATE INDEX IF NOT EXISTS idx_table_structures_document ON table_structures(document_id);
CREATE INDEX IF NOT EXISTS idx_detected_fields_document ON detected_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_detected_fields_table ON detected_fields(table_structure_id);
CREATE INDEX IF NOT EXISTS idx_detected_fields_page ON detected_fields(page_index);
CREATE INDEX IF NOT EXISTS idx_detected_fields_position ON detected_fields(document_id, page_index, row_index, col_index);

-- JSONB 索引（用於快速查詢 raw_data）
CREATE INDEX IF NOT EXISTS idx_pdf_documents_raw_data ON pdf_documents USING GIN (raw_data);

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pdf_documents_updated_at
    BEFORE UPDATE ON pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 視圖：文檔統計
CREATE OR REPLACE VIEW document_statistics AS
SELECT 
    d.id,
    d.filename,
    d.status,
    d.page_count,
    COUNT(DISTINCT ts.id) as table_count,
    COUNT(df.id) as field_count,
    d.created_at
FROM pdf_documents d
LEFT JOIN table_structures ts ON d.id = ts.document_id
LEFT JOIN detected_fields df ON d.id = df.document_id
GROUP BY d.id, d.filename, d.status, d.page_count, d.created_at;

-- 註釋
COMMENT ON TABLE pdf_documents IS 'PDF 文檔主表，存儲文檔元數據和完整的 PDF2JSON 輸出';
COMMENT ON TABLE table_structures IS '表格結構表，記錄每頁的表格網格信息';
COMMENT ON TABLE detected_fields IS '檢測欄位表，存儲所有檢測到的表格單元格';
COMMENT ON COLUMN pdf_documents.raw_data IS '完整的 PDF2JSON 輸出，使用 JSONB 格式存儲';
COMMENT ON COLUMN table_structures.detection_strategy IS '檢測策略：fills（填充線條）、lines（HLines/VLines）、text（文字位置）';
