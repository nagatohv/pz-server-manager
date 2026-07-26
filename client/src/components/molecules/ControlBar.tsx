import React from 'react';
import { Button } from '../atoms/Button.js';
import { PlayIcon, StopIcon, RestartIcon, KillIcon, UpdateIcon } from '../atoms/Icon.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ServerStatus, ServerAction, ButtonVariant } from '../../types.js';

interface ControlBarProps {
  status: ServerStatus;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onUpdate: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  selectedBranch,
  onBranchChange,
  onStart,
  onStop,
  onRestart,
  onKill,
  onUpdate
}) => {
  const isRunning = status === ServerStatus.Running;
  const canStart = status === ServerStatus.Stopped || status === ServerStatus.Crashed;
  const canKill = status !== ServerStatus.Stopped;

  return (
    <div className="control-bar">
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

      <div className="control-bar__update">
        <select
          className="form-control control-bar__branch-select"
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          disabled={!canStart}
          aria-label="Steam branch selector"
        >
          <option value="">{CLIENT_STRINGS.CONTROL_BAR.BRANCH_STABLE}</option>
          <option value="unstable">{CLIENT_STRINGS.CONTROL_BAR.BRANCH_UNSTABLE}</option>
        </select>

        <Button variant={ButtonVariant.Primary} onClick={onUpdate} disabled={!canStart} data-action={ServerAction.Update}>
          <UpdateIcon /> {CLIENT_STRINGS.CONTROL_BAR.UPDATE_GAME}
        </Button>
      </div>
    </div>
  );
};
