import React, { SelectHTMLAttributes } from 'react';
import { SelectOption } from '../../types.js';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  description?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, description, id, className = '', ...props }) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select id={selectId} className={`form-control ${className}`.trim()} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {description && <span className="form-description">{description}</span>}
    </div>
  );
};
