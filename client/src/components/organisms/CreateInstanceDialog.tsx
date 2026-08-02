import React, { useState } from 'react';
import { Button } from '../atoms/Button.js';
import { Input } from '../atoms/Input.js';
import { Select } from '../atoms/Select.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { GAME_ID_PROJECT_ZOMBOID } from '../../config/constants.js';
import { RefreshIcon } from '../atoms/Icon.js';
import { ButtonVariant, type BranchInfo, type BranchCatalogSource, type BranchLoadState } from '../../types.js';

export interface CreateInstancePayload {
  name: string;
  game: string;
  branch: string;
  gamePort: number;
  rconPort: number;
  maxPlayers: number;
}

interface CreateInstanceDialogProps {
  branches: BranchInfo[];
  branchesSource: BranchCatalogSource;
  branchesState?: BranchLoadState;
  branchesError?: string | null;
  onRefreshBranches?: () => void;
  onSubmit: (payload: CreateInstancePayload) => Promise<unknown> | unknown;
  onCancel: () => void;
}

const DEFAULT_FORM = {
  name: '',
  game: GAME_ID_PROJECT_ZOMBOID,
  branch: '',
  gamePort: 16261,
  rconPort: 27015,
  maxPlayers: 16
};

const formatBranchOption = (branch: BranchInfo): { value: string; label: string } => {
  const name = branch.isDefault
    ? CLIENT_STRINGS.SERVERS_PAGE.BRANCH_PUBLIC_DEFAULT
    : (branch.name || CLIENT_STRINGS.SERVERS_PAGE.BRANCH_PUBLIC_DEFAULT);
  const label = branch.buildId
    ? CLIENT_STRINGS.SERVERS_PAGE.BRANCH_OPTION_WITH_BUILD
      .replace('{name}', name)
      .replace('{buildId}', branch.buildId)
    : name;
  return { value: branch.name, label };
};

export const CreateInstanceDialog: React.FC<CreateInstanceDialogProps> = ({
  branches,
  branchesSource,
  branchesState,
  branchesError,
  onRefreshBranches,
  onSubmit,
  onCancel
}) => {
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);

  const isBranchLoading = branchesState === 'loading';
  const hasBranchError = branchesState === 'error' || (branches.length === 0 && !isBranchLoading);

  const parsedBranchOptions = branches.map(formatBranchOption);

  const branchOptions = isBranchLoading
    ? [{ value: '', label: CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_LOADING }]
    : hasBranchError
    ? [{ value: '', label: CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_ERROR }]
    : parsedBranchOptions;

  const branchDescription = isBranchLoading
    ? CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_DESC_LOADING
    : hasBranchError
    ? CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_DESC_ERROR.replace('{error}', branchesError || CLIENT_STRINGS.SERVERS_PAGE.BRANCH_FALLBACK_HINT)
    : branches.length === 1
    ? CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_COUNT_SINGLE
    : CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.BRANCH_COUNT_PLURAL.replace('{count}', String(branches.length));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="modal instance-create-form" onSubmit={handleSubmit} data-component="create-instance-dialog">
      <h3>{CLIENT_STRINGS.SERVERS_PAGE.CREATE_BTN}</h3>

      <Input
        name="name"
        label={CLIENT_STRINGS.SERVERS_PAGE.NAME_LABEL}
        placeholder={CLIENT_STRINGS.SERVERS_PAGE.NAME_PLACEHOLDER}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        minLength={3}
        maxLength={32}
        required
        autoFocus
      />

      <div className="form-group mb-3">
        <label htmlFor="game" className="form-label instance-create-form__select-label">
          {CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.GAME_LABEL}
        </label>
        <select
          id="game"
          name="game"
          value={form.game}
          onChange={(e) => setForm({ ...form, game: e.target.value })}
          className="form-control instance-create-form__select-input"
        >
          <option value={GAME_ID_PROJECT_ZOMBOID}>{CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.PROJECT_ZOMBOID}</option>
        </select>
        <span className="instance-create-form__select-desc">
          {CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.GAME_DESC}
        </span>
      </div>

      <div className="form-group branch-select-group">
        <div className="branch-select-header">
          <label htmlFor="branch">{CLIENT_STRINGS.SERVERS_PAGE.BRANCH_LABEL}</label>
          {onRefreshBranches && (
            <Button
              type="button"
              variant={ButtonVariant.Control}
              onClick={onRefreshBranches}
              disabled={isBranchLoading}
              className="btn-sm btn-retry-branches"
              title={CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.RETRY_TITLE}
            >
              <RefreshIcon /> {CLIENT_STRINGS.SERVERS_PAGE.CREATE_DIALOG.RETRY_BTN}
            </Button>
          )}
        </div>

        <Select
          id="branch"
          name="branch"
          value={form.branch}
          onChange={(e) => setForm({ ...form, branch: e.target.value })}
          options={branchOptions}
          description={branchDescription}
          disabled={isBranchLoading || hasBranchError}
        />
      </div>

      <div className="form-row">
        <Input
          name="gamePort"
          type="number"
          label={CLIENT_STRINGS.SERVERS_PAGE.GAME_PORT_LABEL}
          value={form.gamePort}
          onChange={(e) => setForm({ ...form, gamePort: Number(e.target.value) })}
          min={1024}
          max={65535}
        />
        <Input
          name="rconPort"
          type="number"
          label={CLIENT_STRINGS.SERVERS_PAGE.RCON_PORT_LABEL}
          value={form.rconPort}
          onChange={(e) => setForm({ ...form, rconPort: Number(e.target.value) })}
          min={1024}
          max={65535}
        />
        <Input
          name="maxPlayers"
          type="number"
          label={CLIENT_STRINGS.SERVERS_PAGE.MAX_PLAYERS_LABEL}
          value={form.maxPlayers}
          onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
          min={1}
          max={128}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant={ButtonVariant.Control} onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant={ButtonVariant.Primary} disabled={submitting} data-action="submit-create">
          {CLIENT_STRINGS.SERVERS_PAGE.CREATE_BTN}
        </Button>
      </div>
    </form>
  );
};
