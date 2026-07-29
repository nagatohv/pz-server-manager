import React from 'react';
import { Button } from '../atoms/Button.js';
import { Badge } from '../atoms/Badge.js';
import { PlayIcon, PowerIcon, TrashIcon, SwapIcon, UpdateIcon, SettingsIcon } from '../atoms/Icon.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ButtonVariant, ServerStatus, type PzInstance } from '../../types.js';

interface InstanceCardProps {
  instance: PzInstance;
  isActive: boolean;
  activeStatus: ServerStatus;
  loading: boolean;
  onSelect: (id: string) => void;
  onInstall: (id: string) => void;
  onStart: () => void;
  onStop: () => void;
  onDelete: (id: string, name: string) => void;
  onMigrate: (id: string) => void;
  onConfigure?: (id: string) => void;
}

const formatBranch = (branch: string): string =>
  branch === '' ? CLIENT_STRINGS.SERVERS_PAGE.BRANCH_PUBLIC_DEFAULT : branch;

const getStatusBadge = (isActive: boolean, activeStatus: ServerStatus): { status: string; label: string } => {
  if (!isActive) return { status: 'stopped', label: 'DETENIDO' };
  switch (activeStatus) {
    case ServerStatus.Running:
      return { status: 'running', label: 'EJECUTÁNDOSE' };
    case ServerStatus.Starting:
      return { status: 'starting', label: 'INICIANDO' };
    case ServerStatus.Stopping:
      return { status: 'stopping', label: 'DETENIENDO' };
    case ServerStatus.Updating:
      return { status: 'updating', label: 'ACTUALIZANDO' };
    case ServerStatus.Crashed:
      return { status: 'crashed', label: 'ERROR' };
    case ServerStatus.Stopped:
    default:
      return { status: 'stopped', label: 'DETENIDO' };
  }
};

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  isActive,
  activeStatus,
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
          <Badge status={statusBadge.status} label={statusBadge.label} />
          <Badge
            status={instance.installed ? 'instalado' : 'stopped'}
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

      <footer className="instance-card__actions">
        {isActive && activeRunning ? (
          <Button
            variant={ButtonVariant.Danger}
            onClick={onStop}
            disabled={loading}
            data-action="stop-instance"
          >
            <PowerIcon /> Detener Servidor
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
          <SettingsIcon /> Configuración
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
