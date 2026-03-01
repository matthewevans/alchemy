import './commands';

Cypress.on('window:before:load', (win) => {
  (win as Window & { __CYPRESS?: boolean }).__CYPRESS = true;
});
