import type { Box, BoxProps } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import { render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import MagicBox from './index';

// Counts how many times this template was MOUNTED, not rendered. A stateful
// box (the Local AI panel holds a ~500 MB loaded model) must survive unrelated
// boxes appearing above it.
let mounts = 0;

const StatefulTemplate = ({ name }: BoxProps): React.JSX.Element => {
  const mountId = useRef<number | null>(null);
  if (mountId.current === null) {
    mounts += 1;
    mountId.current = mounts;
  }
  return <div data-testid="stateful-box">{`${name} #${mountId.current}`}</div>;
};

const stateful: BoxSource = {
  name: 'Stateful',
  description: 'always matches',
  defaultInput: '',
  tag: '·',
  kind: 'Generate',
  async generateBoxes(): Promise<Box[]> {
    return [
      new BoxBuilder('Stateful', '')
        .setTemplate(StatefulTemplate)
        .setShowExpandButton(false)
        .build(),
    ];
  },
};

// Emits a box only for some inputs, exactly like a source whose match depends
// on what the user typed. It sorts before `stateful`, so toggling it shifts
// every position below.
const conditional: BoxSource = {
  name: 'Conditional',
  description: 'matches longer input',
  defaultInput: '',
  tag: '·',
  kind: 'Info',
  async generateBoxes(input: string): Promise<Box[]> {
    if (input.length < 5) return [];
    return [new BoxBuilder('Conditional', input).build()];
  },
};

const tree = (input: string) => (
  <LocaleProvider>
    <PreferencesProvider>
      <SettingsProvider>
        <MagicBox input={input} sources={[conditional, stateful]} />
      </SettingsProvider>
    </PreferencesProvider>
  </LocaleProvider>
);

describe('box identity across input changes', () => {
  it('keeps a stateful box mounted when a box appears above it', async () => {
    const { rerender } = render(tree('hi'));
    await screen.findByTestId('stateful-box');
    expect(screen.getByTestId('stateful-box')).toHaveTextContent('Stateful #1');
    expect(mounts).toBe(1);

    // A longer input makes `conditional` match, pushing the stateful box from
    // index 0 to index 1. Position-based keys would remount it here.
    rerender(tree('hello there'));

    await waitFor(() =>
      expect(screen.getAllByTestId('magic-box-result')).toHaveLength(2),
    );
    expect(screen.getByTestId('stateful-box')).toHaveTextContent('Stateful #1');
    expect(mounts).toBe(1);
  });
});
