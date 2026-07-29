import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/organisms/Header.js';
import { LoginForm } from '../components/organisms/LoginForm.js';
import { ConsolePanel } from '../components/organisms/ConsolePanel.js';
import { SettingsPanel } from '../components/organisms/SettingsPanel.js';
import { ModsPanel } from '../components/organisms/ModsPanel.js';
import { EditorPanel } from '../components/organisms/EditorPanel.js';
import { PortalPage } from '../components/pages/PortalPage.js';
import { ServerStatus, EditorType, EditorMode } from '../types.js';

const buildStatus = (status: ServerStatus) => ({
  status,
  onlinePlayers: status === ServerStatus.Running ? 4 : 0,
  stats: { cpu: 15, memory: 1200, memoryTotal: 4096 },
  idleShutdown: { minutes: 5, active: status === ServerStatus.Running, remainingSeconds: 300 }
});

describe('Organisms Components Tests', () => {
  it('should render Header component with server status and logout button', () => {
    const handleLogout = vi.fn();
    render(<Header status={buildStatus(ServerStatus.Running)} onLogout={handleLogout} />);

    expect(screen.getByText(/PZ Server Manager/i)).toBeDefined();
    expect(screen.getByText(/EN LINEA/i)).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();

    fireEvent.click(screen.getByText(/Salir/i));
    expect(handleLogout).toHaveBeenCalled();
  });

  it('should render LoginForm and handle submit', async () => {
    const handleLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onLogin={handleLogin} />);

    const input = screen.getByPlaceholderText(/Contraseña de administración/i);
    fireEvent.change(input, { target: { value: 'secret' } });

    const submitBtn = screen.getByRole('button', { name: /Iniciar Sesión/i });
    fireEvent.click(submitBtn);

    expect(handleLogin).toHaveBeenCalledWith('secret');
  });

  it('should render ConsolePanel with terminal logs and command input', () => {
    const handleSendCommand = vi.fn();
    render(
      <ConsolePanel
        status={buildStatus(ServerStatus.Running)}
        logs={['Log line 1', 'Log line 2']}
        selectedBranch=""
        availableBranches={[
          { name: '', buildId: '1', timeUpdated: '', description: '', isDefault: true, isUnstable: false }
        ]}
        branchesState="ready"
        branchesError={null}
        branchesSource="steam"
        onBranchChange={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onRestart={vi.fn()}
        onKill={vi.fn()}
        onUpdate={vi.fn()}
        onRefreshBranches={vi.fn()}
        onSendCommand={handleSendCommand}
        instances={[]}
        activeInstanceId={null}
        onSelectInstance={vi.fn()}
      />
    );

    expect(screen.getByText('Log line 1')).toBeDefined();
    expect(screen.getByText('Log line 2')).toBeDefined();

    const cmdInput = screen.getByPlaceholderText(/Escriba un comando RCON/i);
    fireEvent.change(cmdInput, { target: { value: 'help' } });
    fireEvent.click(screen.getByText('Enviar'));

    expect(handleSendCommand).toHaveBeenCalledWith('help');
  });

  it('should render SettingsPanel and trigger save', () => {
    const handleSave = vi.fn((e) => e.preventDefault());
    render(
      <SettingsPanel
        iniSettings={[{ key: 'MaxPlayers', value: '16', description: 'Max players' }]}
        panelConfig={{ idleShutdownMinutes: 15, serverLanguage: 'es' }}
        onIniSettingChange={vi.fn()}
        onPanelConfigChange={vi.fn()}
        onSave={handleSave}
        savedMessage="Saved!"
      />
    );

    expect(screen.getByText('Saved!')).toBeDefined();
    expect(screen.getByText('MaxPlayers')).toBeDefined();

    const saveBtn = screen.getByText(/Guardar Parámetros Principales/i);
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalled();
  });

  it('should render ModsPanel and allow adding/removing mods', () => {
    const handleAddMod = vi.fn();

    render(
      <ModsPanel
        modsList={[{ modId: 'Hydrocraft', workshopId: '514493422' }]}
        onAddMod={handleAddMod}
        onRemoveMod={vi.fn()}
        onSaveMods={vi.fn()}
        savedMessage=""
      />
    );

    expect(screen.getByText('Hydrocraft')).toBeDefined();

    const modInput = screen.getByPlaceholderText(/ej: Hydrocraft/i);
    const workshopInput = screen.getByPlaceholderText(/ej: 514493422/i);

    fireEvent.change(modInput, { target: { value: 'CheatMenu' } });
    fireEvent.change(workshopInput, { target: { value: '99999' } });
    fireEvent.click(screen.getByText(/Agregar a la Lista/i));

    expect(handleAddMod).toHaveBeenCalledWith('CheatMenu', '99999');
  });

  it('should render PortalPage with the Servers tab visible', () => {
    render(
      <PortalPage
        status={buildStatus(ServerStatus.Running)}
        logs={[]}
        iniSettings={[]}
        panelConfig={{ idleShutdownMinutes: 0, serverLanguage: 'es' }}
        modsList={[]}
        editorType={EditorType.Ini}
        editorMode={EditorMode.Gui}
        parsedConfigData={null}
        rawConfigText=""
        selectedBranch=""
        availableBranches={[
          { name: '', buildId: '1', timeUpdated: '', description: '', isDefault: true, isUnstable: false }
        ]}
        branchesState="ready"
        branchesError={null}
        branchesSource="steam"
        savedMessage=""
        instances={{ instances: [], activeInstanceId: null, loading: false, error: null }}
        route={{ path: 'servers', serverId: null, configSubTab: 'editor' }}
        onNavigateToConsole={() => undefined}
        onNavigateToServers={() => undefined}
        onNavigateToServerConfig={() => undefined}
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
    // The Servers tab must be present in the navigation
    expect(screen.getByText(/^Servidores$/)).toBeDefined();
  });

  it('should render EditorPanel for INI, Sandbox and Spawn modes', () => {
    const handleTypeChange = vi.fn();
    const handleModeChange = vi.fn();

    const baseProps = {
      editorMode: EditorMode.Gui,
      rawConfigText: '',
      onTypeChange: handleTypeChange,
      onModeChange: handleModeChange,
      onRawTextChange: vi.fn(),
      onUpdateSandboxValue: vi.fn(),
      onToggleSpawnRegion: vi.fn(),
      onRemoveSpawnRegion: vi.fn(),
      onSave: vi.fn(),
      savedMessage: ''
    };

    const { rerender } = render(
      <EditorPanel
        {...baseProps}
        editorType={EditorType.Ini}
        parsedConfigData={[{ key: 'PVP', value: 'true', description: 'PVP setting' }]}
      />
    );

    expect(screen.getByText('PVP')).toBeDefined();

    rerender(
      <EditorPanel
        {...baseProps}
        editorType={EditorType.Sandbox}
        parsedConfigData={{ values: { ZombieConfig: { Speed: 2 } }, optionsMeta: {} }}
      />
    );

    expect(screen.getByText(/Categoría: ZombieConfig/i)).toBeDefined();

    rerender(
      <EditorPanel
        {...baseProps}
        editorType={EditorType.Spawn}
        parsedConfigData={[{ name: 'Muldraugh', file: 'media/maps/Muldraugh', enabled: true }]}
      />
    );

    expect(screen.getByText('Muldraugh')).toBeDefined();
  });
});
