FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json for each workspace package we need
COPY packages/voice/package.json packages/voice/
COPY packages/core/package.json packages/core/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @ai-receptionist/voice...

# Copy source files
COPY packages/types/ packages/types/
COPY packages/core/ packages/core/
COPY packages/config/ packages/config/
COPY packages/voice/ packages/voice/

# Build
WORKDIR /app/packages/voice
RUN pnpm build

# Run as non-root user
RUN addgroup --system voice && adduser --system --ingroup voice voice
USER voice

EXPOSE 8080
CMD ["node", "dist/index.js"]
