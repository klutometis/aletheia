# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Multi-stage build for Next.js on Cloud Run
FROM node:alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Use npm install (npm ci has persistent bugs in Alpine)
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Accept API key as build argument
ARG GOOGLE_API_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js with standalone output for minimal image
# Skip ESLint during Docker builds (lint separately in CI/CD)
ENV ESLINT_IGNORE_DURING_BUILDS=1
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY}
RUN npm run build

# Production image - minimal and fast
FROM base AS runner
WORKDIR /app

# Accept API key as build argument for runtime
ARG GOOGLE_API_KEY

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
