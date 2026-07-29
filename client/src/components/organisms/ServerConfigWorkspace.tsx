import React, { FormEvent } from 'react';
import { ModsPanel } from './ModsPanel.js';
import { EditorPanel } from './EditorPanel.js';
import { BackupsPanel } from './BackupsPanel.js';
import { Button } from '../atoms/Button.js';
import { FileIcon, PuzzleIcon, DatabaseIcon } from '../atoms/Icon.js';
import { ButtonVariant } from '../../types.js';
import { ConfigSubTab } from '../../hooks/useRouter.js';
import { useBackups } from '../../hooks/useBackups.js';
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
  iniSettings
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
