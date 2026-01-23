import { mount } from 'cypress/react';

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
      <ShortenURLBoxTemplate
        name="TITLE"
        onClick={stubOnClick}
        options={null}
        plaintextOutput="https://example.com"
      />,
    );

    const SHORTEN_URL = 'https://tool.10oz.tw';

    cy.get('[data-testid="magic-box-result-title"]')
      .should('have.text', 'TITLE');
    cy.wait('@shortenUrl');
    cy.get('[data-testid="magic-box-result-text"]')
      .contains(new RegExp(`^${SHORTEN_URL}`))
      .click();
    cy.wrap(stubOnClick).should('have.been.called');
  });
});
