FROM node:20
RUN apt-get update && apt-get install -y python3 make g++ libsodium-dev
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install libsodium-wrappers tweetnacl
COPY . .
CMD ["node", "bot.js"]
