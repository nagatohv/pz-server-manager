import React from 'react';
import './Badge.scss';

interface BadgeProps {
  status: string;
  label: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label }) => (
  <span className={`status-badge status-badge--${status.toLowerCase()}`}>
    {label}
  </span>
);
