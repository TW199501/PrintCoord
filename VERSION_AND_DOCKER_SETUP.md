# 🚀 版本管理 + Docker 部署 - 快速指南

## ✅ 已完成的設置

### 1. 自動版本號管理

- ✅ 初始版本: **1.0.0**
- ✅ 每次構建自動 +0.0.1
- ✅ 版本歷史記錄
- ✅ 自動化腳本

### 2. Docker 容器化

- ✅ Dockerfile（多階段構建）
- ✅ docker-compose.yml
- ✅ .dockerignore
- ✅ 健康檢查 API
- ✅ GitHub Container Registry 自動推送

---

## 📦 版本號管理

### 工作原理

```
構建前: 1.0.0
  ↓
pnpm build
  ↓
自動執行: node scripts/bump-version.js
  ↓
構建後: 1.0.1
```

### 使用方法

```bash
# 構建（自動更新版本號）
pnpm build

# 手動更新版本號
pnpm version:bump

# 查看當前版本
cat package.json | grep version

# 查看版本歷史
cat .version-history.json
```

### 版本歷史記錄

每次版本更新都會記錄在 `.version-history.json`:

```json
[
  {
    "version": "1.0.1",
    "timestamp": "2025-11-14T07:00:00.000Z",
    "previousVersion": "1.0.0"
  }
]
```

---

## 🐳 Docker 部署

### 快速啟動（3 種方式）

#### 方式 1: Docker Compose（最簡單）

```bash
# 構建並啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止
docker-compose down
```

#### 方式 2: 快速啟動腳本

```bash
# Linux/Mac
bash scripts/docker-quick-start.sh

# Windows (Git Bash)
bash scripts/docker-quick-start.sh
```

#### 方式 3: Docker 命令

```bash
# 構建
docker build -t printcoord:latest .

# 運行
docker run -d -p 3000:3000 --name printcoord printcoord:latest

# 查看日誌
docker logs -f printcoord
```

### 訪問應用

- **應用**: <http://localhost:3000>
- **健康檢查**: <http://localhost:3000/api/health>

---

## 🔍 健康檢查

### API 響應

```bash
curl http://localhost:3000/api/health
```

```json
{
  "status": "healthy",
  "service": "PrintCoord",
  "version": "1.0.1",
  "timestamp": "2025-11-14T07:00:00.000Z",
  "uptime": 123.456
}
```

### Docker 健康狀態

```bash
# 查看容器狀態
docker ps

# 查看健康檢查詳情
docker inspect printcoord | grep -A 10 Health
```

---

## 🌐 GitHub Container Registry

### 自動構建流程

```
Push 到 main
  ↓
GitHub Actions 觸發
  ↓
構建 Docker 鏡像
  ↓
推送到 ghcr.io
  ↓
自動更新版本號
  ↓
提交版本變更
```

### 拉取鏡像

```bash
# 登入 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 拉取最新版本
docker pull ghcr.io/YOUR_USERNAME/table-template:latest

# 拉取特定版本
docker pull ghcr.io/YOUR_USERNAME/table-template:v1.0.1

# 運行
docker run -d -p 3000:3000 ghcr.io/YOUR_USERNAME/table-template:latest
```

---

## 📁 文件結構

```
table-template/
├── Dockerfile                    # Docker 鏡像定義
├── docker-compose.yml            # Docker Compose 配置
├── .dockerignore                 # Docker 忽略文件
├── next.config.mjs              # Next.js 配置（啟用 standalone）
├── package.json                 # 版本號 + 腳本
├── scripts/
│   ├── bump-version.js          # 版本號管理腳本
│   └── docker-quick-start.sh    # Docker 快速啟動
├── src/app/api/health/
│   └── route.ts                 # 健康檢查 API
└── .github/workflows/
    └── docker.yml               # Docker 自動構建
```

---

## 🛠️ 常用命令

### 版本管理

```bash
pnpm build              # 構建（自動更新版本）
pnpm version:bump       # 手動更新版本
cat package.json        # 查看當前版本
cat .version-history.json  # 查看版本歷史
```

### Docker 本地開發

```bash
# 構建
docker-compose build

# 啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 重啟
docker-compose restart

# 停止
docker-compose down

# 清理
docker-compose down -v
```

### Docker 生產部署

```bash
# 拉取最新鏡像
docker pull ghcr.io/YOUR_USERNAME/table-template:latest

# 停止舊容器
docker stop printcoord
docker rm printcoord

# 啟動新容器
docker run -d \
  --name printcoord \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/YOUR_USERNAME/table-template:latest
```

---

## 🔄 CI/CD 集成

### 完整流程

```
1. 開發代碼
   ↓
2. git push origin main
   ↓
3. GitHub Actions 觸發
   ↓
4. 運行測試 (CI)
   ↓
5. 構建 Docker 鏡像
   ↓
6. 推送到 ghcr.io
   ↓
7. 自動更新版本號
   ↓
8. 部署到 Vercel (可選)
```

### GitHub Actions 工作流

- **ci.yml** - 測試和 Lint
- **deploy.yml** - Vercel 部署
- **preview.yml** - PR 預覽
- **docker.yml** - Docker 構建和推送

---

## 📊 版本號策略

### 語義化版本

```
主版本.次版本.修訂號
  1   .  0   .  1

主版本: 重大變更（手動更新）
次版本: 新功能（手動更新）
修訂號: Bug 修復（自動更新）
```

### 當前策略

- **自動更新**: 修訂號（patch）+1
- **手動更新**: 主版本和次版本

### 未來擴展

可以修改 `scripts/bump-version.js` 支持：

- 主版本更新: `pnpm version:major`
- 次版本更新: `pnpm version:minor`
- 修訂版本更新: `pnpm version:patch`（當前默認）

---

## 🎯 最佳實踐

### 1. 版本管理

- ✅ 每次構建自動更新
- ✅ 保留版本歷史
- ✅ Git tag 標記重要版本

### 2. Docker 部署

- ✅ 使用多階段構建
- ✅ 非 root 用戶運行
- ✅ 健康檢查機制
- ✅ 資源限制

### 3. 安全性

- ✅ 最小化鏡像大小
- ✅ 定期更新基礎鏡像
- ✅ 掃描安全漏洞

---

## ✅ 檢查清單

部署前確認：

- [ ] 版本號從 1.0.0 開始
- [ ] 構建後版本號自動更新
- [ ] Docker 鏡像構建成功
- [ ] 健康檢查 API 正常
- [ ] Docker Compose 啟動成功
- [ ] GitHub Actions 工作流配置完成

---

## 📚 相關文檔

- **詳細 Docker 指南**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **CI/CD 設置**: [CICD_SETUP.md](./CICD_SETUP.md)
- **快速開始**: [CICD_QUICKSTART.md](./CICD_QUICKSTART.md)

---

## 🚀 立即開始

```bash
# 1. 構建並啟動
docker-compose up -d

# 2. 查看版本
curl http://localhost:3000/api/health | jq .version

# 3. 訪問應用
open http://localhost:3000
```

**PrintCoord** - 版本管理自動化，Docker 部署簡單化！🎉
