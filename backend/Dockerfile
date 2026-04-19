# ── Stage 1: Install production dependencies ────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && apk add --no-cache su-exec

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data \
  && chmod +x /usr/local/bin/docker-entrypoint.sh \
  && chown -R appuser:appgroup /app/data

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/data/leave_tracker.db

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
