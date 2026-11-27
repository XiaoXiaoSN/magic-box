import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuItem from '@mui/material/MenuItem';
import MuiSelect from '@mui/material/Select';
import type { ControlOption } from './index';
import './dropdown.css';

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly ControlOption<T>[];
  disabled?: boolean;
  label?: string;
  labelId?: string;
}

const menuProps = {
  slotProps: {
    paper: { className: 'control-dropdown-paper' },
    list: { className: 'control-dropdown-list' },
  },
};

export default function Dropdown<T extends string>({
  value,
  onChange,
  options,
  disabled,
  label,
  labelId,
}: DropdownProps<T>): React.JSX.Element {
  return (
    <MuiSelect<T>
      IconComponent={KeyboardArrowDownIcon}
      MenuProps={menuProps}
      className="control-dropdown"
      disableUnderline
      disabled={disabled}
      inputProps={{ 'aria-label': label }}
      labelId={labelId}
      onChange={(event) => onChange(event.target.value as T)}
      renderValue={(selected) =>
        options.find((option) => option.value === selected)?.label
      }
      value={value}
      variant="standard"
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <span>{option.label}</span>
          {option.value === value ? <CheckIcon /> : null}
        </MenuItem>
      ))}
    </MuiSelect>
  );
}
