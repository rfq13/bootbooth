FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Ensure optional dependencies are installed to satisfy Rollup's native packages
ENV npm_config_optional=true
RUN npm install --include=optional
# Ensure Rollup native binary package exists for linux-x64-gnu
RUN npm install -D @rollup/rollup-linux-x64-gnu

FROM deps AS build
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_SSE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_SSE_URL=$VITE_SSE_URL
# Force Rollup to skip native binary to avoid optional-deps issues
ENV ROLLUP_SKIP_NATIVE=true
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
RUN adduser --disabled-password --gecos '' appuser
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist-ssr /app/dist-ssr
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:8080 || exit 1
CMD ["node", "dist/server/prod.js"]