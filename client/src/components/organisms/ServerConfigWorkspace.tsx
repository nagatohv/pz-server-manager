import React, { FormEvent, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { FileIcon, PuzzleIcon, DatabaseIcon, TerminalIcon, TrashIcon } from '../atoms/Icon.js';
import { ButtonVariant, BranchInfo, BranchCatalogSource, BranchLoadState, ServerStatusPayload } from '../../types.js';
import { ConfigSubTab } from '../../hooks/useRouter.js';
import { useBackups } from '../../hooks/useBackups.js';

const ModsPanel = lazy(() => import('./ModsPanel.js').then((m) => ({ default: m.ModsPanel })));
const EditorPanel = lazy(() => import('./EditorPanel.js').then((m) => ({ default: m.EditorPanel })));
const BackupsPanel = lazy(() => import('./BackupsPanel.js').then((m) => ({ default: m.BackupsPanel })));
const ConsolePanel = lazy(() => import('./ConsolePanel.js').then((m) => ({ default: m.ConsolePanel })));
import { useModal } from '../../hooks/useModal.js';
import { AlertModal } from '../molecules/AlertModal.js';
import { ApiService } from '../../services/apiService.js';
import { StatusWidget } from '../molecules/StatusWidget.js';
import { IDLE_WIDGET_COLOR, PLAYERS_WIDGET_COLOR } from '../../config/constants.js';
import { ServerStatus } from '../../types.js';
import type {
  IniSettingItem,
  PanelConfig,
  ModItem,
  EditorType,
  EditorMode,
  PzInstance
} from '../../types.js';

const calcMemoryPercent = (usedMb: number, totalMb: number): number => {
  if (!totalMb || totalMb <= 0) return 0;
  return Math.min(100, Math.round((usedMb / totalMb) * 100));
};

const formatIdleTime = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

interface ServerConfigWorkspaceProps {
  instance: PzInstance;
  token?: string | null;
  activeSubTab: ConfigSubTab;
  iniSettings: IniSettingItem[];
  panelConfig: PanelConfig;
  modsList: ModItem[];
  editorType: EditorType;
  editorMode: EditorMode;
  parsedConfigData: unknown;
  rawConfigText: string;
  savedMessage: string;
  onSubTabChange: (tab: ConfigSubTab) => void;
  onBackToServers: () => void;
  onIniSettingChange: (key: string, val: string) => void;
  onPanelConfigChange: (field: keyof PanelConfig, val: unknown) => void;
  onSaveSettings: (e: FormEvent) => void;
  onAddMod: (modId: string, workshopId: string) => void;
  onRemoveMod: (index: number) => void;
  onSaveMods: () => void;
  onEditorTypeChange: (type: EditorType) => void;
  onEditorModeChange: (mode: EditorMode) => void;
  onRawTextChange: (text: string) => void;
  onUpdateSandboxValue: (pathStr: string, val: unknown) => void;
  onToggleSpawnRegion: (index: number) => void;
  onRemoveSpawnRegion: (index: number) => void;
  onSaveEditor: (e: FormEvent) => void;

  // Console control props
  status: ServerStatusPayload;
  logs: string[];
  selectedBranch: string;
  availableBranches: BranchInfo[];
  branchesState: BranchLoadState;
  branchesError: string | null;
  branchesSource: BranchCatalogSource;
  onBranchChange: (branch: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onUpdate: () => void;
  onRefreshBranches: () => void;
  onSendCommand: (cmd: string) => void;
  activeInstanceId: string | null;
  onSelectInstance: (id: string) => void;
}

export const ServerConfigWorkspace: React.FC<ServerConfigWorkspaceProps> = ({
  instance,
  token,
  activeSubTab = 'console',
  iniSettings,
  panelConfig,
  modsList,
  editorType,
  editorMode,
  parsedConfigData,
  rawConfigText,
  savedMessage,
  onSubTabChange,
  onBackToServers,
  onIniSettingChange,
  onPanelConfigChange,
  onSaveSettings,
  onAddMod,
  onRemoveMod,
  onSaveMods,
  onEditorTypeChange,
  onEditorModeChange,
  onRawTextChange,
  onUpdateSandboxValue,
  onToggleSpawnRegion,
  onRemoveSpawnRegion,
  onSaveEditor,
  status,
  logs,
  selectedBranch,
  availableBranches,
  branchesState,
  branchesError,
  branchesSource,
  onBranchChange,
  onStart,
  onStop,
  onRestart,
  onKill,
  onUpdate,
  onRefreshBranches,
  onSendCommand,
  activeInstanceId,
  onSelectInstance
}) => {
  const { t } = useTranslation();
  const modal = useModal();
  const [cleaning, setCleaning] = useState(false);

  const {
    backups,
    loading: backupsLoading,
    error: backupsError,
    refreshBackups,
    createBackup,
    restoreBackup,
    deleteBackup
  } = useBackups({ token: token ?? null, instanceId: instance.id });

  const handleCleanup = () => {
    modal.showConfirm({
      title: t('cleanup.confirmTitle'),
      message: t('cleanup.confirmMsg'),
      confirmText: t('cleanup.confirmBtn'),
      onConfirm: async () => {
        if (!token) return;
        setCleaning(true);
        try {
          const res = await ApiService.cleanupInstance(token, instance.id);
          modal.showAlert({
            type: 'success',
            title: t('cleanup.successTitle'),
            message: t('cleanup.successShort', { space: formatBytes(res.bytesFreed) })
          });
          refreshBackups();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : t('cleanup.errorDefault');
          modal.showAlert({
            type: 'error',
            title: t('common.error'),
            message: msg
          });
        } finally {
          setCleaning(false);
        }
      }
    });
  };

  const isServerRunning = activeInstanceId === instance.id && status.status === ServerStatus.Running;
  const currentStatus = activeInstanceId === instance.id ? status.status : ServerStatus.Stopped;
  const onlinePlayers = isServerRunning ? (status.onlinePlayers ?? 0) : 0;
  const cpuPercent = isServerRunning ? (status.stats?.cpu ?? 0) : 0;
  const memoryMb = isServerRunning ? (status.stats?.memory ?? 0) : 0;
  const memoryTotalMb = isServerRunning ? (status.stats?.memoryTotal ?? 0) : 0;
  const memoryPercent = calcMemoryPercent(memoryMb, memoryTotalMb);

  const getStatusLabel = (statusVal: ServerStatus): string => {
    switch (statusVal) {
      case ServerStatus.Running: return t('common.online');
      case ServerStatus.Starting: return t('common.starting');
      case ServerStatus.Updating: return t('common.updating');
      case ServerStatus.Stopping: return t('common.stopping');
      case ServerStatus.Crashed: return t('common.crashed');
      default: return t('common.stopped');
    }
  };

  const statusLabel = getStatusLabel(currentStatus);
  const isIdleActive = activeInstanceId === instance.id && !!status.idleShutdown?.active;
  const remainingIdleSeconds = isIdleActive ? (status.idleShutdown?.remainingSeconds ?? 0) : 0;

  return (
    <div className="server-config-workspace">
      <div className="server-config-workspace__header">
        <div className="server-config-workspace__title-group">
          <Button variant={ButtonVariant.Control} onClick={onBackToServers} data-action="back-to-servers">
            &larr; {t('nav.servers')}
          </Button>
          <h2 className="server-config-workspace__title">
            {t('nav.editor')}: <span>{instance.name}</span>
          </h2>
        </div>

        <div className="server-config-workspace__actions">
          <Button
            variant={ButtonVariant.Warning}
            onClick={handleCleanup}
            disabled={cleaning}
            data-action="cleanup-disk"
            title={t('cleanup.btnTitle')}
          >
            <TrashIcon /> {cleaning ? t('cleanup.btnCleaning') : t('cleanup.btn')}
          </Button>
        </div>

        <nav className="nav-tabs server-config-workspace__tabs">
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'console'}
            onClick={() => onSubTabChange('console')}
          >
            <TerminalIcon /> {t('nav.console')}
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'editor'}
            onClick={() => onSubTabChange('editor')}
          >
            <FileIcon /> {t('nav.editor')}
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'mods'}
            onClick={() => onSubTabChange('mods')}
          >
            <PuzzleIcon /> {t('nav.mods')}
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'backups'}
            onClick={() => onSubTabChange('backups')}
          >
            <DatabaseIcon /> {t('nav.backups')}
          </Button>
        </nav>

        <div className="header-status-grid server-config-workspace__status-grid-container">
          <StatusWidget
            title={t('header.status')}
            badge={{ status: currentStatus, label: statusLabel }}
          />

          <StatusWidget
            title={t('header.players')}
            value={isServerRunning ? onlinePlayers : '-'}
            subtitle={isServerRunning ? t('common.online') : t('common.stopped')}
            color={PLAYERS_WIDGET_COLOR}
          />

          <StatusWidget
            title={t('header.cpu')}
            value={`${cpuPercent}%`}
            progress={cpuPercent}
          />

          <StatusWidget
            title={t('header.ram')}
            value={`${memoryMb} MB`}
            progress={memoryPercent}
          />

          {isIdleActive && (
            <StatusWidget
              title={t('header.idleShutdown')}
              value={formatIdleTime(remainingIdleSeconds)}
              subtitle={t('header.autoOff')}
              color={IDLE_WIDGET_COLOR}
            />
          )}
        </div>
      </div>

      <div className="server-config-workspace__body">
        <Suspense fallback={<div className="empty-state"><p>{t('common.loadingPanel')}</p></div>}>
          {activeSubTab === 'console' && (
            activeInstanceId === instance.id ? (
              <ConsolePanel
                status={status}
                logs={logs}
                selectedBranch={selectedBranch}
                availableBranches={availableBranches}
                branchesState={branchesState}
                branchesError={branchesError}
                branchesSource={branchesSource}
                onBranchChange={onBranchChange}
                onStart={onStart}
                onStop={onStop}
                onRestart={onRestart}
                onKill={onKill}
                onUpdate={onUpdate}
                onRefreshBranches={onRefreshBranches}
                onSendCommand={onSendCommand}
                instances={[instance]}
                activeInstanceId={activeInstanceId}
                onSelectInstance={async () => {}}
                hideServerSelect={true}
              />
            ) : (
              <div className="active-server-notice">
                <h4 className="active-server-notice__title">
                  {t('workspace.notActiveTitle')}
                </h4>
                <p className="active-server-notice__body">
                  {t('workspace.notActiveBody')}
                </p>
                <Button
                  variant={ButtonVariant.Success}
                  onClick={() => onSelectInstance(instance.id)}
                  data-action="activate-server"
                >
                  {t('workspace.activateToControl', { name: instance.name })}
                </Button>
              </div>
            )
          )}

          {activeSubTab === 'editor' && (
            <EditorPanel
              editorType={editorType}
              editorMode={editorMode}
              parsedConfigData={parsedConfigData}
              rawConfigText={rawConfigText}
              panelConfig={panelConfig}
              onPanelConfigChange={onPanelConfigChange}
              onIniSettingChange={onIniSettingChange}
              onTypeChange={onEditorTypeChange}
              onModeChange={onEditorModeChange}
              onRawTextChange={onRawTextChange}
              onUpdateSandboxValue={onUpdateSandboxValue}
              onToggleSpawnRegion={onToggleSpawnRegion}
              onRemoveSpawnRegion={onRemoveSpawnRegion}
              onSave={onSaveEditor}
              savedMessage={savedMessage}
            />
          )}

          {activeSubTab === 'mods' && (
            <ModsPanel
              modsList={modsList}
              onAddMod={onAddMod}
              onRemoveMod={onRemoveMod}
              onSaveMods={onSaveMods}
              savedMessage={savedMessage}
            />
          )}

          {activeSubTab === 'backups' && (
            <BackupsPanel
              backups={backups}
              loading={backupsLoading}
              error={backupsError}
              onRefresh={refreshBackups}
              onCreate={(note) => createBackup(note)}
              onRestore={(backupId) => restoreBackup(backupId)}
              onDelete={(backupId) => deleteBackup(backupId)}
            />
          )}
        </Suspense>
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
