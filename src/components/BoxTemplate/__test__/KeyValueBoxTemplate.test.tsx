import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import KeyValueBoxTemplate from '../KeyValueBoxTemplate';

describe('<KeyValueBoxTemplate />', () => {
  it('renders and copies a __proto__ key from null-prototype options', () => {
    const options = Object.create(null) as Record<string, string>;
    options.__proto__ = 'visible value';
    options.other = 'other value';
    const onClick = vi.fn();

    render(
      <KeyValueBoxTemplate
        name="Test"
        onClick={onClick}
        options={options}
        plaintextOutput=""
      />,
    );

    expect(screen.getByTestId('magic-box-key-__proto__')).toHaveTextContent(
      '__proto__',
    );
    expect(screen.getByTestId('magic-box-value-__proto__')).toHaveTextContent(
      'visible value',
    );

    fireEvent.click(screen.getByTestId('magic-box-value-__proto__'));
    expect(onClick).toHaveBeenCalledWith('visible value');
  });
});
