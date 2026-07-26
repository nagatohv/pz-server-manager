import React, { useState, FormEvent } from 'react';
import { Header } from '../organisms/Header.js';
import { NavTabs } from '../molecules/NavTabs.js';
import { ConsolePanel } from '../organisms/ConsolePanel.js';
import { SettingsPanel } from '../organisms/SettingsPanel.js';
import { ModsPanel } from '../organisms/ModsPanel.js';
import { EditorPanel } from '../organisms/EditorPanel.js';
import {
  ServerStatusPayload,
  IniSettingItem,
  PanelConfig,
  ModItem,
  EditorType,
  EditorMode,
  PortalTab
} from '../../types.js';

interface PortalPageProps {
  status: ServerStatusPayload;
  logs: string[];
  iniSettings: IniSettingItem[];
  panelConfig: PanelConfig;
  modsList: ModItem[];
  editorType: EditorType;
  editorMode: EditorMode;
  parsedConfigData: unknown;
  rawConfigText: string;
  selectedBranch: string;
  savedMessage: string;
  onLogout: () => void;
  onBranchChange: (branch: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onUpdate: () => void;
  onSendCommand: (cmd: string) => void;
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

export const PortalPage: React.FC<PortalPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<PortalTab>(PortalTab.Console);

  const tabContent: Record<PortalTab, React.ReactNode> = {
    [PortalTab.Console]: (
      <ConsolePanel
        status={props.status}
        logs={props.logs}
        selectedBranch={props.selectedBranch}
        onBranchChange={props.onBranchChange}
        onStart={props.onStart}
        onStop={props.onStop}
        onRestart={props.onRestart}
        onKill={props.onKill}
        onUpdate={props.onUpdate}
        onSendCommand={props.onSendCommand}
      />
    ),
    [PortalTab.Settings]: (
      <SettingsPanel
        iniSettings={props.iniSettings}
        panelConfig={props.panelConfig}
        onIniSettingChange={props.onIniSettingChange}
        onPanelConfigChange={props.onPanelConfigChange}
        onSave={props.onSaveSettings}
        savedMessage={props.savedMessage}
      />
    ),
    [PortalTab.Mods]: (
      <ModsPanel
        modsList={props.modsList}
        onAddMod={props.onAddMod}
        onRemoveMod={props.onRemoveMod}
        onSaveMods={props.onSaveMods}
        savedMessage={props.savedMessage}
      />
    ),
    [PortalTab.Editor]: (
      <EditorPanel
        editorType={props.editorType}
        editorMode={props.editorMode}
        parsedConfigData={props.parsedConfigData}
        rawConfigText={props.rawConfigText}
        onTypeChange={props.onEditorTypeChange}
        onModeChange={props.onEditorModeChange}
        onRawTextChange={props.onRawTextChange}
        onUpdateSandboxValue={props.onUpdateSandboxValue}
        onToggleSpawnRegion={props.onToggleSpawnRegion}
        onRemoveSpawnRegion={props.onRemoveSpawnRegion}
        onSave={props.onSaveEditor}
        savedMessage={props.savedMessage}
      />
    )
  };

  return (
    <div className="portal-container">
      <Header status={props.status} onLogout={props.onLogout} />

      <main className="portal-main">
        <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="tab-body">
          {tabContent[activeTab]}
        </div>
      </main>
    </div>
  );
};
