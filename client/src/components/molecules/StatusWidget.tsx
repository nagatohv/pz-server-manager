import './StatusWidget.scss';
import React from 'react';
import { Badge } from '../atoms/Badge.js';
import { ProgressBar } from '../atoms/ProgressBar.js';
import { ServerStatus } from '../../types.js';

interface BadgeConfig {
  status: ServerStatus;
  label: string;
}

interface StatusWidgetProps {
  title: string;
  value?: string | number;
  badge?: BadgeConfig;
  progress?: number;
  subtitle?: string;
  extraClass?: string;
  color?: string;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({
  title,
  value,
  badge,
  progress,
  subtitle,
  extraClass = '',
  color
}) => {
  const className = ['status-widget', extraClass].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <span className="widget-title">{title}</span>
      {badge && <Badge status={badge.status} label={badge.label} />}
      {value !== undefined && (
        <span className="widget-val" style={color ? { color } : undefined}>
          {value}
        </span>
      )}
      {progress !== undefined && <ProgressBar percent={progress} />}
      {subtitle && <span className="widget-desc">{subtitle}</span>}
    </div>
  );
};
