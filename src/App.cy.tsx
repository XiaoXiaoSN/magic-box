import { mount } from 'cypress/react';
import React from 'react';

import App from './App';

describe('<App />', () => {
  it('renders', () => {
    mount(<App />);
  });
});
