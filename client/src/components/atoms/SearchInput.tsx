import React, { InputHTMLAttributes } from 'react';
import { SearchIcon, ClearIcon } from './Icon.js';

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'>;

interface SearchInputProps extends NativeInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  containerClassName = '',
  className = '',
  ...rest
}) => (
  <div className={`search-input ${containerClassName}`.trim()}>
    <span className="search-input__icon" aria-hidden="true">
      <SearchIcon />
    </span>
    <input
      type="search"
      className={`form-control search-input__field ${className}`.trim()}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
    {value && (
      <button
        type="button"
        className="search-input__clear"
        onClick={() => {
          onChange('');
          if (onClear) onClear();
        }}
        aria-label="Clear search"
        tabIndex={-1}
      >
        <ClearIcon />
      </button>
    )}
  </div>
);
