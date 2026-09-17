FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY services/chat/package*.json ./services/chat/
WORKDIR /app/services/chat
RUN npm install --omit=dev --legacy-peer-deps

COPY shared /app/shared
COPY services/chat /app/services/chat

EXPOSE 8002
ENV PORT=8002

CMD ["npm", "start"]
