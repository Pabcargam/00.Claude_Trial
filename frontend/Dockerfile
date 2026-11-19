# syntax=docker/dockerfile:1

# ---- dev: Vite dev server with hot reload -----------------------------------
# The production image (static build served by Nginx) is added in Phase 6.
FROM node:24-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R node:node /app
USER node

EXPOSE 5173
CMD ["npm", "run", "dev"]
