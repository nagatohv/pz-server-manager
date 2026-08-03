import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { Input } from '../atoms/Input.js';
import { DatabaseIcon, RefreshIcon, TrashIcon, RestartIcon } from '../atoms/Icon.js';
import { useModal } from '../../hooks/useModal.js';
import { AlertModal } from '../molecules/AlertModal.js';
import { ButtonVariant, type PzBackup } from '../../types.js';

interface BackupsPanelProps {
  backups: PzBackup[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreate: (note?: string) => Promise<unknown>;
  onRestore: (backupId: string) => Promise<unknown>;
  onDelete: (backupId: string) => Promise<unknown>;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const BackupsPanel: React.FC<BackupsPanelProps> = ({
  backups,
  loading,
  error,
  onRefresh,
  onCreate,
  onRestore,
  onDelete
}) => {
  const { t } = useTranslation();
  const modal = useModal();
  const [noteInput, setNoteInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');

  const startProgressSimulation = (title: string): (() => void) => {
    setProgressVisible(true);
    setProgress(0);
    setProgressTitle(title);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          return prev + Math.floor(Math.random() * 5) + 3;
        }
        if (prev < 75) {
          return prev + Math.floor(Math.random() * 3) + 1;
        }
        if (prev < 95) {
          return prev + 0.5;
        }
        return prev;
      });
    }, 150);

    return () => {
      clearInterval(interval);
    };
  };

  const endProgressSimulation = async () => {
    setProgress(100);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setProgressVisible(false);
    setProgress(0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setFeedback(null);
    const stopSim = startProgressSimulation(t('backups.creating'));
    try {
      await onCreate(noteInput);
      setNoteInput('');
      setFeedback(t('backups.feedbackCreateOk'));
      stopSim();
      await endProgressSimulation();
    } catch (err: unknown) {
      stopSim();
      setProgressVisible(false);
      setFeedback(err instanceof Error ? err.message : t('backups.errorCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = (backup: PzBackup) => {
    modal.showConfirm({
      title: t('backups.confirmRestoreTitle'),
      message: t('backups.confirmRestoreMsg', { name: backup.note || backup.name }),
      confirmText: t('backups.restoreBtn'),
      onConfirm: async () => {
        setFeedback(null);
        const stopSim = startProgressSimulation(t('backups.creating'));
        try {
          await onRestore(backup.id);
          setFeedback(t('backups.feedbackRestoreOk', { name: backup.name }));
          stopSim();
          await endProgressSimulation();
        } catch (err: unknown) {
          stopSim();
          setProgressVisible(false);
          setFeedback(err instanceof Error ? err.message : t('backups.errorRestore'));
        }
      }
    });
  };

  const handleDelete = (backup: PzBackup) => {
    modal.showConfirm({
      title: t('backups.confirmDeleteTitle'),
      message: t('backups.confirmDeleteMsg', { name: backup.note || backup.name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        setFeedback(null);
        const stopSim = startProgressSimulation(t('backups.creating'));
        try {
          await onDelete(backup.id);
          setFeedback(t('backups.feedbackDeleteOk', { name: backup.name }));
          stopSim();
          await endProgressSimulation();
        } catch (err: unknown) {
          stopSim();
          setProgressVisible(false);
          setFeedback(err instanceof Error ? err.message : t('backups.errorDelete'));
        }
      }
    });
  };

  return (
    <div className="panel backups-panel" data-component="backups-panel">
      <header className="panel-header">
        <div className="panel-header__title">
          <h3>
            <DatabaseIcon /> {t('backups.title')}
          </h3>
          <p className="panel-header__subtitle">{t('backups.subtitle')}</p>
        </div>
        <Button
          type="button"
          variant={ButtonVariant.Control}
          onClick={onRefresh}
          disabled={loading}
          className="btn-sm"
          title={t('backups.refreshBtn')}
        >
          <RefreshIcon /> {t('backups.refreshBtn')}
        </Button>
      </header>

      {feedback && <div className="alert alert-info" role="status">{feedback}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {progressVisible && (
        <div className="backup-progress-card">
          <div className="backup-progress-card__header">
            <span className="backup-progress-card__title">{progressTitle}</span>
            <span className="backup-progress-card__percent">{Math.round(progress)}%</span>
          </div>
          <div className="backup-progress-card__track">
            <div
              className="backup-progress-card__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <form className="backups-create-form" onSubmit={handleCreate}>
        <div className="form-row align-end">
          <Input
            name="note"
            label={t('backups.noteLabel')}
            placeholder={t('backups.notePlaceholder')}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            disabled={creating || loading}
          />
          <Button
            type="submit"
            variant={ButtonVariant.Primary}
            disabled={creating || loading}
            data-action="create-backup"
          >
            <DatabaseIcon /> {creating ? t('backups.creating') : t('backups.createBtn')}
          </Button>
        </div>
      </form>

      <div className="backups-list-container">
        {backups.length === 0 ? (
          <div className="empty-state">
            <h4>{t('backups.emptyTitle')}</h4>
            <p>{t('backups.emptyDesc')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table backups-table">
              <thead>
                <tr>
                  <th>{t('backups.colName')}</th>
                  <th>{t('backups.colDate')}</th>
                  <th>{t('backups.colNote')}</th>
                  <th>{t('backups.colSize')}</th>
                  <th className="text-right">{t('backups.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td className="font-mono text-cyan">{backup.id}</td>
                    <td>{new Date(backup.createdAt).toLocaleString()}</td>
                    <td>{backup.note || <span className="text-muted">{t('backups.noNote')}</span>}</td>
                    <td className="font-mono">{formatBytes(backup.sizeBytes)}</td>
                    <td className="text-right actions-cell">
                      <Button
                        type="button"
                        variant={ButtonVariant.Warning}
                        onClick={() => handleRestore(backup)}
                        disabled={loading}
                        className="btn-sm"
                        title={t('backups.restoreBtn')}
                      >
                        <RestartIcon /> {t('backups.restoreBtn')}
                      </Button>
                      <Button
                        type="button"
                        variant={ButtonVariant.Danger}
                        onClick={() => handleDelete(backup)}
                        disabled={loading}
                        className="btn-sm"
                        title={t('common.delete')}
                      >
                        <TrashIcon /> {t('common.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
