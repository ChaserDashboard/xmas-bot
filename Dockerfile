FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install sodium-native --build-from-source || npm install libsodium-wrappers
COPY . .
CMD ["node", "bot.js"]
