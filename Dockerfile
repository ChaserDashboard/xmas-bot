FROM node:20
RUN apt-get update && apt-get install -y python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts=false
RUN npm install sodium-native --build-from-source || true
RUN npm install libsodium-wrappers tweetnacl
COPY . .
CMD ["node", "bot.js"]
