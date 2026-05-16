FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование исходников
COPY . .

EXPOSE 3000

CMD ["npm", "start"]