import type { BoxSource } from '@modules/BoxSource';
import { render } from 'ink';
import { createElement } from 'react';

import { App, ResultList } from './App';
import type { TerminalRenderer } from './renderer';

export const inkRenderer: TerminalRenderer = {
  name: 'ink',
  async showResults(boxes) {
    const instance = render(createElement(ResultList, { boxes }));
    instance.unmount();
    await instance.waitUntilExit();
  },
  async startInteractive(sources?: BoxSource[]) {
    await render(createElement(App, { sources })).waitUntilExit();
  },
};
