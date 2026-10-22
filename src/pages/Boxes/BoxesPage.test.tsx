import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { boxSources } from '../../modules/boxSources';
import BoxesPage from './index';

vi.mock('@components/MagicBox', () => ({
  default: () => <div>Preview output</div>,
}));
vi.mock('./LocalAIBoxSettings', () => ({
  default: () => <div>Model preferences</div>,
}));

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
    </>
  );
}

function mount(entry = '/boxes') {
  return render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <MemoryRouter initialEntries={[entry]}>
            <BoxesPage />
            <LocationProbe />
          </MemoryRouter>
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>,
  );
}

function library() {
  return within(screen.getByRole('region', { name: 'Box library' }));
}

function storedSettings() {
  return JSON.parse(localStorage.getItem('mb_settings') ?? '{}');
}

describe('Boxes management', () => {
  it('finds disabled tools and changes only the chosen availability', () => {
    mount();
    const source = boxSources[2];
    fireEvent.click(library().getByLabelText(`Disable ${source.name}`));
    const after = storedSettings();
    expect(after.boxes[source.name].enabled).toBe(false);
    expect(after.boxes[source.name].secondaryOrder).toBe(2);
    expect(after.boxes[source.name].priority).toBe(source.priority ?? 10);
    fireEvent.click(library().getByRole('button', { name: /^Disabled/ }));
    fireEvent.change(screen.getByLabelText('Search boxes'), {
      target: { value: source.name },
    });
    expect(
      library().getByLabelText(`Enable ${source.name}`),
    ).toBeInTheDocument();
    fireEvent.click(library().getByLabelText(`Enable ${source.name}`));
    expect(storedSettings().boxes[source.name].enabled).toBe(true);
    expect(screen.getAllByText('No matching boxes').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Clear filters', { selector: 'button' }));
    expect(
      library().getByLabelText(`Disable ${source.name}`),
    ).toBeInTheDocument();
  });

  it('reorders the full list and restores order without resetting disabled tools', () => {
    mount();
    const [first, second] = boxSources;
    fireEvent.click(library().getByLabelText(`Disable ${first.name}`));
    fireEvent.change(screen.getByLabelText('Search boxes'), {
      target: { value: first.name },
    });
    fireEvent.click(screen.getByText('Reorder', { selector: 'button' }));
    expect(screen.queryByLabelText('Search boxes')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(`Move ${second.name} up`));
    expect(storedSettings().boxes[second.name].secondaryOrder).toBe(0);
    expect(
      screen.getByRole('heading', { name: first.name }),
    ).toBeInTheDocument();
    expect(storedSettings().boxes[first.name]).toMatchObject({
      secondaryOrder: 1,
      enabled: false,
    });
    fireEvent.click(
      screen.getByText('Restore original order', { selector: 'button' }),
    );
    expect(storedSettings().boxes[first.name]).toMatchObject({
      secondaryOrder: 0,
      enabled: false,
    });
    expect(storedSettings().boxes[second.name].secondaryOrder).toBe(1);
  });

  it('preserves shared input and follows selection through browser history', () => {
    mount('/boxes?box=Word+Count&input=hello+world');
    expect(screen.getByLabelText('Input')).toHaveValue('hello world');
    fireEvent.click(library().getByText('Local AI', { selector: 'strong' }));
    expect(screen.getByTestId('location')).toHaveTextContent('?box=Local+AI');
    expect(screen.getByTestId('location')).not.toHaveTextContent('input=');
    expect(screen.getByLabelText('Input')).toHaveValue('::ai');
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByLabelText('Input')).toHaveValue('hello world');
    expect(
      screen.getByRole('heading', { name: 'Word Count' }),
    ).toBeInTheDocument();
  });

  it('exposes box settings without enabling or running a disabled tool', async () => {
    mount('/boxes?box=Local+AI');
    fireEvent.click(
      library().getByRole('button', { name: 'Disable Local AI' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'Enable' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await screen.findByText('Model preferences')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(storedSettings().boxes['Local AI'].enabled).toBe(true);
  });
});
