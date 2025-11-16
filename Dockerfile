# PrintCoord - Docker 多�?段�?�?
# ?�於 Node.js 20 Alpine（�??��?�?

# ============================================
# Stage 1: 依賴安�?
# ============================================
FROM node:20-alpine AS deps

# 安�? pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# 設置工�??��?
WORKDIR /app

# 複製依賴?�件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安�??�產依賴（容?�內?��? frozen-lockfile 以兼�?workspace 調整�?
RUN pnpm install --no-frozen-lockfile --prod=false

# ============================================
# Stage 2: 構建?�用
# ============================================
FROM node:20-alpine AS builder

# 安�? pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# �?deps ?�段複製 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 複製源代�?
COPY . .

# 設置?��?變�?
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 構建?�用
RUN pnpm build

# ============================================
# Stage 3: ?�產?��?
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# ?�建??root ?�戶
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 設置?��?變�?
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 複製必�??�件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# ?�改?�?��?
RUN chown -R nextjs:nodejs /app

# ?��??��? root ?�戶
USER nextjs

# ?�露端口
EXPOSE 3000

# ?�康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# ?��??�用
CMD ["node", "server.js"]
