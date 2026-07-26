import React, { FormEvent } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useServerStatus } from './hooks/useServerStatus.js';
import { useConfigManager } from './hooks/useConfigManager.js';
import { LoginPage } from './components/pages/LoginPage.js';
import { PortalPage } from './components/pages/PortalPage.js';
import { ServerAction } from './types.js';
import './App.css';

export default function App() {
  const { token, isAuthenticated, login, logout } = useAuth();
  const server = useServerStatus(token, logout);
  const config = useConfigManager(token, logout);

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    config.saveSettings().catch((err: Error) => alert(err.message));
  };

  const handleSaveEditor = (e: FormEvent) => {
    e.preventDefault();
    config.saveEditor().catch((err: Error) => alert(err.message));
  };

  return (
    <PortalPage
      status={server.status}
      logs={server.logs}
      iniSettings={config.iniSettings}
      panelConfig={config.panelConfig}
      modsList={config.modsList}
      editorType={config.editorType}
      editorMode={config.editorMode}
      parsedConfigData={config.parsedConfigData}
      rawConfigText={config.rawConfigText}
      selectedBranch={server.selectedBranch}
      savedMessage={config.savedMessage}
      onLogout={logout}
      onBranchChange={server.setSelectedBranch}
      onStart={() => server.executeAction(ServerAction.Start)}
      onStop={() => server.executeAction(ServerAction.Stop)}
      onRestart={() => server.executeAction(ServerAction.Restart)}
      onKill={() => server.executeAction(ServerAction.Kill)}
      onUpdate={() => server.executeAction(ServerAction.Update, server.selectedBranch)}
      onSendCommand={server.sendCommand}
      onIniSettingChange={config.updateIniSetting}
      onPanelConfigChange={config.updatePanelConfigField as (field: keyof import('./types.js').PanelConfig, val: unknown) => void}
      onSaveSettings={handleSaveSettings}
      onAddMod={config.addMod}
      onRemoveMod={config.removeMod}
      onSaveMods={() => config.saveMods().catch((err: Error) => alert(err.message))}
      onEditorTypeChange={config.setEditorType}
      onEditorModeChange={config.setEditorMode}
      onRawTextChange={config.setRawConfigText}
      onUpdateSandboxValue={config.updateSandboxValue}
      onToggleSpawnRegion={config.toggleSpawnRegion}
      onRemoveSpawnRegion={config.removeSpawnRegion}
      onSaveEditor={handleSaveEditor}
    />
  );
}
