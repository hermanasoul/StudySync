# StudySync

Сервис для совместной учёбы и подготовки к экзаменам/зачётам.

## Возможности

- Создание групп по предметам
- Совместные заметки и файлы
- Флеш-карточки для запоминания
- Мини-тесты для самопроверки
- Отслеживание прогресса по темам

## Технологии

- **Frontend:** React, TailwindCSS, React Router
- **Backend:** Node.js, Express.js, MongoDB
- **Аутентификация:** JWT

## Установка и запуск

### Предварительные требования
- Node.js (версия 16 или выше)
- MongoDB (локально или MongoDB Atlas)

### Запуск в разработке

1. Клонируйте репозиторий:
```bash
git clone https://github.com/hermanasoul/StudySync.git
cd StudySync

2. Установите зависимости всего проекта:
\`\`\`bash
npm run install-all
\`\`\`

3. Запустите оба приложения (бэкенд и фронтенд):
\`\`\`bash
npm run dev
\`\`\`

Или запускайте отдельно:

**Бэкенд:**
\`\`\`bash
npm run server
\`\`\`

**Фронтенд:**
\`\`\`bash
npm run client
\`\`\`

Приложение будет доступно:
- Фронтенд: http://localhost:3000
- Бэкенд: http://localhost:5000

## Структура проекта

\`\`\`
StudySync/
├── client/          # React фронтенд
├── server/          # Node.js бэкенд
├── .gitignore
├── LICENSE
├── package.json
└── README.md
\`\`\`

## Команда разработки

- maqfer - Backend-разработка
- hermanasoul - Frontend-разработка