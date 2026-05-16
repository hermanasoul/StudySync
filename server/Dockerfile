FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование исходников
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]