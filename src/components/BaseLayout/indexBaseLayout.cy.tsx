import { mount } from 'cypress/react';
import React from 'react';

import BaseLayout from './index';

describe('<BaseLayout />', () => {
  it('renders', () => {
    mount(
      <BaseLayout>
        <p data-testid="test">test</p>
      </BaseLayout>,
    );

    cy.get('[data-testid="test"]').should('have.text', 'test');

    cy.get('[data-testid="header"]')
      .should('be.visible')
      .should('have.text', 'Magic Box');
    cy.get('[data-testid="footer"]').should(
      'have.text',
      `© ${new Date().getFullYear()} Copyright: All Rights Not Reserved`,
    );
  });
});
