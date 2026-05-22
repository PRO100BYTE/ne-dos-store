FROM node:20-alpine AS builder
WORKDIR /app
# Install build dependencies for better-sqlite3 on Alpine
RUN apk add --no-cache python3 make g++ 
COPY package*.json ./
RUN npm ci
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Install build dependencies for better-sqlite3 runtime
RUN apk add --no-cache python3 make g++
RUN npm ci --omit=dev
COPY server ./server
COPY --from=builder /app/build ./build
EXPOSE 8787
CMD ["node", "server/index.js"]
