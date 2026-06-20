import { mount } from 'cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../contexts/LocaleContext';

import BaseLayout from './index';

describe('<BaseLayout />', () => {
  it('renders', () => {
    mount(
      <LocaleProvider>
        <MemoryRouter>
          <BaseLayout>
            <p data-testid="test">test</p>
          </BaseLayout>
        </MemoryRouter>
      </LocaleProvider>,
    );

    cy.get('[data-testid="test"]').should('have.text', 'test');

    cy.get('[data-testid="header"]')
      .should('be.visible')
      .should('contain.text', 'Magic Box');
  });
});
