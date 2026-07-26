import React, { ButtonHTMLAttributes } from 'react';
import { ButtonVariant } from '../../types.js';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  active?: boolean;
}

/** Mapa de variante → clase CSS de botón */
const VARIANT_CLASS_MAP: Record<ButtonVariant, (active: boolean) => string> = {
  [ButtonVariant.Primary]: () => 'btn btn-primary',
  [ButtonVariant.Success]: () => 'btn btn-success',
  [ButtonVariant.Warning]: () => 'btn btn-warning',
  [ButtonVariant.Danger]: () => 'btn btn-danger',
  [ButtonVariant.Logout]: () => 'btn-logout',
  [ButtonVariant.Control]: () => 'control-btn',
  [ButtonVariant.Toggle]: (active) => `toggle-btn${active ? ' active' : ''}`,
  [ButtonVariant.EditorSelect]: (active) => `editor-select-btn${active ? ' active' : ''}`,
  [ButtonVariant.Nav]: (active) => `nav-item${active ? ' active' : ''}`
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = ButtonVariant.Primary,
  active = false,
  className = '',
  ...props
}) => {
  const resolveClass = VARIANT_CLASS_MAP[variant] ?? VARIANT_CLASS_MAP[ButtonVariant.Primary];
  const baseClass = resolveClass(active);

  return (
    <button className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
};
