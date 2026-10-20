# Official testing image; no host browser or credentials are mounted.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-fund --no-audit
COPY src ./src
COPY scripts ./scripts
COPY fixtures ./fixtures
USER pwuser
CMD ["node", "scripts/isolation-proof.js"]
