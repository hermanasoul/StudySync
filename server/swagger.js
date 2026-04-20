// server/swagger.js

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudySync API',
      version: '1.0.0',
      description: 'API документация для сервиса совместной учёбы StudySync',
      contact: {
        name: 'StudySync Team',
        email: 'support@studysync.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Локальный сервер разработки'
      },
      {
        url: 'https://api.studysync.com/api',
        description: 'Продакшн сервер'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // Базовые модели для учебных сессий
        StudySession: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID сессии' },
            name: { type: 'string', description: 'Название сессии' },
            description: { type: 'string', description: 'Описание' },
            host: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                avatarUrl: { type: 'string' },
                level: { type: 'number' }
              }
            },
            subjectId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                icon: { type: 'string' }
              }
            },
            groupId: {
              type: 'object',
              nullable: true,
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' }
              }
            },
            accessType: {
              type: 'string',
              enum: ['public', 'friends', 'private']
            },
            studyMode: {
              type: 'string',
              enum: ['collaborative', 'individual', 'host-controlled']
            },
            status: {
              type: 'string',
              enum: ['waiting', 'active', 'paused', 'completed']
            },
            participantCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'StudySessions', description: 'Управление учебными сессиями' },
      { name: 'Achievements', description: 'Достижения пользователей' },
      { name: 'Auth', description: 'Аутентификация' }
    ]
  },
  apis: [
    './server/routes/*.js',   // все файлы маршрутов
    './server/models/*.js'    // модели для схем (если аннотированы)
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;