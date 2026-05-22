FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm install sodium-native libsodium-wrappers tweetnacl --save

COPY . .

CMD ["node", "bot.js"]
