import React, { FormEvent, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useServerStatus } from './hooks/useServerStatus.js';
import { useConfigManager } from './hooks/useConfigManager.js';
import { useInstances } from './hooks/useInstances.js';
import { useRouter } from './hooks/useRouter.js';
import { useModal } from './hooks/useModal.js';
import { LoginPage } from './components/pages/LoginPage.js';
import { PortalPage } from './components/pages/PortalPage.js';
import { AlertModal } from './components/molecules/AlertModal.js';
import { ServerAction } from './types.js';
import './App.css';

export default function App() {
  const modal = useModal();
  const { token, isAuthenticated, login, logout } = useAuth();
  const router = useRouter();

  const handleServerError = useCallback((msg: string) => {
    modal.showAlert({ type: 'error', message: msg });
  }, [modal]);

  const server = useServerStatus(token, logout, handleServerError);
  const config = useConfigManager(token, logout, router.route.serverId);
  const instances = useInstances(token, logout);

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    config.saveSettings().catch((err: Error) => modal.showAlert({ type: 'error', message: err.message }));
  };

  const handleSaveEditor = (e: FormEvent) => {
    e.preventDefault();
    config.saveEditor().catch((err: Error) => modal.showAlert({ type: 'error', message: err.message }));
  };

  const handleSaveMods = () => {
    config.saveMods().catch((err: Error) => modal.showAlert({ type: 'error', message: err.message }));
  };

  return (
    <>
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
        availableBranches={server.availableBranches}
        branchesState={server.branchesState}
        branchesError={server.branchesError}
        branchesSource={server.branchesSource}
        savedMessage={config.savedMessage}
        instances={{
          ...instances.registry,
          loading: instances.loading,
          error: instances.error
        }}
        route={router.route}
        onNavigateToConsole={router.navigateToConsole}
        onNavigateToServers={router.navigateToServers}
        onNavigateToServerConfig={router.navigateToServerConfig}
        onLogout={logout}
        onBranchChange={server.setSelectedBranch}
        onStart={() => server.executeAction(ServerAction.Start)}
        onStop={() => server.executeAction(ServerAction.Stop)}
        onRestart={() => server.executeAction(ServerAction.Restart)}
        onKill={() => server.executeAction(ServerAction.Kill)}
        onUpdate={() => server.executeAction(ServerAction.Update, server.selectedBranch)}
        onRefreshBranches={server.refreshBranches}
        onSendCommand={server.sendCommand}
        onIniSettingChange={config.updateIniSetting}
        onPanelConfigChange={config.updatePanelConfigField as (field: keyof import('./types.js').PanelConfig, val: unknown) => void}
        onSaveSettings={handleSaveSettings}
        onAddMod={config.addMod}
        onRemoveMod={config.removeMod}
        onSaveMods={handleSaveMods}
        onEditorTypeChange={config.setEditorType}
        onEditorModeChange={config.setEditorMode}
        onRawTextChange={config.setRawConfigText}
        onUpdateSandboxValue={config.updateSandboxValue}
        onToggleSpawnRegion={config.toggleSpawnRegion}
        onRemoveSpawnRegion={config.removeSpawnRegion}
        onSaveEditor={handleSaveEditor}
        onCreateInstance={instances.create}
        onSelectInstance={instances.select}
        onInstallInstance={instances.install}
        onDeleteInstance={instances.remove}
        onMigrateInstance={instances.migrate}
        token={token}
      />
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
    </>
  );
}
