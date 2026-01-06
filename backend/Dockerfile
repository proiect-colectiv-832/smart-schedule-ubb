# backend/Dockerfile

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Important: avoid running postinstall inside this layer (it runs "npm run build")
RUN npm ci --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install prod deps only (and still ignore scripts to avoid postinstall build here)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
