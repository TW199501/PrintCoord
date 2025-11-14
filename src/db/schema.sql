-- PDF 文檔處理數據庫 Schema
-- 用於存儲 PDF2JSON 解析結果和檢測到的欄位

-- PDF 文檔表
IF OBJECT_ID(N'dbo.pdf_documents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pdf_documents (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        filename NVARCHAR(255) NOT NULL,
        title NVARCHAR(255) NULL,
        author NVARCHAR(255) NULL,
        subject NVARCHAR(255) NULL,
        creator NVARCHAR(255) NULL,
        producer NVARCHAR(255) NULL,
        pdf_format_version NVARCHAR(32) NULL,
        creation_date DATETIME NULL,
        modification_date DATETIME NULL,
        page_count INT NOT NULL,
        status NVARCHAR(32) NOT NULL,
        error_message NVARCHAR(MAX) NULL,
        raw_data NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_pdf_documents_status CHECK (status IN ('pending', 'processing', 'processed', 'error'))
    );
END;

-- 表格結構表
IF OBJECT_ID(N'dbo.table_structures', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.table_structures (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        document_id NVARCHAR(64) NOT NULL,
        table_index INT NOT NULL,
        rows INT NOT NULL,
        columns INT NOT NULL,
        detection_strategy NVARCHAR(64) NOT NULL,
        confidence FLOAT NULL,
        boundaries NVARCHAR(MAX) NOT NULL,
        raw_structure NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_table_structures_document FOREIGN KEY (document_id)
            REFERENCES dbo.pdf_documents(id)
            ON DELETE CASCADE
    );
END;

-- 檢測欄位表
IF OBJECT_ID(N'dbo.detected_fields', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.detected_fields (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        document_id NVARCHAR(64) NOT NULL,
        table_id NVARCHAR(64) NULL,
        field_name NVARCHAR(255) NOT NULL,
        field_value NVARCHAR(MAX) NULL,
        field_type NVARCHAR(32) NOT NULL DEFAULT 'text',
        position_x FLOAT NOT NULL,
        position_y FLOAT NOT NULL,
        width FLOAT NOT NULL,
        height FLOAT NOT NULL,
        confidence FLOAT NULL,
        cell_row INT NULL,
        cell_column INT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_detected_fields_document FOREIGN KEY (document_id)
            REFERENCES dbo.pdf_documents(id)
            ON DELETE CASCADE,
        CONSTRAINT FK_detected_fields_table FOREIGN KEY (table_id)
            REFERENCES dbo.table_structures(id)
            ON DELETE CASCADE
    );
END;

-- 索引
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_pdf_documents_status' AND object_id = OBJECT_ID(N'dbo.pdf_documents')
)
BEGIN
    CREATE INDEX idx_pdf_documents_status ON dbo.pdf_documents(status);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_pdf_documents_created_at' AND object_id = OBJECT_ID(N'dbo.pdf_documents')
)
BEGIN
    CREATE INDEX idx_pdf_documents_created_at ON dbo.pdf_documents(created_at);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_table_structures_document' AND object_id = OBJECT_ID(N'dbo.table_structures')
)
BEGIN
    CREATE INDEX idx_table_structures_document ON dbo.table_structures(document_id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_detected_fields_document' AND object_id = OBJECT_ID(N'dbo.detected_fields')
)
BEGIN
    CREATE INDEX idx_detected_fields_document ON dbo.detected_fields(document_id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_detected_fields_table' AND object_id = OBJECT_ID(N'dbo.detected_fields')
)
BEGIN
    CREATE INDEX idx_detected_fields_table ON dbo.detected_fields(table_id);
END;

-- 觸發器：自動更新 updated_at
IF OBJECT_ID(N'dbo.trg_pdf_documents_update_timestamp', N'TR') IS NULL
BEGIN
    EXEC (
        'CREATE TRIGGER dbo.trg_pdf_documents_update_timestamp ON dbo.pdf_documents AFTER UPDATE AS
        BEGIN
            SET NOCOUNT ON;
            UPDATE d
            SET updated_at = SYSUTCDATETIME()
            FROM dbo.pdf_documents d
            INNER JOIN inserted i ON d.id = i.id;
        END'
    );
END;
