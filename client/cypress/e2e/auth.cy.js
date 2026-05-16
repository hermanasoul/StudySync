describe('Авторизация', () => {
  it('Вход под демо-пользователем и редирект на дашборд', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('anna@studysync.demo');
    cy.get('input[name="password"]').type('Demo123!');
    cy.get('button[type="submit"]').click();
    // Убедимся, что ушли со страницы логина и попали на дашборд
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/dashboard');
    cy.get('h1, h2, h3').should('exist'); // любая страница дашборда содержит заголовок
  });
});
