import React from 'react';
import { ServerStatus } from '../../types.js';

interface BadgeProps {
  status: ServerStatus;
  label: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label }) => (
  <span className={`status-badge status-badge--${status.toLowerCase()}`}>
    {label}
  </span>
);
