describe('Учебная сессия (модальное окно)', () => {
  before(() => {
    cy.login('anna@studysync.demo', 'Demo123!');
  });

  it('Открытие модального окна создания сессии', () => {
    cy.visit('/study-sessions');
    // Кликаем по кнопке «Создать» (или аналогичной)
    cy.contains(/создать|новая|добавить/i).click({ force: true });
    // Проверяем, что появилось хотя бы одно текстовое поле внутри модального окна
    cy.get('input[type="text"]:visible, input[name="name"]:visible', { timeout: 5000 })
      .should('exist');
  });
});