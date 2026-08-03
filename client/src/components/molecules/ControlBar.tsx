import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { PlayIcon, StopIcon, RestartIcon, KillIcon } from '../atoms/Icon.js';
import { BranchInfo, BranchCatalogSource, BranchLoadState, ServerStatus, ServerAction, ButtonVariant, PzInstance } from '../../types.js';

interface ControlBarProps {
  status: ServerStatus;
  selectedBranch?: string;
  availableBranches?: BranchInfo[];
  branchesState?: BranchLoadState;
  branchesError?: string | null;
  branchesSource?: BranchCatalogSource;
  onBranchChange?: (branch: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onUpdate?: () => void;
  onRefreshBranches?: () => void;
  instances: PzInstance[];
  activeInstanceId: string | null;
  onSelectInstance: (id: string) => void;
  hideServerSelect?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  onStart,
  onStop,
  onRestart,
  onKill,
  instances = [],
  activeInstanceId,
  onSelectInstance,
  hideServerSelect = false
}) => {
  const { t } = useTranslation();
  const isRunning = status === ServerStatus.Running;
  const canStart = (status === ServerStatus.Stopped || status === ServerStatus.Crashed) && instances.length > 0;
  const canKill = status !== ServerStatus.Stopped;

  return (
    <div className="control-bar">
      <div className="control-bar__group control-bar__group--run">
        {!hideServerSelect && (
          <div className="control-bar__server-select-container">
            <label htmlFor="active-server-select" className="control-bar__server-label">
              {t('servers.title')}
            </label>
            <select
              id="active-server-select"
              className="form-control control-bar__server-select"
              value={activeInstanceId ?? ''}
              onChange={(e) => onSelectInstance(e.target.value)}
              disabled={status === ServerStatus.Running || status === ServerStatus.Starting || status === ServerStatus.Stopping || status === ServerStatus.Updating}
              aria-label={t('servers.activeServerSelectorAria')}
            >
              {instances.length === 0 && (
                <option value="">{t('servers.noInstances')}</option>
              )}
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button variant={ButtonVariant.Success} onClick={onStart} disabled={!canStart} data-action={ServerAction.Start}>
          <PlayIcon /> {t('servers.start')}
        </Button>

        <Button variant={ButtonVariant.Warning} onClick={onStop} disabled={!isRunning} data-action={ServerAction.Stop}>
          <StopIcon /> {t('servers.stop')}
        </Button>

        <Button variant={ButtonVariant.Primary} onClick={onRestart} disabled={!isRunning} data-action={ServerAction.Restart}>
          <RestartIcon /> {t('servers.restart')}
        </Button>

        <Button variant={ButtonVariant.Danger} onClick={onKill} disabled={!canKill} data-action={ServerAction.Kill}>
          <KillIcon /> {t('servers.kill')}
        </Button>
      </div>
    </div>
  );
};
