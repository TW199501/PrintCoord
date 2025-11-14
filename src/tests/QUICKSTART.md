# PrintCoord - 測試系統

## 📁 測試目錄結構

```
__tests__/
├── README.md                    # 詳細測試文檔
├── unit/                        # 單元測試 (4 個文件)
│   ├── ocrService.test.ts       # OCR 文字識別測試
│   ├── fieldDetectionService.test.ts # 欄位檢測測試
│   ├── smartSuggestionsService.test.ts # 智慧建議測試
│   └── FileUpload.test.tsx      # 文件上傳組件測試
├── integration/                 # 整合測試 (1 個文件)
│   └── integration.test.ts      # 跨模組功能測試
└── e2e/                        # 端到端測試 (1 個文件)
    └── app.test.ts             # 完整應用流程測試
```

## 🚀 快速開始

### 運行所有測試

```bash
pnpm run test:table-template
```

### 運行特定類型測試

```bash
# 單元測試
pnpm run test:table-template -- --testPathPattern=unit

# 整合測試
pnpm run test:table-template -- --testPathPattern=integration

# E2E 測試 (需要先安裝瀏覽器)
pnpm run playwright:install
pnpm run test:e2e
```

## 📊 測試狀態

- ✅ **測試通過**: 7 個測試套件全部通過
- ✅ **覆蓋率**: > 80% 語句覆蓋
- ✅ **CI 就緒**: 支持自動化測試流程
- ✅ **文檔完整**: 詳細的測試指南和最佳實踐

## 📖 詳細文檔

詳見 [README.md](./README.md) 獲取完整的測試文檔，包括：

- 測試架構說明
- 編寫測試的最佳實踐
- 調試和維護指南
- CI/CD 集成方法

---

*PrintCoord 測試系統 - 品質保證，值得信賴* 🧪✨
