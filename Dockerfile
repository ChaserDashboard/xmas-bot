FROM node:20-alpine

RUN apk add --no-cache python3 ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "bot.js"]
