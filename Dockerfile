FROM node:20-alpine

RUN apk add --no-cache python3 ffmpeg build-base

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "bot.js"]
