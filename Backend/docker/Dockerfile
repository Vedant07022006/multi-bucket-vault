# ── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first — Docker cache layer for dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production deps from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src/ ./src/
COPY package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# Health check — used by Docker and load balancers
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

CMD ["node", "src/server.js"]
