import React from 'react';

import { mount } from 'cypress/react';

import App from './App';

describe('<App />', () => {
  it('renders', () => {
    mount(<App />);
  });
});
