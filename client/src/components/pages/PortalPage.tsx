import React, { FormEvent } from 'react';
import { Header, ServerConfigWorkspace } from '../organisms/index.js';
import { ServersPage } from './ServersPage.js';
import { PortalLayout } from '../templates/index.js';
import { RouteState, ConfigSubTab } from '@/hooks/useRouter';
import type {
  BranchInfo,
  BranchCatalogSource,
  BranchLoadState,
  ServerStatusPayload,
  IniSettingItem,
  PanelConfig,
  ModItem,
  EditorType,
  EditorMode,
  PzInstance
} from '@/types';

export interface ServerStateProps {
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
}

export interface ConfigStateProps {
  iniSettings: IniSettingItem[];
  panelConfig: PanelConfig;
  modsList: ModItem[];
  editorType: EditorType;
  editorMode: EditorMode;
  parsedConfigData: unknown;
  rawConfigText: string;
  savedMessage: string;
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

export interface InstanceManagementProps {
  instances: { instances: PzInstance[]; activeInstanceId: string | null; loading: boolean; error: string | null };
  onCreateInstance: (input: { name: string; branch: string; gamePort: number; rconPort: number; maxPlayers: number }) => Promise<unknown>;
  onSelectInstance: (id: string) => Promise<unknown>;
  onInstallInstance: (id: string) => Promise<unknown>;
  onDeleteInstance: (id: string) => Promise<unknown>;
  onMigrateInstance: (sourceId: string, targetId: string) => Promise<unknown>;
}

export interface PortalPageProps extends ServerStateProps, ConfigStateProps, InstanceManagementProps {
  route: RouteState;
  token?: string | null;
  onNavigateToServers: () => void;
  onNavigateToServerConfig: (serverId: string, subTab?: ConfigSubTab) => void;
  onLogout: () => void;
}

export const PortalPage: React.FC<PortalPageProps> = (props) => {
  const { route, onNavigateToServers, onNavigateToServerConfig } = props;

  const configuredInstance = route.path === 'server-config' && route.serverId
    ? props.instances.instances.find((i) => i.id === route.serverId)
    : null;

  return (
    <PortalLayout header={<Header onLogout={props.onLogout} />}>
      {route.path === 'server-config' && configuredInstance && (
        <ServerConfigWorkspace
          instance={configuredInstance}
          token={props.token}
          activeSubTab={route.configSubTab}
          iniSettings={props.iniSettings}
          panelConfig={props.panelConfig}
          modsList={props.modsList}
          editorType={props.editorType}
          editorMode={props.editorMode}
          parsedConfigData={props.parsedConfigData}
          rawConfigText={props.rawConfigText}
          savedMessage={props.savedMessage}
          onSubTabChange={(subTab) => onNavigateToServerConfig(configuredInstance.id, subTab)}
          onBackToServers={onNavigateToServers}
          onIniSettingChange={props.onIniSettingChange}
          onPanelConfigChange={props.onPanelConfigChange}
          onSaveSettings={props.onSaveSettings}
          onAddMod={props.onAddMod}
          onRemoveMod={props.onRemoveMod}
          onSaveMods={props.onSaveMods}
          onEditorTypeChange={props.onEditorTypeChange}
          onEditorModeChange={props.onEditorModeChange}
          onRawTextChange={props.onRawTextChange}
          onUpdateSandboxValue={props.onUpdateSandboxValue}
          onToggleSpawnRegion={props.onToggleSpawnRegion}
          onRemoveSpawnRegion={props.onRemoveSpawnRegion}
          onSaveEditor={props.onSaveEditor}
          status={props.status}
          logs={props.logs}
          selectedBranch={props.selectedBranch}
          availableBranches={props.availableBranches}
          branchesState={props.branchesState}
          branchesError={props.branchesError}
          branchesSource={props.branchesSource}
          onBranchChange={props.onBranchChange}
          onStart={props.onStart}
          onStop={props.onStop}
          onRestart={props.onRestart}
          onKill={props.onKill}
          onUpdate={props.onUpdate}
          onRefreshBranches={props.onRefreshBranches}
          onSendCommand={props.onSendCommand}
          activeInstanceId={props.instances.activeInstanceId}
          onSelectInstance={props.onSelectInstance}
        />
      )}

      {route.path === 'servers' && (
        <ServersPage
          branches={props.availableBranches}
          branchesSource={props.branchesSource}
          branchesState={props.branchesState}
          branchesError={props.branchesError}
          onRefreshBranches={props.onRefreshBranches}
          activeServerStatus={props.status}
          onStart={props.onStart}
          onStop={props.onStop}
          onConfigure={(id) => onNavigateToServerConfig(id, 'console')}
          harness={{
            registry: props.instances,
            loading: props.instances.loading,
            error: props.instances.error,
            refresh: async () => undefined,
            create: props.onCreateInstance as any,
            select: props.onSelectInstance as any,
            install: props.onInstallInstance as any,
            remove: props.onDeleteInstance as any,
            migrate: props.onMigrateInstance as any
          }}
        />
      )}
    </PortalLayout>
  );
};
