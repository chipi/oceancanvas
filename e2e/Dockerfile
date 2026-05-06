FROM mcr.microsoft.com/playwright:v1.42.0-jammy
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
RUN npx playwright install chromium
COPY . .
CMD ["npx", "playwright", "test"]
