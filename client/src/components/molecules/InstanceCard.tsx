import './InstanceCard.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { Badge } from '../atoms/Badge.js';
import { PlayIcon, PowerIcon, TrashIcon, SwapIcon, UpdateIcon, SettingsIcon } from '../atoms/Icon.js';
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

const STATUS_CLASS_MAP: Record<ServerStatus, string> = {
  [ServerStatus.Stopped]: 'stopped',
  [ServerStatus.Starting]: 'starting',
  [ServerStatus.Running]: 'running',
  [ServerStatus.Stopping]: 'stopping',
  [ServerStatus.Updating]: 'updating',
  [ServerStatus.Crashed]: 'crashed'
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
  const { t } = useTranslation();
  const activeRunning = isActive && activeStatus !== ServerStatus.Stopped && activeStatus !== ServerStatus.Crashed;

  const getStatusLabel = (isActive: boolean, status: ServerStatus): string => {
    if (!isActive) return t('common.stopped');
    switch (status) {
      case ServerStatus.Running: return t('common.online');
      case ServerStatus.Starting: return t('common.starting');
      case ServerStatus.Updating: return t('common.updating');
      case ServerStatus.Stopping: return t('common.stopping');
      case ServerStatus.Crashed: return t('common.crashed');
      default: return t('common.stopped');
    }
  };

  const statusBadge = {
    status: isActive ? STATUS_CLASS_MAP[activeStatus] || 'stopped' : 'stopped',
    label: getStatusLabel(isActive, activeStatus)
  };

  const gameBadge = instance.game === GAME_ID_PROJECT_ZOMBOID || !instance.game
    ? t('servers.gameLabel')
    : instance.game.toUpperCase();

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
          <Badge status="game" label={gameBadge} />
          <Badge status={statusBadge.status} label={statusBadge.label} />
          <Badge
            status={instance.installed ? 'instalado' : STATUS_CLASS_MAP[ServerStatus.Stopped]}
            label={instance.installed ? t('servers.installed') : t('servers.notInstalled')}
          />
        </div>
      </header>

      <dl className="instance-card__details">
        <dt>{t('servers.steamBranch')}</dt>
        <dd data-field="branch">{instance.branch || t('servers.publicBranch')}</dd>
        <dt>{t('servers.gamePort')}</dt>
        <dd>{instance.gamePort}</dd>
        <dt>{t('servers.rconPort')}</dt>
        <dd>{instance.rconPort}</dd>
        <dt>{t('servers.maxPlayers')}</dt>
        <dd>{instance.maxPlayers}</dd>
        {instance.lastError && (
          <>
            <dt>{t('servers.lastErrorLabel')}</dt>
            <dd className="error-text" data-field="error">{instance.lastError}</dd>
          </>
        )}
      </dl>

      {isActive && activeRunning && activeServerStatus && (
        <div className="instance-card__stats">
          <div className="instance-card__stat-item">
            <span className="instance-card__stat-label">{t('header.players')}: </span>
            <strong className="instance-card__stat-value instance-card__stat-value--players">
              {activeServerStatus.onlinePlayers ?? 0} / {instance.maxPlayers}
            </strong>
          </div>
          <div className="instance-card__stat-item">
            <span className="instance-card__stat-label">{t('header.cpu')}: </span>
            <strong className="instance-card__stat-value instance-card__stat-value--cpu">
              {activeServerStatus.stats?.cpu ?? 0}%
            </strong>
          </div>
          <div className="instance-card__stat-item instance-card__stat-item--span-2">
            <span className="instance-card__stat-label">{t('header.ram')}: </span>
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
            <PowerIcon /> {t('servers.stop')}
          </Button>
        ) : (
          <Button
            variant={ButtonVariant.Success}
            onClick={handleStartClick}
            disabled={isStartDisabled}
            data-action="start-instance"
          >
            <PlayIcon /> {t('servers.start')}
          </Button>
        )}

        <Button
          variant={ButtonVariant.Primary}
          onClick={() => onInstall(instance.id)}
          disabled={isUpdateDisabled}
          data-action="install"
        >
          <UpdateIcon /> {instance.installed ? t('servers.update') : t('servers.install')}
        </Button>
        <Button
          variant={ButtonVariant.Control}
          onClick={() => onConfigure?.(instance.id)}
          disabled={loading}
          data-action="configure"
        >
          <SettingsIcon /> {t('servers.configure')}
        </Button>
        <Button
          variant={ButtonVariant.Control}
          onClick={() => onMigrate(instance.id)}
          disabled={loading || activeRunning}
          data-action="migrate"
        >
          <SwapIcon /> {t('servers.migrate')}
        </Button>
        <Button
          variant={ButtonVariant.Danger}
          onClick={() => onDelete(instance.id, instance.name)}
          disabled={isDeleteDisabled}
          data-action="delete"
        >
          <TrashIcon /> {t('common.delete')}
        </Button>
      </footer>
    </li>
  );
};
