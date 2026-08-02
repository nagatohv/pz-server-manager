import React from 'react';
import { Button } from '../atoms/Button.js';
import { PlayIcon, StopIcon, RestartIcon, KillIcon } from '../atoms/Icon.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
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
  const isRunning = status === ServerStatus.Running;
  const canStart = (status === ServerStatus.Stopped || status === ServerStatus.Crashed) && instances.length > 0;
  const canKill = status !== ServerStatus.Stopped;

  return (
    <div className="control-bar">
      <div className="control-bar__group control-bar__group--run">
        {!hideServerSelect && (
          <div className="control-bar__server-select-container">
            <label htmlFor="active-server-select" className="control-bar__server-label">
              {CLIENT_STRINGS.CONTROL_BAR.SERVER_SELECT_LABEL}
            </label>
            <select
              id="active-server-select"
              className="form-control control-bar__server-select"
              value={activeInstanceId ?? ''}
              onChange={(e) => onSelectInstance(e.target.value)}
              disabled={status === ServerStatus.Running || status === ServerStatus.Starting || status === ServerStatus.Stopping || status === ServerStatus.Updating}
              aria-label="Active server selector"
            >
              {instances.length === 0 && (
                <option value="">{CLIENT_STRINGS.CONTROL_BAR.NO_SERVERS_AVAILABLE}</option>
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
          <PlayIcon /> {CLIENT_STRINGS.CONTROL_BAR.START_SERVER}
        </Button>

        <Button variant={ButtonVariant.Warning} onClick={onStop} disabled={!isRunning} data-action={ServerAction.Stop}>
          <StopIcon /> {CLIENT_STRINGS.CONTROL_BAR.STOP_SERVER}
        </Button>

        <Button variant={ButtonVariant.Primary} onClick={onRestart} disabled={!isRunning} data-action={ServerAction.Restart}>
          <RestartIcon /> {CLIENT_STRINGS.CONTROL_BAR.RESTART_SERVER}
        </Button>

        <Button variant={ButtonVariant.Danger} onClick={onKill} disabled={!canKill} data-action={ServerAction.Kill}>
          <KillIcon /> {CLIENT_STRINGS.CONTROL_BAR.KILL_SERVER}
        </Button>
      </div>
    </div>
  );
};
