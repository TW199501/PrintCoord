# 🐳 PrintCoord Docker 部署指南

## 📋 概述

PrintCoord 支持完整的 Docker 容器化部署，包括：

- ✅ 多階段構建優化
- ✅ 自動版本號管理（每次構建 +0.0.1）
- ✅ 健康檢查
- ✅ 非 root 用戶運行
- ✅ GitHub Container Registry 自動推送

---

## 🚀 快速開始

### 方式 1: 使用 Docker Compose（推薦）

```bash
# 構建並啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止
docker-compose down
```

訪問: <http://localhost:3000>

### 方式 2: 使用 Docker 命令

```bash
# 構建鏡像
docker build -t printcoord:latest .

# 運行容器
docker run -d \
  --name printcoord \
  -p 3000:3000 \
  --restart unless-stopped \
  printcoord:latest

# 查看日誌
docker logs -f printcoord

# 停止容器
docker stop printcoord
docker rm printcoord
```

---

## 📦 版本號管理

### 自動版本號遞增

每次成功構建後，版本號自動 +0.0.1：

```bash
# 當前版本: 1.0.0
pnpm build
# 構建後版本: 1.0.1

pnpm build
# 構建後版本: 1.0.2
```

### 手動更新版本號

```bash
# 手動增加版本號
pnpm version:bump

# 查看版本歷史
cat .version-history.json
```

### 版本號規則

- **初始版本**: 1.0.0
- **每次構建**: patch +1 (例如: 1.0.0 → 1.0.1)
- **手動更新**: 使用 `pnpm version:bump`

---

## 🏗️ Docker 鏡像結構

### 多階段構建

```dockerfile
Stage 1: deps     → 安裝依賴
Stage 2: builder  → 構建應用
Stage 3: runner   → 生產運行
```

### 鏡像大小優化

- 基於 `node:20-alpine`（輕量化）
- 多階段構建減少最終鏡像大小
- 僅包含生產依賴和構建產物

### 安全特性

- ✅ 非 root 用戶運行（nextjs:1001）
- ✅ 最小化攻擊面
- ✅ 健康檢查機制

---

## 🔍 健康檢查

### API 端點

```bash
# 檢查應用健康狀態
curl http://localhost:3000/api/health
```

響應示例：

```json
{
  "status": "healthy",
  "service": "PrintCoord",
  "version": "1.0.1",
  "timestamp": "2025-11-14T07:00:00.000Z",
  "uptime": 123.456
}
```

### Docker 健康檢查

```bash
# 查看容器健康狀態
docker ps

# 查看健康檢查日誌
docker inspect --format='{{json .State.Health}}' printcoord
```

---

## 🌐 GitHub Container Registry

### 自動構建和推送

每次 Push 到 `main` 分支時：

1. ✅ 自動構建 Docker 鏡像
2. ✅ 推送到 GitHub Container Registry
3. ✅ 自動更新版本號
4. ✅ 支持多平台（amd64, arm64）

### 拉取鏡像

```bash
# 登入 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 拉取最新鏡像
docker pull ghcr.io/YOUR_USERNAME/table-template:latest

# 拉取特定版本
docker pull ghcr.io/YOUR_USERNAME/table-template:v1.0.1

# 運行
docker run -d -p 3000:3000 ghcr.io/YOUR_USERNAME/table-template:latest
```

---

## 🛠️ 環境變量

### 可配置環境變量

```bash
# docker-compose.yml 或 docker run
environment:
  - NODE_ENV=production
  - PORT=3000
  - NEXT_PUBLIC_API_URL=https://api.example.com
```

### 生產環境配置

創建 `.env.production`:

```env
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

---

## 📊 監控和日誌

### 查看日誌

```bash
# Docker Compose
docker-compose logs -f printcoord

# Docker
docker logs -f printcoord

# 只看最近 100 行
docker logs --tail 100 printcoord
```

### 容器統計

```bash
# 實時統計
docker stats printcoord

# 查看資源使用
docker inspect printcoord
```

---

## 🔄 更新部署

### 更新到新版本

```bash
# 1. 拉取最新代碼
git pull origin main

# 2. 重新構建
docker-compose build

# 3. 重啟容器
docker-compose up -d

# 4. 查看新版本
curl http://localhost:3000/api/health | jq .version
```

### 零停機更新

```bash
# 使用 Docker Compose 滾動更新
docker-compose up -d --no-deps --build printcoord
```

---

## 🐛 故障排除

### 容器無法啟動

```bash
# 查看詳細日誌
docker logs printcoord

# 檢查容器狀態
docker ps -a

# 進入容器調試
docker exec -it printcoord sh
```

### 健康檢查失敗

```bash
# 檢查健康檢查配置
docker inspect printcoord | grep -A 10 Health

# 手動測試健康檢查
docker exec printcoord node -e "require('http').get('http://localhost:3000/api/health', (r) => console.log(r.statusCode))"
```

### 構建失敗

```bash
# 清理構建緩存
docker builder prune

# 重新構建（無緩存）
docker build --no-cache -t printcoord:latest .
```

---

## 📝 最佳實踐

### 1. 使用版本標籤

```bash
# 不要只用 latest
docker tag printcoord:latest printcoord:1.0.1

# 推送多個標籤
docker push printcoord:1.0.1
docker push printcoord:latest
```

### 2. 資源限制

```yaml
# docker-compose.yml
services:
  printcoord:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. 持久化數據

```yaml
# docker-compose.yml
services:
  printcoord:
    volumes:
      - ./data:/app/data
```

---

## 🚀 生產部署

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: printcoord
spec:
  replicas: 3
  selector:
    matchLabels:
      app: printcoord
  template:
    metadata:
      labels:
        app: printcoord
    spec:
      containers:
      - name: printcoord
        image: ghcr.io/YOUR_USERNAME/table-template:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Docker Swarm 部署

```bash
# 初始化 Swarm
docker swarm init

# 部署服務
docker stack deploy -c docker-compose.yml printcoord

# 查看服務
docker service ls
docker service logs printcoord_printcoord
```

---

## ✅ 檢查清單

部署前確認：

- [ ] Dockerfile 已創建
- [ ] .dockerignore 已配置
- [ ] docker-compose.yml 已設置
- [ ] next.config.mjs 啟用 standalone 輸出
- [ ] 健康檢查 API 已實現
- [ ] 版本號管理腳本已配置
- [ ] GitHub Actions 工作流已設置

---

## 📞 支持

遇到問題？

1. 查看日誌: `docker logs printcoord`
2. 檢查健康狀態: `curl http://localhost:3000/api/health`
3. 查看 [Docker 文檔](https://docs.docker.com/)
4. 查看項目 Issues

---

**PrintCoord Docker 部署** - 容器化、可擴展、易維護！🐳
