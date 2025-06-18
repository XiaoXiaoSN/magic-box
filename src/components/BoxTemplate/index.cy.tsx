import { mount } from 'cypress/react';
import React from 'react';

import { ShortenURLBoxTemplate } from './index';

describe('<ShortenURLBoxTemplate />', () => {
  it('should render correctly', () => {
    cy.visit('/');
    cy.get('#root', { timeout: 10000 }).should('be.visible');
  });

  it('renders', () => {
    const stubOnClick = cy.stub();

    mount(
      <ShortenURLBoxTemplate
        name="TITLE"
        plaintextOutput="https://example.com"
        options={null}
        onClick={stubOnClick}
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
