import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n/index.js';
import { LoginPage } from '../components/pages/LoginPage.js';
import { PortalPage } from '../components/pages/PortalPage.js';
import { ServerStatus, EditorType, EditorMode } from '../types.js';

const baseStatus = {
  status: ServerStatus.Stopped,
  onlinePlayers: 0,
  stats: { cpu: 0, memory: 0, memoryTotal: 0 },
  idleShutdown: { minutes: 0, active: false, remainingSeconds: 0 },
  uptime: { sessionStartedAt: null, currentSessionSeconds: 0, totalUptimeSeconds: 0 }
};

const dummyRoute = { path: 'servers' as const, serverId: null, configSubTab: 'console' as const };
const noop = () => undefined;

describe('Pages Components Tests', () => {
  it('should render LoginPage component', () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('should render PortalPage component', () => {
    render(
      <PortalPage
        status={baseStatus}
        logs={['Log 1']}
        iniSettings={[{ key: 'MaxPlayers', value: '16', description: 'Max' }]}
        panelConfig={{ idleShutdownMinutes: 0, serverLanguage: 'es' }}
        modsList={[{ modId: 'Hydrocraft', workshopId: '12345' }]}
        editorType={EditorType.Ini}
        editorMode={EditorMode.Gui}
        parsedConfigData={[{ key: 'PVP', value: 'true', description: 'PVP' }]}
        rawConfigText=""
        selectedBranch=""
        availableBranches={[
          { name: '', buildId: '12345', timeUpdated: '', description: '', isDefault: true, isUnstable: false }
        ]}
        branchesState="ready"
        branchesError={null}
        branchesSource="steam"
        savedMessage=""
        instances={{ instances: [], activeInstanceId: null, loading: false, error: null }}
        route={dummyRoute}
        onNavigateToServers={noop}
        onNavigateToServerConfig={noop}
        onLogout={vi.fn()}
        onBranchChange={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onRestart={vi.fn()}
        onKill={vi.fn()}
        onUpdate={vi.fn()}
        onRefreshBranches={vi.fn()}
        onSendCommand={vi.fn()}
        onIniSettingChange={vi.fn()}
        onPanelConfigChange={vi.fn()}
        onSaveSettings={vi.fn()}
        onAddMod={vi.fn()}
        onRemoveMod={vi.fn()}
        onSaveMods={vi.fn()}
        onEditorTypeChange={vi.fn()}
        onEditorModeChange={vi.fn()}
        onRawTextChange={vi.fn()}
        onUpdateSandboxValue={vi.fn()}
        onToggleSpawnRegion={vi.fn()}
        onRemoveSpawnRegion={vi.fn()}
        onSaveEditor={vi.fn()}
        onCreateInstance={vi.fn() as any}
        onSelectInstance={vi.fn() as any}
        onInstallInstance={vi.fn() as any}
        onDeleteInstance={vi.fn() as any}
        onMigrateInstance={vi.fn() as any}
      />
    );

    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });
});
