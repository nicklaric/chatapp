// ***********************************************
// Custom commands for Cypress
// ***********************************************

// Example:
// Cypress.Commands.add('login', (email, password) => { ... })

// For more info:
// https://on.cypress.io/custom-commands

// Firebase auth commands
Cypress.Commands.add('loginWithFirebase', (email, password) => {
  cy.log('Simulating Firebase login with:', email);
  // This is a stub - in a real test, you'd use Firebase Auth directly
  // or use a test token approach
});

// Create a new chat room
Cypress.Commands.add('createChatRoom', (options = {}) => {
  cy.log('Creating a new chat room');
  // Click the create chat button
  cy.contains('button', 'Create Chat').click();
  
  // Wait for navigation to the chat room
  cy.url().should('include', '/chat/');
});

// Change chat settings
Cypress.Commands.add('changeChatSettings', (mode) => {
  cy.log(`Changing chat settings to ${mode} mode`);
  
  // Open settings modal
  cy.get('[data-testid="settings-button"]').click();
  
  // Change mode
  cy.get('#chat-mode').select(mode);
  
  // Save
  cy.contains('button', 'Save Settings').click();
}); 