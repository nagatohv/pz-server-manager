import React, { FormEvent } from 'react';
import { ModsPanel } from './ModsPanel.js';
import { EditorPanel } from './EditorPanel.js';
import { BackupsPanel } from './BackupsPanel.js';
import { Button } from '../atoms/Button.js';
import { FileIcon, PuzzleIcon, DatabaseIcon, TerminalIcon } from '../atoms/Icon.js';
import { ButtonVariant, BranchInfo, BranchCatalogSource, BranchLoadState, ServerStatusPayload } from '../../types.js';
import { ConfigSubTab } from '../../hooks/useRouter.js';
import { useBackups } from '../../hooks/useBackups.js';
import { ConsolePanel } from './ConsolePanel.js';
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
      </div>

      <div className="server-config-workspace__body">
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
            <div className="active-server-notice card p-4 text-center my-4" style={{ margin: '2rem auto', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 className="mb-3 text-warning" style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                Este no es el servidor activo actual
              </h4>
              <p className="mb-4" style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
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
      </div>
    </div>
  );
};
