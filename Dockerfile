# Multi-stage build for Dokploy (Docker-container hosting, not serverless).
# Produces a minimal runtime image around Next.js's `output: standalone` build.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Default env is fixture+recorded — the image must build and run with zero keys.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output traces `require`/`import` dependencies but can't see the
# runtime `readFileSync(process.cwd(), "fixtures"/"prompts", ...)` calls in
# registry.ts/prompts.ts — copy those directories explicitly instead of
# relying on Next's file tracer to find them.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/fixtures ./fixtures
COPY --from=builder /app/prompts ./prompts

EXPOSE 3000
CMD ["node", "server.js"]
