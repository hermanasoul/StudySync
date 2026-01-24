# StudySync API Extensions - Система бейджей и заданий

## Эндпоинты для работы с бейджами

### GET /api/badges/my-badges
Получение бейджей текущего пользователя.

**Ответ:**
```json
{
  "success": true,
  "badges": {
    "displayed": [
      {
        "achievementId": "string",
        "position": 1,
        "name": "string",
        "icon": "string",
        "difficulty": "bronze",
        "difficultyColor": "#cd7f32",
        "points": 100,
        "category": "study"
      }
    ],
    "all": [
      {
        "id": "string",
        "code": "string",
        "name": "string",
        "description": "string",
        "icon": "string",
        "category": "string",
        "difficulty": "bronze",
        "difficultyColor": "#cd7f32",
        "points": 100,
        "unlockedAt": "2024-01-01T00:00:00.000Z",
        "isDisplayed": true
      }
    ],
    "byCategory": {
      "study": [],
      "group": [],
      "flashcard": [],
      "note": [],
      "social": [],
      "system": []
    },
    "stats": {
      "total": 10,
      "displayedCount": 3,
      "byDifficulty": {
        "bronze": 5,
        "silver": 3,
        "gold": 2,
        "platinum": 0
      }
    }
  }
}