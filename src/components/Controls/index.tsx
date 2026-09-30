import { useLocale } from '../../contexts/LocaleContext';

// Form controls shared by the Settings page and the in-box settings dialogs, so
// one preference never looks or behaves differently depending on where it is
// changed. Styled by the global `.select` / `.toggle` rules.

export interface ControlOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  testId?: string;
}

export const Toggle = ({ checked, onChange, label, testId }: ToggleProps) => {
  const { t } = useLocale();
  return (
    <button
      aria-label={label ?? t('settings.toggle')}
      aria-pressed={checked}
      className={`toggle${checked ? ' on' : ''}`}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="toggle-dot" />
    </button>
  );
};

interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: readonly ControlOption<T>[];
  disabled?: boolean;
  id?: string;
  label?: string;
  testId?: string;
}

export const Select = <T extends string>({
  value,
  onChange,
  options,
  disabled,
  id,
  label,
  testId,
}: SelectProps<T>) => (
  <select
    aria-label={label}
    className="select"
    data-testid={testId}
    disabled={disabled}
    id={id}
    onChange={(e) => onChange(e.target.value as T)}
    value={value}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
