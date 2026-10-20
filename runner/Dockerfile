# Official testing image; no host browser or credentials are mounted.
FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-fund --no-audit
COPY src ./src
COPY scripts ./scripts
COPY fixtures ./fixtures
USER pwuser
CMD ["node", "scripts/isolation-proof.js"]
