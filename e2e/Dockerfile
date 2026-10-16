# The tag must match @playwright/test in package-lock.json: the image ships the
# browsers for exactly that version, so no `playwright install` step is needed.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY . .
CMD ["npx", "playwright", "test"]
