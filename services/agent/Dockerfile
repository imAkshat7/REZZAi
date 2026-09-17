FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY services/agent/package*.json ./services/agent/
WORKDIR /app/services/agent
RUN npm install --omit=dev --legacy-peer-deps

COPY shared /app/shared
COPY services/agent /app/services/agent

EXPOSE 8003
ENV PORT=8003

CMD ["npm", "start"]
