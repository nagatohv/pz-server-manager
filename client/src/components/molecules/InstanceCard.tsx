import './InstanceCard.scss';
import React from 'react';
import { Button } from '../atoms/Button.js';
import { Badge } from '../atoms/Badge.js';
import { PlayIcon, PowerIcon, TrashIcon, SwapIcon, UpdateIcon, SettingsIcon } from '../atoms/Icon.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { GAME_ID_PROJECT_ZOMBOID } from '../../config/constants.js';
import { ButtonVariant, ServerStatus, type PzInstance, type ServerStatusPayload } from '../../types.js';

interface InstanceCardProps {
  instance: PzInstance;
  isActive: boolean;
  activeStatus: ServerStatus;
  activeServerStatus?: ServerStatusPayload;
  loading: boolean;
  onSelect: (id: string) => void | Promise<unknown>;
  onInstall: (id: string) => void;
  onStart: () => void;
  onStop: () => void;
  onDelete: (id: string, name: string) => void;
  onMigrate: (id: string) => void;
  onConfigure?: (id: string) => void;
}

const formatBranch = (branch: string): string =>
  branch === '' ? CLIENT_STRINGS.SERVERS_PAGE.BRANCH_PUBLIC_DEFAULT : branch;

const STATUS_CLASS_MAP: Record<ServerStatus, string> = {
  [ServerStatus.Stopped]: 'stopped',
  [ServerStatus.Starting]: 'starting',
  [ServerStatus.Running]: 'running',
  [ServerStatus.Stopping]: 'stopping',
  [ServerStatus.Updating]: 'updating',
  [ServerStatus.Crashed]: 'crashed'
};

