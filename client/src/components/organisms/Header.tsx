import React from 'react';
import { BiohazardIcon, LogoutIcon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';
import { StatusWidget } from '../molecules/StatusWidget.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { IDLE_WIDGET_COLOR } from '../../config/constants.js';
import { ServerStatus, ServerStatusPayload, ButtonVariant } from '../../types.js';

interface HeaderProps {
  status: ServerStatusPayload;
  onLogout: () => void;
}

const STATUS_LABEL_MAP: Record<ServerStatus, string> = {
  [ServerStatus.Running]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_ONLINE,
  [ServerStatus.Stopped]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_OFFLINE,
  [ServerStatus.Starting]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_STARTING
};

const formatIdleTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const calcMemoryPercent = (memory: number, memoryTotal: number): number =>
  memoryTotal > 0 ? Math.round((memory / memoryTotal) * 100) : 0;

export const Header: React.FC<HeaderProps> = ({ status, onLogout }) => {
  const isRunning = status.status === ServerStatus.Running;
  const memoryPercent = calcMemoryPercent(status.stats?.memory ?? 0, status.stats?.memoryTotal ?? 0);
  const statusLabel = STATUS_LABEL_MAP[status.status] ?? CLIENT_STRINGS.STATUS_WIDGETS.STATUS_STARTING;

  return (
    <header className="portal-header">
      <div className="header-top">
        <div className="header-brand">
          <BiohazardIcon />
          <div>
            <h1>{CLIENT_STRINGS.TITLE}</h1>
            <span className="brand-sub">{CLIENT_STRINGS.SUBTITLE}</span>
          </div>
        </div>

        <Button variant={ButtonVariant.Logout} onClick={onLogout}>
          <LogoutIcon /> {CLIENT_STRINGS.AUTH.LOGOUT_BTN}
        </Button>
      </div>

      <div className="header-status-grid">
        <StatusWidget
          title={CLIENT_STRINGS.STATUS_WIDGETS.SERVER_STATUS_TITLE}
          badge={{ status: status.status, label: statusLabel }}
        />

        <StatusWidget
          title={CLIENT_STRINGS.STATUS_WIDGETS.ONLINE_PLAYERS_TITLE}
          value={isRunning ? (status.onlinePlayers ?? 0) : '-'}
          subtitle={isRunning ? CLIENT_STRINGS.STATUS_WIDGETS.PLAYERS_CONNECTED : CLIENT_STRINGS.STATUS_WIDGETS.PLAYERS_STOPPED}
          color="#38bdf8"
        />

        <StatusWidget
          title={CLIENT_STRINGS.STATUS_WIDGETS.CPU_USAGE_TITLE}
          value={`${status.stats?.cpu ?? 0}%`}
          progress={status.stats?.cpu ?? 0}
        />

        <StatusWidget
          title={CLIENT_STRINGS.STATUS_WIDGETS.MEMORY_USAGE_TITLE}
          value={`${status.stats?.memory ?? 0} MB`}
          progress={memoryPercent}
        />

        {status.idleShutdown?.active && (
          <StatusWidget
            title={CLIENT_STRINGS.STATUS_WIDGETS.IDLE_SHUTDOWN_TITLE}
            value={formatIdleTime(status.idleShutdown.remainingSeconds)}
            subtitle={CLIENT_STRINGS.STATUS_WIDGETS.IDLE_SUBTITLE}
            color={IDLE_WIDGET_COLOR}
          />
        )}
      </div>
    </header>
  );
};
