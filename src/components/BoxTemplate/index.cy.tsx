import { mount } from 'cypress/react';
import { LocaleProvider } from '../../contexts/LocaleContext';

import { ShortenURLBoxTemplate } from './index';

describe('<ShortenURLBoxTemplate />', () => {
  it('renders', () => {
    const stubOnClick = cy.stub();

    cy.intercept('POST', '**/api/v1/surl', {
      statusCode: 200,
      body: {
        shorten: 's',
      },
    }).as('shortenUrl');

    mount(
      <LocaleProvider>
        <ShortenURLBoxTemplate
          name="TITLE"
          onClick={stubOnClick}
          options={null}
          plaintextOutput="https://example.com"
        />
      </LocaleProvider>,
    );

    const SHORTEN_URL = 'https://10oz.tw';

    cy.get('[data-testid="shorten-url-action"]').click();
    cy.wait('@shortenUrl');
    cy.get('[data-testid="shorten-url-result"]')
      .contains(new RegExp(`^${SHORTEN_URL}`))
      .click();
    cy.wrap(stubOnClick).should('have.been.called');
  });
});
