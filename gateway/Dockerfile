FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY gateway/package*.json ./gateway/
WORKDIR /app/gateway
RUN npm install --omit=dev --legacy-peer-deps

COPY shared /app/shared
COPY gateway /app/gateway

EXPOSE 8000
ENV PORT=8000

CMD ["npm", "start"]
