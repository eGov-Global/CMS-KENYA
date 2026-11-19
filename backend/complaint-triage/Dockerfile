FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY src ./src
COPY scripts/mdms-seed.mjs ./scripts/

ENV PORT=8085
EXPOSE 8085
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8085/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
