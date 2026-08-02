import React, { FormEvent, useState, lazy, Suspense } from 'react';
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
import { CLIENT_STRINGS } from '../../config/strings.js';
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
  onSelectInstance: (id: string) => Promise<unknown>;
}

const STATUS_LABEL_MAP: Record<ServerStatus, string> = {
  [ServerStatus.Running]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_ONLINE,
  [ServerStatus.Stopped]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_OFFLINE,
  [ServerStatus.Starting]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_STARTING,
  [ServerStatus.Stopping]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_STOPPING,
  [ServerStatus.Updating]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_UPDATING,
  [ServerStatus.Crashed]: CLIENT_STRINGS.STATUS_WIDGETS.STATUS_CRASHED
};

const formatIdleTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const calcMemoryPercent = (memory: number, memoryTotal: number): number =>
  memoryTotal > 0 ? Math.round((memory / memoryTotal) * 100) : 0;

export const ServerConfigWorkspace: React.FC<ServerConfigWorkspaceProps> = ({
  instance,
  token = null,
  activeSubTab,
  panelConfig,
  modsList,
  editorType,
  editorMode,
  parsedConfigData,
  rawConfigText,
  savedMessage,
  onSubTabChange,
  onBackToServers,
  onPanelConfigChange,
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
  onIniSettingChange,
  iniSettings,
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
  const {
    backups,
    loading: backupsLoading,
    error: backupsError,
    refreshBackups,
    createBackup,
    restoreBackup,
    deleteBackup
  } = useBackups(token, instance.id);

  const modal = useModal();
  const [cleaning, setCleaning] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanup = () => {
    modal.showConfirm({
      title: CLIENT_STRINGS.CLEANUP.CONFIRM_TITLE,
      message: CLIENT_STRINGS.CLEANUP.CONFIRM_MSG,
      confirmText: CLIENT_STRINGS.CLEANUP.CONFIRM_BTN,
      onConfirm: async () => {
        if (!token) return;
        setCleaning(true);
        try {
          const res = await ApiService.cleanupInstance(token, instance.id);
          modal.showAlert({
            title: CLIENT_STRINGS.CLEANUP.SUCCESS_TITLE,
            message: CLIENT_STRINGS.CLEANUP.SUCCESS_MSG
              .replace('{space}', formatBytes(res.bytesFreed))
              .replace('{count}', String(res.filesRemoved))
          });
          refreshBackups();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : CLIENT_STRINGS.CLEANUP.ERROR_DEFAULT;
          modal.showAlert({
            type: 'error',
            title: CLIENT_STRINGS.CLEANUP.ERROR_TITLE,
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
  const statusLabel = STATUS_LABEL_MAP[currentStatus] ?? CLIENT_STRINGS.STATUS_WIDGETS.STATUS_OFFLINE;
  const isIdleActive = activeInstanceId === instance.id && !!status.idleShutdown?.active;
  const remainingIdleSeconds = isIdleActive ? (status.idleShutdown?.remainingSeconds ?? 0) : 0;

  return (
    <div className="server-config-workspace">
      <div className="server-config-workspace__header">
        <div className="server-config-workspace__title-group">
          <Button variant={ButtonVariant.Control} onClick={onBackToServers} data-action="back-to-servers">
            &larr; Volver a Servidores
          </Button>
          <h2 className="server-config-workspace__title">
            Configuración de Servidor: <span>{instance.name}</span>
          </h2>
        </div>

        <div className="server-config-workspace__actions">
          <Button
            variant={ButtonVariant.Warning}
            onClick={handleCleanup}
            disabled={cleaning}
            title={CLIENT_STRINGS.CLEANUP.BTN_TITLE}
            data-action="cleanup-disk"
          >
            <TrashIcon /> {cleaning ? CLIENT_STRINGS.CLEANUP.BTN_CLEANING : CLIENT_STRINGS.CLEANUP.BTN_CLEANUP}
          </Button>
        </div>

        <nav className="nav-tabs server-config-workspace__tabs">
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'console'}
            onClick={() => onSubTabChange('console')}
          >
            <TerminalIcon /> Consola / Terminal
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'editor'}
            onClick={() => onSubTabChange('editor')}
          >
            <FileIcon /> Editor Avanzado
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'mods'}
            onClick={() => onSubTabChange('mods')}
          >
            <PuzzleIcon /> Gestión de Mods
          </Button>
          <Button
            variant={ButtonVariant.Nav}
            active={activeSubTab === 'backups'}
            onClick={() => onSubTabChange('backups')}
          >
            <DatabaseIcon /> Respaldos (Backups)
          </Button>
        </nav>

        <div className="header-status-grid server-config-workspace__status-grid-container">
          <StatusWidget
            title={CLIENT_STRINGS.STATUS_WIDGETS.SERVER_STATUS_TITLE}
            badge={{ status: currentStatus, label: statusLabel }}
          />

          <StatusWidget
            title={CLIENT_STRINGS.STATUS_WIDGETS.ONLINE_PLAYERS_TITLE}
            value={isServerRunning ? onlinePlayers : '-'}
            subtitle={isServerRunning ? CLIENT_STRINGS.STATUS_WIDGETS.PLAYERS_CONNECTED : CLIENT_STRINGS.STATUS_WIDGETS.PLAYERS_STOPPED}
            color={PLAYERS_WIDGET_COLOR}
          />

          <StatusWidget
            title={CLIENT_STRINGS.STATUS_WIDGETS.CPU_USAGE_TITLE}
            value={`${cpuPercent}%`}
            progress={cpuPercent}
          />

          <StatusWidget
            title={CLIENT_STRINGS.STATUS_WIDGETS.MEMORY_USAGE_TITLE}
            value={`${memoryMb} MB`}
            progress={memoryPercent}
          />

          {isIdleActive && (
            <StatusWidget
              title={CLIENT_STRINGS.STATUS_WIDGETS.IDLE_SHUTDOWN_TITLE}
              value={formatIdleTime(remainingIdleSeconds)}
              subtitle={CLIENT_STRINGS.STATUS_WIDGETS.IDLE_SUBTITLE}
              color={IDLE_WIDGET_COLOR}
            />
          )}
        </div>
      </div>

      <div className="server-config-workspace__body">
        <Suspense fallback={<div className="empty-state"><p>Cargando panel...</p></div>}>
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
                  Este no es el servidor activo actual
                </h4>
                <p className="active-server-notice__body">
                  La consola, comandos RCON y controles de ejecución en tiempo real solo están disponibles para el servidor activo en el backend.
                </p>
                <Button
                  variant={ButtonVariant.Success}
                  onClick={() => onSelectInstance(instance.id)}
                  data-action="activate-server"
                >
                  Activar "{instance.name}" para controlar
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
