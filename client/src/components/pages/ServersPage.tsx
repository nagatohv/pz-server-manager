import React, { useState } from 'react';
import { Button } from '../atoms/Button.js';
import { Select } from '../atoms/Select.js';
import { InstanceCard } from '../molecules/InstanceCard.js';
import { CreateInstanceDialog, type CreateInstancePayload } from '../organisms/CreateInstanceDialog.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ButtonVariant, type BranchInfo, type BranchLoadState, type PzInstance, ServerStatus, type ServerStatusPayload } from '../../types.js';

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

interface CreateFormState {
  name: string;
  branch: string;
  gamePort: number;
  rconPort: number;
  maxPlayers: number;
}

const DEFAULT_FORM: CreateFormState = {
  name: '',
  branch: '',
  gamePort: 16261,
  rconPort: 27015,
  maxPlayers: 16
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const ServersPage: React.FC<ServersPageProps> = ({ harness, branches, branchesSource, branchesState, branchesError, onRefreshBranches, activeServerStatus, onStart, onStop, onConfigure }) => {
  const { registry, loading, error } = harness;
  const modal = useModal();
  const [createOpen, setCreateOpen] = useState(false);
  const [migrateTarget, setMigrateTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreate = async (payload: CreateInstancePayload) => {
    try {
      const instance = await harness.create(payload);
      setFeedback(`Servidor "${instance.name}" creado. ID: ${instance.id}`);
      setCreateOpen(false);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Error al crear el servidor');
    }
  };

  const handleSelect = async (id: string) => {
    try {
      const instance = await harness.select(id);
      setFeedback(`"${instance.name}" ahora es la instancia activa.`);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Error al activar');
    }
  };

  const handleInstall = async (id: string) => {
    try {
      const result = await harness.install(id);
      setFeedback(result.success
        ? `Instalación/actualización completada para "${result.instance.name}".`
        : `Falló la instalación: ${result.instance.lastError ?? 'ver logs'}`);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Error al instalar');
    }
  };

  const handleDelete = (id: string, name: string) => {
    modal.showConfirm({
      title: CLIENT_STRINGS.SERVERS_PAGE.CONFIRM_DELETE_TITLE,
      message: CLIENT_STRINGS.SERVERS_PAGE.CONFIRM_DELETE_MSG.replace('{name}', name),
      confirmText: CLIENT_STRINGS.SERVERS_PAGE.DELETE_BTN,
      onConfirm: async () => {
        try {
          await harness.remove(id);
          setFeedback(`Servidor "${name}" eliminado.`);
        } catch (err: unknown) {
          setFeedback(err instanceof Error ? err.message : 'Error al eliminar');
        }
      }
    });
  };

  const handleMigrate = async (sourceId: string, targetId: string) => {
    try {
      const result = await harness.migrate(sourceId, targetId);
      setFeedback(CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_SUCCESS
        .replace('{files}', String(result.filesCopied))
        .replace('{bytes}', formatBytes(result.bytesCopied)));
      setMigrateTarget(null);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Error al migrar');
    }
  };

  const migrateSourceOptions = migrateTarget
    ? registry.instances.filter((i) => i.id !== migrateTarget)
    : [];

  return (
    <div className="tab-content">
      <header className="tab-header">
        <h2>{CLIENT_STRINGS.SERVERS_PAGE.TITLE}</h2>
        <p className="tab-subtitle">{CLIENT_STRINGS.SERVERS_PAGE.SUBTITLE}</p>
      </header>

      {feedback && <div className="alert alert-info" role="status">{feedback}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="form-actions">
        <Button
          variant={ButtonVariant.Primary}
          onClick={() => setCreateOpen(true)}
          data-action="create-instance"
        >
          {CLIENT_STRINGS.SERVERS_PAGE.CREATE_BTN}
        </Button>
      </div>

      {registry.instances.length === 0 ? (
        <div className="empty-state">
          <h3>{CLIENT_STRINGS.SERVERS_PAGE.EMPTY_TITLE}</h3>
          <p>{CLIENT_STRINGS.SERVERS_PAGE.EMPTY_SUBTITLE}</p>
        </div>
      ) : (
        <ul className="instance-list" data-testid="instance-list">
          {registry.instances.map((instance) => (
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
            <h3>{CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_DIALOG_TITLE}</h3>
            <p>{CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_DIALOG_DESC}</p>
            <Select
              name="migrate-source"
              label={CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_SOURCE_LABEL}
              value=""
              onChange={() => undefined}
              options={[{ value: '', label: '-- seleccionar --' }, ...migrateSourceOptions.map((i) => ({ value: i.id, label: i.name }))]}
            />
            <p className="tab-subtitle">
              {CLIENT_STRINGS.SERVERS_PAGE.MIGRATE_DIALOG_DESC}
            </p>
            <div className="form-actions">
              <Button type="button" variant={ButtonVariant.Control} onClick={() => setMigrateTarget(null)}>
                Cancelar
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
