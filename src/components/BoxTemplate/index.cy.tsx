import React from 'react';

import { mount } from 'cypress/react';

import { ShortenURLBoxTemplate } from './index';

describe('<ShortenURLBoxTemplate />', () => {
  it('renders', () => {
    const stubOnClick = cy.stub();

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
    cy.get('[data-testid="magic-box-result-text"]')
      .wait(3000)
      .contains(new RegExp(`^${SHORTEN_URL}`))
      .click();
    cy.wrap(stubOnClick).should('have.been.called');
  });
});
