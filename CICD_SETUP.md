# PrintCoord CI/CD 設置指南

## 🚀 概述

本項目使用 GitHub Actions + Vercel 實現完整的 CI/CD 流程。

---

## 📋 工作流程

### 1. **CI - 測試和 Lint** (`.github/workflows/ci.yml`)

- **觸發**: Push 到 `main` 或 `develop` 分支，或 PR
- **執行**:
  - ✅ ESLint 檢查
  - ✅ TypeScript 類型檢查
  - ✅ 運行測試
  - ✅ 構建項目
- **矩陣測試**: Node.js 18.x 和 20.x

### 2. **Deploy - 生產部署** (`.github/workflows/deploy.yml`)

- **觸發**: Push 到 `main` 分支
- **執行**:
  - ✅ 運行測試
  - ✅ 構建項目
  - ✅ 部署到 Vercel Production
- **URL**: <https://printcoord.vercel.app>

### 3. **Preview - 預覽部署** (`.github/workflows/preview.yml`)

- **觸發**: 創建或更新 Pull Request
- **執行**:
  - ✅ 運行測試
  - ✅ 構建項目
  - ✅ 部署到 Vercel Preview
  - ✅ 在 PR 中評論預覽 URL

---

## ⚙️ 設置步驟

### 步驟 1: 獲取 Vercel Token

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊右上角頭像 → **Settings**
3. 左側選單 → **Tokens**
4. 點擊 **Create Token**
5. 命名為 `PRINTCOORD_GITHUB_ACTIONS`
6. 選擇 Scope（建議選擇特定項目）
7. 複製生成的 Token（只會顯示一次！）

### 步驟 2: 獲取 Vercel 項目 ID

在項目根目錄運行：

```bash
# 安裝 Vercel CLI（如果還沒安裝）
pnpm add -g vercel

# 登入 Vercel
vercel login

# 連接項目
vercel link

# 查看項目設置
cat .vercel/project.json
```

你會看到類似這樣的內容：

```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

### 步驟 3: 設置 GitHub Secrets

1. 前往 GitHub 倉庫
2. **Settings** → **Secrets and variables** → **Actions**
3. 點擊 **New repository secret**
4. 添加以下 Secrets：

| Secret Name | Value | 說明 |
|------------|-------|------|
| `VERCEL_TOKEN` | 步驟 1 獲取的 Token | Vercel API Token |
| `VERCEL_ORG_ID` | `.vercel/project.json` 中的 `orgId` | Vercel 組織 ID |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` 中的 `projectId` | Vercel 項目 ID |

### 步驟 4: 驗證設置

1. 創建一個新分支並做些修改
2. Push 到 GitHub
3. 檢查 **Actions** 標籤，確認工作流正在運行
4. 創建 Pull Request，檢查預覽部署

---

## 🔄 工作流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                     開發者 Push 代碼                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  GitHub Actions  │
                    └─────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │   Lint   │  │   Test   │  │  Build   │
         └──────────┘  └──────────┘  └──────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Main Branch  │    │  PR Branch   │
            │   Deploy     │    │   Preview    │
            │  Production  │    │   Deploy     │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
         printcoord.vercel.app    preview-xxx.vercel.app
```

---

## 📝 使用範例

### 開發新功能

```bash
# 1. 創建新分支
git checkout -b feature/new-feature

# 2. 開發並提交
git add .
git commit -m "feat: add new feature"

# 3. Push 到 GitHub
git push origin feature/new-feature

# 4. 創建 Pull Request
# → CI 自動運行測試
# → Preview 自動部署
# → 在 PR 中查看預覽 URL

# 5. 合併到 main
# → 自動部署到生產環境
```

### 熱修復

```bash
# 1. 創建熱修復分支
git checkout -b hotfix/critical-bug

# 2. 修復並測試
git add .
git commit -m "fix: critical bug"

# 3. Push 並創建 PR
git push origin hotfix/critical-bug

# 4. 審查通過後合併
# → 自動部署到生產
```

---

## 🛡️ 分支保護規則（建議）

在 GitHub 設置分支保護：

1. **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main`
3. 啟用以下選項：
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - 選擇: `Test & Lint`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

---

## 🔍 監控和調試

### 查看工作流狀態

1. GitHub 倉庫 → **Actions** 標籤
2. 選擇特定工作流查看詳細日誌
3. 點擊失敗的步驟查看錯誤信息

### 常見問題

#### 1. Vercel 部署失敗

```bash
# 檢查 Secrets 是否正確設置
# 確認 VERCEL_TOKEN 有效
# 檢查 VERCEL_PROJECT_ID 是否正確
```

#### 2. 測試失敗

```bash
# 本地運行測試
pnpm test

# 檢查測試覆蓋率
pnpm test:coverage
```

#### 3. Lint 錯誤

```bash
# 本地運行 lint
pnpm lint

# 自動修復
pnpm lint --fix
```

---

## 📊 狀態徽章

在 `README.md` 中添加狀態徽章：

```markdown
![CI](https://github.com/YOUR_USERNAME/table-template/workflows/CI%20-%20Test%20%26%20Lint/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/table-template/workflows/Deploy%20to%20Vercel/badge.svg)
```

---

## 🚀 進階配置

### 1. 添加代碼覆蓋率報告

在 `ci.yml` 中添加：

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
```

### 2. 添加性能測試

```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://printcoord.vercel.app
    uploadArtifacts: true
```

### 3. 添加安全掃描

```yaml
- name: Run security audit
  run: pnpm audit --audit-level=moderate
```

---

## ✅ 檢查清單

部署前確認：

- [ ] GitHub Secrets 已設置
  - [ ] VERCEL_TOKEN
  - [ ] VERCEL_ORG_ID
  - [ ] VERCEL_PROJECT_ID
- [ ] 所有測試通過
- [ ] Lint 無錯誤
- [ ] TypeScript 編譯成功
- [ ] 分支保護規則已設置
- [ ] README 已更新狀態徽章

---

## 📞 支持

遇到問題？

1. 檢查 [GitHub Actions 文檔](https://docs.github.com/en/actions)
2. 查看 [Vercel 部署文檔](https://vercel.com/docs)
3. 查看項目 Issues

---

**PrintCoord CI/CD** - 自動化部署，專注開發！🚀
