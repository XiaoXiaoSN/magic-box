import { mount } from 'cypress/react18';
import React from 'react';

import App from './App';

describe('<App />', () => {
  it('renders', () => {
    mount(<App />);
  });
});
