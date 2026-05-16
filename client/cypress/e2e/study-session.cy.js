describe('Учебная сессия', () => {
  before(() => {
    cy.login('anna@studysync.demo', 'Demo123!');
  });

  it('Переход на страницу сессий и наличие кнопки создать', () => {
    cy.visit('/study-sessions');
    cy.url().should('include', '/study-sessions');
    // Проверяем, что есть любая кнопка с действием "создать"
    cy.contains(/создать|новая|добавить/i).should('exist');
  });
});
