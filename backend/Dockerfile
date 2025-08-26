FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN sh -c 'if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi'

FROM node:18-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm","start"]
