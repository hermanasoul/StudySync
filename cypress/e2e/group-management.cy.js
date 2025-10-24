// E2E тесты для управления группами (наборы данных: valid/invalid, сценарии: login, create, join, display)

describe('Управление группами', () => {
  const validUser = { email: 'ivan@example.com', password: 'Pass123!' };
  const validCode = 'ABC123';
  const invalidCode = 'INVALID';

  beforeEach(() => {
    cy.visit('http://localhost:3000/'); // Главная страница
  });

  it('Загружает главную страницу (smoke test)', () => {
    cy.title().should('include', 'StudySync'); // Или твой название страницы
    cy.contains('Войти').should('be.visible'); // Кнопка логина на главной (настрой текст)
  });

  it('Успешный логин', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(validUser.email);
    cy.get('input[type="password"]').type(validUser.password);
    cy.get('button[type="submit"]').click(); // Или .contains('Войти').click()
    cy.wait(1000); // Подожди редирект
    cy.url().should('include', '/dashboard');
  });

  it('Логин с ошибкой (invalid данные)', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('invalid@example');
    cy.get('input[type="password"]').type('123');
    cy.get('button[type="submit"]').click();
    cy.wait(500);
    cy.contains('Ошибка').should('be.visible'); // Текст ошибки (настрой под UI)
  });

  it('Создание группы (valid)', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(validUser.email);
    cy.get('input[type="password"]').type(validUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);

    cy.visit('/groups');
    cy.contains('Создать группу').click();
    cy.get('input[type="text"]').first().type('Test Group'); // Первое текстовое поле
    cy.get('select').first().select('Биология'); // Поле для предмета (если есть)
    cy.contains('Создать').click();
    cy.wait(1000);
    cy.contains('Создана').should('be.visible'); // Успех (настрой)
  });

  it('Присоединение с valid кодом', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(validUser.email);
    cy.get('input[type="password"]').type(validUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);

    cy.visit('/groups');
    cy.contains('Присоединиться').click();
    cy.get('input[type="text"]').type(validCode);
    cy.contains('Присоединиться').click();
    cy.wait(1000);
    cy.contains('Успешно').should('be.visible');
  });

  it('Присоединение с invalid кодом (error)', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(validUser.email);
    cy.get('input[type="password"]').type(validUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);

    cy.visit('/groups');
    cy.contains('Присоединиться').click();
    cy.get('input[type="text"]').type(invalidCode);
    cy.contains('Присоединиться').click();
    cy.wait(1000);
    cy.contains('Неверный').should('be.visible'); // Ошибка
  });

  it('Отображение страницы группы', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(validUser.email);
    cy.get('input[type="password"]').type(validUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);

    cy.visit('/groups/g1'); // g1 — пример ID, смени на реальный
    cy.contains('Группа').should('be.visible'); // Заголовок
    cy.contains('участник').should('be.visible'); // Число
  });
});