FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY services/auth/package*.json ./services/auth/
WORKDIR /app/services/auth
RUN npm install --omit=dev --legacy-peer-deps

COPY shared /app/shared
COPY services/auth /app/services/auth

EXPOSE 8001
ENV PORT=8001

CMD ["npm", "start"]
