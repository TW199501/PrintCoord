# PrintCoord - Docker 多階段構建
# 基於 Node.js 20 Alpine（輕量化）

# ============================================
# Stage 1: 依賴安裝
# ============================================
FROM node:20-alpine AS deps

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# 設置工作目錄
WORKDIR /app

# 複製依賴文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安裝生產依賴（容器內避免 frozen-lockfile 以兼容 workspace 調整）
RUN pnpm install --no-frozen-lockfile --prod=false

# ============================================
# Stage 2: 構建應用
# ============================================
FROM node:20-alpine AS builder

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# 從 deps 階段複製 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 複製源代碼
COPY . .

# 設置環境變量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 構建應用
RUN pnpm build

# ============================================
# Stage 3: 生產運行
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 創建非 root 用戶
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 設置環境變量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 複製必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# 更改所有權
RUN chown -R nextjs:nodejs /app

# 切換到非 root 用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用
CMD ["node", "server.js"]
