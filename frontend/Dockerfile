FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
ENV NODE_OPTIONS=--max-old-space-size=256
RUN sh -c 'if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi'
COPY . .
# Build-time arg for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
# Static files
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx config will be mounted via volume in docker-compose
