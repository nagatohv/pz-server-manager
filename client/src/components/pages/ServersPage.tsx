import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { Select } from '../atoms/Select.js';
import { InstanceCard } from '../molecules/InstanceCard.js';
import { CreateInstanceDialog, type CreateInstancePayload } from '../organisms/CreateInstanceDialog.js';
import {
  ServerFiltersBar,
  DEFAULT_SERVER_FILTERS,
  filterAndSortInstances,
  type ServerFiltersValue
} from '../organisms/ServerFiltersBar.js';
import { ButtonVariant, type BranchInfo, type BranchLoadState, type PzInstance, type ServerStatusPayload } from '../../types.js';

import { AlertModal } from '../molecules/AlertModal.js';
import { useModal } from '../../hooks/useModal.js';

interface HarnessLike {
  registry: { instances: PzInstance[]; activeInstanceId: string | null };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateInstancePayload) => Promise<PzInstance>;
  select: (id: string) => Promise<PzInstance>;
  install: (id: string) => Promise<{ instance: PzInstance; success: boolean }>;
  remove: (id: string) => Promise<void>;
  migrate: (sourceId: string, targetId: string) => Promise<{ filesCopied: number; bytesCopied: number }>;
}

interface ServersPageProps {
  harness: HarnessLike;
  branches: BranchInfo[];
  branchesSource: 'steam' | 'fallback';
  branchesState?: BranchLoadState;
  branchesError?: string | null;
  onRefreshBranches?: () => void;
  activeServerStatus: ServerStatusPayload;
  onStart: () => void;
  onStop: () => void;
  onConfigure?: (id: string) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const ServersPage: React.FC<ServersPageProps> = ({
  harness,
  branches,
  branchesSource,
  branchesState,
  branchesError,
  onRefreshBranches,
  activeServerStatus,
  onStart,
  onStop,
  onConfigure
}) => {
  const { t } = useTranslation();
  const { registry, loading, error } = harness;
  const modal = useModal();
  const [createOpen, setCreateOpen] = useState(false);
  const [migrateTarget, setMigrateTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filters, setFilters] = useState<ServerFiltersValue>(DEFAULT_SERVER_FILTERS);

  const visibleInstances = useMemo(
    () => filterAndSortInstances(registry.instances, filters, registry.activeInstanceId),
    [registry.instances, registry.activeInstanceId, filters]
  );

  const handleCreate = async (payload: CreateInstancePayload) => {
    try {
      const instance = await harness.create(payload);
      setFeedback(t('servers.feedbackCreated', { name: instance.name, id: instance.id }));
      setCreateOpen(false);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : t('servers.errorCreate'));
    }
  };

  const handleSelect = async (id: string) => {
    try {
      const instance = await harness.select(id);
      setFeedback(t('servers.feedbackActivated', { name: instance.name }));
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : t('servers.errorActivate'));
    }
  };

  const handleInstall = async (id: string) => {
    try {
      const result = await harness.install(id);
      setFeedback(result.success
        ? t('servers.feedbackInstallOk', { name: result.instance.name })
        : t('servers.feedbackInstallFailed', { reason: result.instance.lastError ?? t('servers.feedbackInstallCheckLogs') })
      );
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : t('servers.errorInstall'));
    }
  };

  const handleDelete = (id: string, name: string) => {
    modal.showConfirm({
      title: t('servers.confirmDeleteTitle'),
      message: t('servers.confirmDeleteMsg', { name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        try {
          await harness.remove(id);
          setFeedback(t('servers.feedbackDeleted', { name }));
        } catch (err: unknown) {
          setFeedback(err instanceof Error ? err.message : t('servers.errorDelete'));
        }
      }
    });
  };

  const handleMigrate = async (sourceId: string, targetId: string) => {
    try {
      const result = await harness.migrate(sourceId, targetId);
      setFeedback(t('servers.feedbackMigrated', { files: result.filesCopied, bytes: formatBytes(result.bytesCopied) }));
      setMigrateTarget(null);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : t('servers.errorMigrate'));
    }
  };

  const migrateSourceOptions = migrateTarget
    ? registry.instances.filter((i) => i.id !== migrateTarget)
    : [];

  const isFiltered = filters.search !== '' || filters.installFilter !== 'all' || filters.activityFilter !== 'all' || filters.branchFilter !== 'all';

  return (
    <div className="tab-content">
      <header className="tab-header tab-header--inline">
        <div className="tab-header__text">
          <h2>{t('servers.title')}</h2>
          <p className="tab-subtitle">{t('servers.subtitle')}</p>
        </div>
        <Button
          variant={ButtonVariant.Primary}
          onClick={() => setCreateOpen(true)}
          data-action="create-instance"
          className="btn-create-inline"
        >
          {t('servers.createBtn')}
        </Button>
      </header>

      {feedback && <div className="alert alert-info" role="status">{feedback}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {registry.instances.length > 0 && (
        <ServerFiltersBar
          value={filters}
          onChange={setFilters}
          branches={branches}
          resultsCount={visibleInstances.length}
          totalCount={registry.instances.length}
        />
      )}

      {registry.instances.length === 0 ? (
        <div className="empty-state">
          <h3>{t('servers.noInstances')}</h3>
          <p>{t('servers.emptySubtitle')}</p>
        </div>
      ) : visibleInstances.length === 0 ? (
        <div className="empty-state" data-testid="no-results">
          <h3>{t('servers.noResults')}</h3>
        </div>
      ) : (
        <ul className="instance-list" data-testid="instance-list">
          {visibleInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              isActive={registry.activeInstanceId === instance.id}
              activeStatus={activeServerStatus.status}
              activeServerStatus={activeServerStatus}
              loading={loading}
              onSelect={handleSelect}
              onInstall={handleInstall}
              onStart={onStart}
              onStop={onStop}
              onDelete={handleDelete}
              onConfigure={onConfigure}
              onMigrate={(id) => {
                if (!migrateTarget) setMigrateTarget(id);
                else if (migrateTarget !== id) {
                  void handleMigrate(migrateTarget, id);
                  setMigrateTarget(null);
                }
              }}
            />
          ))}
        </ul>
      )}

      {createOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <CreateInstanceDialog
            branches={branches}
            branchesSource={branchesSource}
            branchesState={branchesState}
            branchesError={branchesError}
            onRefreshBranches={onRefreshBranches}
            onCancel={() => setCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      {migrateTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>{t('servers.migrateDialogTitle')}</h3>
            <p>{t('servers.migrateDialogDesc')}</p>
            <Select
              name="migrate-source"
              label={t('servers.migrateSourceLabel')}
              value=""
              onChange={() => undefined}
              options={[{ value: '', label: t('servers.migrateSelectPlaceholder') }, ...migrateSourceOptions.map((i) => ({ value: i.id, label: i.name }))]}
            />
            <div className="form-actions">
              <Button type="button" variant={ButtonVariant.Control} onClick={() => setMigrateTarget(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        onClose={modal.closeModal}
      />
    </div>
  );
};
