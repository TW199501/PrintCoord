# PrintCoord - Docker å¤šé?æ®µæ?å»?
# ?ºæ–¼ Node.js 20 Alpineï¼ˆè??å?ï¼?

# ============================================
# Stage 1: ä¾è³´å®‰è?
# ============================================
FROM node:20-alpine AS deps

# å®‰è? pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# è¨­ç½®å·¥ä??®é?
WORKDIR /app

# è¤‡è£½ä¾è³´?‡ä»¶
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# å®‰è??Ÿç”¢ä¾è³´ï¼ˆå®¹?¨å…§?¿å? frozen-lockfile ä»¥å…¼å®?workspace èª¿æ•´ï¼?
RUN pnpm install --no-frozen-lockfile --prod=false

# ============================================
# Stage 2: æ§‹å»º?‰ç”¨
# ============================================
FROM node:20-alpine AS builder

# å®‰è? pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# å¾?deps ?Žæ®µè¤‡è£½ node_modules
COPY --from=deps /app/node_modules ./node_modules

# è¤‡è£½æºä»£ç¢?
COPY . .

# è¨­ç½®?°å?è®Šé?
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# æ§‹å»º?‰ç”¨
RUN pnpm build

# ============================================
# Stage 3: ?Ÿç”¢?‹è?
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# ?µå»º??root ?¨æˆ¶
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# è¨­ç½®?°å?è®Šé?
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# è¤‡è£½å¿…è??‡ä»¶
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# ?´æ”¹?€?‰æ?
RUN chown -R nextjs:nodejs /app

# ?‡æ??°é? root ?¨æˆ¶
USER nextjs

# ?´éœ²ç«¯å£
EXPOSE 3000

# ?¥åº·æª¢æŸ¥
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# ?Ÿå??‰ç”¨
CMD ["node", "server.js"]
