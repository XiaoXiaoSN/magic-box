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

interface FieldProps {
  label: string;
  hint?: string;
  controlId?: string;
  group?: boolean;
  children: React.ReactNode;
}

export const Field = ({
  label,
  hint,
  controlId,
  group = false,
  children,
}: FieldProps): React.JSX.Element => {
  const fieldInfo = (
    <div className="field-info">
      {controlId ? (
        <label className="field-label" htmlFor={controlId}>
          {label}
        </label>
      ) : (
        <div className="field-label">{label}</div>
      )}
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
  if (group) {
    return (
      <fieldset className="field field-group">
        <legend className="field-label">{label}</legend>
        {hint ? (
          <div className="field-info">
            <div className="field-hint">{hint}</div>
          </div>
        ) : null}
        <div className="field-control">{children}</div>
      </fieldset>
    );
  }
  return (
    <div className="field">
      {fieldInfo}
      <div className="field-control">{children}</div>
    </div>
  );
};
