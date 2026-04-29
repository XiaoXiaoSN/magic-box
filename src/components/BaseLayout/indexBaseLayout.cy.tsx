import { mount } from 'cypress/react';
import { MemoryRouter } from 'react-router-dom';

import BaseLayout from './index';

describe('<BaseLayout />', () => {
  it('renders', () => {
    mount(
      <MemoryRouter>
        <BaseLayout>
          <p data-testid="test">test</p>
        </BaseLayout>
      </MemoryRouter>,
    );

    cy.get('[data-testid="test"]').should('have.text', 'test');

    cy.get('[data-testid="header"]')
      .should('be.visible')
      .should('contain.text', 'Magic Box');
  });
});
