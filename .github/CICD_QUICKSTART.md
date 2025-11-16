# 🚀 CI/CD 快速啟動指南

## ✅ 已完成的設置

### 1. GitHub Actions 工作流

- ✅ `.github/workflows/ci.yml` - 測試和 Lint
- ✅ `.github/workflows/deploy.yml` - 生產部署
- ✅ `.github/workflows/preview.yml` - PR 預覽部署

### 2. 配置文件

- ✅ `package.json` - 添加 CI 腳本
- ✅ `CICD_SETUP.md` - 詳細設置文檔
- ✅ `scripts/setup-vercel.sh` - Vercel 設置腳本

---

## 🎯 下一步操作（3 個步驟）

### 步驟 1: 獲取 Vercel Token

1. 訪問 <https://vercel.com/account/tokens>
2. 點擊 **Create Token**
3. 命名: `PRINTCOORD_GITHUB_ACTIONS`
4. 複製 Token（只顯示一次！）

### 步驟 2: 獲取項目 ID

運行以下命令：

```bash
# Windows PowerShell
cd d:\app\table-template

# 如果還沒安裝 Vercel CLI
pnpm add -g vercel

# 登入並連接項目
vercel login
vercel link

# 查看項目配置
cat .vercel/project.json
```

你會看到：

```json
{
  "orgId": "team_xxxxx",
  "projectId": "prj_xxxxx"
}
```

### 步驟 3: 設置 GitHub Secrets

1. 前往 GitHub 倉庫
2. **Settings** → **Secrets and variables** → **Actions**
3. 添加 3 個 Secrets：

| Name | Value |
|------|-------|
| `VERCEL_TOKEN` | 步驟 1 的 Token |
| `VERCEL_ORG_ID` | `.vercel/project.json` 的 `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` 的 `projectId` |

---

## 🧪 測試 CI/CD

### 測試 CI 流程

```bash
# 創建測試分支
git checkout -b test/cicd

# 做一個小改動
echo "# Test CI/CD" >> TEST.md
git add .
git commit -m "test: CI/CD setup"

# Push 到 GitHub
git push origin test/cicd
```

然後：

1. 前往 GitHub → **Actions** 標籤
2. 查看 "CI - Test & Lint" 工作流
3. 確認所有步驟都通過 ✅

### 測試 Preview 部署

```bash
# 在 GitHub 上創建 Pull Request
# → 自動觸發 Preview 部署
# → 在 PR 評論中查看預覽 URL
```

### 測試生產部署

```bash
# 合併 PR 到 main 分支
# → 自動部署到 https://printcoord.vercel.app
```

---

## 📊 工作流程概覽

```
開發流程:
1. 創建分支 → 2. 開發功能 → 3. Push 到 GitHub
                                      ↓
                              ✅ CI 自動運行
                              - Lint 檢查
                              - 測試運行
                              - 構建驗證
                                      ↓
4. 創建 PR ← ← ← ← ← ← ← ← ← ← ← ← ← ←
      ↓
✅ Preview 自動部署
- 獲得預覽 URL
- 在 PR 中查看
      ↓
5. 審查通過，合併到 main
      ↓
✅ Production 自動部署
- 部署到 printcoord.vercel.app
- 用戶可訪問新版本
```

---

## 🛠️ 本地測試命令

在 Push 之前，可以本地運行這些命令：

```bash
# 完整 CI 流程
pnpm ci

# 單獨運行
pnpm lint          # Lint 檢查
pnpm type-check    # TypeScript 檢查
pnpm test          # 運行測試
pnpm build         # 構建項目
```

---

## 📝 常用命令

```bash
# 開發
pnpm dev              # 啟動開發服務器

# 測試
pnpm test             # 運行測試
pnpm test:watch       # 監聽模式
pnpm test:coverage    # 測試覆蓋率

# 代碼質量
pnpm lint             # Lint 檢查
pnpm lint:fix         # 自動修復
pnpm type-check       # 類型檢查

# CI/CD
pnpm ci               # 完整 CI 流程
pnpm vercel-build     # Vercel 構建

# 部署
vercel                # 部署到預覽環境
vercel --prod         # 部署到生產環境
```

---

## ✅ 檢查清單

設置完成後，確認：

- [ ] GitHub Secrets 已添加（3 個）
- [ ] Push 代碼後 CI 自動運行
- [ ] 創建 PR 後 Preview 自動部署
- [ ] 合併到 main 後 Production 自動部署
- [ ] 所有測試通過
- [ ] Lint 無錯誤
- [ ] 構建成功

---

## 🎉 完成

CI/CD 已設置完成！現在：

1. **每次 Push** → 自動測試和檢查
2. **每個 PR** → 自動預覽部署
3. **合併到 main** → 自動生產部署

專注於開發，讓 CI/CD 處理其餘的事情！🚀

---

## 📚 更多資源

- 詳細設置: [CICD_SETUP.md](./CICD_SETUP.md)
- 徽章設置: [.github/CICD_BADGES.md](./.github/CICD_BADGES.md)
- GitHub Actions: <https://docs.github.com/en/actions>
- Vercel 文檔: <https://vercel.com/docs>
