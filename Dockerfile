# ---- build stage: install deps + build the client ----
FROM node:20-alpine AS build
WORKDIR /app

# Install with the workspace manifests first for better layer caching.
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install

# Copy sources and build the client bundle.
COPY . .
RUN npm run build

# ---- runtime stage: slim image running the server ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install only the server's production dependencies (express).
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev

# Server code + built client.
COPY server ./server
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/index.js"]
