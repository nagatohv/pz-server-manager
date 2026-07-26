import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Input: React.FC<InputProps> = ({ label, description, id, className = '', ...props }) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={`form-control ${className}`.trim()} {...props} />
      {description && <span className="form-description">{description}</span>}
    </div>
  );
};
