FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY gateway/package*.json ./gateway/
COPY services/auth/package*.json ./services/auth/
COPY services/chat/package*.json ./services/chat/
COPY services/agent/package*.json ./services/agent/

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
