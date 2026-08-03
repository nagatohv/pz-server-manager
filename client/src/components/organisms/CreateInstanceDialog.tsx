import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { Input } from '../atoms/Input.js';
import { Select } from '../atoms/Select.js';
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

export const CreateInstanceDialog: React.FC<CreateInstanceDialogProps> = ({
  branches,
  branchesState,
  branchesError,
  onRefreshBranches,
  onSubmit,
  onCancel
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);

  const isBranchLoading = branchesState === 'loading';
  const hasBranchError = branchesState === 'error' || (branches.length === 0 && !isBranchLoading);

  const parsedBranchOptions = branches.map((branch) => {
    const name = branch.isDefault
      ? t('servers.createDialog.branchPublicDefault')
      : (branch.name || t('servers.createDialog.branchPublicDefault'));
    const label = branch.buildId
      ? t('servers.createDialog.branchOptionWithBuild', { name, buildId: branch.buildId })
      : name;
    return { value: branch.name, label };
  });

  const branchOptions = isBranchLoading
    ? [{ value: '', label: t('servers.createDialog.branchLoading') }]
    : hasBranchError
    ? [{ value: '', label: t('servers.createDialog.branchError') }]
    : parsedBranchOptions;

  const branchDescription = isBranchLoading
    ? t('servers.createDialog.branchDescLoading')
    : hasBranchError
    ? t('servers.createDialog.branchDescError', { error: branchesError || t('servers.createDialog.branchFallbackHint') })
    : t('servers.createDialog.branchCount', { count: branches.length });

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
      <h3>{t('servers.createBtn')}</h3>

      <Input
        name="name"
        label={t('createModal.name')}
        placeholder={t('createModal.namePlaceholder')}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        minLength={3}
        maxLength={32}
        required
        autoFocus
      />

      <div className="form-group mb-3">
        <label htmlFor="game" className="form-label instance-create-form__select-label">
          {t('createModal.game')}
        </label>
        <select
          id="game"
          name="game"
          value={form.game}
          onChange={(e) => setForm({ ...form, game: e.target.value })}
          className="form-control instance-create-form__select-input"
        >
          <option value={GAME_ID_PROJECT_ZOMBOID}>{t('createModal.projectZomboid')}</option>
        </select>
        <span className="instance-create-form__select-desc">
          {t('createModal.gameDesc')}
        </span>
      </div>

      <div className="form-group branch-select-group">
        <div className="branch-select-header">
          <label htmlFor="branch">{t('createModal.branch')}</label>
          {onRefreshBranches && (
            <Button
              type="button"
              variant={ButtonVariant.Control}
              onClick={onRefreshBranches}
              disabled={isBranchLoading}
              className="btn-sm btn-retry-branches"
              title={t('servers.createDialog.retryTitle')}
            >
              <RefreshIcon /> {t('servers.createDialog.retryBtn')}
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
          label={t('createModal.gamePort')}
          value={form.gamePort}
          onChange={(e) => setForm({ ...form, gamePort: Number(e.target.value) })}
          min={1024}
          max={65535}
        />
        <Input
          name="rconPort"
          type="number"
          label={t('createModal.rconPort')}
          value={form.rconPort}
          onChange={(e) => setForm({ ...form, rconPort: Number(e.target.value) })}
          min={1024}
          max={65535}
        />
        <Input
          name="maxPlayers"
          type="number"
          label={t('createModal.maxPlayers')}
          value={form.maxPlayers}
          onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
          min={1}
          max={128}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant={ButtonVariant.Control} onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant={ButtonVariant.Primary} disabled={submitting} data-action="submit-create">
          {t('servers.createBtn')}
        </Button>
      </div>
    </form>
  );
};
