FROM node:26-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/pnpm \
    && curl -fsSL https://registry.npmjs.org/pnpm/-/pnpm-12.3.4.tgz | tar -xz --strip-components=1 -C /opt/pnpm \
    && chmod +x /opt/pnpm/bin/pnpm.mjs \
    && ln -s /opt/pnpm/bin/pnpm.mjs /usr/local/bin/pnpm
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/fix-node-pty.js scripts/fix-node-pty.js
RUN --mount=type=cache,target=/pnpm/store pnpm install --store-dir=/pnpm/store --frozen-lockfile

FROM dependencies AS build
COPY server ./server
COPY shared ./shared
COPY scripts/promote-dist-server.mjs ./scripts/promote-dist-server.mjs
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm run build:server

FROM node:26-bookworm-slim AS backend
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git curl python3 ripgrep \
    && rm -rf /var/lib/apt/lists/*
RUN git config --system http.version HTTP/1.1
WORKDIR /app
COPY --from=build --chown=1000:1001 /app/node_modules ./node_modules
COPY --from=build --chown=1000:1001 /app/package.json ./package.json
COPY --from=build --chown=1000:1001 /app/dist-server ./dist-server
COPY --from=build /opt/pnpm /opt/pnpm
RUN ln -s /opt/pnpm/bin/pnpm.mjs /usr/local/bin/pnpm \
    && mkdir -p /home/Treasure && chown 1000:1001 /home/Treasure /app
ENV NODE_ENV=production HOME=/home/Treasure PATH=/app/node_modules/.bin:/usr/local/bin:/usr/bin:/bin
USER 1000:1001
CMD ["node", "dist-server/server/index.js"]
