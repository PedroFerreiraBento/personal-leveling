FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN sh -c 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'
COPY . .
# Build-time arg for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
# Static files
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx config will be mounted via volume in docker-compose