const getStatusBadge = (isActive: boolean, activeStatus: ServerStatus): { status: string; label: string } => {
  if (!isActive) {
    return {
      status: STATUS_CLASS_MAP[ServerStatus.Stopped],
      label: CLIENT_STRINGS.STATUS.STOPPED
    };
  }
  return {
    status: STATUS_CLASS_MAP[activeStatus] || STATUS_CLASS_MAP[ServerStatus.Stopped],
    label: CLIENT_STRINGS.STATUS[activeStatus] || CLIENT_STRINGS.STATUS.STOPPED
  };
};

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  isActive,
  activeStatus,
  activeServerStatus,
  loading,
  onSelect,
  onInstall,
  onStart,
  onStop,
  onDelete,
  onMigrate,
  onConfigure
}) => {
  const activeRunning = isActive && activeStatus !== ServerStatus.Stopped && activeStatus !== ServerStatus.Crashed;
  const statusBadge = getStatusBadge(isActive, activeStatus);

  const isStartDisabled = !instance.installed || loading || (activeRunning && !isActive);
  const isUpdateDisabled = loading || (isActive && activeRunning);
  const isDeleteDisabled = loading || (isActive && activeRunning);

  const handleStartClick = async () => {
    if (loading) return;
    try {
      if (!isActive) {
        await onSelect(instance.id);
      }
      onStart();
    } catch (_) {
      // errors handled in onSelect
    }
  };

  return (
    <li className="instance-card" data-instance-id={instance.id}>
      <header className="instance-card__header">
        <h3 className="instance-card__name">{instance.name}</h3>
        <div className="instance-card__badges">
          <Badge
            status="game"
            label={instance.game === GAME_ID_PROJECT_ZOMBOID || !instance.game
              ? CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.PROJECT_ZOMBOID
              : instance.game}
          />
          <Badge status={statusBadge.status} label={statusBadge.label} />
          <Badge
            status={instance.installed ? 'instalado' : STATUS_CLASS_MAP[ServerStatus.Stopped]}
            label={instance.installed
              ? CLIENT_STRINGS.SERVERS_PAGE.INSTALLED_BADGE
              : CLIENT_STRINGS.SERVERS_PAGE.NOT_INSTALLED_BADGE}
          />
        </div>
      </header>

      <dl className="instance-card__details">
        <dt>{CLIENT_STRINGS.SERVERS_PAGE.BRANCH_LABEL}</dt>
        <dd data-field="branch">{formatBranch(instance.branch)}</dd>
        <dt>{CLIENT_STRINGS.SERVERS_PAGE.GAME_PORT_LABEL}</dt>
        <dd>{instance.gamePort}</dd>
        <dt>{CLIENT_STRINGS.SERVERS_PAGE.RCON_PORT_LABEL}</dt>
        <dd>{instance.rconPort}</dd>
        <dt>{CLIENT_STRINGS.SERVERS_PAGE.MAX_PLAYERS_LABEL}</dt>
        <dd>{instance.maxPlayers}</dd>
        {instance.lastError && (
          <>
            <dt>{CLIENT_STRINGS.SERVERS_PAGE.LAST_ERROR_LABEL}</dt>
            <dd className="error-text" data-field="error">{instance.lastError}</dd>
          </>
        )}
      </dl>

      {isActive && activeRunning && activeServerStatus && (
        <div className="instance-card__stats">
          <div className="instance-card__stat-item">
            <span className="instance-card__stat-label">{CLIENT_STRINGS.STATUS_WIDGETS.ONLINE_PLAYERS_TITLE}: </span>
            <strong className="instance-card__stat-value instance-card__stat-value--players">
              {activeServerStatus.onlinePlayers ?? 0} / {instance.maxPlayers}
            </strong>
          </div>
          <div className="instance-card__stat-item">
            <span className="instance-card__stat-label">{CLIENT_STRINGS.STATUS_WIDGETS.CPU_USAGE_TITLE}: </span>
            <strong className="instance-card__stat-value instance-card__stat-value--cpu">
              {activeServerStatus.stats?.cpu ?? 0}%
            </strong>
          </div>
          <div className="instance-card__stat-item instance-card__stat-item--span-2">
            <span className="instance-card__stat-label">{CLIENT_STRINGS.STATUS_WIDGETS.MEMORY_USAGE_TITLE}: </span>
            <strong className="instance-card__stat-value instance-card__stat-value--memory">
              {activeServerStatus.stats?.memory ?? 0} MB
            </strong>
          </div>
        </div>
      )}

      <footer className="instance-card__actions">
        {isActive && activeRunning ? (
          <Button
            variant={ButtonVariant.Danger}
            onClick={onStop}
            disabled={loading}
            data-action="stop-instance"
          >
            <PowerIcon /> {CLIENT_STRINGS.SERVERS_PAGE.STOP_BTN}
          </Button>
        ) : (
          <Button
            variant={ButtonVariant.Success}
            onClick={handleStartClick}
            disabled={isStartDisabled}
            data-action="start-instance"
          >
            <PlayIcon /> {CLIENT_STRINGS.SERVERS_PAGE.START_BTN}
          </Button>
        )}

        <Button
          variant={ButtonVariant.Primary}
          onClick={() => onInstall(instance.id)}
          disabled={isUpdateDisabled}
          data-action="install"
        >
          <UpdateIcon /> {instance.installed ? CLIENT_STRINGS.SERVERS_PAGE.UPDATE_BTN : CLIENT_STRINGS.SERVERS_PAGE.INSTALL_BTN}
        </Button>
        <Button
          variant={ButtonVariant.Control}
          onClick={() => onConfigure?.(instance.id)}
          disabled={loading}
          data-action="configure"
        >
          <SettingsIcon /> {CLIENT_STRINGS.SERVERS_PAGE.CONFIGURE_BTN}
        </Button>
        <Button
          variant={ButtonVariant.Control}
          onClick={() => onMigrate(instance.id)}
          disabled={loading || activeRunning}
          data-action="migrate"
        >
          <SwapIcon /> {CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_BTN}
        </Button>
        <Button
          variant={ButtonVariant.Danger}
          onClick={() => onDelete(instance.id, instance.name)}
          disabled={isDeleteDisabled}
          data-action="delete"
        >
          <TrashIcon /> {CLIENT_STRINGS.SERVERS_PAGE.DELETE_BTN}
        </Button>
      </footer>
    </li>
  );
};
